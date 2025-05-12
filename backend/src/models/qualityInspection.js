const db = require('../config/db');

/**
 * 质量检验模型类
 */
class QualityInspection {
  /**
   * 获取所有检验单列表
   * @param {string} type 检验类型: incoming, process, final
   * @param {object} filters 筛选条件
   * @param {number} page 页码
   * @param {number} pageSize 每页条数
   * @returns {Promise<{rows: Array, total: number}>} 检验单列表和总数
   */
  static async getInspections(type, filters = {}, page = 1, pageSize = 20) {
    try {
      console.log('getInspections接收到的参数:', { type, filters, page, pageSize });
      
      const limit = parseInt(pageSize, 10) || 20;
      const offset = (parseInt(page, 10) - 1) * limit || 0;
      
      // 根据传入的额外参数决定是否加载供应商和参考数据
      const includeSupplier = filters.include_supplier === true;
      const includeReference = filters.include_reference === true;
      
      console.log('SQL查询选项:', { 
        includeSupplier, 
        includeReference,
        withDetails: filters.with_details
      });
      
      // 构建基础查询
      let query = `
        SELECT
          qi.*,
          CASE
            WHEN qi.inspection_type = 'incoming' THEN m.name
            WHEN qi.inspection_type = 'final' AND task_m.name IS NOT NULL THEN task_m.name
            WHEN qi.product_name IS NOT NULL AND qi.product_name != '' THEN qi.product_name
            ELSE p.name
          END AS item_name,
          CASE
            WHEN qi.inspection_type = 'incoming' THEN m.specs
            WHEN qi.inspection_type = 'final' AND task_m.specs IS NOT NULL THEN task_m.specs
            WHEN qi.product_code IS NOT NULL AND qi.product_code != '' THEN qi.product_code
            ELSE p.code
          END AS item_code
      `;
      
      // 根据选项添加额外字段
      if (includeSupplier) {
        query += `,
          s.id as supplier_id,
          s.name as supplier_name,
          s.contact_person as supplier_contact
        `;
      }
      
      query += `
        FROM quality_inspections qi
        LEFT JOIN materials m ON qi.inspection_type = 'incoming' AND qi.material_id = m.id
        LEFT JOIN products p ON qi.inspection_type IN ('process', 'final') AND qi.product_id = p.id
        LEFT JOIN production_tasks pt ON qi.inspection_type = 'final' AND qi.reference_id = pt.id
        LEFT JOIN materials task_m ON pt.product_id = task_m.id
      `;
      
      // 根据选项添加供应商连接
      if (includeSupplier) {
        query += `
          LEFT JOIN purchase_orders po ON qi.inspection_type = 'incoming' AND qi.reference_no = po.order_no
          LEFT JOIN suppliers s ON po.supplier_id = s.id
        `;
      }
      
      query += `WHERE qi.inspection_type = ?`;
      
      const sqlParams = [type];
      
      // 添加筛选条件
      if (filters.keyword) {
        const keyword = `%${filters.keyword}%`;
        query += ` AND (qi.inspection_no LIKE ? OR qi.reference_no LIKE ? OR qi.batch_no LIKE ?)`;
        sqlParams.push(keyword, keyword, keyword);
      }
      
      if (filters.status) {
        query += ` AND qi.status = ?`;
        sqlParams.push(filters.status);
      }
      
      if (filters.startDate && filters.endDate) {
        query += ` AND qi.planned_date BETWEEN ? AND ?`;
        sqlParams.push(filters.startDate, filters.endDate);
      }

      // 获取总数的查询
      const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
      
      // 直接使用connection执行查询
      const connection = await db.pool.getConnection();
      
      try {
        // 执行总数查询
        const [countRows] = await connection.query(countQuery, sqlParams);
        const total = parseInt(countRows[0].total);
        
        // 添加分页
        query += ' ORDER BY qi.created_at DESC LIMIT ? OFFSET ?';
        sqlParams.push(limit, offset);
  
        // 执行数据查询
        console.log('SQL Query:', query);
        console.log('SQL Params:', sqlParams);
        
        const [rows] = await connection.query(query, sqlParams);
        
        return {
          rows,
          total
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('获取检验单列表失败:', error);
      throw error;
    }
  }
  
  /**
   * 根据ID获取检验单详情
   * @param {number} id 检验单ID
   * @param {object} options 选项
   * @returns {Promise<object>} 检验单详情
   */
  static async getInspectionById(id, options = {}) {
    try {
      if (!id) return null;
      
      const inspectionId = parseInt(id, 10);
      if (isNaN(inspectionId)) return null;
      
      // 默认加载供应商信息
      const includeSupplier = options.include_supplier !== false;
      
      const connection = await db.pool.getConnection();
      try {
        // 构建基础查询
        let query = `
          SELECT 
            qi.*,
            CASE 
              WHEN qi.inspection_type = 'incoming' THEN m.name
              WHEN qi.inspection_type = 'final' AND task_m.name IS NOT NULL THEN task_m.name
              WHEN qi.product_name IS NOT NULL AND qi.product_name != '' THEN qi.product_name
              ELSE p.name
            END AS item_name,
            CASE
              WHEN qi.inspection_type = 'incoming' THEN m.specs
              WHEN qi.inspection_type = 'final' AND task_m.specs IS NOT NULL THEN task_m.specs
              WHEN qi.product_code IS NOT NULL AND qi.product_code != '' THEN qi.product_code
              ELSE p.code
            END AS item_code
        `;
        
        // 根据选项添加额外字段
        if (includeSupplier) {
          query += `,
            s.id as supplier_id,
            s.name as supplier_name,
            s.contact_person as supplier_contact
          `;
        }
        
        query += `
          FROM quality_inspections qi
          LEFT JOIN materials m ON qi.inspection_type = 'incoming' AND qi.material_id = m.id
          LEFT JOIN products p ON qi.inspection_type IN ('process', 'final') AND qi.product_id = p.id
          LEFT JOIN production_tasks pt ON qi.inspection_type = 'final' AND qi.reference_id = pt.id
          LEFT JOIN materials task_m ON pt.product_id = task_m.id
        `;
        
        // 根据选项添加供应商连接
        if (includeSupplier) {
          query += `
            LEFT JOIN purchase_orders po ON qi.inspection_type = 'incoming' AND qi.reference_no = po.order_no
            LEFT JOIN suppliers s ON po.supplier_id = s.id
          `;
        }
        
        query += `WHERE qi.id = ?`;
        
        // 执行查询
        const [rows] = await connection.query(query, [inspectionId]);
        if (rows.length === 0) {
          return null;
        }
        
        // 获取检验项
        const itemsQuery = `
          SELECT * FROM quality_inspection_items 
          WHERE inspection_id = ? 
          ORDER BY id
        `;
        const [items] = await connection.query(itemsQuery, [inspectionId]);
        
        return {
          ...rows[0],
          items
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('获取检验单详情失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建质量检验单
   * @param {object} inspection 检验单数据
   * @returns {Promise<object>} 创建结果
   */
  static async createInspection(inspection) {
    try {
      const connection = await db.pool.getConnection();
      
      try {
        // 生成检验单号
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2); // 获取年份后两位
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        
        // 根据检验类型生成不同的前缀
        let prefix = '';
        if (inspection.inspection_type === 'incoming') {
          prefix = 'WL'; // "来料"拼音首字母
        } else if (inspection.inspection_type === 'process') {
          prefix = 'GC'; // "过程"拼音首字母
        } else if (inspection.inspection_type === 'final') {
          prefix = 'CP'; // "成品"拼音首字母
        } else {
          prefix = inspection.inspection_type.toUpperCase();
        }
        
        // 获取当天的序号
        const [rows] = await connection.query(
          `SELECT COUNT(*) as count FROM quality_inspections 
           WHERE inspection_no LIKE ? AND created_at >= CURRENT_DATE()`,
          [`${prefix}${dateStr}%`]
        );
        
        const sequence = String(rows[0].count + 1).padStart(3, '0');
        const inspectionNo = `${prefix}${dateStr}${sequence}`;
        
        // 创建检验单
        const [result] = await connection.query(`
          INSERT INTO quality_inspections (
            inspection_no, inspection_type, reference_id, reference_no,
            material_id, product_id, product_name, product_code,
            batch_no, quantity, unit, standard_type, standard_no,
            planned_date, note, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          inspectionNo,
          inspection.inspection_type,
          inspection.reference_id,
          inspection.reference_no,
          inspection.material_id || null,
          inspection.product_id || null,
          inspection.product_name || null,
          inspection.product_code || null,
          inspection.batch_no,
          inspection.quantity,
          inspection.unit,
          inspection.standard_type || null,
          inspection.standard_no || null,
          inspection.planned_date,
          inspection.note,
          inspection.status || 'pending'
        ]);
        
        console.log('创建检验单SQL参数:', [
          inspectionNo,
          inspection.inspection_type,
          inspection.reference_id,
          inspection.reference_no,
          inspection.material_id || null,
          inspection.product_id || null,
          inspection.product_name || null,
          inspection.product_code || null,
          inspection.batch_no,
          inspection.quantity,
          inspection.unit,
          inspection.standard_type || null,
          inspection.standard_no || null,
          inspection.planned_date,
          inspection.note,
          inspection.status || 'pending'
        ]);
        
        const inspectionId = result.insertId;
        
        return {
          id: inspectionId,
          inspection_no: inspectionNo,
          ...inspection
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('创建检验单失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新检验单信息
   * @param {number} id 检验单ID
   * @param {object} data 更新数据
   * @returns {Promise<object>} 更新后的检验单
   */
  static async updateInspection(id, data) {
    let connection;
    try {
      console.log('开始更新检验单，ID:', id);
      console.log('更新数据:', JSON.stringify(data));
      
      connection = await db.pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // 获取当前检验单的信息
        const [currentInspection] = await connection.query(
          'SELECT * FROM quality_inspections WHERE id = ?',
          [id]
        );
        
        if (currentInspection.length === 0) {
          throw new Error('检验单不存在');
        }
        
        const inspection = currentInspection[0];
        
        // 更新检验单基本信息
        const updateFields = [];
        const updateValues = [];
        
        // 处理字段映射，将inspector映射为inspector_name
        const fieldMapping = {
          'inspector': 'inspector_name'
        };
        
        for (const [key, value] of Object.entries(data)) {
          if (key !== 'items' && value !== undefined) {
            // 使用映射后的字段名
            const fieldName = fieldMapping[key] || key;
            updateFields.push(`${fieldName} = ?`);
            updateValues.push(value);
          }
        }
        
        if (updateFields.length > 0) {
          updateValues.push(id);
          console.log('更新检验单基本信息:', `UPDATE quality_inspections SET ${updateFields.join(', ')} WHERE id = ?`);
          console.log('更新参数:', updateValues);
          
          await connection.execute(
            `UPDATE quality_inspections 
             SET ${updateFields.join(', ')} 
             WHERE id = ?`,
            updateValues
          );
          console.log('检验单基本信息更新成功');
        }
        
        // 如果有检验项，更新检验项
        if (data.items && data.items.length > 0) {
          console.log('更新检验项，数量:', data.items.length);
          
          // 先删除旧的检验项
          console.log('删除旧的检验项');
          await connection.execute(
            'DELETE FROM quality_inspection_items WHERE inspection_id = ?',
            [id]
          );
          
          // 插入新的检验项
          for (const item of data.items) {
            console.log('插入检验项:', JSON.stringify(item));
            
            // 处理is_critical字段，确保它是0或1
            const isCritical = item.is_critical === true || item.is_critical === 1 ? 1 : 0;
            
            // 处理remarks和remark字段
            const remark = item.remarks || item.remark || null;
            
            // 确保type字段值有效，只接受预定义的类型
            const validTypes = ['visual', 'dimension', 'quantity', 'function', 'weight', 'performance', 'safety', 'electrical', 'other'];
            let itemType = 'other'; // 默认为other类型
            
            // 如果type有值并且在有效类型列表中，则使用该值，否则使用other
            if (item.type && validTypes.includes(item.type)) {
              itemType = item.type;
            } 
            
            console.log('更新检验项类型处理后:', {
              原始值: item.type,
              处理后: itemType
            });
            
            await connection.execute(
              `INSERT INTO quality_inspection_items (
                inspection_id, item_name, standard, type, is_critical, result, actual_value, remark
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                item.item_name,
                item.standard,
                itemType,
                isCritical,
                item.result || null,
                item.actual_value || null,
                remark
              ]
            );
          }
          
          console.log('所有检验项更新成功');
        }
        
        // 如果是成品检验，并且状态从'pending'变为'qualified'，更新相关生产计划状态为"入库中"
        if (
          inspection.inspection_type === 'final' && 
          inspection.status !== 'qualified' && 
          data.status === 'qualified' && 
          inspection.reference_type === 'production_task'
        ) {
          try {
            // 查找生产任务
            const [taskResult] = await connection.query(
              'SELECT plan_id FROM production_tasks WHERE id = ?',
              [inspection.reference_id]
            );
            
            if (taskResult.length > 0 && taskResult[0].plan_id) {
              const planId = taskResult[0].plan_id;
              console.log(`成品检验合格，尝试将关联的生产计划ID=${planId}状态更新为"入库中"`);
              
              // 更新生产计划状态为"入库中"
              await connection.execute(
                'UPDATE production_plans SET status = "warehousing" WHERE id = ? AND status = "inspection"',
                [planId]
              );
              
              console.log(`生产计划ID=${planId}状态已更新为"入库中"`);
            }
          } catch (error) {
            console.error('更新生产计划状态失败:', error);
            // 继续处理，不要因为更新生产计划状态失败而回滚整个事务
          }
        }
        
        await connection.commit();
        console.log('提交事务成功');
        
        return { id, ...data };
      } catch (error) {
        console.error('更新检验单过程中出错:', error);
        if (connection) {
          await connection.rollback();
          console.log('事务已回滚');
        }
        throw error;
      }
    } catch (error) {
      console.error('更新检验单失败:', error.message);
      console.error('错误堆栈:', error.stack);
      throw error;
    } finally {
      if (connection) {
        connection.release();
        console.log('数据库连接已释放');
      }
    }
  }
  
  /**
   * 删除检验单
   * @param {number} id 检验单ID
   * @returns {Promise<boolean>} 删除结果
   */
  static async deleteInspection(id) {
    try {
      const connection = await db.pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // 删除检验项
        await connection.execute(
          'DELETE FROM quality_inspection_items WHERE inspection_id = ?',
          [id]
        );
        
        // 删除检验单
        await connection.execute(
          'DELETE FROM quality_inspections WHERE id = ?',
          [id]
        );
        
        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('删除检验单失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取检验相关的引用数据（物料、产品、工序等）
   * @param {string} type 检验类型
   * @returns {Promise<object>} 相关数据
   */
  static async getReferenceData(type) {
    let data = {};
    
    if (type === 'incoming') {
      // 获取采购单
      const [purchaseOrders] = await db.query(`
        SELECT po.id, po.order_no, po.supplier_id, s.name as supplier_name 
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.status = 'approved'
        ORDER BY po.created_at DESC
        LIMIT 100
      `);
      
      data.purchaseOrders = purchaseOrders;
      
      // 获取物料
      if (purchaseOrders.length > 0) {
        const supplierIds = [...new Set(purchaseOrders.map(po => po.supplier_id))];
        const [materials] = await db.query(`
          SELECT m.id, m.name, m.code, m.unit 
          FROM materials m
          JOIN supplier_materials sm ON m.id = sm.material_id
          WHERE sm.supplier_id IN (?)
        `, [supplierIds]);
        
        data.materials = materials;
      }
    } else {
      // 获取生产工单
      const [productionOrders] = await db.query(`
        SELECT po.id, po.order_no, po.product_id, p.name as product_name, p.unit 
        FROM production_orders po
        JOIN products p ON po.product_id = p.id
        WHERE po.status IN ('in_progress', 'pending')
        ORDER BY po.created_at DESC
        LIMIT 100
      `);
      
      data.productionOrders = productionOrders;
      
      if (type === 'process' && productionOrders.length > 0) {
        // 获取工序
        const productIds = [...new Set(productionOrders.map(po => po.product_id))];
        const [processes] = await db.query(`
          SELECT pp.*, p.name as process_name
          FROM product_processes pp
          JOIN processes p ON pp.process_id = p.id
          WHERE pp.product_id IN (?)
          ORDER BY pp.sequence
        `, [productIds]);
        
        data.processes = processes;
      }
    }
    
    return data;
  }
  
  /**
   * 获取检验标准数据
   * @param {string} type 检验类型
   * @param {number} targetId 目标ID (物料ID或产品ID)
   * @returns {Promise<Array>} 标准数据
   */
  static async getStandards(type, targetId) {
    const targetType = type === 'incoming' ? 'material' : 'product';
    
    const [standards] = await db.query(`
      SELECT s.*, COUNT(si.id) as item_count
      FROM quality_standards s
      LEFT JOIN quality_standard_items si ON s.id = si.standard_id
      WHERE s.target_type = ? AND s.target_id = ? AND s.is_active = 1
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `, [targetType, targetId]);
    
    // 获取标准项
    if (standards.length > 0) {
      const standardIds = standards.map(s => s.id);
      const [items] = await db.query(`
        SELECT * FROM quality_standard_items
        WHERE standard_id IN (?)
        ORDER BY sequence
      `, [standardIds]);
      
      // 组装数据
      standards.forEach(standard => {
        standard.items = items.filter(item => item.standard_id === standard.id);
      });
    }
    
    return standards;
  }
}

module.exports = QualityInspection; 