const db = require('../config/db');
const purchaseModel = require('../models/purchase');
const { getErrorMessage } = require('../utils/errorHandler');

// 获取采购退货列表
const getReturns = async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      returnNo, 
      receiptNo,
      supplierId,
      startDate, 
      endDate, 
      status 
    } = req.query;
    const offset = (page - 1) * pageSize;
    
    let query = `
      SELECT r.*, COUNT(*) OVER() as total_count
      FROM purchase_returns r
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 1;
    
    if (returnNo) {
      query += ` AND r.return_no ILIKE $${paramCount}`;
      queryParams.push(`%${returnNo}%`);
      paramCount++;
    }
    
    if (receiptNo) {
      query += ` AND r.receipt_no ILIKE $${paramCount}`;
      queryParams.push(`%${receiptNo}%`);
      paramCount++;
    }
    
    if (supplierId) {
      query += ` AND r.supplier_id = $${paramCount}`;
      queryParams.push(supplierId);
      paramCount++;
    }
    
    if (startDate) {
      query += ` AND r.return_date >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      query += ` AND r.return_date <= $${paramCount}`;
      queryParams.push(endDate);
      paramCount++;
    }
    
    if (status) {
      query += ` AND r.status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }
    
    query += ` ORDER BY r.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(parseInt(pageSize));
    queryParams.push(parseInt(offset));
    
    const result = await db.query(query, queryParams);
    
    // 获取退货单的物料详情
    const items = [];
    if (result.rows.length > 0) {
      const returnIds = result.rows.map(row => row.id);
      const itemsQuery = `
        SELECT * FROM purchase_return_items
        WHERE return_id = ANY($1)
        ORDER BY id
      `;
      const itemsResult = await db.query(itemsQuery, [returnIds]);
      items.push(...itemsResult.rows);
    }
    
    // 整合退货单及其物料
    const returns = result.rows.map(row => {
      const returnItems = items.filter(item => item.return_id === row.id);
      return {
        ...row,
        items: returnItems
      };
    });
    
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    
    res.json({
      items: returns,
      total: totalCount,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(totalCount / pageSize)
    });
  } catch (error) {
    console.error('获取采购退货列表失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// 获取采购退货详情
const getReturn = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取退货单基本信息
    const query = 'SELECT * FROM purchase_returns WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '采购退货单不存在' });
    }
    
    const returnData = result.rows[0];
    
    // 获取退货单物料
    const itemsQuery = 'SELECT * FROM purchase_return_items WHERE return_id = $1 ORDER BY id';
    const itemsResult = await db.query(itemsQuery, [id]);
    
    returnData.items = itemsResult.rows;
    
    res.json(returnData);
  } catch (error) {
    console.error('获取采购退货详情失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// 创建采购退货
const createReturn = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { 
      receiptId, 
      returnDate, 
      reason,
      remarks, 
      items,
      totalAmount
    } = req.body;
    
    // 获取入库单信息
    const receiptQuery = `
      SELECT receipt_no, supplier_id, supplier_name, warehouse_id, warehouse_name
      FROM purchase_receipts 
      WHERE id = $1 AND status = 'completed'
    `;
    const receiptResult = await client.query(receiptQuery, [receiptId]);
    
    if (receiptResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '完成状态的入库单不存在' });
    }
    
    const { 
      receipt_no: receiptNo, 
      supplier_id: supplierId, 
      supplier_name: supplierName,
      warehouse_id: warehouseId,
      warehouse_name: warehouseName
    } = receiptResult.rows[0];
    
    // 生成退货单号
    const returnNo = await purchaseModel.generateReturnNo();
    const operator = req.user?.username || 'system';
    
    // 创建采购退货单
    const insertQuery = `
      INSERT INTO purchase_returns (
        return_no, receipt_id, receipt_no, supplier_id, supplier_name, 
        warehouse_id, warehouse_name, return_date, reason, 
        total_amount, operator, remarks, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const result = await client.query(insertQuery, [
      returnNo,
      receiptId,
      receiptNo,
      supplierId,
      supplierName,
      warehouseId,
      warehouseName,
      returnDate,
      reason,
      totalAmount || 0,
      operator,
      remarks,
      'pending'
    ]);
    
    const returnId = result.rows[0].id;
    
    // 创建采购退货物料项目
    if (items && items.length > 0) {
      const insertItemsQuery = `
        INSERT INTO purchase_return_items 
        (return_id, receipt_item_id, material_id, material_code, material_name, 
         specification, unit, unit_id, quantity, return_quantity, price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      for (const item of items) {
        if (item.returnQuantity > 0) {
          await client.query(insertItemsQuery, [
            returnId,
            item.id, // 入库单物料项ID
            item.materialId,
            item.materialCode,
            item.materialName,
            item.specification,
            item.unit,
            item.unitId,
            item.quantity,
            item.returnQuantity,
            item.price
          ]);
        }
      }
    }
    
    await client.query('COMMIT');
    
    // 获取完整的退货单信息
    const createdReturn = await getReturnById(returnId);
    
    res.status(201).json(createdReturn);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('创建采购退货单失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  } finally {
    client.release();
  }
};

