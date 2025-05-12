const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken } = require('../middleware/auth');

// 库存列表
router.get('/stock', authenticateToken, inventoryController.getStockList);

// 出库单列表
router.get('/outbound', authenticateToken, inventoryController.getOutboundList);

// 仓库列表
router.get('/locations', authenticateToken, inventoryController.getLocations);

// 获取库存记录
router.get('/stock/:id/records', authenticateToken, inventoryController.getStockRecords);

// 获取库存记录 - 通过物料ID
router.get('/materials/:id/records', authenticateToken, inventoryController.getMaterialRecords);

// 创建出库单
router.post('/outbound', authenticateToken, inventoryController.createOutbound);

// 获取出库单详情
router.get('/outbound/:id', authenticateToken, inventoryController.getOutboundDetail);

// 获取带库存的物料列表
router.get('/materials-with-stock', authenticateToken, inventoryController.getMaterialsWithStock);

// 更新出库单
router.put('/outbound/:id', authenticateToken, inventoryController.updateOutbound);

// 删除出库单
router.delete('/outbound/:id', authenticateToken, inventoryController.deleteOutbound);

// 更新出库单状态
router.put('/outbound/:id/status', authenticateToken, inventoryController.updateOutboundStatus);

// 入库单路由
router.get('/inbound', authenticateToken, inventoryController.getInboundList);
router.get('/inbound/:id', authenticateToken, inventoryController.getInboundDetail);
router.post('/inbound', authenticateToken, inventoryController.createInbound);
router.post('/inbound/from-quality', authenticateToken, inventoryController.createInboundFromQuality);
router.put('/inbound/status/:id', authenticateToken, inventoryController.updateInboundStatus);

// 获取物料列表
router.get('/materials', authenticateToken, inventoryController.getMaterialsList);

// 库存调整
router.post('/stock/adjust', authenticateToken, inventoryController.adjustStock);

// 库存流水
router.get('/transactions', authenticateToken, inventoryController.getTransactionList);
router.get('/transactions/stats', authenticateToken, inventoryController.getTransactionStats);
router.get('/transactions/export', authenticateToken, inventoryController.exportTransactionReport);

// 库存报表
router.get('/report', authenticateToken, inventoryController.getInventoryReport);

// 获取物料库存
router.get('/stock/:materialId/:locationId', authenticateToken, inventoryController.getMaterialStockDetail);

// ... 其他路由

module.exports = router;