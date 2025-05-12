const db = require('../config/db');
const { format } = require('date-fns');

/**
 * 追溯管理模型
 */
class Traceability {
  /**
   * 获取追溯记录列表
   * @param {Object} filters - 过滤条件
   * @param {number} page - 页码
   * @param {number} pageSize - 每页记录数
   * @returns {Promise<Object>} - 包含records和total的对象
   */
  static async getTraceabilityRecords(filters = {}, page = 1, pageSize = 10) {
    try {
      // 确保页码和每页记录数是数字类型
      const pageNum = parseInt(page, 10) || 1;
      const pageSizeNum = parseInt(pageSize, 10) || 10;
      const offset = (pageNum - 1) * pageSizeNum;
      
      let query = `
        SELECT 
          t.id, 
          t.product_code AS "productCode", 
          t.product_name AS "productName", 
          t.batch_number AS "batchNumber", 
          t.production_date AS "productionDate", 
          s.name AS supplier, 
          t.status,
          t.remarks,
          (SELECT COUNT(*) FROM traceability_process WHERE traceability_id = t.id) AS "processCount",
          (SELECT COUNT(*) FROM traceability_material WHERE traceability_id = t.id) AS "materialCount",
          (SELECT COUNT(*) FROM traceability_quality WHERE traceability_id = t.id) AS "qualityCount"
        FROM 
          traceability t
        LEFT JOIN 
          suppliers s ON t.supplier_id = s.id
        WHERE 1=1
      `;
      
      const queryParams = [];
      
      // 应用过滤条件
      if (filters.productCode) {
        query += ` AND t.product_code LIKE ?`;
        queryParams.push(`%${filters.productCode}%`);
      }
      
      if (filters.batchNumber) {
        query += ` AND t.batch_number LIKE ?`;
        queryParams.push(`%${filters.batchNumber}%`);
      }
      
      if (filters.startDate) {
        query += ` AND t.production_date >= ?`;
        queryParams.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ` AND t.production_date <= ?`;
        queryParams.push(filters.endDate);
      }
      
      if (filters.status) {
        query += ` AND t.status = ?`;
        queryParams.push(filters.status);
      }
      
      // 获取总记录数
      const countQuery = `
        SELECT COUNT(*) as count FROM (${query}) AS count_query
      `;
      
      // 修正这里的查询方式，正确解构结果
      const countResult = await db.query(countQuery, queryParams);
      const countRows = countResult.rows || [];
      const total = countRows.length > 0 ? parseInt(countRows[0].count || 0) : 0;
      
      // 添加排序和分页 - 这里直接使用数字而不是参数占位符
      query += ` ORDER BY t.production_date DESC LIMIT ${pageSizeNum} OFFSET ${offset}`;
      
      // 修正这里的查询方式，不传递分页参数，因为已经直接拼接到SQL中
      const rowsResult = await db.query(query, queryParams);
      const rows = rowsResult.rows || [];
      
      return {
        records: rows,
        total
      };
    } catch (error) {
      console.error('获取追溯记录列表失败:', error);
      throw error;
    }
  }
  