// 更新采购退货
const updateReturn = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { 
      returnDate, 
      reason,
      remarks, 
      items,
      totalAmount
    } = req.body;
    
    // 检查退货单是否存在及其状态
    const checkQuery = 'SELECT status FROM purchase_returns WHERE id = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '采购退货单不存在' });
    }
    
    const currentStatus = checkResult.rows[0].status;
    if (currentStatus !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '只能编辑待处理状态的退货单' });
    }
    
    // 更新退货单基本信息
    const updateQuery = `
      UPDATE purchase_returns
      SET return_date = $1, reason = $2, remarks = $3, 
          total_amount = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `;
    await client.query(updateQuery, [returnDate, reason, remarks, totalAmount || 0, id]);
    
    // 删除原有物料项目
    await client.query('DELETE FROM purchase_return_items WHERE return_id = $1', [id]);
    
    // 添加新的物料项目
    if (items && items.length > 0) {
      const insertItemsQuery = `
        INSERT INTO purchase_return_items 
        (return_id, receipt_item_id, material_id, material_code, material_name, 
         specification, unit, unit_id, quantity, return_quantity, price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      for (const item of items) {
        if (item.returnQuantity > 0) {
          await client.query(insertItemsQuery, [
            id,
            item.id, // 入库单物料项ID
            item.materialId,
            item.materialCode,
            item.materialName,
            item.specification,
            item.unit,
            item.unitId,
            item.quantity,
            item.returnQuantity,
            item.price
          ]);
        }
      }
    }
    
    await client.query('COMMIT');
    
    // 获取更新后的退货单信息
    const updatedReturn = await getReturnById(id);
    
    res.json(updatedReturn);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('更新采购退货单失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  } finally {
    client.release();
  }
};

// 更新采购退货状态
const updateReturnStatus = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { newStatus } = req.body;
    
    // 检查状态值是否有效
    const validStatuses = ['pending', 'approved', 'completed', 'rejected'];
    if (!validStatuses.includes(newStatus)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '无效的状态值' });
    }
    
    // 检查退货单是否存在
    const checkQuery = 'SELECT status, warehouse_id FROM purchase_returns WHERE id = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '采购退货单不存在' });
    }
    
    const currentStatus = checkResult.rows[0].status;
    const warehouseId = checkResult.rows[0].warehouse_id;
    
    // 检查状态变更是否有效
    if (currentStatus === newStatus) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '当前已经是该状态' });
    }
    
    // 特定状态转换的验证
    const validTransitions = {
      'pending': ['approved', 'rejected'],
      'approved': ['completed'],
      'completed': [],
      'rejected': []
    };
    
    if (!validTransitions[currentStatus].includes(newStatus)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '无效的状态变更' });
    }
    
    // 如果状态变为已完成，则需要更新库存
    if (newStatus === 'completed') {
      // 获取退货单物料
      const itemsQuery = 'SELECT * FROM purchase_return_items WHERE return_id = $1';
      const itemsResult = await client.query(itemsQuery, [id]);
      
      // 更新库存
      for (const item of itemsResult.rows) {
        // 检查库存是否存在
        const stockQuery = `
          SELECT id, quantity FROM inventory_stock 
          WHERE material_id = $1 AND warehouse_id = $2
        `;
        const stockResult = await client.query(stockQuery, [item.material_id, warehouseId]);
        
        if (stockResult.rows.length > 0) {
          // 更新现有库存
          const stockId = stockResult.rows[0].id;
          const currentQuantity = parseFloat(stockResult.rows[0].quantity);
          const returnQuantity = parseFloat(item.return_quantity);
          
          // 确保库存不会变为负数
          if (currentQuantity < returnQuantity) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
              error: `物料 ${item.material_name} 库存不足，当前库存: ${currentQuantity}, 退货数量: ${returnQuantity}` 
            });
          }
          
          const newQuantity = currentQuantity - returnQuantity;
          
          const updateStockQuery = `
            UPDATE inventory_stock
            SET quantity = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `;
          await client.query(updateStockQuery, [newQuantity, stockId]);
          
          // 创建库存记录
          const insertStockRecordQuery = `
            INSERT INTO inventory_stock_records
            (material_id, warehouse_id, quantity, type, source_id, source_type, remarks)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;
          await client.query(insertStockRecordQuery, [
            item.material_id,
            warehouseId,
            -returnQuantity,  // 负数表示出库
            'out',
            id,
            'purchase_return',
            '采购退货'
          ]);
        } else {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            error: `物料 ${item.material_name} 在仓库中不存在库存记录`
          });
        }
      }
    }
    
    // 更新状态
    const updateQuery = `
      UPDATE purchase_returns
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await client.query(updateQuery, [newStatus, id]);
    
    await client.query('COMMIT');
    
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('更新采购退货状态失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  } finally {
    client.release();
  }
};

// 通过ID获取采购退货单（内部使用）
const getReturnById = async (id) => {
  // 获取退货单基本信息
  const query = 'SELECT * FROM purchase_returns WHERE id = $1';
  const result = await db.query(query, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const returnData = result.rows[0];
  
  // 获取退货单物料
  const itemsQuery = 'SELECT * FROM purchase_return_items WHERE return_id = $1 ORDER BY id';
  const itemsResult = await db.query(itemsQuery, [id]);
  
  returnData.items = itemsResult.rows;
  
  return returnData;
};

module.exports = {
  getReturns,
  getReturn,
  createReturn,
  updateReturn,
  updateReturnStatus
}; 