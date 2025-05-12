/**
 * 菜单控制器
 */
const Menu = require('../models/menu');

/**
 * 获取所有菜单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getAllMenus = async (req, res) => {
  try {
    const menus = await Menu.getMenus();
    res.json({
      code: 200,
      data: menus,
      message: '获取菜单列表成功'
    });
  } catch (error) {
    console.error('获取菜单列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取菜单列表失败'
    });
  }
};

/**
 * 获取菜单树
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getMenuTree = async (req, res) => {
  try {
    const menuTree = await Menu.getMenuTree();
    res.json({
      code: 200,
      data: menuTree,
      message: '获取菜单树成功'
    });
  } catch (error) {
    console.error('获取菜单树失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取菜单树失败'
    });
  }
};

/**
 * 根据ID获取菜单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getMenuById = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.getMenu(id);
    
    if (!menu) {
      return res.status(404).json({
        code: 404,
        message: '菜单不存在'
      });
    }
    
    res.json({
      code: 200,
      data: menu,
      message: '获取菜单成功'
    });
  } catch (error) {
    console.error(`获取菜单失败, ID: ${req.params.id}`, error);
    res.status(500).json({
      code: 500,
      message: '获取菜单失败'
    });
  }
};

/**
 * 创建菜单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const createMenu = async (req, res) => {
  try {
    const menuData = req.body;
    
    // 验证必填字段
    if (!menuData.name) {
      return res.status(400).json({
        code: 400,
        message: '菜单名称不能为空'
      });
    }
    
    const newMenu = await Menu.createMenu(menuData);
    
    res.status(201).json({
      code: 201,
      data: newMenu,
      message: '创建菜单成功'
    });
  } catch (error) {
    console.error('创建菜单失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建菜单失败'
    });
  }
};

/**
 * 更新菜单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const menuData = req.body;
    
    // 验证必填字段
    if (Object.keys(menuData).length === 0) {
      return res.status(400).json({
        code: 400,
        message: '更新数据不能为空'
      });
    }
    
    const updatedMenu = await Menu.updateMenu(id, menuData);
    
    if (!updatedMenu) {
      return res.status(404).json({
        code: 404,
        message: '菜单不存在'
      });
    }
    
    res.json({
      code: 200,
      data: updatedMenu,
      message: '更新菜单成功'
    });
  } catch (error) {
    console.error(`更新菜单失败, ID: ${req.params.id}`, error);
    res.status(500).json({
      code: 500,
      message: '更新菜单失败'
    });
  }
};

/**
 * 删除菜单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Menu.deleteMenu(id);
    
    if (!result) {
      return res.status(404).json({
        code: 404,
        message: '菜单不存在或删除失败'
      });
    }
    
    res.json({
      code: 200,
      message: '删除菜单成功'
    });
  } catch (error) {
    console.error(`删除菜单失败, ID: ${req.params.id}`, error);
    
    // 特殊处理子菜单存在的情况
    if (error.message && error.message.includes('子菜单')) {
      return res.status(400).json({
        code: 400,
        message: error.message
      });
    }
    
    res.status(500).json({
      code: 500,
      message: '删除菜单失败'
    });
  }
};

/**
 * 根据角色ID获取角色菜单树
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getRoleMenuTree = async (req, res) => {
  try {
    const { roleId } = req.params;
    
    // 这里需要从角色模型获取角色的菜单权限
    const Role = require('../models/role');
    const roleMenus = await Role.getRoleMenus(roleId);
    
    if (!roleMenus) {
      return res.status(404).json({
        code: 404,
        message: '角色不存在'
      });
    }
    
    // 获取角色菜单树
    const menuTree = await Menu.getRoleMenuTree(roleMenus);
    
    res.json({
      code: 200,
      data: menuTree,
      message: '获取角色菜单树成功'
    });
  } catch (error) {
    console.error(`获取角色菜单树失败, 角色ID: ${req.params.roleId}`, error);
    res.status(500).json({
      code: 500,
      message: '获取角色菜单树失败'
    });
  }
};

module.exports = {
  getAllMenus,
  getMenuTree,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  getRoleMenuTree
}; 