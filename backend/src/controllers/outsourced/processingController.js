const db = require('../../database');
const purchaseModel = require('../../models/purchase');

/**
 * 获取外委加工单列表
 */
const getProcessings = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      processing_no = '', 
      supplier_name = '', 
      status = '', 
      start_date = '', 
      end_date = '' 
    } = req.query;
    
    let query = `
      SELECT * FROM outsourced_processings
      WHERE 1=1
    `;
    
    const params = [];
    
    if (processing_no) {
      query += ` AND processing_no LIKE ?`;
      params.push(`%${processing_no}%`);
    }
    
    if (supplier_name) {
      query += ` AND supplier_name LIKE ?`;
      params.push(`%${supplier_name}%`);
    }
    
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    
    if (start_date && end_date) {
      query += ` AND processing_date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }
    
    // 获取总数
    const [countResult] = await db.pool.execute(
      `SELECT COUNT(*) as total FROM (${query}) as countTable`,
      params
    );
    
    const total = countResult[0].total;
    
    // 转换分页参数为整数
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;
    
    // 不使用参数占位符，而是直接拼接SQL语句中的分页数字
    query += ` ORDER BY id DESC LIMIT ${limitInt} OFFSET ${offset}`;
    
    // 使用原始参数数组，不添加分页参数
    const [rows] = await db.pool.execute(query, params);
    
    res.json({
      success: true,
      data: rows,
      total,
      page: pageInt,
      limit: limitInt
    });
  } catch (error) {
    console.error('获取外委加工单列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取外委加工单列表失败',
      error: error.message
    });
  }
};

/**
 * 获取单个外委加工单详情
 */
const getProcessing = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取加工单主信息
    const [processing] = await db.pool.execute(
      `SELECT * FROM outsourced_processings WHERE id = ?`,
      [id]
    );
    
    if (processing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '外委加工单不存在'
      });
    }
    
    // 获取发料信息
    const [materials] = await db.pool.execute(
      `SELECT * FROM outsourced_processing_materials WHERE processing_id = ?`,
      [id]
    );
    
    // 获取成品信息
    const [products] = await db.pool.execute(
      `SELECT * FROM outsourced_processing_products WHERE processing_id = ?`,
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...processing[0],
        materials,
        products
      }
    });
  } catch (error) {
    console.error('获取外委加工单详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取外委加工单详情失败',
      error: error.message
    });
  }
};

/**
 * 创建外委加工单
 */
const createProcessing = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const {
      processing_date,
      supplier_id,
      supplier_name,
      expected_delivery_date,
      contact_person,
      contact_phone,
      remarks,
      warehouse_id,
      warehouse_name,
      materials,
      products
    } = req.body;
    
    console.log('接收到的处理单数据:', JSON.stringify(req.body, null, 2));
    
    // 生成加工单号
    const processing_no = await purchaseModel.generateProcessingNo();
    
    // 计算总金额，确保不会有NaN
    const total_amount = products && products.length > 0 
      ? products.reduce((sum, product) => sum + (parseFloat(product.total_price || 0) || 0), 0)
      : 0;
    
    // 安全转换函数，避免undefined值
    const safeString = (value) => value === undefined ? '' : String(value || '');
    const safeNumber = (value) => {
      return value === undefined || value === null ? null : 
        (isNaN(parseFloat(value)) ? 0 : parseFloat(value));
    };
    
    // 插入加工单主表，确保所有值都是安全的
    const [result] = await connection.execute(
      `INSERT INTO outsourced_processings (
        processing_no, processing_date, supplier_id, supplier_name,
        expected_delivery_date, contact_person, contact_phone,
        total_amount, remarks, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        safeString(processing_no), 
        safeString(processing_date), 
        safeNumber(supplier_id), 
        safeString(supplier_name),
        safeString(expected_delivery_date), 
        safeString(contact_person), 
        safeString(contact_phone),
        safeNumber(total_amount), 
        safeString(remarks)
      ]
    );
    
    const processing_id = result.insertId;
    
    // 插入发料明细
    if (materials && materials.length > 0) {
      for (const material of materials) {
        await connection.execute(
          `INSERT INTO outsourced_processing_materials (
            processing_id, material_id, material_code, material_name,
            specification, unit, unit_id, quantity, remark
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            processing_id, 
            safeNumber(material.material_id), 
            safeString(material.material_code), 
            safeString(material.material_name),
            safeString(material.specification), 
            safeString(material.unit), 
            safeNumber(material.unit_id), 
            safeNumber(material.quantity || 0), 
            safeString(material.remark)
          ]
        );
      }
    }
    
    // 插入成品明细
    if (products && products.length > 0) {
      for (const product of products) {
        await connection.execute(
          `INSERT INTO outsourced_processing_products (
            processing_id, product_id, product_code, product_name,
            specification, unit, unit_id, quantity, unit_price, total_price, remark
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            processing_id, 
            safeNumber(product.product_id), 
            safeString(product.product_code), 
            safeString(product.product_name),
            safeString(product.specification), 
            safeString(product.unit), 
            safeNumber(product.unit_id), 
            safeNumber(product.quantity || 0),
            safeNumber(product.unit_price || 0), 
            safeNumber(product.total_price || 0), 
            safeString(product.remark)
          ]
        );
      }
    }
    
    await connection.commit();
    
    res.status(201).json({
      success: true,
      message: '外委加工单创建成功',
      data: { id: processing_id, processing_no }
    });
  } catch (error) {
    await connection.rollback();
    console.error('创建外委加工单失败:', error);
    console.error('错误详情:', error.stack);
    res.status(500).json({
      success: false,
      message: '创建外委加工单失败',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 更新外委加工单
 */
const updateProcessing = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const {
      processing_date,
      supplier_id,
      supplier_name,
      expected_delivery_date,
      contact_person,
      contact_phone,
      remarks,
      warehouse_id,
      warehouse_name,
      materials,
      products
    } = req.body;
    
    console.log('更新加工单数据:', JSON.stringify(req.body, null, 2));
    
    // 检查加工单是否存在且状态为待确认
    const [existingProcessing] = await connection.execute(
      `SELECT status FROM outsourced_processings WHERE id = ?`,
      [id]
    );
    
    if (existingProcessing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '外委加工单不存在'
      });
    }
    
    if (existingProcessing[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '只能修改待确认状态的加工单'
      });
    }
    
    // 安全转换函数，避免undefined值
    const safeString = (value) => value === undefined ? '' : String(value || '');
    const safeNumber = (value) => {
      return value === undefined || value === null ? null : 
        (isNaN(parseFloat(value)) ? 0 : parseFloat(value));
    };
    
    // 计算总金额，确保不会有NaN
    const total_amount = products && products.length > 0 
      ? products.reduce((sum, product) => sum + (parseFloat(product.total_price || 0) || 0), 0)
      : 0;
    
    // 更新加工单主表
    await connection.execute(
      `UPDATE outsourced_processings SET
        processing_date = ?, supplier_id = ?, supplier_name = ?,
        expected_delivery_date = ?, contact_person = ?, contact_phone = ?,
        warehouse_id = ?, warehouse_name = ?, total_amount = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        safeString(processing_date), 
        safeNumber(supplier_id), 
        safeString(supplier_name),
        safeString(expected_delivery_date), 
        safeString(contact_person), 
        safeString(contact_phone),
        safeNumber(warehouse_id),
        safeString(warehouse_name),
        safeNumber(total_amount), 
        safeString(remarks), 
        id
      ]
    );
    
    // 删除旧的发料明细
    await connection.execute(
      `DELETE FROM outsourced_processing_materials WHERE processing_id = ?`,
      [id]
    );
    
    // 删除旧的成品明细
    await connection.execute(
      `DELETE FROM outsourced_processing_products WHERE processing_id = ?`,
      [id]
    );
    
    // 插入新的发料明细
    if (materials && materials.length > 0) {
      for (const material of materials) {
        await connection.execute(
          `INSERT INTO outsourced_processing_materials (
            processing_id, material_id, material_code, material_name,
            specification, unit, unit_id, quantity, remark
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, 
            safeNumber(material.material_id), 
            safeString(material.material_code), 
            safeString(material.material_name),
            safeString(material.specification), 
            safeString(material.unit), 
            safeNumber(material.unit_id), 
            safeNumber(material.quantity || 0), 
            safeString(material.remark)
          ]
        );
      }
    }
    
    // 插入新的成品明细
    if (products && products.length > 0) {
      for (const product of products) {
        await connection.execute(
          `INSERT INTO outsourced_processing_products (
            processing_id, product_id, product_code, product_name,
            specification, unit, unit_id, quantity, unit_price, total_price, remark
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, 
            safeNumber(product.product_id), 
            safeString(product.product_code), 
            safeString(product.product_name),
            safeString(product.specification), 
            safeString(product.unit), 
            safeNumber(product.unit_id), 
            safeNumber(product.quantity || 0),
            safeNumber(product.unit_price || 0), 
            safeNumber(product.total_price || 0), 
            safeString(product.remark)
          ]
        );
      }
    }
    
    await connection.commit();
    
    res.json({
      success: true,
      message: '外委加工单更新成功'
    });
  } catch (error) {
    await connection.rollback();
    console.error('更新外委加工单失败:', error);
    console.error('错误详情:', error.stack);
    res.status(500).json({
      success: false,
      message: '更新外委加工单失败',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 删除外委加工单
 */
const deleteProcessing = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // 检查加工单是否存在且状态为待确认
    const [existingProcessing] = await connection.execute(
      `SELECT status FROM outsourced_processings WHERE id = ?`,
      [id]
    );
    
    if (existingProcessing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '外委加工单不存在'
      });
    }
    
    if (existingProcessing[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '只能删除待确认状态的加工单'
      });
    }
    
    // 删除相关明细记录
    await connection.execute(
      `DELETE FROM outsourced_processing_materials WHERE processing_id = ?`,
      [id]
    );
    
    await connection.execute(
      `DELETE FROM outsourced_processing_products WHERE processing_id = ?`,
      [id]
    );
    
    // 删除主表记录
    await connection.execute(
      `DELETE FROM outsourced_processings WHERE id = ?`,
      [id]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: '外委加工单删除成功'
    });
  } catch (error) {
    await connection.rollback();
    console.error('删除外委加工单失败:', error);
    res.status(500).json({
      success: false,
      message: '删除外委加工单失败',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 更新外委加工单状态
 */
const updateProcessingStatus = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { status } = req.body;
    
    // 初始化warnings数组
    const warnings = [];
    
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      });
    }
    
    // 检查加工单是否存在
    const [existingProcessing] = await connection.execute(
      `SELECT * FROM outsourced_processings WHERE id = ?`,
      [id]
    );
    
    if (existingProcessing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '外委加工单不存在'
      });
    }
    
    // 更新加工单状态
    await connection.execute(
      `UPDATE outsourced_processings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, id]
    );
    
    // 如果状态为已确认，则尝试减少发料物料的库存
    if (status === 'confirmed') {
      // 获取发料明细
      const [materials] = await connection.execute(
        `SELECT * FROM outsourced_processing_materials WHERE processing_id = ?`,
        [id]
      );
      
      // 使用加工单中指定的仓库，如果没有则获取默认仓库
      let warehouseId, warehouseName;
      
      if (existingProcessing[0].warehouse_id) {
        warehouseId = existingProcessing[0].warehouse_id;
        warehouseName = existingProcessing[0].warehouse_name || '指定仓库';
      } else {
        // 获取默认仓库ID（如果没有指定仓库，使用ID为1的仓库）
        const [defaultWarehouse] = await connection.execute(
          `SELECT id, name FROM locations WHERE type = 'warehouse' ORDER BY id LIMIT 1`
        );
        
        warehouseId = defaultWarehouse.length > 0 ? defaultWarehouse[0].id : 1;
        warehouseName = defaultWarehouse.length > 0 ? defaultWarehouse[0].name : '默认仓库';
      }
      
      // 减少每个发料物料的库存
      for (const material of materials) {
        // 如果物料有自己的默认库位，且加工单中没有指定仓库，则使用物料的默认库位
        let usedWarehouseId = warehouseId;
        let usedWarehouseName = warehouseName;
        
        if (!existingProcessing[0].warehouse_id) {
          // 检查物料是否有默认库位
          const [materialInfo] = await connection.execute(
            `SELECT location_id FROM materials WHERE id = ?`,
            [material.material_id]
          );
          
          if (materialInfo.length > 0 && materialInfo[0].location_id) {
            // 获取物料默认库位的名称
            const [locationInfo] = await connection.execute(
              `SELECT name FROM locations WHERE id = ?`,
              [materialInfo[0].location_id]
            );
            
            if (locationInfo.length > 0) {
              usedWarehouseId = materialInfo[0].location_id;
              usedWarehouseName = locationInfo[0].name;
              console.log(`使用物料默认库位: ${usedWarehouseName} (ID: ${usedWarehouseId})`);
            }
          }
        }
        
        // 检查库存记录是否存在
        const [existingStock] = await connection.execute(
          `SELECT * FROM inventory_stock 
           WHERE material_id = ? AND location_id = ?`,
          [material.material_id, usedWarehouseId]
        );
        
        if (existingStock.length > 0) {
          // 获取当前库存数量作为before_quantity
          const beforeQuantity = existingStock[0].quantity;
          const afterQuantity = beforeQuantity - parseFloat(material.quantity);
          
          // 检查库存是否足够
          if (beforeQuantity < parseFloat(material.quantity)) {
            warnings.push(`物料 ${material.material_name} 在${usedWarehouseName}库存不足，当前库存: ${beforeQuantity}，需要: ${material.quantity}`);
            
            // 尽管库存不足，仍然减少可用的库存
            await connection.execute(
              `UPDATE inventory_stock 
               SET quantity = 0, updated_at = CURRENT_TIMESTAMP 
               WHERE material_id = ? AND location_id = ?`,
              [material.material_id, usedWarehouseId]
            );
            
            // 添加库存事务记录
            await connection.execute(
              `INSERT INTO inventory_transactions (
                material_id, location_id, transaction_type, 
                quantity, unit_id, reference_no, reference_type, 
                operator, remark, before_quantity, after_quantity
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                material.material_id, 
                usedWarehouseId,
                'outsourced_outbound',
                -parseFloat(beforeQuantity), // 出库实际可用数量
                material.unit_id,
                existingProcessing[0].processing_no, 
                'outsourced_processing_material',
                'system',
                `外委加工发料(库存不足) ${existingProcessing[0].processing_no}`,
                beforeQuantity,
                0
              ]
            );
          } else {
            // 库存足够，正常扣减
            await connection.execute(
              `UPDATE inventory_stock 
               SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP 
               WHERE material_id = ? AND location_id = ?`,
              [material.quantity, material.material_id, usedWarehouseId]
            );
            
            // 添加库存事务记录
            await connection.execute(
              `INSERT INTO inventory_transactions (
                material_id, location_id, transaction_type, 
                quantity, unit_id, reference_no, reference_type, 
                operator, remark, before_quantity, after_quantity
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                material.material_id, 
                usedWarehouseId,
                'outsourced_outbound',
                -parseFloat(material.quantity), // 出库为负数
                material.unit_id,
                existingProcessing[0].processing_no, 
                'outsourced_processing_material',
                'system',
                `外委加工发料 ${existingProcessing[0].processing_no}`,
                beforeQuantity,
                afterQuantity
              ]
            );
          }
        } else {
          // 如果该物料没有库存记录，记录警告信息
          warnings.push(`物料 ${material.material_name} 在${usedWarehouseName}没有库存记录，无法扣减库存`);
          
          // 创建一个库存记录，数量为0
          try {
            await connection.execute(
              `INSERT INTO inventory_stock (
                material_id, location_id, quantity
              ) VALUES (?, ?, ?)`,
              [material.material_id, usedWarehouseId, 0]
            );
            
            // 添加库存事务记录
            await connection.execute(
              `INSERT INTO inventory_transactions (
                material_id, location_id, transaction_type, 
                quantity, unit_id, reference_no, reference_type, 
                operator, remark, before_quantity, after_quantity
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                material.material_id, 
                usedWarehouseId,
                'outsourced_outbound',
                -parseFloat(material.quantity),
                material.unit_id,
                existingProcessing[0].processing_no, 
                'outsourced_processing_material',
                'system',
                `外委加工发料(无库存) ${existingProcessing[0].processing_no}`,
                0,
                0
              ]
            );
          } catch (insertError) {
            console.error('创建库存记录失败:', insertError);
            warnings.push(`物料 ${material.material_name} 创建库存记录失败: ${insertError.message}`);
          }
        }
      }
    }
    
    await connection.commit();
    
    res.json({
      success: true,
      message: '外委加工单状态更新成功',
      warnings: warnings && warnings.length > 0 ? warnings : undefined
    });
  } catch (error) {
    await connection.rollback();
    console.error('更新外委加工单状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新外委加工单状态失败',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 获取外委加工入库单列表
 */
const getReceipts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      receipt_no = '', 
      processing_no = '', 
      supplier_name = '', 
      status = '', 
      start_date = '', 
      end_date = '' 
    } = req.query;
    
    let query = `
      SELECT * FROM outsourced_processing_receipts
      WHERE 1=1
    `;
    
    const params = [];
    
    if (receipt_no) {
      query += ` AND receipt_no LIKE ?`;
      params.push(`%${receipt_no}%`);
    }
    
    if (processing_no) {
      query += ` AND processing_no LIKE ?`;
      params.push(`%${processing_no}%`);
    }
    
    if (supplier_name) {
      query += ` AND supplier_name LIKE ?`;
      params.push(`%${supplier_name}%`);
    }
    
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    
    if (start_date && end_date) {
      query += ` AND receipt_date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }
    
    // 获取总数
    const [countResult] = await db.pool.execute(
      `SELECT COUNT(*) as total FROM (${query}) as countTable`,
      params
    );
    
    const total = countResult[0].total;
    
    // 转换分页参数为整数
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;
    
    // 不使用参数占位符，而是直接拼接SQL语句中的分页数字
    query += ` ORDER BY id DESC LIMIT ${limitInt} OFFSET ${offset}`;
    
    // 使用原始参数数组，不添加分页参数
    const [rows] = await db.pool.execute(query, params);
    
    res.json({
      success: true,
      data: rows,
      total,
      page: pageInt,
      limit: limitInt
    });
  } catch (error) {
    console.error('获取外委加工入库单列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取外委加工入库单列表失败',
      error: error.message
    });
  }
};

/**
 * 获取单个外委加工入库单详情
 */
const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取入库单主信息
    const [receipt] = await db.pool.execute(
      `SELECT * FROM outsourced_processing_receipts WHERE id = ?`,
      [id]
    );
    
    if (receipt.length === 0) {
      return res.status(404).json({
        success: false,
        message: '外委加工入库单不存在'
      });
    }
    
    // 获取入库明细
    const [items] = await db.pool.execute(
      `SELECT * FROM outsourced_processing_receipt_items WHERE receipt_id = ?`,
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...receipt[0],
        items
      }
    });
  } catch (error) {
    console.error('获取外委加工入库单详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取外委加工入库单详情失败',
      error: error.message
    });
  }
};

