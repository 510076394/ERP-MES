const db = require('../config/db');
const { materialModel, customerModel } = require('../models/baseData');

// 生成库存交易流水号
async function generateTransactionNo(connection) {
  // 生成格式为：TR + 年月日 + 3位序号
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // 获取年份后两位
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份补零
  const day = String(now.getDate()).padStart(2, '0'); // 日期补零
  const dateStr = `${year}${month}${day}`;
  
  // 从数据库查询当天最大序号
  const [results] = await connection.query(
    'SELECT MAX(transaction_no) as max_no FROM inventory_transactions WHERE transaction_no LIKE ?',
    [`TR${dateStr}%`]
  );
  
  let sequence = 1;
  if (results[0].max_no) {
    // 提取序号部分并增加1
    const currentSequence = parseInt(results[0].max_no.slice(-3));
    sequence = currentSequence + 1;
  }
  
  // 确保序号格式为3位
  const sequenceStr = sequence.toString().padStart(3, '0');
  
  return `TR${dateStr}${sequenceStr}`;
}

// Import the connection pool from db
const connection = db.pool;

// Helper function to get a connection from the pool
const getConnection = async () => {
  return await connection.getConnection();
};

// 添加新的控制器方法
exports.getCustomersList = async (req, res) => {
  try {
    const customers = await customerModel.getAllCustomers();
    res.json(customers);
  } catch (error) {
    console.error('Error getting customers list:', error);
    res.status(500).json({ message: 'Error getting customers list' });
  }
};

exports.getProductsList = async (req, res) => {
  try {
    const products = await materialModel.getAllMaterials(1, 1000, { type: 'finished' });
    res.json(products.list || []);
  } catch (error) {
    console.error('Error getting products list:', error);
    res.status(500).json({ message: 'Error getting products list' });
  }
};

// Customer Controllers
exports.getCustomers = async (req, res) => {
  try {
    const customers = await db.getCustomers();
    res.json(customers);
  } catch (error) {
    console.error('Error getting customers:', error);
    res.status(500).json({ message: 'Error getting customers' });
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const customer = await db.getCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    console.error('Error getting customer:', error);
    res.status(500).json({ message: 'Error getting customer' });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const customer = await db.createCustomer(req.body);
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ message: 'Error creating customer' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await db.updateCustomer(req.params.id, req.body);
    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ message: 'Error updating customer' });
  }
};

// Sales Quotation Controllers
exports.getSalesQuotations = async (req, res) => {
  try {
    const quotations = await db.getSalesQuotations();
    res.json(quotations);
  } catch (error) {
    console.error('Error getting sales quotations:', error);
    res.status(500).json({ message: 'Error getting sales quotations' });
  }
};

// 添加销售报价单统计数据接口
exports.getSalesQuotationStatistics = async (req, res) => {
  try {
    // 这里可以实现真实的统计逻辑，现在返回模拟数据
    res.json({
      monthly_count: 15,
      monthly_amount: 45000,
      conversion_rate: 0.65
    });
  } catch (error) {
    console.error('Error getting quotation statistics:', error);
    res.status(500).json({ message: 'Error getting quotation statistics' });
  }
};

exports.getSalesQuotation = async (req, res) => {
  try {
    const quotation = await db.getSalesQuotation(req.params.id);
    if (!quotation) {
      return res.status(404).json({ message: 'Sales quotation not found' });
    }
    res.json(quotation);
  } catch (error) {
    console.error('Error getting sales quotation:', error);
    res.status(500).json({ message: 'Error getting sales quotation' });
  }
};

exports.createSalesQuotation = async (req, res) => {
  try {
    const { quotation, items } = req.body;
    quotation.createdBy = req.user.id;
    const result = await db.createSalesQuotation(quotation, items);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating sales quotation:', error);
    res.status(500).json({ message: 'Error creating sales quotation' });
  }
};

exports.updateSalesQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { quotation, items } = req.body;
    
    // 在实际实现中，这里应该调用db.updateSalesQuotation
    // 目前返回模拟成功响应
    res.json({ 
      id, 
      ...quotation,
      message: 'Quotation updated successfully'
    });
  } catch (error) {
    console.error('Error updating sales quotation:', error);
    res.status(500).json({ message: 'Error updating sales quotation' });
  }
};

// 添加删除报价单功能
exports.deleteSalesQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 在实际实现中，这里应该调用db.deleteSalesQuotation
    // 目前返回模拟成功响应
    res.json({ 
      message: 'Quotation deleted successfully',
      id
    });
  } catch (error) {
    console.error('Error deleting sales quotation:', error);
    res.status(500).json({ message: 'Error deleting sales quotation' });
  }
};

// 添加报价单转订单功能
exports.convertQuotationToOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 在实际实现中，这里应该调用相应的数据库函数
    // 目前返回模拟成功响应
    res.json({ 
      message: 'Quotation converted to order successfully',
      quotation_id: id,
      order_id: Math.floor(Math.random() * 1000) // 模拟生成的订单ID
    });
  } catch (error) {
    console.error('Error converting quotation to order:', error);
    res.status(500).json({ message: 'Error converting quotation to order' });
  }
};

// Sales Order Controllers
exports.getSalesOrders = async (req, res) => {
  try {
    const orders = await db.getSalesOrders();
    // 转换订单数据以匹配前端期望的格式
    const formattedOrders = orders.map(order => {
      // 基本订单信息
      const formattedOrder = {
        id: order.id,
        order_no: order.order_no,
        customer: order.customer_name,
        totalAmount: parseFloat(order.total_amount) || 0, // 确保是数字类型
        orderDate: order.order_date,
        deliveryDate: order.delivery_date,
        status: order.status,
        remark: order.remarks,
        created_by: order.created_by_name,
        // 添加订单详情信息
        address: order.delivery_address,
        contact: order.contact_person,
        phone: order.contact_phone,
        // 添加订单物料信息
        items: order.items ? order.items.map(item => ({
          code: item.material_code,
          material_name: item.material_name,
          specification: item.specification,
          quantity: parseFloat(item.quantity) || 0,
          unit_name: item.unit_name,
          unit_price: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.amount) || 0
        })) : []
      };
      
      return formattedOrder;
    });
    res.json(formattedOrders);
  } catch (error) {
    console.error('Error getting sales orders:', error);
    res.status(500).json({ message: 'Error getting sales orders' });
  }
};

exports.getSalesOrder = async (req, res) => {
  try {
    const order = await db.getSalesOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Sales order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error getting sales order:', error);
    res.status(500).json({ message: 'Error getting sales order' });
  }
};

