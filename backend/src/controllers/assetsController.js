const assetsModel = require('../models/assets');
const db = require('../config/db');
const financeModel = require('../models/finance');

/**
 * 固定资产控制器
 */
const assetsController = {
  /**
   * 获取固定资产列表
   */
  getAssets: async (req, res) => {
    try {
      console.log('收到获取资产列表请求:', req.query);
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const filters = {
        asset_code: req.query.assetCode || null,
        asset_name: req.query.assetName || null,
        asset_type: req.query.assetType || null,
        category_id: req.query.categoryId || null,
        status: req.query.status || null
      };
      
      console.log('过滤条件:', filters);
      
      // 调用model方法获取固定资产列表
      console.log('正在调用 assetsModel.getAssets 方法...');
      const result = await assetsModel.getAssets(filters, page, limit);
      
      console.log(`从模型获取到 ${result.assets.length} 条资产记录`);
      console.log('分页信息:', result.pagination);
      
      // 返回成功响应
      res.status(200).json({
        success: true,
        data: result.assets || [],
        total: result.pagination?.total || 0,
        page: page,
        limit: limit,
        // 添加额外的调试信息
        debug: {
          timeStamp: new Date().toISOString(),
          queryParams: req.query,
          filters: filters
        }
      });
    } catch (error) {
      console.error('获取固定资产失败:', error);
      console.error('错误堆栈:', error.stack);
      
      // 即使出错也返回一个有效的JSON响应
      res.status(500).json({ 
        success: false,
        message: '获取固定资产失败', 
        error: error.message,
        data: [],
        debug: {
          timeStamp: new Date().toISOString(),
          errorType: error.name,
          errorStack: error.stack
        }
      });
    }
  },

  /**
   * 获取单个固定资产
   */
  getAssetById: async (req, res) => {
    try {
      const assetId = parseInt(req.params.id);
      if (isNaN(assetId)) {
        return res.status(400).json({
          success: false,
          message: '无效的资产ID'
        });
      }
      
      console.log(`获取固定资产详情, ID: ${assetId}`);
      const asset = await assetsModel.getAssetById(assetId);
      
      if (!asset) {
        return res.status(404).json({
          success: false,
          message: `未找到ID为${assetId}的资产`
        });
      }
      
      // 转换字段名为前端期望的驼峰式
      const formattedAsset = {
        id: asset.id,
        assetCode: asset.asset_code,
        assetName: asset.asset_name,
        assetType: asset.asset_type,
        categoryId: asset.category_id,
        purchaseDate: asset.acquisition_date,
        originalValue: parseFloat(asset.acquisition_cost),
        netValue: parseFloat(asset.current_value - asset.accumulated_depreciation),
        location: asset.location_id || '',
        department: asset.department_name || '',
        responsible: asset.custodian || '',
        usefulLife: asset.useful_life,
        salvageRate: asset.salvage_value ? (asset.salvage_value / asset.acquisition_cost * 100).toFixed(2) : 0,
        depreciationMethod: asset.depreciation_method,
        notes: asset.notes || ''
      };
      
      console.log('返回格式化的资产数据:', formattedAsset);
      
      res.status(200).json(formattedAsset);
    } catch (error) {
      console.error('获取固定资产失败:', error);
      res.status(500).json({ 
        success: false, 
        message: '获取固定资产失败', 
        error: error.message 
      });
    }
  },

  /**
   * 创建固定资产
   */
  createAsset: async (req, res) => {
    try {
      console.log('收到创建资产请求:', req.body);
      
      // 资产类型英文到中文的映射
      const assetTypeMap = {
        'machine': '机器设备',
        'electronic': '电子设备',
        'furniture': '办公家具',
        'building': '房屋建筑',
        'vehicle': '车辆',
        'other': '其他'
      };
      
      // 折旧方法英文到中文的映射
      const depreciationMethodMap = {
        'straight_line': '直线法',
        'double_declining': '双倍余额递减法',
        'sum_of_years': '年数总和法',
        'units_of_production': '工作量法',
        'no_depreciation': '不计提'
      };
      
      // 状态英文到中文的映射
      const statusMap = {
        'in_use': '在用',
        'idle': '闲置',
        'under_repair': '维修',
        'disposed': '报废',
        'sold': '已处置'
      };
      
      // 将驼峰式字段转换为下划线格式
      // 检查必填字段
      if (!req.body.assetCode || !req.body.assetName || 
          !req.body.purchaseDate || !req.body.originalValue) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段：资产编码、资产名称、购入日期和原值'
        });
      }
      
      // 检查资产编码是否已存在
      try {
        const [existingAssets] = await db.pool.query(
          'SELECT id FROM fixed_assets WHERE asset_code = ?',
          [req.body.assetCode]
        );
        
        if (existingAssets && existingAssets.length > 0) {
          return res.status(400).json({
            success: false,
            message: `资产编码 ${req.body.assetCode} 已存在`
          });
        }
      } catch (checkError) {
        console.error('检查资产编码失败:', checkError);
        // 继续执行，不中断流程
      }
      
      // 如果未提供assetType，则根据categoryId获取类别信息
      let assetType = req.body.assetType;
      if (!assetType && req.body.categoryId) {
        try {
          const [categories] = await db.pool.query(
            'SELECT * FROM asset_categories WHERE id = ?',
            [req.body.categoryId]
          );
          
          if (categories && categories.length > 0) {
            // 根据类别设置默认的资产类型
            assetType = 'electronic'; // 默认为电子设备
          }
        } catch (categoryError) {
          console.error('获取资产类别失败:', categoryError);
          // 继续执行，使用默认值
        }
      }
      
      // 处理location（存放地点）
      let locationId = null;
      if (req.body.location) {
        // 不再创建或查询locations表记录，直接将位置信息作为字符串保存
        locationId = req.body.location;
      }
      
      // 处理department（使用部门）
      let departmentId = null;
      if (req.body.department) {
        try {
          // 查找是否已有此部门
          const [departments] = await db.pool.query(
            'SELECT id FROM departments WHERE name = ?',
            [req.body.department]
          );
          
          if (departments && departments.length > 0) {
            departmentId = departments[0].id;
          } else {
            // 创建新部门
            const [insertResult] = await db.pool.query(
              'INSERT INTO departments (name) VALUES (?)',
              [req.body.department]
            );
            departmentId = insertResult.insertId;
          }
        } catch (departmentError) {
          console.error('处理部门信息失败:', departmentError);
          // 继续执行，不中断流程
        }
      }
      
      // 构建资产数据对象，从前端的驼峰式字段名转换为数据库的下划线格式
      const assetData = {
        asset_code: req.body.assetCode,
        asset_name: req.body.assetName,
        asset_type: assetTypeMap[assetType] || '电子设备',
        category_id: req.body.categoryId || null,
        acquisition_date: req.body.purchaseDate,
        acquisition_cost: parseFloat(req.body.originalValue),
        depreciation_method: depreciationMethodMap[req.body.depreciationMethod] || '直线法',
        useful_life: parseInt(req.body.usefulLife) * 12 || 60, // 将年转换为月
        salvage_value: parseFloat(req.body.originalValue) * (parseFloat(req.body.salvageRate) / 100) || 0,
        location_id: locationId,
        department_id: departmentId,
        custodian: req.body.responsible || null,
        status: statusMap[req.body.status] || '在用',
        notes: req.body.notes || null
      };
      
      console.log('构建的资产数据:', assetData);
      
      // 调用模型方法创建资产
      const assetId = await assetsModel.createAsset(assetData);
      console.log(`资产创建成功，ID: ${assetId}`);
      
      // 获取创建的资产完整信息
      const asset = await assetsModel.getAssetById(assetId);
      
      if (!asset) {
        return res.status(201).json({
          success: true,
          message: '资产创建成功，但无法获取详细信息',
          data: { id: assetId }
        });
      }
      
      // 获取资产总数
      const assetCount = await assetsModel.getAssetCount();
      
      res.status(201).json({
        success: true,
        message: '资产创建成功',
        data: asset,
        meta: {
          totalCount: assetCount
        }
      });
    } catch (error) {
      console.error('创建固定资产失败:', error);
      res.status(500).json({ 
        success: false, 
        message: '创建固定资产失败', 
        error: error.message 
      });
    }
  },

  /**
   * 更新固定资产
   */
  updateAsset: async (req, res) => {
    try {
      const assetId = parseInt(req.params.id);
      if (isNaN(assetId)) {
        return res.status(400).json({
          success: false,
          message: '无效的资产ID'
        });
      }
      
      console.log('更新资产请求，ID:', assetId);
      console.log('更新数据:', req.body);
      
      // 检查资产是否存在
      const existingAsset = await assetsModel.getAssetById(assetId);
      if (!existingAsset) {
        return res.status(404).json({
          success: false,
          message: `未找到ID为${assetId}的资产`
        });
      }
      
      // 处理location（存放地点）
      let locationId = existingAsset.location_id;
      if (req.body.location) {
        // 不再创建或查询locations表记录，直接将位置信息作为字符串保存
        locationId = req.body.location;
      }
      
      // 处理department（使用部门）
      let departmentId = existingAsset.department_id;
      if (req.body.department) {
        try {
          // 查找是否已有此部门
          const [departments] = await db.pool.query(
            'SELECT id FROM departments WHERE name = ?',
            [req.body.department]
          );
          
          if (departments && departments.length > 0) {
            departmentId = departments[0].id;
          } else {
            // 创建新部门
            const [insertResult] = await db.pool.query(
              'INSERT INTO departments (name) VALUES (?)',
              [req.body.department]
            );
            departmentId = insertResult.insertId;
          }
        } catch (departmentError) {
          console.error('处理部门信息失败:', departmentError);
          // 继续执行，不中断流程
        }
      }
      
      // 将前端数据转换为资产数据对象
      // 如果未提供assetType，则使用默认值
      let assetType = req.body.assetType || existingAsset.asset_type;
      
      const assetData = {
        asset_name: req.body.assetName,
        asset_type: assetType,
        category_id: req.body.categoryId || existingAsset.category_id,
        acquisition_date: req.body.purchaseDate || existingAsset.acquisition_date,
        depreciation_method: req.body.depreciationMethod || existingAsset.depreciation_method,
        useful_life: parseInt(req.body.usefulLife) || existingAsset.useful_life,
        salvage_value: parseFloat(req.body.originalValue) * (parseFloat(req.body.salvageRate) / 100) || existingAsset.salvage_value,
        location_id: locationId,
        department_id: departmentId,
        custodian: req.body.responsible || existingAsset.custodian,
        status: req.body.status || existingAsset.status,
        notes: req.body.notes || existingAsset.notes
      };
      
      // 如果原值变化，更新当前价值
      if (req.body.originalValue && parseFloat(req.body.originalValue) !== parseFloat(existingAsset.acquisition_cost)) {
        assetData.acquisition_cost = parseFloat(req.body.originalValue);
        assetData.current_value = parseFloat(req.body.originalValue);
        assetData.accumulated_depreciation = 0; // 重置累计折旧
      }
      
      console.log('转换后的资产数据:', assetData);
      
      // 调用模型更新资产
      const success = await assetsModel.updateAsset(assetId, assetData);
      
      if (!success) {
        return res.status(500).json({
          success: false,
          message: '资产更新失败'
        });
      }
      
      // 获取更新后的资产
      const updatedAsset = await assetsModel.getAssetById(assetId);
      
      // 转换为前端格式
      const formattedAsset = {
        id: updatedAsset.id,
        assetCode: updatedAsset.asset_code,
        assetName: updatedAsset.asset_name,
        categoryId: updatedAsset.category_id,
        purchaseDate: updatedAsset.acquisition_date,
        originalValue: parseFloat(updatedAsset.acquisition_cost || 0),
        netValue: parseFloat((updatedAsset.current_value || 0) - (updatedAsset.accumulated_depreciation || 0)),
        location: updatedAsset.location_id || '',
        department: updatedAsset.department_name || '',
        responsible: updatedAsset.custodian || '',
        usefulLife: updatedAsset.useful_life || 0,
        salvageRate: updatedAsset.salvage_value ? (updatedAsset.salvage_value / updatedAsset.acquisition_cost * 100).toFixed(2) : 0,
        depreciationMethod: updatedAsset.depreciation_method || 'straight_line',
        status: updatedAsset.status === '在用' ? 'in_use' :
              updatedAsset.status === '闲置' ? 'idle' :
              updatedAsset.status === '维修' ? 'under_repair' :
              updatedAsset.status === '报废' ? 'disposed' : 'in_use',
        notes: updatedAsset.notes || ''
      };
      
      res.status(200).json({
        success: true,
        message: '资产更新成功',
        data: formattedAsset
      });
    } catch (error) {
      console.error('更新固定资产失败:', error);
      res.status(500).json({ 
        success: false, 
        message: '更新固定资产失败', 
        error: error.message 
      });
    }
  },

  /**
   * 计算折旧
   */
  calculateDepreciation: async (req, res) => {
    try {
      const assetId = parseInt(req.params.id);
      
      if (isNaN(assetId)) {
        return res.status(400).json({
          success: false,
          message: '无效的资产ID'
        });
      }
      
      // 首先检查资产是否存在
      const asset = await assetsModel.getAssetById(assetId);
      if (!asset) {
        return res.status(404).json({
          success: false,
          message: `未找到ID为${assetId}的资产`
        });
      }
      
      console.log(`开始计算资产 ${assetId} 的折旧`);
      
      // 获取当前日期作为折旧日期
      const today = new Date();
      const depreciationDate = today.toISOString().slice(0, 10); // YYYY-MM-DD格式
      
      let currentPeriod = null;
      let periodId = 1; // 默认使用ID为1的期间
      
      try {
        // 尝试获取当前会计期间
        currentPeriod = await financeModel.getCurrentPeriod();
        if (currentPeriod) {
          periodId = currentPeriod.id;
        } else {
          console.warn('未找到未关闭的会计期间，使用默认期间ID=1');
        }
      } catch (periodError) {
        console.warn('获取当前会计期间失败，使用默认期间ID=1:', periodError.message);
      }
      
      // 准备折旧参数
      const params = {
        assetId: assetId,
        periodId: periodId,
        depreciationDate: depreciationDate,
        notes: `资产${assetId}的手动折旧计提`
      };
      
      console.log('折旧计算参数:', params);
      
      // 调用模型方法计算折旧
      try {
        const depreciationId = await assetsModel.calculateDepreciation(params);
        
        // 获取更新后的资产信息
        const updatedAsset = await assetsModel.getAssetById(assetId);
        
        return res.status(200).json({
          success: true,
          message: '折旧计算成功',
          data: {
            depreciationId: depreciationId,
            assetId: assetId,
            depreciationDate: depreciationDate,
            currentValue: parseFloat(updatedAsset.current_value || 0),
            accumulatedDepreciation: parseFloat(updatedAsset.accumulated_depreciation || 0)
          }
        });
      } catch (modelError) {
        console.error('资产模型计算折旧失败:', modelError);
        
        // 检查是否是已经计提折旧的错误
        if (modelError.message && modelError.message.includes('已计提折旧')) {
          return res.status(400).json({
            success: false,
            message: modelError.message
          });
        }
        
        // 其他错误
        return res.status(500).json({
          success: false,
          message: '计算折旧失败',
          error: modelError.message
        });
      }
    } catch (error) {
      console.error('计算折旧失败:', error);
      res.status(500).json({ 
        success: false,
        message: '计算折旧失败',
        error: error.message 
      });
    }
  },
  
  /**
   * 批量计算折旧
   */
  calculateBatchDepreciation: async (req, res) => {
    try {
      const { depreciationDate, categoryId, department } = req.query;
      
      if (!depreciationDate) {
        return res.status(400).json({
          success: false,
          message: '缺少折旧日期参数'
        });
      }
      
      console.log('计算折旧请求:', { depreciationDate, categoryId, department });
      
      // 调用模型方法计算折旧
      const assetsList = await assetsModel.calculateBatchDepreciation(depreciationDate, categoryId, department);
      
      res.json(assetsList);
    } catch (error) {
      console.error('批量计算折旧失败:', error);
      res.status(500).json({
        success: false,
        message: '批量计算折旧失败',
        error: error.message
      });
    }
  },
  
  /**
   * 提交折旧
   */
  submitDepreciation: async (req, res) => {
    try {
      const { depreciationDate, assets } = req.body;
      
      if (!depreciationDate || !assets || !Array.isArray(assets) || assets.length === 0) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数'
        });
      }
      
      console.log('提交折旧数据:', { depreciationDate, assetsCount: assets.length });
      
      // 调用模型方法提交折旧
      const success = await assetsModel.submitDepreciation(depreciationDate, assets);
      
      res.json({
        success: true,
        message: '折旧提交成功',
        data: {
          depreciationDate,
          assetsCount: assets.length,
          totalDepreciationAmount: assets.reduce((sum, asset) => sum + asset.depreciationAmount, 0)
        }
      });
    } catch (error) {
      console.error('提交折旧失败:', error);
      res.status(500).json({
        success: false,
        message: '提交折旧失败',
        error: error.message
      });
    }
  },
  
  /**
   * 导出折旧数据
   */
  exportDepreciation: async (req, res) => {
    try {
      const { depreciationDate, categoryId, department } = req.query;
      
      if (!depreciationDate) {
        return res.status(400).json({
          success: false,
          message: '缺少折旧日期参数'
        });
      }
      
      console.log('导出折旧数据请求:', { depreciationDate, categoryId, department });
      
      // 这里应该生成并返回Excel文件
      // 临时返回文本消息
      res.setHeader('Content-Type', 'text/plain');
      res.send(`折旧数据导出功能暂未实现。请求参数: ${JSON.stringify({ depreciationDate, categoryId, department })}`);
    } catch (error) {
      console.error('导出折旧数据失败:', error);
      res.status(500).json({
        success: false,
        message: '导出折旧数据失败',
        error: error.message
      });
    }
  },

  /**
   * 获取资产系统调试信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @returns {Promise<Object>} 响应结果
   */
  getDebugInfo: async (req, res) => {
    try {
      const result = await assetsModel.debugInfo();
      return res.json({
        success: true,
        message: '获取资产系统调试信息成功',
        data: result
      });
    } catch (error) {
      console.error('获取资产系统调试信息失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取资产系统调试信息失败',
        error: error.message
      });
    }
  },

  /**
   * 创建示例资产数据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @returns {Promise<Object>} 响应结果
   */
  createSampleAssets: async (req, res) => {
    try {
      const result = await assetsModel.createSampleAssets();
      return res.json({
        success: true,
        message: '创建示例资产数据成功',
        data: result
      });
    } catch (error) {
      console.error('创建示例资产数据失败:', error);
      return res.status(500).json({
        success: false,
        message: '创建示例资产数据失败',
        error: error.message
      });
    }
  },

  /**
   * 处置资产
   */
  disposeAsset: async (req, res) => {
    try {
      res.status(200).json({ message: 'API未实现' });
    } catch (error) {
      console.error('处置资产失败:', error);
      res.status(500).json({ error: '处置资产失败', details: error.message });
    }
  },

  /**
   * 转移资产
   */
  transferAsset: async (req, res) => {
    try {
      const assetId = parseInt(req.params.id);
      
      if (isNaN(assetId)) {
        return res.status(400).json({
          success: false,
          message: '无效的资产ID'
        });
      }
      
      // 检查资产是否存在
      const asset = await assetsModel.getAssetById(assetId);
      if (!asset) {
        return res.status(404).json({
          success: false,
          message: `未找到ID为${assetId}的资产`
        });
      }
      
      // 检查资产状态是否允许调拨
      if (asset.asset_type === '报废' || asset.asset_type === '已处置') {
        return res.status(400).json({
          success: false,
          message: '已报废或已处置的资产不能进行调拨'
        });
      }
      
      // 获取调拨参数
      const {
        newDepartment,
        newResponsible,
        newLocation,
        transferDate,
        transferReason,
        notes
      } = req.body;
      
      // 验证必要参数
      if (!newDepartment || !newResponsible || !newLocation || !transferDate) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数：新部门、新责任人、新存放地点或调拨日期'
        });
      }
      
      console.log(`开始处理资产 ${assetId} 的调拨请求`, req.body);
      
      // 调用模型方法执行调拨
      const transferData = {
        assetId,
        originalDepartment: asset.department_name,
        originalResponsible: asset.custodian,
        originalLocation: asset.location_id,
        newDepartment,
        newResponsible,
        newLocation,
        transferDate,
        transferReason: transferReason || '',
        notes: notes || ''
      };
      
      // 执行调拨并获取结果
      await assetsModel.transferAsset(transferData);
      
      // 返回成功响应
      res.status(200).json({
        success: true,
        message: '资产调拨成功',
        data: {
          assetId,
          assetCode: asset.asset_code,
          assetName: asset.asset_name,
          newDepartment,
          newResponsible,
          newLocation,
          transferDate
        }
      });
    } catch (error) {
      console.error('转移资产失败:', error);
      res.status(500).json({
        success: false,
        message: '转移资产失败',
        error: error.message
      });
    }
  },

  /**
   * 获取资产统计
   */
  getAssetStatistics: async (req, res) => {
    try {
      console.log('收到获取资产统计请求');
      
      // 查询资产总数和总价值
      const [totalResult] = await db.pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(acquisition_cost) as totalValue,
          SUM(current_value - accumulated_depreciation) as netValue
        FROM fixed_assets
      `);
      
      // 查询各种状态的资产数量
      const [statusResult] = await db.pool.query(`
        SELECT 
          status,
          COUNT(*) as count,
          SUM(acquisition_cost) as value
        FROM fixed_assets
        GROUP BY status
      `);
      
      // 将结果转换为前端需要的格式
      const stats = {
        total: totalResult[0].total || 0,
        totalValue: totalResult[0].totalValue || 0,
        netValue: totalResult[0].netValue || 0,
        inUseCount: 0,
        idleCount: 0,
        underRepairCount: 0,
        disposedCount: 0
      };
      
      // 填充各种状态的资产数量
      statusResult.forEach(item => {
        if (item.status === '在用') {
          stats.inUseCount = item.count;
          stats.inUseValue = item.value;
        } else if (item.status === '闲置') {
          stats.idleCount = item.count;
          stats.idleValue = item.value;
        } else if (item.status === '维修') {
          stats.underRepairCount = item.count;
          stats.underRepairValue = item.value;
        } else if (item.status === '报废' || item.status === '已处置') {
          stats.disposedCount = (stats.disposedCount || 0) + item.count;
          stats.disposedValue = (stats.disposedValue || 0) + item.value;
        }
      });
      
      console.log('资产统计数据:', stats);
      res.status(200).json(stats);
    } catch (error) {
      console.error('获取资产统计失败:', error);
      res.status(500).json({ error: '获取资产统计失败', details: error.message });
    }
  },

  /**
   * 获取资产类别列表
   */
  getAssetCategories: async (req, res) => {
    try {
      console.log('收到获取资产类别列表请求:', req.query);
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      
      console.log('正在调用 assetsModel.getAssetCategories');
      const categories = await assetsModel.getAssetCategories(page, limit);
      console.log('获取到资产类别数据:', categories);
      
      // 确保返回一个统一的数据格式
      return res.json({
        success: true,
        data: categories.data || [],
        total: categories.total || 0,
        page: categories.page || page,
        limit: categories.limit || limit
      });
    } catch (error) {
      console.error('获取资产类别列表失败:', error);
      
      // 即使出错也返回一个结构化的响应，确保前端接收到有效JSON
      return res.status(500).json({
        success: false,
        message: '获取资产类别列表失败',
        error: error.message || '未知错误',
        data: [], // 确保即使出错也返回空数组
        total: 0,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      });
    }
  },
  
  /**
   * 获取单个资产类别
   */
  getAssetCategoryById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的类别ID'
        });
      }
      
      const category = await assetsModel.getAssetCategoryById(id);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          message: '资产类别不存在'
        });
      }
      
      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('获取资产类别失败:', error);
      res.status(500).json({
        success: false,
        message: '获取资产类别失败',
        error: error.message
      });
    }
  },
  
  /**
   * 创建资产类别
   */
  createAssetCategory: async (req, res) => {
    try {
      const categoryData = {
        name: req.body.name,
        code: req.body.code,
        default_useful_life: req.body.default_useful_life,
        default_depreciation_method: req.body.default_depreciation_method,
        default_salvage_rate: req.body.default_salvage_rate,
        description: req.body.description
      };
      
      if (!categoryData.name || !categoryData.code) {
        return res.status(400).json({
          success: false,
          message: '类别名称和编码为必填项'
        });
      }
      
      const categoryId = await assetsModel.createAssetCategory(categoryData);
      
      const newCategory = await assetsModel.getAssetCategoryById(categoryId);
      
      res.status(201).json({
        success: true,
        message: '资产类别创建成功',
        data: newCategory
      });
    } catch (error) {
      console.error('创建资产类别失败:', error);
      res.status(500).json({
        success: false,
        message: '创建资产类别失败',
        error: error.message
      });
    }
  },
  
  /**
   * 更新资产类别
   */
  updateAssetCategory: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的类别ID'
        });
      }
      
      const categoryData = {
        name: req.body.name,
        code: req.body.code,
        default_useful_life: req.body.default_useful_life,
        default_depreciation_method: req.body.default_depreciation_method,
        default_salvage_rate: req.body.default_salvage_rate,
        description: req.body.description
      };
      
      if (!categoryData.name || !categoryData.code) {
        return res.status(400).json({
          success: false,
          message: '类别名称和编码为必填项'
        });
      }
      
      // 检查类别是否存在
      const existingCategory = await assetsModel.getAssetCategoryById(id);
      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: '资产类别不存在'
        });
      }
      
      const success = await assetsModel.updateAssetCategory(id, categoryData);
      
      if (success) {
        const updatedCategory = await assetsModel.getAssetCategoryById(id);
        
        res.json({
          success: true,
          message: '资产类别更新成功',
          data: updatedCategory
        });
      } else {
        res.status(500).json({
          success: false,
          message: '资产类别更新失败'
        });
      }
    } catch (error) {
      console.error('更新资产类别失败:', error);
      res.status(500).json({
        success: false,
        message: '更新资产类别失败',
        error: error.message
      });
    }
  },
  
  /**
   * 删除资产类别
   */
  deleteAssetCategory: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的类别ID'
        });
      }
      
      // 检查类别是否存在
      const existingCategory = await assetsModel.getAssetCategoryById(id);
      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: '资产类别不存在'
        });
      }
      
      await assetsModel.deleteAssetCategory(id);
      
      res.json({
        success: true,
        message: '资产类别删除成功'
      });
    } catch (error) {
      console.error('删除资产类别失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '删除资产类别失败'
      });
    }
  },
};

module.exports = assetsController; 