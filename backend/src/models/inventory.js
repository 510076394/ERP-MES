const db = require('../config/db');

// 获取库存列表
const getStockList = async (page = 1, limit = 20, search = '', locationId = null, categoryId = null) => {
  try {
    // 确保参数为数字类型
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    // 验证参数
    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      throw new Error('Invalid pagination parameters');
    }
    
    // 构建查询条件 - 从物料表出发，左连接库存表
    let query = `
      SELECT 
        s.id, 
        m.code as code, 
        m.name as name,
        m.specs as specification, 
        COALESCE(s.quantity, 0) as quantity, 
        COALESCE(w.name, m.location_name) as location_name, 
        c.name as category_name, 
        u.name as unit_name,
        s.location_id,
        m.category_id,
        m.unit_id,
        m.id as material_id
      FROM 
        materials m
        LEFT JOIN inventory_stock s ON m.id = s.material_id
        LEFT JOIN locations w ON s.location_id = w.id
        JOIN categories c ON m.category_id = c.id
        JOIN units u ON m.unit_id = u.id
      WHERE m.status = 1
    `;
    
    const params = [];
    
    // 添加搜索条件 - 使用 LIKE 替代 ILIKE
    if (search) {
      query += ` AND (m.code LIKE ? OR m.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // 添加库位过滤
    if (locationId) {
      query += ` AND s.location_id = ?`;
      params.push(locationId);
    }
    
    // 添加类别过滤
    if (categoryId) {
      query += ` AND m.category_id = ?`;
      params.push(categoryId);
    }
    
    // 计算有效物料的总数
    let countQuery = `
      SELECT COUNT(*) as count 
      FROM materials m
      WHERE m.status = 1
    `;
    
    if (search) {
      countQuery += ` AND (m.code LIKE ? OR m.name LIKE ?)`;
    }
    
    if (categoryId) {
      countQuery += ` AND m.category_id = ?`;
    }
    
    const [countResult] = await db.pool.execute(countQuery, params.filter(p => 
      !p.toString().includes('location_id') // 过滤掉location_id参数
    ));
    const total = parseInt(countResult[0].count);
    
    // 添加排序和分页
    query += ` ORDER BY m.code LIMIT ${limitNum} OFFSET ${offset}`;
    
    // 执行最终查询
    const [rows] = await db.pool.execute(query, params);
    
    // 获取最新的库存数量，以确保与交易记录中的数量一致
    const updatedRows = await Promise.all(rows.map(async (row) => {
      // 如果有库存记录，获取最新交易中的after_quantity
      if (row.material_id && row.location_id) {
        const latestQuantity = await getLatestStockQuantity(row.material_id, row.location_id);
        if (latestQuantity !== null) {
          row.quantity = latestQuantity;
        }
      }
      return row;
    }));
    
    return {
      items: updatedRows,
      total,
      page: pageNum,
      limit: limitNum
    };
  } catch (error) {
    console.error('Error getting stock list:', error);
    throw error;
  }
};

// 获取最新的库存数量（从最新的交易记录中）
const getLatestStockQuantity = async (materialId, locationId) => {
  try {
    // 查询最新的交易记录
    const [rows] = await db.pool.execute(
      `SELECT after_quantity 
       FROM inventory_transactions 
       WHERE material_id = ? AND location_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [materialId, locationId]
    );
    
    if (rows.length > 0 && rows[0].after_quantity !== null) {
      return parseFloat(rows[0].after_quantity);
    }
    
    // 如果没有交易记录，返回null（表示使用默认库存量）
    return null;
  } catch (error) {
    console.error('Error getting latest stock quantity:', error);
    return null;
  }
};

