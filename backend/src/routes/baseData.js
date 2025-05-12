const express = require('express');
const router = express.Router();
const baseDataController = require('../controllers/baseDataController');
const { authenticateToken } = require('../middleware/auth');

// 物料管理路由
router.get('/materials', authenticateToken, baseDataController.getAllMaterials);
router.get('/materials/options', authenticateToken, baseDataController.getMaterialOptions);
router.get('/materials/:id', authenticateToken, baseDataController.getMaterialById);
router.post('/materials', authenticateToken, baseDataController.createMaterial);
router.put('/materials/:id', authenticateToken, baseDataController.updateMaterial);
router.delete('/materials/:id', authenticateToken, baseDataController.deleteMaterial);
// 添加导入物料的路由
router.post('/materials/import', authenticateToken, baseDataController.importMaterials);
// 添加导出物料的路由
router.post('/materials/export', authenticateToken, baseDataController.exportMaterials);

// BOM管理路由
router.get('/boms', authenticateToken, baseDataController.getAllBoms);
router.get('/boms/:id', authenticateToken, baseDataController.getBomById);
router.post('/boms', authenticateToken, baseDataController.createBom);
router.put('/boms/:id', authenticateToken, baseDataController.updateBom);
router.delete('/boms/:id', authenticateToken, baseDataController.deleteBom);

// 获取物料的BOM信息
router.get('/materials/:id/bom', authenticateToken, baseDataController.getMaterialBom);
// 根据产品ID获取BOM信息
router.get('/products/:id/bom', authenticateToken, baseDataController.getBomByProductId);

// 客户管理路由
router.get('/customers', authenticateToken, baseDataController.getAllCustomers);
router.get('/customers/:id', authenticateToken, baseDataController.getCustomerById);
router.post('/customers', authenticateToken, baseDataController.createCustomer);
router.put('/customers/:id', authenticateToken, baseDataController.updateCustomer);
router.delete('/customers/:id', authenticateToken, baseDataController.deleteCustomer);

// 供应商管理路由
router.get('/suppliers', authenticateToken, baseDataController.getAllSuppliers);
router.get('/suppliers/options', authenticateToken, baseDataController.getSupplierOptions);
router.get('/suppliers/:id', authenticateToken, baseDataController.getSupplierById);
router.post('/suppliers', authenticateToken, baseDataController.createSupplier);
router.put('/suppliers/:id', authenticateToken, baseDataController.updateSupplier);
router.delete('/suppliers/:id', authenticateToken, baseDataController.deleteSupplier);

// 产品分类管理路由
router.get('/categories', authenticateToken, baseDataController.getAllCategories);
router.get('/categories/:id', authenticateToken, baseDataController.getCategoryById);
router.post('/categories', authenticateToken, baseDataController.createCategory);
router.put('/categories/:id', authenticateToken, baseDataController.updateCategory);
router.delete('/categories/:id', authenticateToken, baseDataController.deleteCategory);

// 产品单位管理路由
router.get('/units', authenticateToken, baseDataController.getAllUnits);
router.get('/units/:id', authenticateToken, baseDataController.getUnitById);
router.post('/units', authenticateToken, baseDataController.createUnit);
router.put('/units/:id', authenticateToken, baseDataController.updateUnit);
router.delete('/units/:id', authenticateToken, baseDataController.deleteUnit);

// 库位管理路由
router.get('/locations', authenticateToken, baseDataController.getAllLocations);
router.get('/locations/:id', authenticateToken, baseDataController.getLocationById);
router.post('/locations', authenticateToken, baseDataController.createLocation);
router.put('/locations/:id', authenticateToken, baseDataController.updateLocation);
router.delete('/locations/:id', authenticateToken, baseDataController.deleteLocation);

// 工序模板管理路由
router.get('/process-templates', authenticateToken, baseDataController.getAllProcessTemplates);
router.get('/process-templates/:id', authenticateToken, baseDataController.getProcessTemplateById);
router.post('/process-templates', authenticateToken, baseDataController.createProcessTemplate);
router.put('/process-templates/:id', authenticateToken, baseDataController.updateProcessTemplate);
router.put('/process-templates/:id/status', authenticateToken, baseDataController.updateProcessTemplateStatus);
router.delete('/process-templates/:id', authenticateToken, baseDataController.deleteProcessTemplate);
router.get('/products/:id/process-template', authenticateToken, baseDataController.getProcessTemplateByProductId);

module.exports = router;