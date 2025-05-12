const db = require('../config/db');
const purchaseModel = require('../models/purchase');
const { getErrorMessage } = require('../utils/errorHandler');

// 获取采购申请列表
const getRequisitions = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, requisitionNo, startDate, endDate, status } = req.query;
    const offset = (page - 1) * pageSize;
    
    console.log('获取采购申请列表参数:', { page, pageSize, requisitionNo, startDate, endDate, status });
    
    let query = `
      SELECT r.*, COUNT(*) OVER() as total_count
      FROM purchase_requisitions r
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (requisitionNo) {
      query += ` AND r.requisition_number LIKE ?`;
      queryParams.push(`%${requisitionNo}%`);
    }
    
    if (startDate) {
      query += ` AND r.request_date >= ?`;
      queryParams.push(startDate);
    }
    
    if (endDate) {
      query += ` AND r.request_date <= ?`;
      queryParams.push(endDate);
    }
    
    if (status) {
      query += ` AND r.status = ?`;
      queryParams.push(status);
    }
    
    // 直接在查询字符串中嵌入LIMIT和OFFSET值
    const limitValue = Number(pageSize);
    const offsetValue = Number(offset);
    query += ` ORDER BY r.created_at DESC LIMIT ${limitValue} OFFSET ${offsetValue}`;
    
    console.log('执行SQL查询:', query, '参数:', queryParams);
    
    const [rows] = await db.pool.execute(query, queryParams);
    
    console.log('查询结果行数:', rows.length);
    if (rows.length > 0) {
      console.log('第一条记录:', JSON.stringify(rows[0], null, 2));
    }
    
    // 获取申请单的物料详情
    const items = [];
    if (rows.length > 0) {
      const requisitionIds = rows.map(row => row.id);
      
      // MySQL不支持ANY操作符，使用IN代替
      const placeholders = requisitionIds.map(() => '?').join(',');
      const itemsQuery = `
        SELECT * FROM purchase_requisition_items
        WHERE requisition_id IN (${placeholders})
        ORDER BY id
      `;
      
      const [itemsRows] = await db.pool.execute(itemsQuery, requisitionIds);
      items.push(...itemsRows);
    }
    
    // 整合申请单及其物料
    const requisitions = rows.map(row => {
      const requisitionItems = items.filter(item => item.requisition_id === row.id);
      return {
        ...row,
        materials: requisitionItems
      };
    });
    
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    
    const responseData = {
      items: requisitions,
      total: totalCount,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(totalCount / pageSize)
    };
    
    console.log('返回给前端的数据结构:', JSON.stringify(responseData, null, 2));
    
    res.json(responseData);
  } catch (error) {
    console.error('获取采购申请列表失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// 获取采购申请详情
const getRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取申请单基本信息
    const query = 'SELECT * FROM purchase_requisitions WHERE id = ?';
    const [rows] = await db.pool.execute(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: '采购申请不存在' });
    }
    
    const requisition = rows[0];
    
    // 获取申请单物料，同时获取物料表中的specs字段
    const itemsQuery = `
      SELECT 
        ri.*,
        m.specs as material_specs
      FROM 
        purchase_requisition_items ri
        LEFT JOIN materials m ON ri.material_id = m.id
      WHERE 
        ri.requisition_id = ? 
      ORDER BY 
        ri.id
    `;
    const [itemsRows] = await db.pool.execute(itemsQuery, [id]);
    
    // 处理物料数据，优先使用物料表中的specs字段
    requisition.materials = itemsRows.map(item => ({
      ...item,
      specification: item.material_specs || item.specification || ''
    }));
    
    res.json(requisition);
  } catch (error) {
    console.error('获取采购申请详情失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// 创建采购申请
const createRequisition = async (req, res) => {
  let connection;
  
  try {
    // 记录请求体
    console.log('接收到的请求数据:', JSON.stringify(req.body, null, 2));
    
    connection = await db.pool.getConnection();
    await connection.beginTransaction();
    
    const { requestDate, remarks, materials } = req.body;
    const requester = req.user?.username || 'system';
    
    // 确保采购申请表已创建
    await purchaseModel.createPurchaseTablesIfNotExist();
    
    // 生成申请单号
    const requisitionNo = await purchaseModel.generateRequisitionNo();
    
    // 创建采购申请
    const insertQuery = `
      INSERT INTO purchase_requisitions (requisition_number, request_date, requester, remarks, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await connection.execute(insertQuery, [
      requisitionNo,
      requestDate,
      requester,
      remarks,
      'draft'
    ]);
    
    const requisitionId = result.insertId;
    
    // 创建采购申请物料项目
    if (materials && materials.length > 0) {
      // 验证和处理物料数据
      const validatedMaterials = materials.map(material => ({
        materialId: material.materialId !== undefined ? material.materialId : null,
        materialCode: material.materialCode || '',
        materialName: material.materialName || '',
        specification: material.specification || '',
        unit: material.unit || '',
        unitId: material.unitId !== undefined ? material.unitId : null,
        quantity: material.quantity !== undefined ? material.quantity : 0
      }));
      
      console.log('处理后的物料数据:', JSON.stringify(validatedMaterials, null, 2));
      
      const insertItemsQuery = `
        INSERT INTO purchase_requisition_items 
        (requisition_id, material_id, material_code, material_name, specification, unit, unit_id, quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      for (const material of validatedMaterials) {
        await connection.execute(insertItemsQuery, [
          requisitionId,
          material.materialId,
          material.materialCode,
          material.materialName,
          material.specification,
          material.unit,
          material.unitId,
          material.quantity
        ]);
      }
    }
    
    await connection.commit();
    
    // 获取完整的申请单信息
    const createdRequisition = await getRequisitionById(requisitionId);
    
    res.status(201).json(createdRequisition);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('创建采购申请失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  } finally {
    if (connection) connection.release();
  }
};

// 更新采购申请
const updateRequisition = async (req, res) => {
  let connection;
  
  try {
    connection = await db.pool.getConnection();
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { requestDate, remarks, materials } = req.body;
    
    // 检查申请单是否存在及其状态
    const checkQuery = 'SELECT status FROM purchase_requisitions WHERE id = ?';
    const [checkRows] = await connection.execute(checkQuery, [id]);
    
    if (checkRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '采购申请不存在' });
    }
    
    const currentStatus = checkRows[0].status;
    if (currentStatus !== 'draft') {
      await connection.rollback();
      return res.status(400).json({ error: '只能编辑草稿状态的采购申请' });
    }
    
    // 更新采购申请基本信息
    const updateQuery = `
      UPDATE purchase_requisitions
      SET request_date = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await connection.execute(updateQuery, [requestDate, remarks, id]);
    
    // 删除原有物料项目
    await connection.execute('DELETE FROM purchase_requisition_items WHERE requisition_id = ?', [id]);
    
    // 添加新的物料项目
    if (materials && materials.length > 0) {
      // 验证和处理物料数据
      const validatedMaterials = materials.map(material => ({
        materialId: material.materialId !== undefined ? material.materialId : null,
        materialCode: material.materialCode || '',
        materialName: material.materialName || '',
        specification: material.specification || '',
        unit: material.unit || '',
        unitId: material.unitId !== undefined ? material.unitId : null,
        quantity: material.quantity !== undefined ? material.quantity : 0
      }));
      
      const insertItemsQuery = `
        INSERT INTO purchase_requisition_items 
        (requisition_id, material_id, material_code, material_name, specification, unit, unit_id, quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      for (const material of validatedMaterials) {
        await connection.execute(insertItemsQuery, [
          id,
          material.materialId,
          material.materialCode,
          material.materialName,
          material.specification,
          material.unit,
          material.unitId,
          material.quantity
        ]);
      }
    }
    
    await connection.commit();
    
    // 获取更新后的申请单信息
    const updatedRequisition = await getRequisitionById(id);
    
    res.json(updatedRequisition);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('更新采购申请失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  } finally {
    if (connection) connection.release();
  }
};

// 删除采购申请
const deleteRequisition = async (req, res) => {
  let connection;
  
  try {
    connection = await db.pool.getConnection();
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // 检查申请单是否存在及其状态
    const checkQuery = 'SELECT status FROM purchase_requisitions WHERE id = ?';
    const [checkRows] = await connection.execute(checkQuery, [id]);
    
    if (checkRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '采购申请不存在' });
    }
    
    const currentStatus = checkRows[0].status;
    if (currentStatus !== 'draft') {
      await connection.rollback();
      return res.status(400).json({ error: '只能删除草稿状态的采购申请' });
    }
    
    // 删除申请单 (物料项目会通过外键CASCADE自动删除)
    const deleteQuery = 'DELETE FROM purchase_requisitions WHERE id = ?';
    await connection.execute(deleteQuery, [id]);
    
    await connection.commit();
    
    res.json({ message: '采购申请删除成功' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('删除采购申请失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  } finally {
    if (connection) connection.release();
  }
};

// 更新采购申请状态
const updateRequisitionStatus = async (req, res) => {
  let connection;
  
  try {
    connection = await db.pool.getConnection();
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { newStatus } = req.body;
    
    // 检查状态值是否有效
    const validStatuses = ['draft', 'submitted', 'approved', 'rejected'];
    if (!validStatuses.includes(newStatus)) {
      await connection.rollback();
      return res.status(400).json({ error: '无效的状态值' });
    }
    
    // 检查申请单是否存在
    const checkQuery = 'SELECT status FROM purchase_requisitions WHERE id = ?';
    const [checkRows] = await connection.execute(checkQuery, [id]);
    
    if (checkRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '采购申请不存在' });
    }
    
    const currentStatus = checkRows[0].status;
    
    // 检查状态变更是否有效
    if (currentStatus === newStatus) {
      await connection.rollback();
      return res.status(400).json({ error: '当前已经是该状态' });
    }
    
    // 特定状态转换的验证
    if (
      (currentStatus === 'approved' && newStatus !== 'rejected') ||
      (currentStatus === 'rejected' && newStatus !== 'draft')
    ) {
      await connection.rollback();
      return res.status(400).json({ error: '无效的状态变更' });
    }
    
    // 更新状态
    const updateQuery = `
      UPDATE purchase_requisitions
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const [result] = await connection.execute(updateQuery, [newStatus, id]);
    
    await connection.commit();
    
    // 获取更新后的完整记录
    const [updatedRows] = await db.pool.execute('SELECT * FROM purchase_requisitions WHERE id = ?', [id]);
    
    res.json(updatedRows[0]);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('更新采购申请状态失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  } finally {
    if (connection) connection.release();
  }
};

// 通过ID获取采购申请（内部使用）
const getRequisitionById = async (id) => {
  try {
    // 获取申请单基本信息
    const query = 'SELECT * FROM purchase_requisitions WHERE id = ?';
    const [rows] = await db.pool.execute(query, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    const requisition = rows[0];
    
    // 获取申请单物料，同时获取物料表中的specs字段
    const itemsQuery = `
      SELECT 
        ri.*,
        m.specs as material_specs
      FROM 
        purchase_requisition_items ri
        LEFT JOIN materials m ON ri.material_id = m.id
      WHERE 
        ri.requisition_id = ? 
      ORDER BY 
        ri.id
    `;
    const [itemsRows] = await db.pool.execute(itemsQuery, [id]);
    
    // 处理物料数据，优先使用物料表中的specs字段
    requisition.materials = itemsRows.map(item => ({
      ...item,
      specification: item.material_specs || item.specification || ''
    }));
    
    return requisition;
  } catch (error) {
    console.error('获取采购申请详情失败:', error);
    throw error;
  }
};

module.exports = {
  getRequisitions,
  getRequisition,
  createRequisition,
  updateRequisition,
  deleteRequisition,
  updateRequisitionStatus
}; 