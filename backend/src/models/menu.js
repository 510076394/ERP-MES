/**
 * 菜单模型
 */

// 存储菜单数据
let menusData = [
  { id: 1, parentId: 0, name: '首页', path: '/dashboard', component: 'Dashboard', icon: 'dashboard', type: 1, permission: 'dashboard', sort: 1, status: 1 },
  { id: 2, parentId: 0, name: '系统管理', path: '/system', component: 'Layout', icon: 'setting', type: 1, permission: 'system', sort: 2, status: 1 },
  { id: 3, parentId: 2, name: '用户管理', path: '/system/user', component: 'User', icon: 'user', type: 1, permission: 'system:user', sort: 1, status: 1 },
  { id: 4, parentId: 2, name: '角色管理', path: '/system/role', component: 'Role', icon: 'team', type: 1, permission: 'system:role', sort: 2, status: 1 },
  { id: 5, parentId: 0, name: '库存管理', path: '/inventory', component: 'Layout', icon: 'appstore', type: 1, permission: 'inventory', sort: 3, status: 1 },
  { id: 6, parentId: 5, name: '物料管理', path: '/inventory/material', component: 'Material', icon: 'tool', type: 1, permission: 'inventory:material', sort: 1, status: 1 },
  { id: 7, parentId: 5, name: '仓库管理', path: '/inventory/warehouse', component: 'Warehouse', icon: 'home', type: 1, permission: 'inventory:warehouse', sort: 2, status: 1 },
  { id: 8, parentId: 0, name: '采购管理', path: '/purchase', component: 'Layout', icon: 'shopping-cart', type: 1, permission: 'purchase', sort: 4, status: 1 },
  { id: 9, parentId: 8, name: '供应商管理', path: '/purchase/supplier', component: 'Supplier', icon: 'user', type: 1, permission: 'purchase:supplier', sort: 1, status: 1 },
  { id: 10, parentId: 8, name: '采购订单', path: '/purchase/order', component: 'PurchaseOrder', icon: 'file-text', type: 1, permission: 'purchase:order', sort: 2, status: 1 }
];

/**
 * 获取所有菜单
 * @returns {Promise<Array>} 菜单列表
 */
const getMenus = async () => {
  try {
    return menusData;
  } catch (error) {
    console.error('获取菜单列表失败:', error);
    throw error;
  }
};

/**
 * 根据ID获取菜单
 * @param {number} menuId 菜单ID
 * @returns {Promise<Object|null>} 菜单信息
 */
const getMenu = async (menuId) => {
  try {
    const id = Number(menuId);
    return menusData.find(menu => menu.id === id) || null;
  } catch (error) {
    console.error(`获取菜单信息失败，菜单ID: ${menuId}`, error);
    throw error;
  }
};

/**
 * 创建新菜单
 * @param {Object} menuData 菜单数据
 * @returns {Promise<Object>} 新创建的菜单
 */
const createMenu = async (menuData) => {
  try {
    // 生成新菜单ID
    const maxId = menusData.length > 0 
      ? Math.max(...menusData.map(menu => menu.id)) 
      : 0;
    
    const newMenu = {
      id: maxId + 1,
      parentId: menuData.parentId || 0,
      name: menuData.name,
      path: menuData.path || '',
      component: menuData.component || '',
      icon: menuData.icon || '',
      type: menuData.type !== undefined ? menuData.type : 1,
      permission: menuData.permission || '',
      sort: menuData.sort || (maxId + 1),
      status: menuData.status !== undefined ? menuData.status : 1
    };
    
    menusData.push(newMenu);
    return newMenu;
  } catch (error) {
    console.error('创建菜单失败:', error);
    throw error;
  }
};

/**
 * 更新菜单信息
 * @param {number} menuId 菜单ID
 * @param {Object} menuData 菜单数据
 * @returns {Promise<Object|null>} 更新后的菜单
 */
