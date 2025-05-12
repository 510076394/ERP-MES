const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');
const { authenticateToken } = require('../middleware/auth');

// 应用认证中间件
router.use(authenticateToken);

// 生产计划相关接口
router.get('/plans', productionController.getProductionPlans);
router.get('/plans/:id', productionController.getProductionPlanById);
router.post('/plans', productionController.createProductionPlan);
router.put('/plans/:id', productionController.updateProductionPlan);
router.put('/plans/:id/status', productionController.updateProductionPlanStatus);
router.delete('/plans/:id', productionController.deleteProductionPlan);

// 计算物料需求
router.post('/calculate-materials', productionController.calculateMaterials);

// 直接获取产品BOM信息
router.get('/product-bom/:productId', productionController.getBomByProductId);

// 获取当天的最大序号
router.get('/today-sequence', productionController.getTodayMaxSequence);

// 获取生产计划物料清单
router.get('/plans/:id/materials', productionController.getPlanMaterials);

// 生产任务相关路由
router.get('/tasks/generate-code', productionController.generateTaskCode);
router.get('/tasks', productionController.getProductionTasks);
router.get('/tasks/:id', productionController.getProductionTaskById);
router.post('/tasks', productionController.createProductionTask);
router.put('/tasks/:id', productionController.updateProductionTask);
router.delete('/tasks/:id', productionController.deleteProductionTask);
router.post('/tasks/:id/progress', productionController.updateProductionTaskProgress);
router.put('/tasks/:id/status', productionController.updateProductionTaskStatus);

// 生产过程相关路由
router.get('/processes', productionController.getProcesses);
router.get('/processes/:id', productionController.getProcessById);
router.put('/processes/:id', productionController.updateProcess);
router.post('/processes', productionController.createProcess);
router.delete('/processes/:id', productionController.deleteProcess);

// 生产报工相关路由
router.get('/reports/summary', productionController.getReportSummary);
router.get('/reports/detail', productionController.getReportDetail);
router.get('/reports/export', productionController.exportReport);
router.post('/reports', productionController.createReport);
router.get('/reports/:id', productionController.getReportById);
router.put('/reports/:id', productionController.updateReport);
router.delete('/reports/:id', productionController.deleteReport);

module.exports = router;