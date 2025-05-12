const db = require('../config/db');
const sequelize = require('../config/sequelize');
const financeModel = require('./finance');
const { DataTypes } = require('sequelize');
const BankAccount = require('./bankAccount');

/**
 * 现金管理模块数据库操作
 */
const cashModel = {
  /**
   * 创建银行账户
   */
  createBankAccount: async (accountData) => {
    try {
      const [result] = await db.pool.execute(
        `INSERT INTO bank_accounts 
        (account_number, account_name, bank_name, branch_name, 
         currency_code, current_balance, account_type, is_active, 
         contact_person, contact_phone, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          accountData.account_number,
          accountData.account_name,
          accountData.bank_name,
          accountData.branch_name || null,
          accountData.currency_code || 'CNY',
          accountData.current_balance || 0,
          accountData.account_type || '活期',
          accountData.is_active !== undefined ? accountData.is_active : true,
          accountData.contact_person || null,
          accountData.contact_phone || null,
          accountData.notes || null
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error('创建银行账户失败:', error);
      throw error;
    }
  },

  /**
   * 按ID获取银行账户
   */
  getBankAccountById: async (id) => {
    try {
      const [accounts] = await db.pool.execute('SELECT * FROM bank_accounts WHERE id = ?', [id]);
      return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('获取银行账户失败:', error);
      throw error;
    }
  },

  /**
   * 获取银行账户列表
   */
  getBankAccounts: async (filters = {}) => {
    try {
      console.log('开始从数据库获取银行账户，过滤条件:', filters);
      
      let query = 'SELECT * FROM bank_accounts WHERE 1=1';
      const params = [];

      if (filters.account_number) {
        query += ' AND account_number LIKE ?';
        params.push(`%${filters.account_number}%`);
      }
      
      if (filters.account_name) {
        query += ' AND account_name LIKE ?';
        params.push(`%${filters.account_name}%`);
      }
      
      if (filters.bank_name) {
        query += ' AND bank_name LIKE ?';
        params.push(`%${filters.bank_name}%`);
      }
      
      if (filters.currency_code) {
        query += ' AND currency_code = ?';
        params.push(filters.currency_code);
      }
      
      if (filters.account_type) {
        query += ' AND account_type = ?';
        params.push(filters.account_type);
      }
      
      if (filters.is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      query += ' ORDER BY bank_name, account_name';
      
      console.log('SQL查询:', query);
      console.log('SQL参数:', params);

      const [accounts] = await db.pool.execute(query, params);
      console.log(`查询成功，获取到 ${accounts.length} 个银行账户`);
      
      return accounts;
    } catch (error) {
      console.error('获取银行账户列表失败:', error);
      // 重新抛出错误，但添加更多上下文信息
      const enhancedError = new Error(`获取银行账户列表时发生错误: ${error.message}`);
      enhancedError.originalError = error;
      throw enhancedError;
    }
  },

  /**
   * 更新银行账户
   */
  updateBankAccount: async (id, accountData) => {
    try {
      const [result] = await db.pool.execute(
        `UPDATE bank_accounts SET
         account_name = ?,
         bank_name = ?,
         branch_name = ?,
         currency_code = ?,
         account_type = ?,
         is_active = ?,
         contact_person = ?,
         contact_phone = ?,
         notes = ?
         WHERE id = ?`,
        [
          accountData.account_name,
          accountData.bank_name,
          accountData.branch_name || null,
          accountData.currency_code || 'CNY',
          accountData.account_type || '活期',
          accountData.is_active !== undefined ? accountData.is_active : true,
          accountData.contact_person || null,
          accountData.contact_phone || null,
          accountData.notes || null,
          id
        ]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新银行账户失败:', error);
      throw error;
    }
  },

  /**
   * 更新银行账户状态
   */
  updateBankAccountStatus: async (id, isActive) => {
    try {
      const [result] = await db.pool.execute(
        `UPDATE bank_accounts SET
         is_active = ?
         WHERE id = ?`,
        [isActive, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新银行账户状态失败:', error);
      throw error;
    }
  },

  /**
   * 创建银行交易
   */
  createBankTransaction: async (transactionData) => {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      console.log('开始创建银行交易，数据:', transactionData);
      
      // 插入银行交易
      const [result] = await connection.execute(
        `INSERT INTO bank_transactions 
        (transaction_number, bank_account_id, transaction_date, transaction_type, 
         amount, reference_number, description, is_reconciled, 
         reconciliation_date, related_party) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionData.transaction_number,
          transactionData.bank_account_id,
          transactionData.transaction_date,
          transactionData.transaction_type,
          transactionData.amount,
          transactionData.reference_number || null,
          transactionData.description || null,
          transactionData.is_reconciled || false,
          transactionData.reconciliation_date || null,
          transactionData.related_party || null
        ]
      );

      const transactionId = result.insertId;
      console.log('银行交易插入成功，ID:', transactionId);

      // 更新银行账户余额
      const [bankAccounts] = await connection.execute('SELECT * FROM bank_accounts WHERE id = ?', [transactionData.bank_account_id]);
      if (bankAccounts.length === 0) {
        throw new Error(`银行账户ID ${transactionData.bank_account_id} 不存在`);
      }
      
      const bankAccount = bankAccounts[0];
      let newBalance = parseFloat(bankAccount.current_balance);
      
      // 根据交易类型调整余额
      switch (transactionData.transaction_type) {
        case '存款':
        case '转入':
        case '利息':
          newBalance += parseFloat(transactionData.amount);
          break;
        case '取款':
        case '转出':
        case '费用':
          newBalance -= parseFloat(transactionData.amount);
          break;
        default:
          // 其他类型需要明确指定金额的正负
          newBalance += parseFloat(transactionData.amount);
      }
      
      console.log(`更新银行账户余额，账户ID: ${transactionData.bank_account_id}，原余额: ${bankAccount.current_balance}，新余额: ${newBalance}`);
      
      // 更新银行账户余额
      await connection.execute(
        'UPDATE bank_accounts SET current_balance = ? WHERE id = ?',
        [newBalance, transactionData.bank_account_id]
      );

      // 如果提供了会计分录信息，创建相应的会计分录
      if (transactionData.gl_entry && typeof transactionData.gl_entry === 'object') {
        console.log('处理会计分录数据:', transactionData.gl_entry);
        
        const entryData = {
          entry_number: transactionData.gl_entry.entry_number,
          entry_date: transactionData.transaction_date,
          posting_date: transactionData.transaction_date,
          document_type: '银行交易',
          document_number: transactionData.transaction_number,
          period_id: transactionData.gl_entry.period_id,
          description: transactionData.description || `银行交易: ${transactionData.transaction_type}`,
          created_by: transactionData.gl_entry.created_by
        };

        // 根据交易类型创建不同的分录明细
        let entryItems = [];
        
        switch (transactionData.transaction_type) {
          case '存款':
          case '转入':
            // 借：银行账户
            entryItems = [
              {
                account_id: transactionData.gl_entry.bank_account_id,
                debit_amount: transactionData.amount,
                credit_amount: 0,
                description: `银行${transactionData.transaction_type} - ${bankAccount.bank_name} ${bankAccount.account_name}`
              },
              // 贷：来源账户（如现金、其他银行等）
              {
                account_id: transactionData.gl_entry.contra_account_id,
                debit_amount: 0,
                credit_amount: transactionData.amount,
                description: `银行${transactionData.transaction_type}来源 - ${transactionData.related_party || ''}`
              }
            ];
            break;
            
          case '取款':
          case '转出':
            // 借：目标账户（如现金、其他银行等）
            entryItems = [
              {
                account_id: transactionData.gl_entry.contra_account_id,
                debit_amount: transactionData.amount,
                credit_amount: 0,
                description: `银行${transactionData.transaction_type}目标 - ${transactionData.related_party || ''}`
              },
              // 贷：银行账户
              {
                account_id: transactionData.gl_entry.bank_account_id,
                debit_amount: 0,
                credit_amount: transactionData.amount,
                description: `银行${transactionData.transaction_type} - ${bankAccount.bank_name} ${bankAccount.account_name}`
              }
            ];
            break;
            
          case '利息':
            // 借：银行账户
            entryItems = [
              {
                account_id: transactionData.gl_entry.bank_account_id,
                debit_amount: transactionData.amount,
                credit_amount: 0,
                description: `银行利息 - ${bankAccount.bank_name} ${bankAccount.account_name}`
              },
              // 贷：利息收入
              {
                account_id: transactionData.gl_entry.interest_account_id,
                debit_amount: 0,
                credit_amount: transactionData.amount,
                description: `银行利息收入`
              }
            ];
            break;
            
          case '费用':
            // 借：银行费用
            entryItems = [
              {
                account_id: transactionData.gl_entry.expense_account_id,
                debit_amount: transactionData.amount,
                credit_amount: 0,
                description: `银行费用 - ${bankAccount.bank_name} ${bankAccount.account_name}`
              },
              // 贷：银行账户
              {
                account_id: transactionData.gl_entry.bank_account_id,
                debit_amount: 0,
                credit_amount: transactionData.amount,
                description: `银行费用支出`
              }
            ];
            break;
            
          default:
            // 自定义或其他类型交易
            // 金额为正数：借记银行账户，贷记指定账户
            // 金额为负数：借记指定账户，贷记银行账户
            if (parseFloat(transactionData.amount) >= 0) {
              entryItems = [
                {
                  account_id: transactionData.gl_entry.bank_account_id,
                  debit_amount: Math.abs(transactionData.amount),
                  credit_amount: 0,
                  description: `银行交易 - ${bankAccount.bank_name} ${bankAccount.account_name}`
                },
                {
                  account_id: transactionData.gl_entry.contra_account_id,
                  debit_amount: 0,
                  credit_amount: Math.abs(transactionData.amount),
                  description: `银行交易对方 - ${transactionData.related_party || ''}`
                }
              ];
            } else {
              entryItems = [
                {
                  account_id: transactionData.gl_entry.contra_account_id,
                  debit_amount: Math.abs(transactionData.amount),
                  credit_amount: 0,
                  description: `银行交易对方 - ${transactionData.related_party || ''}`
                },
                {
                  account_id: transactionData.gl_entry.bank_account_id,
                  debit_amount: 0,
                  credit_amount: Math.abs(transactionData.amount),
                  description: `银行交易 - ${bankAccount.bank_name} ${bankAccount.account_name}`
                }
              ];
            }
        }

        try {
          // 创建会计分录
          await financeModel.createEntry(entryData, entryItems, connection);
          console.log('会计分录创建成功');
        } catch (entryError) {
          console.error('创建会计分录失败:', entryError);
          // 不中断交易创建流程，但记录错误
        }
      } else {
        console.log('无会计分录数据，跳过创建会计分录');
      }

      // 提交事务
      await connection.commit();
      console.log('银行交易创建并更新余额成功，事务已提交');
      
      // 返回事务ID和更新后的余额
      return {
        transactionId,
        newBalance,
        success: true
      };
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      console.error('银行交易创建失败，事务已回滚:', error);
      throw error;
    } finally {
      // 释放连接
      connection.release();
    }
  },

  /**
   * 获取银行交易
   */
  getBankTransactionById: async (id) => {
    try {
      const [transactions] = await db.pool.execute(
        `SELECT t.*, b.account_name, b.bank_name
         FROM bank_transactions t
         LEFT JOIN bank_accounts b ON t.bank_account_id = b.id
         WHERE t.id = ?`,
        [id]
      );
      return transactions.length > 0 ? transactions[0] : null;
    } catch (error) {
      console.error('获取银行交易失败:', error);
      throw error;
    }
  },

  /**
   * 获取银行交易列表
   */
  getBankTransactions: async (filters = {}, page = 1, pageSize = 20) => {
    try {
      // 确保页码和每页条数为整数
      const pageInt = parseInt(page, 10);
      const pageSizeInt = parseInt(pageSize, 10);
      
      let queryBase = `
        FROM bank_transactions t
        LEFT JOIN bank_accounts b ON t.bank_account_id = b.id
        WHERE 1=1
      `;
      const params = [];

      // 添加过滤条件
      if (filters.transaction_number) {
        queryBase += ' AND t.transaction_number LIKE ?';
        params.push(`%${filters.transaction_number}%`);
      }
      
      if (filters.bank_account_id) {
        queryBase += ' AND t.bank_account_id = ?';
        params.push(parseInt(filters.bank_account_id, 10));
      }
      
      if (filters.transaction_type) {
        queryBase += ' AND t.transaction_type = ?';
        params.push(filters.transaction_type);
      }
      
      if (filters.startDate && filters.endDate) {
        queryBase += ' AND t.transaction_date BETWEEN ? AND ?';
        params.push(filters.startDate, filters.endDate);
      } else if (filters.startDate) {
        queryBase += ' AND t.transaction_date >= ?';
        params.push(filters.startDate);
      } else if (filters.endDate) {
        queryBase += ' AND t.transaction_date <= ?';
        params.push(filters.endDate);
      }
      
      if (filters.is_reconciled !== undefined) {
        queryBase += ' AND t.is_reconciled = ?';
        params.push(filters.is_reconciled ? 1 : 0);
      }
      
      if (filters.related_party) {
        queryBase += ' AND t.related_party LIKE ?';
        params.push(`%${filters.related_party}%`);
      }

      // 先执行计数查询
      const countQuery = `SELECT COUNT(*) as total ${queryBase}`;
      const [countResult] = await db.pool.execute(countQuery, params);
      const total = countResult[0].total;
      
      // 然后执行实际数据查询，带排序和分页
      const dataQuery = `SELECT t.*, b.account_name, b.bank_name ${queryBase} ORDER BY t.transaction_date DESC, t.id DESC LIMIT ${pageSizeInt} OFFSET ${(pageInt - 1) * pageSizeInt}`;
      const [transactions] = await db.pool.execute(dataQuery, params);
      
      return {
        transactions,
        pagination: {
          total,
          page: pageInt,
          pageSize: pageSizeInt,
          totalPages: Math.ceil(total / pageSizeInt)
        }
      };
    } catch (error) {
      console.error('获取银行交易列表失败:', error);
      throw error;
    }
  },

  /**
   * 银行对账
   */
  reconcileBankTransaction: async (id, reconciliationData) => {
    try {
      const [result] = await db.pool.execute(
        'UPDATE bank_transactions SET is_reconciled = ?, reconciliation_date = ? WHERE id = ?',
        [true, reconciliationData.reconciliation_date, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('银行对账失败:', error);
      throw error;
    }
  },

  /**
   * 对账交易（别名，用于兼容控制器调用）
   */
  reconcileTransaction: async (id, reconciliationData) => {
    // 调用已有的对账方法
    return await cashModel.reconcileBankTransaction(id, reconciliationData);
  },

  /**
   * 资金调拨（从一个银行账户转账到另一个银行账户）
   */
  transferFunds: async (transferData) => {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      // 获取源账户和目标账户信息
      const [sourceAccounts] = await connection.execute('SELECT * FROM bank_accounts WHERE id = ?', [transferData.from_account_id]);
      if (sourceAccounts.length === 0) {
        throw new Error(`源银行账户ID ${transferData.from_account_id} 不存在`);
      }
      
      const [targetAccounts] = await connection.execute('SELECT * FROM bank_accounts WHERE id = ?', [transferData.to_account_id]);
      if (targetAccounts.length === 0) {
        throw new Error(`目标银行账户ID ${transferData.to_account_id} 不存在`);
      }
      
      const sourceAccount = sourceAccounts[0];
      const targetAccount = targetAccounts[0];
      
      // 检查源账户余额是否充足
      if (parseFloat(sourceAccount.current_balance) < parseFloat(transferData.amount)) {
        throw new Error('源账户余额不足');
      }
      
      // 创建源账户转出交易
      const [fromResult] = await connection.execute(
        `INSERT INTO bank_transactions 
        (transaction_number, bank_account_id, transaction_date, transaction_type, 
         amount, reference_number, description, is_reconciled, related_party) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transferData.transaction_number + '-OUT',
          transferData.from_account_id,
          transferData.transaction_date,
          '转出',
          transferData.amount,
          transferData.reference_number || null,
          `资金调拨到 ${targetAccount.bank_name} ${targetAccount.account_name}${transferData.description ? ': ' + transferData.description : ''}`,
          false,
          `${targetAccount.bank_name} ${targetAccount.account_name}`
        ]
      );
      
      // 创建目标账户转入交易
      const [toResult] = await connection.execute(
        `INSERT INTO bank_transactions 
        (transaction_number, bank_account_id, transaction_date, transaction_type, 
         amount, reference_number, description, is_reconciled, related_party) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transferData.transaction_number + '-IN',
          transferData.to_account_id,
          transferData.transaction_date,
          '转入',
          transferData.amount,
          transferData.reference_number || null,
          `资金调拨自 ${sourceAccount.bank_name} ${sourceAccount.account_name}${transferData.description ? ': ' + transferData.description : ''}`,
          false,
          `${sourceAccount.bank_name} ${sourceAccount.account_name}`
        ]
      );
      
      // 更新源账户和目标账户余额
      await connection.execute(
        'UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?',
        [transferData.amount, transferData.from_account_id]
      );
      
      await connection.execute(
        'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
        [transferData.amount, transferData.to_account_id]
      );
      
      // 如果提供了会计分录信息，创建资金调拨会计分录
      if (transferData.gl_entry) {
        const entryData = {
          entry_number: transferData.gl_entry.entry_number,
          entry_date: transferData.transaction_date,
          posting_date: transferData.transaction_date,
          document_type: '资金调拨',
          document_number: transferData.transaction_number,
          period_id: transferData.gl_entry.period_id,
          description: `资金调拨: ${sourceAccount.bank_name} ${sourceAccount.account_name} -> ${targetAccount.bank_name} ${targetAccount.account_name}`,
          created_by: transferData.gl_entry.created_by
        };

        // 资金调拨分录明细
        const entryItems = [
          // 借：目标银行账户
          {
            account_id: transferData.gl_entry.to_account_id,
            debit_amount: transferData.amount,
            credit_amount: 0,
            description: `资金调拨到 ${targetAccount.bank_name} ${targetAccount.account_name}`
          },
          // 贷：源银行账户
          {
            account_id: transferData.gl_entry.from_account_id,
            debit_amount: 0,
            credit_amount: transferData.amount,
            description: `资金调拨自 ${sourceAccount.bank_name} ${sourceAccount.account_name}`
          }
        ];

        // 创建会计分录
        await financeModel.createEntry(entryData, entryItems, connection);
      }

      await connection.commit();
      return {
        from_transaction_id: fromResult.insertId,
        to_transaction_id: toResult.insertId
      };
    } catch (error) {
      await connection.rollback();
      console.error('资金调拨失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * 现金流预测
   */
  getCashFlowForecast: async (startDate, endDate) => {
    try {
      // 获取当前银行账户余额
      const [bankAccounts] = await db.pool.execute(
        'SELECT id, bank_name, account_name, account_number, currency_code, current_balance FROM bank_accounts WHERE is_active = true'
      );
      
      // 获取未来期间的应收账款
      const [receivables] = await db.pool.execute(
        `SELECT 
          DATE(due_date) as date,
          SUM(balance_amount) as amount,
          'AR' as type,
          '应收账款' as description
        FROM ar_invoices
        WHERE status != '已付款' AND status != '已取消' AND due_date BETWEEN ? AND ?
        GROUP BY DATE(due_date)`,
        [startDate, endDate]
      );
      
      // 获取未来期间的应付账款
      const [payables] = await db.pool.execute(
        `SELECT 
          DATE(due_date) as date,
          SUM(balance_amount) as amount,
          'AP' as type,
          '应付账款' as description
        FROM ap_invoices
        WHERE status != '已付款' AND status != '已取消' AND due_date BETWEEN ? AND ?
        GROUP BY DATE(due_date)`,
        [startDate, endDate]
      );
      
      // 获取已知的未来现金流，如计划的交易
      const [plannedTransactions] = await db.pool.execute(
        `SELECT 
          DATE(transaction_date) as date,
          amount,
          transaction_type as type,
          description
        FROM planned_transactions
        WHERE transaction_date BETWEEN ? AND ?`,
        [startDate, endDate]
      );
      
      // 合并所有现金流数据
      const cashFlows = [
        ...receivables,
        ...payables,
        ...plannedTransactions
      ].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // 计算每日现金流余额
      let currentBalance = bankAccounts.reduce((sum, account) => sum + parseFloat(account.current_balance), 0);
      
      const dailyCashFlows = [];
      let currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().slice(0, 10);
        const dayFlows = cashFlows.filter(flow => flow.date === dateStr);
        
        let inflow = 0;
        let outflow = 0;
        
        dayFlows.forEach(flow => {
          if (flow.type === 'AR' || flow.type === '存款' || flow.type === '转入' || flow.type === '利息') {
            inflow += parseFloat(flow.amount);
          } else {
            outflow += parseFloat(flow.amount);
          }
        });
        
        const netFlow = inflow - outflow;
        currentBalance += netFlow;
        
        dailyCashFlows.push({
          date: dateStr,
          inflow,
          outflow,
          netFlow,
          balance: currentBalance,
          details: dayFlows
        });
        
        // 下一天
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return {
        startDate,
        endDate,
        initialBalance: bankAccounts.reduce((sum, account) => sum + parseFloat(account.current_balance), 0),
        finalBalance: currentBalance,
        accounts: bankAccounts,
        dailyCashFlows
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * 获取交易统计
   */
  getTransactionStatistics: async (filters = {}) => {
    try {
      const params = [];
      let whereClause = "";
      
      // 构建WHERE子句
      if (filters.startDate && filters.endDate) {
        whereClause += " AND t.transaction_date BETWEEN ? AND ?";
        params.push(filters.startDate, filters.endDate);
      } else if (filters.startDate) {
        whereClause += " AND t.transaction_date >= ?";
        params.push(filters.startDate);
      } else if (filters.endDate) {
        whereClause += " AND t.transaction_date <= ?";
        params.push(filters.endDate);
      }
      
      if (filters.accountId) {
        whereClause += " AND t.bank_account_id = ?";
        params.push(filters.accountId);
      }
      
      if (filters.transactionType) {
        whereClause += " AND t.transaction_type = ?";
        params.push(filters.transactionType);
      }
      
      // 查询交易笔数
      const [countResult] = await db.pool.execute(
        `SELECT COUNT(*) as total_count 
         FROM bank_transactions t
         WHERE 1=1 ${whereClause}`,
        params
      );
      
      // 查询收入、支出和净额 - 同时支持中文和英文类型
      const [amountResult] = await db.pool.execute(
        `SELECT 
         SUM(CASE 
           WHEN transaction_type IN ('存款', '转入', '利息', 'income', '收入', 'deposit', 'transfer_in', 'interest') 
           THEN amount 
           ELSE 0 
         END) as total_income,
         
         SUM(CASE 
           WHEN transaction_type IN ('取款', '转出', '费用', 'expense', '支出', 'withdrawal', 'transfer_out', 'fee') 
           THEN amount 
           ELSE 0 
         END) as total_expense,
         
         SUM(CASE 
           WHEN transaction_type IN ('存款', '转入', '利息', 'income', '收入', 'deposit', 'transfer_in', 'interest') 
           THEN amount 
           WHEN transaction_type IN ('取款', '转出', '费用', 'expense', '支出', 'withdrawal', 'transfer_out', 'fee') 
           THEN -amount 
           ELSE 0 
         END) as net_amount
         FROM bank_transactions t
         WHERE 1=1 ${whereClause}`,
        params
      );
      
      // 查询按交易类型分组的统计
      const [typeStats] = await db.pool.execute(
        `SELECT 
         transaction_type,
         COUNT(*) as transaction_count,
         SUM(amount) as total_amount,
         AVG(amount) as avg_amount,
         MIN(amount) as min_amount,
         MAX(amount) as max_amount
         FROM bank_transactions t
         WHERE 1=1 ${whereClause}
         GROUP BY transaction_type
         ORDER BY SUM(amount) DESC`,
        params
      );
      
      // 查询按日期分组的统计数据
      const [timeSeriesStats] = await db.pool.execute(
        `SELECT 
         DATE(transaction_date) as date,
         transaction_type,
         COUNT(*) as transaction_count,
         SUM(amount) as total_amount
         FROM bank_transactions t
         WHERE 1=1 ${whereClause}
         GROUP BY DATE(transaction_date), transaction_type
         ORDER BY date`,
        params
      );
      
      // 确保数值不为null
      const totalCount = parseInt(countResult[0].total_count || 0);
      const totalIncome = parseFloat(amountResult[0].total_income || 0);
      const totalExpense = parseFloat(amountResult[0].total_expense || 0);
      const netAmount = parseFloat(amountResult[0].net_amount || 0);
      
      // 输出调试信息
      console.log('交易统计结果:', {
        totalCount,
        totalIncome,
        totalExpense,
        netAmount
      });
      
      // 构建返回数据
      return {
        summary: {
          totalCount,
          totalIncome,
          totalExpense,
          netAmount
        },
        byType: typeStats,
        timeSeries: timeSeriesStats
      };
    } catch (error) {
      console.error('获取交易统计失败:', error);
      throw error;
    }
  },

  /**
   * 获取银行账户统计信息
   */
  getBankAccountsStats: async () => {
    try {
      // 获取所有银行账户的合计数据
      const [totalResult] = await db.pool.execute(`
        SELECT 
          COUNT(*) as total_accounts,
          SUM(current_balance) as total_balance,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_accounts,
          COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_accounts,
          (SELECT COUNT(DISTINCT currency_code) FROM bank_accounts) as total_currencies
        FROM bank_accounts
      `);
      
      // 计算本月的开始和结束日期
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      
      // 获取本月的收入和支出统计
      const [monthlyStats] = await db.pool.execute(`
        SELECT
          SUM(CASE 
            WHEN transaction_type IN ('存款', '转入', '利息') THEN amount 
            ELSE 0 
          END) as total_in_month,
          SUM(CASE 
            WHEN transaction_type IN ('取款', '转出', '费用') THEN amount 
            ELSE 0 
          END) as total_out_month
        FROM bank_transactions
        WHERE transaction_date BETWEEN ? AND ?
      `, [firstDayOfMonth, lastDayOfMonth]);
      
      // 按货币类型统计余额
      const [currencyStats] = await db.pool.execute(`
        SELECT 
          currency_code,
          COUNT(*) as account_count,
          SUM(current_balance) as total_balance
        FROM bank_accounts
        GROUP BY currency_code
        ORDER BY SUM(current_balance) DESC
      `);
      
      // 按银行名称统计
      const [bankStats] = await db.pool.execute(`
        SELECT 
          bank_name,
          COUNT(*) as account_count,
          SUM(current_balance) as total_balance
        FROM bank_accounts
        GROUP BY bank_name
        ORDER BY COUNT(*) DESC
      `);
      
      return {
        summary: {
          ...totalResult[0],
          total_in_last_month: parseFloat(monthlyStats[0].total_in_month || 0),
          total_out_last_month: parseFloat(monthlyStats[0].total_out_month || 0)
        },
        currency_stats: currencyStats,
        bank_stats: bankStats
      };
    } catch (error) {
      console.error('获取银行账户统计信息失败:', error);
      throw error;
    }
  },
  
  /**
   * 删除银行交易
   * 这个函数会删除交易记录，并恢复银行账户的余额
   * @param {number} id - 交易ID
   * @param {object} options - 可选的附加信息，如果提供了则会用这些信息而不是查询数据库
   * @returns {boolean} 操作是否成功
   */
  deleteBankTransaction: async (id, options = {}) => {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // 如果没有提供options中的信息，则需要获取交易详情
      let transaction;
      if (!options.originalAccountId || !options.originalAmount || !options.originalType) {
        const [transactions] = await connection.execute(
          'SELECT * FROM bank_transactions WHERE id = ?',
          [id]
        );
        
        if (transactions.length === 0) {
          throw new Error(`交易ID ${id} 不存在`);
        }
        
        transaction = transactions[0];
      }
      
      // 获取交易相关数据
      const accountId = options.originalAccountId || transaction.bank_account_id;
      const amount = options.originalAmount || transaction.amount;
      const type = options.originalType || transaction.transaction_type;
      
      // 根据交易类型，恢复账户余额
      let balanceAdjustment = 0;
      switch (type) {
        case '存款':
        case '转入':
        case '利息':
          // 这些类型增加了余额，现在需要减少余额
          balanceAdjustment = -parseFloat(amount);
          break;
        case '取款':
        case '转出':
        case '费用':
          // 这些类型减少了余额，现在需要增加余额
          balanceAdjustment = parseFloat(amount);
          break;
        default:
          // 其他类型需要明确指定金额的正负
          balanceAdjustment = -parseFloat(amount); // 假设默认是增加了余额
      }
      
      console.log(`删除交易，恢复账户余额调整: ${balanceAdjustment}，账户ID: ${accountId}`);
      
      // 更新银行账户余额
      const [updateResult] = await connection.execute(
        'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
        [balanceAdjustment, accountId]
      );
      
      if (updateResult.affectedRows === 0) {
        throw new Error('更新账户余额失败，账户可能不存在');
      }
      
      // 删除交易记录
      const [deleteResult] = await connection.execute(
        'DELETE FROM bank_transactions WHERE id = ?',
        [id]
      );
      
      if (deleteResult.affectedRows === 0) {
        throw new Error('删除交易记录失败');
      }
      
      // 提交事务
      await connection.commit();
      console.log(`交易删除成功，ID: ${id}，账户余额已调整`);
      
      return true;
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      console.error('删除银行交易失败:', error);
      throw error;
    } finally {
      // 释放连接
      connection.release();
    }
  },

  // ===== 初始化方法 =====
  
  /**
   * 初始化银行账户表结构
   */
  initializeBankTables: async () => {
    try {
      console.log('开始检查银行账户表结构...');
      
      // 检查表是否存在
      const [tableExists] = await db.pool.execute(
        "SHOW TABLES LIKE 'bank_accounts'"
      );
      
      if (tableExists.length === 0) {
        console.log('创建bank_accounts表...');
        await db.pool.execute(`
          CREATE TABLE bank_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            account_number VARCHAR(50) NOT NULL,
            account_name VARCHAR(100) NOT NULL,
            bank_name VARCHAR(100) NOT NULL,
            branch_name VARCHAR(100),
            account_type VARCHAR(50) DEFAULT '活期',
            current_balance DECIMAL(15,2) DEFAULT 0,
            opening_balance DECIMAL(15,2) DEFAULT 0,
            currency_code VARCHAR(10) DEFAULT 'CNY',
            is_active BOOLEAN DEFAULT true,
            contact_person VARCHAR(50),
            contact_phone VARCHAR(20),
            notes TEXT,
            last_transaction_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by INT,
            updated_by INT,
            INDEX (account_number),
            INDEX (bank_name)
          )
        `);
      } else {
        console.log('bank_accounts表已存在，检查last_transaction_date字段...');
        
        // 检查last_transaction_date字段是否存在
        const [columns] = await db.pool.execute(
          "SHOW COLUMNS FROM bank_accounts LIKE 'last_transaction_date'"
        );
        
        if (columns.length === 0) {
          console.log('添加last_transaction_date字段...');
          await db.pool.execute(
            "ALTER TABLE bank_accounts ADD COLUMN last_transaction_date DATE"
          );
        } else {
          console.log('last_transaction_date字段已存在');
        }
      }
      
      // 检查银行交易表是否存在
      const [txTableExists] = await db.pool.execute(
        "SHOW TABLES LIKE 'bank_transactions'"
      );
      
      if (txTableExists.length === 0) {
        console.log('创建bank_transactions表...');
        await db.pool.execute(`
          CREATE TABLE bank_transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            transaction_number VARCHAR(50) NOT NULL,
            bank_account_id INT NOT NULL,
            transaction_date DATE NOT NULL,
            transaction_type ENUM('存入', '转出', '利息', '费用') NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            description TEXT,
            reference_number VARCHAR(50),
            is_reconciled BOOLEAN DEFAULT false,
            reconciliation_date DATE,
            related_party VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by INT,
            updated_by INT,
            INDEX (transaction_number),
            INDEX (bank_account_id),
            INDEX (transaction_date),
            INDEX (is_reconciled),
            FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE RESTRICT
          )
        `);
      }
      
      console.log('银行账户表结构初始化完成');
      return true;
    } catch (error) {
      console.error('初始化银行账户表结构失败:', error);
      throw error;
    }
  }
};

// 交易模型
const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transaction_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  transaction_type: {
    type: DataTypes.ENUM('income', 'expense', 'transfer'),
    allowNull: false
  },
  account_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'bank_accounts',
      key: 'id'
    }
  },
  target_account_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'bank_accounts',
      key: 'id'
    },
    comment: '只在转账类型交易中使用'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  reference_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  attachment: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '附件文件路径'
  },
  reconciled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  underscored: true
});

