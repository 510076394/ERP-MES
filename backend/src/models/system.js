const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

// 系统管理模块模型
const systemModel = {
  // 用户管理
  async getAllUsers(page = 1, pageSize = 10, filters = {}) {
    const offset = (page - 1) * pageSize;
    let whereClause = '1=1';
    const params = [];

    if (filters.username) {
      whereClause += ' AND u.username LIKE ?';
      params.push(`%${filters.username}%`);
    }
    if (filters.name) {
      whereClause += ' AND u.name LIKE ?';
      params.push(`%${filters.name}%`);
    }
    if (filters.departmentId) {
      whereClause += ' AND u.department_id = ?';
      params.push(filters.departmentId);
    }
    if (filters.status !== undefined && filters.status !== '') {
      whereClause += ' AND u.status = ?';
      params.push(parseInt(filters.status));
    }

    // 获取总记录数
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 获取分页数据，包括关联的部门信息
    const [rows] = await pool.execute(
      `SELECT u.*, d.name as departmentName
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE ${whereClause}
       ORDER BY u.id DESC
       LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`,
      [...params]
    );

    // 获取每个用户的角色信息
    for (const user of rows) {
      const [roles] = await pool.execute(
        `SELECT r.* FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = ?`,
        [user.id]
      );
      user.roles = roles;
      user.roleNames = roles.map(r => r.name).join(', ');
    }

    return {
      list: rows,
      total,
      page,
      pageSize
    };
  },

  async getUserById(id) {
    try {
      // 确保id是数字类型
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        throw new Error('无效的用户ID');
      }

      const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
      if (!rows.length) return null;
      
      const user = rows[0];
      
      // 获取用户角色
      const [roles] = await pool.execute(
        `SELECT r.* FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = ?`,
        [userId]
      );
      user.roles = roles;
      
      return user;
    } catch (error) {
      console.error('获取用户详情失败:', error);
      throw error;
    }
  },

  async createUser(userData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // 检查用户名是否已存在
      const [existingUsers] = await connection.execute(
        'SELECT * FROM users WHERE username = ?',
        [userData.username]
      );
      
      if (existingUsers.length > 0) {
        throw new Error('用户名已存在');
      }
      
      // 密码加密
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // 插入用户基本信息
      const [result] = await connection.execute(
        `INSERT INTO users (username, password, name, email, phone, department_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userData.username,
          hashedPassword,
          userData.name,
          userData.email,
          userData.phone,
          userData.departmentId,
          userData.status
        ]
      );
      
      const userId = result.insertId;
      
      // 插入用户角色关联
      if (userData.roleIds && userData.roleIds.length > 0) {
        for (const roleId of userData.roleIds) {
          await connection.execute(
            'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
            [userId, roleId]
          );
        }
      }
      
      await connection.commit();
      return { id: userId, ...userData };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateUser(id, userData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // 更新用户基本信息
      await connection.execute(
        `UPDATE users SET 
          name = ?, 
          email = ?, 
          phone = ?, 
          department_id = ?, 
          status = ?,
          updated_at = NOW()
         WHERE id = ?`,
        [
          userData.name,
          userData.email,
          userData.phone,
          userData.departmentId,
          userData.status,
          id
        ]
      );
      
      // 更新用户角色关联
      if (userData.roleIds) {
        // 先删除现有角色关联
        await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
        
        // 添加新的角色关联
        for (const roleId of userData.roleIds) {
          await connection.execute(
            'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
            [id, roleId]
          );
        }
      }
      
      await connection.commit();
      return { id, ...userData };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateUserStatus(id, status) {
    const [result] = await pool.execute(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  },

  async resetUserPassword(id, password) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const [result] = await pool.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, id]
    );
    return result.affectedRows > 0;
  },

  // 部门管理
  async getAllDepartments(filters = {}) {
    let whereClause = '1=1';
    const params = [];

    if (filters.name) {
      whereClause += ' AND name LIKE ?';
      params.push(`%${filters.name}%`);
    }

    const [rows] = await pool.execute(
      `SELECT * FROM departments WHERE ${whereClause} ORDER BY id ASC`,
      params
    );

    // 简化树形结构 - 当前表结构仅包含基础字段
    const departments = rows.map(dept => ({
      ...dept,
      // 添加前端需要的字段默认值
      parent_id: null,
      code: '',
      manager: '',
      phone: '',
      status: 1,
      remark: '',
      children: []
    }));

    // 简化为平铺结构，不处理树形关系
    return departments;
  },

  async getDepartmentById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );
    if (!rows.length) return null;
    
    // 补充前端需要的字段默认值
    return {
      ...rows[0],
      parent_id: null,
      code: '',
      manager: '',
      phone: '',
      status: 1,
      remark: ''
    };
  },

  async createDepartment(departmentData) {
    const [result] = await pool.execute(
      `INSERT INTO departments (name, created_at) VALUES (?, NOW())`,
      [departmentData.name]
    );
    return { 
      id: result.insertId, 
      name: departmentData.name,
      created_at: new Date(),
      // 补充前端需要的字段默认值
      parent_id: null,
      code: '',
      manager: '',
      phone: '',
      status: 1,
      remark: ''
    };
  },

  async updateDepartment(id, departmentData) {
    const [result] = await pool.execute(
      `UPDATE departments SET name = ? WHERE id = ?`,
      [departmentData.name, id]
    );
    return result.affectedRows > 0;
  },

  async updateDepartmentStatus(id, status) {
    // 此表不支持状态，返回成功但不实际操作
    return true;
  },

  async deleteDepartment(id) {
    const [result] = await pool.execute(
      'DELETE FROM departments WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  // 角色管理
  async getAllRoles(page = 1, pageSize = 10, filters = {}) {
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    let whereClause = '1=1';
    const params = [];

    if (filters.name) {
      whereClause += ' AND name LIKE ?';
      params.push(`%${filters.name}%`);
    }
    if (filters.code) {
      whereClause += ' AND code LIKE ?';
      params.push(`%${filters.code}%`);
    }
    if (filters.status !== undefined && filters.status !== '') {
      whereClause += ' AND status = ?';
      params.push(parseInt(filters.status));
    }

    // 获取总记录数
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM roles WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 获取分页数据
    const [rows] = await pool.execute(
      `SELECT * FROM roles WHERE ${whereClause} ORDER BY id ASC LIMIT ${parseInt(pageSize)} OFFSET ${offset}`,
      params
    );

    return {
      list: rows,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    };
  },

  async getRoleById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM roles WHERE id = ?',
      [id]
    );
    
    if (!rows.length) return null;
    
    const role = rows[0];
    
    // 获取角色的权限
    const [permissions] = await pool.execute(
      `SELECT m.* FROM menus m
       JOIN role_menus rm ON m.id = rm.menu_id
       WHERE rm.role_id = ?`,
      [id]
    );
    
    role.permissions = permissions;
    
    return role;
  },

  async createRole(roleData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // 插入角色基本信息
      const [result] = await connection.execute(
        `INSERT INTO roles (name, code, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [
          roleData.name,
          roleData.code,
          roleData.description,
          roleData.status
        ]
      );
      
      const roleId = result.insertId;
      
      // 插入角色菜单权限关联
      if (roleData.menuIds && roleData.menuIds.length > 0) {
        for (const menuId of roleData.menuIds) {
          await connection.execute(
            'INSERT INTO role_menus (role_id, menu_id) VALUES (?, ?)',
            [roleId, menuId]
          );
        }
      }
      
      await connection.commit();
      return { id: roleId, ...roleData };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateRole(id, roleData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // 如果有基本信息需要更新
      if (roleData.name !== undefined) {
        // 更新角色基本信息
        await connection.execute(
          `UPDATE roles SET
            name = ?,
            code = ?,
            description = ?,
            status = ?,
            updated_at = NOW()
           WHERE id = ?`,
          [
            roleData.name,
            roleData.code,
            roleData.description,
            roleData.status,
            id
          ]
        );
      }
      
      // 更新角色菜单权限关联
      if (roleData.menuIds !== undefined) {
        // 先删除现有权限关联
        await connection.execute('DELETE FROM role_menus WHERE role_id = ?', [id]);
        
        // 添加新的权限关联
        if (roleData.menuIds && roleData.menuIds.length > 0) {
          for (const menuId of roleData.menuIds) {
            await connection.execute(
              'INSERT INTO role_menus (role_id, menu_id) VALUES (?, ?)',
              [id, menuId]
            );
          }
        }
      }
      
      await connection.commit();
      return { id, ...roleData };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateRoleStatus(id, status) {
    const [result] = await pool.execute(
      'UPDATE roles SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  },

  async deleteRole(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // 检查该角色是否被用户使用
      const [userRoles] = await connection.execute(
        'SELECT COUNT(*) as count FROM user_roles WHERE role_id = ?',
        [id]
      );
      
      if (userRoles[0].count > 0) {
        throw new Error('该角色已被用户使用，不能删除');
      }
      
      // 删除角色菜单关联
      await connection.execute('DELETE FROM role_menus WHERE role_id = ?', [id]);
      
      // 删除角色
      const [result] = await connection.execute('DELETE FROM roles WHERE id = ?', [id]);
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // 菜单管理
  async getAllMenus(filters = {}) {
    let whereClause = '1=1';
    const params = [];

    if (filters.name) {
      whereClause += ' AND name LIKE ?';
      params.push(`%${filters.name}%`);
    }
    if (filters.status !== undefined && filters.status !== '') {
      whereClause += ' AND status = ?';
      params.push(parseInt(filters.status));
    }

    const [rows] = await pool.execute(
      `SELECT * FROM menus WHERE ${whereClause} ORDER BY id ASC`,
      params
    );

    // 将菜单列表转换为树形结构
    const menus = rows.map(menu => ({
      ...menu,
      children: []
    }));

    const menuMap = {};
    menus.forEach(menu => {
      menuMap[menu.id] = menu;
    });

    const tree = [];
    menus.forEach(menu => {
      if (menu.parent_id) {
        const parent = menuMap[menu.parent_id];
        if (parent) {
          parent.children.push(menu);
        } else {
          tree.push(menu);
        }
      } else {
        tree.push(menu);
      }
    });

    return tree;
  },

  async getMenuById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM menus WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  async createMenu(menuData) {
    const [result] = await pool.execute(
      `INSERT INTO menus (
        parent_id, name, path, component, redirect, icon, permission, type, visible, status, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        menuData.parent_id || null,
        menuData.name,
        menuData.path,
        menuData.component,
        menuData.redirect,
        menuData.icon,
        menuData.permission,
        menuData.type,
        menuData.visible !== undefined ? menuData.visible : 1,
        menuData.status !== undefined ? menuData.status : 1,
        menuData.sort_order || 0
      ]
    );
    return { id: result.insertId, ...menuData };
  },

  async updateMenu(id, menuData) {
    const [result] = await pool.execute(
      `UPDATE menus SET
        parent_id = ?,
        name = ?,
        path = ?,
        component = ?,
        redirect = ?,
        icon = ?,
        permission = ?,
        type = ?,
        visible = ?,
        status = ?,
        sort_order = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [
        menuData.parent_id || null,
        menuData.name,
        menuData.path,
        menuData.component,
        menuData.redirect,
        menuData.icon,
        menuData.permission,
        menuData.type,
        menuData.visible !== undefined ? menuData.visible : 1,
        menuData.status !== undefined ? menuData.status : 1,
        menuData.sort_order || 0,
        id
      ]
    );
    return result.affectedRows > 0;
  },

  async deleteMenu(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // 检查是否有子菜单
      const [children] = await connection.execute(
        'SELECT COUNT(*) as count FROM menus WHERE parent_id = ?',
        [id]
      );
      
      if (children[0].count > 0) {
        throw new Error('该菜单下有子菜单，不能删除');
      }
      
      // 删除角色菜单关联
      await connection.execute('DELETE FROM role_menus WHERE menu_id = ?', [id]);
      
      // 删除菜单
      const [result] = await connection.execute('DELETE FROM menus WHERE id = ?', [id]);
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = systemModel; 