const db = require('../config/db');

// 添加一个辅助函数来处理inventory_transactions插入
const insertInventoryTransaction = async (connection, {
  material_id, 
  location_id,
  transaction_type,
  quantity,
  unit_id,
  reference_no,
  reference_type,
  operator,
  remark = null,
  beforeQuantity = null,
  afterQuantity = null
}) => {
  try {
    // 查询物料和库位信息，以获取所需的字段值
    const [materialInfo] = await connection.execute(
      'SELECT code, name FROM materials WHERE id = ?',
      [material_id]
    );
    
    const [locationInfo] = await connection.execute(
      'SELECT name FROM locations WHERE id = ?',
      [location_id]
    );
    
    const material = materialInfo.length > 0 ? materialInfo[0] : { code: '', name: '' };
    const location = locationInfo.length > 0 ? locationInfo[0] : { name: '' };
    
    const parsedQuantity = parseFloat(quantity);
    
    // 只有当beforeQuantity和afterQuantity都未提供时，才查询并计算
    if (beforeQuantity === null || afterQuantity === null) {
      // 查询当前库存用于记录在transaction中
      const [stockResult] = await connection.execute(
        'SELECT quantity FROM inventory_stock WHERE material_id = ? AND location_id = ?',
        [material_id, location_id]
      );
      
      beforeQuantity = stockResult.length > 0 ? parseFloat(stockResult[0].quantity) : 0;
      
      // 计算after_quantity
      afterQuantity = beforeQuantity;
      if (transaction_type === 'inbound' || transaction_type === 'outsourced_inbound') {
        afterQuantity = beforeQuantity + Math.abs(parsedQuantity);
      } else if (transaction_type === 'outbound' || transaction_type === 'outsourced_outbound') {
        const absQuantity = Math.abs(parsedQuantity);
        afterQuantity = beforeQuantity - absQuantity;
        // 如果库存不足，设置为0而不允许出现负数
        if (afterQuantity < 0) {
          console.warn(`物料ID ${material_id} 库存不足，当前库存 ${beforeQuantity}，尝试出库 ${absQuantity}，设置出库后库存为0`);
          afterQuantity = 0;
        }
      }
    }
    
    // 如果没有提供备注，使用空字符串或其他默认值
    const transactionRemark = remark || '';
    
    // 组合参考类型和编号添加到备注中
    let fullRemark = transactionRemark;
    if (reference_type && reference_no) {
      fullRemark = `${transactionRemark} (${reference_type}: ${reference_no})`;
    }
    
    // 获取单位名称
    let unitName = '';
    if (unit_id) {
      const [unitInfo] = await connection.execute(
        'SELECT name FROM units WHERE id = ?',
        [unit_id]
      );
      if (unitInfo.length > 0) {
        unitName = unitInfo[0].name;
      }
    }
    
    console.log(`插入库存事务记录: 物料ID=${material_id}, 库位ID=${location_id}, 类型=${transaction_type}, 数量=${parsedQuantity}, 变动前=${beforeQuantity}, 变动后=${afterQuantity}`);
    
    // 使用正确的字段名插入记录
    const sql = `INSERT INTO inventory_transactions (
      transaction_type,
      material_id, 
      location_id,
      quantity,
      unit_id, 
      reference_no, 
      reference_type,
      operator, 
      remark,
      before_quantity,
      after_quantity,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    
    const params = [
      transaction_type,
      material_id,
      location_id,
      parsedQuantity,
      unit_id || null,
      reference_no || null,
      reference_type || null,
      operator || 'system',
      fullRemark,
      beforeQuantity,
      afterQuantity
    ];
    
    return await connection.execute(sql, params);
  } catch (error) {
    console.error('插入库存事务记录失败:', error);
    throw error;
  }
};

// 获取库存列表
const getStockList = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', location_id = '', category_id = '', show_all = false } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (m.name LIKE ? OR m.code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (location_id) {
      whereClause += ' AND m.location_id = ?';
      params.push(location_id);
    }

    if (category_id) {
      whereClause += ' AND m.category_id = ?';
      params.push(category_id);
    }

    // 根据show_all参数决定是否显示所有物料
    let joinClause = '';
    if (show_all === 'true' || show_all === true) {
      // 显示所有物料，使用物料表中的location_id而不是CROSS JOIN
      joinClause = `
        FROM materials m
        LEFT JOIN inventory_stock s ON m.id = s.material_id AND s.location_id = m.location_id
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN categories c ON m.category_id = c.id
        LEFT JOIN locations l ON m.location_id = l.id
      `;
      
      // 如果筛选了仓库，则需要修改where条件
      if (location_id) {
        whereClause = whereClause.replace('AND s.location_id = ?', 'AND m.location_id = ?');
      }
    } else {
      // 只显示有库存的物料，使用INNER JOIN
      joinClause = `
        FROM inventory_stock s
        LEFT JOIN materials m ON s.material_id = m.id
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN categories c ON m.category_id = c.id
        LEFT JOIN locations l ON s.location_id = l.id
      `;
    }

    const countQuery = `
      SELECT COUNT(DISTINCT ${show_all === 'true' || show_all === true ? 'CONCAT(m.id, "_", m.location_id)' : 's.id'}) as total
      ${joinClause}
      ${whereClause}
    `;

    const [countResult] = await db.pool.execute(countQuery, params);
    const total = countResult[0].total;

    const listQuery = `
      SELECT 
        ${show_all === 'true' || show_all === true ? 'CONCAT(m.id, "_", m.location_id)' : 's.id'} as id, 
        m.id as material_id, 
        m.name as material_name, 
        m.code as material_code,
        m.specs as specification,
        u.name as unit_name,
        c.name as category_name,
        ${show_all === 'true' || show_all === true ? 'm.location_id' : 's.location_id'} as location_id,
        l.name as location_name,
        ${show_all === 'true' || show_all === true ? 
          '(SELECT IFNULL(quantity, 0) FROM inventory_stock WHERE material_id = m.id AND location_id = m.location_id)' : 
          'IFNULL(s.quantity, 0)'
        } as quantity,
        IFNULL(m.price, 0) as unit_price,
        ${show_all === 'true' || show_all === true ? 
          '(SELECT IFNULL(quantity, 0) FROM inventory_stock WHERE material_id = m.id AND location_id = m.location_id) * IFNULL(m.price, 0)' : 
          'IFNULL(s.quantity, 0) * IFNULL(m.price, 0)'
        } as total_amount,
        ${show_all === 'true' || show_all === true ? 
          '(SELECT IFNULL(updated_at, m.updated_at) FROM inventory_stock WHERE material_id = m.id AND location_id = m.location_id)' : 
          'IFNULL(s.updated_at, m.updated_at)'
        } as updated_at
      ${joinClause}
      ${whereClause}
      ORDER BY ${show_all === 'true' || show_all === true ? 'm.updated_at' : 'updated_at'} DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const [stocks] = await db.pool.execute(listQuery, [...params]);

    // 更新库存数量，使用最新交易记录中的after_quantity
    const connection = await db.pool.getConnection();
    try {
      // 获取所有物料ID和位置ID对
      const materialLocationPairs = stocks.map(item => ({
        material_id: item.material_id,
        location_id: item.location_id
      }));

      // 批量查询最新的库存交易记录
      for (const item of stocks) {
        try {
          const [latestTransactions] = await connection.query(
            `SELECT after_quantity
             FROM inventory_transactions
             WHERE material_id = ? AND location_id = ?
             ORDER BY created_at DESC
             LIMIT 1`,
            [item.material_id, item.location_id]
          );
          
          if (latestTransactions.length > 0 && latestTransactions[0].after_quantity !== null) {
            // 使用最新交易记录中的after_quantity作为当前库存
            const newQuantity = parseFloat(latestTransactions[0].after_quantity);
            item.quantity = newQuantity;
            
            // 更新总金额
            if (item.unit_price) {
              item.total_amount = newQuantity * parseFloat(item.unit_price);
            }
          }
        } catch (error) {
          console.error(`更新物料ID=${item.material_id}库存数量时出错:`, error);
        }
      }
    } finally {
      connection.release();
    }

    res.json({
      total,
      items: stocks,
    });
  } catch (error) {
    console.error('获取库存列表失败:', error);
    res.status(500).json({ 
      message: '获取库存列表失败',
      error: error.message,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
  }
};

// 获取出库单列表
const getOutboundList = async (req, res) => {
  try {
    // 确保参数为数字类型
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { search = '', location_id = '', status = '', production_plan_id = '' } = req.query;

    console.log('Request parameters:', { page, limit, search, location_id, status, production_plan_id });

    let whereClause = 'WHERE 1=1';  // 移除软删除条件，使用通用条件
    const params = [];

    if (search) {
      whereClause += ' AND (o.outbound_no LIKE ? OR m.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 注意：从数据库结构来看，表中不存在location_id字段，因此我们跳过这个过滤条件
    // 如果你需要根据location_id筛选，需要在数据库表中添加此字段

    if (status && status !== '') {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    // 注意：从数据库结构来看，表中不存在production_plan_id字段，因此我们跳过这个过滤条件
    // 如果你需要根据production_plan_id筛选，需要在数据库表中添加此字段

    // 获取出库单主表数据 - 移除不存在的字段
    const listQuery = `
      SELECT
        o.id, 
        o.outbound_no, 
        DATE_FORMAT(o.outbound_date, '%Y-%m-%d') as outbound_date, 
        m.location_id,
        l.name as location_name,
        o.status, 
        o.operator, 
        o.remark, 
        o.created_at,
        DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i:%s') as created_at_formatted,
        DATE_FORMAT(o.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        COUNT(DISTINCT oi.id) as items_count,
        COALESCE(SUM(oi.quantity), 0) as total_quantity
      FROM inventory_outbound o
      LEFT JOIN inventory_outbound_items oi ON o.id = oi.outbound_id
      LEFT JOIN materials m ON oi.material_id = m.id
      LEFT JOIN locations l ON m.location_id = l.id
      ${whereClause}
      GROUP BY o.id, o.outbound_no, o.outbound_date, m.location_id, l.name, o.status, o.operator, o.remark, o.created_at, o.updated_at
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // 使用参数，但不包括 LIMIT 和 OFFSET 部分
    console.log('SQL Query:', listQuery);
    console.log('Parameters:', params);

    const [outbounds] = await db.pool.execute(listQuery, params);
    console.log('Query result count:', outbounds.length);

    // 获取总数
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM inventory_outbound o
      LEFT JOIN inventory_outbound_items oi ON o.id = oi.outbound_id
      LEFT JOIN materials m ON oi.material_id = m.id
      LEFT JOIN locations l ON m.location_id = l.id
      ${whereClause}
    `;

    console.log('Count Query:', countQuery);
    console.log('Count Parameters:', params);

    const [countResult] = await db.pool.execute(countQuery, params);
    const total = countResult[0].total;
    console.log('Total count:', total);

    // 处理状态显示和日期格式
    const items = outbounds.map(item => ({
      ...item,
      created_at: item.created_at_formatted, // 使用格式化后的时间
      status_text: getStatusText(item.status)
    }));

    console.log('Sending response:', { total, itemCount: items.length });

    res.json({
      total,
      items
    });
  } catch (error) {
    console.error('获取出库单列表失败:', error);
    res.status(500).json({ 
      message: '获取出库单列表失败',
      error: error.message,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
  }
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'draft': '草稿',
    'confirmed': '已确认',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return statusMap[status] || status;
};

// 获取库存记录
const getStockRecords = async (req, res) => {
  try {
    const { id } = req.params;
    let materialId, locationId;
    
    // 判断ID是否为复合ID（material_id_location_id格式）
    if (id.includes('_')) {
      // 如果是复合ID，分解出物料ID和仓库ID
      const [matId, locId] = id.split('_');
      materialId = matId;
      locationId = locId;
      
      // 验证物料和仓库是否存在
      const checkMaterialQuery = `SELECT id, location_id FROM materials WHERE id = ?`;
      const [materialResult] = await db.pool.execute(checkMaterialQuery, [materialId]);
      
      if (materialResult.length === 0) {
        return res.status(404).json({ message: '物料不存在' });
      }
      
      // 如果获取的location_id与物料表中的默认位置不符，使用物料的默认位置
      if (String(materialResult[0].location_id) !== String(locationId)) {
        locationId = materialResult[0].location_id;
        console.log(`使用物料${materialId}的默认位置${locationId}替代请求的位置${locId}`);
      }
      
      const checkLocationQuery = `SELECT id FROM locations WHERE id = ?`;
      const [locationResult] = await db.pool.execute(checkLocationQuery, [locationId]);
      
      if (locationResult.length === 0) {
        return res.status(404).json({ message: '仓库不存在' });
      }
    } else {
      // 如果不是复合ID，保持原有逻辑
      // 首先验证提供的ID是库存ID还是物料ID
      // 检查是否为库存记录ID
      const checkStockQuery = `
        SELECT id, material_id, location_id FROM inventory_stock WHERE id = ?
      `;
      const [checkStockResult] = await db.pool.execute(checkStockQuery, [id]);
      
      if (checkStockResult.length > 0) {
        // 如果是库存ID，获取对应的物料ID和位置ID
        materialId = checkStockResult[0].material_id;
        locationId = checkStockResult[0].location_id;
      } else {
        // 如果不是库存ID，检查是否为物料ID
        const checkMaterialQuery = `
          SELECT id, location_id FROM materials WHERE id = ?
        `;
        const [checkMaterialResult] = await db.pool.execute(checkMaterialQuery, [id]);
        
        if (checkMaterialResult.length > 0) {
          // 是物料ID
          materialId = id;
          locationId = checkMaterialResult[0].location_id;
        } else {
          return res.status(404).json({ message: '库存记录或物料不存在' });
        }
      }
    }
    
    // 构建查询条件
    let whereClause = `WHERE t.material_id = ?`;
    const queryParams = [materialId];
    
    // 如果有仓库ID，增加仓库筛选条件
    if (locationId) {
      whereClause += ` AND t.location_id = ?`;
      queryParams.push(locationId);
    }
    
    // 获取库存交易记录
    const recordsQuery = `
      SELECT 
        t.id,
        DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') as date,
        CASE 
          WHEN t.transaction_type = 'in' THEN '入库'
          WHEN t.transaction_type = 'out' THEN '出库'
          WHEN t.transaction_type = 'transfer' THEN '转入/转出'
          ELSE t.transaction_type
        END as type,
        t.quantity,
        t.reference_no,
        t.reference_type,
        t.operator,
        t.remark
      FROM inventory_transactions t
      ${whereClause}
      ORDER BY t.created_at ASC
    `;
    
    const [records] = await db.pool.execute(recordsQuery, queryParams);
    
    // 手动计算变动前后数量 - 正向计算，从开始累加
    let runningTotal = 0; // 起始库存为0
    
    for (const record of records) {
      // 设置变动前数量为当前累计值
      record.before_quantity = runningTotal;
      
      // 根据交易类型调整runningTotal
      if (record.type === '入库') {
        runningTotal += parseFloat(record.quantity);
      } else if (record.type === '出库') {
        runningTotal -= parseFloat(record.quantity);
      }
      
      // 设置变动后数量
      record.after_quantity = runningTotal;
    }
    
    // 返回记录
    res.json(records);
  } catch (error) {
    console.error('获取库存记录失败:', error);
    res.status(500).json({ 
      message: '获取库存记录失败',
      error: error.message,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
  }
};

// 获取仓库列表
const getLocations = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        name, 
        code
      FROM locations
      ORDER BY name
    `;

    const [locations] = await db.pool.execute(query);

    res.json(locations);
  } catch (error) {
    console.error('获取仓库列表失败:', error);
    res.status(500).json({ 
      message: '获取仓库列表失败',
      error: error.message,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
  }
};

// 获取出库单详情
const getOutboundDetail = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    const { id } = req.params;

    // 获取出库单主表信息 - 修改查询以解决GROUP BY问题
    const [outboundResult] = await connection.execute(`
      SELECT 
        o.*,
        DATE_FORMAT(o.outbound_date, '%Y-%m-%d') as outbound_date,
        DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(o.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
      FROM inventory_outbound o
      WHERE o.id = ?
    `, [id]);

    if (outboundResult.length === 0) {
      return res.status(404).json({ message: '出库单不存在' });
    }

    // 获取出库单明细
    const [itemsResult] = await connection.execute(`
      SELECT 
        oi.*,
        m.code as material_code,
        m.name as material_name,
        m.specs as specification,
        u.name as unit_name,
        m.location_id,
        l.name as location_name,
        COALESCE(s.quantity, 0) as stock_quantity
      FROM inventory_outbound_items oi
      LEFT JOIN materials m ON oi.material_id = m.id
      LEFT JOIN units u ON oi.unit_id = u.id
      LEFT JOIN locations l ON m.location_id = l.id
      LEFT JOIN inventory_stock s ON m.id = s.material_id AND s.location_id = m.location_id
      WHERE oi.outbound_id = ?
    `, [id]);

    // 处理每个物料项，确保stock_quantity是数值
    const processedItems = itemsResult.map(item => ({
      ...item,
      stock_quantity: item.stock_quantity !== null && item.stock_quantity !== undefined 
        ? parseFloat(item.stock_quantity) 
        : 0
    }));

    // 从明细项中获取location_id和location_name (如果有多个，使用第一个)
    let locationId = null;
    let locationName = null;
    
    if (processedItems.length > 0) {
      locationId = processedItems[0].location_id;
      locationName = processedItems[0].location_name;
    }

    const outboundDetail = {
      ...outboundResult[0],
      items: processedItems,
      location_id: locationId,  // 使用从明细项中获取的location_id
      location_name: locationName,  // 使用从明细项中获取的location_name
      production_plan_id: null,  // 由于数据库表中没有production_plan_id字段，设置默认值为null
      production_plan_code: null,  // 由于数据库表中没有production_plan_id字段，无法获取计划代码
      production_plan_name: null  // 由于数据库表中没有production_plan_id字段，无法获取计划名称
    };

    res.json(outboundDetail);
  } catch (error) {
    console.error('获取出库单详情失败:', error);
    res.status(500).json({ 
      message: '获取出库单详情失败',
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// 更新出库单
const updateOutbound = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { outbound_date, status, operator, remark = null, items } = req.body;

    console.log('更新出库单, ID:', id);
    console.log('更新主表参数:', [outbound_date, status, operator, remark, id]);

    // 验证必填字段 - 移除对location_id和production_plan_id的要求
    if (!outbound_date || !status || !operator) {
      throw new Error('缺少必填字段: 出库日期、状态或操作员');
    }

    // 检查出库单是否存在
    const [checkResult] = await connection.execute(
      'SELECT status FROM inventory_outbound WHERE id = ?',
      [id]
    );

    if (checkResult.length === 0) {
      return res.status(404).json({ message: '出库单不存在' });
    }

    const currentStatus = checkResult[0].status;
    
    // 允许从任何状态更新到completed状态，但如果当前状态不是draft且目标状态不是completed，则拒绝更新
    if (currentStatus !== 'draft' && status !== 'completed') {
      return res.status(400).json({ message: '只能编辑草稿状态的出库单，或将出库单状态更新为已完成' });
    }

    // 格式化日期
    const formattedDate = new Date(outbound_date).toISOString().split('T')[0];

    // 更新出库单主表 - 移除对production_plan_id的引用
    await connection.execute(
      'UPDATE inventory_outbound SET outbound_date = ?, status = ?, operator = ?, remark = ?, updated_at = NOW() WHERE id = ?',
      [formattedDate, status, operator, remark, id]
    );
    
    console.log('出库单主表更新成功');

    // 只有当处于草稿状态时才更新物料明细
    if (currentStatus === 'draft' && items && items.length > 0) {
      // 删除原有明细
      await connection.execute('DELETE FROM inventory_outbound_items WHERE outbound_id = ?', [id]);

      // 重新插入明细
      for (const item of items) {
        if (!item.material_id || !item.quantity || item.quantity <= 0) {
          throw new Error('物料信息不完整或数量无效');
        }

        // 检查库存是否足够 - 由于没有location_id，我们将无法检查特定位置的库存
        const [stockResult] = await connection.execute(
          'SELECT SUM(quantity) as total_quantity FROM inventory_stock WHERE material_id = ?',
          [item.material_id]
        );

        const currentStock = stockResult[0].total_quantity ? parseFloat(stockResult[0].total_quantity) : 0;
        if (currentStock < item.quantity) {
          throw new Error(`物料 ${item.material_name || item.material_id} 库存不足，当前库存: ${currentStock}, 需要数量: ${item.quantity}`);
        }

        // 获取物料的默认单位
        const [materialResult] = await connection.execute(
          'SELECT unit_id, location_id FROM materials WHERE id = ?',
          [item.material_id]
        );
        
        if (materialResult.length === 0) {
          throw new Error(`物料 ${item.material_name || item.material_id} 不存在`);
        }

        // 如果没有提供单位，使用物料的默认单位
        const unitId = item.unit_id || materialResult[0].unit_id;

        // 直接使用物料表中的location_id
        let locationId = materialResult[0].location_id;

        // 如果物料表中location_id为空，设置默认值为1
        if (!locationId) {
          locationId = 1; // 默认库位
        }

        await connection.execute(
          'INSERT INTO inventory_outbound_items (outbound_id, material_id, quantity, unit_id, remark) VALUES (?, ?, ?, ?, ?)',
          [id, item.material_id, item.quantity, unitId, item.remark]
        );
      }
    } else {
      console.log('未提供新的物料项，将保留原有明细');
      
      // 检查现有明细条数
      const [itemsCount] = await connection.execute(
        'SELECT COUNT(*) AS count FROM inventory_outbound_items WHERE outbound_id = ?',
        [id]
      );
      
      console.log(`保留原有 ${itemsCount[0].count} 条明细`);
    }

    // 如果状态为已完成，更新库存
    if (status === 'completed') {
      console.log('出库单状态变为已完成，开始处理库存...');
      
      // 获取出库单明细
      const [outboundItems] = await connection.execute(
        'SELECT material_id, quantity, unit_id FROM inventory_outbound_items WHERE outbound_id = ?',
        [id]
      );
      
      // 获取出库单信息
      const [outboundInfo] = await connection.execute(
        'SELECT outbound_no, operator FROM inventory_outbound WHERE id = ?',
        [id]
      );
      
      if (!outboundInfo || outboundInfo.length === 0) {
        throw new Error(`无法获取出库单信息: ${id}`);
      }
      
      // 处理每个物料项
      for (const item of outboundItems) {
        try {
          // 获取物料的库存记录
          const [stockRecords] = await connection.execute(
            'SELECT id, location_id, quantity FROM inventory_stock WHERE material_id = ? ORDER BY quantity DESC LIMIT 1',
            [item.material_id]
          );
          
          if (stockRecords.length === 0) {
            console.error(`物料 ${item.material_id} 在库存中不存在记录，跳过处理`);
            continue;
          }
          
          const stockRecord = stockRecords[0];
          const beforeQuantity = parseFloat(stockRecord.quantity);
          const itemQuantity = parseFloat(item.quantity);
          const afterQuantity = beforeQuantity - itemQuantity;
          
          // 检查库存是否足够
          if (afterQuantity < 0) {
            console.error(`物料 ${item.material_id} 库存不足，当前库存: ${beforeQuantity}, 需要出库: ${itemQuantity}，跳过处理`);
            continue;
          }
          
          // 更新库存
          await connection.execute(
            'UPDATE inventory_stock SET quantity = ? WHERE id = ?',
            [afterQuantity, stockRecord.id]
          );
          
          // 记录库存交易
          await insertInventoryTransaction(connection, {
            material_id: item.material_id,
            location_id: stockRecord.location_id,
            transaction_type: 'outbound',
            quantity: itemQuantity,
            unit_id: item.unit_id,
            reference_no: outboundInfo[0].outbound_no,
            reference_type: 'outbound',
            operator: outboundInfo[0].operator,
            beforeQuantity: beforeQuantity,
            afterQuantity: afterQuantity
          });
          
          console.log(`物料 ${item.material_id} 库存已更新: ${beforeQuantity} -> ${afterQuantity}`);
        } catch (itemError) {
          console.error(`处理物料 ${item.material_id} 时出错:`, itemError);
          // 不抛出异常，继续处理其他物料项
        }
      }
    }

    await connection.commit();
    res.json({ message: '出库单更新成功', id });
  } catch (error) {
    await connection.rollback();
    console.error('更新出库单失败:', error);
    res.status(500).json({ 
      message: '更新出库单失败',
      error: error.message
    });
  } finally {
    connection.release();
    console.log('数据库连接释放');
  }
};

// 生成出库单号的辅助函数
const generateOutboundNo = async () => {
  const connection = await db.pool.getConnection();
  try {
    // 获取当前日期并格式化为YYYYMMDD
    const date = new Date();
    const dateStr = date.getFullYear() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0');

    // 查询当天最大序号
    const [result] = await connection.execute(
      'SELECT MAX(outbound_no) as max_no FROM inventory_outbound WHERE outbound_no LIKE ?',
      [`OUT${dateStr}%`]
    );
    
    const maxNo = result[0].max_no || `OUT${dateStr}000`;
    // 提取序号并增加1
    const sequence = parseInt(maxNo.slice(-3)) + 1;
    // 格式化为3位数，前面补0
    const newSequence = String(sequence).padStart(3, '0');
    // 生成新的出库单号
    return `OUT${dateStr}${newSequence}`;
  } finally {
    connection.release();
  }
};

// 内部方法：创建出库单
const _createOutbound = async (outboundData) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    console.log('Transaction started');

    // 确保outboundData是一个对象
    if (!outboundData || typeof outboundData !== 'object') {
      throw new Error('无效的出库单数据，必须是一个对象');
    }

    // 生成出库单号
    const outboundNo = await generateOutboundNo();
    console.log('Generated outbound number:', outboundNo);

    // 获取操作人信息
    const operator = outboundData.operator || 'system';
    console.log('Operator:', operator);

    // 获取状态
    const status = outboundData.status || 'draft';
    console.log('Status:', status);

    // 检查outboundDate是否存在，如果不存在则使用当前日期
    const outboundDate = outboundData.outboundDate || new Date().toISOString().split('T')[0];
    console.log('Outbound date:', outboundDate);

    // 确保remark不是undefined，如果是undefined则设为null
    const remark = outboundData.remark !== undefined ? outboundData.remark : null;
    
    // 获取生产计划ID（如果存在）
    const productionPlanId = outboundData.productionPlanId || outboundData.production_plan_id || null;
    console.log('Production Plan ID:', productionPlanId);
    
    // 如果有生产计划ID，设置reference_id和reference_type
    let referenceId = null;
    let referenceType = null;
    
    if (productionPlanId) {
      referenceId = productionPlanId;
      referenceType = 'production_plan';
      console.log(`关联生产计划: ID=${referenceId}, 类型=${referenceType}`);
    }

    // 插入出库单主表
    const [result] = await connection.execute(
      `INSERT INTO inventory_outbound 
        (outbound_no, outbound_date, status, operator, remark, reference_id, reference_type) 
       VALUES 
        (?, ?, ?, ?, ?, ?, ?)`,
      [
        outboundNo,
        outboundDate,
        status,
        operator,
        remark,
        referenceId,
        referenceType
      ]
    );

    const outboundId = result.insertId;
    console.log('Created outbound with ID:', outboundId);

    // 检查items是否存在且是数组
    if (!outboundData.items || !Array.isArray(outboundData.items)) {
      console.log('警告: outboundData.items 不是数组或不存在', outboundData.items);
      // 如果items不是数组，尝试将其转换为数组
      const items = outboundData.items ? [outboundData.items] : [];
      outboundData.items = items;
      console.log('已将 items 转换为:', items);
    }

    // 如果没有items，直接提交并返回
    if (outboundData.items.length === 0) {
      console.log('警告: 没有出库明细项');
      await connection.commit();
      return { id: outboundId, outboundNo: outboundNo, warning: '出库单创建成功，但没有明细项' };
    }

    // 批量获取所有物料的库位信息
    const materialIds = outboundData.items.map(item => item.materialId);
    
    // 使用 IN 查询可能在某些物料不存在时报错，改为使用单独查询
    const materialLocationMap = {};
    
    // 如果物料ID列表不为空，则批量查询
    if (materialIds.length > 0) {
      try {
        // 先尝试使用IN查询
        const placeholders = materialIds.map(() => '?').join(',');
        const [materialsInfo] = await connection.execute(
          `SELECT id, location_id FROM materials WHERE id IN (${placeholders})`,
          materialIds
        );
        
        // 创建物料ID到库位ID的映射
        materialsInfo.forEach(material => {
          materialLocationMap[material.id] = material.location_id;
        });
        
        console.log(`成功查询到 ${materialsInfo.length} 个物料的库位信息`);
      } catch (error) {
        console.error('查询物料库位信息出错:', error);
        // 查询出错时不抛出异常，继续执行，后续逻辑会处理缺失的库位信息
      }
    }
    
    // 记录不存在或没有默认库位的物料ID
    const missingMaterials = [];
    
    // 插入出库单明细
    for (const item of outboundData.items) {
      if (!item.materialId || !item.quantity || !item.unitId) {
        throw new Error('每个出库项目必须包含物料ID、数量和单位ID');
      }

      // 获取物料对应的库位，如果不存在则使用默认库位1
      let locationId = materialLocationMap[item.materialId];
      if (!locationId) {
        // 只有在状态为completed时才严格检查物料和库位
        if (status === 'completed') {
          throw new Error(`物料ID ${item.materialId} 不存在或没有设置默认库位`);
        } else {
          // 如果是草稿状态，使用默认库位1并记录警告
          locationId = 1;
          console.warn(`警告: 物料ID ${item.materialId} 不存在或没有设置默认库位，使用默认库位1`);
          missingMaterials.push(item.materialId);
        }
      }

      // 确保remark不是undefined，如果是undefined则设为null
      const itemRemark = item.remark !== undefined ? item.remark : null;

      console.log('Inserting outbound item:', JSON.stringify(item, null, 2));
      
      try {
        await connection.execute(
          `INSERT INTO inventory_outbound_items 
            (outbound_id, material_id, quantity, unit_id, remark) 
           VALUES 
            (?, ?, ?, ?, ?)`,
          [outboundId, item.materialId, item.quantity, item.unitId, itemRemark]
        );
      } catch (insertError) {
        console.error('插入出库单明细项出错:', insertError);
        throw insertError;
      }
      
      // 更新库存
      if (status === 'completed') {
        console.log('Updating stock for completed outbound...');
        await updateStock(item.materialId, locationId, -item.quantity, '出库', operator, `出库单号: ${outboundNo}`);
      }
    }
    
    await connection.commit();
    console.log('Transaction committed successfully');
    
    // 添加警告信息
    let warning = null;
    if (missingMaterials.length > 0) {
      warning = `以下物料ID不存在或没有设置默认库位：${missingMaterials.join(', ')}。出库单已创建为草稿状态，请先添加这些物料或设置默认库位。`;
    }
    
    return { 
      id: outboundId, 
      outboundNo: outboundNo,
      warning: warning
    };
  } catch (error) {
    await connection.rollback();
    console.error('Error creating outbound:', error);
    throw error;
  } finally {
    connection.release();
    console.log('Database connection released');
  }
};

// HTTP 路由处理函数
const createOutbound = async (req, res) => {
  try {
    // 从请求体中获取出库单数据
    const outboundData = req.body;
    
    // 适配字段名称 - 前端可能使用不同的字段名
    const adaptedData = {
      outboundDate: outboundData.outbound_date || outboundData.outboundDate,
      status: outboundData.status || 'draft',
      operator: outboundData.operator || req.user?.username || 'system',
      remark: outboundData.remark || outboundData.remarks,
      // 转换productionPlanId
      productionPlanId: outboundData.production_plan_id || outboundData.productionPlanId,
      // 转换items数组字段名
      items: Array.isArray(outboundData.items) ? outboundData.items.map(item => ({
        materialId: item.material_id || item.materialId,
        quantity: item.quantity,
        unitId: item.unit_id || item.unitId,
        remark: item.remark || item.remarks
      })) : []
    };
    
    console.log('Adapted outbound data:', JSON.stringify(adaptedData, null, 2));
    
    // 调用内部方法创建出库单
    const result = await _createOutbound(adaptedData);
    
    // 返回成功响应
    res.status(201).json({
      success: true,
      message: '出库单创建成功',
      data: result,
      warning: result.warning
    });
  } catch (error) {
    console.error('创建出库单失败:', error);
    
    // 判断错误类型并提供更友好的错误信息
    let errorMessage = error.message;
    let statusCode = 500;
    
    // 检查是否是物料不存在的错误
    if (error.message.includes('物料ID') && error.message.includes('不存在或没有设置默认库位')) {
      statusCode = 400;  // 使用400表示客户端错误
    }
    
    res.status(statusCode).json({
      success: false,
      message: '创建出库单失败',
      error: errorMessage
    });
  }
};

// 获取带库存数量的物料列表
const getMaterialsWithStock = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    const { keyword = '', location_id, include_stock = false } = req.query;
    
    console.log('getMaterialsWithStock params:', { keyword, location_id, include_stock });

    // 根据是否需要包含库存信息构建查询
    const query = `
      SELECT 
        m.id, 
        m.code, 
        m.name, 
        m.specs as specification, 
        c.name as category_name,
        m.unit_id, 
        u.name as unit_name,
        COALESCE(s.quantity, 0) as stock_quantity,
        COALESCE(s.quantity, 0) as quantity,
        COALESCE(s.id, 0) as stock_id
      FROM 
        materials m
        JOIN categories c ON m.category_id = c.id
        JOIN units u ON m.unit_id = u.id
        LEFT JOIN inventory_stock s ON m.id = s.material_id ${location_id ? 'AND s.location_id = ?' : ''}
      WHERE 
        m.status = 1
        ${keyword ? 'AND (m.code LIKE ? OR m.name LIKE ?)' : ''}
      ORDER BY 
        m.code
      LIMIT 50
    `;

    // 构建参数数组
    const params = [];
    if (location_id) {
      params.push(location_id);
    }
    if (keyword) {
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    console.log('Query params:', params);
    const [rows] = await connection.execute(query, params);
    
    // 确保quantity和stock_quantity字段是数值类型
    const processedRows = rows.map(row => ({
      ...row,
      material_id: row.id, // 明确添加material_id字段保持一致性
      quantity: parseFloat(row.quantity || 0),
      stock_quantity: parseFloat(row.stock_quantity || 0)
    }));
    
    console.log(`Found ${processedRows.length} materials with stock`);
    res.json(processedRows);
  } catch (error) {
    console.error('Error getting materials with stock:', error);
    res.status(500).json({ 
      message: '获取库存物料列表失败',
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// 删除出库单
const deleteOutbound = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // 检查出库单是否存在
    const [checkResult] = await connection.execute(
      'SELECT status FROM inventory_outbound WHERE id = ?',
      [id]
    );

    if (checkResult.length === 0) {
      return res.status(404).json({ message: '出库单不存在' });
    }

    // 检查出库单状态，只允许删除草稿状态的出库单
    if (checkResult[0].status !== 'draft') {
      return res.status(400).json({ message: '只能删除草稿状态的出库单' });
    }

    // 删除出库单明细
    await connection.execute(
      'DELETE FROM inventory_outbound_items WHERE outbound_id = ?',
      [id]
    );

    // 删除出库单主表
    await connection.execute(
      'DELETE FROM inventory_outbound WHERE id = ?',
      [id]
    );

    await connection.commit();
    res.json({ message: '出库单删除成功' });
  } catch (error) {
    await connection.rollback();
    console.error('删除出库单失败:', error);
    res.status(500).json({ 
      message: '删除出库单失败',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// 更新出库单状态
const updateOutboundStatus = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { newStatus } = req.body;

    console.log(`更新出库单状态: ID=${id}, 新状态=${newStatus}`);

    // 检查出库单是否存在
    const [checkResult] = await connection.execute(
      'SELECT status, reference_id, reference_type FROM inventory_outbound WHERE id = ?',
      [id]
    );

    if (checkResult.length === 0) {
      console.log(`未找到出库单: ID=${id}`);
      return res.status(404).json({ message: '出库单不存在' });
    }

    const currentStatus = checkResult[0].status;
    const referenceId = checkResult[0].reference_id;
    const referenceType = checkResult[0].reference_type;
    
    console.log(`当前状态: ${currentStatus}, 关联ID: ${referenceId}, 关联类型: ${referenceType}`);

    // 验证状态转换的合法性
    const validTransitions = {
      'draft': ['confirmed', 'cancelled'],
      'confirmed': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      console.log(`无效的状态转换: 从 ${currentStatus} 到 ${newStatus}`);
      return res.status(400).json({ message: '无效的状态转换' });
    }

    // 更新出库单状态
    const [updateResult] = await connection.execute(
      'UPDATE inventory_outbound SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, id]
    );
    console.log(`更新结果: ${JSON.stringify(updateResult)}`);

    // 如果出库单关联了生产计划，更新生产计划状态
    if (referenceId && referenceType === 'production_plan') {
      console.log(`出库单关联了生产计划 ID=${referenceId}，根据出库单状态更新生产计划状态`);
      
      try {
        // 检查生产计划是否存在
        const [planCheck] = await connection.execute(
          'SELECT id, status FROM production_plans WHERE id = ?',
          [referenceId]
        );
        
        if (planCheck.length > 0) {
          const currentPlanStatus = planCheck[0].status;
          console.log(`生产计划当前状态: ${currentPlanStatus}`);
          
          // 根据出库单状态更新生产计划状态
          let newPlanStatus = currentPlanStatus;
          
          // 确定新的生产计划状态
          if (newStatus === 'confirmed') {
            // 出库单已确认 -> 生产计划设置为"发料中"
            newPlanStatus = 'material_issuing';
            console.log(`出库单已确认，将生产计划状态更新为"发料中"`);
          } else if (newStatus === 'completed') {
            // 出库单已完成 -> 生产计划设置为"已发料"
            newPlanStatus = 'material_issued';
            console.log(`出库单已完成，将生产计划状态更新为"已发料"`);
          }
          
          // 只有当计划状态需要变更时才执行更新
          if (newPlanStatus !== currentPlanStatus) {
            await connection.execute(
              'UPDATE production_plans SET status = ? WHERE id = ?',
              [newPlanStatus, referenceId]
            );
            console.log(`生产计划 ID=${referenceId} 状态已更新为 "${newPlanStatus}"`);
          } else {
            console.log(`生产计划 ID=${referenceId} 状态保持不变: ${currentPlanStatus}`);
          }
        } else {
          console.log(`未找到生产计划 ID=${referenceId}`);
        }
      } catch (planError) {
        console.error(`更新生产计划状态时出错:`, planError);
        // 不阻止主流程继续执行
      }
    }

    // 如果状态变更为已完成，更新库存
    if (newStatus === 'completed') {
      console.log('出库单状态更新为已完成，开始处理库存...');
      
      // 检查是否有出库明细
      const [itemCheck] = await connection.execute(
        'SELECT COUNT(*) as count FROM inventory_outbound_items WHERE outbound_id = ?',
        [id]
      );
      
      const itemCount = itemCheck[0].count;
      console.log(`出库单包含 ${itemCount} 个物料项`);
      
      if (itemCount === 0) {
        console.log('出库单没有明细项，不需要处理库存');
      } else {
        // 获取出库明细项
        const [items] = await connection.execute(
          'SELECT material_id, quantity, unit_id FROM inventory_outbound_items WHERE outbound_id = ?',
          [id]
        );

        // 获取出库单信息
        const [outboundInfo] = await connection.execute(
          'SELECT outbound_no, operator FROM inventory_outbound WHERE id = ?',
          [id]
        );

        if (!outboundInfo || outboundInfo.length === 0) {
          throw new Error(`找不到出库单信息: ${id}`);
        }

        console.log(`处理出库单: ${outboundInfo[0].outbound_no}`);

        for (const item of items) {
          try {
            // 获取物料的库存记录
            const [stockRecords] = await connection.execute(
              'SELECT id, location_id, quantity FROM inventory_stock WHERE material_id = ? ORDER BY quantity DESC LIMIT 1',
              [item.material_id]
            );
            
            if (stockRecords.length === 0) {
              console.error(`物料 ${item.material_id} 在库存中不存在记录`);
              continue; // 跳过这个物料项，继续处理其他物料
            }
            
            const stockRecord = stockRecords[0];
            const beforeQuantity = parseFloat(stockRecord.quantity);
            const itemQuantity = parseFloat(item.quantity);
            const afterQuantity = beforeQuantity - itemQuantity;
            
            // 检查库存是否足够
            if (afterQuantity < 0) {
              console.error(`物料 ${item.material_id} 库存不足，当前库存: ${beforeQuantity}, 需要出库: ${itemQuantity}`);
              continue; // 跳过这个物料项，继续处理其他物料
            }

            // 更新库存
            await connection.execute(
              'UPDATE inventory_stock SET quantity = ? WHERE id = ?',
              [afterQuantity, stockRecord.id]
            );
            
            // 记录库存交易
            await insertInventoryTransaction(connection, {
              material_id: item.material_id,
              location_id: stockRecord.location_id,
              transaction_type: 'outbound',
              quantity: itemQuantity,
              unit_id: item.unit_id,
              reference_no: outboundInfo[0].outbound_no,
              reference_type: 'outbound',
              operator: outboundInfo[0].operator,
              beforeQuantity: beforeQuantity,
              afterQuantity: afterQuantity
            });
            
            console.log(`物料 ${item.material_id} 库存交易记录已创建`);
          } catch (itemError) {
            console.error(`处理物料 ${item.material_id} 时出错:`, itemError);
            // 不抛出异常，继续处理其他物料项
          }
        }
      }
    }

    await connection.commit();
    console.log('事务已提交，出库单状态更新成功');
    res.json({ message: '出库单状态更新成功' });
  } catch (error) {
    await connection.rollback();
    console.error('更新出库单状态失败:', error);
    res.status(500).json({ 
      message: '更新出库单状态失败',
      error: error.message
    });
  } finally {
    connection.release();
    console.log('数据库连接已释放');
  }
};

// 获取入库单列表
const getInboundList = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    const { page = 1, pageSize = 10, inboundNo, startDate, endDate, locationId } = req.query;
    
    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (inboundNo) {
      whereClause += ' AND i.inbound_no LIKE ?';
      params.push(`%${inboundNo}%`);
    }
    
    if (startDate) {
      whereClause += ' AND i.inbound_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND i.inbound_date <= ?';
      params.push(endDate);
    }
    
    if (locationId) {
      whereClause += ' AND i.location_id = ?';
      params.push(parseInt(locationId));
    }
    
    // 计算分页
    const pageNum = Math.max(1, parseInt(page));
    const pageSizeNum = Math.max(1, parseInt(pageSize));
    const offset = (pageNum - 1) * pageSizeNum;
    
    // 获取总记录数
    const [totalResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM inventory_inbound i ${whereClause}`,
      params
    );
    
    // 获取分页数据
    const query = `
      SELECT 
        i.id,
        i.inbound_no,
        DATE_FORMAT(i.inbound_date, '%Y-%m-%d') as inbound_date,
        i.location_id,
        l.name as location_name,
        i.status,
        i.operator,
        i.remark,
        DATE_FORMAT(i.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(i.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        (SELECT COUNT(*) FROM inventory_inbound_items WHERE inbound_id = i.id) as items_count,
        (SELECT COALESCE(SUM(quantity), 0) FROM inventory_inbound_items WHERE inbound_id = i.id) as total_quantity
       FROM inventory_inbound i
       LEFT JOIN locations l ON i.location_id = l.id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT ${pageSizeNum} OFFSET ${offset}
    `;
    
    const [rows] = await connection.execute(query, params);
    
    // 处理状态显示
    const items = rows.map(item => ({
      ...item,
      status_text: getStatusText(item.status)
    }));
    
    res.json({
      data: items,
      total: totalResult[0].total,
      page: pageNum,
      pageSize: pageSizeNum
    });
  } catch (error) {
    console.error('获取入库单列表失败:', error);
    res.status(500).json({ message: '获取入库单列表失败', error: error.message });
  } finally {
    connection.release();
  }
};

// 获取入库单详情
const getInboundDetail = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    const { id } = req.params;
    
    // 获取入库单主表信息
    const [inboundResult] = await connection.execute(
      `SELECT 
        i.*,
        l.name as location_name,
        DATE_FORMAT(i.inbound_date, '%Y-%m-%d') as inbound_date,
        DATE_FORMAT(i.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(i.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
       FROM inventory_inbound i
       LEFT JOIN locations l ON i.location_id = l.id
       WHERE i.id = ?`,
      [id]
    );
    
    if (inboundResult.length === 0) {
      return res.status(404).json({ message: '入库单不存在' });
    }
    
    // 获取入库单明细
    const [itemsResult] = await connection.execute(
      `SELECT 
        ii.*,
        m.code as material_code,
        m.name as material_name,
        m.specs as specification,
        u.name as unit_name,
        COALESCE(s.quantity, 0) as stock_quantity
       FROM inventory_inbound_items ii
       LEFT JOIN materials m ON ii.material_id = m.id
       LEFT JOIN units u ON ii.unit_id = u.id
       LEFT JOIN inventory_stock s ON m.id = s.material_id AND s.location_id = ?
       WHERE ii.inbound_id = ?`,
      [inboundResult[0].location_id, id]
    );
    
    const inboundDetail = {
      ...inboundResult[0],
      items: itemsResult,
      status_text: getStatusText(inboundResult[0].status)
    };
    
    res.json(inboundDetail);
  } catch (error) {
    console.error('获取入库单详情失败:', error);
    res.status(500).json({ message: '获取入库单详情失败', error: error.message });
  } finally {
    connection.release();
  }
};

// 创建入库单
const createInbound = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { inbound_date, location_id, status, operator, remark = null, items } = req.body;
    
    // 验证必填字段
    if (!inbound_date || !location_id || !status || !operator || !items || items.length === 0) {
      throw new Error('缺少必填字段');
    }
    
    // 生成入库单号
    const dateStr = inbound_date.replace(/-/g, '');
    const [result] = await connection.execute(
      'SELECT MAX(inbound_no) as max_no FROM inventory_inbound WHERE inbound_no LIKE ?',
      [`RK${dateStr}%`]
    );
    const maxNo = result[0].max_no || `RK${dateStr}000`;
    const inbound_no = `RK${dateStr}${(parseInt(maxNo.slice(-3)) + 1).toString().padStart(3, '0')}`;
    
    // 插入入库单主表
    const [inboundResult] = await connection.execute(
      'INSERT INTO inventory_inbound (inbound_no, inbound_date, location_id, status, operator, remark) VALUES (?, ?, ?, ?, ?, ?)',
      [inbound_no, inbound_date, location_id, status, operator, remark]
    );
    
    const inboundId = inboundResult.insertId;
    
    // 插入入库单明细
    for (const item of items) {
      if (!item.material_id || !item.quantity || item.quantity <= 0) {
        throw new Error('物料信息不完整或数量无效');
      }
      
      // 获取物料的默认单位
      const [materialResult] = await connection.execute(
        'SELECT unit_id FROM materials WHERE id = ?',
        [item.material_id]
      );
      
      if (materialResult.length === 0) {
        throw new Error(`物料 ${item.material_id} 不存在`);
      }
      
      // 如果没有提供单位，使用物料的默认单位
      const unitId = item.unit_id || materialResult[0].unit_id;
      
      await connection.execute(
        'INSERT INTO inventory_inbound_items (inbound_id, material_id, quantity, unit_id, location_id, batch_number, remark) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [inboundId, item.material_id, item.quantity, unitId, location_id, item.batch_number || null, item.remark || null]
      );
      
      // 更新库存
      if (status === 'completed') {
        // 检查库存是否存在
        const [stockResult] = await connection.execute(
          'SELECT id, quantity FROM inventory_stock WHERE material_id = ? AND location_id = ?',
          [item.material_id, location_id]
        );
        
        let beforeQuantity = 0;
        let afterQuantity = 0;
        
        if (stockResult.length === 0) {
          // 创建新的库存记录
          beforeQuantity = 0;
          afterQuantity = parseFloat(item.quantity);
          
          await connection.execute(
            'INSERT INTO inventory_stock (material_id, location_id, quantity) VALUES (?, ?, ?)',
            [item.material_id, location_id, afterQuantity]
          );
        } else {
          // 更新现有库存
          beforeQuantity = parseFloat(stockResult[0].quantity);
          afterQuantity = beforeQuantity + parseFloat(item.quantity);
          
          await connection.execute(
            'UPDATE inventory_stock SET quantity = ? WHERE id = ?',
            [afterQuantity, stockResult[0].id]
          );
        }
        
        // 查询物料价格
        const [materialPriceResult] = await connection.execute(
          'SELECT price FROM materials WHERE id = ?',
          [item.material_id]
        );
        const unitPrice = materialPriceResult.length > 0 ? (materialPriceResult[0].price || 0) : 0;
        const itemAmount = parseFloat(item.quantity) * unitPrice;

        // 记录库存交易
        await insertInventoryTransaction(connection, {
          material_id: item.material_id,
          location_id: inboundId,
          transaction_type: 'inbound',
          quantity: parseFloat(item.quantity),
          unit_id: unitId,
          reference_no: inbound_no,
          reference_type: 'inbound',
          operator: operator,
          beforeQuantity: beforeQuantity,
          afterQuantity: afterQuantity
        });
      }
    }
    
    await connection.commit();
    res.status(201).json({ message: '入库单创建成功', id: inboundId, inbound_no: inbound_no });
  } catch (error) {
    await connection.rollback();
    console.error('创建入库单失败:', error);
    res.status(500).json({ message: '创建入库单失败', error: error.message });
  } finally {
    connection.release();
  }
};

// 从质检单创建入库单
const createInboundFromQuality = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { 
      inbound_date, 
      location_id, 
      operator, 
      remark, 
      items, 
      inspection_id, 
      inspection_no 
    } = req.body;
    
    // 验证必填字段
    if (!inbound_date || !location_id || !operator || !items || items.length === 0) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    
    // 检查质检单状态是否合格
    if (inspection_id) {
      const [inspectionResult] = await connection.execute(
        'SELECT id, status, inspection_no FROM quality_inspections WHERE id = ?',
        [inspection_id]
      );
      
      if (inspectionResult.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: '质检单不存在' });
      }
      
      if (inspectionResult[0].status !== 'passed') {
        await connection.rollback();
        return res.status(400).json({ error: '只有质检合格的单据才能生成入库单' });
      }
    }
    
    // 生成入库单号
    const dateStr = inbound_date.replace(/-/g, '');
    const [result] = await connection.execute(
      'SELECT MAX(inbound_no) as max_no FROM inventory_inbound WHERE inbound_no LIKE ?',
      [`RK${dateStr}%`]
    );
    const maxNo = result[0].max_no || `RK${dateStr}000`;
    const inbound_no = `RK${dateStr}${(parseInt(maxNo.slice(-3)) + 1).toString().padStart(3, '0')}`;
    
    // 创建入库单
    const [inboundResult] = await connection.execute(
      'INSERT INTO inventory_inbound (inbound_no, inbound_date, location_id, operator, status, remark, inspection_id, inspection_no, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [inbound_no, inbound_date, location_id, operator, 'draft', remark || null, inspection_id || null, inspection_no || null]
    );
    
    const inbound_id = inboundResult.insertId;
    
    // 从质检单获取产品信息
    let productId = null;
    let productCode = null;
    let productName = null;
    
    if (inspection_id) {
      const [inspectionInfo] = await connection.execute(
        'SELECT inspection_type, product_id, product_name, product_code, quantity, unit FROM quality_inspections WHERE id = ?',
        [inspection_id]
      );
      
      if (inspectionInfo.length > 0) {
        const inspectionType = inspectionInfo[0].inspection_type;
        productId = inspectionInfo[0].product_id || null;
        productCode = inspectionInfo[0].product_code || '';
        productName = inspectionInfo[0].product_name || '';
        const inspectionQuantity = inspectionInfo[0].quantity || 0; // 获取质检单的数量
        const inspectionUnit = inspectionInfo[0].unit || '';
        
        console.log(`质检单类型: ${inspectionType}, 产品ID: ${productId}, 产品编码: ${productCode}, 产品名称: ${productName}, 数量: ${inspectionQuantity}, 单位: ${inspectionUnit}`);
        
        // 如果是成品检验，直接使用product_id作为物料ID
        if (inspectionType === 'final' && productId) {
          // 检查物料表中是否存在该产品ID的记录，同时获取物料的location_id
          const [materialInfo] = await connection.execute(
            'SELECT id, location_id, unit_id FROM materials WHERE id = ?',
            [productId]
          );
          
          // 如果物料存在，使用items中传入的物料信息创建入库单明细
          if (materialInfo.length > 0) {
            // 成品入库应该使用物料表中定义的库位，而不是请求中的库位
            const materialLocationId = materialInfo[0].location_id;
            const materialUnitId = materialInfo[0].unit_id;
            
            // 如果物料有指定库位，使用物料的库位；否则使用请求中的库位
            const useLocationId = materialLocationId || location_id;
            
            console.log(`成品物料ID: ${productId}, 物料库位: ${materialLocationId}, 使用库位: ${useLocationId}`);
            
            // 更新入库单的库位，与物料保持一致
            if (materialLocationId && materialLocationId !== location_id) {
              await connection.execute(
                'UPDATE inventory_inbound SET location_id = ? WHERE id = ?',
                [materialLocationId, inbound_id]
              );
              
              console.log(`已将入库单的库位从 ${location_id} 更新为物料的库位 ${materialLocationId}`);
            }
            
            // 获取合适的单位ID
            let unitId = materialUnitId;
            
            // 验证传入的明细数量
            const totalItemsQuantity = items.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);
            
            // 如果items中的数量与质检单数量相差太大，使用质检单的数量
            if (Math.abs(totalItemsQuantity - inspectionQuantity) > 0.01 || totalItemsQuantity <= 0) {
              console.log(`入库数量与质检单数量不一致，使用质检单数量 ${inspectionQuantity}`);
              
              // 根据请求项取第一个项目的单位ID
              unitId = (items.length > 0 && items[0].unit_id) ? items[0].unit_id : materialUnitId || 1;
              
              // 创建一个入库明细，使用质检单的数量
              await connection.execute(
                'INSERT INTO inventory_inbound_items (inbound_id, material_id, unit_id, quantity, batch_number, remark, location_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [inbound_id, productId, unitId, inspectionQuantity, null, null, useLocationId]
              );
              
              console.log(`已创建入库单明细: 物料ID ${productId}, 数量 ${inspectionQuantity}, 单位ID ${unitId}, 库位 ${useLocationId}`);
            } else {
              // 使用items中的信息创建入库明细
              for (const item of items) {
                const { unit_id, quantity, batch_no, remark: itemRemark } = item;
                
                // 确保必填字段都存在
                if (!unit_id || !quantity || quantity <= 0) {
                  await connection.rollback();
                  return res.status(400).json({ error: '物料明细字段不完整或无效' });
                }
                
                await connection.execute(
                  'INSERT INTO inventory_inbound_items (inbound_id, material_id, unit_id, quantity, batch_number, remark, location_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [inbound_id, productId, unit_id, quantity, batch_no || null, itemRemark || null, useLocationId]
                );
              }
            }
            
            await connection.commit();
            
            return res.status(201).json({
              success: true,
              message: '入库单创建成功',
              data: {
                id: inbound_id,
                inbound_no
              }
            });
          }
        }
      }
    }
    
    // 如果无法直接使用产品ID或者不是成品检验，按照原来的逻辑处理
    // 插入入库物料明细
    for (const item of items) {
      const { material_id, unit_id, quantity, batch_no, remark: itemRemark } = item;
      
      // 确保所有必填字段都存在
      if (!material_id || !unit_id || !quantity || quantity <= 0) {
        await connection.rollback();
        return res.status(400).json({ error: '物料明细字段不完整或无效' });
      }
      
      // 检查material_id是否存在于materials表中
      const [materialCheck] = await connection.execute(
        'SELECT id FROM materials WHERE id = ?',
        [material_id]
      );
      
      // 每个物料项都有自己的物料ID，默认使用请求中的material_id
      let validMaterialId = material_id;
      let foundMaterial = false;
      
      // 如果物料ID不存在，尝试查找对应的产品物料关联
      if (materialCheck.length === 0) {
        console.log(`物料ID ${material_id} 不存在于materials表中，尝试查找替代物料...`);
        
        // 尝试用质检单的product_code查找物料
        if (productCode) {
          console.log(`尝试使用产品代码 ${productCode} 查找物料...`);
          
          // 先尝试使用产品代码查找物料code字段
          const [materialByCode] = await connection.execute(
            'SELECT id FROM materials WHERE code = ?',
            [productCode]
          );
          
          if (materialByCode.length > 0) {
            validMaterialId = materialByCode[0].id;
            console.log(`根据产品代码 ${productCode} 匹配物料code字段找到对应物料ID: ${validMaterialId}`);
            foundMaterial = true;
          } else if (productCode || productName) {
            // 如果在code字段中找不到，尝试在specs字段中查找
            const [materialBySpecs] = await connection.execute(
              'SELECT id FROM materials WHERE specs = ? OR name = ?',
              [productCode, productName]
            );
            
            if (materialBySpecs.length > 0) {
              validMaterialId = materialBySpecs[0].id;
              console.log(`根据产品代码 ${productCode} 匹配物料specs字段或产品名称找到对应物料ID: ${validMaterialId}`);
              foundMaterial = true;
            }
          }
        }
        
        // 只有在没有找到对应产品代码的物料时才执行这一部分
        if (!foundMaterial) {
          // 如果没有找到对应的产品代码或通过产品代码找不到物料，尝试通过名称或编码前缀查找
          const [defaultMaterial] = await connection.execute(
            'SELECT id FROM materials WHERE name LIKE ? OR code LIKE ? OR code LIKE ? LIMIT 1',
            ['%成品%', '%FP%', '%CP%']
          );
          
          if (defaultMaterial.length > 0) {
            validMaterialId = defaultMaterial[0].id;
            console.log(`使用替代成品物料ID: ${validMaterialId}`);
          } else {
            // 如果找不到特定命名的物料，使用系统中的任意物料
            const [anyMaterial] = await connection.execute(
              'SELECT id FROM materials LIMIT 1'
            );
            
            if (anyMaterial.length > 0) {
              validMaterialId = anyMaterial[0].id;
              console.log(`使用系统中的任意物料ID: ${validMaterialId}`);
            } else {
              await connection.rollback();
              return res.status(400).json({ 
                error: `物料ID ${material_id} 不存在，且无法找到替代物料` 
              });
            }
          }
        }
      }
      
      await connection.execute(
        'INSERT INTO inventory_inbound_items (inbound_id, material_id, unit_id, quantity, batch_number, remark, location_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [inbound_id, validMaterialId, unit_id, quantity, batch_no || null, itemRemark || null, location_id]
      );
    }
    
    await connection.commit();
    
    return res.status(201).json({
      success: true,
      message: '入库单创建成功',
      data: {
        id: inbound_id,
        inbound_no
      }
    });
    
  } catch (err) {
    await connection.rollback();
    console.error('创建入库单错误:', err);
    return res.status(500).json({ error: '服务器错误' });
  } finally {
    connection.release();
  }
};