// 对账模型
const Reconciliation = sequelize.define('Reconciliation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  account_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'bank_accounts',
      key: 'id'
    }
  },
  reconciliation_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  bank_statement_balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  book_balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  difference: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('draft', 'completed'),
    allowNull: false,
    defaultValue: 'draft'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachment: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '对账单附件文件路径'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'reconciliations',
  timestamps: true,
  underscored: true
});

// 对账条目模型（记录哪些交易已被对账）
const ReconciliationItem = sequelize.define('ReconciliationItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reconciliation_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'reconciliations',
      key: 'id'
    }
  },
  transaction_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'transactions',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'reconciliation_items',
  timestamps: true,
  underscored: true
});

// 建立关联关系
Transaction.belongsTo(BankAccount, { foreignKey: 'account_id', as: 'account' });
Transaction.belongsTo(BankAccount, { foreignKey: 'target_account_id', as: 'targetAccount' });

Reconciliation.belongsTo(BankAccount, { foreignKey: 'account_id', as: 'account' });
Reconciliation.hasMany(ReconciliationItem, { foreignKey: 'reconciliation_id', as: 'items' });

ReconciliationItem.belongsTo(Reconciliation, { foreignKey: 'reconciliation_id' });
ReconciliationItem.belongsTo(Transaction, { foreignKey: 'transaction_id' });

Transaction.hasMany(ReconciliationItem, { foreignKey: 'transaction_id' });

module.exports = {
  ...cashModel,
  Transaction,
  Reconciliation,
  ReconciliationItem
}; 