/**
 * 创建外委加工入库单
 */
const createReceipt = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const {
      processing_id,
      processing_no,
      supplier_id,
      supplier_name,
      warehouse_id,
      warehouse_name,
      receipt_date,
      operator,
      remarks,
      items
    } = req.body;
    
    console.log('接收到的入库单数据:', JSON.stringify(req.body, null, 2));
    
    // 验证仓库是否存在
    const [existingWarehouse] = await connection.execute(
      `SELECT id, name FROM locations WHERE id = ? AND type = 'warehouse'`,
      [warehouse_id]
    );
    
    if (existingWarehouse.length === 0) {
      return res.status(400).json({
        success: false,
        message: `仓库ID ${warehouse_id} 不存在，请确保选择了有效的仓库`
      });
    }
    
    // 使用仓库表中的名称，确保一致性
    const validWarehouseName = existingWarehouse[0].name;
    
    // 生成入库单号
    const receipt_no = await purchaseModel.generateProcessingReceiptNo();
    
    // 安全转换函数，避免undefined值
    const safeString = (value) => value === undefined ? '' : String(value || '');
    const safeNumber = (value) => {
      return value === undefined || value === null ? null : 
        (isNaN(parseFloat(value)) ? 0 : parseFloat(value));
    };
    
    try {
      // 插入入库单主表
      const [result] = await connection.execute(
        `INSERT INTO outsourced_processing_receipts (
          receipt_no, processing_id, processing_no, supplier_id, supplier_name,
          warehouse_id, warehouse_name, receipt_date, operator, remarks, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          safeString(receipt_no),
          safeNumber(processing_id),
          safeString(processing_no),
          safeNumber(supplier_id),
          safeString(supplier_name),
          safeNumber(warehouse_id),
          safeString(validWarehouseName), // 使用验证后的仓库名
          safeString(receipt_date),
          safeString(operator),
          safeString(remarks)
        ]
      );
      
      const receipt_id = result.insertId;
      
      // 插入入库明细
      if (items && items.length > 0) {
        for (const item of items) {
          // 安全计算总价
          const unitPrice = safeNumber(item.unit_price || 0);
          const actualQty = safeNumber(item.actual_quantity || 0);
          const total_price = unitPrice * actualQty;
          
          await connection.execute(
            `INSERT INTO outsourced_processing_receipt_items (
              receipt_id, product_id, product_code, product_name,
              specification, unit, unit_id, expected_quantity,
              actual_quantity, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              receipt_id, 
              safeNumber(item.product_id), 
              safeString(item.product_code), 
              safeString(item.product_name),
              safeString(item.specification), 
              safeString(item.unit), 
              safeNumber(item.unit_id), 
              safeNumber(item.expected_quantity || 0),
              actualQty,
              unitPrice, 
              total_price
            ]
          );
        }
      }
      
      await connection.commit();
      
      res.status(201).json({
        success: true,
        message: '外委加工入库单创建成功',
        data: { id: receipt_id, receipt_no }
      });
    } catch (error) {
      // 检查是否是外键约束错误
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        // 如果是inventory_locations外键约束错误，则临时修正数据库以允许操作
        if (error.sqlMessage.includes('inventory_locations')) {
          try {
            console.log('检测到inventory_locations外键约束问题，尝试临时解决...');
            
            // 先禁用外键约束检查
            await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
            console.log('已禁用外键约束检查');
            
            // 修改表的外键约束，改为使用locations表
            await connection.execute(`
              ALTER TABLE outsourced_processing_receipts 
              DROP FOREIGN KEY outsourced_processing_receipts_ibfk_1
            `);
            console.log('已删除旧的外键约束');
            
            // 添加新的外键约束
            await connection.execute(`
              ALTER TABLE outsourced_processing_receipts 
              ADD CONSTRAINT outsourced_processing_receipts_ibfk_1
              FOREIGN KEY (warehouse_id) REFERENCES locations(id)
            `);
            console.log('已添加指向locations表的新外键约束');
            
            // 重新启用外键约束检查
            await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
            console.log('已重新启用外键约束检查');
            
            // 递归调用自己重新执行入库单创建逻辑
            return createReceipt(req, res);
          } catch (alterError) {
            console.error('修改外键约束失败:', alterError);
            // 如果修改失败，继续抛出原始错误
            throw error;
          }
        }
      }
      throw error; // 如果不是特定的外键约束错误，继续抛出错误
    }
  } catch (error) {
    await connection.rollback();
    console.error('创建外委加工入库单失败:', error);
    console.error('错误详情:', error.stack);
    
    // 提供更友好的错误信息
    let errorMessage = '创建外委加工入库单失败';
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      if (error.sqlMessage.includes('warehouse_id')) {
        errorMessage = '所选仓库不存在或无效，请检查仓库设置';
      } else if (error.sqlMessage.includes('supplier_id')) {
        errorMessage = '所选供应商不存在或无效，请检查供应商设置';
      } else if (error.sqlMessage.includes('processing_id')) {
        errorMessage = '所选加工单不存在或无效，请检查加工单信息';
      }
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 更新外委加工入库单
 */
const updateReceipt = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const {
      warehouse_id,
      warehouse_name,
      receipt_date,
      operator,
      remarks,
      items
    } = req.body;
    
    // 检查入库单是否存在且状态为待确认
    const [existingReceipt] = await connection.execute(
      `SELECT status FROM outsourced_processing_receipts WHERE id = ?`,
      [id]
    );
    
    if (existingReceipt.length === 0) {
      return res.status(404).json({
        success: false,
        message: '外委加工入库单不存在'
      });
    }
    
    if (existingReceipt[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '只能修改待确认状态的入库单'
      });
    }
    
    // 更新入库单主表
    await connection.execute(
      `UPDATE outsourced_processing_receipts SET
        warehouse_id = ?, warehouse_name = ?, receipt_date = ?,
        operator = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        warehouse_id, warehouse_name, receipt_date,
        operator, remarks, id
      ]
    );
    
    // 删除旧的入库明细
    await connection.execute(
      `DELETE FROM outsourced_processing_receipt_items WHERE receipt_id = ?`,
      [id]
    );
    
    // 插入新的入库明细
    if (items && items.length > 0) {
      for (const item of items) {
        const total_price = parseFloat(item.unit_price) * parseFloat(item.actual_quantity);
        
        await connection.execute(
          `INSERT INTO outsourced_processing_receipt_items (
            receipt_id, product_id, product_code, product_name,
            specification, unit, unit_id, expected_quantity,
            actual_quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, item.product_id, item.product_code, item.product_name,
            item.specification, item.unit, item.unit_id, item.expected_quantity,
            item.actual_quantity, item.unit_price, total_price
          ]
        );
      }
    }
    
    await connection.commit();
    
    res.json({
      success: true,
      message: '外委加工入库单更新成功'
    });
  } catch (error) {
    await connection.rollback();
    console.error('更新外委加工入库单失败:', error);
    res.status(500).json({
      success: false,
      message: '更新外委加工入库单失败',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 更新外委加工入库单状态
 */
const updateReceiptStatus = async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      });
    }
    
    // 检查入库单是否存在
    const [existingReceipt] = await connection.execute(
      `SELECT * FROM outsourced_processing_receipts WHERE id = ?`,
      [id]
    );
    
    if (existingReceipt.length === 0) {
      return res.status(404).json({
        success: false,
        message: '外委加工入库单不存在'
      });
    }
    
    // 更新入库单状态
    await connection.execute(
      `UPDATE outsourced_processing_receipts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, id]
    );
    
    // 如果状态为已确认，则需要更新库存
    if (status === 'confirmed') {
      // 获取入库单明细
      const [items] = await connection.execute(
        `SELECT * FROM outsourced_processing_receipt_items WHERE receipt_id = ?`,
        [id]
      );
      
      console.log(`处理入库单 ${existingReceipt[0].receipt_no} 的库存更新，共 ${items.length} 个物料`);
      
      // 更新库存
      for (const item of items) {
        try {
          const material_id = item.product_id; 
          const location_id = existingReceipt[0].warehouse_id;
          const actualQuantity = parseFloat(item.actual_quantity);
          
          console.log(`处理物料ID ${material_id}，入库数量 ${actualQuantity}，仓库ID ${location_id}`);
          
          // 先查询当前库存作为变动前数量
          const [currentStock] = await connection.execute(
            `SELECT id, quantity FROM inventory_stock 
             WHERE material_id = ? AND location_id = ?`,
            [material_id, location_id]
          );
          
          let stockId = null;
          let beforeQuantity = 0;
          let afterQuantity = 0;
          
          if (currentStock.length > 0) {
            // 已有库存记录，获取当前数量
            stockId = currentStock[0].id;
            beforeQuantity = parseFloat(currentStock[0].quantity || 0);
            afterQuantity = beforeQuantity + actualQuantity; // 正确计算：当前库存 + 入库数量
            
            console.log(`物料ID ${material_id} 在仓库ID ${location_id} 的现有库存: ${beforeQuantity}, 入库后: ${afterQuantity}`);
            
            // 更新库存
            await connection.execute(
              `UPDATE inventory_stock 
               SET quantity = ? 
               WHERE id = ?`,
              [afterQuantity, stockId]
            );
          } else {
            // 无库存记录，创建新记录
            beforeQuantity = 0;
            afterQuantity = actualQuantity;
            
            console.log(`物料ID ${material_id} 在仓库ID ${location_id} 没有库存记录，创建新记录，入库数量: ${actualQuantity}`);
            
            // 创建新库存记录
            const [insertResult] = await connection.execute(
              `INSERT INTO inventory_stock 
               (material_id, location_id, quantity) 
               VALUES (?, ?, ?)`,
              [material_id, location_id, actualQuantity]
            );
            
            stockId = insertResult.insertId;
          }
          
          // 记录库存交易，确保变动前后数量正确
          await connection.execute(
            `INSERT INTO inventory_transactions (
              material_id, location_id, transaction_type, 
              quantity, unit_id, reference_no, reference_type, 
              operator, remark, before_quantity, after_quantity
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              material_id, 
              location_id,
              'outsourced_inbound',
              actualQuantity,
              item.unit_id,
              existingReceipt[0].receipt_no, 
              'outsourced_processing_receipt',
              existingReceipt[0].operator || 'system',
              `外委加工入库 ${existingReceipt[0].receipt_no}`,
              beforeQuantity,
              afterQuantity
            ]
          );
          
          console.log(`物料ID ${material_id} 库存更新完成，从 ${beforeQuantity} 增加到 ${afterQuantity}`);
        } catch (error) {
          console.error(`处理物料ID ${item.product_id} 的入库库存时出错:`, error);
          throw error;
        }
      }
      
      // 如果所有产品已入库，则将对应的加工单状态更新为已完成
      if (existingReceipt[0].processing_id) {
        await connection.execute(
          `UPDATE outsourced_processings SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [existingReceipt[0].processing_id]
        );
        console.log(`关联加工单 ${existingReceipt[0].processing_no} 已更新为已完成状态`);
      }
    }
    
    await connection.commit();
    
    res.json({
      success: true,
      message: '外委加工入库单状态更新成功'
    });
  } catch (error) {
    await connection.rollback();
    console.error('更新外委加工入库单状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新外委加工入库单状态失败',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getProcessings,
  getProcessing,
  createProcessing,
  updateProcessing,
  deleteProcessing: deleteProcessing,
  updateProcessingStatus,
  getReceipts,
  getReceipt,
  createReceipt,
  updateReceipt,
  updateReceiptStatus
}; 