// 获取单个库存项
const getStockById = async (id) => {
  try {
    const query = `
      SELECT 
        s.id, 
        m.code as code, 
        m.name as name, 
        m.specs as specification, 
        s.quantity, 
        COALESCE(w.name, m.location_name) as location_name, 
        c.name as category_name, 
        u.name as unit_name,
        s.location_id,
        m.category_id,
        m.unit_id,
        m.id as material_id
      FROM 
        inventory_stock s
        JOIN materials m ON s.material_id = m.id
        LEFT JOIN locations w ON s.location_id = w.id
        JOIN categories c ON m.category_id = c.id
        JOIN units u ON m.unit_id = u.id
      WHERE 
        s.id = ?
    `;
    
    const [rows] = await db.pool.execute(query, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  } catch (error) {
    console.error('Error getting stock by id:', error);
    throw error;
  }
};

// 获取库存变动记录
const getStockRecords = async (stockId) => {
  try {
    const query = `
      SELECT 
        id, 
        type, 
        quantity, 
        before_quantity, 
        after_quantity, 
        operator, 
        remark, 
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as date
      FROM 
        inventory_stock_records
      WHERE 
        stock_id = ?
      ORDER BY 
        created_at DESC
    `;
    
    const [rows] = await db.pool.execute(query, [stockId]);
    
    return rows;
  } catch (error) {
    console.error('Error getting stock records:', error);
    throw error;
  }
};

// 更新库存并记录变动
const updateStock = async (materialId, locationId, quantity, type, operator, remark = '') => {
  const connection = await db.pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 如果没有指定库位，获取物料的默认库位
    if (!locationId) {
      const [materialRows] = await connection.execute(
        'SELECT location_id FROM materials WHERE id = ?',
        [materialId]
      );
      if (materialRows.length > 0 && materialRows[0].location_id) {
        locationId = materialRows[0].location_id;
      } else {
        throw new Error('未指定库位，且物料没有默认库位');
      }
    }
    
    // 查找或创建库存记录
    const [stockRows] = await connection.execute(
      'SELECT * FROM inventory_stock WHERE material_id = ? AND location_id = ?',
      [materialId, locationId]
    );
    
    let stockId;
    let beforeQuantity = 0;
    let afterQuantity = 0;
    
    if (stockRows.length === 0) {
      // 创建新的库存记录
      const [newStockResult] = await connection.execute(
        `INSERT INTO inventory_stock 
          (material_id, location_id, quantity) 
         VALUES 
          (?, ?, ?)`,
        [materialId, locationId, quantity]
      );
      
      stockId = newStockResult.insertId;
      beforeQuantity = 0;
      afterQuantity = quantity;
    } else {
      // 更新现有库存
      stockId = stockRows[0].id;
      beforeQuantity = parseFloat(stockRows[0].quantity);
      afterQuantity = beforeQuantity + parseFloat(quantity);
      
      await connection.execute(
        'UPDATE inventory_stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [afterQuantity, stockId]
      );
    }
    
    // 记录库存变动，传入变动前后数量
    let transactionType = null;
    if (type === 'in' || type === 'inbound' || type === 'outsourced_inbound') {
      transactionType = type === 'outsourced_inbound' ? 'outsourced_inbound' : 'inbound';
    } else if (type === 'out' || type === 'outbound' || type === 'outsourced_outbound') {
      transactionType = type === 'outsourced_outbound' ? 'outsourced_outbound' : 'outbound';
    } else {
      transactionType = type;
    }
    
    const transactionRemark = remark || '';
    
    // 创建库存交易记录
    await connection.execute(
      `INSERT INTO inventory_transactions 
        (material_id, location_id, transaction_type, quantity, before_quantity, after_quantity, operator, remark) 
       VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?)`,
      [materialId, locationId, transactionType, Math.abs(parseFloat(quantity)), beforeQuantity, afterQuantity, operator, transactionRemark]
    );
    
    await connection.commit();
    return { stockId, beforeQuantity, afterQuantity };
  } catch (error) {
    await connection.rollback();
    console.error('更新库存失败:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// 导出库存数据（返回用于生成Excel的数据）
const exportStockData = async (search = '', locationId = null, categoryId = null) => {
  try {
    // 构建查询条件
    let query = `
      SELECT 
        m.code as '物料编码', 
        m.name as '物料名称', 
        m.specs as '规格', 
        COALESCE(w.name, m.location_name) as '库位', 
        c.name as '类别', 
        s.quantity as '库存数量', 
        u.name as '单位'
      FROM 
        inventory_stock s
        JOIN materials m ON s.material_id = m.id
        LEFT JOIN locations w ON s.location_id = w.id
        JOIN categories c ON m.category_id = c.id
        JOIN units u ON m.unit_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // 添加搜索条件
    if (search) {
      query += ` AND (m.code LIKE ? OR m.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // 添加库位过滤
    if (locationId) {
      query += ` AND s.location_id = ?`;
      params.push(locationId);
    }
    
    // 添加类别过滤
    if (categoryId) {
      query += ` AND m.category_id = ?`;
      params.push(categoryId);
    }
    
    query += ` ORDER BY m.code`;
    
    const [rows] = await db.pool.execute(query, params);
    
    return rows;
  } catch (error) {
    console.error('Error exporting stock data:', error);
    throw error;
  }
};

// 获取物料列表（用于选择物料）
const getMaterialList = async (search = '', categoryId = null) => {
  try {
    let query = `
      SELECT 
        m.id, 
        m.code, 
        m.name, 
        m.specs as specification, 
        c.name as category_name, 
        u.name as unit_name,
        m.category_id,
        m.unit_id,
        m.location_id,
        COALESCE(l.name, m.location_name) as location_name
      FROM 
        materials m
        JOIN categories c ON m.category_id = c.id
        JOIN units u ON m.unit_id = u.id
        LEFT JOIN locations l ON m.location_id = l.id
      WHERE 
        m.status = 1
    `;
    
    const params = [];
    
    // 添加搜索条件
    if (search) {
      query += ` AND (m.code LIKE ? OR m.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // 添加类别过滤
    if (categoryId) {
      query += ` AND m.category_id = ?`;
      params.push(categoryId);
    }
    
    query += ` ORDER BY m.code LIMIT 50`;
    
    const [rows] = await db.pool.execute(query, params);
    
    return rows;
  } catch (error) {
    console.error('Error getting material list:', error);
    throw error;
  }
};

// 获取出库单列表
const getOutboundList = async ({ page = 1, pageSize = 10, outboundNo, startDate, endDate }) => {
  const connection = await db.pool.getConnection();
  try {
    // 确保表存在
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory_outbound (
        id INT AUTO_INCREMENT PRIMARY KEY,
        outbound_no VARCHAR(50) NOT NULL UNIQUE,
        outbound_date DATE NOT NULL,
        status ENUM('draft', 'confirmed', 'completed', 'cancelled') DEFAULT 'draft',
        remark TEXT,
        operator VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (outbound_no),
        INDEX (outbound_date),
        INDEX (status)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory_outbound_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        outbound_id INT NOT NULL,
        material_id INT NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit_id INT NOT NULL,
        location_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (outbound_id) REFERENCES inventory_outbound(id),
        FOREIGN KEY (material_id) REFERENCES materials(id),
        FOREIGN KEY (unit_id) REFERENCES units(id),
        FOREIGN KEY (location_id) REFERENCES locations(id)
      )
    `);

    // 确保分页参数为数字类型
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSizeNum = Math.max(1, parseInt(pageSize) || 10);
    const offset = (pageNum - 1) * pageSizeNum;

    // 构建基本查询
    let query = `
      SELECT 
        o.id,
        o.outbound_no,
        DATE_FORMAT(o.outbound_date, '%Y-%m-%d') as outbound_date,
        o.status,
        o.operator,
        o.remark,
        DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(o.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at,
        COALESCE(
            (SELECT SUM(oi.quantity)
             FROM inventory_outbound_items oi
             WHERE oi.outbound_id = o.id), 0
        ) as total_quantity
      FROM 
        inventory_outbound o
      WHERE 1=1
    `;
    
    const conditions = [];
    const params = [];
    
    if (outboundNo) {
      conditions.push('o.outbound_no LIKE ?');
      params.push(`%${outboundNo}%`);
    }
    
    if (startDate) {
      conditions.push('o.outbound_date >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      conditions.push('o.outbound_date <= ?');
      params.push(endDate);
    }
    
    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }
    
    // 获取总数
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM inventory_outbound o WHERE 1=1 ${conditions.length ? 'AND ' + conditions.join(' AND ') : ''}`,
      params
    );
    
    // 直接在SQL字符串中插入分页参数，避免参数化查询的类型问题
    query += ` ORDER BY o.created_at DESC LIMIT ${parseInt(pageSizeNum)} OFFSET ${parseInt(offset)}`;
    
    // 执行查询，只传递WHERE条件的参数
    const [rows] = await connection.execute(query, params);
    
    return {
      list: rows,
      total: parseInt(countResult[0].total)
    };
  } catch (error) {
    console.error('Error in getOutboundList:', error);
    throw error;
  } finally {
    // 确保连接被释放
    connection.release();
  }
};

// 创建出库单
const createOutbound = async (outboundData) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 验证并处理输入数据
    const outboundDate = outboundData.outboundDate || new Date().toISOString().split('T')[0];
    const remark = outboundData.remark || '';
    const operator = outboundData.operator || '';

    // 验证状态值
    const validStatuses = ['draft', 'confirmed', 'completed', 'cancelled'];
    const status = validStatuses.includes(outboundData.status) ? outboundData.status : 'draft';

    // 验证必填字段
    if (!operator) {
      throw new Error('操作员不能为空');
    }

    // 生成出库单号
    const outboundNo = await generateOutboundNo(connection);

    console.log('Inserting outbound with status:', status);
    console.log('Outbound data:', JSON.stringify({...outboundData, outboundNo}, null, 2));

    // 验证第一个物料项是否存在
    if (!Array.isArray(outboundData.items) || outboundData.items.length === 0) {
      throw new Error('出库单必须包含至少一个物料项');
    }

    // 插入出库单主表
    console.log('Inserting into inventory_outbound table...');
    const [outboundResult] = await connection.execute(
      `INSERT INTO inventory_outbound 
        (outbound_no, outbound_date, status, remark, operator) 
       VALUES 
        (?, ?, ?, ?, ?)`,
      [outboundNo, outboundDate, status, remark, operator]
    );

    const outboundId = outboundResult.insertId;
    console.log('Inserted outbound with ID:', outboundId);

    // 插入出库单明细
    for (const item of outboundData.items) {
      if (!item.materialId || !item.quantity || !item.unitId || !item.locationId) {
        throw new Error('每个出库项目必须包含物料ID、数量、单位ID和库位ID');
      }

      console.log('Inserting outbound item:', JSON.stringify(item, null, 2));
      await connection.execute(
        `INSERT INTO inventory_outbound_items 
          (outbound_id, material_id, quantity, unit_id, location_id, remark) 
         VALUES 
          (?, ?, ?, ?, ?, ?)`,
        [outboundId, item.materialId, item.quantity, item.unitId, item.locationId, item.remark || null]
      );
      
      // 更新库存
      if (status === 'completed') {
        console.log('Updating stock for completed outbound...');
        await updateStock(item.materialId, item.locationId, -item.quantity, '出库', operator, `出库单号: ${outboundNo}`);
      }
    }
    
    await connection.commit();
    console.log('Transaction committed successfully');
    return { id: outboundId, outboundNo: outboundNo };
  } catch (error) {
    await connection.rollback();
    console.error('Error creating outbound:', error);
    throw error;
  } finally {
    connection.release();
    console.log('Database connection released');
  }
};

// 更新出库单
const updateOutbound = async (id, outboundData) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 更新出库单主表
    await connection.execute(
      `UPDATE inventory_outbound 
       SET outbound_date = ?, status = ?, remark = ?, operator = ? 
       WHERE id = ?`,
      [outboundData.outboundDate, outboundData.status, outboundData.remark, outboundData.operator, id]
    );
    
    // 删除旧的出库单明细
    const [oldItems] = await connection.execute('SELECT * FROM inventory_outbound_items WHERE outbound_id = ?', [id]);
    await connection.execute('DELETE FROM inventory_outbound_items WHERE outbound_id = ?', [id]);
    
    // 恢复库存
    for (const item of oldItems) {
      await updateStock(item.material_id, item.location_id, item.quantity, '入库', outboundData.operator, `取消出库: ${outboundData.outboundNo}`);
    }
    
    // 插入新的出库单明细并更新库存
    for (const item of outboundData.items) {
      await connection.execute(
        `INSERT INTO inventory_outbound_items 
          (outbound_id, material_id, quantity, unit_id, location_id) 
         VALUES 
          (?, ?, ?, ?, ?)`,
        [id, item.materialId, item.quantity, item.unitId, item.locationId]
      );
      
      // 更新库存
      await updateStock(item.materialId, item.locationId, -item.quantity, '出库', outboundData.operator, `出库单号: ${outboundData.outboundNo}`);
    }
    
    await connection.commit();
    return { id, outboundNo: outboundData.outboundNo };
  } catch (error) {
    await connection.rollback();
    console.error('Error updating outbound:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// 删除出库单
const deleteOutbound = async (id) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 获取出库单信息
    const [outboundResult] = await connection.execute('SELECT * FROM inventory_outbound WHERE id = ?', [id]);
    if (outboundResult.length === 0) {
      throw new Error('出库单不存在');
    }
    const outbound = outboundResult[0];
    
    // 获取出库单明细
    const [items] = await connection.execute('SELECT * FROM inventory_outbound_items WHERE outbound_id = ?', [id]);
    
    // 恢复库存
    for (const item of items) {
      await updateStock(item.material_id, item.location_id, item.quantity, '入库', outbound.operator, `取消出库: ${outbound.outbound_no}`);
    }
    
    // 删除出库单明细
    await connection.execute('DELETE FROM inventory_outbound_items WHERE outbound_id = ?', [id]);
    
    // 删除出库单主表
    await connection.execute('DELETE FROM inventory_outbound WHERE id = ?', [id]);
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting outbound:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// 获取出库单详情
const getOutbound = async (id) => {
  const connection = await db.pool.getConnection();
  try {
    // 获取出库单主表信息
    const [outboundRows] = await connection.execute(`
      SELECT 
        o.id,
        o.outbound_no,
        DATE_FORMAT(o.outbound_date, '%Y-%m-%d') as outbound_date,
        o.status,
        o.remark,
        o.operator,
        DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(o.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
      FROM inventory_outbound o
      WHERE o.id = ?
    `, [id]);

    if (outboundRows.length === 0) {
      throw new Error('出库单不存在');
    }

    // 获取出库单明细
    const [itemRows] = await connection.execute(`
      SELECT 
        i.id,
        i.material_id,
        m.code as material_code,
        m.name as material_name,
        i.quantity,
        i.unit_id,
        u.name as unit_name,
        i.location_id,
        l.name as location_name,
        i.remark
      FROM inventory_outbound_items i
      LEFT JOIN materials m ON i.material_id = m.id
      LEFT JOIN units u ON i.unit_id = u.id
      LEFT JOIN locations l ON i.location_id = l.id
      WHERE i.outbound_id = ?
    `, [id]);

    return {
      ...outboundRows[0],
      items: itemRows
    };
  } catch (error) {
    console.error('Error getting outbound:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// 获取特定物料在特定仓库的库存
const getMaterialStock = async (materialId, warehouseId) => {
  try {
    console.log(`获取物料库存: materialId=${materialId}, warehouseId=${warehouseId}`);
    
    if (!materialId || !warehouseId) {
      console.log('materialId或warehouseId为空，返回0库存');
      return {
        quantity: 0,
        material_id: materialId,
        warehouse_id: warehouseId
      };
    }
    
    // 修改查询，确保正确获取物料库存
    const query = `
      SELECT 
        m.id as material_id,
        m.code,
        m.name,
        m.specs as specification,
        u.name as unit_name,
        u.id as unit_id,
        COALESCE(w.name, '默认库位') as location_name,
        COALESCE(s.id, 0) as id,
        COALESCE(s.quantity, 0) as quantity
      FROM 
        materials m
        LEFT JOIN inventory_stock s ON m.id = s.material_id AND s.location_id = ?
        LEFT JOIN locations w ON w.id = ?
        JOIN units u ON m.unit_id = u.id
      WHERE 
        m.id = ?
    `;

    const [rows] = await db.pool.execute(query, [warehouseId, warehouseId, materialId]);
    console.log('查询结果:', JSON.stringify(rows, null, 2));

    if (rows.length === 0) {
      console.log('未找到物料库存记录，返回0库存');
      return {
        quantity: 0,
        material_id: materialId,
        warehouse_id: warehouseId
      };
    }

    // 尝试从最新交易记录获取库存数量
    const latestQuantity = await getLatestStockQuantity(materialId, warehouseId);
    
    // 如果找到最新交易记录中的库存量，使用它；否则使用inventory_stock表中的数量
    const quantity = latestQuantity !== null ? 
      latestQuantity : 
      (rows[0].quantity !== null ? parseFloat(rows[0].quantity) : 0);
      
    console.log('解析后的库存数量:', quantity);

    // 添加stock_quantity字段以保持一致性
    return {
      ...rows[0],
      quantity: quantity,
      stock_quantity: quantity,
      material_id: materialId,
      warehouse_id: warehouseId
    };
  } catch (error) {
    console.error('Error getting material stock:', error);
    throw error;
  }
};

// 搜索物料
const searchMaterials = async (query = '', locationId = null) => {
  try {
    if (!query || query.trim() === '') {
      return [];
    }

    // 构建查询参数数组
    const params = [`%${query}%`, `%${query}%`, `%${query}%`];
    
    // 如果提供了仓库ID，添加到查询条件
    let locationCondition = '';
    if (locationId) {
      locationCondition = 'AND s.location_id = ?';
      params.push(locationId);
    }

    const searchQuery = `
      SELECT 
        m.id, 
        m.code, 
        m.name, 
        m.specs as specification, 
        c.name as category_name, 
        u.name as unit_name,
        m.unit_id,
        COALESCE(s.quantity, 0) as stock_quantity,
        COALESCE(s.quantity, 0) as quantity
      FROM 
        materials m
        JOIN categories c ON m.category_id = c.id
        JOIN units u ON m.unit_id = u.id
        LEFT JOIN inventory_stock s ON m.id = s.material_id ${locationCondition}
      WHERE 
        m.status = 1
        AND (m.code LIKE ? OR m.name LIKE ? OR m.specs LIKE ?)
      ORDER BY 
        m.code
      LIMIT 20
    `;
    
    console.log('Material search query:', searchQuery.replace(/\s+/g, ' '));
    console.log('Material search params:', params);
    
    const [rows] = await db.pool.execute(searchQuery, params);
    console.log(`Found ${rows.length} materials matching query "${query}"`);
    
    return rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      specification: row.specification,
      category_name: row.category_name,
      unit_name: row.unit_name,
      unit_id: row.unit_id,
      stock_quantity: parseFloat(row.stock_quantity || 0),
      quantity: parseFloat(row.quantity || 0),
      value: row.id,
      label: `${row.code} - ${row.name} (${row.specification || ''})`
    }));
  } catch (error) {
    console.error('Error searching materials:', error);
    throw error;
  }
};

// 生成出库单号
const generateOutboundNo = async (connection) => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = 'OUT' + today;

  // 获取当天的最大编号
  const [rows] = await connection.execute(
    'SELECT MAX(outbound_no) as max_no FROM inventory_outbound WHERE outbound_no LIKE ?',
    [`${prefix}%`]
  );

  let sequenceNumber = 1;
  if (rows[0].max_no) {
    sequenceNumber = parseInt(rows[0].max_no.slice(-4)) + 1;
  }

  return `${prefix}${String(sequenceNumber).padStart(4, '0')}`;
};

module.exports = {
  getStockList,
  getStockById,
  getStockRecords,
  updateStock,
  exportStockData,
  getMaterialList,
  searchMaterials,
  getOutboundList,
  createOutbound,
  updateOutbound,
  deleteOutbound,
  getMaterialStock,
  generateOutboundNo,
  getLatestStockQuantity
};