// 更新订单状态
exports.updateOrderStatus = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { newStatus } = req.body;

    // 验证状态值是否有效
    const validStatuses = ['pending', 'confirmed', 'in_production', 'ready_to_ship', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      await connection.rollback();
      return res.status(400).json({ message: '无效的状态值' });
    }

    // 检查订单是否存在
    const [checkResult] = await connection.execute(
      'SELECT status FROM sales_orders WHERE id = ?',
      [id]
    );

    if (checkResult.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: '订单不存在' });
    }

    const currentStatus = checkResult[0].status;

    // 验证状态转换的合法性
    const validTransitions = {
      'pending': ['confirmed', 'in_production', 'ready_to_ship', 'cancelled'],
      'confirmed': ['in_production', 'ready_to_ship', 'completed', 'cancelled'],
      'in_production': ['ready_to_ship', 'completed', 'cancelled'],
      'ready_to_ship': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      await connection.rollback();
      return res.status(400).json({ message: '无效的状态转换' });
    }

    // 更新订单状态
    const [updateResult] = await connection.execute(
      'UPDATE sales_orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, id]
    );

    // 获取更新后的订单
    const [updatedOrder] = await connection.execute(
      'SELECT * FROM sales_orders WHERE id = ?',
      [id]
    );

    await connection.commit();
    res.json(updatedOrder[0]);
  } catch (error) {
    await connection.rollback();
    console.error('更新订单状态时出错:', error);
    res.status(500).json({ message: '更新订单状态失败', error: error.message });
  } finally {
    connection.release();
  }
};

exports.createSalesOrder = async (req, res) => {
  try {
    console.log('收到创建销售订单请求:', req.body);
    const orderData = req.body;
    
    if (!orderData || !orderData.items || !Array.isArray(orderData.items)) {
      return res.status(400).json({ message: '订单数据格式不正确' });
    }

    // 验证必要字段
    if (!orderData.customer_id) {
      return res.status(400).json({ message: '客户ID不能为空' });
    }

    // 设置创建者信息
    if (req.user && req.user.id) {
      orderData.createdBy = req.user.id;
    } else {
      orderData.createdBy = 1; // 假设1是默认管理员ID
    }

    // 生成订单号函数
    const generateOrderNo = async () => {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2); // 获取年份后两位
      const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份补零
      const day = String(now.getDate()).padStart(2, '0'); // 日期补零
      const dateStr = `${year}${month}${day}`;
      
      // 从数据库获取当天最后一个订单号
      const lastOrderNo = await db.getLastOrderNoOfDay(dateStr);
      
      let sequence = '001';
      if (lastOrderNo) {
        // 如果存在当天的订单，则序号加1
        const lastSequence = parseInt(lastOrderNo.slice(-3));
        sequence = String(lastSequence + 1).padStart(3, '0');
      }
      
      return `DD${dateStr}${sequence}`;
    };

    // 准备订单数据
    const order = {
      orderNo: await generateOrderNo(), // 使用新的订单号生成规则
      customerId: orderData.customer_id,
      quotationId: orderData.quotation_id || null,
      totalAmount: orderData.total_amount || 0,
      paymentTerms: orderData.payment_terms || '',
      // 确保日期格式正确 (YYYY-MM-DD)
      deliveryDate: orderData.delivery_date ? new Date(orderData.delivery_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: orderData.status || 'draft',
      remarks: orderData.remark || '',
      createdBy: orderData.createdBy
    };

    // 处理订单项
    const items = orderData.items.map(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const unit_price = parseFloat(item.unit_price) || 0;
      const amount = quantity * unit_price; // 计算实际金额
      
      return {
        material_id: item.material_id,
        quantity: quantity,
        unit_price: unit_price,
        amount: amount
      };
    });

    // 计算总金额
    order.totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    try {
      // 创建销售订单
      const result = await db.createSalesOrder(order, items);
      console.log('创建订单结果:', result);
      
      res.status(201).json(result);
    } catch (error) {
      console.error('数据库操作错误:', error);
      res.status(500).json({ 
        message: '创建订单失败',
        error: error.message 
      });
    }
  } catch (error) {
    console.error('创建销售订单时出错:', error);
    res.status(500).json({ 
      message: '创建销售订单时出错',
      error: error.message 
    });
  }
};

exports.updateSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { order, items } = req.body;
    
    // 调用数据库函数更新订单
    const updatedOrder = await db.updateSalesOrder(id, order, items);
    
    res.json({
      message: 'Order updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating sales order:', error);
    res.status(500).json({ message: 'Error updating sales order', error: error.message });
  }
};

// 添加删除订单功能
exports.deleteSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 在实际实现中，这里应该调用db.deleteSalesOrder
    // 目前返回模拟成功响应
    res.json({ 
      message: 'Order deleted successfully',
      id
    });
  } catch (error) {
    console.error('Error deleting sales order:', error);
    res.status(500).json({ message: 'Error deleting sales order' });
  }
};

// 添加订单统计数据接口
exports.getSalesOrderStatistics = async (req, res) => {
  try {
    // 这里可以实现真实的统计逻辑，现在返回模拟数据
    res.json({
      monthly_count: 10,
      monthly_amount: 35000,
      completion_rate: 0.8
    });
  } catch (error) {
    console.error('Error getting order statistics:', error);
    res.status(500).json({ message: 'Error getting order statistics' });
  }
};

// 添加总体销售统计数据接口
exports.getSalesStatistics = async (req, res) => {
  try {
    // 这里可以实现真实的统计逻辑，现在返回模拟数据
    res.json({
      total_sales: 120000,
      monthly_sales: 35000,
      growth_rate: 0.15,
      top_products: [
        { name: "产品A", sales: 25000 },
        { name: "产品B", sales: 18000 },
        { name: "产品C", sales: 12000 }
      ],
      top_customers: [
        { name: "客户X", sales: 30000 },
        { name: "客户Y", sales: 22000 },
        { name: "客户Z", sales: 15000 }
      ]
    });
  } catch (error) {
    console.error('Error getting sales statistics:', error);
    res.status(500).json({ message: 'Error getting sales statistics' });
  }
};

