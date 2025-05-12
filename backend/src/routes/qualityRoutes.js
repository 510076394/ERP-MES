const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const qualityController = require('../controllers/qualityController');
const inspectionTemplateController = require('../controllers/quality/InspectionTemplateController');

/**
 * 质量检验相关路由
 */

// 来料检验
router.get('/inspections/incoming', authenticateToken, qualityController.getIncomingInspections);
router.post('/inspections/incoming', authenticateToken, qualityController.createInspection);

// 过程检验
router.get('/inspections/process', authenticateToken, qualityController.getProcessInspections);
router.post('/inspections/process', authenticateToken, qualityController.createInspection);

// 成品检验
router.get('/inspections/final', authenticateToken, qualityController.getFinalInspections);
router.post('/inspections/final', authenticateToken, qualityController.createInspection);

// 获取检验单详情
router.get('/inspections/:id', authenticateToken, qualityController.getInspectionById);

// 获取检验单项目
router.get('/inspections/:id/items', authenticateToken, qualityController.getInspectionItems);

// 通用创建检验单接口
router.post('/inspections', authenticateToken, qualityController.createInspection);

// 更新检验单
router.put('/inspections/:id', authenticateToken, qualityController.updateInspection);

// 删除检验单
router.delete('/inspections/:id', authenticateToken, qualityController.deleteInspection);

// 获取检验相关的引用数据
router.get('/reference-data/:type', authenticateToken, qualityController.getReferenceData);

// 检验模板相关路由
router.get('/templates', authenticateToken, inspectionTemplateController.getTemplates);
router.get('/templates/reusable-items', authenticateToken, inspectionTemplateController.getReusableItems);
router.get('/templates/:id', authenticateToken, inspectionTemplateController.getTemplate);
router.post('/templates', authenticateToken, inspectionTemplateController.createTemplate);
router.put('/templates/:id', authenticateToken, inspectionTemplateController.updateTemplate);
router.delete('/templates/:id', authenticateToken, inspectionTemplateController.deleteTemplate);
router.put('/templates/:id/status', authenticateToken, inspectionTemplateController.updateTemplateStatus);
router.post('/templates/:id/copy', authenticateToken, inspectionTemplateController.copyTemplate);

// 获取检验标准
router.get('/standards/:type/:targetId', authenticateToken, qualityController.getStandards);

/**
 * 质量标准相关路由
 */

// 获取所有质量标准
router.get('/quality-standards', qualityController.getAllStandards);

// 获取质量标准详情
router.get('/quality-standards/:id', qualityController.getStandardById);

// 创建质量标准
router.post('/quality-standards', qualityController.createStandard);

// 更新质量标准
router.put('/quality-standards/:id', qualityController.updateStandard);

// 删除质量标准
router.delete('/quality-standards/:id', qualityController.deleteStandard);

// 获取目标选项
router.get('/target-options/:targetType', qualityController.getTargetOptions);

/**
 * 追溯管理相关路由
 */

// 获取追溯记录列表
router.get('/traceability', qualityController.getTraceabilityRecords);

// 获取追溯记录详情
router.get('/traceability/:id', qualityController.getTraceabilityById);

// 创建追溯记录
router.post('/traceability', qualityController.createTraceability);

// 更新追溯记录
router.put('/traceability/:id', qualityController.updateTraceability);

// 删除追溯记录
router.delete('/traceability/:id', qualityController.deleteTraceability);

// 获取追溯记录的工序数据
router.get('/traceability/:id/process', qualityController.getTraceabilityProcess);

// 获取追溯记录的物料数据
router.get('/traceability/:id/materials', qualityController.getTraceabilityMaterials);

// 获取追溯记录的质检数据
router.get('/traceability/:id/quality', qualityController.getTraceabilityQuality);

// 获取追溯图数据
router.get('/traceability/:id/chart', qualityController.getTraceabilityChart);

// 获取全链路追溯数据 - GET方式
router.get('/traceability/full-chain', qualityController.getFullTraceability);

// 获取全链路追溯数据 - POST方式
router.post('/traceability/full', qualityController.getFullTraceability);

module.exports = router; 