const QualityInspection = require('../models/qualityInspection');
const QualityStandard = require('../models/qualityStandard');
const Traceability = require('../models/traceability');
const db = require('../config/db');

/**
 * 质量管理控制器
 */
const qualityController = {
  /**
   * 获取来料检验列表
   */
  async getIncomingInspections(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        pageSize = 20, 
        keyword, 
        status, 
        startDate, 
        endDate,
        include_supplier,
        include_reference, 
        with_details
      } = req.query;
      
      // 记录请求参数，便于调试
      console.log('收到请求参数:', req.query);
      
      const filters = {
        keyword,
        status,
        startDate,
        endDate,
        include_supplier: include_supplier === 'true',
        include_reference: include_reference === 'true',
        with_details: with_details === 'true'
      };
      
      // 优先使用limit，兼容pageSize参数
      const actualPageSize = db.ensureNumber(limit || pageSize, 20);
      const actualPage = db.ensureNumber(page, 1);
      
      // 确保数字类型参数有效
      if (actualPage < 1 || actualPageSize < 1 || actualPageSize > 1000) {
        return res.status(400).json({
          success: false,
          message: '页码或每页条数参数无效'
        });
      }

      console.log('传递给getInspections的filters:', filters);
      const result = await QualityInspection.getInspections('incoming', filters, actualPage, actualPageSize);
      
      res.json({
        success: true,
        data: result.rows,
        total: result.total,
        page: actualPage,
        pageSize: actualPageSize
      });
    } catch (error) {
      console.error('获取来料检验列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取来料检验列表失败',
        error: error.message
      });
    }
  },
  
  /**
   * 获取过程检验列表
   */
  async getProcessInspections(req, res) {
    try {
      const { page = 1, limit = 20, pageSize = 20, keyword, status, startDate, endDate } = req.query;
      
      const filters = {
        keyword,
        status,
        startDate,
        endDate
      };
      
      // 优先使用limit，兼容pageSize参数
      const actualPageSize = parseInt(limit || pageSize, 10);
      const actualPage = parseInt(page, 10);
      
      // 确保数字类型参数有效
      if (actualPage < 1 || actualPageSize < 1 || actualPageSize > 1000) {
        return res.status(400).json({
          success: false,
          message: '页码或每页条数参数无效'
        });
      }
      
      const result = await QualityInspection.getInspections('process', filters, actualPage, actualPageSize);
      
      res.json({
        success: true,
        data: result.rows,
        total: result.total,
        page: actualPage,
        pageSize: actualPageSize
      });
    } catch (error) {
      console.error('获取过程检验列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取过程检验列表失败',
        error: error.message
      });
    }
  },
  
  /**
   * 获取成品检验列表
   */
  async getFinalInspections(req, res) {
    try {
      const { page = 1, limit = 20, pageSize = 20, keyword, status, startDate, endDate } = req.query;
      
      const filters = {
        keyword,
        status,
        startDate,
        endDate
      };
      
      // 优先使用limit，兼容pageSize参数
      const actualPageSize = parseInt(limit || pageSize, 10);
      const actualPage = parseInt(page, 10);
      
      // 确保数字类型参数有效
      if (actualPage < 1 || actualPageSize < 1 || actualPageSize > 1000) {
        return res.status(400).json({
          success: false,
          message: '页码或每页条数参数无效'
        });
      }
      
      // 使用try-catch包裹数据库操作
      try {
        const connection = await db.pool.getConnection();
        try {
          // 构建基础查询
          let query = `
            SELECT
              qi.*,
              CASE
                WHEN qi.inspection_type = 'incoming' THEN m.name
                WHEN qi.product_name IS NOT NULL AND qi.product_name != '' THEN qi.product_name
                ELSE p.name
              END AS item_name,
              CASE
                WHEN qi.inspection_type = 'incoming' THEN m.specs
                WHEN qi.product_code IS NOT NULL AND qi.product_code != '' THEN qi.product_code
                ELSE p.code
              END AS item_code
            FROM quality_inspections qi
            LEFT JOIN materials m ON qi.inspection_type = 'incoming' AND qi.material_id = m.id
            LEFT JOIN products p ON qi.inspection_type IN ('process', 'final') AND qi.product_id = p.id
            WHERE qi.inspection_type = ?
          `;
          const params = ['final'];
    
          // 添加过滤条件
          if (keyword) {
            query += ` AND (
              qi.inspection_no LIKE ? OR 
              qi.reference_no LIKE ? OR 
              qi.product_name LIKE ? OR
              qi.batch_no LIKE ?
            )`;
            const keywordParam = `%${keyword}%`;
            params.push(keywordParam, keywordParam, keywordParam, keywordParam);
          }
    
          if (status) {
            query += ` AND qi.status = ?`;
            params.push(status);
          }
    
          if (startDate) {
            query += ` AND DATE(qi.planned_date) >= ?`;
            params.push(startDate);
          }
    
          if (endDate) {
            query += ` AND DATE(qi.planned_date) <= ?`;
            params.push(endDate);
          }
    
          // 获取总记录数
          const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
          const [totalResult] = await connection.query(countQuery, params);
          const total = totalResult[0].total;
    
          // 添加排序和分页
          query += ` ORDER BY qi.created_at DESC LIMIT ? OFFSET ?`;
          params.push(parseInt(actualPageSize), (actualPage - 1) * actualPageSize);
    
          console.log('最终SQL查询:', query);
          console.log('SQL参数:', params);
    
          // 执行查询
          const [rows] = await connection.query(query, params);
    
          res.json({
            success: true,
            data: rows,
            total,
            page: actualPage,
            pageSize: actualPageSize
          });
        } finally {
          if (connection) connection.release();
        }
      } catch (dbError) {
        console.error('数据库操作失败:', dbError);
        throw new Error(`数据库操作失败: ${dbError.message}`);
      }
    } catch (error) {
      console.error('获取成品检验列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取成品检验列表失败',
        error: error.message
      });
    }
  },
  
  /**
   * 获取检验单详情
   */
  async getInspectionById(req, res) {
    try {
      const { id } = req.params;
      const { include_supplier, include_reference, with_details } = req.query;
      
      // 记录请求参数，便于调试
      console.log('获取检验单详情，参数:', { id, ...req.query });
      
      // 构建选项对象
      const options = {
        include_supplier: include_supplier === 'true',
        include_reference: include_reference === 'true',
        with_details: with_details === 'true'
      };
      
      const inspection = await QualityInspection.getInspectionById(parseInt(id), options);
      
      if (!inspection) {
        return res.status(404).json({
          success: false,
          message: '检验单不存在'
        });
      }
      
      res.json({
        success: true,
        data: inspection
      });
    } catch (error) {
      console.error('获取检验单详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取检验单详情失败',
        error: error.message
      });
    }
  },
  
  /**
   * 创建检验单
   */
  async createInspection(req, res) {
    try {
      const inspection = req.body;
      
      // 验证必要字段
      if (!inspection.inspection_type) {
        return res.status(400).json({
          success: false,
          message: '检验类型不能为空'
        });
      }
      
      if (!inspection.batch_no || !inspection.quantity || !inspection.unit || !inspection.planned_date) {
        return res.status(400).json({
          success: false,
          message: '批次号、检验数量、单位和计划检验日期不能为空'
        });
      }
      
      const result = await QualityInspection.createInspection(inspection);
      
      res.json({
        success: true,
        message: '检验单创建成功',
        data: result
      });
    } catch (error) {
      console.error('创建检验单失败:', error);
      res.status(500).json({
        success: false,
        message: '创建检验单失败',
        error: error.message
      });
    }
  },
  
  /**
   * 更新检验单
   */
  async updateInspection(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      // 检查检验单是否存在
      const inspection = await QualityInspection.getInspectionById(parseInt(id));
      if (!inspection) {
        return res.status(404).json({
          success: false,
          message: '检验单不存在'
        });
      }
      
      // 如果状态从待检验变为其他状态，设置实际检验日期
      if (inspection.status === 'pending' && data.status && data.status !== 'pending' && !data.actual_date) {
        data.actual_date = new Date();
      }
      
      const result = await QualityInspection.updateInspection(parseInt(id), data);
      
      res.json({
        success: true,
        message: '检验单更新成功',
        data: result
      });
    } catch (error) {
      console.error('更新检验单失败:', error);
      res.status(500).json({
        success: false,
        message: '更新检验单失败',
        error: error.message
      });
    }
  },
  
  /**
   * 删除检验单
   */
  async deleteInspection(req, res) {
    try {
      const { id } = req.params;
      
      // 检查检验单是否存在
      const inspection = await QualityInspection.getInspectionById(parseInt(id));
      if (!inspection) {
        return res.status(404).json({
          success: false,
          message: '检验单不存在'
        });
      }
      
      // 只有待检验状态的检验单才能删除
      if (inspection.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '只有待检验状态的检验单才能删除'
        });
      }
      
      const result = await QualityInspection.deleteInspection(parseInt(id));
      
      res.json({
        success: true,
        message: '检验单删除成功',
        data: result
      });
    } catch (error) {
      console.error('删除检验单失败:', error);
      res.status(500).json({
        success: false,
        message: '删除检验单失败',
        error: error.message
      });
    }
  },
  
  /**
   * 获取检验相关的引用数据
   */
  async getReferenceData(req, res) {
    try {
      const { type } = req.params;
      
      if (!['incoming', 'process', 'final'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: '检验类型参数错误'
        });
      }
      
      const data = await QualityInspection.getReferenceData(type);
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('获取引用数据失败:', error);
      res.status(500).json({
        success: false,
        message: '获取引用数据失败',
        error: error.message
      });
    }
  },
  
  /**
   * 获取检验标准
   */
  async getStandards(req, res) {
    try {
      const { type, targetId } = req.params;
      
      if (!['incoming', 'process', 'final'].includes(type) || !targetId) {
        return res.status(400).json({
          success: false,
          message: '参数错误'
        });
      }
      
      const standards = await QualityInspection.getStandards(type, parseInt(targetId));
      
      res.json({
        success: true,
        data: standards
      });
    } catch (error) {
      console.error('获取检验标准失败:', error);
      res.status(500).json({
        success: false,
        message: '获取检验标准失败',
        error: error.message
      });
    }
  },
  
  // 质量标准相关接口
  
  /**
   * 获取质量标准列表
   */
  async getAllStandards(req, res) {
    try {
      const { page = 1, pageSize = 20, keyword, targetType, standardType, isActive } = req.query;
      
      const filters = {
        keyword,
        targetType,
        standardType,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined
      };
      
      const result = await QualityStandard.getStandards(filters, parseInt(page), parseInt(pageSize));
      
      res.json({
        success: true,
        data: result.rows,
        total: result.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
    } catch (error) {
      console.error('获取质量标准列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取质量标准列表失败',
        error: error.message
      });
    }
  },
  
  /**
   * 获取质量标准详情
   */
  async getStandardById(req, res) {
    try {
      const { id } = req.params;
      
      const standard = await QualityStandard.getStandardById(parseInt(id));
      
      if (!standard) {
        return res.status(404).json({
          success: false,
          message: '质量标准不存在'
        });
      }
      
      res.json({
        success: true,
        data: standard
      });
    } catch (error) {
      console.error('获取质量标准详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取质量标准详情失败',
        error: error.message
      });
    }
  },
  
  /**
   * 创建质量标准
   */
  async createStandard(req, res) {
    try {
      const standard = req.body;
      
      // 验证必要字段
      if (!standard.standard_no || !standard.standard_name || !standard.standard_type || 
          !standard.target_type || !standard.target_id || !standard.version) {
        return res.status(400).json({
          success: false,
          message: '标准编号、标准名称、标准类型、适用对象类型、适用对象ID和版本号不能为空'
        });
      }
      
      const result = await QualityStandard.createStandard(standard);
      
      res.json({
        success: true,
        message: '质量标准创建成功',
        data: result
      });
    } catch (error) {
      console.error('创建质量标准失败:', error);
      res.status(500).json({
        success: false,
        message: '创建质量标准失败',
        error: error.message
      });
    }
  },
  
  /**
   * 更新质量标准
   */
  async updateStandard(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      // 检查标准是否存在
      const standard = await QualityStandard.getStandardById(parseInt(id));
      if (!standard) {
        return res.status(404).json({
          success: false,
          message: '质量标准不存在'
        });
      }
      
      const result = await QualityStandard.updateStandard(parseInt(id), data);
      
      res.json({
        success: true,
        message: '质量标准更新成功',
        data: result
      });
    } catch (error) {
      console.error('更新质量标准失败:', error);
      res.status(500).json({
        success: false,
        message: '更新质量标准失败',
        error: error.message
      });
    }
  },
  
  /**
   * 删除质量标准
   */
  async deleteStandard(req, res) {
    try {
      const { id } = req.params;
      
      // 检查标准是否存在
      const standard = await QualityStandard.getStandardById(parseInt(id));
      if (!standard) {
        return res.status(404).json({
          success: false,
          message: '质量标准不存在'
        });
      }
      
      const result = await QualityStandard.deleteStandard(parseInt(id));
      
      res.json({
        success: true,
        message: '质量标准删除成功',
        data: result
      });
    } catch (error) {
      console.error('删除质量标准失败:', error);
      res.status(500).json({
        success: false,
        message: '删除质量标准失败',
        error: error.message
      });
    }
  },
  
  /**
   * 获取目标选项
   */
  async getTargetOptions(req, res) {
    try {
      const { targetType } = req.params;
      
      if (!['material', 'product', 'process'].includes(targetType)) {
        return res.status(400).json({
          success: false,
          message: '目标类型参数错误'
        });
      }
      
      const options = await QualityStandard.getTargetOptions(targetType);
      
      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      console.error('获取目标选项失败:', error);
      res.status(500).json({
        success: false,
        message: '获取目标选项失败',
        error: error.message
      });
    }
  },
  
  /**
   * 获取追溯记录列表
   */
  async getTraceabilityRecords(req, res) {
    try {
      const { page = 1, pageSize = 10, productCode, batchNumber, startDate, endDate, status } = req.query;
      
      const filters = {
        productCode,
        batchNumber,
        startDate,
        endDate,
        status
      };
      
      const result = await Traceability.getTraceabilityRecords(filters, parseInt(page), parseInt(pageSize));
      
      res.json({
        success: true,
        records: result.records,
        total: result.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
    } catch (error) {
      console.error('获取追溯记录列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取追溯记录列表失败',
        error: error.message
      });
    }
  },
  
  /**
   * 获取追溯记录详情
   */
  async getTraceabilityById(req, res) {
    try {
      const { id } = req.params;
      
      const record = await Traceability.getTraceabilityById(parseInt(id));
      
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '追溯记录不存在'
        });
      }
      
      res.json({
        success: true,
        data: record
      });
    } catch (error) {
      console.error('获取追溯记录详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取追溯记录详情失败',
        error: error.message
      });
    }
  },
  
  /**
   * 创建追溯记录
   */
  async createTraceability(req, res) {
    try {
      const data = req.body;
      
      // 验证必要字段
      if (!data.productCode || !data.productName || !data.batchNumber || !data.productionDate || !data.supplier) {
        return res.status(400).json({
          success: false,
          message: '产品编码、产品名称、批次号、生产日期和供应商不能为空'
        });
      }
      
      const result = await Traceability.createTraceability(data);
      
      res.status(201).json({
        success: true,
        message: '追溯记录创建成功',
        data: result
      });
    } catch (error) {
      console.error('创建追溯记录失败:', error);
      res.status(500).json({
        success: false,
        message: '创建追溯记录失败',
        error: error.message
      });
    }
  },
  
  /**
   * 更新追溯记录
   */
  async updateTraceability(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      // 检查记录是否存在
      const record = await Traceability.getTraceabilityById(parseInt(id));
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '追溯记录不存在'
        });
      }
      
      const result = await Traceability.updateTraceability(parseInt(id), data);
      
      res.json({
        success: true,
        message: '追溯记录更新成功',
        data: result
      });
    } catch (error) {
      console.error('更新追溯记录失败:', error);
      res.status(500).json({
        success: false,
        message: '更新追溯记录失败',
        error: error.message
      });
    }
  },
  
  /**
   * 删除追溯记录
   */
  async deleteTraceability(req, res) {
    try {
      const { id } = req.params;
      
      // 检查记录是否存在
      const record = await Traceability.getTraceabilityById(parseInt(id));
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '追溯记录不存在'
        });
      }
      
      await Traceability.deleteTraceability(parseInt(id));
      
      res.json({
        success: true,
        message: '追溯记录删除成功'
      });
    } catch (error) {
      console.error('删除追溯记录失败:', error);
      res.status(500).json({
        success: false,
        message: '删除追溯记录失败',
        error: error.message
      });
    }
  },
  
  /**
   * 获取追溯工序记录
   */
  async getTraceabilityProcess(req, res) {
    try {
      const { id } = req.params;
      
      // 检查记录是否存在
      const record = await Traceability.getTraceabilityById(parseInt(id));
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '追溯记录不存在'
        });
      }
      
      const processes = await Traceability.getProcessRecords(parseInt(id));
      
      res.json(processes);
    } catch (error) {
      console.error('获取工序记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取工序记录失败',
        error: error.message
      });
    }
  },
  
  /**
   * 获取追溯物料记录
   */
  async getTraceabilityMaterials(req, res) {
    try {
      const { id } = req.params;
      
      // 检查记录是否存在
      const record = await Traceability.getTraceabilityById(parseInt(id));
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '追溯记录不存在'
        });
      }
      
      const materials = await Traceability.getMaterialRecords(parseInt(id));
      
      res.json(materials);
    } catch (error) {
      console.error('获取物料记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取物料记录失败',
        error: error.message
      });
    }
  },
  
  /**
   * 获取追溯质检记录
   */
  async getTraceabilityQuality(req, res) {
    try {
      const { id } = req.params;
      
      // 检查记录是否存在
      const record = await Traceability.getTraceabilityById(parseInt(id));
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '追溯记录不存在'
        });
      }
      
      const quality = await Traceability.getQualityRecords(parseInt(id));
      
      res.json(quality);
    } catch (error) {
      console.error('获取质检记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取质检记录失败',
        error: error.message
      });
    }
  },
  
  /**
   * 获取追溯图数据
   */
  async getTraceabilityChart(req, res) {
    try {
      const { id } = req.params;
      
      // 检查记录是否存在
      const record = await Traceability.getTraceabilityById(parseInt(id));
      if (!record) {
        return res.status(404).json({
          success: false,
          message: '追溯记录不存在'
        });
      }
      
      // 获取所有相关数据
      const processes = await Traceability.getProcessRecords(parseInt(id));
      const materials = await Traceability.getMaterialRecords(parseInt(id));
      const quality = await Traceability.getQualityRecords(parseInt(id));
      
      // 构建追溯图数据
      const chartData = {
        product: record,
        processes,
        materials,
        quality,
        nodes: [
          { id: 'product', name: record.productName, category: 'product' }
        ],
        links: []
      };
      
      // 添加工序节点和连接
      processes.forEach((process, index) => {
        const nodeId = `process_${process.id}`;
        chartData.nodes.push({
          id: nodeId,
          name: process.processName,
          category: 'process'
        });
        
        // 连接工序
        if (index === 0) {
          chartData.links.push({
            source: 'product',
            target: nodeId
          });
        } else {
          chartData.links.push({
            source: `process_${processes[index-1].id}`,
            target: nodeId
          });
        }
      });
      
      // 添加物料节点和连接
      materials.forEach(material => {
        const nodeId = `material_${material.id}`;
        chartData.nodes.push({
          id: nodeId,
          name: material.materialName,
          category: 'material'
        });
        
        // 连接到产品
        chartData.links.push({
          source: nodeId,
          target: 'product'
        });
      });
      
      // 添加质检节点和连接
      quality.forEach(check => {
        const nodeId = `quality_${check.id}`;
        chartData.nodes.push({
          id: nodeId,
          name: check.checkPoint,
          category: 'quality'
        });
        
        // 连接到产品
        chartData.links.push({
          source: nodeId,
          target: 'product'
        });
      });
      
      res.json(chartData);
    } catch (error) {
      console.error('获取追溯图数据失败:', error);
      res.status(500).json({
        success: false,
        message: '获取追溯图数据失败',
        error: error.message
      });
    }
  },

  /**
   * 获取检验单项目
   */
  async getInspectionItems(req, res) {
    try {
      const { id } = req.params;
      
      // 记录请求参数，便于调试
      console.log('获取检验单项目，参数:', { id });
      
      // 查询数据库获取检验项目
      const connection = await db.pool.getConnection();
      try {
        const [items] = await connection.query(
          `SELECT * FROM quality_inspection_items WHERE inspection_id = ? ORDER BY id`,
          [id]
        );
        
        console.log(`获取到检验单${id}的检验项，数量:`, items.length);
        
        res.json({
          success: true,
          data: items
        });
      } catch (error) {
        console.error('查询检验项目失败:', error);
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('获取检验单项目失败:', error);
      res.status(500).json({
        success: false,
        message: '获取检验单项目失败',
        error: error.message
      });
    }
  },

  /**
   * 获取全链路追溯数据 - 从原料到成品或从成品到原料
   */
  async getFullTraceability(req, res) {
    try {
      const { type, code, batchNumber } = req.query;
      
      // 验证参数
      if (!type || !code || !batchNumber) {
        return res.status(400).json({
          success: false,
          message: '追溯类型、编码和批次号不能为空'
        });
      }
      
      // 验证追溯类型
      if (type !== 'forward' && type !== 'backward') {
        return res.status(400).json({
          success: false,
          message: '无效的追溯类型，只支持 forward 或 backward'
        });
      }
      
      const result = await Traceability.getFullTraceability(type, code, batchNumber);
      
      res.json(result);
    } catch (error) {
      console.error('获取全链路追溯数据失败:', error);
      res.status(500).json({
        success: false,
        message: '获取全链路追溯数据失败',
        error: error.message
      });
    }
  },
};

module.exports = qualityController; 