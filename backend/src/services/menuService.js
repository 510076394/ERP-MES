/**
 * 菜单服务
 */
const Menu = require('../models/menu');
const { buildMenuTree } = require('../utils/treeUtils');

/**
 * 获取所有菜单
 * @returns {Promise<Array>} 菜单列表
 */
async function getAllMenus() {
  try {
    const menus = await Menu.findAll();
    return menus;
  } catch (error) {
    throw new Error('获取菜单列表失败：' + error.message);
  }
}

/**
 * 获取菜单树
 * @returns {Promise<Array>} 菜单树
 */
async function getMenuTree() {
  try {
    const menus = await Menu.findAll();
    return buildMenuTree(menus);
  } catch (error) {
    throw new Error('获取菜单树失败：' + error.message);
  }
}

/**
 * 根据ID获取菜单
 * @param {number} id 菜单ID
 * @returns {Promise<Object>} 菜单对象
 */
async function getMenuById(id) {
  try {
    const menu = await Menu.findByPk(id);
    if (!menu) {
      throw new Error('菜单不存在');
    }
    return menu;
  } catch (error) {
    throw new Error('获取菜单详情失败：' + error.message);
  }
}

/**
 * 创建菜单
 * @param {Object} menuData 菜单数据
 * @returns {Promise<Object>} 创建的菜单对象
 */
async function createMenu(menuData) {
  try {
    if (!menuData.name) {
      throw new Error('菜单名称不能为空');
    }
    
    const menu = await Menu.create(menuData);
    return menu;
  } catch (error) {
    throw new Error('创建菜单失败：' + error.message);
  }
}

/**
 * 更新菜单
 * @param {number} id 菜单ID
 * @param {Object} menuData 菜单数据
 * @returns {Promise<Object>} 更新后的菜单对象
 */
async function updateMenu(id, menuData) {
  try {
    const menu = await Menu.findByPk(id);
    if (!menu) {
      throw new Error('菜单不存在');
    }
    
    const updatedMenu = await menu.update(menuData);
    return updatedMenu;
  } catch (error) {
    throw new Error('更新菜单失败：' + error.message);
  }
}

/**
 * 删除菜单
 * @param {number} id 菜单ID
 * @returns {Promise<boolean>} 删除结果
 */
async function deleteMenu(id) {
  try {
    const menu = await Menu.findByPk(id);
    if (!menu) {
      throw new Error('菜单不存在');
    }
    
    // 检查是否有子菜单
    const subMenus = await Menu.findAll({ where: { parentId: id } });
    if (subMenus && subMenus.length > 0) {
      throw new Error('该菜单下有子菜单，无法删除');
    }
    
    await menu.destroy();
    return true;
  } catch (error) {
    throw new Error('删除菜单失败：' + error.message);
  }
}

/**
 * 获取角色菜单树
 * @param {number} roleId 角色ID
 * @returns {Promise<Array>} 角色菜单树
 */
async function getRoleMenuTree(roleId) {
  try {
    // 获取角色所有菜单
    const roleMenus = await Menu.findAll({
      include: [{
        model: Role,
        where: { id: roleId },
        through: { attributes: [] }
      }]
    });
    
    if (!roleMenus || roleMenus.length === 0) {
      return [];
    }
    
    return buildMenuTree(roleMenus);
  } catch (error) {
    throw new Error('获取角色菜单失败：' + error.message);
  }
}

module.exports = {
  getAllMenus,
  getMenuTree,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  getRoleMenuTree
}; 