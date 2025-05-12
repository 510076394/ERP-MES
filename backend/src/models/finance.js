const db = require('../config/db');

/**
 * 财务模块数据库操作
 */
const financeModel = {
  /**
   * 创建财务模块相关表（如果不存在）
   */
  createFinanceTablesIfNotExist: async () => {
    try {
      // 此方法仅确认表存在，实际表创建在create-finance-tables.js中执行
      const [tables] = await db.pool.execute(`SHOW TABLES LIKE 'gl_%'`);
      if (tables.length === 0) {
        console.log('财务模块表不存在，请运行create-finance-tables.js创建表');
      } else {
        console.log('财务模块表已存在');
      }
      return true;
    } catch (error) {
      console.error('检查财务模块表失败:', error);
      throw error;
    }
  },

  // ===== 总账科目相关方法 =====
  
  /**
   * 获取所有会计科目
   */
  getAllAccounts: async () => {
    try {
      const [accounts] = await db.pool.execute('SELECT * FROM gl_accounts ORDER BY account_code');
      return accounts;
    } catch (error) {
      console.error('获取会计科目失败:', error);
      throw error;
    }
  },

  /**
   * 按ID获取会计科目
   */
  getAccountById: async (id) => {
    try {
      const [accounts] = await db.pool.execute('SELECT * FROM gl_accounts WHERE id = ?', [id]);
      return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('按ID获取会计科目失败:', error);
      throw error;
    }
  },

  /**
   * 创建会计科目
   */
  createAccount: async (accountData) => {
    try {
      const [result] = await db.pool.execute(
        'INSERT INTO gl_accounts (account_code, account_name, account_type, parent_id, is_debit, is_active, currency_code, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          accountData.account_code,
          accountData.account_name,
          accountData.account_type,
          accountData.parent_id || null,
          accountData.is_debit,
          accountData.is_active !== undefined ? accountData.is_active : true,
          accountData.currency_code || 'CNY',
          accountData.description || null
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error('创建会计科目失败:', error);
      throw error;
    }
  },

  /**
   * 更新会计科目
   */
  updateAccount: async (id, accountData) => {
    try {
      const [result] = await db.pool.execute(
        'UPDATE gl_accounts SET account_name = ?, account_type = ?, parent_id = ?, is_debit = ?, is_active = ?, currency_code = ?, description = ? WHERE id = ?',
        [
          accountData.account_name,
          accountData.account_type,
          accountData.parent_id || null,
          accountData.is_debit,
          accountData.is_active !== undefined ? accountData.is_active : true,
          accountData.currency_code || 'CNY',
          accountData.description || null,
          id
        ]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新会计科目失败:', error);
      throw error;
    }
  },

  /**
   * 删除会计科目（软删除，设置为非活跃）
   */
  deactivateAccount: async (id) => {
    try {
      const [result] = await db.pool.execute('UPDATE gl_accounts SET is_active = false WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('停用会计科目失败:', error);
      throw error;
    }
  },

  // ===== 会计分录相关方法 =====

  /**
   * 创建会计分录（包含明细）
   */
  createEntry: async (entryData, entryItems, connection = null) => {
    // 使用事务确保数据一致性
    const conn = connection || await db.pool.getConnection();
    try {
      await conn.beginTransaction();

      // 插入分录头
      const [entryResult] = await conn.execute(
        'INSERT INTO gl_entries (entry_number, entry_date, posting_date, document_type, document_number, period_id, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          entryData.entry_number,
          entryData.entry_date,
          entryData.posting_date,
          entryData.document_type,
          entryData.document_number || null,
          entryData.period_id,
          entryData.description || null,
          entryData.created_by
        ]
      );

      const entryId = entryResult.insertId;

      // 插入分录明细
      for (const item of entryItems) {
        await conn.execute(
          'INSERT INTO gl_entry_items (entry_id, account_id, debit_amount, credit_amount, currency_code, exchange_rate, cost_center_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            entryId,
            item.account_id,
            item.debit_amount || 0,
            item.credit_amount || 0,
            item.currency_code || 'CNY',
            item.exchange_rate || 1,
            item.cost_center_id || null,
            item.description || null
          ]
        );
      }

      await conn.commit();
      return entryId;
    } catch (error) {
      await conn.rollback();
      console.error('创建会计分录失败:', error);
      throw error;
    } finally {
      if (!connection) conn.release();
    }
  },

  /**
   * 按ID获取会计分录（包含明细）
   */
  getEntryById: async (id) => {
    try {
      // 获取分录头
      const [entries] = await db.pool.execute('SELECT * FROM gl_entries WHERE id = ?', [id]);
      if (entries.length === 0) return null;

      const entry = entries[0];

      // 获取分录明细
      const [items] = await db.pool.execute('SELECT * FROM gl_entry_items WHERE entry_id = ?', [id]);
      entry.items = items;

      return entry;
    } catch (error) {
      console.error('获取会计分录失败:', error);
      throw error;
    }
  },

  /**
   * 获取会计分录列表
   */
  getEntries: async (filters = {}, page = 1, pageSize = 20) => {
    let connection;
    try {
      console.log('开始获取会计分录列表，参数:', { filters, page, pageSize });
      
      // 获取数据库连接
      connection = await db.pool.getConnection();
      console.log('成功获取数据库连接');

      // 验证表是否存在
      const [tables] = await connection.execute("SHOW TABLES LIKE 'gl_entries'");
      if (tables.length === 0) {
        throw new Error('gl_entries 表不存在');
      }
      console.log('gl_entries 表存在');

      let query = 'SELECT * FROM gl_entries WHERE 1=1';
      const params = [];

      // 添加过滤条件
      if (filters.entry_number) {
        query += ' AND entry_number LIKE ?';
        params.push(`%${filters.entry_number}%`);
        console.log('添加分录编号过滤:', filters.entry_number);
      }
      
      if (filters.start_date && filters.end_date) {
        query += ' AND entry_date BETWEEN ? AND ?';
        params.push(filters.start_date, filters.end_date);
        console.log('添加日期范围过滤:', filters.start_date, filters.end_date);
      } else if (filters.start_date) {
        query += ' AND entry_date >= ?';
        params.push(filters.start_date);
        console.log('添加开始日期过滤:', filters.start_date);
      } else if (filters.end_date) {
        query += ' AND entry_date <= ?';
        params.push(filters.end_date);
        console.log('添加结束日期过滤:', filters.end_date);
      }
      
      if (filters.document_type) {
        query += ' AND document_type = ?';
        params.push(filters.document_type);
        console.log('添加单据类型过滤:', filters.document_type);
      }
      
      if (filters.period_id) {
        query += ' AND period_id = ?';
        params.push(parseInt(filters.period_id));
        console.log('添加会计期间过滤:', filters.period_id);
      }
      
      if (filters.is_posted !== undefined) {
        query += ' AND is_posted = ?';
        params.push(filters.is_posted === 'true' ? 1 : 0);
        console.log('添加过账状态过滤:', filters.is_posted);
      }

      // 添加排序和分页
      const limit = parseInt(pageSize);
      const offset = (parseInt(page) - 1) * limit;
      query += ' ORDER BY entry_date DESC, id DESC LIMIT ? OFFSET ?';
      params.push(limit.toString(), offset.toString());
      console.log('添加分页参数:', { limit, offset });

      console.log('执行查询:', query);
      console.log('查询参数:', params);

      // 执行查询
      const [entries] = await connection.execute(query, params);
      console.log('查询结果数量:', entries.length);
      
      // 获取总记录数
      let countQuery = 'SELECT COUNT(*) as total FROM gl_entries WHERE 1=1';
      const countParams = [];
      
      // 添加与主查询相同的过滤条件
      if (filters.entry_number) {
        countQuery += ' AND entry_number LIKE ?';
        countParams.push(`%${filters.entry_number}%`);
      }
      
      if (filters.start_date && filters.end_date) {
        countQuery += ' AND entry_date BETWEEN ? AND ?';
        countParams.push(filters.start_date, filters.end_date);
      } else if (filters.start_date) {
        countQuery += ' AND entry_date >= ?';
        countParams.push(filters.start_date);
      } else if (filters.end_date) {
        countQuery += ' AND entry_date <= ?';
        countParams.push(filters.end_date);
      }
      
      if (filters.document_type) {
        countQuery += ' AND document_type = ?';
        countParams.push(filters.document_type);
      }
      
      if (filters.period_id) {
        countQuery += ' AND period_id = ?';
        countParams.push(parseInt(filters.period_id));
      }
      
      if (filters.is_posted !== undefined) {
        countQuery += ' AND is_posted = ?';
        countParams.push(filters.is_posted === 'true' ? 1 : 0);
      }
      
      console.log('执行计数查询:', countQuery);
      console.log('计数查询参数:', countParams);
      
      const [countResult] = await connection.execute(countQuery, countParams);
      const total = countResult[0].total;
      console.log('总记录数:', total);
      
      const result = {
        entries,
        pagination: {
          total,
          page: parseInt(page),
          pageSize: limit,
          totalPages: Math.ceil(total / limit)
        }
      };
      
      console.log('返回结果:', result);
      return result;
    } catch (error) {
      console.error('获取会计分录列表失败:', error);
      console.error('错误堆栈:', error.stack);
      throw error;
    } finally {
      if (connection) {
        connection.release();
        console.log('释放数据库连接');
      }
    }
  },

  /**
   * 获取会计分录明细
   */
  getEntryItems: async (entryId) => {
    try {
      // 使用JOIN查询获取包含科目信息的明细
      const [items] = await db.pool.execute(`
        SELECT 
          ei.*, 
          a.account_code, 
          a.account_name
        FROM 
          gl_entry_items ei
        JOIN 
          gl_accounts a ON ei.account_id = a.id
        WHERE 
          ei.entry_id = ?
        ORDER BY 
          ei.id
      `, [entryId]);
      
      return items;
    } catch (error) {
      console.error('获取会计分录明细失败:', error);
      throw error;
    }
  },

  /**
   * 过账会计分录
   */
  postEntry: async (id) => {
    try {
      const [result] = await db.pool.execute('UPDATE gl_entries SET is_posted = true WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('过账会计分录失败:', error);
      throw error;
    }
  },

  /**
   * 冲销会计分录
   */
  reverseEntry: async (id, reversalData) => {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      // 获取原始分录及其明细
      const [entries] = await connection.execute('SELECT * FROM gl_entries WHERE id = ?', [id]);
      if (entries.length === 0) {
        throw new Error('找不到要冲销的分录');
      }
      
      const originalEntry = entries[0];
      const [items] = await connection.execute('SELECT * FROM gl_entry_items WHERE entry_id = ?', [id]);

      // 创建冲销分录头
      const [entryResult] = await connection.execute(
        'INSERT INTO gl_entries (entry_number, entry_date, posting_date, document_type, document_number, period_id, is_posted, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          reversalData.entry_number,
          reversalData.entry_date,
          reversalData.posting_date,
          originalEntry.document_type,
          originalEntry.document_number,
          reversalData.period_id,
          false,
          `冲销分录 ${originalEntry.entry_number}: ${reversalData.description || ''}`,
          reversalData.created_by
        ]
      );

      const reversalEntryId = entryResult.insertId;

      // 创建冲销分录明细（借贷方向相反）
      for (const item of items) {
        await connection.execute(
          'INSERT INTO gl_entry_items (entry_id, account_id, debit_amount, credit_amount, currency_code, exchange_rate, cost_center_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            reversalEntryId,
            item.account_id,
            item.credit_amount, // 借贷方向相反
            item.debit_amount,  // 借贷方向相反
            item.currency_code,
            item.exchange_rate,
            item.cost_center_id,
            `冲销明细: ${item.description || ''}`
          ]
        );
      }

      // 更新原始分录为已冲销
      await connection.execute(
        'UPDATE gl_entries SET is_reversed = true, reversal_entry_id = ? WHERE id = ?',
        [reversalEntryId, id]
      );

      await connection.commit();
      return reversalEntryId;
    } catch (error) {
      await connection.rollback();
      console.error('冲销会计分录失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  // ===== 会计期间相关方法 =====

  /**
   * 获取当前会计期间（未关闭的最新期间）
   */
  getCurrentPeriod: async () => {
    try {
      const [periods] = await db.pool.execute(
        'SELECT * FROM gl_periods WHERE is_closed = 0 ORDER BY end_date DESC LIMIT 1'
      );
      return periods.length > 0 ? periods[0] : null;
    } catch (error) {
      console.error('获取当前会计期间失败:', error);
      throw error;
    }
  },

  /**
   * 获取所有会计期间
   */
  getAllPeriods: async () => {
    try {
      const [periods] = await db.pool.execute('SELECT * FROM gl_periods ORDER BY fiscal_year DESC, start_date DESC');
      return periods;
    } catch (error) {
      console.error('获取会计期间失败:', error);
      throw error;
    }
  },

  /**
   * 按ID获取会计期间
   */
  getPeriodById: async (id) => {
    try {
      const [periods] = await db.pool.execute('SELECT * FROM gl_periods WHERE id = ?', [id]);
      return periods.length > 0 ? periods[0] : null;
    } catch (error) {
      console.error('按ID获取会计期间失败:', error);
      throw error;
    }
  },

  /**
   * 创建会计期间
   */
  createPeriod: async (periodData) => {
    try {
      const [result] = await db.pool.execute(
        'INSERT INTO gl_periods (period_name, start_date, end_date, is_closed, is_adjusting, fiscal_year) VALUES (?, ?, ?, ?, ?, ?)',
        [
          periodData.period_name,
          periodData.start_date,
          periodData.end_date,
          periodData.is_closed || false,
          periodData.is_adjusting || false,
          periodData.fiscal_year
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error('创建会计期间失败:', error);
      throw error;
    }
  },

  /**
   * 关闭会计期间
   */
  closePeriod: async (id) => {
    try {
      const [result] = await db.pool.execute('UPDATE gl_periods SET is_closed = true WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('关闭会计期间失败:', error);
      throw error;
    }
  },

  // ===== 系统初始化方法 =====
  
  /**
   * 初始化会计科目和会计期间
   */
  initializeGLAccounts: async () => {
    const conn = await db.pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // 检查基本会计科目是否存在
      const requiredAccounts = [
        { id: 1001, code: '1001', name: '现金', type: '资产' },
        { id: 1002, code: '1002', name: '银行存款', type: '资产' },
        { id: 2202, code: '2202', name: '应付账款', type: '负债' }
      ];
      
      console.log('开始检查和创建基本会计科目...');
      
      for (const account of requiredAccounts) {
        const [existingAccount] = await conn.execute(
          'SELECT id FROM gl_accounts WHERE id = ?',
          [account.id]
        );
        
        if (existingAccount.length === 0) {
          console.log(`创建会计科目: ${account.code} ${account.name}`);
          await conn.execute(
            'INSERT INTO gl_accounts (id, account_code, account_name, account_type, is_active) VALUES (?, ?, ?, ?, ?)',
            [account.id, account.code, account.name, account.type, true]
          );
        } else {
          console.log(`会计科目已存在: ${account.code} ${account.name}`);
        }
      }
      
      // 检查基本会计期间是否存在
      const [existingPeriod] = await conn.execute(
        'SELECT id FROM gl_periods WHERE id = ?',
        [1]
      );
      
      if (existingPeriod.length === 0) {
        const currentYear = new Date().getFullYear();
        console.log(`创建会计期间: ${currentYear}年`);
        await conn.execute(
          'INSERT INTO gl_periods (id, name, start_date, end_date, is_closed) VALUES (?, ?, ?, ?, ?)',
          [1, `${currentYear}年`, `${currentYear}-01-01`, `${currentYear}-12-31`, false]
        );
      } else {
        console.log('会计期间已存在');
      }
      
      await conn.commit();
      console.log('会计科目和会计期间初始化完成');
      return true;
    } catch (error) {
      await conn.rollback();
      console.error('初始化会计科目和会计期间失败:', error);
      throw error;
    } finally {
      conn.release();
    }
  },

  /**
   * 创建财务系统所需的表格
   */
  createTables: async () => {
    try {
      console.log('开始创建财务系统表格...');
      
      // 创建会计科目表
      await db.pool.execute(`
        CREATE TABLE IF NOT EXISTS gl_accounts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50) NOT NULL,
          name VARCHAR(100) NOT NULL,
          type ENUM('资产', '负债', '权益', '收入', '费用') NOT NULL,
          parent_id INT,
          level INT DEFAULT 1,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX (code),
          INDEX (parent_id)
        )
      `);
      
      // 创建会计期间表
      await db.pool.execute(`
        CREATE TABLE IF NOT EXISTS gl_periods (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          is_closed BOOLEAN DEFAULT false,
          closed_by INT,
          closed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX (start_date, end_date)
        )
      `);
      
      // 创建会计分录表
      await db.pool.execute(`
        CREATE TABLE IF NOT EXISTS gl_entries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          entry_number VARCHAR(50) NOT NULL,
          entry_date DATE NOT NULL,
          posting_date DATE,
          document_type VARCHAR(50),
          document_number VARCHAR(50),
          period_id INT,
          description TEXT,
          is_posted BOOLEAN DEFAULT false,
          created_by VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX (entry_date),
          INDEX (period_id),
          INDEX (entry_number)
        )
      `);
      
      // 创建会计分录明细表
      await db.pool.execute(`
        CREATE TABLE IF NOT EXISTS gl_entry_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          entry_id INT NOT NULL,
          account_id INT NOT NULL,
          debit_amount DECIMAL(15,2) DEFAULT 0,
          credit_amount DECIMAL(15,2) DEFAULT 0,
          currency_code VARCHAR(10) DEFAULT 'CNY',
          exchange_rate DECIMAL(15,5) DEFAULT 1,
          cost_center_id INT,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX (entry_id),
          INDEX (account_id),
          FOREIGN KEY (entry_id) REFERENCES gl_entries(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES gl_accounts(id) ON DELETE RESTRICT
        )
      `);
      
      console.log('财务系统表格创建完成');
      return true;
    } catch (error) {
      console.error('创建财务系统表格失败:', error);
      throw error;
    }
  },
};

module.exports = financeModel; 