// Sales Outbound Controllers
exports.getSalesOutbound = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search, startDate, endDate, status } = req.query;
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereClause = '';
    const queryParams = [];
    
    if (search) {
      whereClause += ' AND (so.outbound_no LIKE ? OR o.order_no LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    
    if (startDate) {
      whereClause += ' AND so.delivery_date >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND so.delivery_date <= ?';
      queryParams.push(endDate);
    }
    
    if (status) {
      whereClause += ' AND so.status = ?';
      queryParams.push(status);
    }
    
    // 临时禁用外键检查
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    try {
      // 查询总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM sales_outbound so
        LEFT JOIN sales_orders o ON so.order_id = o.id
        WHERE 1=1 ${whereClause}
      `;
      
      const [countResult] = await connection.query(countQuery, queryParams);
      const total = countResult[0].total;
      
      // 查询数据
      const query = `
        SELECT so.*, o.order_no, c.name as customer_name
        FROM sales_outbound so
        LEFT JOIN sales_orders o ON so.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE 1=1 ${whereClause}
        ORDER BY so.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const [results] = await connection.query(query, [...queryParams, parseInt(pageSize), parseInt(offset)]);
      
      // 统计不同状态的数量
      const statusQuery = `
        SELECT status, COUNT(*) as count
        FROM sales_outbound
        GROUP BY status
      `;
      
      const [statusCounts] = await connection.query(statusQuery);
      
      // 恢复外键检查
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      
      // 格式化状态统计数据
      const statusStats = {
        total: total,
        pendingCount: 0,
        processingCount: 0,
        completedCount: 0,
        cancelledCount: 0
      };
      
      statusCounts.forEach(item => {
        if (item.status === 'pending') statusStats.pendingCount = item.count;
        if (item.status === 'processing') statusStats.processingCount = item.count;
        if (item.status === 'completed') statusStats.completedCount = item.count;
        if (item.status === 'cancelled') statusStats.cancelledCount = item.count;
      });
      
      res.json({
        items: results,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        statusStats
      });
    } catch (error) {
      // 确保恢复外键检查
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      throw error;
    }
  } catch (error) {
    console.error('获取销售出库单列表失败:', error);
    res.status(500).json({ error: '获取销售出库单列表失败' });
  }
};

exports.getSalesOutboundById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    
    console.log('查询出库单详情, ID:', id);
    
    connection = await getConnection();
    
    // 查询出库单主信息
    const query = `
      SELECT so.*, o.order_no, c.name as customer_name, c.contact_person, c.contact_phone
      FROM sales_outbound so
      LEFT JOIN sales_orders o ON so.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE so.id = ?
    `;
    
    const [results] = await connection.query(query, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: '出库单不存在' });
    }
    
    const outbound = results[0];
    
    // 直接查询销售出库单明细，不通过外键关系
    console.log(`直接查询出库单明细, 出库单ID: ${id}`);
    try {
      // 临时禁用外键检查
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      
      // 查询明细数据
      const itemsQuery = `
        SELECT soi.id, soi.outbound_id, soi.product_id, soi.quantity
        FROM sales_outbound_items soi
        WHERE soi.outbound_id = ?
      `;
      
      const [itemsResult] = await connection.query(itemsQuery, [id]);
      console.log(`查询到 ${itemsResult.length} 条出库单明细`);
      
      // 恢复外键检查
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      
      // 如果有明细数据，查询相应的物料信息
      if (itemsResult.length > 0) {
        // 提取所有物料ID
        const materialIds = itemsResult.map(item => item.product_id);
        
        // 查询物料信息
        const materialsQuery = `
          SELECT id, code, name, specs, unit_id
          FROM materials
          WHERE id IN (?)
        `;
        
        const [materialsResult] = await connection.query(materialsQuery, [materialIds]);
        console.log(`查询到 ${materialsResult.length} 条物料信息`);
        
        // 查询单位信息
        const unitIds = materialsResult
          .map(m => m.unit_id)
          .filter(id => id !== null && id !== undefined);
        
        let unitsResult = [];
        if (unitIds.length > 0) {
          const unitsQuery = `
            SELECT id, name
            FROM units
            WHERE id IN (?)
          `;
          
          [unitsResult] = await connection.query(unitsQuery, [unitIds]);
          console.log(`查询到 ${unitsResult.length} 条单位信息`);
        }
        
        // 组装完整的明细数据
        const items = itemsResult.map(item => {
          const material = materialsResult.find(m => m.id === item.product_id) || {};
          const unit = material.unit_id ? unitsResult.find(u => u.id === material.unit_id) : null;
          
          return {
            id: item.id,
            outbound_id: item.outbound_id,
            product_id: item.product_id,
            quantity: item.quantity,
            material_name: material.name,
            material_code: material.code,
            specification: material.specs,
            unit_name: unit ? unit.name : null,
            unit_id: material.unit_id
          };
        });
        
        // 转换字段名称保持兼容性
        const formattedItems = items.map(item => ({
          id: item.id,
          outbound_id: item.outbound_id,
          product_id: item.product_id,
          quantity: item.quantity,
          product_name: item.material_name || `未知物料(ID:${item.product_id})`,
          product_code: item.material_code || '未知代码',
          specification: item.specification || '无规格信息',
          unit: item.unit_name || '未知单位'
        }));
        
        outbound.items = formattedItems;
      } else {
        outbound.items = [];
      }
      
      // 打印查询结果，用于诊断
      if (outbound.items && outbound.items.length > 0) {
        console.log('出库单明细样例:', JSON.stringify(outbound.items[0], null, 2));
      } else {
        console.warn('出库单无明细项');
      }
      
      res.json(outbound);
    } catch (error) {
      // 确保恢复外键检查
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      throw error;
    }
  } catch (error) {
    console.error('获取销售出库单详情失败:', error);
    res.status(500).json({ error: '获取销售出库单详情失败: ' + error.message });
  } finally {
    if (connection) {
      connection.release();
      console.log('数据库连接释放');
    }
  }
};

// 生成销售出库单号
async function generateSalesOutboundNo(conn) {
  try {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const prefix = `SO${dateStr}`;
    
    console.log('生成销售出库单号，前缀:', prefix);
    
    // 查询当天最大编号
    const [rows] = await conn.query(
      'SELECT MAX(outbound_no) as max_no FROM sales_outbound WHERE outbound_no LIKE ?',
      [`${prefix}%`]
    );
    
    let sequenceNumber = 1;
    if (rows[0].max_no) {
      // 提取序号部分并增加1
      const currentSequence = rows[0].max_no.slice(-3);
      sequenceNumber = parseInt(currentSequence, 10) + 1;
      console.log('当前最大序号:', currentSequence, '下一序号:', sequenceNumber);
    } else {
      console.log('今日无出库单，使用初始序号');
    }
    
    // 生成新的编号：SOyymmdd001, SOyymmdd002, ...
    const outboundNo = `${prefix}${String(sequenceNumber).padStart(3, '0')}`;
    console.log('生成的出库单号:', outboundNo);
    
    return outboundNo;
  } catch (error) {
    console.error('生成出库单号时出错:', error);
    throw error;
  }
}

