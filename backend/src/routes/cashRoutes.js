const express = require('express');
const router = express.Router();
const cashController = require('../controllers/cashController');
const { check } = require('express-validator');
const authMiddleware = require('../middleware/auth');

// 应用认证中间件到所有路由
router.use(authMiddleware);

// 交易相关路由
router.get('/transactions', cashController.getTransactions);
router.get('/transactions/:id', cashController.getTransactionById);
router.post('/transactions', [
  check('transaction_date').isDate().withMessage('请提供有效的交易日期'),
  check('amount').isFloat().withMessage('请提供有效的金额'),
  check('transaction_type').isIn(['income', 'expense', 'transfer']).withMessage('交易类型必须是收入、支出或转账'),
  check('account_id').isInt().withMessage('请提供有效的账户ID'),
  check('description').notEmpty().withMessage('请提供交易描述')
], cashController.createTransaction);
router.put('/transactions/:id', [
  check('transaction_date').isDate().withMessage('请提供有效的交易日期'),
  check('amount').isFloat().withMessage('请提供有效的金额'),
  check('transaction_type').isIn(['income', 'expense', 'transfer']).withMessage('交易类型必须是收入、支出或转账'),
  check('account_id').isInt().withMessage('请提供有效的账户ID'),
  check('description').notEmpty().withMessage('请提供交易描述')
], cashController.updateTransaction);
router.delete('/transactions/:id', cashController.deleteTransaction);

// 对账相关路由
router.get('/reconciliations', cashController.getReconciliations);
router.get('/reconciliations/:id', cashController.getReconciliationById);
router.post('/reconciliations', [
  check('account_id').isInt().withMessage('请提供有效的账户ID'),
  check('reconciliation_date').isDate().withMessage('请提供有效的对账日期'),
  check('bank_statement_balance').isFloat().withMessage('请提供有效的银行对账单余额'),
  check('book_balance').isFloat().withMessage('请提供有效的账簿余额'),
  check('status').isIn(['draft', 'completed']).withMessage('状态必须是草稿或已完成')
], cashController.createReconciliation);
router.put('/reconciliations/:id', [
  check('account_id').isInt().withMessage('请提供有效的账户ID'),
  check('reconciliation_date').isDate().withMessage('请提供有效的对账日期'),
  check('bank_statement_balance').isFloat().withMessage('请提供有效的银行对账单余额'),
  check('book_balance').isFloat().withMessage('请提供有效的账簿余额'),
  check('status').isIn(['draft', 'completed']).withMessage('状态必须是草稿或已完成')
], cashController.updateReconciliation);

// 统计路由
router.get('/statistics/cash-flow', cashController.getCashFlowStatistics);

module.exports = router; 