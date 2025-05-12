const db = require('../config/db');
const financeModel = require('./finance');

/**
 * 应收账款模块数据库操作
 */
const arModel = {
  /**
   * 创建应收账款发票
   */
  createInvoice: async (invoiceData) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 计算余额
      const balanceAmount = invoiceData.total_amount;

      // 插入应收账款发票
      const [result] = await connection.query(
        `INSERT INTO ar_invoices 
        (invoice_number, customer_id, invoice_date, due_date, 
         total_amount, paid_amount, balance_amount, 
         currency_code, exchange_rate, status, terms, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceData.invoice_number,
          invoiceData.customer_id,
          invoiceData.invoice_date,
          invoiceData.due_date,
          invoiceData.total_amount,
          0, // 初始已付金额为0
          balanceAmount,
          invoiceData.currency_code || 'CNY',
          invoiceData.exchange_rate || 1,
          invoiceData.status || '草稿',
          invoiceData.terms || null,
          invoiceData.notes || null
        ]
      );

      const invoiceId = result.insertId;

      // 如果发票状态为"已确认"，则创建会计分录
      if (invoiceData.status === '已确认' && invoiceData.gl_entry) {
        const entryData = {
          entry_number: invoiceData.gl_entry.entry_number,
          entry_date: invoiceData.invoice_date,
          posting_date: invoiceData.invoice_date,
          document_type: '发票',
          document_number: invoiceData.invoice_number,
          period_id: invoiceData.gl_entry.period_id,
          description: `客户 ${invoiceData.customer_name} 应收账款`,
          created_by: invoiceData.gl_entry.created_by
        };

        // 应收账款分录明细
        const entryItems = [
          // 借：应收账款
          {
            account_id: invoiceData.gl_entry.receivable_account_id,
            debit_amount: invoiceData.total_amount,
            credit_amount: 0,
            currency_code: invoiceData.currency_code || 'CNY',
            exchange_rate: invoiceData.exchange_rate || 1,
            description: `应收账款 - 发票号: ${invoiceData.invoice_number}`
          },
          // 贷：销售收入
          {
            account_id: invoiceData.gl_entry.income_account_id,
            debit_amount: 0,
            credit_amount: invoiceData.total_amount,
            currency_code: invoiceData.currency_code || 'CNY',
            exchange_rate: invoiceData.exchange_rate || 1,
            description: `销售收入 - 发票号: ${invoiceData.invoice_number}`
          }
        ];

        // 创建会计分录
        await financeModel.createEntry(entryData, entryItems, connection);
      }

      await connection.commit();
      return invoiceId;
    } catch (error) {
      await connection.rollback();
      console.error('创建应收账款发票失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * 按ID获取应收账款发票
   */
  getInvoiceById: async (id) => {
    try {
      const [invoices] = await db.query(
        `SELECT a.*, c.customer_name
         FROM ar_invoices a
         LEFT JOIN customers c ON a.customer_id = c.id
         WHERE a.id = ?`,
        [id]
      );
      return invoices.length > 0 ? invoices[0] : null;
    } catch (error) {
      console.error('获取应收账款发票失败:', error);
      throw error;
    }
  },

  /**
   * 获取应收账款发票列表
   */
  getInvoices: async (filters = {}, page = 1, pageSize = 20) => {
    try {
      let query = `
        SELECT a.*, c.customer_name
        FROM ar_invoices a
        LEFT JOIN customers c ON a.customer_id = c.id
        WHERE 1=1
      `;
      const params = [];

      // 添加过滤条件
      if (filters.invoice_number) {
        query += ' AND a.invoice_number LIKE ?';
        params.push(`%${filters.invoice_number}%`);
      }
      
      if (filters.customer_id) {
        query += ' AND a.customer_id = ?';
        params.push(filters.customer_id);
      }
      
      if (filters.start_date && filters.end_date) {
        query += ' AND a.invoice_date BETWEEN ? AND ?';
        params.push(filters.start_date, filters.end_date);
      } else if (filters.start_date) {
        query += ' AND a.invoice_date >= ?';
        params.push(filters.start_date);
      } else if (filters.end_date) {
        query += ' AND a.invoice_date <= ?';
        params.push(filters.end_date);
      }
      
      if (filters.status) {
        query += ' AND a.status = ?';
        params.push(filters.status);
      }

      // 添加排序和分页
      query += ' ORDER BY a.invoice_date DESC, a.id DESC LIMIT ? OFFSET ?';
      params.push(pageSize, (page - 1) * pageSize);

      // 执行查询
      const [invoices] = await db.query(query, params);
      
      // 获取总记录数
      let countQuery = 'SELECT COUNT(*) as total FROM ar_invoices a WHERE 1=1';
      const countParams = [...params];
      countParams.pop(); // 移除LIMIT
      countParams.pop(); // 移除OFFSET
      
      // 添加与主查询相同的过滤条件
      if (filters.invoice_number) {
        countQuery += ' AND a.invoice_number LIKE ?';
      }
      
      if (filters.customer_id) {
        countQuery += ' AND a.customer_id = ?';
      }
      
      if (filters.start_date && filters.end_date) {
        countQuery += ' AND a.invoice_date BETWEEN ? AND ?';
      } else if (filters.start_date) {
        countQuery += ' AND a.invoice_date >= ?';
      } else if (filters.end_date) {
        countQuery += ' AND a.invoice_date <= ?';
      }
      
      if (filters.status) {
        countQuery += ' AND a.status = ?';
      }
      
      const [countResult] = await db.query(countQuery, countParams);
      const total = countResult[0].total;
      
      return {
        invoices,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      console.error('获取应收账款发票列表失败:', error);
      throw error;
    }
  },

  /**
   * 更新应收账款发票状态
   */
  updateInvoiceStatus: async (id, status) => {
    try {
      const [result] = await db.query(
        'UPDATE ar_invoices SET status = ? WHERE id = ?',
        [status, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新应收账款发票状态失败:', error);
      throw error;
    }
  },

  /**
   * 创建收款记录
   */
  createReceipt: async (receiptData, receiptItems) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 插入收款记录
      const [result] = await connection.query(
        `INSERT INTO ar_receipts 
        (receipt_number, customer_id, receipt_date, total_amount, 
         payment_method, reference_number, bank_account_id, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptData.receipt_number,
          receiptData.customer_id,
          receiptData.receipt_date,
          receiptData.total_amount,
          receiptData.payment_method,
          receiptData.reference_number || null,
          receiptData.bank_account_id || null,
          receiptData.notes || null
        ]
      );

      const receiptId = result.insertId;

      // 插入收款明细并更新发票状态
      let totalPaid = 0;
      for (const item of receiptItems) {
        // 插入收款明细
        await connection.query(
          'INSERT INTO ar_receipt_items (receipt_id, invoice_id, amount, discount_amount) VALUES (?, ?, ?, ?)',
          [
            receiptId,
            item.invoice_id,
            item.amount,
            item.discount_amount || 0
          ]
        );

        // 获取发票当前信息
        const [invoices] = await connection.query(
          'SELECT * FROM ar_invoices WHERE id = ?',
          [item.invoice_id]
        );
        
        if (invoices.length === 0) {
          throw new Error(`发票ID ${item.invoice_id} 不存在`);
        }
        
        const invoice = invoices[0];
        
        // 计算新的已付金额和余额
        const newPaidAmount = parseFloat(invoice.paid_amount) + parseFloat(item.amount);
        const newBalanceAmount = parseFloat(invoice.total_amount) - newPaidAmount;
        
        // 确定新的状态
        let newStatus;
        if (newBalanceAmount <= 0) {
          newStatus = '已付款';
        } else if (newPaidAmount > 0) {
          newStatus = '部分付款';
        } else {
          newStatus = invoice.status;
        }
        
        // 更新发票
        await connection.query(
          'UPDATE ar_invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ?',
          [newPaidAmount, newBalanceAmount, newStatus, item.invoice_id]
        );
        
        totalPaid += parseFloat(item.amount);
      }

      // 如果提供了会计分录信息，创建收款会计分录
      if (receiptData.gl_entry) {
        const entryData = {
          entry_number: receiptData.gl_entry.entry_number,
          entry_date: receiptData.receipt_date,
          posting_date: receiptData.receipt_date,
          document_type: '收款单',
          document_number: receiptData.receipt_number,
          period_id: receiptData.gl_entry.period_id,
          description: `客户 ${receiptData.customer_name} 收款`,
          created_by: receiptData.gl_entry.created_by
        };

        // 收款分录明细
        const entryItems = [
          // 借：银行/现金
          {
            account_id: receiptData.gl_entry.bank_account_id,
            debit_amount: totalPaid,
            credit_amount: 0,
            description: `收款 - 收款单号: ${receiptData.receipt_number}`
          },
          // 贷：应收账款
          {
            account_id: receiptData.gl_entry.receivable_account_id,
            debit_amount: 0,
            credit_amount: totalPaid,
            description: `应收账款减少 - 收款单号: ${receiptData.receipt_number}`
          }
        ];

        // 创建会计分录
        await financeModel.createEntry(entryData, entryItems, connection);
      }

      await connection.commit();
      return receiptId;
    } catch (error) {
      await connection.rollback();
      console.error('创建收款记录失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * 获取收款记录
   */
  getReceiptById: async (id) => {
    try {
      // 获取收款记录
      const [receipts] = await db.query(
        `SELECT r.*, c.customer_name, b.account_name as bank_account_name
         FROM ar_receipts r
         LEFT JOIN customers c ON r.customer_id = c.id
         LEFT JOIN bank_accounts b ON r.bank_account_id = b.id
         WHERE r.id = ?`,
        [id]
      );
      
      if (receipts.length === 0) return null;
      
      const receipt = receipts[0];
      
      // 获取收款明细
      const [items] = await db.query(
        `SELECT ri.*, i.invoice_number
         FROM ar_receipt_items ri
         LEFT JOIN ar_invoices i ON ri.invoice_id = i.id
         WHERE ri.receipt_id = ?`,
        [id]
      );
      
      receipt.items = items;
      
      return receipt;
    } catch (error) {
      console.error('获取收款记录失败:', error);
      throw error;
    }
  },

  /**
   * 获取收款记录列表
   */
  getReceipts: async (filters = {}, page = 1, pageSize = 20) => {
    try {
      let query = `
        SELECT r.*, c.customer_name
        FROM ar_receipts r
        LEFT JOIN customers c ON r.customer_id = c.id
        WHERE 1=1
      `;
      const params = [];

      // 添加过滤条件
      if (filters.receipt_number) {
        query += ' AND r.receipt_number LIKE ?';
        params.push(`%${filters.receipt_number}%`);
      }
      
      if (filters.customer_id) {
        query += ' AND r.customer_id = ?';
        params.push(filters.customer_id);
      }
      
      if (filters.start_date && filters.end_date) {
        query += ' AND r.receipt_date BETWEEN ? AND ?';
        params.push(filters.start_date, filters.end_date);
      } else if (filters.start_date) {
        query += ' AND r.receipt_date >= ?';
        params.push(filters.start_date);
      } else if (filters.end_date) {
        query += ' AND r.receipt_date <= ?';
        params.push(filters.end_date);
      }
      
      if (filters.payment_method) {
        query += ' AND r.payment_method = ?';
        params.push(filters.payment_method);
      }

      // 添加排序和分页
      query += ' ORDER BY r.receipt_date DESC, r.id DESC LIMIT ? OFFSET ?';
      params.push(pageSize, (page - 1) * pageSize);

      // 执行查询
      const [receipts] = await db.query(query, params);
      
      // 获取总记录数
      let countQuery = 'SELECT COUNT(*) as total FROM ar_receipts r WHERE 1=1';
      const countParams = [...params];
      countParams.pop(); // 移除LIMIT
      countParams.pop(); // 移除OFFSET
      
      // 添加与主查询相同的过滤条件
      if (filters.receipt_number) {
        countQuery += ' AND r.receipt_number LIKE ?';
      }
      
      if (filters.customer_id) {
        countQuery += ' AND r.customer_id = ?';
      }
      
      if (filters.start_date && filters.end_date) {
        countQuery += ' AND r.receipt_date BETWEEN ? AND ?';
      } else if (filters.start_date) {
        countQuery += ' AND r.receipt_date >= ?';
      } else if (filters.end_date) {
        countQuery += ' AND r.receipt_date <= ?';
      }
      
      if (filters.payment_method) {
        countQuery += ' AND r.payment_method = ?';
      }
      
      const [countResult] = await db.query(countQuery, countParams);
      const total = countResult[0].total;
      
      return {
        receipts,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      console.error('获取收款记录列表失败:', error);
      throw error;
    }
  },

  /**
   * 获取客户应收账款汇总
   */
  getCustomerReceivables: async (customerId = null) => {
    try {
      let query = `
        SELECT 
          c.id AS customer_id,
          c.customer_name,
          COUNT(a.id) AS invoice_count,
          SUM(a.total_amount) AS total_amount,
          SUM(a.paid_amount) AS paid_amount,
          SUM(a.balance_amount) AS balance_amount
        FROM customers c
        LEFT JOIN ar_invoices a ON c.id = a.customer_id AND a.status != '已取消'
      `;
      
      const params = [];
      
      if (customerId) {
        query += ' WHERE c.id = ?';
        params.push(customerId);
      }
      
      query += ' GROUP BY c.id, c.customer_name ORDER BY balance_amount DESC';
      
      const [results] = await db.query(query, params);
      return results;
    } catch (error) {
      console.error('获取客户应收账款汇总失败:', error);
      throw error;
    }
  },

  /**
   * 获取应收账款账龄分析
   */
  getReceivablesAging: async (customerId = null, asOfDate = null) => {
    try {
      // 如果没有指定日期，使用当前日期
      const currentDate = asOfDate || new Date().toISOString().split('T')[0];
      
      let query = `
        SELECT 
          c.id AS customer_id,
          c.customer_name,
          SUM(CASE WHEN DATEDIFF(?, a.due_date) <= 0 THEN a.balance_amount ELSE 0 END) AS current_amount,
          SUM(CASE WHEN DATEDIFF(?, a.due_date) BETWEEN 1 AND 30 THEN a.balance_amount ELSE 0 END) AS '1_30_days',
          SUM(CASE WHEN DATEDIFF(?, a.due_date) BETWEEN 31 AND 60 THEN a.balance_amount ELSE 0 END) AS '31_60_days',
          SUM(CASE WHEN DATEDIFF(?, a.due_date) BETWEEN 61 AND 90 THEN a.balance_amount ELSE 0 END) AS '61_90_days',
          SUM(CASE WHEN DATEDIFF(?, a.due_date) > 90 THEN a.balance_amount ELSE 0 END) AS 'over_90_days',
          SUM(a.balance_amount) AS total_amount
        FROM customers c
        LEFT JOIN ar_invoices a ON c.id = a.customer_id AND a.status != '已付款' AND a.status != '已取消'
      `;
      
      const params = [currentDate, currentDate, currentDate, currentDate, currentDate];
      
      if (customerId) {
        query += ' WHERE c.id = ?';
        params.push(customerId);
      }
      
      query += ' GROUP BY c.id, c.customer_name HAVING total_amount > 0 ORDER BY total_amount DESC';
      
      const [results] = await db.query(query, params);
      return results;
    } catch (error) {
      console.error('获取应收账款账龄分析失败:', error);
      throw error;
    }
  }
};

module.exports = arModel; 