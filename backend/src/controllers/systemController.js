const systemModel = require('../models/system');
const bcrypt = require('bcryptjs');

// 系统管理控制器
const systemController = {
  // 用户管理
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const result = await systemModel.getAllUsers(
        parseInt(page),
        parseInt(limit),
        filters
      );
      res.json({
        code: 200,
        data: result.list,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        message: '获取用户列表成功'
      });
    } catch (error) {
      console.error('获取用户列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取用户列表失败: ' + error.message
      });
    }
  },

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          code: 400,
          message: '缺少用户ID参数'
        });
      }
      
      const user = await systemModel.getUserById(id);
      
      if (!user) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在'
        });
      }
      
      // 不返回密码
      const { password, ...userData } = user;
      
      res.json({
        code: 200,
        data: userData,
        message: '获取用户信息成功'
      });
    } catch (error) {
      console.error('获取用户信息失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取用户信息失败: ' + error.message
      });
    }
  },

  async createUser(req, res) {
    try {
      const userData = req.body;
      const newUser = await systemModel.createUser(userData);
      
      // 不返回密码
      const { password, ...result } = newUser;
      
      res.status(201).json({
        code: 201,
        data: result,
        message: '创建用户成功'
      });
    } catch (error) {
      console.error('创建用户失败:', error);
      res.status(500).json({
        code: 500,
        message: '创建用户失败: ' + error.message
      });
    }
  },

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const userData = req.body;
      
      const updatedUser = await systemModel.updateUser(id, userData);
      
      res.json({
        code: 200,
        data: updatedUser,
        message: '更新用户成功'
      });
    } catch (error) {
      console.error('更新用户失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新用户失败: ' + error.message
      });
    }
  },

  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (status === undefined) {
        return res.status(400).json({
          code: 400,
          message: '缺少状态参数'
        });
      }
      
      const result = await systemModel.updateUserStatus(id, status);
      
      if (!result) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在'
        });
      }
      
      res.json({
        code: 200,
        message: `用户状态已${status === 1 ? '启用' : '禁用'}`
      });
    } catch (error) {
      console.error('更新用户状态失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新用户状态失败: ' + error.message
      });
    }
  },

  async resetUserPassword(req, res) {
    try {
      const { id } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({
          code: 400,
          message: '缺少密码参数'
        });
      }
      
      const result = await systemModel.resetUserPassword(id, password);
      
      if (!result) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在'
        });
      }
      
      res.json({
        code: 200,
        message: '密码重置成功'
      });
    } catch (error) {
      console.error('重置密码失败:', error);
      res.status(500).json({
        code: 500,
        message: '重置密码失败: ' + error.message
      });
    }
  },

  // 部门管理
  async getAllDepartments(req, res) {
    try {
      const filters = req.query;
      const departments = await systemModel.getAllDepartments(filters);
      
      // 确保返回的始终是数组
      const safeResult = Array.isArray(departments) ? departments : [];
      
      return res.json(safeResult);
    } catch (error) {
      console.error('获取部门列表失败:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  async getDepartmentById(req, res) {
    try {
      const { id } = req.params;
      const department = await systemModel.getDepartmentById(id);
      
      if (!department) {
        return res.status(404).json({
          code: 404,
          message: '部门不存在'
        });
      }
      
      res.json({
        code: 200,
        data: department,
        message: '获取部门信息成功'
      });
    } catch (error) {
      console.error('获取部门信息失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取部门信息失败: ' + error.message
      });
    }
  },

  async createDepartment(req, res) {
    try {
      const departmentData = req.body;
      const newDepartment = await systemModel.createDepartment(departmentData);
      
      res.status(201).json({
        code: 201,
        data: newDepartment,
        message: '创建部门成功'
      });
    } catch (error) {
      console.error('创建部门失败:', error);
      res.status(500).json({
        code: 500,
        message: '创建部门失败: ' + error.message
      });
    }
  },

  async updateDepartment(req, res) {
    try {
      const { id } = req.params;
      const departmentData = req.body;
      
      const result = await systemModel.updateDepartment(id, departmentData);
      
      if (!result) {
        return res.status(404).json({
          code: 404,
          message: '部门不存在'
        });
      }
      
      res.json({
        code: 200,
        message: '更新部门成功'
      });
    } catch (error) {
      console.error('更新部门失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新部门失败: ' + error.message
      });
    }
  },

  async updateDepartmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (status === undefined) {
        return res.status(400).json({
          code: 400,
          message: '缺少状态参数'
        });
      }
      
      const result = await systemModel.updateDepartmentStatus(id, status);
      
      if (!result) {
        return res.status(404).json({
          code: 404,
          message: '部门不存在'
        });
      }
      
      res.json({
        code: 200,
        message: `部门状态已${status === 1 ? '启用' : '禁用'}`
      });
    } catch (error) {
      console.error('更新部门状态失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新部门状态失败: ' + error.message
      });
    }
  },

  async deleteDepartment(req, res) {
    try {
      const { id } = req.params;
      
      await systemModel.deleteDepartment(id);
      
      res.json({
        code: 200,
        message: '删除部门成功'
      });
    } catch (error) {
      console.error('删除部门失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除部门失败: ' + error.message
      });
    }
  },

  // 角色管理
  async getAllRoles(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = { ...req.query };
      delete filters.page;
      delete filters.limit;

      const result = await systemModel.getAllRoles(page, limit, filters);
      res.json({
        code: 200,
        data: result.list,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        message: '获取角色列表成功'
      });
    } catch (error) {
      console.error('获取角色列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取角色列表失败: ' + error.message
      });
    }
  },

  async getRoleById(req, res) {
    try {
      const { id } = req.params;
      const role = await systemModel.getRoleById(id);
      
      if (!role) {
        return res.status(404).json({
          code: 404,
          message: '角色不存在'
        });
      }
      
      res.json({
        code: 200,
        data: role,
        message: '获取角色信息成功'
      });
    } catch (error) {
      console.error('获取角色信息失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取角色信息失败: ' + error.message
      });
    }
  },

  async createRole(req, res) {
    try {
      const roleData = req.body;
      const newRole = await systemModel.createRole(roleData);
      
      res.status(201).json({
        code: 201,
        data: newRole,
        message: '创建角色成功'
      });
    } catch (error) {
      console.error('创建角色失败:', error);
      res.status(500).json({
        code: 500,
        message: '创建角色失败: ' + error.message
      });
    }
  },

  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const roleData = req.body;
      
      const result = await systemModel.updateRole(id, roleData);
      
      res.json({
        code: 200,
        data: result,
        message: '更新角色成功'
      });
    } catch (error) {
      console.error('更新角色失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新角色失败: ' + error.message
      });
    }
  },

  async updateRoleStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (status === undefined) {
        return res.status(400).json({
          code: 400,
          message: '缺少状态参数'
        });
      }
      
      const result = await systemModel.updateRoleStatus(id, status);
      
      if (!result) {
        return res.status(404).json({
          code: 404,
          message: '角色不存在'
        });
      }
      
      res.json({
        code: 200,
        message: `角色状态已${status === 1 ? '启用' : '禁用'}`
      });
    } catch (error) {
      console.error('更新角色状态失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新角色状态失败: ' + error.message
      });
    }
  },

  async deleteRole(req, res) {
    try {
      const { id } = req.params;
      
      await systemModel.deleteRole(id);
      
      res.json({
        code: 200,
        message: '删除角色成功'
      });
    } catch (error) {
      console.error('删除角色失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除角色失败: ' + error.message
      });
    }
  },

  // 菜单管理
  async getAllMenus(req, res) {
    try {
      const result = await systemModel.getAllMenus(req.query);
      res.json({
        code: 200,
        data: result,
        message: '获取菜单列表成功'
      });
    } catch (error) {
      console.error('获取菜单列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取菜单列表失败: ' + error.message
      });
    }
  },

  async getMenuById(req, res) {
    try {
      const { id } = req.params;
      const menu = await systemModel.getMenuById(id);
      
      if (!menu) {
        return res.status(404).json({
          code: 404,
          message: '菜单不存在'
        });
      }
      
      res.json({
        code: 200,
        data: menu,
        message: '获取菜单信息成功'
      });
    } catch (error) {
      console.error('获取菜单信息失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取菜单信息失败: ' + error.message
      });
    }
  },

  async createMenu(req, res) {
    try {
      const menuData = req.body;
      const newMenu = await systemModel.createMenu(menuData);
      
      res.status(201).json({
        code: 201,
        data: newMenu,
        message: '创建菜单成功'
      });
    } catch (error) {
      console.error('创建菜单失败:', error);
      res.status(500).json({
        code: 500,
        message: '创建菜单失败: ' + error.message
      });
    }
  },

  async updateMenu(req, res) {
    try {
      const { id } = req.params;
      const menuData = req.body;
      
      const result = await systemModel.updateMenu(id, menuData);
      
      if (!result) {
        return res.status(404).json({
          code: 404,
          message: '菜单不存在'
        });
      }
      
      res.json({
        code: 200,
        message: '更新菜单成功'
      });
    } catch (error) {
      console.error('更新菜单失败:', error);
      res.status(500).json({
        code: 500,
        message: '更新菜单失败: ' + error.message
      });
    }
  },

  async deleteMenu(req, res) {
    try {
      const { id } = req.params;
      
      await systemModel.deleteMenu(id);
      
      res.json({
        code: 200,
        message: '删除菜单成功'
      });
    } catch (error) {
      console.error('删除菜单失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除菜单失败: ' + error.message
      });
    }
  }
};

module.exports = systemController; 