const updateMenu = async (menuId, menuData) => {
  try {
    const id = Number(menuId);
    const index = menusData.findIndex(menu => menu.id === id);
    
    if (index === -1) {
      return null;
    }
    
    const updatedMenu = {
      ...menusData[index],
      parentId: menuData.parentId !== undefined ? menuData.parentId : menusData[index].parentId,
      name: menuData.name !== undefined ? menuData.name : menusData[index].name,
      path: menuData.path !== undefined ? menuData.path : menusData[index].path,
      component: menuData.component !== undefined ? menuData.component : menusData[index].component,
      icon: menuData.icon !== undefined ? menuData.icon : menusData[index].icon,
      type: menuData.type !== undefined ? menuData.type : menusData[index].type,
      permission: menuData.permission !== undefined ? menuData.permission : menusData[index].permission,
      sort: menuData.sort !== undefined ? menuData.sort : menusData[index].sort,
      status: menuData.status !== undefined ? menuData.status : menusData[index].status
    };
    
    menusData[index] = updatedMenu;
    return updatedMenu;
  } catch (error) {
    console.error(`更新菜单失败，菜单ID: ${menuId}`, error);
    throw error;
  }
};

/**
 * 删除菜单
 * @param {number} menuId 菜单ID
 * @returns {Promise<boolean>} 是否删除成功
 */
const deleteMenu = async (menuId) => {
  try {
    const id = Number(menuId);
    
    // 先检查是否有子菜单
    const hasChildren = menusData.some(menu => menu.parentId === id);
    if (hasChildren) {
      throw new Error('该菜单下有子菜单，无法删除');
    }
    
    const initialLength = menusData.length;
    menusData = menusData.filter(menu => menu.id !== id);
    
    return initialLength > menusData.length;
  } catch (error) {
    console.error(`删除菜单失败，菜单ID: ${menuId}`, error);
    throw error;
  }
};

/**
 * 根据菜单ID列表获取菜单详细信息
 * @param {Array} menuIds 菜单ID列表
 * @returns {Promise<Array>} 菜单列表
 */
const getMenusByIds = async (menuIds) => {
  try {
    // 确保menuIds是数字类型
    const ids = menuIds.map(id => Number(id));
    return menusData.filter(menu => ids.includes(menu.id));
  } catch (error) {
    console.error(`根据ID获取菜单列表失败`, error);
    throw error;
  }
};

/**
 * 构建菜单树
 * @param {Array} menus 菜单列表
 * @param {number} parentId 父菜单ID
 * @returns {Array} 菜单树
 */
const buildMenuTree = (menus, parentId = 0) => {
  const result = [];
  
  menus.forEach(menu => {
    if (menu.parentId === parentId) {
      const children = buildMenuTree(menus, menu.id);
      if (children.length > 0) {
        menu.children = children;
      }
      result.push(menu);
    }
  });
  
  // 按照sort排序
  return result.sort((a, b) => a.sort - b.sort);
};

/**
 * 获取菜单树
 * @returns {Promise<Array>} 菜单树
 */
const getMenuTree = async () => {
  try {
    const menus = await getMenus();
    return buildMenuTree(menus);
  } catch (error) {
    console.error('获取菜单树失败:', error);
    throw error;
  }
};

/**
 * 获取角色的菜单树
 * @param {Array} menuIds 角色拥有的菜单ID列表
 * @returns {Promise<Array>} 角色的菜单树
 */
const getRoleMenuTree = async (menuIds) => {
  try {
    // 获取所有菜单
    const allMenus = await getMenus();
    
    // 过滤出角色拥有的菜单
    const roleMenus = allMenus.filter(menu => menuIds.includes(menu.id));
    
    // 构建菜单树
    return buildMenuTree(roleMenus);
  } catch (error) {
    console.error('获取角色菜单树失败:', error);
    throw error;
  }
};

module.exports = {
  getMenus,
  getMenu,
  createMenu,
  updateMenu,
  deleteMenu,
  getMenusByIds,
  getMenuTree,
  getRoleMenuTree
}; 