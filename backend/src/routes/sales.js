const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const salesController = require('../controllers/salesController');

// 使用中间件进行身份验证
router.use(authenticateToken);

// Customer routes
router.get('/customers', salesController.getCustomers);
router.get('/customers-list', salesController.getCustomersList);
router.get('/products-list', salesController.getProductsList);
router.get('/customers/:id', salesController.getCustomer);
router.post('/customers', salesController.createCustomer);
router.put('/customers/:id', salesController.updateCustomer);

// Sales Quotation routes
router.get('/quotations', salesController.getSalesQuotations);
router.get('/quotations/statistics', salesController.getSalesQuotationStatistics);
router.get('/quotations/:id', salesController.getSalesQuotation);
router.post('/quotations', salesController.createSalesQuotation);
router.put('/quotations/:id', salesController.updateSalesQuotation);
router.delete('/quotations/:id', salesController.deleteSalesQuotation);
router.post('/quotations/:id/convert', salesController.convertQuotationToOrder);

// Sales Order routes
router.get('/orders', salesController.getSalesOrders);
router.get('/orders/statistics', salesController.getSalesOrderStatistics);
router.get('/orders/:id', salesController.getSalesOrder);
router.post('/orders', salesController.createSalesOrder);
router.put('/orders/:id', salesController.updateSalesOrder);
router.delete('/orders/:id', salesController.deleteSalesOrder);
router.put('/orders/:id/status', salesController.updateOrderStatus);

// Sales Outbound routes
router.get('/outbound', salesController.getSalesOutbound);
router.get('/outbound/:id', salesController.getSalesOutboundById);
router.post('/outbound', salesController.createSalesOutbound);
router.put('/outbound/:id', salesController.updateSalesOutbound);
router.delete('/outbound/:id', salesController.deleteSalesOutbound);

// Sales Return routes
router.get('/returns', salesController.getSalesReturns);
router.get('/returns/:id', salesController.getSalesReturnById);
router.post('/returns', salesController.createSalesReturn);
router.put('/returns/:id', salesController.updateSalesReturn);
router.delete('/returns/:id', salesController.deleteSalesReturn);

// Sales Exchange routes
router.get('/exchanges', salesController.getSalesExchanges);
router.get('/exchanges/:id', salesController.getSalesExchangeById);
router.post('/exchanges', salesController.createSalesExchange);
router.put('/exchanges/:id', salesController.updateSalesExchange);
router.delete('/exchanges/:id', salesController.deleteSalesExchange);

// Sales Statistics routes
router.get('/statistics', salesController.getSalesStatistics);

module.exports = router;