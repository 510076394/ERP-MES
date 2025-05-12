const cash = require('../models/cash');
const { validationResult } = require('express-validator');

/**
 * 现金管理控制器
 */
const cashController = {
  /**
   * 获取交易记录列表
   */
  getTransactions: async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        transactionType: req.query.transactionType,
        accountId: req.query.accountId ? parseInt(req.query.accountId) : null,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount) : null,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount) : null,
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 10
      };
      
      const result = await cash.getTransactions(filters);
      
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: filters.page,
        limit: filters.limit
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({
        success: false,
        message: '获取交易记录失败',
        error: error.message
      });
    }
  },

  /**
   * 获取单笔交易记录
   */
  getTransactionById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的交易ID'
        });
      }
      
      const transaction = await cash.getTransactionById(id);
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: '交易记录不存在'
        });
      }
      
      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({
        success: false,
        message: '获取交易记录失败',
        error: error.message
      });
    }
  },

  /**
   * 创建交易记录
   */
  createTransaction: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const transaction = {
        transaction_date: req.body.transaction_date,
        amount: parseFloat(req.body.amount),
        transaction_type: req.body.transaction_type,
        description: req.body.description,
        account_id: parseInt(req.body.account_id),
        reference_no: req.body.reference_no
      };
      
      const insertId = await cash.createTransaction(transaction);
      
      res.status(201).json({
        success: true,
        message: '交易记录创建成功',
        data: { id: insertId, ...transaction }
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(500).json({
        success: false,
        message: '创建交易记录失败',
        error: error.message
      });
    }
  },

  /**
   * 更新交易记录
   */
  updateTransaction: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的交易ID'
        });
      }
      
      // 检查交易记录是否存在
      const existingTransaction = await cash.getTransactionById(id);
      
      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message: '交易记录不存在'
        });
      }
      
      const transaction = {
        transaction_date: req.body.transaction_date,
        amount: parseFloat(req.body.amount),
        transaction_type: req.body.transaction_type,
        description: req.body.description,
        account_id: parseInt(req.body.account_id),
        reference_no: req.body.reference_no
      };
      
      const updated = await cash.updateTransaction(id, transaction);
      
      if (updated) {
        res.json({
          success: true,
          message: '交易记录更新成功',
          data: { id, ...transaction }
        });
      } else {
        res.status(500).json({
          success: false,
          message: '交易记录更新失败'
        });
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(500).json({
        success: false,
        message: '更新交易记录失败',
        error: error.message
      });
    }
  },

  /**
   * 删除交易记录
   */
  deleteTransaction: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的交易ID'
        });
      }
      
      // 检查交易记录是否存在
      const existingTransaction = await cash.getTransactionById(id);
      
      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message: '交易记录不存在'
        });
      }
      
      const deleted = await cash.deleteTransaction(id);
      
      if (deleted) {
        res.json({
          success: true,
          message: '交易记录删除成功'
        });
      } else {
        res.status(500).json({
          success: false,
          message: '交易记录删除失败'
        });
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({
        success: false,
        message: '删除交易记录失败',
        error: error.message
      });
    }
  },

  /**
   * 获取对账记录
   */
  getReconciliations: async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        accountId: req.query.accountId ? parseInt(req.query.accountId) : null,
        status: req.query.status,
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 10
      };
      
      const result = await cash.getReconciliations(filters);
      
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: filters.page,
        limit: filters.limit
      });
    } catch (error) {
      console.error('Error fetching reconciliations:', error);
      res.status(500).json({
        success: false,
        message: '获取对账记录失败',
        error: error.message
      });
    }
  },

  /**
   * 获取单条对账记录
   */
  getReconciliationById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的对账ID'
        });
      }
      
      const reconciliation = await cash.getReconciliationById(id);
      
      if (!reconciliation) {
        return res.status(404).json({
          success: false,
          message: '对账记录不存在'
        });
      }
      
      res.json({
        success: true,
        data: reconciliation
      });
    } catch (error) {
      console.error('Error fetching reconciliation:', error);
      res.status(500).json({
        success: false,
        message: '获取对账记录失败',
        error: error.message
      });
    }
  },

  /**
   * 创建对账记录
   */
  createReconciliation: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const reconciliation = {
        account_id: parseInt(req.body.account_id),
        reconciliation_date: req.body.reconciliation_date,
        bank_statement_balance: parseFloat(req.body.bank_statement_balance),
        book_balance: parseFloat(req.body.book_balance),
        status: req.body.status || 'draft',
        notes: req.body.notes,
        items: req.body.items || []
      };
      
      const insertId = await cash.createReconciliation(reconciliation);
      
      res.status(201).json({
        success: true,
        message: '对账记录创建成功',
        data: { id: insertId, ...reconciliation }
      });
    } catch (error) {
      console.error('Error creating reconciliation:', error);
      res.status(500).json({
        success: false,
        message: '创建对账记录失败',
        error: error.message
      });
    }
  },

  /**
   * 更新对账记录
   */
  updateReconciliation: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的对账ID'
        });
      }
      
      // 检查对账记录是否存在
      const existingReconciliation = await cash.getReconciliationById(id);
      
      if (!existingReconciliation) {
        return res.status(404).json({
          success: false,
          message: '对账记录不存在'
        });
      }
      
      const reconciliation = {
        account_id: parseInt(req.body.account_id),
        reconciliation_date: req.body.reconciliation_date,
        bank_statement_balance: parseFloat(req.body.bank_statement_balance),
        book_balance: parseFloat(req.body.book_balance),
        status: req.body.status,
        notes: req.body.notes,
        items: req.body.items || []
      };
      
      const updated = await cash.updateReconciliation(id, reconciliation);
      
      if (updated) {
        res.json({
          success: true,
          message: '对账记录更新成功',
          data: { id, ...reconciliation }
        });
      } else {
        res.status(500).json({
          success: false,
          message: '对账记录更新失败'
        });
      }
    } catch (error) {
      console.error('Error updating reconciliation:', error);
      res.status(500).json({
        success: false,
        message: '更新对账记录失败',
        error: error.message
      });
    }
  },

  /**
   * 获取现金流预测
   */
  getCashFlowForecast: async (req, res) => {
    try {
      const startDate = req.query.startDate || new Date().toISOString().slice(0, 10);
      const endDate = req.query.endDate || new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().slice(0, 10);
      
      const forecast = await cash.getCashFlowForecast(startDate, endDate);
      
      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      console.error('Error generating cash flow forecast:', error);
      res.status(500).json({
        success: false,
        message: '生成现金流预测失败',
        error: error.message
      });
    }
  },

  /**
   * 获取现金流统计
   */
  getCashFlowStatistics: async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        accountId: req.query.accountId ? parseInt(req.query.accountId) : null,
        transactionType: req.query.transactionType
      };
      
      console.log('获取现金流统计，过滤条件:', filters);
      
      // 获取交易统计
      const stats = await cash.getTransactionStatistics(filters);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('获取现金流统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取现金流统计失败',
        error: error.message
      });
    }
  },

  /**
   * 获取银行账户列表
   */
  getBankAccounts: async (req, res) => {
    try {
      console.log('获取银行账户列表请求参数:', req.query);
      
      const filters = {
        account_name: req.query.accountName,
        bank_name: req.query.bankName,
        is_active: req.query.status === 'active' ? true : 
                 (req.query.status === 'frozen' ? false : undefined)
      };
      
      // 处理分页参数
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      
      console.log('过滤和分页参数:', { filters, page, limit });
      
      // 获取账户数据
      const accounts = await cash.getBankAccounts(filters);
      console.log('获取到的银行账户数量:', accounts.length);
      
      // 安全地将数据字段转换为前端期望的格式
      const formattedAccounts = accounts.map(account => {
        try {
          // 确保所有必需字段都存在并转换为正确格式
          // 特别注意openDate字段，使用created_at
          const createdAt = account.created_at ? new Date(account.created_at) : new Date();
          const lastTxDate = account.last_transaction_date 
            ? new Date(account.last_transaction_date) 
            : null;
            
          return {
            id: account.id,
            accountName: account.account_name || '',
            accountNumber: account.account_number || '',
            bankName: account.bank_name || '',
            branchName: account.branch_name || '',
            currency: account.currency_code || 'CNY',
            balance: account.current_balance !== undefined ? parseFloat(account.current_balance) : 0,
            initialBalance: account.opening_balance !== undefined ? parseFloat(account.opening_balance) : 0,
            openDate: createdAt.toISOString().split('T')[0],
            status: account.is_active ? 'active' : 'frozen',
            purpose: account.account_type || '',
            notes: account.notes || '',
            lastTransactionDate: lastTxDate ? lastTxDate.toISOString().split('T')[0] : ''
          };
        } catch (err) {
          console.error('格式化账户数据出错:', err, account);
          // 返回一个基本对象以避免中断整个过程
          return {
            id: account.id,
            accountName: account.account_name || '',
            accountNumber: account.account_number || '',
            bankName: account.bank_name || '',
            branchName: account.branch_name || '',
            currency: 'CNY',
            balance: 0,
            openDate: new Date().toISOString().split('T')[0],
            status: 'active'
          };
        }
      });
      
      // 处理分页
      const startIndex = (page - 1) * limit;
      const paginatedAccounts = formattedAccounts.slice(startIndex, startIndex + limit);
      
      res.json({
        success: true,
        data: paginatedAccounts,
        total: formattedAccounts.length
      });
    } catch (error) {
      console.error('获取银行账户列表出错:', error);
      res.status(500).json({
        success: false,
        message: '获取银行账户失败',
        error: error.message
      });
    }
  },

  /**
   * 获取银行账户统计信息
   */
  getBankAccountsStats: async (req, res) => {
    try {
      const stats = await cash.getBankAccountsStats();
      
      // 将后端数据格式转换为前端需要的格式
      const responseData = {
        totalAccounts: stats.summary.total_accounts,
        activeAccounts: stats.summary.active_accounts,
        totalBalance: parseFloat(stats.summary.total_balance || 0),
        totalInLastMonth: stats.summary.total_in_last_month,
        totalOutLastMonth: stats.summary.total_out_last_month,
        currencyStats: stats.currency_stats,
        bankStats: stats.bank_stats
      };
      
      res.json({
        success: true,
        ...responseData
      });
    } catch (error) {
      console.error('Error fetching bank account statistics:', error);
      res.status(500).json({
        success: false,
        message: '获取银行账户统计信息失败',
        error: error.message
      });
    }
  },

  /**
   * 获取单个银行账户详情
   */
  getBankAccountById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的银行账户ID'
        });
      }
      
      const account = await cash.getBankAccountById(id);
      
      if (!account) {
        return res.status(404).json({
          success: false,
          message: '银行账户不存在'
        });
      }
      
      // 将数据字段转换为前端期望的格式
      try {
        // 确保日期字段格式正确
        const createdAt = account.created_at ? new Date(account.created_at) : new Date();
        const lastTxDate = account.last_transaction_date 
          ? new Date(account.last_transaction_date) 
          : null;
        
        const formattedAccount = {
          id: account.id,
          accountName: account.account_name || '',
          accountNumber: account.account_number || '',
          bankName: account.bank_name || '',
          branchName: account.branch_name || '',
          currency: account.currency_code || 'CNY',
          balance: account.current_balance !== undefined ? parseFloat(account.current_balance) : 0,
          initialBalance: account.opening_balance !== undefined ? parseFloat(account.opening_balance) : 0,
          openDate: createdAt.toISOString().split('T')[0],
          status: account.is_active ? 'active' : 'frozen',
          purpose: account.account_type || '',
          notes: account.notes || '',
          lastTransactionDate: lastTxDate ? lastTxDate.toISOString().split('T')[0] : ''
        };
        
        res.json({
          success: true,
          data: formattedAccount
        });
      } catch (err) {
        console.error('格式化账户数据出错:', err, account);
        res.status(500).json({
          success: false,
          message: '处理银行账户数据失败',
          error: err.message
        });
      }
    } catch (error) {
      console.error('Error fetching bank account:', error);
      res.status(500).json({
        success: false,
        message: '获取银行账户失败',
        error: error.message
      });
    }
  },

  /**
   * 创建银行账户
   */
  createBankAccount: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const accountData = {
        account_number: req.body.account_number,
        account_name: req.body.account_name,
        bank_name: req.body.bank_name,
        branch_name: req.body.branch_name,
        currency_code: req.body.currency_code || 'CNY',
        current_balance: parseFloat(req.body.initial_balance || req.body.current_balance || 0),
        account_type: req.body.account_type || '活期',
        is_active: req.body.is_active !== undefined ? req.body.is_active : true,
        contact_person: req.body.contact_person,
        contact_phone: req.body.contact_phone,
        notes: req.body.notes
      };
      
      const insertId = await cash.createBankAccount(accountData);
      
      // 将数据字段转换为前端期望的格式
      const currentDate = new Date().toISOString().split('T')[0];
      const formattedAccount = {
        id: insertId,
        accountName: accountData.account_name || '',
        accountNumber: accountData.account_number || '',
        bankName: accountData.bank_name || '',
        branchName: accountData.branch_name || '',
        currency: accountData.currency_code || 'CNY',
        balance: parseFloat(accountData.current_balance) || 0,
        initialBalance: parseFloat(accountData.current_balance) || 0,
        openDate: currentDate,
        status: accountData.is_active ? 'active' : 'frozen',
        purpose: accountData.account_type || '',
        notes: accountData.notes || '',
        lastTransactionDate: ''
      };
      
      res.status(201).json({
        success: true,
        message: '银行账户创建成功',
        data: formattedAccount
      });
    } catch (error) {
      console.error('Error creating bank account:', error);
      res.status(500).json({
        success: false,
        message: '创建银行账户失败',
        error: error.message
      });
    }
  },

  /**
   * 更新银行账户
   */
  updateBankAccount: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的银行账户ID'
        });
      }
      
      // 检查银行账户是否存在
      const existingAccount = await cash.getBankAccountById(id);
      
      if (!existingAccount) {
        return res.status(404).json({
          success: false,
          message: '银行账户不存在'
        });
      }
      
      const accountData = {
        bank_name: req.body.bank_name,
        account_name: req.body.account_name,
        account_number: req.body.account_number,
        account_type: req.body.account_type,
        currency_code: req.body.currency_code,
        branch_name: req.body.branch_name || existingAccount.branch_name,
        notes: req.body.notes,
        is_active: req.body.is_active,
        updated_by: req.body.updated_by || 1
      };
      
      const updated = await cash.updateBankAccount(id, accountData);
      
      if (updated) {
        // 获取更新后的账户信息以构建前端期望的格式
        const updatedAccount = await cash.getBankAccountById(id);
        
        // 确保日期字段格式正确
        const createdAt = updatedAccount.created_at ? new Date(updatedAccount.created_at) : new Date();
        const lastTxDate = updatedAccount.last_transaction_date 
          ? new Date(updatedAccount.last_transaction_date) 
          : null;
        
        const formattedAccount = {
          id: updatedAccount.id,
          accountName: updatedAccount.account_name || '',
          accountNumber: updatedAccount.account_number || '',
          bankName: updatedAccount.bank_name || '',
          branchName: updatedAccount.branch_name || '',
          currency: updatedAccount.currency_code || 'CNY',
          balance: updatedAccount.current_balance !== undefined ? parseFloat(updatedAccount.current_balance) : 0,
          initialBalance: updatedAccount.opening_balance !== undefined ? parseFloat(updatedAccount.opening_balance) : 0,
          openDate: createdAt.toISOString().split('T')[0],
          status: updatedAccount.is_active ? 'active' : 'frozen',
          purpose: updatedAccount.account_type || '',
          notes: updatedAccount.notes || '',
          lastTransactionDate: lastTxDate ? lastTxDate.toISOString().split('T')[0] : ''
        };
        
        res.json({
          success: true,
          message: '银行账户更新成功',
          data: formattedAccount
        });
      } else {
        res.status(500).json({
          success: false,
          message: '银行账户更新失败'
        });
      }
    } catch (error) {
      console.error('Error updating bank account:', error);
      res.status(500).json({
        success: false,
        message: '更新银行账户失败',
        error: error.message
      });
    }
  },

  /**
   * 获取银行交易列表
   */
  getBankTransactions: async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        transaction_type: req.query.transactionType,
        bank_account_id: req.query.accountId ? parseInt(req.query.accountId) : null,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount) : null,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount) : null
      };
      
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      
      // 调用正确的模型方法
      const result = await cash.getBankTransactions(filters, page, limit);
      
      res.json({
        success: true,
        data: result.transactions,
        total: result.pagination.total,
        page: page,
        limit: limit
      });
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
      res.status(500).json({
        success: false,
        message: '获取银行交易失败',
        error: error.message
      });
    }
  },

  /**
   * 获取单笔银行交易详情
   */
  getBankTransactionById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的交易ID'
        });
      }
      
      // 调用正确的银行交易查询方法
      const transaction = await cash.getBankTransactionById(id);
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: '交易记录不存在'
        });
      }
      
      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error('Error fetching bank transaction:', error);
      res.status(500).json({
        success: false,
        message: '获取银行交易失败',
        error: error.message
      });
    }
  },

  /**
   * 创建银行交易
   */
  createBankTransaction: async (req, res) => {
    try {
      console.log('收到创建银行交易请求:', req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const transactionData = {
        bank_account_id: parseInt(req.body.bank_account_id),
        transaction_date: req.body.transaction_date,
        transaction_type: req.body.transaction_type,
        amount: parseFloat(req.body.amount),
        description: req.body.description,
        reference_number: req.body.reference_number,
        transaction_number: req.body.transaction_number,
        is_reconciled: req.body.is_reconciled !== undefined ? req.body.is_reconciled : false,
        reconciliation_date: req.body.reconciliation_date || null,
        related_party: req.body.related_party || null,
        created_by: req.body.created_by || 1
      };
      
      // 检查必要字段
      if (!transactionData.transaction_number) {
        console.error('缺少交易编号');
        return res.status(400).json({
          success: false,
          message: '缺少交易编号'
        });
      }
      
      if (!transactionData.bank_account_id || isNaN(transactionData.bank_account_id)) {
        console.error('无效的银行账户ID:', req.body.bank_account_id);
        return res.status(400).json({
          success: false,
          message: '无效的银行账户ID'
        });
      }
      
      // 移除gl_entry字段，该字段可能导致错误
      if (req.body.gl_entry) {
        console.log('收到gl_entry字段，但将被忽略');
      }
      transactionData.gl_entry = null;
      
      console.log('准备创建交易，数据:', transactionData);
      
      const result = await cash.createBankTransaction(transactionData);
      
      console.log('交易创建成功，ID:', result.transactionId, '新余额:', result.newBalance);
      
      res.status(201).json({
        success: true,
        message: '银行交易创建成功',
        data: { 
          id: result.transactionId, 
          newBalance: result.newBalance,
          ...transactionData 
        }
      });
    } catch (error) {
      console.error('创建银行交易失败:', error);
      res.status(500).json({
        success: false,
        message: `创建银行交易失败: ${error.message}`,
        error: error.message
      });
    }
  },

  /**
   * 对账交易记录
   */
  reconcileBankTransaction: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的交易ID'
        });
      }
      
      const reconciled = await cash.reconcileTransaction(id, {
        reconciled: true,
        reconciliation_date: req.body.reconciliation_date,
        updated_by: req.body.updated_by || 1
      });
      
      if (reconciled) {
        res.json({
          success: true,
          message: '交易已对账',
          data: { id, reconciled: true }
        });
      } else {
        res.status(500).json({
          success: false,
          message: '对账操作失败'
        });
      }
    } catch (error) {
      console.error('Error reconciling transaction:', error);
      res.status(500).json({
        success: false,
        message: '对账操作失败',
        error: error.message
      });
    }
  },

  /**
   * 更新银行交易
   */
  updateBankTransaction: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的交易ID'
        });
      }
      
      // 检查交易是否存在
      const existingTransaction = await cash.getBankTransactionById(id);
      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message: '交易记录不存在'
        });
      }
      
      // 由于银行交易涉及复杂的余额计算和账户更新，
      // 这里采用先删除再创建的方式实现更新
      // 这并不是最佳实践，但对于简单系统来说是最直接的解决方案
      
      // 1. 备份原交易数据
      console.log('原交易数据:', existingTransaction);
      const originalAccountId = existingTransaction.bank_account_id;
      const originalAmount = existingTransaction.amount;
      const originalType = existingTransaction.transaction_type;
      
      // 2. 构建新交易数据
      const transactionData = {
        bank_account_id: parseInt(req.body.bank_account_id),
        transaction_date: req.body.transaction_date,
        transaction_type: req.body.transaction_type,
        amount: parseFloat(req.body.amount),
        description: req.body.description,
        reference_number: req.body.reference_number,
        transaction_number: req.body.transaction_number,
        is_reconciled: req.body.is_reconciled !== undefined ? req.body.is_reconciled : false,
        reconciliation_date: req.body.reconciliation_date || null,
        related_party: req.body.related_party || null,
        created_by: req.body.created_by || 1
      };
      
      // 3. 删除原交易（使用控制器内部方法）
      await cash.deleteBankTransaction(id, {
        originalAccountId,
        originalAmount,
        originalType
      });
      
      // 4. 创建新交易
      const result = await cash.createBankTransaction(transactionData);
      
      console.log('交易更新成功，ID:', result.transactionId, '新余额:', result.newBalance);
      
      res.json({
        success: true,
        message: '银行交易更新成功',
        data: { 
          id: result.transactionId, 
          newBalance: result.newBalance,
          ...transactionData 
        }
      });
    } catch (error) {
      console.error('更新银行交易失败:', error);
      res.status(500).json({
        success: false,
        message: `更新银行交易失败: ${error.message}`,
        error: error.message
      });
    }
  },
  
  /**
   * 删除银行交易
   */
  deleteBankTransaction: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的交易ID'
        });
      }
      
      // 检查交易是否存在
      const transaction = await cash.getBankTransactionById(id);
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: '交易记录不存在'
        });
      }
      
      // 删除交易并恢复余额
      const result = await cash.deleteBankTransaction(id);
      
      res.json({
        success: true,
        message: '银行交易删除成功',
        data: { id }
      });
    } catch (error) {
      console.error('删除银行交易失败:', error);
      res.status(500).json({
        success: false,
        message: `删除银行交易失败: ${error.message}`,
        error: error.message
      });
    }
  },

  /**
   * 资金调拨
   */
  transferFunds: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const transferData = {
        from_account_id: parseInt(req.body.from_account_id),
        to_account_id: parseInt(req.body.to_account_id),
        amount: parseFloat(req.body.amount),
        transaction_date: req.body.transaction_date,
        description: req.body.description,
        reference_number: req.body.reference_number,
        created_by: req.body.created_by || 1
      };
      
      const result = await cash.transferFunds(transferData);
      
      res.status(201).json({
        success: true,
        message: '资金调拨成功',
        data: result
      });
    } catch (error) {
      console.error('Error transferring funds:', error);
      res.status(500).json({
        success: false,
        message: '资金调拨失败',
        error: error.message
      });
    }
  },

  /**
   * 更新银行账户状态
   */
  updateBankAccountStatus: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: '无效的银行账户ID'
        });
      }
      
      // 检查银行账户是否存在
      const existingAccount = await cash.getBankAccountById(id);
      
      if (!existingAccount) {
        return res.status(404).json({
          success: false,
          message: '银行账户不存在'
        });
      }
      
      // 使用专门的方法更新账户状态
      const isActive = req.body.status === 'active';
      const updated = await cash.updateBankAccountStatus(id, isActive);
      
      if (updated) {
        // 获取更新后的完整信息
        const updatedAccount = await cash.getBankAccountById(id);
        
        // 创建前端格式的数据
        const createdAt = updatedAccount.created_at ? new Date(updatedAccount.created_at) : new Date();
        const lastTxDate = updatedAccount.last_transaction_date 
          ? new Date(updatedAccount.last_transaction_date) 
          : null;
        
        const formattedAccount = {
          id: updatedAccount.id,
          accountName: updatedAccount.account_name || '',
          accountNumber: updatedAccount.account_number || '',
          bankName: updatedAccount.bank_name || '',
          branchName: updatedAccount.branch_name || '',
          currency: updatedAccount.currency_code || 'CNY',
          balance: updatedAccount.current_balance !== undefined ? parseFloat(updatedAccount.current_balance) : 0,
          initialBalance: updatedAccount.opening_balance !== undefined ? parseFloat(updatedAccount.opening_balance) : 0,
          openDate: createdAt.toISOString().split('T')[0],
          status: updatedAccount.is_active ? 'active' : 'frozen',
          purpose: updatedAccount.account_type || '',
          notes: updatedAccount.notes || '',
          lastTransactionDate: lastTxDate ? lastTxDate.toISOString().split('T')[0] : ''
        };
        
        res.json({
          success: true,
          message: '银行账户状态更新成功',
          data: formattedAccount
        });
      } else {
        res.status(500).json({
          success: false,
          message: '银行账户状态更新失败'
        });
      }
    } catch (error) {
      console.error('Error updating bank account status:', error);
      res.status(500).json({
        success: false,
        message: '更新银行账户状态失败',
        error: error.message
      });
    }
  },

  /**
   * 获取未对账交易列表
   */
  getUnreconciledTransactions: async (req, res) => {
    try {
      const filters = {
        accountId: req.query.accountId ? parseInt(req.query.accountId) : null,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      // 这里需要实现从数据库获取未对账交易的逻辑
      // 临时返回空数组，后续可以连接到真实数据
      const transactions = [];
      
      res.json(transactions);
    } catch (error) {
      console.error('获取未对账交易失败:', error);
      res.status(500).json({
        success: false,
        message: '获取未对账交易失败',
        error: error.message
      });
    }
  },

  /**
   * 获取已对账交易列表
   */
  getReconciledTransactions: async (req, res) => {
    try {
      const filters = {
        accountId: req.query.accountId ? parseInt(req.query.accountId) : null,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      // 这里需要实现从数据库获取已对账交易的逻辑
      // 临时返回空数组，后续可以连接到真实数据
      const transactions = [];
      
      res.json(transactions);
    } catch (error) {
      console.error('获取已对账交易失败:', error);
      res.status(500).json({
        success: false,
        message: '获取已对账交易失败',
        error: error.message
      });
    }
  },

  /**
   * 获取对账统计信息
   */
  getReconciliationStats: async (req, res) => {
    try {
      const filters = {
        accountId: req.query.accountId ? parseInt(req.query.accountId) : null,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      // 这里需要实现从数据库获取对账统计信息的逻辑
      // 临时返回模拟数据，后续可以连接到真实数据
      const stats = {
        bookBalance: 0,
        bankBalance: 0,
        difference: 0,
        unreconciledItems: 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error('获取对账统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取对账统计失败',
        error: error.message
      });
    }
  },

  /**
   * 标记交易为已对账
   */
  markTransactionAsReconciled: async (req, res) => {
    try {
      const { transactionId, accountId } = req.body;
      
      if (!transactionId) {
        return res.status(400).json({
          success: false,
          message: '缺少交易ID'
        });
      }

      // 这里需要实现标记交易为已对账的逻辑
      // 临时返回成功消息，后续可以连接到真实数据
      
      res.json({
        success: true,
        message: '交易已标记为已对账'
      });
    } catch (error) {
      console.error('标记交易为已对账失败:', error);
      res.status(500).json({
        success: false,
        message: '标记交易为已对账失败',
        error: error.message
      });
    }
  },

  /**
   * 取消交易对账标记
   */
  cancelTransactionReconciliation: async (req, res) => {
    try {
      const { transactionId, accountId } = req.body;
      
      if (!transactionId) {
        return res.status(400).json({
          success: false,
          message: '缺少交易ID'
        });
      }

      // 这里需要实现取消交易对账标记的逻辑
      // 临时返回成功消息，后续可以连接到真实数据
      
      res.json({
        success: true,
        message: '交易对账标记已取消'
      });
    } catch (error) {
      console.error('取消交易对账标记失败:', error);
      res.status(500).json({
        success: false,
        message: '取消交易对账标记失败',
        error: error.message
      });
    }
  },

  /**
   * 获取已匹配的交易
   */
  getMatchedTransactions: async (req, res) => {
    try {
      const bankTransactionId = req.query.bankTransactionId ? parseInt(req.query.bankTransactionId) : null;
      
      if (!bankTransactionId) {
        return res.status(400).json({
          success: false,
          message: '缺少银行交易ID'
        });
      }

      // 这里需要实现获取已匹配交易的逻辑
      // 临时返回空数组，后续可以连接到真实数据
      const transactions = [];
      
      res.json(transactions);
    } catch (error) {
      console.error('获取已匹配交易失败:', error);
      res.status(500).json({
        success: false,
        message: '获取已匹配交易失败',
        error: error.message
      });
    }
  },

  /**
   * 获取可能匹配的交易
   */
  getPossibleMatchingTransactions: async (req, res) => {
    try {
      const bankTransactionId = req.query.bankTransactionId ? parseInt(req.query.bankTransactionId) : null;
      const accountId = req.query.accountId ? parseInt(req.query.accountId) : null;
      
      if (!bankTransactionId || !accountId) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数'
        });
      }

      // 这里需要实现获取可能匹配交易的逻辑
      // 临时返回空数组，后续可以连接到真实数据
      const transactions = [];
      
      res.json(transactions);
    } catch (error) {
      console.error('获取可能匹配交易失败:', error);
      res.status(500).json({
        success: false,
        message: '获取可能匹配交易失败',
        error: error.message
      });
    }
  },

  /**
   * 确认交易匹配
   */
  confirmTransactionMatch: async (req, res) => {
    try {
      const { bankTransactionId, transactionIds, accountId } = req.body;
      
      if (!bankTransactionId || !transactionIds || !transactionIds.length || !accountId) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数'
        });
      }

      // 这里需要实现确认交易匹配的逻辑
      // 临时返回成功消息，后续可以连接到真实数据
      
      res.json({
        success: true,
        message: '交易匹配已确认'
      });
    } catch (error) {
      console.error('确认交易匹配失败:', error);
      res.status(500).json({
        success: false,
        message: '确认交易匹配失败',
        error: error.message
      });
    }
  },

  /**
   * 导入银行对账单
   */
  importBankStatement: async (req, res) => {
    try {
      // 这里应该处理文件上传和解析
      if (!req.files || !req.files.file) {
        return res.status(400).json({
          success: false,
          message: '未找到上传的文件'
        });
      }

      // 解析文件并返回解析后的数据
      // 临时返回空数组，后续实现真实解析逻辑
      const importedStatements = [];
      
      res.json(importedStatements);
    } catch (error) {
      console.error('导入银行对账单失败:', error);
      res.status(500).json({
        success: false,
        message: '导入银行对账单失败',
        error: error.message
      });
    }
  }
};

module.exports = cashController; 