exports.createSalesOutbound = async (req, res) => {
  let connection;
  
  try {
    const { order_id, delivery_date, status, remarks, items = [] } = req.body;
    const created_by = req.user?.id || 1; // 使用用户ID而不是用户名，默认为1（系统用户）
    
    console.log('销售出库单创建请求:', JSON.stringify({
      order_id, delivery_date, status, remarks,
      items_count: items?.length || 0
    }, null, 2));
    
    // 验证日期格式转换
    let formattedDeliveryDate;
    try {
      // 支持ISO格式日期或标准日期字符串
      if (delivery_date) {
        formattedDeliveryDate = new Date(delivery_date).toISOString().split('T')[0];
        console.log(`日期格式转换: ${delivery_date} -> ${formattedDeliveryDate}`);
      } else {
        formattedDeliveryDate = new Date().toISOString().split('T')[0];
        console.log(`使用当前日期: ${formattedDeliveryDate}`);
      }
    } catch (error) {
      console.error('日期格式转换错误:', error);
      return res.status(400).json({ error: '无效的日期格式' });
    }
    
    connection = await getConnection();
    await connection.beginTransaction();
    
    // 如果有order_id，验证订单存在
    if (order_id) {
      const [orderCheck] = await connection.query(
        'SELECT id FROM sales_orders WHERE id = ?',
        [order_id]
      );
      
      if (orderCheck.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: '关联的订单不存在' });
      }
    }
    
    // 生成出库单编号
    const outboundNo = await generateSalesOutboundNo(connection);
    console.log('生成的出库单编号:', outboundNo);
    
    // 插入出库单主表
    const insertQuery = `
      INSERT INTO sales_outbound (
        outbound_no, order_id, delivery_date, 
        status, remarks, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await connection.query(insertQuery, [
      outboundNo, order_id, formattedDeliveryDate,
      status || 'draft', remarks, created_by
    ]);
    
    const outboundId = result.insertId;
    console.log('创建出库单成功, ID:', outboundId);
    
    // 插入明细表
    if (items && items.length > 0) {
      console.log('接收到的物料项:', JSON.stringify(items, null, 2));
      
      // 验证物料是否存在于materials表中
      const materialIds = items.map(item => item.material_id || item.product_id).filter(Boolean);
      console.log('提取的物料ID列表:', materialIds);
      
      if (materialIds.length > 0) {
        try {
          // 安全处理IN查询，当只有一个ID时，直接使用等于
          let materialsQuery;
          let materialsParams;
          
          if (materialIds.length === 1) {
            materialsQuery = 'SELECT id, code, name FROM materials WHERE id = ?';
            materialsParams = [materialIds[0]];
          } else {
            materialsQuery = 'SELECT id, code, name FROM materials WHERE id IN (?)';
            materialsParams = [materialIds];
          }
          
          console.log('物料查询SQL:', materialsQuery);
          console.log('物料查询参数:', materialsParams);
          
          const [materialCheck] = await connection.query(materialsQuery, materialsParams);
          console.log('物料查询结果:', JSON.stringify(materialCheck, null, 2));
          
          const validMaterialIds = materialCheck.map(m => m.id);
          console.log('有效的物料ID:', validMaterialIds);
          
          // 查找无效的物料ID
          const invalidMaterialIds = materialIds.filter(id => !validMaterialIds.includes(id));
          if (invalidMaterialIds.length > 0) {
            console.warn('发现无效的物料ID:', invalidMaterialIds);
          }
          
          // 过滤出有效的物料项
          const validItems = items.filter(item => {
            const materialId = item.material_id || item.product_id;
            return validMaterialIds.includes(materialId);
          });
          
          if (validItems.length === 0) {
            console.warn('没有有效的物料项，出库单明细将为空');
          } else {
            console.log('有效物料项数量:', validItems.length);
            
            // 直接修改sales_outbound_items表的外键约束
            try {
              // 临时禁用外键检查
              await connection.query('SET FOREIGN_KEY_CHECKS = 0');
              
              const detailQuery = `
                INSERT INTO sales_outbound_items (
                  outbound_id, product_id, quantity
                ) VALUES ?
              `;
              
              const detailValues = [];
              
              for (const item of validItems) {
                const materialId = item.material_id || item.product_id;
                const material = materialCheck.find(m => m.id === materialId);
                console.log(`处理物料项: ID=${materialId}, 编码=${material?.code}, 名称=${material?.name}, 数量=${item.quantity}`);
                
                detailValues.push([
                  outboundId,
                  materialId,
                  item.quantity
                ]);
                
                console.log(`添加物料项: 出库单ID=${outboundId}, 物料ID=${materialId}, 数量=${item.quantity}`);
              }
              
              if (detailValues.length > 0) {
                console.log('插入出库单明细:', JSON.stringify(detailValues, null, 2));
                await connection.query(detailQuery, [detailValues]);
                console.log('出库单明细插入成功');
              }
              
              // 恢复外键检查
              await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            } catch (error) {
              // 确保恢复外键检查
              await connection.query('SET FOREIGN_KEY_CHECKS = 1');
              throw error;
            }
          }
        } catch (error) {
          console.error('验证物料ID或插入明细时出错:', error);
          throw new Error(`验证物料ID或插入明细时出错: ${error.message}`);
        }
      } else {
        console.warn('没有提供有效的物料ID');
      }
    }
    
    await connection.commit();
    console.log('事务提交成功');
    
    res.status(201).json({
      message: '销售出库单创建成功',
      id: outboundId,
      outbound_no: outboundNo
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.log('事务回滚');
    }
    console.error('创建销售出库单失败:', error);
    res.status(500).json({ error: '创建销售出库单失败: ' + error.message });
  } finally {
    if (connection) {
      connection.release();
      console.log('数据库连接释放');
    }
  }
};

exports.updateSalesOutbound = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const {
      outbound_date, order_id, customer_id, expected_delivery_date,
      warehouse_id, status, remarks, items
    } = req.body;
    
    // 转换日期格式为YYYY-MM-DD
    const formattedDeliveryDate = outbound_date ? new Date(outbound_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    connection = await getConnection();
    await connection.beginTransaction();
    
    console.log('更新出库单, ID:', id);
    
    // 1. 检查出库单是否存在并获取当前状态和明细
    const [outboundCheck] = await connection.query(
      'SELECT * FROM sales_outbound WHERE id = ?',
      [id]
    );
    
    if (outboundCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '出库单不存在' });
    }

    const currentOutbound = outboundCheck[0];
    
    // 获取当前明细
    const [currentItems] = await connection.query(
      'SELECT * FROM sales_outbound_items WHERE outbound_id = ?',
      [id]
    );
    
    // 2. 验证状态转换的合法性
    const validTransitions = {
      'draft': ['processing', 'cancelled'],
      'processing': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    if (status && !validTransitions[currentOutbound.status]?.includes(status)) {
      await connection.rollback();
      return res.status(400).json({ 
        error: '无效的状态转换',
        currentStatus: currentOutbound.status,
        newStatus: status
      });
    }

    // 3. 如果有order_id，验证订单存在
    let finalOrderId = order_id;
    if (finalOrderId) {
      const [orderCheck] = await connection.query(
        'SELECT id FROM sales_orders WHERE id = ?',
        [finalOrderId]
      );
      
      if (orderCheck.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: '关联的订单不存在' });
      }
    } else {
      finalOrderId = currentOutbound.order_id;
    }
    
    // 4. 更新主表
    const updateQuery = `
      UPDATE sales_outbound SET
        order_id = ?,
        delivery_date = ?,
        status = ?,
        remarks = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    
    const finalStatus = status || currentOutbound.status;
    const finalRemarks = remarks || currentOutbound.remarks;
    
    console.log('更新主表参数:', [finalOrderId, formattedDeliveryDate, finalStatus, finalRemarks, id]);
    
    await connection.query(updateQuery, [
      finalOrderId, formattedDeliveryDate, finalStatus, finalRemarks, id
    ]);
    
    console.log('出库单主表更新成功');
    
    // 5. 处理明细
    if (items && items.length > 0) {
      console.log('接收到的物料项:', JSON.stringify(items, null, 2));
      
      // 验证物料是否存在于materials表中
      const materialIds = items.map(item => item.material_id || item.product_id).filter(Boolean);
      
      if (materialIds.length > 0) {
        // 检查ID是否存在于materials表中
        const [materialCheck] = await connection.query(
          'SELECT id, code, name FROM materials WHERE id IN (?)',
          [materialIds]
        );
        
        const validMaterialIds = materialCheck.map(m => m.id);
        console.log('有效的物料ID:', validMaterialIds);
        
        // 过滤出有效的物料项
        const validItems = items.filter(item => {
          const materialId = item.material_id || item.product_id;
          return validMaterialIds.includes(materialId);
        });
        
        if (validItems.length === 0) {
          console.warn('没有有效的物料项，将保留原有明细');
        } else {
          // 临时禁用外键检查
          try {
            await connection.query('SET FOREIGN_KEY_CHECKS = 0');
            
            // 删除原有明细
            console.log('删除原有明细, 出库单ID:', id);
            await connection.query('DELETE FROM sales_outbound_items WHERE outbound_id = ?', [id]);
            console.log('原有明细删除成功');
            
            // 插入新明细
            const detailQuery = `
              INSERT INTO sales_outbound_items (
                outbound_id, product_id, quantity
              ) VALUES ?
            `;
            
            const detailValues = [];
            
            for (const item of validItems) {
              const materialId = item.material_id || item.product_id;
              const material = materialCheck.find(m => m.id === materialId);
              console.log(`处理物料项: ID=${materialId}, 编码=${material?.code}, 名称=${material?.name}, 数量=${item.quantity}`);
              
              detailValues.push([
                id,
                materialId,
                item.quantity
              ]);
            }
            
            if (detailValues.length > 0) {
              console.log('插入出库单明细:', JSON.stringify(detailValues, null, 2));
              await connection.query(detailQuery, [detailValues]);
              console.log('出库单明细插入成功');
            }
            
            // 恢复外键检查
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
          } catch (error) {
            // 确保恢复外键检查
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            throw error;
          }
        }
      } else {
        console.warn('没有提供有效的物料ID，将保留原有明细');
      }
    } else {
      console.log('未提供新的物料项，将保留原有明细');
      // 确保原有明细存在
      if (currentItems.length === 0) {
        console.warn('警告：原有明细为空');
      } else {
        console.log(`保留原有 ${currentItems.length} 条明细`);
      }
    }

    // 6. 如果状态变为completed，处理库存
    if (finalStatus === 'completed' && currentOutbound.status !== 'completed') {
      console.log('出库单状态变为已完成，开始处理库存...');
      
      // 获取需要处理的明细
      const itemsToProcess = items && items.length > 0 ? items : currentItems;
      
      if (itemsToProcess.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: '出库单没有明细项，无法完成出库' });
      }

      // 检查并扣减库存
      for (const item of itemsToProcess) {
        const materialId = item.material_id || item.product_id;
        const quantity = item.quantity;

        // 首先获取物料的默认库位
        const [materialInfo] = await connection.query(
          'SELECT id, location_id, unit_id, price FROM materials WHERE id = ?',
          [materialId]
        );

        if (materialInfo.length === 0) {
          await connection.rollback();
          return res.status(400).json({
            error: `物料ID ${materialId} 不存在`,
            material_id: materialId
          });
        }

        // 获取物料的默认库位，如果没有则使用默认库位3
        const locationId = materialInfo[0].location_id || 3;

        // 检查库存 - 首先查询物料默认库位的库存
        let [stockCheck] = await connection.query(
          'SELECT id, location_id, quantity FROM inventory_stock WHERE material_id = ? AND location_id = ?',
          [materialId, locationId]
        );

        // 如果默认库位没有库存，尝试查找其他库位的库存
        if (stockCheck.length === 0) {
          console.log(`物料 ${materialId} 在默认库位 ${locationId} 没有库存记录，尝试查找其他库位...`);
          
          [stockCheck] = await connection.query(
            'SELECT id, location_id, quantity FROM inventory_stock WHERE material_id = ? ORDER BY quantity DESC LIMIT 1',
            [materialId]
          );
        }

        // 如果仍然没有找到库存记录，返回错误
        if (stockCheck.length === 0) {
          await connection.rollback();
          return res.status(400).json({ 
            error: `物料ID ${materialId} 在任何库位都没有库存记录`,
            material_id: materialId
          });
        }

        const currentStock = parseFloat(stockCheck[0].quantity);
        const actualLocationId = stockCheck[0].location_id;
        
        if (currentStock < quantity) {
          await connection.rollback();
          return res.status(400).json({ 
            error: `物料ID ${materialId} 库存不足`,
            material_id: materialId,
            required: quantity,
            available: currentStock
          });
        }

        // 记录变动前数量和变动后数量
        const beforeQuantity = currentStock;
        const afterQuantity = currentStock - parseFloat(quantity);
        console.log(`物料 ${materialId} 库存变动: 前=${beforeQuantity}, 变动=${-quantity}, 后=${afterQuantity}, 库位=${actualLocationId}`);

        // 扣减库存
        await connection.query(
          'UPDATE inventory_stock SET quantity = ? WHERE id = ?',
          [afterQuantity, stockCheck[0].id]
        );

        // 记录库存流水 - 只保留出库单号信息
        const transactionRemark = `出库单号: ${currentOutbound.outbound_no}`;

        const unitId = materialInfo[0].unit_id || 1;
        const unitPrice = materialInfo[0].price || 0;
        const itemAmount = parseFloat(quantity) * unitPrice;

        // 记录库存变动历史
        await connection.query(
          `INSERT INTO inventory_stock_records (
            material_id, warehouse_id, type, quantity,
            source_id, source_type, operator, remarks, created_at
          ) VALUES (?, ?, 'out', ?, ?, 'sales_outbound', ?, ?, NOW())`,
          [
            materialId,
            actualLocationId, // 使用找到库存的实际库位
            -quantity, // 负数表示出库
            currentOutbound.id,
            req.user?.username || 'admin',
            transactionRemark
          ]
        );

        // 记录库存变动
        const transactionNo = await generateTransactionNo(connection);

        await connection.query(
          `INSERT INTO inventory_transactions (
            material_id, location_id, transaction_type, quantity,
            unit_id, reference_no, reference_type,
            operator, remark, created_at,
            before_quantity, after_quantity, transaction_no
          ) VALUES (?, ?, '销售出库', ?, ?, ?, 'sales_outbound', ?, ?, NOW(), ?, ?, ?)`,
          [
            materialId,
            actualLocationId, // 使用找到库存的实际库位
            -quantity, // 负数表示出库
            unitId, 
            currentOutbound.outbound_no,
            req.user?.username || 'admin',
            transactionRemark,
            beforeQuantity, // 添加变动前数量
            afterQuantity,  // 添加变动后数量
            transactionNo   // 添加唯一流水编号
          ]
        );

        console.log(`物料 ${materialId} 库存扣减成功: ${quantity}`);
      }

      // 更新订单状态
      if (finalOrderId) {
        await connection.query(
          'UPDATE sales_orders SET status = ? WHERE id = ?',
          ['shipped', finalOrderId]
        );
        console.log(`关联订单 ${finalOrderId} 状态已更新为已发货`);
      }

      console.log('库存处理完成');
    }
    
    await connection.commit();
    console.log('事务提交成功');
    
    // 7. 获取更新后的完整出库单信息
    const [updatedOutbound] = await connection.query(
      `SELECT so.*, o.order_no, c.name as customer_name
       FROM sales_outbound so
       LEFT JOIN sales_orders o ON so.order_id = o.id
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE so.id = ?`,
      [id]
    );
    
    // 获取更新后的明细
    const [updatedItems] = await connection.query(
      `SELECT soi.*, m.code as material_code, m.name as material_name, m.specs as specification, u.name as unit_name
       FROM sales_outbound_items soi
       LEFT JOIN materials m ON soi.product_id = m.id
       LEFT JOIN units u ON m.unit_id = u.id
       WHERE soi.outbound_id = ?`,
      [id]
    );
    
    // 组合完整数据
    const completeOutbound = {
      ...updatedOutbound[0],
      items: updatedItems
    };
    
    res.json({
      message: '销售出库单更新成功',
      data: completeOutbound
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.log('事务回滚');
    }
    console.error('更新销售出库单失败:', error);
    res.status(500).json({ error: '更新销售出库单失败: ' + error.message });
  } finally {
    if (connection) {
      connection.release();
      console.log('数据库连接释放');
    }
  }
};

