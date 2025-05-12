/**
 * 菜单路由
 */
const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

// 获取所有菜单
router.get('/', menuController.getAllMenus);

// 获取菜单树
router.get('/tree', menuController.getMenuTree);

// 获取单个菜单
router.get('/:id', menuController.getMenuById);

// 创建菜单
router.post('/', menuController.createMenu);

// 更新菜单
router.put('/:id', menuController.updateMenu);

// 删除菜单
router.delete('/:id', menuController.deleteMenu);

// 获取角色菜单树
router.get('/role/:roleId', menuController.getRoleMenuTree);

module.exports = router; 