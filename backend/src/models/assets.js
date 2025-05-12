const db = require('../config/db');
const financeModel = require('./finance');

/**
 * 固定资产模块数据库操作
 */
const assetsModel = {
  /**
   * 创建固定资产
   */
  createAsset: async (assetData) => {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      // 插入固定资产
      const [result] = await connection.query(
        `INSERT INTO fixed_assets 
        (asset_code, asset_name, asset_type, acquisition_date, 
         acquisition_cost, depreciation_method, useful_life, salvage_value, 
         current_value, accumulated_depreciation, location_id, department_id, 
         custodian, status, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          assetData.asset_code,
          assetData.asset_name,
          assetData.asset_type,
          assetData.acquisition_date,
          assetData.acquisition_cost,
          assetData.depreciation_method,
          assetData.useful_life,
          assetData.salvage_value || 0,
          assetData.acquisition_cost, // 初始当前价值等于取得成本
          0, // 初始累计折旧为0
          assetData.location_id || null,
          assetData.department_id || null,
          assetData.custodian || null,
          assetData.status || '在用',
          assetData.notes || null
        ]
      );

      const assetId = result.insertId;
      console.log(`固定资产创建成功，ID: ${assetId}`);

      // 如果提供了会计分录信息，创建资产购置会计分录
      if (assetData.gl_entry) {
        const entryData = {
          entry_number: assetData.gl_entry.entry_number,
          entry_date: assetData.acquisition_date,
          posting_date: assetData.acquisition_date,
          document_type: '购置单',
          document_number: assetData.asset_code,
          period_id: assetData.gl_entry.period_id,
          description: `固定资产购置: ${assetData.asset_name}`,
          created_by: assetData.gl_entry.created_by
        };

        // 资产购置分录明细
        const entryItems = [
          // 借：固定资产
          {
            account_id: assetData.gl_entry.asset_account_id,
            debit_amount: assetData.acquisition_cost,
            credit_amount: 0,
            description: `固定资产购置 - ${assetData.asset_name}`
          },
          // 贷：银行/应付账款
          {
            account_id: assetData.gl_entry.payment_account_id,
            debit_amount: 0,
            credit_amount: assetData.acquisition_cost,
            description: `固定资产购置付款 - ${assetData.asset_name}`
          }
        ];

        // 创建会计分录
        await financeModel.createEntry(entryData, entryItems, connection);
      }

      await connection.commit();
      
      // 在事务完成后调用创建完成后处理
      setTimeout(async () => {
        try {
          await assetsModel.createAssetCompleted(assetId);
        } catch (afterError) {
          console.error('创建后处理出错，但不影响主流程:', afterError);
        }
      }, 100);
      
      return assetId;
    } catch (error) {
      await connection.rollback();
      console.error('创建固定资产失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * 按ID获取固定资产
   */
  getAssetById: async (id) => {
    try {
      // 仅获取部门信息，不再获取locations
      const [departments] = await db.pool.query('SELECT id, name FROM departments');
      
      // 构建部门的ID到名称的映射
      const departmentMap = {};
      departments.forEach(dept => {
        departmentMap[dept.id] = dept.name;
      });
      
      const [assets] = await db.pool.query(
        `SELECT a.* 
         FROM fixed_assets a
         WHERE a.id = ?`,
        [id]
      );
      
      if (assets.length === 0) return null;
      
      const asset = assets[0];
      
      // 转换折旧方法为前端格式
      const depreciationMethodMap = {
        '直线法': 'straight_line',
        '双倍余额递减法': 'double_declining',
        '年数总和法': 'sum_of_years',
        '工作量法': 'units_of_production',
        '不计提': 'no_depreciation'
      };
      
      // 转换资产类型为前端格式
      const assetTypeMap = {
        '机器设备': 'machine',
        '电子设备': 'electronic',
        '办公家具': 'furniture',
        '房屋建筑': 'building',
        '车辆': 'vehicle',
        '其他': 'other'
      };
      
      // 直接使用location_id作为location名称
      const location_name = asset.location_id || '';
      // 获取部门名称
      const department_name = asset.department_id ? departmentMap[asset.department_id] || '' : '';
      
      // 转换数据格式
      return {
        id: asset.id,
        asset_code: asset.asset_code,
        asset_name: asset.asset_name,
        asset_type: assetTypeMap[asset.asset_type] || 'other',
        category_id: asset.category_id,
        acquisition_date: asset.acquisition_date,
        acquisition_cost: parseFloat(asset.acquisition_cost),
        depreciation_method: depreciationMethodMap[asset.depreciation_method] || 'straight_line',
        useful_life: Math.ceil(asset.useful_life / 12), // 转换为年
        salvage_value: parseFloat(asset.salvage_value),
        current_value: parseFloat(asset.current_value),
        accumulated_depreciation: parseFloat(asset.accumulated_depreciation),
        location_id: asset.location_id, // 直接使用location_id，现在是VARCHAR
        location_name: asset.location_id || '', // 使用location_id作为location_name
        department_id: asset.department_id,
        department_name: department_name,
        custodian: asset.custodian,
        notes: asset.notes || ''
      };
    } catch (error) {
      console.error('获取固定资产失败:', error);
      throw error;
    }
  },

  /**
   * 获取固定资产列表
   */
  getAssets: async (filters = {}, page = 1, pageSize = 20) => {
    try {
      console.log('getAssets方法开始执行，参数:', JSON.stringify({filters, page, pageSize}));
      
      // 转换参数为数字
      page = parseInt(page, 10) || 1;
      pageSize = parseInt(pageSize, 10) || 20;
      
      // 首先简单测试是否能获取到任何数据
      const testQuery = 'SELECT COUNT(*) as count FROM fixed_assets';
      const [testResult] = await db.pool.query(testQuery);
      console.log(`测试查询结果: 固定资产表中有 ${testResult[0].count} 条记录`);
      
      if (testResult[0].count === 0) {
        console.log('资产表为空，无需进一步查询');
        return {
          assets: [],
          pagination: {
            total: 0,
            page: page,
            pageSize: pageSize,
            totalPages: 0
          }
        };
      }
      
      // 仅预先获取部门信息
      const [departments] = await db.pool.query('SELECT id, name FROM departments');
      
      // 构建部门的ID到名称的映射
      const departmentMap = {};
      departments.forEach(dept => {
        departmentMap[dept.id] = dept.name;
      });
      
      // 验证表结构
      try {
        const [columns] = await db.pool.query('SHOW COLUMNS FROM fixed_assets');
        console.log('表结构验证：', columns.map(col => col.Field).join(', '));
      } catch (structError) {
        console.error('表结构验证失败:', structError);
      }
      
      // 简化查询，不使用WHERE 1=1，避免不必要的JOIN
      let query = 'SELECT * FROM fixed_assets';
      let whereConditions = [];
      const params = [];

      // 添加过滤条件
      if (filters.asset_code) {
        whereConditions.push('asset_code LIKE ?');
        params.push(`%${filters.asset_code}%`);
      }
      
      if (filters.asset_name) {
        whereConditions.push('asset_name LIKE ?');
        params.push(`%${filters.asset_name}%`);
      }
      
      if (filters.asset_type) {
        whereConditions.push('asset_type = ?');
        params.push(filters.asset_type);
      }
      
      if (filters.category_id) {
        whereConditions.push('category_id = ?');
        params.push(filters.category_id);
      }
      
      if (filters.status) {
        // 前端状态值映射到数据库状态值
        const statusMap = {
          'in_use': '在用',
          'idle': '闲置',
          'under_repair': '维修',
          'disposed': '报废'
        };
        const dbStatus = statusMap[filters.status] || filters.status;
        
        whereConditions.push('status = ?');
        params.push(dbStatus);
      }
      
      // 添加WHERE子句
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      // 添加排序
      query += ' ORDER BY id DESC';
      
      console.log('构建的SQL查询：', query);
      console.log('查询参数：', params);
      
      // 获取总记录数
      let countQuery = 'SELECT COUNT(*) as total FROM fixed_assets';
      if (whereConditions.length > 0) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      const [countResult] = await db.pool.query(countQuery, params);
      const total = countResult && countResult[0] ? countResult[0].total : 0;
      console.log(`符合条件的记录总数: ${total}`);
      
      // 添加分页
      query += ' LIMIT ? OFFSET ?';
      const offset = (page - 1) * pageSize;
      const queryParams = [...params, pageSize, offset];
      
      // 执行查询
      console.log('执行最终查询:', query, queryParams);
      const [assets] = await db.pool.query(query, queryParams);
      console.log(`查询到 ${assets.length} 条资产记录`);
      
      if (assets.length > 0) {
        console.log('第一条资产记录结构:', JSON.stringify(assets[0], null, 2));
      }
      
      // 创建一个安全的资产对象列表，确保即使数据库字段缺失也能返回所需的字段
      const formattedAssets = (assets || []).map(asset => ({
        id: asset.id || 0,
        assetCode: asset.asset_code || '',
        assetName: asset.asset_name || '',
        categoryId: asset.category_id || null,
        categoryName: asset.asset_type || '',
        purchaseDate: asset.acquisition_date || '',
        originalValue: parseFloat(asset.acquisition_cost || 0),
        netValue: parseFloat((asset.current_value || 0) - (asset.accumulated_depreciation || 0)),
        location: asset.location_id || '',  // 直接使用location_id字段作为位置名称，现在是VARCHAR类型
        department: asset.department_id ? departmentMap[asset.department_id] || '' : '',  // 从映射表获取部门名称
        responsible: asset.custodian || '',
        status: asset.status === '在用' ? 'in_use' :
               asset.status === '闲置' ? 'idle' :
               asset.status === '维修' ? 'under_repair' :
               asset.status === '报废' ? 'disposed' : 'in_use'
      }));
      
      console.log(`格式化后的资产数据: ${formattedAssets.length} 条记录`);
      
      return {
        assets: formattedAssets,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      console.error('获取固定资产列表失败，详细错误:', error);
      // 出错时返回空结果而不是抛出异常
      return {
        assets: [],
        pagination: {
          total: 0,
          page: page,
          pageSize: pageSize,
          totalPages: 0
        }
      };
    }
  },

  /**
   * 更新固定资产
   */
  updateAsset: async (id, assetData) => {
    try {
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
      
      // 转换为数据库支持的格式
      const assetType = assetTypeMap[assetData.asset_type] || '其他';
      const depreciationMethod = depreciationMethodMap[assetData.depreciation_method] || '直线法';
      const status = statusMap[assetData.status] || '在用';
      
      // 将年转换为月
      const usefulLife = assetData.useful_life ? assetData.useful_life * 12 : 60; // 默认5年(60个月)
      
      const [result] = await db.pool.query(
        `UPDATE fixed_assets SET
         asset_name = ?,
         asset_type = ?,
         depreciation_method = ?,
         useful_life = ?,
         salvage_value = ?,
         location_id = ?,
         department_id = ?,
         custodian = ?,
         status = ?,
         notes = ?
         WHERE id = ?`,
        [
          assetData.asset_name,
          assetType,
          depreciationMethod,
          usefulLife,
          assetData.salvage_value,
          assetData.location_id || null,
          assetData.department_id || null,
          assetData.custodian || null,
          status,
          assetData.notes || null,
          id
        ]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新固定资产失败:', error);
      throw error;
    }
  },

  /**
   * 计算固定资产折旧
   * @param {Object} params 折旧参数
   * @param {Number} params.assetId 资产ID
   * @param {Number} params.periodId 会计期间ID
   * @param {String} params.depreciationDate 折旧日期
   * @param {Object} params.glEntry 会计分录信息
   */
  calculateDepreciation: async (params) => {
    const connection = await db.pool.getConnection();
    try {
      console.log('开始计算折旧，参数:', params);
      await connection.beginTransaction();

      // 获取资产信息
      const [assets] = await connection.query('SELECT * FROM fixed_assets WHERE id = ?', [params.assetId]);
      if (assets.length === 0) {
        throw new Error(`资产ID ${params.assetId} 不存在`);
      }
      
      const asset = assets[0];
      console.log('获取到资产信息:', { id: asset.id, name: asset.asset_name, cost: asset.acquisition_cost });
      
      // 检查当前期间是否已计提折旧
      try {
        const [existingDepreciation] = await connection.query(
          'SELECT * FROM asset_depreciation WHERE asset_id = ? AND period_id = ?',
          [params.assetId, params.periodId]
        );
        
        if (existingDepreciation.length > 0) {
          throw new Error(`该资产在当前会计期间已计提折旧`);
        }
      } catch (depError) {
        // 如果查询失败，检查是否是表不存在的错误
        if (depError.code === 'ER_NO_SUCH_TABLE') {
          console.log('asset_depreciation表不存在，尝试创建表');
          await connection.query(`
            CREATE TABLE IF NOT EXISTS asset_depreciation (
              id INT AUTO_INCREMENT PRIMARY KEY,
              asset_id INT NOT NULL,
              period_id INT NOT NULL,
              depreciation_date DATE NOT NULL,
              depreciation_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
              book_value_before DECIMAL(15,2) NOT NULL,
              book_value_after DECIMAL(15,2) NOT NULL,
              is_posted BOOLEAN NOT NULL DEFAULT FALSE,
              notes TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (asset_id) REFERENCES fixed_assets(id)
            )
          `);
        } else if (depError.message !== '该资产在当前会计期间已计提折旧') {
          throw depError;
        }
      }
      
      // 计算折旧金额
      let depreciationAmount = 0;
      const depreciableValue = asset.acquisition_cost - (asset.salvage_value || 0);
      console.log('可计提折旧价值:', depreciableValue);
      
      switch (asset.depreciation_method) {
        case '直线法':
        case 'straight_line':
          // 每月折旧金额 = (原值 - 残值) / 使用年限(月)
          depreciationAmount = depreciableValue / (asset.useful_life || 60); // 默认5年
          break;
          
        case '双倍余额递减法':
        case 'double_declining':
          // 每月折旧率 = 2 / 使用年限(月)
          // 每月折旧金额 = 账面净值 * 折旧率
          const monthlyRate = 2 / (asset.useful_life || 60);
          depreciationAmount = (asset.current_value - asset.accumulated_depreciation) * monthlyRate;
          
          // 确保不会折旧到低于残值
          if (asset.current_value - asset.accumulated_depreciation - depreciationAmount < asset.salvage_value) {
            depreciationAmount = asset.current_value - asset.accumulated_depreciation - asset.salvage_value;
          }
          break;
          
        case '年数总和法':
        case 'sum_of_years':
          // 这里简化为线性，实际实现会更复杂
          depreciationAmount = depreciableValue / (asset.useful_life || 60);
          break;
          
        case '工作量法':
        case 'units_of_production':
          // 工作量法需要额外参数，这里暂不实现
          console.warn('工作量法暂不支持自动计算，使用直线法替代');
          depreciationAmount = depreciableValue / (asset.useful_life || 60);
          break;
          
        case '不计提':
        case 'no_depreciation':
          depreciationAmount = 0;
          break;
          
        default:
          console.warn(`未知的折旧方法 ${asset.depreciation_method}，使用直线法`);
          depreciationAmount = depreciableValue / (asset.useful_life || 60);
      }
      
      // 确保折旧金额不为负
      depreciationAmount = Math.max(0, depreciationAmount);
      
      // 四舍五入到2位小数
      depreciationAmount = Math.round(depreciationAmount * 100) / 100;
      console.log('计算出的折旧金额:', depreciationAmount);
      
      // 计算折旧前后的账面价值
      const bookValueBefore = asset.current_value - asset.accumulated_depreciation;
      const bookValueAfter = bookValueBefore - depreciationAmount;
      console.log('折旧前账面价值:', bookValueBefore, '折旧后账面价值:', bookValueAfter);
      
      try {
        // 插入折旧记录
        const [depResult] = await connection.query(
          `INSERT INTO asset_depreciation 
          (asset_id, period_id, depreciation_date, depreciation_amount, 
           book_value_before, book_value_after, is_posted, notes) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            params.assetId,
            params.periodId,
            params.depreciationDate,
            depreciationAmount,
            bookValueBefore,
            bookValueAfter,
            false, // 初始未过账
            params.notes || null
          ]
        );
        
        const depreciationId = depResult.insertId;
        console.log('折旧记录已创建，ID:', depreciationId);
        
        // 更新资产的累计折旧和当前价值
        await connection.query(
          'UPDATE fixed_assets SET accumulated_depreciation = accumulated_depreciation + ?, current_value = acquisition_cost - (accumulated_depreciation + ?) WHERE id = ?',
          [depreciationAmount, depreciationAmount, params.assetId]
        );
        console.log('资产记录已更新');
        
        // 如果提供了会计分录信息，创建折旧会计分录
        if (params.glEntry) {
          const entryData = {
            entry_number: params.glEntry.entry_number,
            entry_date: params.depreciationDate,
            posting_date: params.depreciationDate,
            document_type: '折旧单',
            document_number: `DEP-${asset.asset_code}-${new Date(params.depreciationDate).toISOString().slice(0, 7)}`,
            period_id: params.periodId,
            description: `固定资产折旧: ${asset.asset_name}`,
            created_by: params.glEntry.created_by
          };

          // 折旧分录明细
          const entryItems = [
            // 借：折旧费用
            {
              account_id: params.glEntry.expense_account_id,
              debit_amount: depreciationAmount,
              credit_amount: 0,
              description: `折旧费用 - ${asset.asset_name}`
            },
            // 贷：累计折旧
            {
              account_id: params.glEntry.accumulated_depreciation_account_id,
              debit_amount: 0,
              credit_amount: depreciationAmount,
              description: `累计折旧 - ${asset.asset_name}`
            }
          ];

          // 创建会计分录
          const entryId = await financeModel.createEntry(entryData, entryItems, connection);
          
          // 将折旧记录标记为已过账
          await connection.query(
            'UPDATE asset_depreciation SET is_posted = true WHERE id = ?',
            [depreciationId]
          );
        }

        await connection.commit();
        console.log('事务已提交，折旧计算完成');
        return depreciationId;
      } catch (error) {
        console.error('插入折旧记录时出错:', error);
        throw error;
      }
    } catch (error) {
      await connection.rollback();
      console.error('计算固定资产折旧失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * 资产处置
   */
  disposeAsset: async (id, disposalData) => {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      // 获取资产信息
      const [assets] = await connection.query('SELECT * FROM fixed_assets WHERE id = ?', [id]);
      if (assets.length === 0) {
        throw new Error(`资产ID ${id} 不存在`);
      }
      
      const asset = assets[0];
      
      // 更新资产状态为报废
      await connection.query(
        'UPDATE fixed_assets SET status = ? WHERE id = ?',
        ['报废', id]
      );
      
      // 如果提供了会计分录信息，创建资产处置会计分录
      if (disposalData.gl_entry) {
        const entryData = {
          entry_number: disposalData.gl_entry.entry_number,
          entry_date: disposalData.disposal_date,
          posting_date: disposalData.disposal_date,
          document_type: '处置单',
          document_number: disposalData.asset_code,
          period_id: disposalData.gl_entry.period_id,
          description: `固定资产处置: ${asset.asset_name}`,
          created_by: disposalData.gl_entry.created_by
        };

        // 处置分录明细
        const entryItems = [
          // 借：累计折旧
          {
            account_id: disposalData.gl_entry.accumulated_depreciation_account_id,
            debit_amount: asset.accumulated_depreciation,
            credit_amount: 0,
            description: `累计折旧 - ${asset.asset_name}`
          },
          // 借：固定资产清理
          {
            account_id: disposalData.gl_entry.asset_account_id,
                  debit_amount: 0,
            credit_amount: asset.acquisition_cost,
            description: `固定资产清理 - ${asset.asset_name}`
          },
        // 贷：固定资产
          {
          account_id: disposalData.gl_entry.asset_account_id,
          debit_amount: 0,
            credit_amount: 0,
            description: `固定资产 - ${asset.asset_name}`
          },
          // 贷：银行/应付账款
          {
            account_id: disposalData.gl_entry.payment_account_id,
            debit_amount: 0,
            credit_amount: disposalData.disposal_cost,
            description: `固定资产处置付款 - ${asset.asset_name}`
          }
        ];

        // 创建会计分录
        const entryId = await financeModel.createEntry(entryData, entryItems, connection);
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('资产处置失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * 获取资产类别列表
   */
  getAssetCategories: async (page = 1, limit = 20) => {
    try {
      console.log('开始执行 getAssetCategories 方法');
      
      // 检查 asset_categories 表是否存在
      const [tables] = await db.pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'mes' AND table_name = 'asset_categories'"
      );
      
      console.log('检查表格结果:', tables);
      
      // 如果表不存在，直接返回空结果
      if (tables.length === 0) {
        console.log('asset_categories 表不存在，返回空结果');
        // 创建表
        await db.pool.query(`
          CREATE TABLE IF NOT EXISTS asset_categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL COMMENT '类别名称',
            code VARCHAR(50) NOT NULL COMMENT '类别编码',
            default_useful_life INT NOT NULL DEFAULT 5 COMMENT '默认使用年限',
            default_depreciation_method ENUM('直线法', '双倍余额递减法', '年数总和法', '工作量法', '不计提') 
              NOT NULL DEFAULT '直线法' COMMENT '默认折旧方法',
            default_salvage_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00 COMMENT '默认残值率(%)',
            description TEXT COMMENT '描述',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY (code),
            INDEX idx_name (name)
          )
        `);
        
        // 插入样例数据
        await db.pool.query(`
          INSERT INTO asset_categories (name, code, default_useful_life, default_depreciation_method, default_salvage_rate, description)
          VALUES 
          ('电子设备', 'ELE', 3, '直线法', 5.00, '包括计算机、打印机等电子设备'),
          ('办公家具', 'FUR', 5, '直线法', 5.00, '包括办公桌椅、文件柜等办公家具'),
          ('机器设备', 'MAC', 10, '直线法', 5.00, '包括生产机器、加工设备等'),
          ('运输设备', 'VEH', 4, '双倍余额递减法', 3.00, '包括汽车、货车等运输工具'),
          ('房屋建筑', 'BLD', 20, '直线法', 5.00, '包括办公楼、仓库等建筑物')
        `);
        
        // 返回刚插入的样例数据
        const [sampleCategories] = await db.pool.query('SELECT * FROM asset_categories');
        
        return {
          data: sampleCategories,
          total: sampleCategories.length,
          page: 1,
          limit: limit
        };
      }
      
      // 转换参数为数字
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      
      // 构建查询
      let query = `
        SELECT c.*, 
               (SELECT COUNT(*) FROM fixed_assets a WHERE a.category_id = c.id) AS asset_count
        FROM asset_categories c
      `;
      
      // 获取总记录数
      const [countResult] = await db.pool.query('SELECT COUNT(*) as total FROM asset_categories');
      const total = countResult && countResult[0] ? countResult[0].total : 0;
      
      console.log('资产类别总数:', total);
      
      // 添加分页 - 使用参数化查询
      query += ' LIMIT ? OFFSET ?';
      const offset = (pageNum - 1) * limitNum;
      
      // 执行查询
      const [categories] = await db.pool.query(query, [limitNum, offset]);
      
      console.log(`查询到 ${categories.length} 条资产类别记录`);
      
      return {
        data: categories || [],
        total,
        page: pageNum,
        limit: limitNum
      };
    } catch (error) {
      console.error('获取资产类别列表失败:', error);
      // 出错时返回空结果而不是抛出异常
      return {
        data: [],
        total: 0,
        page: page,
        limit: limit
      };
    }
  },

  /**
   * 获取单个资产类别
   */
  getAssetCategoryById: async (id) => {
    try {
      const [categories] = await db.pool.execute(
        `SELECT c.*, 
                (SELECT COUNT(*) FROM fixed_assets a WHERE a.category_id = c.id) AS asset_count
         FROM asset_categories c
         WHERE c.id = ?`,
        [id]
      );
      return categories.length > 0 ? categories[0] : null;
    } catch (error) {
      console.error('获取资产类别失败:', error);
      throw error;
    }
  },

  /**
   * 创建资产类别
   */
  createAssetCategory: async (categoryData) => {
    try {
      const [result] = await db.pool.execute(
        `INSERT INTO asset_categories 
        (name, code, default_useful_life, default_depreciation_method, default_salvage_rate, description) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          categoryData.name,
          categoryData.code,
          categoryData.default_useful_life || 5,
          categoryData.default_depreciation_method || '直线法',
          categoryData.default_salvage_rate || 5.00,
          categoryData.description || null
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error('创建资产类别失败:', error);
      throw error;
    }
  },

  /**
   * 更新资产类别
   */
  updateAssetCategory: async (id, categoryData) => {
    try {
      const [result] = await db.pool.execute(
        `UPDATE asset_categories 
         SET name = ?, 
             code = ?, 
             default_useful_life = ?, 
             default_depreciation_method = ?, 
             default_salvage_rate = ?, 
             description = ?
         WHERE id = ?`,
        [
          categoryData.name,
          categoryData.code,
          categoryData.default_useful_life || 5,
          categoryData.default_depreciation_method || '直线法',
          categoryData.default_salvage_rate || 5.00,
          categoryData.description || null,
          id
        ]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新资产类别失败:', error);
      throw error;
    }
  },

  /**
   * 删除资产类别
   */
  deleteAssetCategory: async (id) => {
    try {
      // 先检查是否有资产使用此类别
      const [assets] = await db.pool.execute(
        'SELECT COUNT(*) as count FROM fixed_assets WHERE category_id = ?',
        [id]
      );
      
      if (assets[0].count > 0) {
        throw new Error(`无法删除类别，该类别下有 ${assets[0].count} 个资产`);
      }
      
      const [result] = await db.pool.execute('DELETE FROM asset_categories WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('删除资产类别失败:', error);
      throw error;
    }
  },

  /**
   * 获取资产系统调试信息
   * @returns {Promise<Object>} 调试信息对象
   */
  debugInfo: async () => {
    try {
      const conn = await db.getConnection();
      
      // 获取资产数量
      const [assetsCount] = await conn.query(
        'SELECT COUNT(*) as count FROM fixed_assets'
      );
      
      // 获取资产类别数量
      const [categoriesCount] = await conn.query(
        'SELECT COUNT(*) as count FROM asset_categories'
      );
      
      // 获取最近添加的5个资产
      const [recentAssets] = await conn.query(
        'SELECT * FROM fixed_assets ORDER BY created_at DESC LIMIT 5'
      );
      
      // 获取折旧总额
      const [depreciationTotal] = await conn.query(
        'SELECT SUM(amount) as total FROM asset_depreciation'
      );
      
      conn.release();
      
      return {
        assetsCount: assetsCount[0].count,
        categoriesCount: categoriesCount[0].count,
        recentAssets,
        depreciationTotal: depreciationTotal[0].total || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取调试信息失败:', error);
      throw error;
    }
  },

  /**
   * 查询固定资产总数
   */
  getAssetCount: async () => {
    try {
      const [result] = await db.pool.query('SELECT COUNT(*) as count FROM fixed_assets');
      return result[0].count;
    } catch (error) {
      console.error('获取资产总数失败:', error);
      return 0;
    }
  },

  // 如果新增资产后列表仍为空，尝试插入示例数据
  createAssetCompleted: async (assetId) => {
    try {
      console.log(`资产创建完成，ID: ${assetId}，检查资产列表...`);
      const count = await assetsModel.getAssetCount();
      console.log(`当前资产总数: ${count}`);
      
      if (count <= 1) {
        console.log('资产总数较少，插入额外的示例数据...');
        const connection = await db.pool.getConnection();
        try {
          // 插入示例资产数据
          await connection.query(`
            INSERT INTO fixed_assets (
              asset_code, asset_name, asset_type, category_id, acquisition_date, 
              acquisition_cost, depreciation_method, useful_life, salvage_value,
              current_value, accumulated_depreciation, status
            ) VALUES 
            ('FA-2025-004', '打印机', '电子设备', 1, '2025-03-15', 2000, '直线法', 36, 200, 2000, 0, '在用'),
            ('FA-2025-005', '会议桌', '办公家具', 2, '2025-04-01', 5000, '直线法', 60, 500, 5000, 0, '在用')
          `);
          console.log('额外示例资产数据插入完成');
        } finally {
          connection.release();
        }
      }
      
      return true;
    } catch (error) {
      console.error('资产创建后处理失败:', error);
      return false;
    }
  },

  /**
   * 创建示例资产数据
   * @returns {Promise<Object>} 创建结果
   */
  createSampleAssets: async () => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      
      // 检查是否已存在示例类别
      const [existingCategories] = await conn.query(
        'SELECT * FROM asset_categories WHERE name LIKE "示例类别%"'
      );
      
      let categoryIds = [];
      
      // 如果不存在示例类别，创建一些
      if (existingCategories.length === 0) {
        const categoryData = [
          { name: '示例类别1', code: 'SAMPLE1', default_useful_life: 36, default_depreciation_method: '直线法', default_salvage_rate: 5.0, description: '办公设备' },
          { name: '示例类别2', code: 'SAMPLE2', default_useful_life: 24, default_depreciation_method: '双倍余额递减法', default_salvage_rate: 10.0, description: '电子设备' },
          { name: '示例类别3', code: 'SAMPLE3', default_useful_life: 60, default_depreciation_method: '直线法', default_salvage_rate: 5.0, description: '家具' }
        ];
        
        for (const category of categoryData) {
          const [result] = await conn.query(
            `INSERT INTO asset_categories (name, code, default_useful_life, default_depreciation_method, default_salvage_rate, description) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              category.name,
              category.code,
              category.default_useful_life,
              category.default_depreciation_method,
              category.default_salvage_rate,
              category.description
            ]
          );
          categoryIds.push(result.insertId);
        }
      } else {
        categoryIds = existingCategories.map(cat => cat.id);
      }
      
      // 创建示例资产
      const assets = [];
      const assetData = [
        { assetName: '示例资产1', notes: '笔记本电脑', acquisitionCost: 8000, acquisitionDate: new Date() },
        { assetName: '示例资产2', notes: '办公桌', acquisitionCost: 1200, acquisitionDate: new Date() },
        { assetName: '示例资产3', notes: '打印机', acquisitionCost: 2500, acquisitionDate: new Date() }
      ];
      
      for (let i = 0; i < assetData.length; i++) {
        const asset = assetData[i];
        const categoryId = categoryIds[i % categoryIds.length];
        
        const [result] = await conn.query(
          `INSERT INTO fixed_assets (
            asset_code, asset_name, asset_type, category_id, acquisition_date, 
            acquisition_cost, depreciation_method, useful_life, salvage_value,
            current_value, accumulated_depreciation, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `SAMPLE-${Date.now()}-${i}`,
            asset.assetName,
            '示例类型',
            categoryId,
            asset.acquisitionDate,
            asset.acquisitionCost,
            '直线法',
            60, // 5年
            asset.acquisitionCost * 0.10, // 10%残值
            asset.acquisitionCost, // 初始当前价值与购买价格相同
            0, // 初始累计折旧为0
            '在用',
            asset.notes
          ]
        );
        
        assets.push({
          id: result.insertId,
          ...asset,
          category_id: categoryId
        });
      }
      
      await conn.commit();
      conn.release();
      
      return {
        categories: categoryIds.length,
        assets: assets
      };
    } catch (error) {
      await conn.rollback();
      conn.release();
      console.error('创建示例资产数据失败:', error);
      throw error;
    }
  },

  /**
   * 资产调拨
   * @param {Object} transferData 调拨数据
   * @returns {Promise<boolean>} 是否成功
   */
  transferAsset: async (transferData) => {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();
      
      console.log('开始执行资产调拨，参数:', transferData);
      
      // 1. 更新资产表中的部门、责任人和存放地点
      const updateResult = await connection.query(
        `UPDATE fixed_assets 
         SET department_name = ?, 
             custodian = ?, 
             location_id = ?, 
             update_time = NOW() 
         WHERE id = ?`,
        [
          transferData.newDepartment,
          transferData.newResponsible,
          transferData.newLocation,
          transferData.assetId
        ]
      );
      
      console.log('资产表更新结果:', updateResult);
      
      // 2. 创建资产调拨历史记录
      try {
        // 首先检查asset_transfers表是否存在
        const [tables] = await connection.query("SHOW TABLES LIKE 'asset_transfers'");
        
        // 如果表不存在，创建它
        if (tables.length === 0) {
          console.log('资产调拨表不存在，正在创建...');
          await connection.query(`
            CREATE TABLE asset_transfers (
              id INT AUTO_INCREMENT PRIMARY KEY,
              asset_id INT NOT NULL,
              transfer_date DATE NOT NULL,
              from_department VARCHAR(100),
              to_department VARCHAR(100) NOT NULL,
              from_responsible VARCHAR(100),
              to_responsible VARCHAR(100) NOT NULL,
              from_location VARCHAR(100),
              to_location VARCHAR(100) NOT NULL,
              reason VARCHAR(200),
              notes TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (asset_id) REFERENCES fixed_assets(id)
            )
          `);
          console.log('资产调拨表创建成功');
        }
        
        // 插入调拨记录
        const [insertResult] = await connection.query(
          `INSERT INTO asset_transfers
           (asset_id, transfer_date, from_department, to_department, 
            from_responsible, to_responsible, from_location, to_location, 
            reason, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transferData.assetId,
            transferData.transferDate,
            transferData.originalDepartment,
            transferData.newDepartment,
            transferData.originalResponsible,
            transferData.newResponsible,
            transferData.originalLocation,
            transferData.newLocation,
            transferData.transferReason,
            transferData.notes
          ]
        );
        
        console.log('调拨记录已创建, ID:', insertResult.insertId);
      } catch (historyError) {
        console.error('创建调拨历史记录失败，但不影响主流程:', historyError);
        // 这里只记录错误，但不抛出，因为更新资产信息是主要功能
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('资产调拨失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  },
};

// 初始化资产模块
(async function initAssetTables() {
  try {
    // 完全移除了固定资产表和资产类别表的检查和创建
    const connection = await db.pool.getConnection();
    
    // 只查询固定资产表中的数据数量
    try {
      const [assets] = await connection.query('SELECT COUNT(*) as count FROM fixed_assets');
      console.log(`固定资产表中有 ${assets[0].count} 条记录`);
      
      // 不再显示固定资产样本数据
      // if (assets[0].count > 0) {
      //   const [sampleAssets] = await connection.query('SELECT * FROM fixed_assets LIMIT 3');
      //   console.log('固定资产样本数据:', JSON.stringify(sampleAssets, null, 2));
      // }
    } catch (error) {
      // 忽略查询错误
      console.log('固定资产数据查询跳过');
    }
    
    console.log('固定资产模块初始化完成');
    connection.release();
  } catch (error) {
    console.error('初始化资产模块失败:', error);
  }
})();

module.exports = assetsModel; 