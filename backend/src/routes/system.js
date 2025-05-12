const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const systemModel = require('../models/system');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/db');

// 所有路由都需要身份验证
router.use(authenticateToken);

// 用户管理路由
router.get('/users', systemController.getAllUsers);
// 获取用户简单列表（无分页）
router.get('/users/list', async (req, res) => {
  try {
    const result = await systemController.getAllUsers(req, res);
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get('/users/:id', systemController.getUserById);
router.post('/users', systemController.createUser);
router.put('/users/:id', systemController.updateUser);
router.put('/users/:id/status', systemController.updateUserStatus);
router.put('/users/:id/password/reset', systemController.resetUserPassword);

// 部门管理路由
// 获取部门列表（无分页，用于下拉选择）
router.get('/departments/list', systemController.getAllDepartments);

router.get('/departments', systemController.getAllDepartments);
router.get('/departments/:id', systemController.getDepartmentById);
router.post('/departments', systemController.createDepartment);
router.put('/departments/:id', systemController.updateDepartment);
router.put('/departments/:id/status', systemController.updateDepartmentStatus);
router.delete('/departments/:id', systemController.deleteDepartment);

// 角色管理路由
// 获取角色列表（无分页，用于下拉选择）
router.get('/roles/list', async (req, res) => {
  try {
    const result = await systemModel.getAllRoles(1, 1000, {});
    res.json(result.list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/roles', systemController.getAllRoles);
router.get('/roles/:id', systemController.getRoleById);
// 获取角色权限
router.get('/roles/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params;
    const role = await systemModel.getRoleById(id);
    if (!role) {
      return res.status(404).json({ message: '角色不存在' });
    }
    // 返回角色的权限菜单ID列表
    const menuIds = role.permissions ? role.permissions.map(menu => menu.id) : [];
    res.json(menuIds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 更新角色权限
router.put('/roles/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params;
    const { menuIds } = req.body;
    
    if (!Array.isArray(menuIds)) {
      return res.status(400).json({ message: '菜单ID列表格式不正确' });
    }
    
    // 使用 systemModel 的方法来更新角色权限
    await systemModel.updateRole(id, { menuIds });
    res.json({ message: '权限更新成功' });
  } catch (error) {
    console.error('更新角色权限失败:', error);
    res.status(500).json({ message: '更新角色权限失败: ' + error.message });
  }
});

router.post('/roles', systemController.createRole);
router.put('/roles/:id', systemController.updateRole);
router.put('/roles/:id/status', systemController.updateRoleStatus);
router.delete('/roles/:id', systemController.deleteRole);

// 菜单管理路由
router.get('/menus', systemController.getAllMenus);
router.get('/menus/:id', systemController.getMenuById);
router.post('/menus', systemController.createMenu);
router.put('/menus/:id', systemController.updateMenu);
router.delete('/menus/:id', systemController.deleteMenu);

module.exports = router; 