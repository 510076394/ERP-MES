const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const arController = require('../controllers/arController');
const apController = require('../controllers/apController');
const assetsController = require('../controllers/assetsController');
const cashController = require('../controllers/cashController');

// 系统初始化路由
router.post('/init', financeController.initFinanceTables);

// 总账模块路由
// 1. 会计科目管理
router.get('/accounts/options', financeController.getAccountOptions);
router.get('/accounts', financeController.getAllAccounts);
router.post('/accounts', financeController.createAccount);
router.get('/accounts/:id', financeController.getAccountById);
router.put('/accounts/:id', financeController.updateAccount);
router.patch('/accounts/:id/deactivate', financeController.deactivateAccount);

// 2. 会计分录管理
router.get('/entries', financeController.getEntries);
router.get('/entries/:id', financeController.getEntryById);
router.get('/entries/:id/items', financeController.getEntryItems);
router.post('/entries', financeController.createEntry);
router.patch('/entries/:id/post', financeController.postEntry);
router.post('/entries/:id/reverse', financeController.reverseEntry);

// 3. 会计期间管理
router.get('/periods', financeController.getAllPeriods);
router.get('/periods/:id', financeController.getPeriodById);
router.post('/periods', financeController.createPeriod);
router.patch('/periods/:id/close', financeController.closePeriod);

// 应付账款模块路由
// 1. 应付账款发票管理
router.get('/ap/invoices', apController.getInvoices);
router.get('/ap/invoices/unpaid', apController.getUnpaidInvoices);
router.get('/ap/invoices/:id/edit', apController.getInvoiceForEdit);
router.get('/ap/invoices/:id', apController.getInvoiceById);
router.get('/ap/invoices/:id/payments', apController.getInvoicePayments);
router.post('/ap/invoices', apController.createInvoice);
router.put('/ap/invoices/:id', apController.updateInvoice);
router.put('/ap/invoices/:id/status', apController.updateInvoiceStatus);

// 2. 付款管理
router.get('/ap/payments', apController.getPayments);
router.get('/ap/payments/:id', apController.getPaymentById);
router.post('/ap/payments', apController.createPayment);

// 3. 应付账款分析
router.get('/ap/supplier-payables', apController.getSupplierPayables);
router.get('/ap/supplier-payables/:id', apController.getSupplierPayablesById);
router.get('/ap/aging', apController.getPayablesAging);
router.get('/ap/aging/:id', apController.getPayablesAgingById);

// 应收账款模块路由
// 1. 应收账款发票管理
router.get('/ar/invoices', arController.getInvoices);
router.get('/ar/invoices/:id', arController.getInvoiceById);
router.post('/ar/invoices', arController.createInvoice);
router.patch('/ar/invoices/:id/status', arController.updateInvoiceStatus);

// 2. 收款管理
router.get('/ar/receipts', arController.getReceipts);
router.get('/ar/receipts/:id', arController.getReceiptById);
router.post('/ar/receipts', arController.createReceipt);

// 3. 应收账款分析
router.get('/ar/customer-receivables', arController.getCustomerReceivables);
router.get('/ar/customer-receivables/:id', arController.getCustomerReceivablesById);
router.get('/ar/aging', arController.getReceivablesAging);
router.get('/ar/aging/:id', arController.getReceivablesAgingById);

// 固定资产模块路由
// 1. 固定资产管理
router.get('/assets', assetsController.getAssets);

// 资产类别管理
router.get('/assets/categories', assetsController.getAssetCategories);
router.get('/assets/categories/:id', assetsController.getAssetCategoryById);
router.post('/assets/categories', assetsController.createAssetCategory);
router.put('/assets/categories/:id', assetsController.updateAssetCategory);
router.delete('/assets/categories/:id', assetsController.deleteAssetCategory);

// 基础数据API (供前端用于表单选择)
router.get('/baseData/bankAccounts', cashController.getBankAccounts);

// 折旧管理
router.get('/assets/depreciation/calculate', assetsController.calculateBatchDepreciation);
router.post('/assets/depreciation/submit', assetsController.submitDepreciation);
router.get('/assets/depreciation/export', assetsController.exportDepreciation);

// 资产统计
router.get('/assets/statistics/summary', assetsController.getAssetStatistics);
router.get('/assets/stats', assetsController.getAssetStatistics);

// 资产操作
router.get('/assets/:id', assetsController.getAssetById);
router.post('/assets', assetsController.createAsset);
router.put('/assets/:id', assetsController.updateAsset);
router.post('/assets/:id/depreciation', assetsController.calculateDepreciation);
router.post('/assets/:id/dispose', assetsController.disposeAsset);
router.post('/assets/:id/transfer', assetsController.transferAsset);

// 现金管理模块路由
// 1. 银行账户管理
router.get('/bank-accounts', cashController.getBankAccounts);
router.get('/bank-accounts/stats', cashController.getBankAccountsStats);
router.get('/bank-accounts/:id', cashController.getBankAccountById);
router.post('/bank-accounts', cashController.createBankAccount);
router.put('/bank-accounts/:id', cashController.updateBankAccount);
router.patch('/bank-accounts/:id/status', cashController.updateBankAccountStatus);

// 2. 银行交易管理
router.get('/bank-transactions', cashController.getBankTransactions);
router.get('/bank-transactions/:id', cashController.getBankTransactionById);
router.post('/bank-transactions', cashController.createBankTransaction);
router.put('/bank-transactions/:id', cashController.updateBankTransaction);
router.delete('/bank-transactions/:id', cashController.deleteBankTransaction);
router.patch('/bank-transactions/:id/reconcile', cashController.reconcileBankTransaction);

// 3. 统计相关路由 
router.get('/statistics/cash-flow', cashController.getCashFlowStatistics);

module.exports = router; 