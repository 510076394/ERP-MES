const express = require('express');
const router = express.Router();
const locationsController = require('../controllers/locationsController');
const { authenticateToken } = require('../middleware/auth');

// 获取所有库位
router.get('/', authenticateToken, locationsController.getAll);

// 获取单个库位
router.get('/:id', authenticateToken, locationsController.getById);

// 创建库位
router.post('/', authenticateToken, locationsController.create);

// 更新库位
router.put('/:id', authenticateToken, locationsController.update);

// 删除库位
router.delete('/:id', authenticateToken, locationsController.delete);

module.exports = router;