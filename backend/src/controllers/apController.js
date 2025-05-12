const express = require('express');
const validationResult = require('express-validator').validationResult;
const apModel = require('../models/ap');
const db = require('../config/db');

/**
 * 应付账款控制器
 */
const apController = {
  /**
   * 获取应付账款发票列表
   */
  getInvoices: async (req, res) => {
    try {
      const { page = 1, limit = 20, invoiceNumber, supplierName, startDate, endDate, status } = req.query;
      
      // 构建过滤条件
      const filters = {};
      if (invoiceNumber) filters.invoice_number = invoiceNumber;
      if (supplierName) filters.supplier_name = supplierName;
      if (startDate) filters.start_date = startDate;
      if (endDate) filters.end_date = endDate;
      if (status) filters.status = status;
      
      // 调用模型方法获取数据
      const result = await apModel.getInvoices(filters, parseInt(page), parseInt(limit));
      
      // 返回结果，直接使用模型返回的数据结构
      res.status(200).json(result);
    } catch (error) {
      console.error('获取应付账款发票失败:', error);
      res.status(500).json({ error: '获取应付账款发票失败', details: error.message });
    }
  },

  /**
   * 获取单个应付账款发票
   */
  getInvoiceById: async (req, res) => {
    try {
      const invoiceId = req.params.id;
      const invoice = await apModel.getInvoiceById(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: '未找到指定的发票' });
      }
      
      res.status(200).json(invoice);
    } catch (error) {
      console.error('获取应付账款发票失败:', error);
      res.status(500).json({ error: '获取应付账款发票失败', details: error.message });
    }
  },

  /**
   * 获取发票用于编辑
   */
  getInvoiceForEdit: async (req, res) => {
    try {
      const invoiceId = req.params.id;
      const invoice = await apModel.getInvoiceById(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: '未找到指定的发票' });
      }
      
      // 发票编辑格式化 - 确保所有金额字段是数字类型
      const formattedInvoice = {
        ...invoice,
        amount: parseFloat(invoice.amount),
        paidAmount: parseFloat(invoice.paidAmount || 0),
        balance: parseFloat(invoice.balance || 0),
        items: invoice.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          amount: parseFloat(item.amount)
        }))
      };
      
      res.status(200).json(formattedInvoice);
    } catch (error) {
      console.error('获取发票编辑数据失败:', error);
      res.status(500).json({ error: '获取发票编辑数据失败', details: error.message });
    }
  },

  /**
   * 创建应付账款发票
   */
  createInvoice: async (req, res) => {
    try {
      // 获取请求体中的数据
      const invoiceData = req.body;
      
      console.log('收到的发票数据:', invoiceData);
      
      // 准备数据以匹配数据库字段
      const formattedData = {
        invoice_number: invoiceData.invoiceNumber,
        supplier_id: invoiceData.supplierId,
        invoice_date: invoiceData.invoiceDate,
        due_date: invoiceData.dueDate,
        total_amount: invoiceData.amount,
        notes: invoiceData.notes,
        status: '草稿', // 设置默认状态为草稿
        items: invoiceData.items // 传递明细项
      };
      
      console.log('格式化后的发票数据:', formattedData);
      
      // 调用模型方法创建发票
      const invoiceId = await apModel.createInvoice(formattedData);
      
      // 返回成功结果
      res.status(201).json({
        id: invoiceId,
        message: '发票创建成功'
      });
    } catch (error) {
      console.error('创建应付账款发票失败:', error);
      res.status(500).json({ error: '创建应付账款发票失败', details: error.message });
    }
  },

  /**
   * 更新应付账款发票状态
   */
  updateInvoiceStatus: async (req, res) => {
    try {
      const invoiceId = req.params.id;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: '缺少状态参数' });
      }
      
      await apModel.updateInvoiceStatus(invoiceId, status);
      
      res.status(200).json({ message: '发票状态更新成功' });
    } catch (error) {
      console.error('更新应付账款发票状态失败:', error);
      res.status(500).json({ error: '更新应付账款发票状态失败', details: error.message });
    }
  },

  /**
   * 更新应付账款发票
   */
  updateInvoice: async (req, res) => {
    try {
      const invoiceId = req.params.id;
      const invoiceData = req.body;
      
      console.log('收到的发票更新数据:', invoiceData);
      
      // 检查发票是否存在
      const existingInvoice = await apModel.getInvoiceById(invoiceId);
      if (!existingInvoice) {
        return res.status(404).json({ error: '未找到指定的发票' });
      }
      
      // 检查发票状态，如果已完成付款则不允许修改
      if (existingInvoice.status === '已付款') {
        return res.status(400).json({ error: '已付款的发票不允许修改' });
      }
      
      // 准备数据以匹配数据库字段
      const formattedData = {
        id: invoiceId,
        invoice_number: invoiceData.invoiceNumber,
        supplier_id: invoiceData.supplierId,
        invoice_date: invoiceData.invoiceDate,
        due_date: invoiceData.dueDate,
        total_amount: invoiceData.amount,
        notes: invoiceData.notes,
        items: invoiceData.items // 传递明细项
      };
      
      console.log('格式化后的发票更新数据:', formattedData);
      
      // 调用模型方法更新发票
      const success = await apModel.updateInvoice(formattedData);
      
      if (success) {
        res.status(200).json({
          id: invoiceId,
          message: '发票更新成功'
        });
      } else {
        res.status(500).json({ error: '发票更新失败' });
      }
    } catch (error) {
      console.error('更新应付账款发票失败:', error);
      res.status(500).json({ error: '更新应付账款发票失败', details: error.message });
    }
  },

  /**
   * 获取付款记录列表
   */
  getPayments: async (req, res) => {
    try {
      console.log('接收到付款列表请求', req.query);
      const { page = 1, limit = 20, paymentNumber, supplierName, startDate, endDate, paymentMethod } = req.query;
      
      // 构建过滤条件
      const filters = {};
      if (paymentNumber) filters.payment_number = paymentNumber;
      if (supplierName) filters.supplier_name = supplierName;
      if (startDate) filters.start_date = startDate;
      if (endDate) filters.end_date = endDate;
      if (paymentMethod) filters.payment_method = paymentMethod;
      
      // 调用模型方法获取付款记录列表
      const result = await apModel.getPayments(filters, parseInt(page), parseInt(limit));
      
      // 映射结果，处理可能的字段不存在情况
      const mappedData = result.payments.map(payment => {
        // 确保所有必要字段存在
        const formatted = {
          id: payment.id,
          paymentNumber: payment.payment_number,
          supplierId: payment.supplier_id,
          // 供应商名可能从不同字段获取
          supplierName: payment.supplier_name || payment.name || 'Unknown Supplier',
          // 日期格式化，只保留年月日
          paymentDate: payment.payment_date ? payment.payment_date.substring(0, 10) : '',
          // 确保数值型数据正确格式化
          amount: parseFloat(payment.total_amount || 0),
          paymentMethod: payment.payment_method || 'Unknown',
          notes: payment.notes || '',
          createdAt: payment.created_at ? payment.created_at.substring(0, 10) : '',
          // 添加发票编号
          invoiceNumber: payment.invoice_number || '',
          // 为了兼容性，添加对应的发票ID
          invoiceId: null
        };
        console.log('格式化付款数据:', formatted);
        return formatted;
      });
      
      res.status(200).json({
        data: mappedData,
        total: result.pagination.total,
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalPages: result.pagination.totalPages
      });
    } catch (error) {
      console.error('获取付款记录失败:', error);
      res.status(500).json({ error: '获取付款记录失败', details: error.message });
    }
  },

  /**
   * 获取单个付款记录
   */
  getPaymentById: async (req, res) => {
    try {
      const paymentId = req.params.id;
      const payment = await apModel.getPaymentById(paymentId);
      
      if (!payment) {
        return res.status(404).json({ error: '未找到指定的付款记录' });
      }
      
      // 格式化数据以符合前端期望
      const formattedPayment = {
        id: payment.id,
        paymentNumber: payment.payment_number,
        supplierId: payment.supplier_id,
        supplierName: payment.name || payment.supplier_name || '',
        paymentDate: payment.payment_date || '',
        amount: parseFloat(payment.total_amount),
        paymentMethod: payment.payment_method,
        referenceNumber: payment.reference_number,
        bankAccountId: payment.bank_account_id,
        bankAccountName: payment.bank_account_name,
        notes: payment.notes || '',
        createdAt: payment.created_at || '',
        // 添加付款明细项
        items: payment.items.map(item => ({
          id: item.id,
          invoiceId: item.invoice_id,
          invoiceNumber: item.invoice_number,
          amount: parseFloat(item.amount),
          discountAmount: parseFloat(item.discount_amount || 0)
        }))
      };
      
      res.status(200).json(formattedPayment);
    } catch (error) {
      console.error('获取付款记录失败:', error);
      res.status(500).json({ error: '获取付款记录失败', details: error.message });
    }
  },

  /**
   * 创建付款记录
   * 付款记录引用应付账款发票，但不直接在应付账款模块中处理付款
   */
  createPayment: async (req, res) => {
    try {
      const paymentData = req.body;
      console.log('收到付款记录数据:', paymentData);
      
      // 确保有引用的发票ID
      if (!paymentData.invoiceId) {
        return res.status(400).json({ error: '付款记录必须关联一个应付账款发票' });
      }
      
      // 查询发票信息，确保发票存在并获取供应商ID和金额信息
      const invoice = await apModel.getInvoiceById(paymentData.invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: `发票ID ${paymentData.invoiceId} 不存在` });
      }
      
      // 检查发票是否已全额支付
      if (invoice.status === '已付款') {
        return res.status(400).json({ error: `发票ID ${paymentData.invoiceId} 已全额支付，无需再付款` });
      }
      
      // 检查付款金额是否超过未付余额
      if (parseFloat(paymentData.amount) > invoice.balance) {
        return res.status(400).json({ 
          error: `付款金额 ${paymentData.amount} 超过发票未付余额 ${invoice.balance}`,
          details: '付款金额不能超过发票未付余额'
        });
      }
      
      // 转换支付方式为数据库接受的值
      let paymentMethod = '银行转账'; // 默认值
      if (paymentData.paymentMethod) {
        // 映射前端传来的值到数据库接受的值
        const methodMap = {
          'bank_transfer': '银行转账',
          'cash': '现金',
          'check': '支票',
          'credit_card': '信用卡',
          'wechat': '微信',
          'alipay': '支付宝'
        };
        
        paymentMethod = methodMap[paymentData.paymentMethod] || '银行转账';
      }
      
      // 构建完整的付款数据结构
      const completePaymentData = {
        payment_number: paymentData.paymentNumber || `PAY-${Date.now()}`,
        supplier_id: invoice.supplierId,
        supplier_name: invoice.supplierName,
        payment_date: paymentData.paymentDate || new Date().toISOString().split('T')[0],
        total_amount: parseFloat(paymentData.amount),
        payment_method: paymentMethod,
        reference_number: paymentData.referenceNumber || null,
        bank_account_id: paymentData.bankAccountId || null,
        notes: paymentData.notes || ''
      };
      
      // 构建付款明细项数组
      const paymentItems = [{
        invoice_id: paymentData.invoiceId,
        amount: parseFloat(paymentData.amount), 
        discount_amount: parseFloat(paymentData.discountAmount || 0)
      }];
      
      console.log('处理后的付款数据:', completePaymentData);
      console.log('处理后的付款明细:', paymentItems);
      
      // 创建自动生成会计凭证的数据
      // 获取当前会计期间ID
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // 校验会计科目是否存在
      let payableAccountId, bankAccountId;
      try {
        const [payableAccountCheck] = await db.pool.execute(
          'SELECT id FROM gl_accounts WHERE account_code = ?',
          ['2202']
        );
        
        const [bankAccountCheck] = await db.pool.execute(
          'SELECT id FROM gl_accounts WHERE account_code = ?',
          [completePaymentData.payment_method === '现金' ? '1001' : '1002']
        );
        
        const [periodCheck] = await db.pool.execute(
          'SELECT id FROM gl_periods WHERE id = ?',
          [1]
        );
        
        if (!payableAccountCheck.length) {
          console.error('应付账款科目2202不存在');
          throw new Error('应付账款科目不存在');
        }
        
        if (!bankAccountCheck.length) {
          console.error('银行/现金科目不存在');
          throw new Error('银行/现金科目不存在');
        }
        
        if (!periodCheck.length) {
          console.error('会计期间1不存在');
          throw new Error('会计期间不存在');
        }

        // 保存科目ID到外部变量
        payableAccountId = payableAccountCheck[0].id;
        bankAccountId = bankAccountCheck[0].id;
      } catch (error) {
        console.error('会计科目或期间验证失败:', error);
        throw error;
      }
      
      // 创建会计凭证数据
      const glEntry = {
        entry_number: `AP-${completePaymentData.payment_number}`,
        period_id: 1, // 默认期间ID，实际应用中应该根据当前日期获取
        created_by: 'system', // 系统自动创建
        // 根据付款方式确定相应科目
        payable_account_id: payableAccountId, // 使用保存的科目ID
        bank_account_id: bankAccountId  // 使用保存的科目ID
      };
      
      // 添加会计凭证数据到付款数据中
      completePaymentData.gl_entry = glEntry;
      
      // 调用模型方法创建付款记录（会自动创建会计凭证）
      const paymentId = await apModel.createPayment(completePaymentData, paymentItems);
      
      res.status(201).json({
        id: paymentId,
        message: '付款记录创建成功，已自动生成会计凭证',
        details: {
          invoice: invoice.invoiceNumber,
          supplier: invoice.supplierName,
          amount: paymentData.amount,
          paymentDate: completePaymentData.payment_date,
          paymentNumber: completePaymentData.payment_number,
          glEntryNumber: glEntry.entry_number
        }
      });
    } catch (error) {
      console.error('创建付款记录失败:', error);
      res.status(500).json({ error: '创建付款记录失败', details: error.message });
    }
  },

  /**
   * 获取供应商应付款
   */
  getSupplierPayables: async (req, res) => {
    try {
      res.status(200).json({ message: 'API未实现' });
    } catch (error) {
      console.error('获取供应商应付款失败:', error);
      res.status(500).json({ error: '获取供应商应付款失败', details: error.message });
    }
  },

  /**
   * 获取单个供应商应付款
   */
  getSupplierPayablesById: async (req, res) => {
    try {
      res.status(200).json({ message: 'API未实现' });
    } catch (error) {
      console.error('获取供应商应付款失败:', error);
      res.status(500).json({ error: '获取供应商应付款失败', details: error.message });
    }
  },

  /**
   * 获取应付账款账龄分析
   */
  getPayablesAging: async (req, res) => {
    try {
      res.status(200).json({ message: 'API未实现' });
    } catch (error) {
      console.error('获取应付账款账龄分析失败:', error);
      res.status(500).json({ error: '获取应付账款账龄分析失败', details: error.message });
    }
  },

  /**
   * 获取单个应付账款账龄分析
   */
  getPayablesAgingById: async (req, res) => {
    try {
      res.status(200).json({ message: 'API未实现' });
    } catch (error) {
      console.error('获取应付账款账龄分析失败:', error);
      res.status(500).json({ error: '获取应付账款账龄分析失败', details: error.message });
    }
  },

  /**
   * 获取发票关联的付款记录
   */
  getInvoicePayments: async (req, res) => {
    try {
      const invoiceId = req.params.id;
      
      // 确认发票存在
      const invoice = await apModel.getInvoiceById(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: '未找到指定的发票' });
      }
      
      // 查询发票关联的付款记录
      const payments = await apModel.getInvoicePayments(invoiceId);
      
      res.status(200).json({
        data: payments,
        total: payments.length,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: parseFloat(invoice.amount),
          paidAmount: parseFloat(invoice.paidAmount),
          balance: parseFloat(invoice.balance)
        }
      });
    } catch (error) {
      console.error('获取发票付款记录失败:', error);
      res.status(500).json({ error: '获取发票付款记录失败', details: error.message });
    }
  },

  /**
   * 测试数据库连接和表结构
   */
  testDatabase: async (req, res) => {
    try {
      console.log('开始测试数据库连接');
      
      // 使用pool.execute而不是query
      try {
        const [result] = await db.pool.execute('DESCRIBE ap_invoices');
        console.log('ap_invoices表结构:', result);
        
        const [countResult] = await db.pool.execute('SELECT COUNT(*) as count FROM ap_invoices');
        console.log('ap_invoices表记录数:', countResult[0].count);
        
        res.status(200).json({
          message: '数据库连接和表结构测试成功',
          table_exists: true,
          record_count: countResult[0].count,
          table_structure: result
        });
      } catch (tableError) {
        console.error('表结构测试失败:', tableError);
        res.status(500).json({
          message: '表结构测试失败',
          error: tableError.message
        });
      }
    } catch (error) {
      console.error('数据库连接测试失败:', error);
      res.status(500).json({
        message: '数据库连接测试失败',
        error: error.message
      });
    }
  },

  /**
   * 获取未付清的应付账款发票列表（用于支付选择）
   */
  getUnpaidInvoices: async (req, res) => {
    try {
      // 调用模型方法获取未付清的发票
      const invoices = await apModel.getUnpaidInvoices();
      
      res.status(200).json({
        data: invoices,
        total: invoices.length
      });
    } catch (error) {
      console.error('获取未付清发票列表失败:', error);
      res.status(500).json({ error: '获取未付清发票列表失败', details: error.message });
    }
  },

  /**
   * 获取待付款发票列表
   */
  getPendingInvoices: async (req, res) => {
    try {
      // 直接查询数据库获取未付清的发票
      const db = require('../config/db');
      
      // 查询未付清的发票（状态为'草稿'、'已确认'、'部分付款'的发票）
      const [invoices] = await db.pool.execute(
        `SELECT a.id, a.invoice_number as invoiceNumber, 
                a.supplier_id as supplierId, s.name as supplierName,
                DATE_FORMAT(a.invoice_date, '%Y-%m-%d') as invoiceDate, 
                DATE_FORMAT(a.due_date, '%Y-%m-%d') as dueDate,
                ROUND(a.total_amount, 2) as amount,
                ROUND(a.paid_amount, 2) as paidAmount,
                ROUND(a.balance_amount, 2) as balance,
                a.status
         FROM ap_invoices a
         LEFT JOIN suppliers s ON a.supplier_id = s.id
         WHERE a.status IN ('草稿', '已确认', '部分付款')
         AND a.balance_amount > 0
         ORDER BY a.due_date ASC, a.id ASC`
      );
      
      console.log(`找到 ${invoices.length} 条未付清发票`);
      
      // 转换金额为数字类型
      const formattedInvoices = invoices.map(invoice => ({
        ...invoice,
        amount: parseFloat(invoice.amount),
        paidAmount: parseFloat(invoice.paidAmount),
        balance: parseFloat(invoice.balance)
      }));
      
      res.status(200).json({
        data: formattedInvoices,
        total: formattedInvoices.length
      });
    } catch (error) {
      console.error('获取未付清发票列表失败:', error);
      res.status(500).json({ error: '获取未付清发票列表失败', details: error.message });
    }
  },
};

module.exports = apController; 