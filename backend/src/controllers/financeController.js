const financeModel = require('../models/finance');
const arModel = require('../models/ar');
const apModel = require('../models/ap');
const assetsModel = require('../models/assets');
const cashModel = require('../models/cash');

/**
 * 财务总账控制器
 */
const financeController = {
  /**
   * 初始化财务系统表格
   */
  initFinanceTables: async (req, res) => {
    try {
      console.log('开始初始化财务系统数据...');
      
      const finance = require('../models/finance');
      const cash = require('../models/cash');
      
      // 创建所需表格
      await finance.createTables();
      
      // 初始化会计科目和会计期间
      await finance.initializeGLAccounts();
      
      // 初始化银行账户表结构
      await cash.initializeBankTables();
      
      res.json({
        success: true,
        message: '财务系统数据初始化成功'
      });
    } catch (error) {
      console.error('初始化财务系统数据失败:', error);
      res.status(500).json({
        success: false,
        message: '初始化财务系统数据失败',
        error: error.message
      });
    }
  },

  // ===== 会计科目相关方法 =====

  /**
   * 获取所有会计科目
   */
  getAllAccounts: async (req, res) => {
    try {
      const accounts = await financeModel.getAllAccounts();
      res.status(200).json({ accounts });
    } catch (error) {
      console.error('获取会计科目失败:', error);
      res.status(500).json({ error: '获取会计科目失败', details: error.message });
    }
  },

  /**
   * 获取单个会计科目
   */
  getAccountById: async (req, res) => {
    try {
      const { id } = req.params;
      const account = await financeModel.getAccountById(id);
      
      if (!account) {
        return res.status(404).json({ error: '会计科目不存在' });
      }
      
      res.status(200).json({ account });
    } catch (error) {
      console.error('获取会计科目失败:', error);
      res.status(500).json({ error: '获取会计科目失败', details: error.message });
    }
  },

  /**
   * 创建会计科目
   */
  createAccount: async (req, res) => {
    try {
      const {
        account_code,
        account_name,
        account_type,
        parent_id,
        is_debit,
        is_active,
        currency_code,
        description
      } = req.body;

      // 验证必填字段
      if (!account_code || !account_name || !account_type) {
        return res.status(400).json({ error: '科目编码、名称和类型为必填项' });
      }

      // 验证科目类型
      const validTypes = ['资产', '负债', '所有者权益', '收入', '成本', '费用'];
      if (!validTypes.includes(account_type)) {
        return res.status(400).json({ error: '无效的科目类型' });
      }

      const accountId = await financeModel.createAccount({
        account_code,
        account_name,
        account_type,
        parent_id,
        is_debit,
        is_active,
        currency_code,
        description
      });

      res.status(201).json({
        message: '会计科目创建成功',
        account_id: accountId
      });
    } catch (error) {
      console.error('创建会计科目失败:', error);
      res.status(500).json({ error: '创建会计科目失败', details: error.message });
    }
  },

  /**
   * 更新会计科目
   */
  updateAccount: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        account_name,
        account_type,
        parent_id,
        is_debit,
        is_active,
        currency_code,
        description
      } = req.body;

      // 验证必填字段
      if (!account_name || !account_type) {
        return res.status(400).json({ error: '科目名称和类型为必填项' });
      }

      // 验证科目类型
      const validTypes = ['资产', '负债', '所有者权益', '收入', '成本', '费用'];
      if (!validTypes.includes(account_type)) {
        return res.status(400).json({ error: '无效的科目类型' });
      }

      // 检查科目是否存在
      const account = await financeModel.getAccountById(id);
      if (!account) {
        return res.status(404).json({ error: '会计科目不存在' });
      }

      const success = await financeModel.updateAccount(id, {
        account_name,
        account_type,
        parent_id,
        is_debit,
        is_active,
        currency_code,
        description
      });

      if (success) {
        res.status(200).json({ message: '会计科目更新成功' });
      } else {
        res.status(400).json({ error: '会计科目更新失败' });
      }
    } catch (error) {
      console.error('更新会计科目失败:', error);
      res.status(500).json({ error: '更新会计科目失败', details: error.message });
    }
  },

  /**
   * 停用会计科目
   */
  deactivateAccount: async (req, res) => {
    try {
      const { id } = req.params;

      // 检查科目是否存在
      const account = await financeModel.getAccountById(id);
      if (!account) {
        return res.status(404).json({ error: '会计科目不存在' });
      }

      const success = await financeModel.deactivateAccount(id);

      if (success) {
        res.status(200).json({ message: '会计科目已停用' });
      } else {
        res.status(400).json({ error: '会计科目停用失败' });
      }
    } catch (error) {
      console.error('停用会计科目失败:', error);
      res.status(500).json({ error: '停用会计科目失败', details: error.message });
    }
  },

  /**
   * 获取会计科目选项（用于级联选择器）
   */
  getAccountOptions: async (req, res) => {
    try {
      const accounts = await financeModel.getAllAccounts();
      res.status(200).json({ 
        accounts: accounts 
      });
    } catch (error) {
      console.error('获取会计科目选项失败:', error);
      res.status(500).json({ error: '获取会计科目选项失败', details: error.message });
    }
  },

  // ===== 会计分录相关方法 =====

  /**
   * 创建会计分录
   */
  createEntry: async (req, res) => {
    try {
      const {
        entry_number,
        entry_date,
        posting_date,
        document_type,
        document_number,
        period_id,
        description,
        created_by,
        items
      } = req.body;

      // 验证必填字段
      if (!entry_number || !entry_date || !posting_date || !document_type || !period_id || !created_by) {
        return res.status(400).json({ error: '分录编号、日期、过账日期、单据类型、会计期间和创建人为必填项' });
      }

      // 验证分录明细
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: '分录明细为必填项且不能为空' });
      }

      // 验证借贷平衡
      let totalDebit = 0;
      let totalCredit = 0;
      
      for (const item of items) {
        if (!item.account_id) {
          return res.status(400).json({ error: '每个分录明细必须包含科目ID' });
        }
        
        totalDebit += parseFloat(item.debit_amount || 0);
        totalCredit += parseFloat(item.credit_amount || 0);
      }
      
      // 四舍五入到两位小数，避免浮点数精度问题
      totalDebit = Math.round(totalDebit * 100) / 100;
      totalCredit = Math.round(totalCredit * 100) / 100;
      
      if (totalDebit !== totalCredit) {
        return res.status(400).json({
          error: '借贷不平衡',
          totalDebit,
          totalCredit,
          difference: Math.abs(totalDebit - totalCredit)
        });
      }

      const entryId = await financeModel.createEntry({
        entry_number,
        entry_date,
        posting_date,
        document_type,
        document_number,
        period_id,
        description,
        created_by
      }, items);

      res.status(201).json({
        message: '会计分录创建成功',
        entry_id: entryId
      });
    } catch (error) {
      console.error('创建会计分录失败:', error);
      res.status(500).json({ error: '创建会计分录失败', details: error.message });
    }
  },

  /**
   * 获取会计分录列表
   */
  getEntries: async (req, res) => {
    try {
      const {
        entry_number,
        start_date,
        end_date,
        document_type,
        period_id,
        is_posted,
        page = 1,
        pageSize = 20
      } = req.query;

      const filters = {};
      
      if (entry_number) filters.entry_number = entry_number;
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;
      if (document_type) filters.document_type = document_type;
      if (period_id) filters.period_id = parseInt(period_id);
      if (is_posted !== undefined) filters.is_posted = is_posted === 'true';

      const result = await financeModel.getEntries(
        filters,
        parseInt(page),
        parseInt(pageSize)
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('获取会计分录列表失败:', error);
      res.status(500).json({ error: '获取会计分录列表失败', details: error.message });
    }
  },

  /**
   * 获取单个会计分录
   */
  getEntryById: async (req, res) => {
    try {
      const { id } = req.params;
      const entry = await financeModel.getEntryById(id);
      
      if (!entry) {
        return res.status(404).json({ error: '会计分录不存在' });
      }
      
      res.status(200).json({ entry });
    } catch (error) {
      console.error('获取会计分录失败:', error);
      res.status(500).json({ error: '获取会计分录失败', details: error.message });
    }
  },

  /**
   * 获取会计分录明细
   */
  getEntryItems: async (req, res) => {
    try {
      const { id } = req.params;
      
      // 先检查分录是否存在
      const entry = await financeModel.getEntryById(id);
      if (!entry) {
        return res.status(404).json({ error: '会计分录不存在' });
      }
      
      // 获取完整的明细信息，包括科目信息
      const items = await financeModel.getEntryItems(id);
      
      // 将科目信息和金额格式化为前端需要的格式
      const formattedItems = items.map(item => ({
        id: item.id,
        accountId: item.account_id,
        accountCode: item.account_code,
        accountName: item.account_name,
        debitAmount: parseFloat(item.debit_amount) || 0,
        creditAmount: parseFloat(item.credit_amount) || 0,
        currencyCode: item.currency_code || 'CNY',
        exchangeRate: parseFloat(item.exchange_rate) || 1,
        costCenterId: item.cost_center_id,
        description: item.description
      }));
      
      res.status(200).json(formattedItems);
    } catch (error) {
      console.error('获取会计分录明细失败:', error);
      res.status(500).json({ error: '获取会计分录明细失败', details: error.message });
    }
  },

  /**
   * 过账会计分录
   */
  postEntry: async (req, res) => {
    try {
      const { id } = req.params;

      // 检查分录是否存在
      const entry = await financeModel.getEntryById(id);
      if (!entry) {
        return res.status(404).json({ error: '会计分录不存在' });
      }

      // 检查分录是否已过账
      if (entry.is_posted) {
        return res.status(400).json({ error: '会计分录已过账' });
      }

      const success = await financeModel.postEntry(id);

      if (success) {
        res.status(200).json({ message: '会计分录过账成功' });
      } else {
        res.status(400).json({ error: '会计分录过账失败' });
      }
    } catch (error) {
      console.error('过账会计分录失败:', error);
      res.status(500).json({ error: '过账会计分录失败', details: error.message });
    }
  },

  /**
   * 冲销会计分录
   */
  reverseEntry: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        entry_number,
        entry_date,
        posting_date,
        period_id,
        description,
        created_by
      } = req.body;

      // 验证必填字段
      if (!entry_number || !entry_date || !posting_date || !period_id || !created_by) {
        return res.status(400).json({ error: '冲销分录编号、日期、过账日期、会计期间和创建人为必填项' });
      }

      // 检查分录是否存在
      const entry = await financeModel.getEntryById(id);
      if (!entry) {
        return res.status(404).json({ error: '原会计分录不存在' });
      }

      // 检查分录是否已冲销
      if (entry.is_reversed) {
        return res.status(400).json({ error: '会计分录已冲销' });
      }

      const reversalEntryId = await financeModel.reverseEntry(id, {
        entry_number,
        entry_date,
        posting_date,
        period_id,
        description,
        created_by
      });

      res.status(200).json({
        message: '会计分录冲销成功',
        reversal_entry_id: reversalEntryId
      });
    } catch (error) {
      console.error('冲销会计分录失败:', error);
      res.status(500).json({ error: '冲销会计分录失败', details: error.message });
    }
  },

  // ===== 会计期间相关方法 =====

  /**
   * 获取所有会计期间
   */
  getAllPeriods: async (req, res) => {
    try {
      const periods = await financeModel.getAllPeriods();
      res.status(200).json({ periods });
    } catch (error) {
      console.error('获取会计期间失败:', error);
      res.status(500).json({ error: '获取会计期间失败', details: error.message });
    }
  },

  /**
   * 获取单个会计期间
   */
  getPeriodById: async (req, res) => {
    try {
      const { id } = req.params;
      const period = await financeModel.getPeriodById(id);
      
      if (!period) {
        return res.status(404).json({ error: '会计期间不存在' });
      }
      
      res.status(200).json({ period });
    } catch (error) {
      console.error('获取会计期间失败:', error);
      res.status(500).json({ error: '获取会计期间失败', details: error.message });
    }
  },

  /**
   * 创建会计期间
   */
  createPeriod: async (req, res) => {
    try {
      const {
        period_name,
        start_date,
        end_date,
        is_closed,
        is_adjusting,
        fiscal_year
      } = req.body;

      // 验证必填字段
      if (!period_name || !start_date || !end_date || !fiscal_year) {
        return res.status(400).json({ error: '期间名称、开始日期、结束日期和财政年度为必填项' });
      }

      // 验证日期
      if (new Date(start_date) > new Date(end_date)) {
        return res.status(400).json({ error: '开始日期不能晚于结束日期' });
      }

      const periodId = await financeModel.createPeriod({
        period_name,
        start_date,
        end_date,
        is_closed,
        is_adjusting,
        fiscal_year
      });

      res.status(201).json({
        message: '会计期间创建成功',
        period_id: periodId
      });
    } catch (error) {
      console.error('创建会计期间失败:', error);
      res.status(500).json({ error: '创建会计期间失败', details: error.message });
    }
  },

  /**
   * 关闭会计期间
   */
  closePeriod: async (req, res) => {
    try {
      const { id } = req.params;

      // 检查期间是否存在
      const period = await financeModel.getPeriodById(id);
      if (!period) {
        return res.status(404).json({ error: '会计期间不存在' });
      }

      // 检查期间是否已关闭
      if (period.is_closed) {
        return res.status(400).json({ error: '会计期间已关闭' });
      }

      const success = await financeModel.closePeriod(id);

      if (success) {
        res.status(200).json({ message: '会计期间关闭成功' });
      } else {
        res.status(400).json({ error: '会计期间关闭失败' });
      }
    } catch (error) {
      console.error('关闭会计期间失败:', error);
      res.status(500).json({ error: '关闭会计期间失败', details: error.message });
    }
  }
};

module.exports = financeController; 