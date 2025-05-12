// 查找并删除类似这样的路由:
// router.get('/debug/outbound/:id', salesController.debugOutboundDetails);

// ... existing code ...

// 如果找到调试路由，删除它；如果没有找到，就不用修改
router.get('/outbound', salesController.getSalesOutbound);
router.get('/outbound/:id', salesController.getSalesOutboundById);
router.post('/outbound', salesController.createSalesOutbound);
router.put('/outbound/:id', salesController.updateSalesOutbound);
router.delete('/outbound/:id', salesController.deleteSalesOutbound);
// 删除下面这行
router.get('/debug/outbound/:id', salesController.debugOutboundDetails);

// ... existing code ... 