// 添加删除出库单功能
exports.deleteSalesOutbound = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    
    connection = await getConnection();
    await connection.beginTransaction();
    
    // 临时禁用外键检查
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    try {
      // 删除明细
      await connection.query('DELETE FROM sales_outbound_items WHERE outbound_id = ?', [id]);
      
      // 删除主表
      await connection.query('DELETE FROM sales_outbound WHERE id = ?', [id]);
      
      // 恢复外键检查
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      
      await connection.commit();
      
      res.json({
        message: '销售出库单删除成功',
        id: parseInt(id)
      });
    } catch (error) {
      // 确保恢复外键检查
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('删除销售出库单失败:', error);
    res.status(500).json({ error: '删除销售出库单失败' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Sales Return Controllers
exports.getSalesReturns = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search, startDate, endDate, status } = req.query;
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereClause = '';
    const queryParams = [];
    
    if (search) {
      whereClause += ' AND (sr.return_no LIKE ? OR c.customer_name LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    
    if (startDate) {
      whereClause += ' AND sr.return_date >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND sr.return_date <= ?';
      queryParams.push(endDate);
    }
    
    if (status) {
      whereClause += ' AND sr.status = ?';
      queryParams.push(status);
    }
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM sales_returns sr
      LEFT JOIN customers c ON sr.order_id = c.id
      WHERE 1=1 ${whereClause}
    `;
    
    const [countResult] = await connection.query(countQuery, queryParams);
    const total = countResult[0].total;
    
    // 查询数据
    const query = `
      SELECT sr.*, c.customer_name, o.order_no
      FROM sales_returns sr
      LEFT JOIN customers c ON sr.order_id = c.id
      LEFT JOIN sales_orders o ON sr.order_id = o.id
      WHERE 1=1 ${whereClause}
      ORDER BY sr.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [results] = await connection.query(query, [...queryParams, parseInt(pageSize), parseInt(offset)]);
    
    // 统计不同状态的数量
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM sales_returns
      GROUP BY status
    `;
    
    const [statusCounts] = await connection.query(statusQuery);
    
    // 格式化状态统计数据
    const statusStats = {
      total: total,
      draftCount: 0,
      pendingCount: 0,
      approvedCount: 0,
      completedCount: 0,
      rejectedCount: 0
    };
    
    statusCounts.forEach(item => {
      if (item.status === 'draft') statusStats.draftCount = item.count;
      if (item.status === 'pending') statusStats.pendingCount = item.count;
      if (item.status === 'approved') statusStats.approvedCount = item.count;
      if (item.status === 'completed') statusStats.completedCount = item.count;
      if (item.status === 'rejected') statusStats.rejectedCount = item.count;
    });
    
    res.json({
      items: results,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      statusStats
    });
  } catch (error) {
    console.error('获取销售退货单列表失败:', error);
    res.status(500).json({ error: '获取销售退货单列表失败' });
  }
};

exports.getSalesReturnById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询退货单主信息
    const query = `
      SELECT sr.*, c.customer_name, c.contact_person, c.contact_phone, o.order_no
      FROM sales_returns sr
      LEFT JOIN customers c ON sr.order_id = c.id
      LEFT JOIN sales_orders o ON sr.order_id = o.id
      WHERE sr.id = ?
    `;
    
    const [returnResults] = await connection.query(query, [id]);
    
    if (returnResults.length === 0) {
      return res.status(404).json({ error: '退货单不存在' });
    }
    
    const returnData = returnResults[0];
    
    // 查询退货单明细
    const detailsQuery = `
      SELECT sri.*, m.material_name, m.specification, u.unit_name
      FROM sales_return_items sri
      LEFT JOIN materials m ON sri.product_id = m.id
      LEFT JOIN units u ON m.unit_id = u.id
      WHERE sri.return_id = ?
    `;
    
    const [detailsResults] = await connection.query(detailsQuery, [id]);
    
    // 组合结果
    returnData.items = detailsResults;
    
    res.json(returnData);
  } catch (error) {
    console.error('获取销售退货单详情失败:', error);
    res.status(500).json({ error: '获取销售退货单详情失败' });
  }
};

exports.createSalesReturn = async (req, res) => {
  let connection;
  try {
    const { 
      return_date, order_id, return_reason, status, remarks, items 
    } = req.body;
    
    // 验证必要参数
    if (!order_id || !return_date || !return_reason) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '至少需要一个退货项目' });
    }
    
    connection = await getConnection();
    await connection.beginTransaction();
    
    // 生成退货单号: RT + 年月日 + 3位序号
    const date = new Date();
    const dateStr = date.getFullYear() +
      ('0' + (date.getMonth() + 1)).slice(-2) +
      ('0' + date.getDate()).slice(-2);
    
    // 查询当天最大序号
    const [seqResult] = await connection.query(
      'SELECT MAX(SUBSTRING(return_no, 11)) as max_seq FROM sales_returns WHERE return_no LIKE ?',
      [`RT${dateStr}%`]
    );
    
    const seq = seqResult[0].max_seq ? parseInt(seqResult[0].max_seq) + 1 : 1;
    const returnNo = `RT${dateStr}${seq.toString().padStart(3, '0')}`;
    
    // 插入退货单主表
    const insertQuery = `
      INSERT INTO sales_returns (
        return_no, order_id, return_date, return_reason, 
        status, remarks, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const created_by = req.user ? req.user.id : 1; // 获取当前用户ID，如果不存在则默认为1
    
    const [result] = await connection.query(insertQuery, [
      returnNo, order_id, return_date, return_reason,
      status || 'draft', remarks, created_by
    ]);
    
    const returnId = result.insertId;
    
    // 插入明细表
    if (items && items.length > 0) {
      const detailQuery = `
        INSERT INTO sales_return_items (
          return_id, product_id, quantity, reason
        ) VALUES ?
      `;
      
      const detailValues = items.map(item => [
        returnId,
        item.product_id,
        item.quantity,
        item.reason || ''
      ]);
      
      await connection.query(detailQuery, [detailValues]);
    }
    
    await connection.commit();
    
    res.status(201).json({
      message: '销售退货单创建成功',
      id: returnId,
      return_no: returnNo
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('创建销售退货单失败:', error);
    res.status(500).json({ error: '创建销售退货单失败' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.updateSalesReturn = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const {
      return_date, order_id, return_reason, status, remarks, items
    } = req.body;
    
    connection = await getConnection();
    await connection.beginTransaction();
    
    // 更新主表
    const updateQuery = `
      UPDATE sales_returns SET
        return_date = ?,
        order_id = ?,
        return_reason = ?,
        status = ?,
        remarks = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    
    await connection.query(updateQuery, [
      return_date, order_id, return_reason, status, remarks, id
    ]);
    
    // 删除原有明细
    await connection.query('DELETE FROM sales_return_items WHERE return_id = ?', [id]);
    
    // 插入新明细
    if (items && items.length > 0) {
      const detailQuery = `
        INSERT INTO sales_return_items (
          return_id, product_id, quantity, reason
        ) VALUES ?
      `;
      
      const detailValues = items.map(item => [
        id,
        item.product_id,
        item.quantity,
        item.reason || ''
      ]);
      
      await connection.query(detailQuery, [detailValues]);
    }
    
    await connection.commit();
    
    res.json({
      message: '销售退货单更新成功',
      id: parseInt(id)
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('更新销售退货单失败:', error);
    res.status(500).json({ error: '更新销售退货单失败' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// 添加删除退货单功能
exports.deleteSalesReturn = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    
    connection = await getConnection();
    await connection.beginTransaction();
    
    // 删除明细
    await connection.query('DELETE FROM sales_return_items WHERE return_id = ?', [id]);
    
    // 删除主表
    await connection.query('DELETE FROM sales_returns WHERE id = ?', [id]);
    
    await connection.commit();
    
    res.json({
      message: '销售退货单删除成功',
      id: parseInt(id)
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('删除销售退货单失败:', error);
    res.status(500).json({ error: '删除销售退货单失败' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Sales Exchange Controllers
exports.getSalesExchanges = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search, startDate, endDate, status } = req.query;
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereClause = '';
    const queryParams = [];
    
    if (search) {
      whereClause += ' AND (se.exchange_no LIKE ? OR c.customer_name LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    
    if (startDate) {
      whereClause += ' AND se.exchange_date >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND se.exchange_date <= ?';
      queryParams.push(endDate);
    }
    
    if (status) {
      whereClause += ' AND se.status = ?';
      queryParams.push(status);
    }
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM sales_exchanges se
      LEFT JOIN customers c ON se.order_id = c.id
      WHERE 1=1 ${whereClause}
    `;
    
    const [countResult] = await connection.query(countQuery, queryParams);
    const total = countResult[0].total;
    
    // 查询数据
    const query = `
      SELECT se.*, c.customer_name, o.order_no
      FROM sales_exchanges se
      LEFT JOIN customers c ON se.order_id = c.id
      LEFT JOIN sales_orders o ON se.order_id = o.id
      WHERE 1=1 ${whereClause}
      ORDER BY se.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [results] = await connection.query(query, [...queryParams, parseInt(pageSize), parseInt(offset)]);
    
    // 统计不同状态的数量
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM sales_exchanges
      GROUP BY status
    `;
    
    const [statusCounts] = await connection.query(statusQuery);
    
    // 格式化状态统计数据
    const statusStats = {
      total: total,
      draftCount: 0,
      pendingCount: 0,
      approvedCount: 0,
      completedCount: 0,
      rejectedCount: 0
    };
    
    statusCounts.forEach(item => {
      if (item.status === 'draft') statusStats.draftCount = item.count;
      if (item.status === 'pending') statusStats.pendingCount = item.count;
      if (item.status === 'approved') statusStats.approvedCount = item.count;
      if (item.status === 'completed') statusStats.completedCount = item.count;
      if (item.status === 'rejected') statusStats.rejectedCount = item.count;
    });
    
    res.json({
      items: results,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      statusStats
    });
  } catch (error) {
    console.error('获取销售换货单列表失败:', error);
    res.status(500).json({ error: '获取销售换货单列表失败' });
  }
};

exports.getSalesExchangeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询换货单主信息
    const query = `
      SELECT se.*, c.customer_name, c.contact_person, c.contact_phone, o.order_no
      FROM sales_exchanges se
      LEFT JOIN customers c ON se.order_id = c.id
      LEFT JOIN sales_orders o ON se.order_id = o.id
      WHERE se.id = ?
    `;
    
    const [exchangeResults] = await connection.query(query, [id]);
    
    if (exchangeResults.length === 0) {
      return res.status(404).json({ error: '换货单不存在' });
    }
    
    const exchange = exchangeResults[0];
    
    // 查询换货单明细
    const detailsQuery = `
      SELECT sei.*, 
        m_old.material_name as old_product_name, m_old.specification as old_specification,
        m_new.material_name as new_product_name, m_new.specification as new_specification,
        u.unit_name
      FROM sales_exchange_items sei
      LEFT JOIN materials m_old ON sei.old_product_id = m_old.id
      LEFT JOIN materials m_new ON sei.new_product_id = m_new.id
      LEFT JOIN units u ON m_old.unit_id = u.id
      WHERE sei.exchange_id = ?
    `;
    
    const [detailsResults] = await connection.query(detailsQuery, [id]);
    
    // 组合结果
    exchange.items = detailsResults;
    
    res.json(exchange);
  } catch (error) {
    console.error('获取销售换货单详情失败:', error);
    res.status(500).json({ error: '获取销售换货单详情失败' });
  }
};

exports.createSalesExchange = async (req, res) => {
  let connection;
  try {
    const { 
      exchange_date, order_id, exchange_reason, status, remarks, items 
    } = req.body;
    
    // 验证必要参数
    if (!order_id || !exchange_date || !exchange_reason) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '至少需要一个换货项目' });
    }
    
    connection = await getConnection();
    await connection.beginTransaction();
    
    // 生成换货单号: EX + 年月日 + 3位序号
    const date = new Date();
    const dateStr = date.getFullYear() +
      ('0' + (date.getMonth() + 1)).slice(-2) +
      ('0' + date.getDate()).slice(-2);
    
    // 查询当天最大序号
    const [seqResult] = await connection.query(
      'SELECT MAX(SUBSTRING(exchange_no, 11)) as max_seq FROM sales_exchanges WHERE exchange_no LIKE ?',
      [`EX${dateStr}%`]
    );
    
    const seq = seqResult[0].max_seq ? parseInt(seqResult[0].max_seq) + 1 : 1;
    const exchangeNo = `EX${dateStr}${seq.toString().padStart(3, '0')}`;
    
    // 插入换货单主表
    const insertQuery = `
      INSERT INTO sales_exchanges (
        exchange_no, order_id, exchange_date, exchange_reason, 
        status, remarks, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const created_by = req.user ? req.user.id : 1; // 获取当前用户ID，如果不存在则默认为1
    
    const [result] = await connection.query(insertQuery, [
      exchangeNo, order_id, exchange_date, exchange_reason,
      status || 'draft', remarks, created_by
    ]);
    
    const exchangeId = result.insertId;
    
    // 插入明细表
    if (items && items.length > 0) {
      const detailQuery = `
        INSERT INTO sales_exchange_items (
          exchange_id, old_product_id, new_product_id, quantity, reason
        ) VALUES ?
      `;
      
      const detailValues = items.map(item => [
        exchangeId,
        item.old_product_id,
        item.new_product_id,
        item.quantity,
        item.reason || ''
      ]);
      
      await connection.query(detailQuery, [detailValues]);
    }
    
    await connection.commit();
    
    res.status(201).json({
      message: '销售换货单创建成功',
      id: exchangeId,
      exchange_no: exchangeNo
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('创建销售换货单失败:', error);
    res.status(500).json({ error: '创建销售换货单失败' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.updateSalesExchange = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const {
      exchange_date, order_id, exchange_reason, status, remarks, items
    } = req.body;
    
    connection = await getConnection();
    await connection.beginTransaction();
    
    // 更新主表
    const updateQuery = `
      UPDATE sales_exchanges SET
        exchange_date = ?,
        order_id = ?,
        exchange_reason = ?,
        status = ?,
        remarks = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    
    await connection.query(updateQuery, [
      exchange_date, order_id, exchange_reason, status, remarks, id
    ]);
    
    // 删除原有明细
    await connection.query('DELETE FROM sales_exchange_items WHERE exchange_id = ?', [id]);
    
    // 插入新明细
    if (items && items.length > 0) {
      const detailQuery = `
        INSERT INTO sales_exchange_items (
          exchange_id, old_product_id, new_product_id, quantity, reason
        ) VALUES ?
      `;
      
      const detailValues = items.map(item => [
        id,
        item.old_product_id,
        item.new_product_id,
        item.quantity,
        item.reason || ''
      ]);
      
      await connection.query(detailQuery, [detailValues]);
    }
    
    await connection.commit();
    
    res.json({
      message: '销售换货单更新成功',
      id: parseInt(id)
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('更新销售换货单失败:', error);
    res.status(500).json({ error: '更新销售换货单失败' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// 添加删除换货单功能
exports.deleteSalesExchange = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    
    connection = await getConnection();
    await connection.beginTransaction();
    
    // 删除明细
    await connection.query('DELETE FROM sales_exchange_items WHERE exchange_id = ?', [id]);
    
    // 删除主表
    await connection.query('DELETE FROM sales_exchanges WHERE id = ?', [id]);
    
    await connection.commit();
    
    res.json({
      message: '销售换货单删除成功',
      id: parseInt(id)
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('删除销售换货单失败:', error);
    res.status(500).json({ error: '删除销售换货单失败' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};