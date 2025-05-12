const db = require('../config/db');
const financeModel = require('./finance');

/**
 * 应付账款模块数据库操作
 */
const apModel = {
  /**
   * 创建应付账款发票
   */
  createInvoice: async (invoiceData) => {
    try {
      console.log('创建发票数据:', invoiceData);

      // 计算余额 - 确保使用正确的字段名
      const balanceAmount = invoiceData.total_amount;

      // 插入应付账款发票
      const [result] = await db.pool.execute(
        `INSERT INTO ap_invoices 
        (invoice_number, supplier_id, invoice_date, due_date, 
         total_amount, paid_amount, balance_amount, 
         currency_code, exchange_rate, status, terms, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceData.invoice_number,
          invoiceData.supplier_id,
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
      console.log('发票创建成功，ID:', invoiceId);

      // 如果有发票明细项，保存明细项
      if (invoiceData.items && Array.isArray(invoiceData.items) && invoiceData.items.length > 0) {
        console.log('处理发票明细项:', invoiceData.items);
        
        for (const item of invoiceData.items) {
          await db.pool.execute(
            `INSERT INTO ap_invoice_items
            (invoice_id, material_id, description, quantity, unit_price, amount)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
              invoiceId,
              item.materialId,
              item.description || '',
              item.quantity,
              item.unitPrice,
              item.amount
            ]
          );
        }
        console.log('发票明细项保存成功');
      }

      return invoiceId;
    } catch (error) {
      console.error('创建应付账款发票失败:', error);
      throw error;
    }
  },

  /**
   * 按ID获取应付账款发票
   */
  getInvoiceById: async (id) => {
    try {
      // 查询发票主数据
      const [invoices] = await db.pool.execute(
        `SELECT a.*, 
                DATE_FORMAT(a.invoice_date, '%Y-%m-%d') as invoice_date, 
                DATE_FORMAT(a.due_date, '%Y-%m-%d') as due_date, 
                DATE_FORMAT(a.created_at, '%Y-%m-%d') as created_at,
                s.name as supplier_name
         FROM ap_invoices a
         LEFT JOIN suppliers s ON a.supplier_id = s.id
         WHERE a.id = ?`,
        [id]
      );
      
      if (invoices.length === 0) {
        return null;
      }
      
      const invoice = invoices[0];
      
      // 查询发票明细项
      const [items] = await db.pool.execute(
        `SELECT i.id, i.material_id as materialId, i.description, 
                i.quantity, i.unit_price as unitPrice, i.amount,
                m.name as materialName
         FROM ap_invoice_items i
         LEFT JOIN materials m ON i.material_id = m.id
         WHERE i.invoice_id = ?
         ORDER BY i.id ASC`,
        [id]
      );
      
      // 添加明细项到发票数据
      invoice.items = items;
      
      // 格式化数据以符合前端期望
      const result = {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        supplierId: invoice.supplier_id,
        supplierName: invoice.supplier_name,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        amount: invoice.total_amount,
        paidAmount: invoice.paid_amount,
        balance: invoice.balance_amount,
        status: invoice.status,
        notes: invoice.notes,
        items: items,
        createdAt: invoice.created_at
      };
      
      return result;
    } catch (error) {
      console.error('获取应付账款发票失败:', error);
      throw error;
    }
  },

  /**
   * 获取应付账款发票列表
   */
  getInvoices: async (filters = {}, page = 1, pageSize = 20) => {
    try {
      console.log('开始获取发票列表，筛选条件:', JSON.stringify(filters));
      console.log('分页参数:', { page, pageSize });
      
      // 确保page和pageSize是数字
      const numPage = Number(page) || 1;
      const numPageSize = Number(pageSize) || 20;
      
      // 先检查ap_invoices表是否存在
      try {
        const [testQuery] = await db.pool.execute('SELECT COUNT(*) as count FROM ap_invoices');
        console.log('ap_invoices表检查结果:', testQuery[0].count);
      } catch (err) {
        console.error('ap_invoices表检查失败:', err.message);
        throw new Error(`ap_invoices表不存在或无法访问: ${err.message}`);
      }
      
      // 检查suppliers表是否存在
      let suppliersTableExists = false; // 默认设置为false
      try {
        await db.pool.execute('SELECT 1 FROM suppliers LIMIT 1');
        suppliersTableExists = true; // 只有在查询成功时才设置为true
      } catch (err) {
        console.warn('suppliers表检查失败，将不使用JOIN查询:', err.message);
        // 保持suppliersTableExists为false
      }
      
      // 根据suppliers表是否存在决定查询方式
      let whereClause = "WHERE 1=1";
      const params = [];

      // 添加过滤条件
      if (filters.invoice_number) {
        whereClause += ' AND invoice_number LIKE ?';
        params.push(`%${filters.invoice_number}%`);
      }
      
      if (filters.supplier_id) {
        whereClause += ' AND supplier_id = ?';
        params.push(filters.supplier_id);
      }
      
      // 供应商名称过滤条件，如果suppliers表不存在则跳过
      if (suppliersTableExists && filters.supplier_name) {
        whereClause += ' AND s.name LIKE ?';  // 使用name而不是supplier_name
        params.push(`%${filters.supplier_name}%`);
      }
      
      if (filters.start_date && filters.end_date) {
        whereClause += ' AND invoice_date BETWEEN ? AND ?';
        params.push(filters.start_date, filters.end_date);
      } else if (filters.start_date) {
        whereClause += ' AND invoice_date >= ?';
        params.push(filters.start_date);
      } else if (filters.end_date) {
        whereClause += ' AND invoice_date <= ?';
        params.push(filters.end_date);
      }
      
      if (filters.status) {
        whereClause += ' AND status = ?';
        params.push(filters.status);
      }

      console.log('构建的WHERE子句:', whereClause);
      console.log('查询参数:', params);

      // 查询总记录数 - 简化查询以避免JOIN错误
      try {
        let countQuery;
        if (suppliersTableExists && filters.supplier_name) {
          // 如果需要按供应商名称过滤，则必须使用JOIN查询
          countQuery = `
            SELECT COUNT(*) as total
            FROM ap_invoices a
            LEFT JOIN suppliers s ON a.supplier_id = s.id
            ${whereClause}`;
        } else {
          // 否则直接查询ap_invoices表
          countQuery = `
            SELECT COUNT(*) as total
            FROM ap_invoices
            ${whereClause.replace('s.name', 'supplier_id')}`;  // 替换name
        }
        
        console.log('计数查询:', countQuery);
        
        const [countResult] = await db.pool.execute(countQuery, params);
        const total = countResult[0].total;
        console.log('总记录数:', total);
        
        // 如果没有记录，直接返回空结果
        if (total === 0) {
          console.log('没有找到记录，返回空结果');
          return {
            data: [],
            total: 0,
            page: numPage,
            pageSize: numPageSize
          };
        }
        
        // 分页参数处理
        const offset = (numPage - 1) * numPageSize;
        
        // 执行查询带分页
        let dataQuery;
        let dataParams = [...params]; // 创建参数的副本
        
        if (suppliersTableExists) {
          // 如果suppliers表存在，使用JOIN查询获取供应商名称
          dataQuery = `
            SELECT a.id, a.invoice_number as invoiceNumber, a.supplier_id as supplierId, 
                  s.name as supplierName, 
                  DATE_FORMAT(a.invoice_date, '%Y-%m-%d') as invoiceDate, 
                  DATE_FORMAT(a.due_date, '%Y-%m-%d') as dueDate, 
                  a.total_amount as amount, 
                  a.paid_amount as paidAmount, a.balance_amount as balance,
                  a.status, DATE_FORMAT(a.created_at, '%Y-%m-%d') as createdAt
            FROM ap_invoices a
            LEFT JOIN suppliers s ON a.supplier_id = s.id
            ${whereClause}
            ORDER BY a.invoice_date DESC, a.id DESC 
            LIMIT ${numPageSize} OFFSET ${offset}`;
        } else {
          // 如果suppliers表不存在，则仅查询ap_invoices表
          dataQuery = `
            SELECT id, invoice_number as invoiceNumber, supplier_id as supplierId, 
                  NULL as supplierName, 
                  DATE_FORMAT(invoice_date, '%Y-%m-%d') as invoiceDate, 
                  DATE_FORMAT(due_date, '%Y-%m-%d') as dueDate, 
                  total_amount as amount, 
                  paid_amount as paidAmount, balance_amount as balance,
                  status, DATE_FORMAT(created_at, '%Y-%m-%d') as createdAt
            FROM ap_invoices
            ${whereClause.replace('s.name', 'supplier_id')}  
            ORDER BY invoice_date DESC, id DESC 
            LIMIT ${numPageSize} OFFSET ${offset}`;
        }
        
        console.log('数据查询:', dataQuery);
        console.log('查询参数 (带分页):', dataParams);
        
        const [invoices] = await db.pool.execute(dataQuery, dataParams);
        console.log(`查询到 ${invoices.length} 条记录`);
        
        // 返回结果
        return {
          data: invoices,
          total,
          page: numPage,
          pageSize: numPageSize
        };
      } catch (err) {
        console.error('查询执行失败:', err);
        throw new Error(`查询执行失败: ${err.message}`);
      }
    } catch (error) {
      console.error('获取应付账款发票列表失败:', error);
      throw error;
    }
  },

  /**
   * 更新应付账款发票状态
   */
  updateInvoiceStatus: async (id, status) => {
    try {
      const [result] = await db.pool.execute(
        'UPDATE ap_invoices SET status = ? WHERE id = ?',
        [status, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新应付账款发票状态失败:', error);
      throw error;
    }
  },

  /**
   * 更新应付账款发票
   */
  updateInvoice: async (invoiceData) => {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      // 更新发票主数据
      const [result] = await connection.execute(
        `UPDATE ap_invoices 
         SET invoice_number = ?, supplier_id = ?, invoice_date = ?, 
             due_date = ?, total_amount = ?, balance_amount = ?, notes = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          invoiceData.invoice_number,
          invoiceData.supplier_id,
          invoiceData.invoice_date,
          invoiceData.due_date,
          invoiceData.total_amount,
          invoiceData.total_amount - (invoiceData.paid_amount || 0), // 重新计算余额
          invoiceData.notes || null,
          invoiceData.id
        ]
      );

      // 如果有发票明细项，先删除旧的再创建新的
      if (invoiceData.items && Array.isArray(invoiceData.items) && invoiceData.items.length > 0) {
        // 删除旧的明细项
        await connection.execute(
          'DELETE FROM ap_invoice_items WHERE invoice_id = ?',
          [invoiceData.id]
        );

        // 添加新的明细项
        for (const item of invoiceData.items) {
          await connection.execute(
            `INSERT INTO ap_invoice_items
            (invoice_id, material_id, description, quantity, unit_price, amount)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
              invoiceData.id,
              item.materialId,
              item.description || '',
              item.quantity,
              item.unitPrice,
              item.amount
            ]
          );
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('更新应付账款发票失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * 创建付款记录
   */
  createPayment: async (paymentData, paymentItems) => {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      // 插入付款记录
      const [result] = await connection.execute(
        `INSERT INTO ap_payments 
        (payment_number, supplier_id, payment_date, total_amount, 
         payment_method, reference_number, bank_account_id, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentData.payment_number,
          paymentData.supplier_id,
          paymentData.payment_date,
          paymentData.total_amount,
          paymentData.payment_method,
          paymentData.reference_number || null,
          paymentData.bank_account_id || null,
          paymentData.notes || null
        ]
      );

      const paymentId = result.insertId;

      // 插入付款明细并更新发票状态
      let totalPaid = 0;
      for (const item of paymentItems) {
        // 插入付款明细
        await connection.execute(
          'INSERT INTO ap_payment_items (payment_id, invoice_id, amount, discount_amount) VALUES (?, ?, ?, ?)',
          [
            paymentId,
            item.invoice_id,
            item.amount,
            item.discount_amount || 0
          ]
        );

        // 获取发票当前信息
        const [invoices] = await connection.execute(
          'SELECT * FROM ap_invoices WHERE id = ?',
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
        await connection.execute(
          'UPDATE ap_invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ?',
          [newPaidAmount, newBalanceAmount, newStatus, item.invoice_id]
        );
        
        totalPaid += parseFloat(item.amount);
      }

      // 如果是银行转账并且提供了银行账户ID，创建银行交易记录
      if (paymentData.payment_method === '银行转账' && paymentData.bank_account_id) {
        try {
          // 获取银行账户信息
          const [bankAccounts] = await connection.execute(
            'SELECT * FROM bank_accounts WHERE id = ?',
            [paymentData.bank_account_id]
          );

          if (bankAccounts.length > 0) {
            const bankAccount = bankAccounts[0];
            
            // 创建银行交易记录
            await connection.execute(
              `INSERT INTO bank_transactions 
              (transaction_number, bank_account_id, transaction_date, transaction_type, 
              amount, reference_number, description, is_reconciled, related_party) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                paymentData.payment_number, // 使用付款单号作为交易号
                paymentData.bank_account_id,
                paymentData.payment_date,
                '转出', // 付款属于转出类型
                paymentData.total_amount, // 交易金额
                paymentData.reference_number || null,
                `应付账款付款 - 供应商: ${paymentData.supplier_name}`,
                false, // 未对账
                paymentData.supplier_name // 相关方为供应商
              ]
            );
            
            // 更新银行账户余额
            const newBalance = parseFloat(bankAccount.current_balance) - parseFloat(paymentData.total_amount);
            await connection.execute(
              'UPDATE bank_accounts SET current_balance = ? WHERE id = ?',
              [newBalance, paymentData.bank_account_id]
            );
            
            console.log(`已创建银行交易记录，更新银行账户余额 ${bankAccount.current_balance} -> ${newBalance}`);
          } else {
            console.error(`银行账户ID ${paymentData.bank_account_id} 不存在`);
          }
        } catch (err) {
          console.error('创建银行交易记录失败:', err);
          // 不抛出错误，即使银行交易创建失败，仍然继续处理付款记录
        }
      }

      // 如果提供了会计分录信息，创建付款会计分录
      if (paymentData.gl_entry) {
        const entryData = {
          entry_number: paymentData.gl_entry.entry_number,
          entry_date: paymentData.payment_date,
          posting_date: paymentData.payment_date,
          document_type: '付款单',
          document_number: paymentData.payment_number,
          period_id: paymentData.gl_entry.period_id,
          description: `供应商 ${paymentData.supplier_name} 付款`,
          created_by: paymentData.gl_entry.created_by
        };

        // 付款分录明细
        const entryItems = [
          // 借：应付账款
          {
            account_id: paymentData.gl_entry.payable_account_id,
            debit_amount: totalPaid,
            credit_amount: 0,
            description: `应付账款减少 - 付款单号: ${paymentData.payment_number}`
          },
          // 贷：银行/现金
          {
            account_id: paymentData.gl_entry.bank_account_id,
            debit_amount: 0,
            credit_amount: totalPaid,
            description: `付款 - 付款单号: ${paymentData.payment_number}`
          }
        ];

        // 创建会计分录
        await financeModel.createEntry(entryData, entryItems, connection);
      }

      await connection.commit();
      return paymentId;
    } catch (error) {
      await connection.rollback();
      console.error('创建付款记录失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * 获取付款记录
   */
  getPaymentById: async (id) => {
    try {
      // 获取付款记录
      const [payments] = await db.pool.execute(
        `SELECT p.id, p.payment_number, p.supplier_id, 
                DATE_FORMAT(p.payment_date, '%Y-%m-%d') as payment_date,
                p.total_amount, p.payment_method, p.reference_number,
                p.bank_account_id, p.notes,
                DATE_FORMAT(p.created_at, '%Y-%m-%d') as created_at,
                s.name as supplier_name, b.account_name as bank_account_name
         FROM ap_payments p
         LEFT JOIN suppliers s ON p.supplier_id = s.id
         LEFT JOIN bank_accounts b ON p.bank_account_id = b.id
         WHERE p.id = ?`,
        [id]
      );
      
      if (payments.length === 0) return null;
      
      const payment = payments[0];
      
      // 获取付款明细
      const [items] = await db.pool.execute(
        `SELECT pi.*, i.invoice_number
         FROM ap_payment_items pi
         LEFT JOIN ap_invoices i ON pi.invoice_id = i.id
         WHERE pi.payment_id = ?`,
        [id]
      );
      
      payment.items = items;
      
      return payment;
    } catch (error) {
      console.error('获取付款记录失败:', error);
      throw error;
    }
  },

  /**
   * 获取付款记录列表
   */
  getPayments: async (filters = {}, page = 1, pageSize = 20) => {
    try {
      console.log('开始获取付款记录, 筛选条件:', filters);
      console.log('分页信息:', { page, pageSize });
      
      // 确保page和pageSize是数字
      const numPage = parseInt(page) || 1;
      const numPageSize = parseInt(pageSize) || 20;
      const offset = (numPage - 1) * numPageSize;
      
      // 检查表是否存在
      try {
        await db.pool.execute('SELECT 1 FROM ap_payments LIMIT 1');
      } catch (err) {
        console.warn('ap_payments表不存在或无法访问:', err.message);
        return {
          payments: [],
          pagination: {
            total: 0,
            page: numPage,
            pageSize: numPageSize,
            totalPages: 0
          }
        };
      }
      
      // 检查供应商表是否存在
      let suppliersExists = false;
      try {
        await db.pool.execute('SELECT 1 FROM suppliers LIMIT 1');
        suppliersExists = true;
      } catch (err) {
        console.warn('suppliers表不存在或无法访问:', err.message);
      }
      
      // 构建查询，根据suppliers表是否存在调整，并通过付款明细表关联获取发票编号
      let query;
      if (suppliersExists) {
        query = `
          SELECT p.id, p.payment_number, p.supplier_id, 
                 DATE_FORMAT(p.payment_date, '%Y-%m-%d') as payment_date,
                 p.total_amount, p.payment_method, p.reference_number,
                 p.bank_account_id, p.notes,
                 DATE_FORMAT(p.created_at, '%Y-%m-%d') as created_at,
                 s.name as supplier_name,
                 (SELECT i.invoice_number 
                  FROM ap_payment_items pi 
                  JOIN ap_invoices i ON pi.invoice_id = i.id 
                  WHERE pi.payment_id = p.id 
                  LIMIT 1) as invoice_number
          FROM ap_payments p
          LEFT JOIN suppliers s ON p.supplier_id = s.id
          WHERE 1=1
        `;
      } else {
        query = `
          SELECT p.id, p.payment_number, p.supplier_id, 
                 DATE_FORMAT(p.payment_date, '%Y-%m-%d') as payment_date,
                 p.total_amount, p.payment_method, p.reference_number,
                 p.bank_account_id, p.notes,
                 DATE_FORMAT(p.created_at, '%Y-%m-%d') as created_at,
                 (SELECT i.invoice_number 
                  FROM ap_payment_items pi 
                  JOIN ap_invoices i ON pi.invoice_id = i.id 
                  WHERE pi.payment_id = p.id 
                  LIMIT 1) as invoice_number
          FROM ap_payments p
          WHERE 1=1
        `;
      }
      
      const params = [];

      // 添加过滤条件
      if (filters.payment_number) {
        query += ' AND p.payment_number LIKE ?';
        params.push(`%${filters.payment_number}%`);
      }
      
      if (filters.supplier_id) {
        query += ' AND p.supplier_id = ?';
        params.push(filters.supplier_id);
      }
      
      if (suppliersExists && filters.supplier_name) {
        query += ' AND s.name LIKE ?';
        params.push(`%${filters.supplier_name}%`);
      }
      
      if (filters.start_date && filters.end_date) {
        query += ' AND p.payment_date BETWEEN ? AND ?';
        params.push(filters.start_date, filters.end_date);
      } else if (filters.start_date) {
        query += ' AND p.payment_date >= ?';
        params.push(filters.start_date);
      } else if (filters.end_date) {
        query += ' AND p.payment_date <= ?';
        params.push(filters.end_date);
      }
      
      if (filters.payment_method) {
        query += ' AND p.payment_method = ?';
        params.push(filters.payment_method);
      }

      // 添加排序和分页，直接将值放入SQL
      query += ` ORDER BY p.payment_date DESC, p.id DESC LIMIT ${numPageSize} OFFSET ${offset}`;

      console.log('执行查询:', query);
      console.log('查询参数:', params);
      
      // 执行查询
      const [payments] = await db.pool.execute(query, params);
      console.log(`查询到 ${payments.length} 条记录`);
      
      // 获取总记录数
      let countQuery;
      if (suppliersExists) {
        countQuery = `
          SELECT COUNT(*) as total 
          FROM ap_payments p
          LEFT JOIN suppliers s ON p.supplier_id = s.id
          WHERE 1=1
        `;
      } else {
        countQuery = `
          SELECT COUNT(*) as total 
          FROM ap_payments p
          WHERE 1=1
        `;
      }
      
      const countParams = [];
      
      // 添加与主查询相同的过滤条件
      if (filters.payment_number) {
        countQuery += ' AND p.payment_number LIKE ?';
        countParams.push(`%${filters.payment_number}%`);
      }
      
      if (filters.supplier_id) {
        countQuery += ' AND p.supplier_id = ?';
        countParams.push(filters.supplier_id);
      }
      
      if (suppliersExists && filters.supplier_name) {
        countQuery += ' AND s.name LIKE ?';
        countParams.push(`%${filters.supplier_name}%`);
      }
      
      if (filters.start_date && filters.end_date) {
        countQuery += ' AND p.payment_date BETWEEN ? AND ?';
        countParams.push(filters.start_date, filters.end_date);
      } else if (filters.start_date) {
        countQuery += ' AND p.payment_date >= ?';
        countParams.push(filters.start_date);
      } else if (filters.end_date) {
        countQuery += ' AND p.payment_date <= ?';
        countParams.push(filters.end_date);
      }
      
      if (filters.payment_method) {
        countQuery += ' AND p.payment_method = ?';
        countParams.push(filters.payment_method);
      }
      
      console.log('执行计数查询:', countQuery);
      console.log('计数查询参数:', countParams);
      
      const [countResult] = await db.pool.execute(countQuery, countParams);
      const total = countResult[0].total;
      console.log('总记录数:', total);
      
      return {
        payments,
        pagination: {
          total,
          page: numPage,
          pageSize: numPageSize,
          totalPages: Math.ceil(total / numPageSize)
        }
      };
    } catch (error) {
      console.error('获取付款记录列表失败:', error);
      throw error;
    }
  },

  /**
   * 获取供应商应付账款汇总
   */
  getSupplierPayables: async (supplierId = null) => {
    try {
      let query = `
        SELECT 
          s.id AS supplier_id,
          s.supplier_name,
          COUNT(a.id) AS invoice_count,
          SUM(a.total_amount) AS total_amount,
          SUM(a.paid_amount) AS paid_amount,
          SUM(a.balance_amount) AS balance_amount
        FROM suppliers s
        LEFT JOIN ap_invoices a ON s.id = a.supplier_id AND a.status != '已取消'
      `;
      
      const params = [];
      
      if (supplierId) {
        query += ' WHERE s.id = ?';
        params.push(supplierId);
      }
      
      query += ' GROUP BY s.id, s.supplier_name ORDER BY balance_amount DESC';
      
      const [results] = await db.pool.execute(query, params);
      return results;
    } catch (error) {
      console.error('获取供应商应付账款汇总失败:', error);
      throw error;
    }
  },

  /**
   * 获取应付账款账龄分析
   */
  getPayablesAging: async (supplierId = null, asOfDate = null) => {
    try {
      // 如果没有指定日期，使用当前日期
      const currentDate = asOfDate || new Date().toISOString().split('T')[0];
      
      let query = `
        SELECT 
          s.id AS supplier_id,
          s.supplier_name,
          SUM(CASE WHEN DATEDIFF(?, a.due_date) <= 0 THEN a.balance_amount ELSE 0 END) AS current_amount,
          SUM(CASE WHEN DATEDIFF(?, a.due_date) BETWEEN 1 AND 30 THEN a.balance_amount ELSE 0 END) AS '1_30_days',
          SUM(CASE WHEN DATEDIFF(?, a.due_date) BETWEEN 31 AND 60 THEN a.balance_amount ELSE 0 END) AS '31_60_days',
          SUM(CASE WHEN DATEDIFF(?, a.due_date) BETWEEN 61 AND 90 THEN a.balance_amount ELSE 0 END) AS '61_90_days',
          SUM(CASE WHEN DATEDIFF(?, a.due_date) > 90 THEN a.balance_amount ELSE 0 END) AS 'over_90_days',
          SUM(a.balance_amount) AS total_amount
        FROM suppliers s
        LEFT JOIN ap_invoices a ON s.id = a.supplier_id AND a.status != '已付款' AND a.status != '已取消'
      `;
      
      const params = [currentDate, currentDate, currentDate, currentDate, currentDate];
      
      if (supplierId) {
        query += ' WHERE s.id = ?';
        params.push(supplierId);
      }
      
      query += ' GROUP BY s.id, s.supplier_name HAVING total_amount > 0 ORDER BY total_amount DESC';
      
      const [results] = await db.pool.execute(query, params);
      return results;
    } catch (error) {
      console.error('获取应付账款账龄分析失败:', error);
      throw error;
    }
  },

  /**
   * 获取未付清的应付账款发票列表
   */
  getUnpaidInvoices: async () => {
    try {
      console.log('获取未付清发票列表');
      
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
      
      return formattedInvoices;
    } catch (error) {
      console.error('获取未付清发票列表失败:', error);
      throw error;
    }
  },
  
  /**
   * 获取发票关联的付款记录
   */
  getInvoicePayments: async (invoiceId) => {
    try {
      console.log('获取发票相关的付款记录, 发票ID:', invoiceId);
      
      // 通过付款项表查询与发票关联的所有付款记录
      const [payments] = await db.pool.execute(
        `SELECT p.id, p.payment_number as paymentNumber, 
                DATE_FORMAT(p.payment_date, '%Y-%m-%d') as paymentDate, 
                p.payment_method as paymentMethod,
                pi.amount, pi.discount_amount as discountAmount,
                p.notes, DATE_FORMAT(p.created_at, '%Y-%m-%d') as createdAt
         FROM ap_payment_items pi
         JOIN ap_payments p ON pi.payment_id = p.id
         WHERE pi.invoice_id = ?
         ORDER BY p.payment_date DESC, p.id DESC`,
        [invoiceId]
      );
      
      console.log(`找到 ${payments.length} 条发票相关付款记录`);
      
      // 转换金额为数字类型
      const formattedPayments = payments.map(payment => ({
        ...payment,
        amount: parseFloat(payment.amount),
        discountAmount: parseFloat(payment.discountAmount || 0),
        // 转换付款方式为前端可读显示
        paymentMethodDisplay: (() => {
          const methodMap = {
            '现金': '现金',
            '银行转账': '银行转账',
            '支票': '支票',
            '信用卡': '信用卡',
            '微信': '微信',
            '支付宝': '支付宝'
          };
          return methodMap[payment.paymentMethod] || payment.paymentMethod;
        })()
      }));
      
      return formattedPayments;
    } catch (error) {
      console.error('获取发票付款记录失败:', error);
      throw error;
    }
  }
};

module.exports = apModel; 