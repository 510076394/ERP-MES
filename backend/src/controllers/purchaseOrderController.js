const db = require('../config/db');
const pool = db.pool; // 正确引用连接池
const purchaseModel = require('../models/purchase');
const { getErrorMessage } = require('../utils/errorHandler');

// 获取采购订单列表
const getOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      orderNo, 
      supplierId,
      startDate, 
      endDate, 
      status 
    } = req.query;
    const offset = (page - 1) * pageSize;
    
    let query = `
      SELECT o.*, COUNT(*) OVER() as total_count
      FROM purchase_orders o
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (orderNo) {
      query += ` AND o.order_no LIKE ?`;
      queryParams.push(`%${orderNo}%`);
    }
    
    if (supplierId) {
      query += ` AND o.supplier_id = ?`;
      queryParams.push(supplierId);
    }
    
    if (startDate) {
      query += ` AND o.order_date >= ?`;
      queryParams.push(startDate);
    }
    
    if (endDate) {
      query += ` AND o.order_date <= ?`;
      queryParams.push(endDate);
    }
    
    if (status) {
      query += ` AND o.status = ?`;
      queryParams.push(status);
    }
    
    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(pageSize));
    queryParams.push(parseInt(offset));
    
    // 使用正确的连接池查询方法
    const [rows] = await pool.query(query, queryParams);
    
    // 获取订单的物料详情
    const items = [];
    if (rows.length > 0) {
      const orderIds = rows.map(row => row.id);
      const itemsQuery = `
        SELECT * FROM purchase_order_items
        WHERE order_id IN (?)
        ORDER BY id
      `;
      const [itemRows] = await pool.query(itemsQuery, [orderIds]);
      items.push(...itemRows);
    }
    
    // 整合订单及其物料
    const orders = rows.map(row => {
      const orderItems = items.filter(item => item.order_id === row.id);
      
      // 添加前端期望的字段，映射数据库字段
      const orderWithMappedFields = {
        ...row,
        items: orderItems,
        order_number: row.order_no,
        notes: row.remarks
      };
      
      return orderWithMappedFields;
    });
    
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    
    res.json({
      items: orders,
      total: totalCount,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(totalCount / pageSize)
    });
  } catch (error) {
    console.error('获取采购订单列表失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// 获取采购订单详情
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取订单基本信息
    const query = 'SELECT * FROM purchase_orders WHERE id = ?';
    const [rows] = await pool.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: '采购订单不存在' });
    }
    
    const order = rows[0];
    
    // 获取订单物料
    const itemsQuery = 'SELECT * FROM purchase_order_items WHERE order_id = ? ORDER BY id';
    const [itemRows] = await pool.query(itemsQuery, [id]);
    
    order.items = itemRows;
    
    // 添加前端期望的字段，映射数据库字段
    order.order_number = order.order_no;
    order.notes = order.remarks;
    
    res.json(order);
  } catch (error) {
    console.error('获取采购订单详情失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// 创建采购订单
const createOrder = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    console.log('创建订单请求数据:', JSON.stringify(req.body, null, 2));
    
    const { 
      order_date: orderDate, 
      supplier_id: supplierId, 
      expected_delivery_date: expectedDeliveryDate, 
      contact_person: contactPerson, 
      contact_phone: contactPhone, 
      remarks, 
      total_amount: totalAmount,
      requisition_id: requisitionId,
      requisition_number: requisitionNumber,
      items 
    } = req.body;
    
    // 获取供应商信息
    const [supplierRows] = await connection.query('SELECT name FROM suppliers WHERE id = ?', [supplierId]);
    
    if (supplierRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '供应商不存在' });
    }
    
    const supplierName = supplierRows[0].name;
    
    // 生成订单号
    const orderNo = await purchaseModel.generateOrderNo();
    
    // 创建采购订单
    const insertQuery = `
      INSERT INTO purchase_orders (
        order_no, order_date, supplier_id, supplier_name, 
        expected_delivery_date, contact_person, contact_phone, 
        total_amount, remarks, status, requisition_id, requisition_number
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await connection.query(insertQuery, [
      orderNo,
      orderDate,
      supplierId,
      supplierName,
      expectedDeliveryDate,
      contactPerson,
      contactPhone,
      totalAmount || 0,
      remarks,
      req.body.status || 'draft',
      requisitionId || null,
      requisitionNumber || null
    ]);
    
    // 如果有关联申请单ID，记录日志
    if (requisitionId) {
      console.log(`订单 ${orderNo} 关联了申请单，ID: ${requisitionId}, 编号: ${requisitionNumber || '未知'}`);
    }
    
    const orderId = result.insertId;
    
    // 创建采购订单物料项目
    if (items && items.length > 0) {
      const insertItemsQuery = `
        INSERT INTO purchase_order_items 
        (order_id, material_id, material_code, material_name, specification, unit, unit_id, price, quantity, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      for (const item of items) {
        const {
          material_id,
          material_code,
          material_name,
          specification,
          unit,
          unit_id,
          price,
          quantity,
          total_price: totalPrice
        } = item;
        
        await connection.query(insertItemsQuery, [
          orderId,
          material_id,
          material_code,
          material_name,
          specification || '',
          unit,
          unit_id || null,
          price,
          quantity,
          totalPrice || (price * quantity)
        ]);
      }
    }
    
    await connection.commit();
    
    // 获取完整的订单信息
    const createdOrder = await getOrderById(orderId);
    
    res.status(201).json(createdOrder);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('创建采购订单失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  } finally {
    if (connection) connection.release();
  }
};

// 更新采购订单
const updateOrder = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    console.log('更新订单请求数据:', JSON.stringify(req.body, null, 2));
    
    const { id } = req.params;
    const { 
      order_date: orderDate, 
      supplier_id: supplierId, 
      expected_delivery_date: expectedDeliveryDate, 
      contact_person: contactPerson, 
      contact_phone: contactPhone, 
      remarks, 
      total_amount: totalAmount,
      requisition_id: requisitionId,
      requisition_number: requisitionNumber,
      items 
    } = req.body;
    
    // 检查订单是否存在及其状态
    const [checkRows] = await connection.query('SELECT status FROM purchase_orders WHERE id = ?', [id]);
    
    if (checkRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '采购订单不存在' });
    }
    
    const currentStatus = checkRows[0].status;
    if (currentStatus !== 'pending' && currentStatus !== 'draft') {
      await connection.rollback();
      return res.status(400).json({ error: '只能编辑待处理或草稿状态的采购订单' });
    }
    
    // 获取供应商信息
    const [supplierRows] = await connection.query('SELECT name FROM suppliers WHERE id = ?', [supplierId]);
    
    if (supplierRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '供应商不存在' });
    }
    
    const supplierName = supplierRows[0].name;
    
    // 更新采购订单基本信息
    const updateQuery = `
      UPDATE purchase_orders
      SET order_date = ?, supplier_id = ?, supplier_name = ?,
          expected_delivery_date = ?, contact_person = ?, contact_phone = ?,
          total_amount = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP,
          requisition_id = ?, requisition_number = ?
      WHERE id = ?
    `;
    await connection.query(updateQuery, [
      orderDate,
      supplierId,
      supplierName,
      expectedDeliveryDate,
      contactPerson,
      contactPhone, 
      totalAmount || 0,
      remarks,
      requisitionId || null,
      requisitionNumber || null,
      id
    ]);
    
    // 如果有关联申请单ID，记录日志
    if (requisitionId) {
      console.log(`更新订单 id=${id}，关联了申请单，ID: ${requisitionId}, 编号: ${requisitionNumber || '未知'}`);
    }
    
    // 删除原有物料项目
    await connection.query('DELETE FROM purchase_order_items WHERE order_id = ?', [id]);
    
    // 添加新的物料项目
    if (items && items.length > 0) {
      const insertItemsQuery = `
        INSERT INTO purchase_order_items 
        (order_id, material_id, material_code, material_name, specification, unit, unit_id, price, quantity, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      for (const item of items) {
        const {
          material_id,
          material_code,
          material_name,
          specification,
          unit,
          unit_id,
          price,
          quantity,
          total_price: totalPrice
        } = item;
        
        await connection.query(insertItemsQuery, [
          id,
          material_id,
          material_code,
          material_name,
          specification || '',
          unit,
          unit_id || null,
          price,
          quantity,
          totalPrice || (price * quantity)
        ]);
      }
    }
    
    await connection.commit();
    
    // 获取更新后的订单信息
    const updatedOrder = await getOrderById(id);
    
    res.json(updatedOrder);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('更新采购订单失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  } finally {
    if (connection) connection.release();
  }
};

// 删除采购订单
const deleteOrder = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // 检查订单是否存在及其状态
    const [checkRows] = await connection.query('SELECT status FROM purchase_orders WHERE id = ?', [id]);
    
    if (checkRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '采购订单不存在' });
    }
    
    const currentStatus = checkRows[0].status;
    if (currentStatus !== 'pending' && currentStatus !== 'draft') {
      await connection.rollback();
      return res.status(400).json({ error: '只能删除待处理或草稿状态的采购订单' });
    }
    
    // 删除订单 (物料项目会通过外键CASCADE自动删除)
    await connection.query('DELETE FROM purchase_orders WHERE id = ?', [id]);
    
    await connection.commit();
    
    res.json({ message: '采购订单删除成功' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('删除采购订单失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  } finally {
    if (connection) connection.release();
  }
};

// 更新采购订单状态
const updateOrderStatus = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // 记录请求体内容，帮助调试
    console.log('更新订单状态，ID:', id, '请求体:', JSON.stringify(req.body, null, 2));
    
    // 从请求体中获取状态 - 支持多种格式
    let newStatus;
    if (req.body.newStatus) {
      newStatus = req.body.newStatus;
    } else if (req.body.status) {
      newStatus = req.body.status;
    } else if (typeof req.body === 'string') {
      newStatus = req.body;
    } else {
      await connection.rollback();
      return res.status(400).json({ 
        error: '无效的状态格式',
        receivedBody: req.body 
      });
    }
    
    console.log('处理后的新状态:', newStatus);
    
    // 检查状态值是否有效
    const validStatuses = ['draft', 'pending', 'approved', 'cancelled', 'completed'];
    if (!validStatuses.includes(newStatus)) {
      await connection.rollback();
      return res.status(400).json({ 
        error: '无效的状态值',
        receivedStatus: newStatus,
        validStatuses: validStatuses 
      });
    }
    
    // 检查订单是否存在
    const [checkRows] = await connection.query('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    
    if (checkRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '采购订单不存在' });
    }
    
    const currentOrder = checkRows[0];
    const currentStatus = currentOrder.status;
    
    console.log('当前订单状态:', currentStatus, '目标状态:', newStatus);
    
    // 检查状态变更是否有效
    if (currentStatus === newStatus) {
      await connection.rollback();
      return res.status(400).json({ error: '当前已经是该状态' });
    }
    
    // 特定状态转换的验证
    const validTransitions = {
      'draft': ['pending', 'cancelled'],
      'pending': ['approved', 'cancelled'],
      'approved': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };
    
    if (!validTransitions[currentStatus].includes(newStatus)) {
      await connection.rollback();
      return res.status(400).json({ 
        error: `无效的状态变更: 从 ${currentStatus} 到 ${newStatus}`,
        validTransitions: validTransitions[currentStatus]
      });
    }
    
    // 更新状态
    const updateQuery = `
      UPDATE purchase_orders
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const [result] = await connection.query(updateQuery, [newStatus, id]);
    
    await connection.commit();
    
    console.log('订单状态更新成功:', id, newStatus);
    
    // 获取更新后的订单
    const updatedOrder = await getOrderById(id);
    
    res.json(updatedOrder);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('更新采购订单状态失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  } finally {
    if (connection) connection.release();
  }
};

// 获取采购统计数据
const getStatistics = async (req, res) => {
  try {
    // 获取订单数量统计
    const ordersCountQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM purchase_orders
    `;
    const [countRows] = await pool.query(ordersCountQuery);
    
    // 获取本月订单金额
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const monthlyAmountQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as monthly_amount
      FROM purchase_orders
      WHERE order_date BETWEEN ? AND ?
    `;
    const [amountRows] = await pool.query(monthlyAmountQuery, [
      firstDayOfMonth.toISOString().split('T')[0],
      lastDayOfMonth.toISOString().split('T')[0]
    ]);
    
    // 获取Top5供应商
    const topSuppliersQuery = `
      SELECT supplier_id, supplier_name, COUNT(*) as order_count, SUM(total_amount) as total_spent
      FROM purchase_orders
      WHERE status IN ('approved', 'completed')
      GROUP BY supplier_id, supplier_name
      ORDER BY total_spent DESC
      LIMIT 5
    `;
    const [supplierRows] = await pool.query(topSuppliersQuery);
    
    res.json({
      counts: countRows[0],
      monthlyAmount: amountRows[0].monthly_amount,
      topSuppliers: supplierRows
    });
  } catch (error) {
    console.error('获取采购统计数据失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// 根据ID获取采购订单信息（内部使用）
const getOrderById = async (id) => {
  try {
    // 获取订单基本信息
    const query = 'SELECT * FROM purchase_orders WHERE id = ?';
    const [rows] = await pool.query(query, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    const order = rows[0];
    
    // 获取订单物料
    const itemsQuery = 'SELECT * FROM purchase_order_items WHERE order_id = ? ORDER BY id';
    const [itemRows] = await pool.query(itemsQuery, [id]);
    
    order.items = itemRows;
    
    // 添加前端期望的字段，映射数据库字段
    order.order_number = order.order_no;
    order.notes = order.remarks;
    
    return order;
  } catch (error) {
    console.error('获取采购订单详情失败:', error);
    throw error;
  }
};

// 获取供应商列表（用于采购订单中选择）
const getSuppliers = async (req, res) => {
  try {
    // 获取启用状态的供应商
    const query = 'SELECT id, code, name, contact_person, contact_phone FROM suppliers WHERE status = 1 ORDER BY code';
    const [rows] = await pool.query(query);
    
    res.json(rows);
  } catch (error) {
    console.error('获取供应商列表失败:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  getStatistics,
  getSuppliers
}; 