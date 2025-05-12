const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const purchaseRequisitionController = require('../controllers/purchaseRequisitionController');
const purchaseOrderController = require('../controllers/purchaseOrderController');
const purchaseReceiptController = require('../controllers/purchaseReceiptController');
const purchaseReturnController = require('../controllers/purchaseReturnController');
const outsourcedProcessingController = require('../controllers/outsourced/processingController');

// 采购申请路由
router.get('/requisitions', authenticateToken, purchaseRequisitionController.getRequisitions);
router.get('/requisitions/:id', authenticateToken, purchaseRequisitionController.getRequisition);
router.post('/requisitions', authenticateToken, purchaseRequisitionController.createRequisition);
router.put('/requisitions/:id', authenticateToken, purchaseRequisitionController.updateRequisition);
router.delete('/requisitions/:id', authenticateToken, purchaseRequisitionController.deleteRequisition);
router.put('/requisitions/:id/status', authenticateToken, purchaseRequisitionController.updateRequisitionStatus);

// 采购订单路由
router.get('/orders', authenticateToken, purchaseOrderController.getOrders);
router.get('/orders/:id', authenticateToken, purchaseOrderController.getOrder);
router.post('/orders', authenticateToken, purchaseOrderController.createOrder);
router.put('/orders/:id', authenticateToken, purchaseOrderController.updateOrder);
router.delete('/orders/:id', authenticateToken, purchaseOrderController.deleteOrder);
router.put('/orders/:id/status', authenticateToken, purchaseOrderController.updateOrderStatus);
router.get('/orders-statistics', authenticateToken, purchaseOrderController.getStatistics);

// 供应商路由
router.get('/suppliers', authenticateToken, purchaseOrderController.getSuppliers);

// 采购入库路由
router.get('/receipts', authenticateToken, purchaseReceiptController.getReceipts);
router.get('/receipts/:id', authenticateToken, purchaseReceiptController.getReceipt);
router.post('/receipts', authenticateToken, purchaseReceiptController.createReceipt);
router.put('/receipts/:id', authenticateToken, purchaseReceiptController.updateReceipt);
router.put('/receipts/:id/status', authenticateToken, purchaseReceiptController.updateReceiptStatus);
router.get('/receipts-statistics', authenticateToken, purchaseReceiptController.getReceiptStats);

// 采购退货路由
router.get('/returns', authenticateToken, purchaseReturnController.getReturns);
router.get('/returns/:id', authenticateToken, purchaseReturnController.getReturn);
router.post('/returns', authenticateToken, purchaseReturnController.createReturn);
router.put('/returns/:id', authenticateToken, purchaseReturnController.updateReturn);
router.put('/returns/:id/status', authenticateToken, purchaseReturnController.updateReturnStatus);

// 采购统计数据
router.get('/statistics', authenticateToken, purchaseOrderController.getStatistics);

// 外委加工路由
router.get('/outsourced-processings', authenticateToken, outsourcedProcessingController.getProcessings);
router.get('/outsourced-processings/:id', authenticateToken, outsourcedProcessingController.getProcessing);
router.post('/outsourced-processings', authenticateToken, outsourcedProcessingController.createProcessing);
router.put('/outsourced-processings/:id', authenticateToken, outsourcedProcessingController.updateProcessing);
router.delete('/outsourced-processings/:id', authenticateToken, outsourcedProcessingController.deleteProcessing);
router.put('/outsourced-processings/:id/status', authenticateToken, outsourcedProcessingController.updateProcessingStatus);

// 外委加工入库路由
router.get('/outsourced-receipts', authenticateToken, outsourcedProcessingController.getReceipts);
router.get('/outsourced-receipts/:id', authenticateToken, outsourcedProcessingController.getReceipt);
router.post('/outsourced-receipts', authenticateToken, outsourcedProcessingController.createReceipt);
router.put('/outsourced-receipts/:id', authenticateToken, outsourcedProcessingController.updateReceipt);
router.put('/outsourced-receipts/:id/status', authenticateToken, outsourcedProcessingController.updateReceiptStatus);

module.exports = router; 