  /**
   * 根据ID获取追溯记录详情
   * @param {number} id - 追溯记录ID
   * @returns {Promise<Object>} - 追溯记录详情
   */
  static async getTraceabilityById(id) {
    try {
      const query = `
        SELECT 
          t.id, 
          t.product_code AS "productCode", 
          t.product_name AS "productName", 
          t.batch_number AS "batchNumber", 
          t.production_date AS "productionDate", 
          t.supplier_id AS "supplierId",
          s.name AS supplier, 
          t.status,
          t.remarks,
          t.created_at AS "createdAt",
          t.updated_at AS "updatedAt"
        FROM 
          traceability t
        LEFT JOIN 
          suppliers s ON t.supplier_id = s.id
        WHERE 
          t.id = ?
      `;
      
      // 修正查询结果解构
      const result = await db.query(query, [id]);
      const rows = result.rows || [];
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error('获取追溯记录详情失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建追溯记录
   * @param {Object} data - 追溯记录数据
   * @returns {Promise<Object>} - 创建的追溯记录
   */
  static async createTraceability(data) {
    try {
      const query = `
        INSERT INTO traceability(
          product_code, 
          product_name, 
          batch_number, 
          production_date, 
          supplier_id, 
          status, 
          remarks,
          created_at,
          updated_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      const values = [
        data.productCode,
        data.productName,
        data.batchNumber,
        data.productionDate,
        data.supplier,
        data.status || 'in_production',
        data.remarks || ''
      ];
      
      // 修正查询结果解构
      const result = await db.query(query, values);
      const insertId = result.rows && result.rows.insertId ? result.rows.insertId : 0;
      
      return this.getTraceabilityById(insertId);
    } catch (error) {
      console.error('创建追溯记录失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新追溯记录
   * @param {number} id - 追溯记录ID
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>} - 更新后的追溯记录
   */
  static async updateTraceability(id, data) {
    try {
      // 首先检查记录是否存在
      const existing = await this.getTraceabilityById(id);
      if (!existing) {
        throw new Error('追溯记录不存在');
      }
      
      const query = `
        UPDATE traceability SET
          product_code = ?,
          product_name = ?,
          batch_number = ?,
          production_date = ?,
          supplier_id = ?,
          status = ?,
          remarks = ?,
          updated_at = NOW()
        WHERE id = ?
      `;
      
      const values = [
        data.productCode || existing.productCode,
        data.productName || existing.productName,
        data.batchNumber || existing.batchNumber,
        data.productionDate || existing.productionDate,
        data.supplier || existing.supplierId,
        data.status || existing.status,
        data.remarks || existing.remarks,
        id
      ];
      
      // 修正查询结果解构
      await db.query(query, values);
      
      return this.getTraceabilityById(id);
    } catch (error) {
      console.error('更新追溯记录失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除追溯记录
   * @param {number} id - 追溯记录ID
   * @returns {Promise<boolean>} - 是否删除成功
   */
  static async deleteTraceability(id) {
    try {
      // 首先删除关联的工序记录
      await db.query(`DELETE FROM traceability_process WHERE traceability_id = ?`, [id]);
      
      // 删除关联的物料记录
      await db.query(`DELETE FROM traceability_material WHERE traceability_id = ?`, [id]);
      
      // 删除关联的质检记录
      await db.query(`DELETE FROM traceability_quality WHERE traceability_id = ?`, [id]);
      
      // 最后删除追溯记录
      const result = await db.query(`DELETE FROM traceability WHERE id = ?`, [id]);
      const affectedRows = result.rows && result.rows.affectedRows ? result.rows.affectedRows : 0;
      
      return affectedRows > 0;
    } catch (error) {
      console.error('删除追溯记录失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取工序记录
   * @param {number} traceabilityId - 追溯记录ID
   * @returns {Promise<Array>} - 工序记录列表
   */
  static async getProcessRecords(traceabilityId) {
    try {
      // 确保ID是数字
      const id = parseInt(traceabilityId, 10);
      
      const query = `
        SELECT 
          id,
          process_name AS "processName",
          operator,
          start_time AS "startTime",
          end_time AS "endTime",
          duration,
          status,
          remarks,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM 
          traceability_process
        WHERE 
          traceability_id = ${id}
        ORDER BY 
          id
      `;
      
      // 不使用参数化查询，因为ID已经处理安全性
      const result = await db.query(query, []);
      return result.rows || [];
    } catch (error) {
      console.error('获取工序记录失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取物料记录
   * @param {number} traceabilityId - 追溯记录ID
   * @returns {Promise<Array>} - 物料记录列表
   */
  static async getMaterialRecords(traceabilityId) {
    try {
      // 确保ID是数字
      const id = parseInt(traceabilityId, 10);
      
      const query = `
        SELECT 
          tm.id,
          tm.material_code AS "materialCode",
          tm.batch_number AS "batchNumber",
          tm.quantity,
          s.name AS "supplier",
          tm.usage_time AS "usageTime",
          tm.remarks,
          tm.created_at AS "createdAt",
          tm.updated_at AS "updatedAt"
        FROM 
          traceability_material tm
        LEFT JOIN
          suppliers s ON tm.supplier_id = s.id
        WHERE 
          tm.traceability_id = ${id}
        ORDER BY 
          tm.id
      `;
      
      // 不使用参数化查询，因为ID已经处理安全性
      const result = await db.query(query, []);
      return result.rows || [];
    } catch (error) {
      console.error('获取物料记录失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取质检记录
   * @param {number} traceabilityId - 追溯记录ID
   * @returns {Promise<Array>} - 质检记录列表
   */
  static async getQualityRecords(traceabilityId) {
    try {
      // 确保ID是数字
      const id = parseInt(traceabilityId, 10);
      
      const query = `
        SELECT 
          id,
          check_point AS "checkPoint",
          inspector,
          check_time AS "checkTime",
          result,
          remarks,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM 
          traceability_quality
        WHERE 
          traceability_id = ${id}
        ORDER BY 
          id
      `;
      
      // 不使用参数化查询，因为ID已经处理安全性
      const result = await db.query(query, []);
      return result.rows || [];
    } catch (error) {
      console.error('获取质检记录失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取全链路追溯数据 - 从采购入库到成品出库
   * @param {string} type - 追溯类型：'forward'(正向)或'backward'(反向)
   * @param {string} code - 追溯码（物料编码或产品编码）
   * @param {string} batchNumber - 批次号
   * @returns {Promise<Object>} - 追溯链数据
   */
  static async getFullTraceability(type, code, batchNumber) {
    try {
      // 验证参数
      if (!type || !code || !batchNumber) {
        throw new Error('追溯类型、编码和批次号不能为空');
      }
      
      // 根据追溯类型选择不同的查询路径
      if (type === 'forward') {
        // 正向追溯: 从原料到成品
        return await this.getForwardTraceability(code, batchNumber);
      } else if (type === 'backward') {
        // 反向追溯: 从成品到原料
        return await this.getBackwardTraceability(code, batchNumber);
      } else {
        throw new Error('无效的追溯类型，只支持 forward 或 backward');
      }
    } catch (error) {
      console.error('获取全链路追溯数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 正向追溯 - 从原料到成品
   * @param {string} materialCode - 物料编码
   * @param {string} batchNumber - 批次号
   * @returns {Promise<Object>} - 追溯链数据
   */
  static async getForwardTraceability(materialCode, batchNumber) {
    try {
      // 1. 查询采购入库记录
      const purchaseQuery = `
        SELECT 
          pr.id AS receipt_id,
          pr.receipt_no,
          pr.receipt_date,
          pri.material_id,
          m.code AS material_code,
          m.name AS material_name,
          pri.batch_number,
          pri.quantity,
          s.name AS supplier_name,
          pr.created_at
        FROM 
          purchase_receipt_items pri
        JOIN 
          purchase_receipts pr ON pri.receipt_id = pr.id
        JOIN 
          materials m ON pri.material_id = m.id
        JOIN 
          suppliers s ON pr.supplier_id = s.id
        WHERE 
          m.code = '${materialCode}' AND pri.batch_number = '${batchNumber}'
      `;
      
      const purchaseResult = await db.query(purchaseQuery, []);
      const purchaseRecords = purchaseResult.rows || [];
      
      if (purchaseRecords.length === 0) {
        return { success: false, message: '未找到相关采购入库记录' };
      }
      
      // 2. 查询生产记录
      // 查找使用了该物料的生产任务
      const productionQuery = `
        SELECT 
          pt.id AS task_id,
          pt.task_no,
          pt.plan_id,
          pp.plan_no,
          pt.product_id,
          m.code AS product_code,
          m.name AS product_name,
          pt.batch_number AS product_batch,
          pt.planned_quantity,
          pt.completed_quantity,
          pt.status,
          pt.start_time,
          pt.end_time
        FROM 
          production_task_materials ptm
        JOIN 
          production_tasks pt ON ptm.task_id = pt.id
        JOIN 
          production_plans pp ON pt.plan_id = pp.id
        JOIN 
          materials m ON pt.product_id = m.id
        WHERE 
          ptm.material_id = (SELECT id FROM materials WHERE code = '${materialCode}')
          AND ptm.batch_number = '${batchNumber}'
      `;
      
      const productionResult = await db.query(productionQuery, []);
      const productionRecords = productionResult.rows || [];
      
      // 3. 查询质检记录
      let qualityRecords = [];
      if (productionRecords.length > 0) {
        const taskIds = productionRecords.map(record => record.task_id).join(',');
        
        const qualityQuery = `
          SELECT 
            qi.id AS inspection_id,
            qi.inspection_no,
            qi.inspection_type,
            qi.target_id,
            qi.target_type,
            qi.status,
            qi.result,
            qi.inspector,
            qi.inspection_date,
            qi.created_at
          FROM 
            quality_inspections qi
          WHERE 
            qi.target_type = 'production_task' AND qi.target_id IN (${taskIds})
        `;
        
        const qualityResult = await db.query(qualityQuery, []);
        qualityRecords = qualityResult.rows || [];
      }
      
      // 4. 查询成品出库记录
      let outboundRecords = [];
      if (productionRecords.length > 0) {
        const productCodes = productionRecords.map(record => `'${record.product_code}'`).join(',');
        const productBatches = productionRecords.map(record => `'${record.product_batch}'`).join(',');
        
        const outboundQuery = `
          SELECT 
            io.id AS outbound_id,
            io.outbound_no,
            io.outbound_date,
            ioi.material_id,
            m.code AS material_code,
            m.name AS material_name,
            ioi.batch_number,
            ioi.quantity,
            io.created_at
          FROM 
            inventory_outbound_items ioi
          JOIN 
            inventory_outbound io ON ioi.outbound_id = io.id
          JOIN 
            materials m ON ioi.material_id = m.id
          WHERE 
            m.code IN (${productCodes}) AND ioi.batch_number IN (${productBatches})
        `;
        
        const outboundResult = await db.query(outboundQuery, []);
        outboundRecords = outboundResult.rows || [];
      }
      
      // 5. 构建完整的追溯链
      return {
        success: true,
        traceability: {
          material: {
            code: materialCode,
            batch: batchNumber
          },
          purchase: purchaseRecords,
          production: productionRecords,
          quality: qualityRecords,
          outbound: outboundRecords,
          // 构建节点和链接关系，方便前端展示
          nodes: this._buildTraceabilityNodes('forward', purchaseRecords, productionRecords, qualityRecords, outboundRecords),
          links: this._buildTraceabilityLinks('forward', purchaseRecords, productionRecords, qualityRecords, outboundRecords)
        }
      };
    } catch (error) {
      console.error('正向追溯失败:', error);
      throw error;
    }
  }
  
  /**
   * 反向追溯 - 从成品到原料
   * @param {string} productCode - 产品编码
   * @param {string} batchNumber - 批次号
   * @returns {Promise<Object>} - 追溯链数据
   */
  static async getBackwardTraceability(productCode, batchNumber) {
    try {
      // 1. 查询成品信息
      const productQuery = `
        SELECT 
          m.id AS material_id,
          m.code,
          m.name
        FROM 
          materials m
        WHERE 
          m.code = '${productCode}'
      `;
      
      const productResult = await db.query(productQuery, []);
      const productRecords = productResult.rows || [];
      
      if (productRecords.length === 0) {
        return { success: false, message: '未找到产品信息' };
      }
      
      const productId = productRecords[0].material_id;
      
      // 2. 查询生产记录
      const productionQuery = `
        SELECT 
          pt.id AS task_id,
          pt.task_no,
          pt.plan_id,
          pp.plan_no,
          pt.product_id,
          m.code AS product_code,
          m.name AS product_name,
          pt.batch_number AS product_batch,
          pt.planned_quantity,
          pt.completed_quantity,
          pt.status,
          pt.start_time,
          pt.end_time
        FROM 
          production_tasks pt
        JOIN 
          production_plans pp ON pt.plan_id = pp.id
        JOIN 
          materials m ON pt.product_id = m.id
        WHERE 
          pt.product_id = ${productId} AND pt.batch_number = '${batchNumber}'
      `;
      
      const productionResult = await db.query(productionQuery, []);
      const productionRecords = productionResult.rows || [];
      
      if (productionRecords.length === 0) {
        return { success: false, message: '未找到相关生产记录' };
      }
      
      // 3. 查询生产使用的物料
      const taskIds = productionRecords.map(record => record.task_id).join(',');
      
      const materialsQuery = `
        SELECT 
          ptm.id,
          ptm.task_id,
          ptm.material_id,
          m.code AS material_code,
          m.name AS material_name,
          ptm.batch_number,
          ptm.planned_quantity,
          ptm.actual_quantity,
          ptm.created_at
        FROM 
          production_task_materials ptm
        JOIN 
          materials m ON ptm.material_id = m.id
        WHERE 
          ptm.task_id IN (${taskIds})
      `;
      
      const materialsResult = await db.query(materialsQuery, []);
      const materialsRecords = materialsResult.rows || [];
      
      // 4. 查询物料采购记录
      let purchaseRecords = [];
      if (materialsRecords.length > 0) {
        const materialCodes = materialsRecords.map(record => `'${record.material_code}'`).join(',');
        const batchNumbers = materialsRecords.map(record => `'${record.batch_number}'`).join(',');
        
        const purchaseQuery = `
          SELECT 
            pr.id AS receipt_id,
            pr.receipt_no,
            pr.receipt_date,
            pri.material_id,
            m.code AS material_code,
            m.name AS material_name,
            pri.batch_number,
            pri.quantity,
            s.name AS supplier_name,
            pr.created_at
          FROM 
            purchase_receipt_items pri
          JOIN 
            purchase_receipts pr ON pri.receipt_id = pr.id
          JOIN 
            materials m ON pri.material_id = m.id
          JOIN 
            suppliers s ON pr.supplier_id = s.id
          WHERE 
            m.code IN (${materialCodes}) AND pri.batch_number IN (${batchNumbers})
        `;
        
        const purchaseResult = await db.query(purchaseQuery, []);
        purchaseRecords = purchaseResult.rows || [];
      }
      
      // 5. 查询质检记录
      const qualityQuery = `
        SELECT 
          qi.id AS inspection_id,
          qi.inspection_no,
          qi.inspection_type,
          qi.target_id,
          qi.target_type,
          qi.status,
          qi.result,
          qi.inspector,
          qi.inspection_date,
          qi.created_at
        FROM 
          quality_inspections qi
        WHERE 
          qi.target_type = 'production_task' AND qi.target_id IN (${taskIds})
      `;
      
      const qualityResult = await db.query(qualityQuery, []);
      const qualityRecords = qualityResult.rows || [];
      
      // 6. 查询成品出库记录
      const outboundQuery = `
        SELECT 
          io.id AS outbound_id,
          io.outbound_no,
          io.outbound_date,
          ioi.material_id,
          m.code AS material_code,
          m.name AS material_name,
          ioi.batch_number,
          ioi.quantity,
          io.created_at
        FROM 
          inventory_outbound_items ioi
        JOIN 
          inventory_outbound io ON ioi.outbound_id = io.id
        JOIN 
          materials m ON ioi.material_id = m.id
        WHERE 
          m.code = '${productCode}' AND ioi.batch_number = '${batchNumber}'
      `;
      
      const outboundResult = await db.query(outboundQuery, []);
      const outboundRecords = outboundResult.rows || [];
      
      // 7. 构建完整的追溯链
      return {
        success: true,
        traceability: {
          product: {
            code: productCode,
            batch: batchNumber,
            name: productRecords[0].name
          },
          materials: materialsRecords,
          purchase: purchaseRecords,
          production: productionRecords,
          quality: qualityRecords,
          outbound: outboundRecords,
          // 构建节点和链接关系，方便前端展示
          nodes: this._buildTraceabilityNodes('backward', purchaseRecords, productionRecords, qualityRecords, outboundRecords, materialsRecords),
          links: this._buildTraceabilityLinks('backward', purchaseRecords, productionRecords, qualityRecords, outboundRecords, materialsRecords)
        }
      };
    } catch (error) {
      console.error('反向追溯失败:', error);
      throw error;
    }
  }
  
  /**
   * 构建追溯图节点
   * @private
   */
  static _buildTraceabilityNodes(type, purchaseRecords, productionRecords, qualityRecords, outboundRecords, materialsRecords = []) {
    const nodes = [];
    
    if (type === 'forward') {
      // 添加原料节点
      if (purchaseRecords.length > 0) {
        const material = purchaseRecords[0];
        nodes.push({
          id: `material_${material.material_code}_${material.batch_number}`,
          name: `${material.material_name} (${material.batch_number})`,
          category: 'material',
          itemStyle: { color: '#91cc75' }
        });
      }
      
      // 添加采购入库节点
      purchaseRecords.forEach(receipt => {
        nodes.push({
          id: `purchase_${receipt.receipt_id}`,
          name: `入库单: ${receipt.receipt_no}`,
          category: 'purchase',
          itemStyle: { color: '#fac858' }
        });
      });
      
      // 添加生产节点
      productionRecords.forEach(task => {
        nodes.push({
          id: `production_${task.task_id}`,
          name: `生产任务: ${task.task_no}`,
          category: 'production',
          itemStyle: { color: '#5470c6' }
        });
      });
      
      // 添加产品节点
      productionRecords.forEach(task => {
        nodes.push({
          id: `product_${task.product_code}_${task.product_batch}`,
          name: `${task.product_name} (${task.product_batch})`,
          category: 'product', 
          itemStyle: { color: '#ee6666' }
        });
      });
      
      // 添加质检节点
      qualityRecords.forEach(inspection => {
        nodes.push({
          id: `quality_${inspection.inspection_id}`,
          name: `质检: ${inspection.inspection_no}`,
          category: 'quality',
          itemStyle: { color: '#73c0de' }
        });
      });
      
      // 添加出库节点
      outboundRecords.forEach(outbound => {
        nodes.push({
          id: `outbound_${outbound.outbound_id}`,
          name: `出库单: ${outbound.outbound_no}`,
          category: 'outbound',
          itemStyle: { color: '#3ba272' }
        });
      });
    } else {
      // 反向追溯节点
      
      // 添加出库节点
      outboundRecords.forEach(outbound => {
        nodes.push({
          id: `outbound_${outbound.outbound_id}`,
          name: `出库单: ${outbound.outbound_no}`,
          category: 'outbound',
          itemStyle: { color: '#3ba272' }
        });
      });
      
      // 添加产品节点
      if (productionRecords.length > 0) {
        const product = productionRecords[0];
        nodes.push({
          id: `product_${product.product_code}_${product.product_batch}`,
          name: `${product.product_name} (${product.product_batch})`,
          category: 'product',
          itemStyle: { color: '#ee6666' }
        });
      }
      
      // 添加生产节点
      productionRecords.forEach(task => {
        nodes.push({
          id: `production_${task.task_id}`,
          name: `生产任务: ${task.task_no}`,
          category: 'production',
          itemStyle: { color: '#5470c6' }
        });
      });
      
      // 添加质检节点
      qualityRecords.forEach(inspection => {
        nodes.push({
          id: `quality_${inspection.inspection_id}`,
          name: `质检: ${inspection.inspection_no}`,
          category: 'quality',
          itemStyle: { color: '#73c0de' }
        });
      });
      
      // 添加原料节点
      materialsRecords.forEach(material => {
        nodes.push({
          id: `material_${material.material_code}_${material.batch_number}`,
          name: `${material.material_name} (${material.batch_number})`,
          category: 'material',
          itemStyle: { color: '#91cc75' }
        });
      });
      
      // 添加采购入库节点
      purchaseRecords.forEach(receipt => {
        nodes.push({
          id: `purchase_${receipt.receipt_id}`,
          name: `入库单: ${receipt.receipt_no}`,
          category: 'purchase',
          itemStyle: { color: '#fac858' }
        });
      });
    }
    
    return nodes;
  }
  
  /**
   * 构建追溯图连接关系
   * @private
   */
  static _buildTraceabilityLinks(type, purchaseRecords, productionRecords, qualityRecords, outboundRecords, materialsRecords = []) {
    const links = [];
    
    if (type === 'forward') {
      // 正向追溯链接
      
      // 原料到采购入库的链接
      if (purchaseRecords.length > 0) {
        const material = purchaseRecords[0];
        purchaseRecords.forEach(receipt => {
          links.push({
            source: `material_${material.material_code}_${material.batch_number}`,
            target: `purchase_${receipt.receipt_id}`
          });
        });
      }
      
      // 采购入库到生产任务的链接
      purchaseRecords.forEach(receipt => {
        productionRecords.forEach(task => {
          links.push({
            source: `purchase_${receipt.receipt_id}`,
            target: `production_${task.task_id}`
          });
        });
      });
      
      // 生产任务到产品的链接
      productionRecords.forEach(task => {
        links.push({
          source: `production_${task.task_id}`,
          target: `product_${task.product_code}_${task.product_batch}`
        });
      });
      
      // 质检到生产任务的链接
      qualityRecords.forEach(inspection => {
        const taskId = inspection.target_id;
        links.push({
          source: `quality_${inspection.inspection_id}`,
          target: `production_${taskId}`
        });
      });
      
      // 产品到出库的链接
      productionRecords.forEach(task => {
        outboundRecords.forEach(outbound => {
          if (outbound.material_code === task.product_code && outbound.batch_number === task.product_batch) {
            links.push({
              source: `product_${task.product_code}_${task.product_batch}`,
              target: `outbound_${outbound.outbound_id}`
            });
          }
        });
      });
    } else {
      // 反向追溯链接
      
      // 出库到产品的链接
      if (productionRecords.length > 0 && outboundRecords.length > 0) {
        const product = productionRecords[0];
        outboundRecords.forEach(outbound => {
          links.push({
            source: `outbound_${outbound.outbound_id}`,
            target: `product_${product.product_code}_${product.product_batch}`
          });
        });
      }
      
      // 产品到生产任务的链接
      if (productionRecords.length > 0) {
        const product = productionRecords[0];
        productionRecords.forEach(task => {
          links.push({
            source: `product_${product.product_code}_${product.product_batch}`,
            target: `production_${task.task_id}`
          });
        });
      }
      
      // 质检到生产任务的链接
      qualityRecords.forEach(inspection => {
        const taskId = inspection.target_id;
        links.push({
          source: `quality_${inspection.inspection_id}`,
          target: `production_${taskId}`
        });
      });
      
      // 生产任务到原料的链接
      productionRecords.forEach(task => {
        materialsRecords.forEach(material => {
          if (material.task_id === task.task_id) {
            links.push({
              source: `production_${task.task_id}`,
              target: `material_${material.material_code}_${material.batch_number}`
            });
          }
        });
      });
      
      // 原料到采购入库的链接
      materialsRecords.forEach(material => {
        purchaseRecords.forEach(receipt => {
          if (receipt.material_code === material.material_code && receipt.batch_number === material.batch_number) {
            links.push({
              source: `material_${material.material_code}_${material.batch_number}`,
              target: `purchase_${receipt.receipt_id}`
            });
          }
        });
      });
    }
    
    return links;
  }
}

module.exports = Traceability; 