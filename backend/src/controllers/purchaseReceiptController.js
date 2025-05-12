const db = require('../config/db');
const purchaseModel = require('../models/purchase');
const { getErrorMessage } = require('../utils/errorHandler');

// 获取采购入库列表
const getReceipts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      pageSize = 10, 
      receiptNo, 
      orderNo,
      supplierId,
      startDate, 
      endDate, 
      status 
    } = req.query;
    
    // 转换为数字类型
    const actualPageSize = parseInt(limit || pageSize, 10);
    const actualPage = parseInt(page, 10);
    // 验证参数
    if (isNaN(actualPage) || isNaN(actualPageSize) || actualPage < 1 || actualPageSize < 1) {
      return res.status(400).json({ error: '无效的分页参数' });
    }
    
    const offset = (actualPage - 1) * actualPageSize;
    
    let query = `
      SELECT r.*
      FROM purchase_receipts r
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (receiptNo) {
      query += ` AND r.receipt_no LIKE ?`;
      queryParams.push(`%${receiptNo}%`);
    }
    
    if (orderNo) {
      query += ` AND r.order_no LIKE ?`;
      queryParams.push(`%${orderNo}%`);
    }
    
    if (supplierId) {
      query += ` AND r.supplier_id = ?`;
      queryParams.push(parseInt(supplierId, 10));
    }
    
    if (startDate) {
      query += ` AND r.receipt_date >= ?`;
      queryParams.push(startDate);
    }
    
    if (endDate) {
      query += ` AND r.receipt_date <= ?`;
      queryParams.push(endDate);
    }
    
    if (status) {
      query += ` AND r.status = ?`;
      queryParams.push(status);
    }
    
    // 先获取总数
    const countQuery = query.replace('SELECT r.*', 'SELECT COUNT(*) as total');
    const connection = await db.pool.getConnection();
    try {
      const [countResult] = await connection.query(countQuery, queryParams);
      const totalCount = countResult[0].total;
      
      // 添加排序和分页
      query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
      queryParams.push(actualPageSize);
      queryParams.push(offset);
      
      const [result] = await connection.query(query, queryParams);
      
      // 获取入库单的物料详情
      const items = [];
      if (result.length > 0) {
        const receiptIds = result.map(row => row.id);
        const placeholders = receiptIds.map(() => '?').join(',');
        const itemsQuery = `
          SELECT * FROM purchase_receipt_items
          WHERE receipt_id IN (${placeholders})
          ORDER BY id
        `;
        // 使用connection.query
        const [itemsResult] = await connection.query(itemsQuery, receiptIds);
        items.push(...itemsResult);
      }
      
      // 整合入库单及其物料
      const receipts = result.map(row => {
        const receiptItems = items.filter(item => item.receipt_id === row.id);
        return {
          ...row,
          items: receiptItems
        };
      });
      
      res.json({
        items: receipts,
        total: totalCount,
        page: actualPage,
        pageSize: actualPageSize,
        totalPages: Math.ceil(totalCount / actualPageSize)
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取采购入库列表失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// 获取采购入库详情
const getReceipt = async (req, res) => {
  let connection;
  let retryCount = 0;
  const maxRetries = 3;
  
  const tryGetReceipt = async () => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id, 10))) {
        return res.status(400).json({ error: '无效的ID参数' });
      }
      
      const receiptId = parseInt(id, 10);
      
      // 获取入库单基本信息
      connection = await db.pool.getConnection();
      
      // 使用JOIN语句获取更详细的信息
      const query = `
        SELECT 
          pr.*,
          po.order_no,
          s.name AS supplier_name,
          l.name AS warehouse_name
        FROM 
          purchase_receipts pr
        LEFT JOIN 
          purchase_orders po ON pr.order_id = po.id
        LEFT JOIN 
          suppliers s ON pr.supplier_id = s.id
        LEFT JOIN 
          locations l ON pr.warehouse_id = l.id
        WHERE 
          pr.id = ?
      `;
      
      console.log(`执行入库单查询, ID: ${receiptId}`);
      const [result] = await connection.query(query, [receiptId]);
      
      if (result.length === 0) {
        return res.status(404).json({ error: '采购入库单不存在' });
      }
      
      const receipt = result[0];
      
      // 获取入库单物料
      const itemsQuery = `
        SELECT 
          pri.*,
          m.name AS material_name,
          m.code AS material_code,
          m.specs,
          u.name AS unit_name
        FROM 
          purchase_receipt_items pri
        LEFT JOIN 
          materials m ON pri.material_id = m.id
        LEFT JOIN 
          units u ON pri.unit_id = u.id
        WHERE 
          pri.receipt_id = ? 
        ORDER BY 
          pri.id
      `;
      
      console.log(`执行入库单物料查询, 入库单ID: ${receiptId}`);
      const [itemsResult] = await connection.query(itemsQuery, [receiptId]);
      
      // 格式化物料项为前端需要的格式
      const formattedItems = itemsResult.map(item => ({
        id: item.id,
        receipt_id: item.receipt_id,
        material_id: item.material_id,
        material_code: item.material_code,
        material_name: item.material_name,
        specification: item.specs,
        unit_id: item.unit_id,
        unit_name: item.unit_name,
        ordered_quantity: item.ordered_quantity || 0,
        received_quantity: item.received_quantity || 0,
        qualified_quantity: item.qualified_quantity || 0,
        price: item.price || 0,
        remarks: item.remarks || '',
        // 同时提供驼峰命名格式
        materialId: item.material_id,
        materialCode: item.material_code,
        materialName: item.material_name,
        unitId: item.unit_id,
        unitName: item.unit_name,
        orderedQuantity: item.ordered_quantity || 0,
        receivedQuantity: item.received_quantity || 0,
        qualifiedQuantity: item.qualified_quantity || 0
      }));
      
      // 格式化日期
      const receiptDate = receipt.receipt_date 
        ? new Date(receipt.receipt_date).toISOString().split('T')[0] 
        : null;
      
      // 准备返回的结果对象（同时提供下划线格式和驼峰格式）
      const response = {
        id: receipt.id,
        receipt_no: receipt.receipt_no,
        order_id: receipt.order_id,
        order_no: receipt.order_no,
        supplier_id: receipt.supplier_id,
        supplier_name: receipt.supplier_name,
        warehouse_id: receipt.warehouse_id,
        warehouse_name: receipt.warehouse_name,
        receipt_date: receiptDate,
        operator: receipt.operator,
        status: receipt.status,
        remarks: receipt.remarks || '',
        items: formattedItems,
        // 同时提供驼峰命名格式
        receiptNo: receipt.receipt_no,
        orderId: receipt.order_id,
        orderNo: receipt.order_no,
        supplierId: receipt.supplier_id,
        supplierName: receipt.supplier_name,
        warehouseId: receipt.warehouse_id,
        warehouseName: receipt.warehouse_name,
        receiptDate: receiptDate
      };
      
      // 直接返回响应对象，不再嵌套在data中
      return res.json(response);
    } catch (error) {
      if ((error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST') && retryCount < maxRetries) {
        retryCount++;
        console.log(`获取采购入库详情失败，正在重试 (${retryCount}/${maxRetries}): ${error.message}`);
        
        // 确保连接被释放
        if (connection) {
          try {
            connection.release();
          } catch (releaseErr) {
            console.error('释放连接失败:', releaseErr);
          }
          connection = null;
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        return await tryGetReceipt();
      }
      
      console.error('获取采购入库详情失败:', error);
      return res.status(500).json({ 
        error: '获取采购入库详情失败', 
        message: error.message,
        code: error.code
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  };
  
  return await tryGetReceipt();
};

// 创建采购入库
const createReceipt = async (req, res) => {
  console.log('开始创建采购入库单, 获取数据库连接...');
  let client;
  try {
    client = await db.getClient();
    console.log('数据库连接获取成功, client对象类型:', typeof client);
    
    console.log('开始创建采购入库单，请求数据:', JSON.stringify(req.body, null, 2));
    
    // 事务命令不支持预处理语句协议，使用普通查询
    console.log('尝试开始事务...');
    try {
      await client.query('BEGIN');
      console.log('事务开始成功');
    } catch (beginError) {
      console.error('开始事务失败:', beginError);
      return res.status(500).json({ error: '开始数据库事务失败: ' + beginError.message });
    }
    
    // 从请求中提取数据，并确保所有值都是有效的（不是undefined）
    const { 
      orderId, 
      supplierId, 
      warehouseId, 
      receiptDate, 
      remarks = '', // 默认为空字符串而不是undefined
      items: rawItems = [],    // 默认为空数组而不是undefined
      from_inspection = false, // 是否来自检验单自动创建
      material_id = null,      // 如果来自检验单，指定的物料ID
      only_inspection_material = false // 标记是否只包含检验物料，不获取订单中其他物料
    } = req.body;
    
    // 强制转换items为数组
    const items = Array.isArray(rawItems) ? rawItems : [];
    
    console.log('解构后的数据:', { 
      orderId, 
      supplierId, 
      warehouseId, 
      receiptDate, 
      remarks, 
      from_inspection,
      material_id,
      only_inspection_material,
      'items类型': typeof items,
      'items是否数组': Array.isArray(items),
      'items长度': items.length
    });
    
    // 验证必填字段
    if (!orderId || !supplierId || !warehouseId || !receiptDate) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: '缺少必填字段', 
        details: {
          orderId: !orderId ? '订单ID必填' : null,
          supplierId: !supplierId ? '供应商ID必填' : null,
          warehouseId: !warehouseId ? '仓库ID必填' : null,
          receiptDate: !receiptDate ? '收货日期必填' : null
        }
      });
    }
    
    // 确保warehouseId是数字类型
    const warehouseIdNumber = parseInt(warehouseId);
    if (isNaN(warehouseIdNumber)) {
      await client.query('ROLLBACK');
      console.error(`仓库ID ${warehouseId} 不是有效的数字`);
      return res.status(400).json({ error: `仓库ID必须是数字: ${warehouseId}` });
    }
    
    // 获取订单信息
    let orderResult;
    try {
      const orderQuery = 'SELECT order_no FROM purchase_orders WHERE id = ?';
      const result = await client.query(orderQuery, [orderId]);
      // 安全地获取结果，适配不同格式
      orderResult = Array.isArray(result) ? result[0] : 
                  (result && result.rows ? result.rows : []);
    } catch (dbError) {
      console.error('查询订单信息失败:', dbError);
      await client.query('ROLLBACK');
      return res.status(500).json({ error: '数据库查询错误: ' + dbError.message });
    }
    
    if (!orderResult || !Array.isArray(orderResult) || orderResult.length === 0) {
      // 使用普通查询回滚事务
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '采购订单不存在' });
    }
    
    const orderNo = orderResult.order_no ? orderResult.order_no : '';
    
    // 获取供应商信息
    let supplierResult;
    try {
      const supplierQuery = 'SELECT name FROM suppliers WHERE id = ?';
      const result = await client.query(supplierQuery, [supplierId]);
      // 安全地获取结果，适配不同格式
      supplierResult = Array.isArray(result) ? result[0] : 
                     (result && result.rows ? result.rows : []);
    } catch (dbError) {
      console.error('查询供应商信息失败:', dbError);
      await client.query('ROLLBACK');
      return res.status(500).json({ error: '数据库查询错误: ' + dbError.message });
    }
    
    if (!supplierResult || !Array.isArray(supplierResult) || supplierResult.length === 0) {
      // 使用普通查询回滚事务
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '供应商不存在' });
    }
    
    const supplierName = supplierResult.name ? supplierResult.name : '';
    
    // 获取仓库信息
    let warehouseResult;
    try {
      const warehouseQuery = 'SELECT name FROM locations WHERE id = ?';
      const result = await client.query(warehouseQuery, [warehouseId]);
      // 安全地获取结果，适配不同格式
      warehouseResult = Array.isArray(result) ? result[0] : 
                      (result && result.rows ? result.rows : []);
    } catch (dbError) {
      console.error('查询仓库信息失败:', dbError);
      await client.query('ROLLBACK');
      return res.status(500).json({ error: '数据库查询错误: ' + dbError.message });
    }
    
    if (!warehouseResult || !Array.isArray(warehouseResult) || warehouseResult.length === 0) {
      // 使用普通查询回滚事务
      await client.query('ROLLBACK');
      console.error(`仓库ID ${warehouseId} 不存在于locations表中`);
      return res.status(404).json({ error: '仓库不存在' });
    }
    
    const warehouseName = warehouseResult.name ? warehouseResult.name : '';
    
    // 生成入库单号
    console.log('正在生成入库单号，purchaseModel:', typeof purchaseModel, purchaseModel ? '可用' : '不可用');
    if (!purchaseModel || typeof purchaseModel.generateReceiptNo !== 'function') {
      console.error('purchaseModel对象缺失或generateReceiptNo方法不存在!');
      await client.query('ROLLBACK');
      return res.status(500).json({ error: '系统错误: 无法生成入库单号' });
    }
    
    let receiptNo;
    try {
      receiptNo = await purchaseModel.generateReceiptNo();
      console.log('生成的入库单号:', receiptNo);
    } catch (genError) {
      console.error('生成入库单号失败:', genError);
      await client.query('ROLLBACK');
      return res.status(500).json({ error: '生成入库单号失败: ' + genError.message });
    }
    
    if (!receiptNo) {
      console.error('生成的入库单号为空!');
      await client.query('ROLLBACK');
      return res.status(500).json({ error: '系统错误: 生成的入库单号为空' });
    }
    
    const operator = req.user?.username || 'system';
    
    // 记录是否来自检验的标记，便于日志和调试
    if (from_inspection) {
      console.log('此收货单来源于检验单，检验单ID:', req.body.inspectionId || req.body.inspection_id);
      if (only_inspection_material) {
        console.log('只使用检验物料，不获取订单中的其他物料');
      }
      if (material_id) {
        console.log('指定的检验物料ID:', material_id);
      }
    }
    
    // 创建采购入库单
    const insertQuery = `
      INSERT INTO purchase_receipts (
        receipt_no, order_id, order_no, supplier_id, supplier_name, 
        warehouse_id, warehouse_name, receipt_date, operator, remarks, status,
        from_inspection, inspection_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // 确保所有参数都不是undefined
    const insertParams = [
      receiptNo,
      orderId,
      orderNo,
      supplierId,
      supplierName,
      warehouseId,
      warehouseName,
      receiptDate,
      operator,
      remarks || '', // 使用空字符串替代undefined
      'draft',
      from_inspection ? 1 : 0,  // 转换布尔值为0/1
      req.body.inspectionId || req.body.inspection_id || null // 关联的检验单ID
    ];
    
    // 检查任何参数是否为undefined
    if (insertParams.includes(undefined)) {
      console.error('插入采购入库单参数中包含undefined值:', 
        insertParams.map((param, index) => param === undefined ? index : null).filter(i => i !== null)
      );
      await client.query('ROLLBACK');
      return res.status(500).json({ error: '数据处理错误：参数包含undefined值' });
    }
    
    // 使用正确的result格式处理查询结果
    let result;
    try {
      console.log('执行入库单插入SQL:', insertQuery);
      console.log('插入参数:', insertParams);
      result = await client.query(insertQuery, insertParams);
      console.log('插入结果类型:', typeof result);
      console.log('插入结果结构:', JSON.stringify(result, null, 2));
    } catch (insertError) {
      console.error('插入采购入库单失败:', insertError);
      await client.query('ROLLBACK');
      return res.status(500).json({ error: '数据库插入错误: ' + insertError.message });
    }
    
    // 获取插入的ID，根据不同结果格式处理
    let receiptId = null;
    console.log('尝试从不同格式中提取插入ID');
    
    if (result && typeof result.insertId === 'number') {
      // 直接包含insertId属性的情况
      receiptId = result.insertId;
      console.log('从result.insertId获取ID:', receiptId);
    } else if (result && Array.isArray(result) && result[0]) {
      if (typeof result[0].insertId === 'number') {
        // 数组第一项包含insertId的情况
        receiptId = result[0].insertId;
        console.log('从result[0].insertId获取ID:', receiptId);
      } else if (result[0].rows && result[0].rows.insertId) {
        // 可能在rows属性下的情况
        receiptId = result[0].rows.insertId;
        console.log('从result[0].rows.insertId获取ID:', receiptId);
      }
    } else if (result && result.rows && result.rows.insertId) {
      // rows属性下包含insertId的情况
      receiptId = result.rows.insertId;
      console.log('从result.rows.insertId获取ID:', receiptId);
    } else if (result && result.rows && Array.isArray(result.rows) && result.rows[0]) {
      // rows是一个对象数组的情况
      receiptId = result.rows[0].id || result.rows[0].insertId;
      console.log('从result.rows[0]获取ID:', receiptId);
    }
    
    // 如果上述方法都无法获得ID，尝试从result获取的最后一个凭证
    if (!receiptId && typeof result === 'object') {
      console.log('使用其他方式尝试获取ID');
      // 打印result的所有一级属性
      for (const key in result) {
        console.log(`- result["${key}"] =`, result[key]);
      }
      
      // 从字符串化的结果中寻找可能的ID
      const resultStr = JSON.stringify(result);
      console.log('完整结果字符串:', resultStr);
      
      // 如果无法从现有格式获取，使用时间戳作为临时ID
      if (!receiptId) {
        receiptId = Date.now();
        console.log('无法获取真实ID，使用时间戳作为临时ID:', receiptId);
      }
    }
    
    // 确保receiptId有效
    if (!receiptId) {
      console.error('无法获取插入的收货单ID, 结果详情:', result);
      await client.query('ROLLBACK');
      return res.status(500).json({ error: '创建收货单失败: 无法获取收货单ID' });
    }
    
    // 创建采购入库物料项目
    if (items && Array.isArray(items) && items.length > 0) {
      console.log(`处理${items.length}个前端传递的物料项`);
      
      // 如果来自检验且只使用检验物料，则过滤物料列表，只保留检验物料
      if (from_inspection && only_inspection_material && material_id) {
        const filteredItems = items.filter(item => {
          const itemMatId = item.materialId || item.material_id;
          return itemMatId == material_id; // 使用==而不是===，允许字符串和数字的比较
        });
        
        if (filteredItems.length !== items.length) {
          console.log(`物料过滤：原有${items.length}个物料项，过滤后保留${filteredItems.length}个物料项`);
          // 替换原始数组
          items = filteredItems;
        }
      }
      
      const insertItemsQuery = `
        INSERT INTO purchase_receipt_items 
        (receipt_id, material_id, material_code, material_name, 
         specification, unit_id, ordered_quantity, quantity, received_quantity, qualified_quantity, price, remarks, from_inspection)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      for (let i = 0; i < items.length; i++) {
        try {
          const item = items[i];
          
          // 检查item是否是一个有效的对象
          if (!item || typeof item !== 'object') {
            console.warn(`跳过第${i+1}个物料项，无效的物料数据:`, item);
            continue;
          }
          
          // 确保所有参数都不是undefined
          const itemParams = [
            receiptId,
            item.materialId || item.material_id || null,
            item.materialCode || item.material_code || '',
            item.materialName || item.material_name || '',
            item.specification || item.specs || '',
            item.unitId || item.unit_id || null,
            parseFloat(item.orderedQuantity || item.ordered_quantity) || 0,
            parseFloat(item.quantity || item.receivedQuantity || item.received_quantity) || 0, // 使用receivedQuantity作为quantity
            parseFloat(item.receivedQuantity || item.received_quantity) || 0,
            parseFloat(item.qualifiedQuantity || item.qualified_quantity) || 0,
            parseFloat(item.price) || 0,
            item.remarks || item.remark || '',
            item.from_inspection === true || from_inspection === true ? 1 : 0  // 标记是否来自检验
          ];
          
          // 检查任何参数是否为undefined
          if (itemParams.includes(undefined)) {
            console.error(`第${i+1}个物料项参数中包含undefined值:`, 
              itemParams.map((param, index) => param === undefined ? index : null).filter(i => i !== null)
            );
            continue; // 跳过这个物料项
          }
          
          // 使用正确的查询方式，不解构结果
          await client.query(insertItemsQuery, itemParams);
          console.log(`成功插入第${i+1}个物料项：${item.materialName || item.material_name || '未知物料'}，ID：${item.materialId || item.material_id}`);
        } catch (itemError) {
          console.error(`插入第${i+1}个物料项失败:`, itemError);
          // 继续处理下一个物料项，不中断流程
        }
      }
    } else {
      console.log('没有物料项需要处理，items:', items);
    }
    
    // 使用普通查询提交事务
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: '采购入库单创建成功',
      data: {
        id: receiptId,
        receipt_no: receiptNo
      }
    });
  } catch (error) {
    // 使用普通查询回滚事务
    try {
      console.log('捕获到错误，尝试回滚事务...');
      if (client) {
        await client.query('ROLLBACK');
        console.log('事务回滚成功');
      } else {
        console.error('无法回滚事务: client对象不存在');
      }
    } catch (rollbackError) {
      console.error('事务回滚失败:', rollbackError);
    }
    console.error('创建采购入库单失败，详细错误:', error);
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    console.error('错误栈:', error.stack);
    res.status(500).json({ error: error.message || '创建采购入库单失败' });
  } finally {
    if (client) {
      console.log('释放数据库连接...');
      try {
        client.release();
        console.log('数据库连接释放成功');
      } catch (releaseError) {
        console.error('释放数据库连接失败:', releaseError);
      }
    } else {
      console.warn('无法释放数据库连接: client对象不存在');
    }
  }
};

// 更新采购入库
const updateReceipt = async (req, res) => {
  const client = await db.getClient();
  
  try {
    // 事务命令不支持预处理语句协议，使用普通查询
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { 
      receiptDate, 
      warehouseId, 
      remarks = '', // 默认为空字符串而不是undefined
      items = []    // 默认为空数组而不是undefined
    } = req.body;
    
    // 验证必填字段
    if (!id || !receiptDate) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: '缺少必填字段', 
        details: {
          id: !id ? '入库单ID必填' : null,
          receiptDate: !receiptDate ? '收货日期必填' : null
        }
      });
    }
    
    // 检查入库单是否存在及其状态
    let checkResult;
    try {
      const checkQuery = 'SELECT status, warehouse_id FROM purchase_receipts WHERE id = ?';
      const result = await client.query(checkQuery, [id]);
      // 安全地获取结果，适配不同格式
      checkResult = Array.isArray(result) ? result : 
                   (result && result.rows ? result.rows : []);
      
      if (!checkResult || checkResult.length === 0) {
        // 使用普通查询回滚事务
        await client.query('ROLLBACK');
        return res.status(404).json({ error: '采购入库单不存在' });
      }
      
      const currentItem = checkResult[0] || {};
      const currentStatus = currentItem.status || null;
      
      if (currentStatus !== 'confirmed') {
        // 使用普通查询回滚事务
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '只能编辑待入库状态的入库单' });
      }
      
      // 如果更改了仓库，则需要获取新仓库的信息
      let warehouseName = null;
      if (warehouseId && warehouseId !== currentItem.warehouse_id) {
        let warehouseResult;
        try {
          const warehouseQuery = 'SELECT name FROM locations WHERE id = ?';
          const result = await client.query(warehouseQuery, [warehouseId]);
          // 安全地获取结果，适配不同格式
          warehouseResult = Array.isArray(result) ? result : 
                         (result && result.rows ? result.rows : []);
          
          if (!warehouseResult || warehouseResult.length === 0) {
            // 使用普通查询回滚事务
            await client.query('ROLLBACK');
            console.error(`仓库ID ${warehouseId} 不存在于locations表中`);
            return res.status(404).json({ error: '仓库不存在' });
          }
          
          warehouseName = (warehouseResult[0] || {}).name || '';
        } catch (dbError) {
          console.error('查询仓库信息失败:', dbError);
          await client.query('ROLLBACK');
          return res.status(500).json({ error: '数据库查询错误: ' + dbError.message });
        }
      }
    } catch (checkError) {
      console.error('检查入库单状态失败:', checkError);
      await client.query('ROLLBACK');
      return res.status(500).json({ error: '数据库查询错误: ' + checkError.message });
    }
    
    // 更新入库单基本信息
    let updateQuery = `
      UPDATE purchase_receipts
      SET receipt_date = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP
    `;
    const queryParams = [receiptDate, remarks || ''];
    
    if (warehouseName) {
      updateQuery += `, warehouse_id = ?, warehouse_name = ? WHERE id = ?`;
      queryParams.push(warehouseId, warehouseName, id);
    } else {
      updateQuery += ` WHERE id = ?`;
      queryParams.push(id);
    }
    
    // 检查任何参数是否为undefined
    if (queryParams.includes(undefined)) {
      console.error('更新采购入库单参数中包含undefined值:', 
        queryParams.map((param, index) => param === undefined ? index : null).filter(i => i !== null)
      );
      await client.query('ROLLBACK');
      return res.status(500).json({ error: '数据处理错误：参数包含undefined值' });
    }
    
    await client.query(updateQuery, queryParams);
    
    // 更新物料项目
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item.id || item.actualQuantity === undefined) {
          console.warn('跳过更新物料项，缺少必要参数:', item);
          continue;
        }
        
        const updateItemQuery = `
          UPDATE purchase_receipt_items
          SET actual_quantity = ?, updated_at = CURRENT_TIMESTAMP
          WHERE receipt_id = ? AND id = ?
        `;
        
        const itemParams = [
          parseFloat(item.actualQuantity) || 0,
          id,
          item.id
        ];
        
        // 检查任何参数是否为undefined
        if (itemParams.includes(undefined)) {
          console.error('更新物料项参数中包含undefined值:', 
            itemParams.map((param, index) => param === undefined ? index : null).filter(i => i !== null)
          );
          continue; // 跳过这个物料项
        }
        
        await client.query(updateItemQuery, itemParams);
      }
    }
    
    // 使用普通查询提交事务
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: '采购入库单更新成功'
    });
  } catch (error) {
    // 使用普通查询回滚事务
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('事务回滚失败:', rollbackError);
    }
    console.error('更新采购入库单失败:', error);
    res.status(500).json({ error: error.message || '更新采购入库单失败' });
  } finally {
    client.release();
  }
};

// 更新采购入库状态
const updateReceiptStatus = async (req, res) => {
  const client = await db.getClient();
  
  try {
    // 事务命令不支持预处理语句协议，使用普通查询
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { status, remarks = '' } = req.body;
    
    // 验证必填字段
    if (!id || !status) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: '缺少必填字段', 
        details: {
          id: !id ? '入库单ID必填' : null,
          status: !status ? '状态必填' : null
        }
      });
    }
    
    // 验证状态值
    const validStatuses = ['draft', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      // 使用普通查询回滚事务
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '无效的状态值' });
    }
    
    // 检查入库单是否存在
    let checkResult;
    try {
      const checkQuery = 'SELECT status FROM purchase_receipts WHERE id = ?';
      const result = await client.query(checkQuery, [id]);
      // 安全地获取结果，适配不同格式
      checkResult = Array.isArray(result) ? result : 
                   (result && result.rows ? result.rows : []);
      
      if (!checkResult || checkResult.length === 0) {
        // 使用普通查询回滚事务
        await client.query('ROLLBACK');
        return res.status(404).json({ error: '采购入库单不存在' });
      }
      
      const currentStatus = (checkResult[0] || {}).status || null;
      
      // 验证状态变更是否有效
      if (!isValidStatusTransition(currentStatus, status)) {
        // 使用普通查询回滚事务
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '无效的状态变更' });
      }
    } catch (checkError) {
      console.error('检查入库单状态失败:', checkError);
      await client.query('ROLLBACK');
      return res.status(500).json({ error: '数据库查询错误: ' + checkError.message });
    }
    
    // 准备状态变更备注
    const statusRemark = `[${new Date().toISOString()}] 状态变更为 ${status}${remarks ? ': ' + remarks : ''}`;
    
    // 更新入库单状态
    try {
      // 注意这里避免使用特殊字符，直接使用拼接字符串
      const updateQuery = `
        UPDATE purchase_receipts
        SET status = ?, remarks = CONCAT(IFNULL(remarks, ''), ' | ', ?)
        WHERE id = ?
      `;
      
      const updateParams = [status, statusRemark, id];
      
      // 检查任何参数是否为undefined
      if (updateParams.includes(undefined)) {
        console.error('更新状态参数中包含undefined值:', 
          updateParams.map((param, index) => param === undefined ? index : null).filter(i => i !== null)
        );
        await client.query('ROLLBACK');
        return res.status(500).json({ error: '数据处理错误：参数包含undefined值' });
      }
      
      console.log('执行状态更新，参数:', updateParams);
      await client.query(updateQuery, updateParams);
      console.log('状态更新成功');
    } catch (updateError) {
      console.error('执行SQL失败:', updateError);
      await client.query('ROLLBACK');
      return res.status(500).json({ error: '更新状态失败: ' + updateError.message });
    }
    
    // 如果状态是"completed"，则入库物料到库存
    if (status === 'completed') {
      // 获取入库单详情
      let itemsResult;
      try {
        const getItemsQuery = `
          SELECT r.*, ri.* 
          FROM purchase_receipts r
          JOIN purchase_receipt_items ri ON r.id = ri.receipt_id
          WHERE r.id = ?
        `;
        
        const result = await client.query(getItemsQuery, [id]);
        // 安全地获取结果，适配不同格式
        itemsResult = Array.isArray(result) ? result : 
                     (result && result.rows ? result.rows : []);
        
        if (itemsResult && itemsResult.length > 0) {
          for (const item of itemsResult) {
            // 更新库存
            try {
              if (item && item.material_id) {
                await updateInventory(
                  client, 
                  item.material_id, 
                  parseFloat(item.qualified_quantity) || 0, 
                  item.warehouse_id
                );
              }
            } catch (invError) {
              console.error('更新库存失败:', invError);
              // 继续处理其他物料，不中断流程
            }
          }
        }
      } catch (queryError) {
        console.error('查询入库单详情失败:', queryError);
        // 继续处理，不中断提交事务
      }
    }
    
    // 使用普通查询提交事务
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: '采购入库单状态更新成功',
      data: { newStatus: status }
    });
  } catch (error) {
    // 使用普通查询回滚事务
    try {
      console.log('直接执行事务命令: ROLLBACK');
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('事务回滚失败:', rollbackError);
    }
    console.error('更新采购入库单状态失败:', error);
    res.status(500).json({ error: error.message || '更新采购入库单状态失败' });
  } finally {
    client.release();
  }
};

// 辅助函数：验证状态变更是否有效
function isValidStatusTransition(currentStatus, newStatus) {
  // 定义有效的状态变更路径
  const validTransitions = {
    'draft': ['confirmed', 'cancelled'],
    'confirmed': ['completed', 'cancelled'],
    'completed': ['cancelled'],
    'cancelled': []
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

// 辅助函数：更新库存
async function updateInventory(client, materialId, quantity, warehouseId) {
  // 验证必填字段
  if (!materialId || quantity === undefined || !warehouseId) {
    const error = new Error('更新库存失败：参数无效');
    error.details = {
      materialId: !materialId ? '物料ID必填' : null,
      quantity: quantity === undefined ? '数量必填' : null,
      warehouseId: !warehouseId ? '仓库ID必填' : null
    };
    throw error;
  }
  
  // 确保数量是数字类型且非NaN
  const numQuantity = parseFloat(quantity);
  if (isNaN(numQuantity)) {
    throw new Error(`更新库存失败：无效的数量值 "${quantity}"`);
  }
  
  // 在inventory_stock表中，仓库ID被存储为location_id
  const locationId = warehouseId;
  
  // 检查库存是否存在
  const checkQuery = `
    SELECT id, quantity FROM inventory_stock 
    WHERE material_id = ? AND location_id = ?
  `;
  
  const checkParams = [materialId, locationId];
  
  // 确保参数中没有undefined值
  if (checkParams.includes(undefined)) {
    throw new Error('更新库存失败：检查参数包含undefined值');
  }
  
  const checkResult = await client.query(checkQuery, checkParams);
  const hasResults = checkResult.rows && checkResult.rows.length > 0 || 
                     (checkResult[0] && checkResult[0].length > 0);
  
  // 获取物料信息以取得单位ID
  const materialQuery = `SELECT unit_id FROM materials WHERE id = ?`;
  const materialResult = await client.query(materialQuery, [materialId]);
  
  // 安全地获取结果
  const materialRows = materialResult.rows || materialResult[0];
  let unitId = null;
  if (materialRows && materialRows.length > 0) {
    unitId = materialRows[0].unit_id;
  }
  
  // 获取入库单号用于记录交易
  const receiptQuery = `
    SELECT receipt_no FROM purchase_receipts 
    WHERE id = (
      SELECT DISTINCT receipt_id FROM purchase_receipt_items 
      WHERE material_id = ? LIMIT 1
    )
  `;
  const receiptResult = await client.query(receiptQuery, [materialId]);
  const receiptRows = receiptResult.rows || receiptResult[0];
  let receiptNo = 'UNKNOWN';
  if (receiptRows && receiptRows.length > 0) {
    receiptNo = receiptRows[0].receipt_no;
  }
  
  // 获取实际库存数量
  let currentQuantity = 0;
  let stockId = null;
  
  if (hasResults) {
    // 获取当前库存记录
    const stockRow = checkResult.rows ? checkResult.rows[0] : checkResult[0][0];
    stockId = stockRow.id;
    currentQuantity = parseFloat(stockRow.quantity);
    const newQuantity = currentQuantity + numQuantity;
    
    // 更新已有库存
    const updateQuery = `
      UPDATE inventory_stock 
      SET quantity = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const updateParams = [newQuantity, stockId];
    
    // 确保参数中没有undefined值
    if (updateParams.includes(undefined)) {
      throw new Error('更新库存失败：更新参数包含undefined值');
    }
    
    await client.query(updateQuery, updateParams);
    console.log(`已更新物料ID=${materialId}的库存，增加数量=${numQuantity}，新库存=${newQuantity}`);
    
    // 记录库存交易
    const transactionQuery = `
      INSERT INTO inventory_transactions 
      (material_id, location_id, transaction_type, quantity, unit_id, reference_no, reference_type, operator, remark, before_quantity, after_quantity) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await client.query(transactionQuery, [
      materialId, 
      locationId, 
      'purchase_inbound', 
      numQuantity, 
      unitId, 
      receiptNo, 
      'purchase_receipt', 
      'system',
      '采购入库',
      currentQuantity,
      newQuantity
    ]);
    
  } else {
    // 创建新库存记录
    const insertQuery = `
      INSERT INTO inventory_stock 
      (material_id, location_id, quantity)
      VALUES (?, ?, ?)
    `;
    
    const insertParams = [materialId, locationId, numQuantity];
    
    // 确保参数中没有undefined值
    if (insertParams.includes(undefined)) {
      throw new Error('更新库存失败：插入参数包含undefined值');
    }
    
    const insertResult = await client.query(insertQuery, insertParams);
    console.log(`已创建物料ID=${materialId}的新库存记录，数量=${numQuantity}`);
    
    // 记录库存交易
    const transactionQuery = `
      INSERT INTO inventory_transactions 
      (material_id, location_id, transaction_type, quantity, unit_id, reference_no, reference_type, operator, remark, before_quantity, after_quantity) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await client.query(transactionQuery, [
      materialId, 
      locationId, 
      'purchase_inbound', 
      numQuantity, 
      unitId, 
      receiptNo, 
      'purchase_receipt', 
      'system',
      '采购入库',
      0,
      numQuantity
    ]);
  }
}