// 更新入库单状态
const updateInboundStatus = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { newStatus } = req.body;
    
    console.log('更新入库单状态:', { id, newStatus });
    
    // 验证入库单ID是否为有效数字
    if (!id || isNaN(parseInt(id))) {
      console.error('无效的入库单ID:', id);
      throw new Error('无效的入库单ID');
    }
    
    // 验证状态值
    const validStatuses = ['draft', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      console.error('无效的状态值:', newStatus);
      throw new Error('无效的状态值');
    }
    
    // 获取当前入库单信息
    const [inboundData] = await connection.execute(
      'SELECT * FROM inventory_inbound WHERE id = ?',
      [id]
    );
    
    if (inboundData.length === 0) {
      console.error('入库单不存在, ID:', id);
      throw new Error(`入库单不存在 (ID: ${id})`);
    }
    
    const currentStatus = inboundData[0].status;
    console.log('当前状态:', currentStatus, '新状态:', newStatus);
    
    // 检查状态转换是否有效
    const validTransitions = {
      'draft': ['confirmed', 'cancelled'],
      'confirmed': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };
    
    if (!validTransitions[currentStatus].includes(newStatus) && currentStatus !== newStatus) {
      console.error('无效的状态转换:', { from: currentStatus, to: newStatus });
      throw new Error(`无法从 "${currentStatus}" 状态转换为 "${newStatus}" 状态`);
    }
    
    // 更新状态
    await connection.execute(
      'UPDATE inventory_inbound SET status = ? WHERE id = ?',
      [newStatus, id]
    );
    
    // 如果状态变更为已完成，更新库存
    if (newStatus === 'completed') {
      // 检查入库单是否与质检单关联，如果关联则查找对应的生产计划
      const [inspectionData] = await connection.execute(
        'SELECT inspection_id FROM inventory_inbound WHERE id = ?',
        [id]
      );
      
      if (inspectionData.length > 0 && inspectionData[0].inspection_id) {
        const inspectionId = inspectionData[0].inspection_id;
        
        console.log(`入库单关联检验单ID: ${inspectionId}, 尝试查找相关生产计划`);
        
        // 查询检验单，找到相关联的生产任务
        const [inspectionInfo] = await connection.execute(
          'SELECT reference_id, reference_no FROM quality_inspections WHERE id = ?',
          [inspectionId]
        );
        
        if (inspectionInfo.length > 0 && inspectionInfo[0].reference_id) {
          const taskId = inspectionInfo[0].reference_id;
          const referenceNo = inspectionInfo[0].reference_no || '';
          
          console.log(`检验单关联的任务ID: ${taskId}, 关联单号: ${referenceNo}`);
          
          // 直接尝试查找任务关联的生产计划，不管reference_no的前缀
          const [taskInfo] = await connection.execute(
            'SELECT plan_id FROM production_tasks WHERE id = ?',
            [taskId]
          );
          
          if (taskInfo.length > 0 && taskInfo[0].plan_id) {
            const planId = taskInfo[0].plan_id;
            
            console.log(`找到关联的生产计划ID=${planId}, 查询当前状态`);
            
            // 获取当前生产计划状态
            const [planStatus] = await connection.execute(
              'SELECT status FROM production_plans WHERE id = ?',
              [planId]
            );
            
            if (planStatus.length > 0) {
              const currentPlanStatus = planStatus[0].status;
              console.log(`生产计划当前状态: ${currentPlanStatus}`);
              
              // 更新生产计划状态，从任何状态更新为"已完成"
              console.log(`入库单完成，将关联的生产计划ID=${planId}状态从"${currentPlanStatus}"更新为"已完成"`);
              await connection.execute(
                'UPDATE production_plans SET status = "completed" WHERE id = ?',
                [planId]
              );
              
              // 验证更新是否成功
              const [verifyStatus] = await connection.execute(
                'SELECT status FROM production_plans WHERE id = ?',
                [planId]
              );
              
              if (verifyStatus.length > 0) {
                console.log(`生产计划状态更新后的结果: ${verifyStatus[0].status}`);
                
                // 如果生产计划状态已成功更新为completed，查找相关销售订单并更新状态
                if (verifyStatus[0].status === 'completed') {
                  try {
                    // 查找所有处于'in_production'状态的销售订单
                    const [salesOrders] = await connection.execute(
                      'SELECT id, status FROM sales_orders WHERE status = "in_production"'
                    );
                    
                    if (salesOrders && salesOrders.length > 0) {
                      console.log(`找到 ${salesOrders.length} 个处于生产中状态的销售订单`);
                      
                      // 遍历销售订单并更新状态
                      for (const order of salesOrders) {
                        try {
                          await connection.execute(
                            'UPDATE sales_orders SET status = "ready_to_ship", updated_at = NOW() WHERE id = ?',
                            [order.id]
                          );
                          console.log(`已将销售订单 ID=${order.id} 的状态从"生产中"更新为"可发货"`);
                          
                          // 自动创建出库单
                          try {
                            // 获取销售订单详情
                            const [orderDetails] = await connection.execute(
                              'SELECT so.*, c.name as customer_name FROM sales_orders so LEFT JOIN customers c ON so.customer_id = c.id WHERE so.id = ?',
                              [order.id]
                            );
                            
                            if (orderDetails.length > 0) {
                              const orderDetail = orderDetails[0];
                              
                              // 获取销售订单项
                              const [orderItems] = await connection.execute(
                                'SELECT * FROM sales_order_items WHERE order_id = ?',
                                [order.id]
                              );
                              
                              if (orderItems.length > 0) {
                                // 生成出库单号
                                const date = new Date();
                                const dateStr = date.getFullYear() +
                                  ('0' + (date.getMonth() + 1)).slice(-2) +
                                  ('0' + date.getDate()).slice(-2);
                                
                                // 查询当天最大序号
                                const [seqResult] = await connection.execute(
                                  'SELECT MAX(SUBSTRING(outbound_no, 11)) as max_seq FROM sales_outbound WHERE outbound_no LIKE ?',
                                  [`OB${dateStr}%`]
                                );
                                
                                const seq = seqResult[0].max_seq ? parseInt(seqResult[0].max_seq) + 1 : 1;
                                const outboundNo = `OB${dateStr}${seq.toString().padStart(3, '0')}`;
                                
                                // 创建出库单主表记录
                                const [outboundResult] = await connection.execute(
                                  `INSERT INTO sales_outbound (
                                    outbound_no, outbound_date, order_id, customer_id, 
                                    expected_delivery_date, warehouse_id, status, remarks, created_at
                                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                                  [
                                    outboundNo,
                                    new Date().toISOString().split('T')[0], // 当前日期作为出库日期
                                    order.id,
                                    orderDetail.customer_id,
                                    new Date().toISOString().split('T')[0], // 当前日期作为预计发货日期
                                    1, // 默认仓库ID，可以根据实际情况调整
                                    'draft', // 初始状态为草稿
                                    `系统自动为销售订单 ${orderDetail.order_no} 创建的出库单`,
                                  ]
                                );
                                
                                const outboundId = outboundResult.insertId;
                                
                                // 准备批量插入出库单明细
                                const detailValues = [];
                                for (const item of orderItems) {
                                  detailValues.push([
                                    outboundId,
                                    item.material_id,
                                    item.unit_id || 1, // 使用默认单位ID，如果没有提供
                                    item.quantity,
                                    item.unit_price || 0,
                                    item.quantity * (item.unit_price || 0),
                                    '自动生成'
                                  ]);
                                }
                                
                                // 批量插入出库单明细
                                if (detailValues.length > 0) {
                                  await connection.query(
                                    `INSERT INTO sales_outbound_items (
                                      outbound_id, material_id, unit_id, quantity, price, amount, remarks
                                    ) VALUES ?`,
                                    [detailValues]
                                  );
                                }
                                
                                console.log(`已自动为销售订单 ID=${order.id} 创建出库单，出库单号: ${outboundNo}`);
                              }
                            }
                          } catch (outboundError) {
                            console.error(`为销售订单 ID=${order.id} 创建出库单时出错:`, outboundError);
                            // 不阻止主流程继续执行
                          }
                        } catch (orderError) {
                          console.error(`更新销售订单 ID=${order.id} 状态时出错:`, orderError);
                          // 不阻止主流程继续执行
                        }
                      }
                    } else {
                      console.log('没有找到处于生产中状态的销售订单');
                    }
                  } catch (salesOrderError) {
                    console.error('查询或更新销售订单状态时出错:', salesOrderError);
                    // 不阻止主流程继续执行
                  }
                }
              } else {
                console.log(`未找到任务ID=${taskId}关联的生产计划`);
              }
            } else {
              console.log(`未找到任务ID=${taskId}关联的生产计划`);
            }
          } else {
            console.log(`未找到任务ID=${taskId}关联的生产计划`);
          }
        } else {
          console.log(`检验单ID=${inspectionId}没有关联reference_id或没有找到检验单`);
        }
      } else {
        console.log(`入库单ID=${id}没有关联检验单ID`);
      }
      
      // 修改查询，只选择必要的字段
      const [items] = await connection.execute(
        'SELECT material_id, quantity, unit_id FROM inventory_inbound_items WHERE inbound_id = ?',
        [id]
      );
      
      if (items.length === 0) {
        console.error('入库单没有物料项, ID:', id);
        throw new Error('入库单没有物料项');
      }
      
      console.log(`处理 ${items.length} 个物料项`);
      
      for (const item of items) {
        console.log('处理物料项:', item);
        
        if (!item.material_id) {
          console.error('物料ID为空');
          throw new Error('物料ID为空');
        }
        
        // 获取物料的默认单位
        const [materialResult] = await connection.execute(
          'SELECT unit_id FROM materials WHERE id = ?',
          [item.material_id]
        );
        
        if (materialResult.length === 0) {
          console.error(`物料不存在, ID: ${item.material_id}`);
          throw new Error(`物料 ${item.material_id} 不存在`);
        }
        
        // 使用物料的默认单位或从入库单项中获取单位
        const unitId = item.unit_id || materialResult[0].unit_id;
        
        if (!unitId) {
          console.error(`物料 ${item.material_id} 没有单位`);
          throw new Error(`物料 ${item.material_id} 没有单位`);
        }
        
        // 检查库存是否存在
        const [stockResult] = await connection.execute(
          'SELECT id, quantity FROM inventory_stock WHERE material_id = ? AND location_id = ?',
          [item.material_id, inboundData[0].location_id]
        );
        
        let beforeQuantity = 0;
        let afterQuantity = 0;
        let stockId = null;
        
        if (stockResult.length === 0) {
          // 创建新的库存记录
          console.log('创建新库存记录:', { 
            material_id: item.material_id, 
            location_id: inboundData[0].location_id, 
            quantity: item.quantity, 
            unit_id: unitId 
          });
          
          beforeQuantity = 0;
          afterQuantity = parseFloat(item.quantity);
          
          // 先记录库存交易，后创建库存记录
          // 记录库存交易
          await insertInventoryTransaction(connection, {
            material_id: item.material_id,
            location_id: inboundData[0].location_id,
            transaction_type: 'inbound',
            quantity: parseFloat(item.quantity),
            unit_id: unitId,
            reference_no: inboundData[0].inbound_no,
            reference_type: 'inbound',
            operator: inboundData[0].operator,
            beforeQuantity: beforeQuantity,
            afterQuantity: afterQuantity
          });
          
          await connection.execute(
            'INSERT INTO inventory_stock (material_id, location_id, quantity) VALUES (?, ?, ?)',
            [item.material_id, inboundData[0].location_id, afterQuantity]
          );
        } else {
          // 更新现有库存
          stockId = stockResult[0].id;
          beforeQuantity = parseFloat(stockResult[0].quantity);
          afterQuantity = beforeQuantity + parseFloat(item.quantity);
          
          console.log('更新现有库存:', { 
            stock_id: stockId, 
            current_quantity: beforeQuantity, 
            add_quantity: item.quantity,
            after_quantity: afterQuantity
          });
          
          // 先记录库存交易，后更新库存记录
          // 记录库存交易
          await insertInventoryTransaction(connection, {
            material_id: item.material_id,
            location_id: inboundData[0].location_id,
            transaction_type: 'inbound',
            quantity: parseFloat(item.quantity),
            unit_id: unitId,
            reference_no: inboundData[0].inbound_no,
            reference_type: 'inbound',
            operator: inboundData[0].operator,
            beforeQuantity: beforeQuantity,
            afterQuantity: afterQuantity
          });
          
          await connection.execute(
            'UPDATE inventory_stock SET quantity = ? WHERE id = ?',
            [afterQuantity, stockId]
          );
        }
        
        // 查询物料价格
        const [materialPriceResult] = await connection.execute(
          'SELECT price FROM materials WHERE id = ?',
          [item.material_id]
        );
        const unitPrice = materialPriceResult.length > 0 ? (materialPriceResult[0].price || 0) : 0;
        const itemAmount = parseFloat(item.quantity) * unitPrice;

        // 记录库存交易的部分已经移到前面
      }
    }
    
    await connection.commit();
    res.json({ message: '入库单状态更新成功' });
  } catch (error) {
    await connection.rollback();
    console.error('更新入库单状态失败:', error);
    res.status(500).json({ 
      message: '更新入库单状态失败', 
      error: error.message,
      details: error.stack
    });
  } finally {
    connection.release();
  }
};

// 获取物料列表 - 从baseData获取
const getMaterialsList = async (req, res) => {
  try {
    // 从请求中获取参数
    const { search = '', category_id = '' } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (search) {
      whereClause += ' AND (m.name LIKE ? OR m.code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (category_id) {
      whereClause += ' AND m.category_id = ?';
      params.push(category_id);
    }
    
    // 查询物料列表
    const query = `
      SELECT 
        m.id,
        m.code,
        m.name,
        m.specs as specification,
        m.category_id,
        c.name as category_name,
        m.unit_id,
        u.name as unit_name,
        m.price,
        COALESCE(s.location_id, 1) as location_id, 
        COALESCE(l.name, '默认仓库') as location_name
      FROM 
        materials m
      LEFT JOIN 
        categories c ON m.category_id = c.id
      LEFT JOIN 
        units u ON m.unit_id = u.id
      LEFT JOIN
        inventory_stock s ON m.id = s.material_id
      LEFT JOIN
        locations l ON s.location_id = l.id
      ${whereClause}
      GROUP BY m.id
      ORDER BY m.code
      LIMIT 50
    `;
    
    const [materials] = await db.pool.execute(query, params);
    
    // 直接返回数组，而不是包装在对象中
    res.json(materials);
  } catch (error) {
    console.error('获取物料列表失败:', error);
    res.status(500).json({
      message: '获取物料列表失败',
      error: error.message,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
  }
};

// 调整库存
const adjustStock = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { materialId, locationId, quantity, type, remark } = req.body;
    
    // 验证必填字段
    if (!materialId || !locationId || !quantity) {
      throw new Error('物料ID、仓库ID和数量为必填项');
    }
    
    // 根据调整类型计算实际数量变化
    let actualQuantity = parseFloat(quantity);
    let transactionType = 'in'; // 默认为入库

    if (type === 'out') {
      // 如果是出库，确保数量为负数
      actualQuantity = -Math.abs(actualQuantity);
      transactionType = 'out';
    } else if (type === 'adjust') {
      // 如果是盘点调整，根据数量正负决定类型
      transactionType = actualQuantity >= 0 ? 'in' : 'out';
      // 确保盘点的数量保持正负号
    } else {
      // 入库，确保数量为正数
      actualQuantity = Math.abs(actualQuantity);
      transactionType = 'in';
    }
    
    // 查询当前库存
    const [stockResult] = await connection.execute(
      'SELECT id, quantity FROM inventory_stock WHERE material_id = ? AND location_id = ?',
      [materialId, locationId]
    );
    
    let currentQuantity = 0;
    let stockId = null;
    let newQuantity = 0;
    let beforeQuantity = 0;
    let afterQuantity = 0;
    
    if (stockResult.length > 0) {
      // 存在库存记录，更新
      stockId = stockResult[0].id;
      currentQuantity = parseFloat(stockResult[0].quantity);
      beforeQuantity = currentQuantity;
      
      if (type === 'adjust') {
        // 盘点调整，直接设置为新数量
        newQuantity = parseFloat(quantity);
      } else {
        // 入库或出库，增减数量
        newQuantity = currentQuantity + actualQuantity;
      }
      
      afterQuantity = newQuantity;
      
      // 更新库存数量
      await connection.execute(
        'UPDATE inventory_stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newQuantity, stockId]
      );
    } else {
      // 不存在库存记录，创建新记录
      beforeQuantity = 0;
      
      if (type === 'adjust') {
        // 盘点调整，直接设置为新数量
        newQuantity = parseFloat(quantity);
      } else {
        // 入库或出库，以0为基础增减
        newQuantity = actualQuantity;
      }
      
      afterQuantity = newQuantity;
      
      // 创建新库存记录
      const [insertResult] = await connection.execute(
        'INSERT INTO inventory_stock (material_id, location_id, quantity) VALUES (?, ?, ?)',
        [materialId, locationId, newQuantity]
      );
      
      stockId = insertResult.insertId;
    }
    
    // 获取操作员信息
    const operator = req.user ? req.user.username : 'system';
    
    // 添加交易记录
    const transactionRemark = remark || '';
    
    await connection.execute(
      `INSERT INTO inventory_transactions 
        (material_id, location_id, transaction_type, quantity, operator, remark, before_quantity, after_quantity) 
       VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?)`,
      [materialId, locationId, transactionType, Math.abs(parseFloat(quantity)), operator, transactionRemark, beforeQuantity, afterQuantity]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: '库存调整成功',
      data: {
        id: stockId,
        materialId,
        locationId,
        beforeQuantity,
        afterQuantity,
        adjustQuantity: Math.abs(actualQuantity),
        adjustType: type
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('调整库存失败:', error);
    res.status(500).json({ 
      success: false,
      message: '调整库存失败', 
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// 通过物料ID获取库存交易记录
const getMaterialRecords = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证物料ID是否存在
    const checkMaterialQuery = `
      SELECT id, location_id FROM materials WHERE id = ?
    `;
    const [checkMaterialResult] = await db.pool.execute(checkMaterialQuery, [id]);
    
    if (checkMaterialResult.length === 0) {
      return res.status(404).json({ message: '物料不存在' });
    }
    
    const materialId = id;
    const locationId = checkMaterialResult[0].location_id;
    
    // 获取库存交易记录 - 移除before_quantity和after_quantity字段
    const recordsQuery = `
      SELECT 
        t.id,
        DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') as date,
        CASE 
          WHEN t.transaction_type = 'in' THEN '入库'
          WHEN t.transaction_type = 'out' THEN '出库'
          WHEN t.transaction_type = 'transfer' THEN '转入/转出'
          ELSE t.transaction_type
        END as type,
        t.quantity,
        t.reference_no,
        t.reference_type,
        t.operator,
        t.remark
      FROM inventory_transactions t
      WHERE t.material_id = ?
      ORDER BY t.created_at ASC
    `;
    
    const [records] = await db.pool.execute(recordsQuery, [id]);
    
    // 手动计算变动前后数量 - 正向计算，从开始累加
    let runningTotal = 0; // 起始库存为0
    
    for (const record of records) {
      // 设置变动前数量为当前累计值
      record.before_quantity = runningTotal;
      
      // 根据交易类型调整runningTotal
      if (record.type === '入库') {
        runningTotal += parseFloat(record.quantity);
      } else if (record.type === '出库') {
        runningTotal -= parseFloat(record.quantity);
      }
      
      // 设置变动后数量
      record.after_quantity = runningTotal;
    }
    
    // 返回记录
    res.json(records);
  } catch (error) {
    console.error('获取物料库存记录失败:', error);
    res.status(500).json({ 
      message: '获取物料库存记录失败',
      error: error.message,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
  }
};

// 获取库存统计数据
const getStockStatistics = async (req, res) => {
  try {
    const connection = await db.pool.getConnection();
    try {
      // 获取物料种类总数（应该统计materials表而不是inventory_stock）
      const [materialCountResult] = await connection.execute(
        'SELECT COUNT(id) as total_items FROM materials'
      );
      
      // 获取库位数量（应该从locations表获取而不是inventory_stock）
      const [locationCountResult] = await connection.execute(
        'SELECT COUNT(id) as total_locations FROM locations'
      );
      
      // 获取低库存预警数量（库存低于安全库存的物料）
      const [lowStockResult] = await connection.execute(`
        SELECT COUNT(*) as low_stock FROM (
          SELECT m.id, MAX(s.quantity) as max_qty, m.safety_stock
          FROM materials m
          LEFT JOIN inventory_stock s ON m.id = s.material_id
          GROUP BY m.id
          HAVING max_qty < m.safety_stock OR max_qty IS NULL
        ) AS low_stock_items
      `);
      
      // 获取零库存物料数量（完全没有库存的物料）
      const [outOfStockResult] = await connection.execute(`
        SELECT COUNT(*) as out_of_stock FROM (
          SELECT m.id, MAX(s.quantity) as max_qty
          FROM materials m
          LEFT JOIN inventory_stock s ON m.id = s.material_id
          GROUP BY m.id
          HAVING max_qty IS NULL OR max_qty = 0
        ) AS out_of_stock_items
      `);
      
      const statistics = {
        totalItems: materialCountResult[0].total_items || 0,
        totalLocations: locationCountResult[0].total_locations || 0,
        lowStock: lowStockResult[0].low_stock || 0,
        outOfStock: outOfStockResult[0].out_of_stock || 0
      };
      
      res.json(statistics);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取库存统计数据失败:', error);
    res.status(500).json({ 
      message: '获取库存统计数据失败',
      error: error.message
    });
  }
};

// 获取库存流水列表
const getTransactionList = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      startDate, 
      endDate, 
      materialName = '', 
      transactionType = '',
      locationId = '',
      sortField = 'inventory_transactions.created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    console.log('收到库存流水查询请求:', req.query);
    
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 构建查询条件
    let conditions = [];
    let params = [];
    
    if (startDate && endDate) {
      conditions.push('inventory_transactions.created_at BETWEEN ? AND ?');
      params.push(
        `${startDate} 00:00:00`,
        `${endDate} 23:59:59`
      );
    }
    
    if (materialName) {
      conditions.push('(materials.name LIKE ? OR materials.code LIKE ?)');
      params.push(`%${materialName}%`, `%${materialName}%`);
    }
    
    if (transactionType) {
      conditions.push('inventory_transactions.transaction_type = ?');
      params.push(transactionType);
    }
    
    if (locationId) {
      conditions.push('inventory_transactions.location_id = ?');
      params.push(locationId);
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    // 查询总记录数
    const [countResult] = await connection.query(
      `SELECT COUNT(*) as total 
       FROM inventory_transactions
       LEFT JOIN materials ON inventory_transactions.material_id = materials.id
       ${whereClause}`,
      params
    );
    
    const total = countResult[0].total;
    console.log('符合条件的记录总数:', total);
    
    // 查询流水数据 - 移除了不存在的字段
    const query = `
      SELECT 
        inventory_transactions.id,
        inventory_transactions.material_id as materialId,
        materials.code as materialCode,
        materials.name as materialName,
        inventory_transactions.location_id as locationId,
        locations.name as locationName,
        inventory_transactions.transaction_type as transactionType,
        inventory_transactions.quantity,
        inventory_transactions.unit_id as unitId,
        units.name as unitName,
        inventory_transactions.reference_no as referenceNo,
        inventory_transactions.reference_type as referenceType,
        inventory_transactions.operator as createdBy,
        inventory_transactions.remark as remarks,
        inventory_transactions.before_quantity as beforeQuantity,
        inventory_transactions.after_quantity as afterQuantity,
        inventory_transactions.transaction_no as transactionNo,
        DATE_FORMAT(inventory_transactions.created_at, '%Y-%m-%d %H:%i:%s') as transactionTime,
        inventory_transactions.created_at as createdAt
      FROM 
        inventory_transactions
      LEFT JOIN 
        materials ON inventory_transactions.material_id = materials.id
      LEFT JOIN 
        locations ON inventory_transactions.location_id = locations.id
      LEFT JOIN 
        units ON inventory_transactions.unit_id = units.id
      ${whereClause}
      ORDER BY 
        ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const [transactions] = await connection.query(query, [...params, limit, offset]);
    console.log(`查询到 ${transactions.length} 条记录`);
    
    // 处理数据 - 添加交易类型名称
    const formattedTransactions = transactions.map(trans => {
      // 根据交易类型添加交易类型名称
      const transactionTypeName = getTransactionTypeName(trans.transactionType);
      
      // 统一格式转换，确保数字字段是数字而不是字符串，但保留null和undefined
      const beforeQuantity = trans.beforeQuantity !== null && trans.beforeQuantity !== undefined ? 
                            parseFloat(trans.beforeQuantity) : trans.beforeQuantity;
      const afterQuantity = trans.afterQuantity !== null && trans.afterQuantity !== undefined ? 
                           parseFloat(trans.afterQuantity) : trans.afterQuantity;
                           
      return {
        ...trans,
        quantity: parseFloat(trans.quantity || 0),
        beforeQuantity,
        afterQuantity,
        amount: 0,
        transactionTypeName,
        transactionNo: trans.transactionNo || trans.referenceNo || '未知' // 优先使用transaction_no，其次使用reference_no
      };
    });
    
    // 如果数据库中没有before_quantity和after_quantity值，才进行计算
    const needCalculation = formattedTransactions.some(
      item => item.beforeQuantity === undefined || item.beforeQuantity === null || 
             item.afterQuantity === undefined || item.afterQuantity === null
    );
    
    if (needCalculation) {
      console.log('检测到部分记录缺少before_quantity和after_quantity值，进行动态计算');
      
      // 按物料和库位分组
      const groups = {};
      
      formattedTransactions.forEach(trans => {
        const key = `${trans.materialId}_${trans.locationId}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(trans);
      });
      
      // 为每组物料计算变动前后数量
      for (const [key, items] of Object.entries(groups)) {
        const [materialId, locationId] = key.split('_');
        
        // 查询该物料所有交易记录并按时间排序
        const [allRecords] = await connection.query(
          `SELECT 
             id,
             transaction_type,
             quantity,
             before_quantity,
             after_quantity,
             created_at
           FROM inventory_transactions
           WHERE material_id = ? AND location_id = ?
           ORDER BY created_at ASC`,
          [materialId, locationId]
        );
        
        // 计算每条记录的变动前后数量
        let runningTotal = 0;
        const recordMap = {};
        
        for (const record of allRecords) {
          // 如果数据库中已有值，优先使用
          if (record.before_quantity !== null && record.after_quantity !== null) {
            recordMap[record.id] = {
              beforeQuantity: parseFloat(record.before_quantity),
              afterQuantity: parseFloat(record.after_quantity)
            };
            continue;
          }
          
          // 否则计算
          const beforeQuantity = runningTotal;
          
          // 根据交易类型调整runningTotal
          const quantity = parseFloat(record.quantity);
          const transactionType = record.transaction_type.toLowerCase();
          if (transactionType === 'inbound' || 
              transactionType === 'in' || 
              transactionType === '入库') {
            runningTotal += quantity;
          } else if (transactionType === 'outbound' || 
                     transactionType === 'out' || 
                     transactionType === '出库' ||
                     transactionType === '销售出库') {
            runningTotal -= Math.abs(quantity);
          }
          
          // 设置变动后数量
          const afterQuantity = runningTotal;
          
          // 保存到记录映射中
          recordMap[record.id] = {
            beforeQuantity,
            afterQuantity
          };
        }
        
        // 将计算结果应用到返回的数据中
        items.forEach(item => {
          if (recordMap[item.id] && (!item.beforeQuantity || !item.afterQuantity)) {
            item.beforeQuantity = recordMap[item.id].beforeQuantity;
            item.afterQuantity = recordMap[item.id].afterQuantity;
          }
        });
      }
    } else {
      console.log('使用数据库中的before_quantity和after_quantity值');
    }
    
    // 获取统计信息 - 重新计算正确的统计数据
    const whereClauseForStats = whereClause.replace(/inventory_transactions\./g, '');
    console.log('统计查询条件:', whereClauseForStats);
    
    // 查询所有统计数据
    const [statsResult] = await connection.query(
      `SELECT 
         COUNT(*) as totalTransactions,
         SUM(CASE 
           WHEN LOWER(transaction_type) IN ('inbound', 'in', '入库') THEN 1 
           ELSE 0 
         END) as inboundCount,
         SUM(CASE 
           WHEN LOWER(transaction_type) IN ('outbound', 'out', '出库') THEN 1 
           ELSE 0 
         END) as outboundCount,
         SUM(CASE 
           WHEN LOWER(transaction_type) = 'transfer' OR LOWER(transaction_type) = '调拨' THEN 1 
           ELSE 0 
         END) as transferCount,
         SUM(CASE 
           WHEN LOWER(transaction_type) = 'check' OR LOWER(transaction_type) = '盘点' THEN 1 
           ELSE 0 
         END) as checkCount,
         SUM(ABS(quantity)) as totalQuantity,
         COUNT(DISTINCT operator) as uniqueOperators
       FROM inventory_transactions
       ${whereClauseForStats}`,
      params
    );
    
    console.log('统计数据查询结果:', statsResult[0]);
    
    // 处理统计数据
    const statistics = {
      totalTransactions: parseInt(statsResult[0].totalTransactions || 0),
      inboundCount: parseInt(statsResult[0].inboundCount || 0),
      outboundCount: parseInt(statsResult[0].outboundCount || 0),
      transferCount: parseInt(statsResult[0].transferCount || 0),
      checkCount: parseInt(statsResult[0].checkCount || 0),
      totalQuantity: parseFloat(statsResult[0].totalQuantity || 0),
      uniqueOperators: parseInt(statsResult[0].uniqueOperators || 0),
      totalAmount: 0
    };
    
    // 返回处理后的数据
    res.json({
      items: formattedTransactions,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      statistics
    });
  } catch (error) {
    console.error('获取库存流水列表失败:', error);
    res.status(500).json({ message: '获取库存流水列表失败', error: error.message });
  } finally {
    connection.release();
  }
};

// 获取库存流水统计数据
const getTransactionStats = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    const { 
      startDate, 
      endDate, 
      materialName = '', 
      transactionType = '',
      locationId = ''
    } = req.query;
    
    // 构建查询条件
    let conditions = [];
    let params = [];
    
    if (startDate && endDate) {
      conditions.push('t.created_at BETWEEN ? AND ?');
      params.push(
        `${startDate} 00:00:00`,
        `${endDate} 23:59:59`
      );
    }
    
    if (materialName) {
      conditions.push('(m.name LIKE ? OR m.code LIKE ?)');
      params.push(`%${materialName}%`, `%${materialName}%`);
    }
    
    if (transactionType) {
      conditions.push('t.transaction_type = ?');
      params.push(transactionType);
    }
    
    if (locationId) {
      conditions.push('t.location_id = ?');
      params.push(locationId);
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    // 1. 交易类型分布
    const [typeDistribution] = await connection.query(
      `SELECT 
         t.transaction_type as type,
         COUNT(*) as count,
         SUM(t.quantity) as totalQuantity
       FROM inventory_transactions t
       LEFT JOIN materials m ON t.material_id = m.id
       ${whereClause}
       GROUP BY t.transaction_type`,
      params
    );
    
    // 2. 交易金额统计（按月分组）
    const [amountStats] = await connection.query(
      `SELECT 
         DATE_FORMAT(t.created_at, '%Y-%m') as month,
         COUNT(*) as count
       FROM inventory_transactions t
       LEFT JOIN materials m ON t.material_id = m.id
       ${whereClause}
       GROUP BY DATE_FORMAT(t.created_at, '%Y-%m')
       ORDER BY month`,
      params
    );
    
    // 3. 交易趋势数据
    // 获取日期范围
    let startDateObj = startDate ? new Date(startDate) : new Date();
    let endDateObj = endDate ? new Date(endDate) : new Date();
    
    if (!startDate) {
      startDateObj.setDate(startDateObj.getDate() - 30); // 默认30天
    }
    
    const dateRange = [];
    const currentDate = new Date(startDateObj);
    
    while (currentDate <= endDateObj) {
      dateRange.push(new Date(currentDate).toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 按日期查询各类型的交易数量
    const [trendData] = await connection.query(
      `SELECT 
         DATE(t.created_at) as date,
         t.transaction_type,
         COUNT(*) as count
       FROM inventory_transactions t
       LEFT JOIN materials m ON t.material_id = m.id
       ${whereClause}
       GROUP BY DATE(t.created_at), t.transaction_type
       ORDER BY date`,
      params
    );
    
    // 组织趋势数据 - 确保包含所有可能的交易类型
    const trend = {
      dates: dateRange,
      inbound: Array(dateRange.length).fill(0),
      outbound: Array(dateRange.length).fill(0),
      transfer: Array(dateRange.length).fill(0),
      check: Array(dateRange.length).fill(0),
      other: Array(dateRange.length).fill(0)
    };
    
    // 处理趋势数据
    for (const item of trendData) {
      // 确保日期是有效的日期对象
      if (item.date && typeof item.date.toISOString === 'function') {
        const dateStr = item.date.toISOString().split('T')[0];
        const dateIndex = dateRange.indexOf(dateStr);
        
        if (dateIndex !== -1) {
          // 根据transaction_type设置对应类型的数量
          const transType = item.transaction_type || 'other';
          if (trend[transType]) {
            trend[transType][dateIndex] = parseInt(item.count);
          } else {
            trend.other[dateIndex] += parseInt(item.count);
          }
        }
      }
    }
    
    // 处理类型分布数据为饼图格式
    const typeDistributionData = typeDistribution.map(item => ({
      name: getTransactionTypeName(item.type),
      value: parseInt(item.count)
    }));
    
    // 处理统计数据为柱状图格式
    const amountStatsData = amountStats.map(item => ({
      name: item.month,
      value: parseInt(item.count || 0)
    }));
    
    res.json({
      typeDistribution: typeDistributionData,
      amountStats: amountStatsData,
      trend
    });
  } catch (error) {
    console.error('获取库存流水统计数据失败:', error);
    res.status(500).json({ message: '获取库存流水统计数据失败', error: error.message });
  } finally {
    connection.release();
  }
};

// 导出库存流水报表
const exportTransactionReport = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    const { 
      startDate, 
      endDate, 
      materialName = '', 
      transactionType = '',
      locationId = ''
    } = req.query;
    
    // 构建查询条件
    let conditions = [];
    let params = [];
    
    if (startDate && endDate) {
      conditions.push('t.created_at BETWEEN ? AND ?');
      params.push(
        `${startDate} 00:00:00`,
        `${endDate} 23:59:59`
      );
    }
    
    if (materialName) {
      conditions.push('(m.name LIKE ? OR m.code LIKE ?)');
      params.push(`%${materialName}%`, `%${materialName}%`);
    }
    
    if (transactionType) {
      conditions.push('t.transaction_type = ?');
      params.push(transactionType);
    }
    
    if (locationId) {
      conditions.push('t.location_id = ?');
      params.push(locationId);
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    // 查询流水数据，无分页限制
    const [rawTransactions] = await connection.query(
      `SELECT 
         t.reference_no,
         t.created_at,
         t.material_id,
         t.location_id,
         m.code as material_code,
         m.name as material_name,
         m.specs,
         t.transaction_type,
         t.quantity,
         u.name as unit_name,
         l.name as location_name,
         t.reference_type,
         t.operator,
         t.remark
       FROM inventory_transactions t
       LEFT JOIN materials m ON t.material_id = m.id
       LEFT JOIN locations l ON t.location_id = l.id
       LEFT JOIN units u ON t.unit_id = u.id
       ${whereClause}
       ORDER BY t.created_at ASC`,
      params
    );
    
    if (!rawTransactions || rawTransactions.length === 0) {
      return res.status(404).json({ message: '未找到符合条件的流水记录' });
    }
    
    // 按物料和位置分组，计算变动前后数量
    const materialLocationMap = {};
    for (const trans of rawTransactions) {
      const key = `${trans.material_id}_${trans.location_id}`;
      if (!materialLocationMap[key]) {
        materialLocationMap[key] = [];
      }
      materialLocationMap[key].push(trans);
    }
    
    // 计算每条记录的变动前后数量
    Object.values(materialLocationMap).forEach(records => {
      let runningTotal = 0;
      for (const record of records) {
        // 设置变动前数量
        record.before_quantity = runningTotal;
        
        // 根据交易类型调整runningTotal
        if (record.transaction_type === 'inbound') {
          runningTotal += parseFloat(record.quantity);
        } else if (record.transaction_type === 'outbound') {
          runningTotal -= parseFloat(record.quantity);
        }
        
        // 设置变动后数量
        record.after_quantity = runningTotal;
        
        // 设置金额为0
        record.amount = 0;
      }
    });
    
    // 按原始顺序重新排序
    rawTransactions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    // 格式化数据，添加中文标题
    const transactions = rawTransactions.map(t => ({
      '流水编号': t.reference_no,
      '交易时间': new Date(t.created_at).toLocaleString(),
      '物料编码': t.material_code,
      '物料名称': t.material_name,
      '规格': t.specs,
      '流水类型': getTransactionTypeName(t.transaction_type),
      '数量': t.quantity,
      '变动前数量': t.before_quantity,
      '变动后数量': t.after_quantity,
      '金额': t.amount,
      '单位': t.unit_name,
      '仓库位置': t.location_name,
      '关联单据类型': t.reference_type,
      '操作人': t.operator,
      '备注': t.remark
    }));
    
    // 创建工作簿和工作表
    const xlsx = require('xlsx');
    const ws = xlsx.utils.json_to_sheet(transactions);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '库存流水');
    
    // 设置列宽
    const colWidths = [
      { wch: 15 }, // 流水编号
      { wch: 20 }, // 交易时间
      { wch: 15 }, // 物料编码
      { wch: 30 }, // 物料名称
      { wch: 20 }, // 规格
      { wch: 10 }, // 流水类型
      { wch: 10 }, // 数量
      { wch: 8 }, // 单位
      { wch: 15 }, // 仓库位置
      { wch: 15 }, // 关联单据类型
      { wch: 10 }, // 操作人
      { wch: 30 } // 备注
    ];
    ws['!cols'] = colWidths;
    
    // 将工作簿写入缓冲区
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=库存流水报表_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    // 发送响应
    res.send(buf);
  } catch (error) {
    console.error('导出库存流水报表失败:', error);
    res.status(500).json({ message: '导出库存流水报表失败', error: error.message });
  } finally {
    connection.release();
  }
};

// 获取交易类型名称
const getTransactionTypeName = (type) => {
  const typeMap = {
    'inbound': '入库',
    'outbound': '出库',
    'transfer': '调拨',
    'check': '盘点',
    'other': '其他',
    'outsourced_outbound': '委外出库',
    'outsourced_inbound': '委外入库',
    'purchase_inbound': '采购入库'
  };
  return typeMap[type] || type;
};

// 获取库存报表
const getInventoryReport = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      reportType = 'summary', 
      materialName = '', 
      categoryId = '',
      locationId = '' 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (materialName) {
      whereClause += ' AND (m.name LIKE ? OR m.code LIKE ?)';
      params.push(`%${materialName}%`, `%${materialName}%`);
    }
    
    if (categoryId) {
      whereClause += ' AND m.category_id = ?';
      params.push(categoryId);
    }
    
    if (locationId) {
      whereClause += ' AND s.location_id = ?';
      params.push(locationId);
    }
    
    let query = '';
    let countQuery = '';
    
    // 根据报表类型构建不同的查询
    if (reportType === 'summary') {
      // 汇总报表 - 按物料汇总
      countQuery = `
        SELECT COUNT(DISTINCT m.id) as total
        FROM materials m
        LEFT JOIN inventory_stock s ON m.id = s.material_id
        LEFT JOIN categories c ON m.category_id = c.id
        ${whereClause}
      `;
      
      query = `
        SELECT 
          m.id,
          m.code as materialCode,
          m.name as materialName,
          m.specs as specification,
          c.name as categoryName,
          COALESCE(SUM(s.quantity), 0) as quantity,
          m.price as unitPrice,
          COALESCE(SUM(s.quantity * m.price), 0) as totalValue,
          COUNT(DISTINCT s.location_id) as locationCount,
          u.name as unitName,
          m.min_stock as safetyStock
        FROM materials m
        LEFT JOIN inventory_stock s ON m.id = s.material_id
        LEFT JOIN categories c ON m.category_id = c.id
        LEFT JOIN units u ON m.unit_id = u.id
        ${whereClause}
        GROUP BY m.id, m.code, m.name, m.specs, c.name, m.price, u.name, m.min_stock
        ORDER BY m.code
        LIMIT ? OFFSET ?
      `;
    } else if (reportType === 'location') {
      // 库存分布报表 - 按物料和库位展开
      countQuery = `
        SELECT COUNT(*) as total
        FROM materials m
        LEFT JOIN inventory_stock s ON m.id = s.material_id
        LEFT JOIN categories c ON m.category_id = c.id
        LEFT JOIN locations l ON s.location_id = l.id
        ${whereClause}
      `;
      
      query = `
        SELECT 
          m.id,
          m.code as materialCode,
          m.name as materialName,
          m.specs as specification,
          c.name as categoryName,
          l.name as locationName,
          COALESCE(s.quantity, 0) as quantity,
          m.price as unitPrice,
          COALESCE(s.quantity * m.price, 0) as totalValue,
          u.name as unitName,
          DATE_FORMAT(s.updated_at, '%Y-%m-%d %H:%i:%s') as lastMoveDate
        FROM materials m
        LEFT JOIN inventory_stock s ON m.id = s.material_id
        LEFT JOIN categories c ON m.category_id = c.id
        LEFT JOIN locations l ON s.location_id = l.id
        LEFT JOIN units u ON m.unit_id = u.id
        ${whereClause}
        ORDER BY m.code, l.name
        LIMIT ? OFFSET ?
      `;
    } else if (reportType === 'value') {
      // 库存价值报表
      countQuery = `
        SELECT COUNT(DISTINCT c.id) as total
        FROM categories c
        LEFT JOIN materials m ON c.id = m.category_id
        LEFT JOIN inventory_stock s ON m.id = s.material_id
        ${whereClause}
      `;
      
      query = `
        SELECT 
          c.id,
          c.name as categoryName,
          COUNT(DISTINCT m.id) as materialCount,
          COALESCE(SUM(s.quantity), 0) as totalQuantity,
          COALESCE(SUM(s.quantity * m.price), 0) as totalValue,
          COALESCE(AVG(m.price), 0) as avgUnitPrice,
          COALESCE(SUM(s.quantity * m.price) / (SELECT SUM(s2.quantity * m2.price) FROM inventory_stock s2 JOIN materials m2 ON s2.material_id = m2.id) * 100, 0) as valuePercent
        FROM categories c
        LEFT JOIN materials m ON c.id = m.category_id
        LEFT JOIN inventory_stock s ON m.id = s.material_id
        ${whereClause}
        GROUP BY c.id, c.name
        ORDER BY totalValue DESC
        LIMIT ? OFFSET ?
      `;
    } else if (reportType === 'warning') {
      // 低库存预警报表
      countQuery = `
        SELECT COUNT(*) as total
        FROM materials m
        LEFT JOIN (
          SELECT material_id, SUM(quantity) as total_quantity
          FROM inventory_stock
          GROUP BY material_id
        ) s ON m.id = s.material_id
        LEFT JOIN categories c ON m.category_id = c.id
        WHERE m.min_stock > 0 AND (s.total_quantity < m.min_stock OR s.total_quantity IS NULL)
        ${whereClause.replace('WHERE 1=1', '')}
      `;
      
      query = `
        SELECT 
          m.id,
          m.code as materialCode,
          m.name as materialName,
          m.specs as specification,
          c.name as categoryName,
          COALESCE(s.total_quantity, 0) as quantity,
          m.min_stock as safetyStock,
          (COALESCE(s.total_quantity, 0) - m.min_stock) as gap,
          (m.min_stock - COALESCE(s.total_quantity, 0)) as suggestedPurchase,
          u.name as unitName,
          CASE 
            WHEN COALESCE(s.total_quantity, 0) = 0 THEN 'critical'
            WHEN COALESCE(s.total_quantity, 0) < m.min_stock * 0.5 THEN 'high'
            ELSE 'medium'
          END as warningLevel
        FROM materials m
        LEFT JOIN (
          SELECT material_id, SUM(quantity) as total_quantity
          FROM inventory_stock
          GROUP BY material_id
        ) s ON m.id = s.material_id
        LEFT JOIN categories c ON m.category_id = c.id
        LEFT JOIN units u ON m.unit_id = u.id
        WHERE m.min_stock > 0 AND (s.total_quantity < m.min_stock OR s.total_quantity IS NULL)
        ${whereClause.replace('WHERE 1=1', '')}
        ORDER BY gap ASC
        LIMIT ? OFFSET ?
      `;
    }
    
    // 执行查询 - 使用query而不是execute，并确保正确传递参数
    const [countResult] = await connection.query(countQuery, params);
    const [items] = await connection.query(query, [...params, parseInt(limit), parseInt(offset)]);
    
    // 更新库存数量，使用最新交易记录中的after_quantity作为当前库存数量
    const updatedItems = await Promise.all(items.map(async (item) => {
      try {
        // 如果是汇总报表或库存分布报表，需要获取最新库存数量
        if ((reportType === 'summary' || reportType === 'location') && item.id) {
          // 查询该物料最新的库存交易记录
          const [latestTransactions] = await connection.query(
            `SELECT material_id, location_id, after_quantity
             FROM inventory_transactions
             WHERE material_id = ?
             ${locationId ? 'AND location_id = ?' : ''}
             ORDER BY created_at DESC
             LIMIT 1`,
            locationId ? [item.id, locationId] : [item.id]
          );
          
          if (latestTransactions.length > 0 && latestTransactions[0].after_quantity !== null) {
            // 使用最新交易记录中的after_quantity作为当前库存
            item.quantity = parseFloat(latestTransactions[0].after_quantity);
            
            // 更新总价值
            if (item.unitPrice) {
              item.totalValue = item.quantity * parseFloat(item.unitPrice);
            }
          }
        }
      } catch (error) {
        console.error(`更新库存报表项目库存数量时出错:`, error);
      }
      return item;
    }));
    
    // 返回结果
    res.json({
      items: updatedItems,
      total: countResult[0].total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取库存报表失败:', error);
    res.status(500).json({ message: '获取库存报表失败', error: error.message });
  } finally {
    connection.release();
  }
};

// 获取物料库存详情
const getMaterialStockDetail = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    const { materialId, locationId } = req.params;
    
    console.log(`获取物料库存详情: 物料ID=${materialId}, 仓库ID=${locationId}`);
    
    // 直接查询库存
    const query = `
      SELECT 
        s.id as stock_id,
        s.material_id,
        s.location_id,
        s.quantity,
        m.code as material_code,
        m.name as material_name,
        m.specs as specification,
        l.name as location_name,
        u.id as unit_id,
        u.name as unit_name
      FROM 
        materials m
        LEFT JOIN inventory_stock s ON m.id = s.material_id AND s.location_id = ?
        LEFT JOIN locations l ON l.id = ?
        LEFT JOIN units u ON u.id = m.unit_id
      WHERE 
        m.id = ?
    `;
    
    console.log('执行查询:', query.replace(/\s+/g, ' '));
    console.log('查询参数:', [locationId, locationId, materialId]);
    
    const [rows] = await connection.execute(query, [locationId, locationId, materialId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        message: '物料或库存不存在',
        material_id: materialId,
        location_id: locationId,
        quantity: 0,
        stock_quantity: 0
      });
    }
    
    // 处理结果，确保库存数量为数值类型
    const stockData = {
      ...rows[0],
      quantity: parseFloat(rows[0].quantity || 0),
      stock_quantity: parseFloat(rows[0].quantity || 0)
    };
    
    console.log('库存查询结果:', stockData);
    
    res.json(stockData);
  } catch (error) {
    console.error('获取物料库存详情失败:', error);
    res.status(500).json({ 
      message: '获取物料库存详情失败',
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getStockList,
  getLocations,
  getStockRecords,
  getMaterialRecords,
  getOutboundList,
  createOutbound,
  getOutboundDetail,
  getMaterialsWithStock,
  updateOutbound,
  deleteOutbound,
  updateOutboundStatus,
  getMaterialsList,
  getInboundList,
  getInboundDetail,
  createInbound,
  createInboundFromQuality,
  updateInboundStatus,
  adjustStock,
  getTransactionList,
  getTransactionStats,
  exportTransactionReport,
  getInventoryReport,
  getMaterialStockDetail
};