// 通过ID获取采购入库单（内部使用）
const getReceiptById = async (id) => {
  if (!id) return null;
  
  const receiptId = parseInt(id, 10);
  if (isNaN(receiptId)) return null;
  
  const connection = await db.pool.getConnection();
  try {
    // 获取入库单基本信息
    const query = 'SELECT * FROM purchase_receipts WHERE id = ?';
    const [result] = await connection.query(query, [receiptId]);
    
    if (result.length === 0) {
      return null;
    }
    
    const receipt = result[0];
    
    // 获取入库单物料
    const itemsQuery = 'SELECT * FROM purchase_receipt_items WHERE receipt_id = ? ORDER BY id';
    const [itemsResult] = await connection.query(itemsQuery, [receiptId]);
    
    receipt.items = itemsResult;
    
    return receipt;
  } finally {
    connection.release();
  }
};

// 获取收货单统计数据
const getReceiptStats = async (req, res) => {
  try {
    const connection = await db.pool.getConnection();
    try {
      // 查询收货单总数和各状态数量
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draftCount,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmedCount,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedCount,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledCount
        FROM purchase_receipts
      `;
      const [statsResult] = await connection.query(statsQuery);
      
      // 查询收货单总金额
      const amountQuery = `
        SELECT SUM(pri.qualified_quantity * pri.price) as totalAmount
        FROM purchase_receipt_items pri
        JOIN purchase_receipts pr ON pri.receipt_id = pr.id
        WHERE pr.status != 'cancelled'
      `;
      const [amountResult] = await connection.query(amountQuery);
      
      const stats = {
        total: statsResult[0].total || 0,
        draftCount: statsResult[0].draftCount || 0,
        confirmedCount: statsResult[0].confirmedCount || 0,
        completedCount: statsResult[0].completedCount || 0,
        cancelledCount: statsResult[0].cancelledCount || 0,
        totalAmount: amountResult[0].totalAmount || 0
      };
      
      res.json(stats);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取收货单统计数据失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

module.exports = {
  getReceipts,
  getReceipt,
  createReceipt,
  updateReceipt,
  updateReceiptStatus,
  getReceiptStats
};