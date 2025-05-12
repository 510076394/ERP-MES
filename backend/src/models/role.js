/**
 * 角色模型
 */

// 存储角色数据
let rolesData = [
  { id: 1, name: '超级管理员', description: '拥有所有权限', status: 1 },
  { id: 2, name: '管理员', description: '拥有大部分权限', status: 1 },
  { id: 3, name: '普通用户', description: '拥有基本权限', status: 1 }
];

// 存储角色与菜单的关联数据
let roleMenuData = {
  '1': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], // 超级管理员拥有所有菜单权限
  '2': [1, 2, 3, 4, 5, 6, 7],  // 管理员拥有部分菜单权限
  '3': [1, 2]  // 普通用户拥有基本菜单权限
};

/**
 * 获取所有角色
 * @returns {Promise<Array>} 角色列表
 */
const getRoles = async () => {
  try {
    return rolesData;
  } catch (error) {
    console.error('获取角色列表失败:', error);
    throw error;
  }
};

/**
 * 根据角色ID获取角色信息
 * @param {number} roleId 角色ID
 * @returns {Promise<Object|null>} 角色信息
 */
const getRole = async (roleId) => {
  try {
    // 转换为数字类型进行比较
    const id = Number(roleId);
    return rolesData.find(role => role.id === id) || null;
  } catch (error) {
    console.error(`获取角色信息失败，角色ID: ${roleId}`, error);
    throw error;
  }
};

/**
 * 创建新角色
 * @param {Object} roleData 角色数据
 * @returns {Promise<Object>} 新创建的角色
 */
const createRole = async (roleData) => {
  try {
    // 生成新角色ID
    const maxId = rolesData.length > 0 
      ? Math.max(...rolesData.map(role => role.id)) 
      : 0;
    const newRole = {
      id: maxId + 1,
      name: roleData.name,
      description: roleData.description || '',
      status: roleData.status !== undefined ? roleData.status : 1
    };
    
    rolesData.push(newRole);
    
    // 初始化该角色的菜单权限
    roleMenuData[newRole.id] = [];
    
    return newRole;
  } catch (error) {
    console.error('创建角色失败:', error);
    throw error;
  }
};

/**
 * 更新角色信息
 * @param {number} roleId 角色ID
 * @param {Object} roleData 角色数据
 * @returns {Promise<Object|null>} 更新后的角色
 */
const updateRole = async (roleId, roleData) => {
  try {
    const id = Number(roleId);
    const index = rolesData.findIndex(role => role.id === id);
    
    if (index === -1) {
      return null;
    }
    
    const updatedRole = {
      ...rolesData[index],
      name: roleData.name !== undefined ? roleData.name : rolesData[index].name,
      description: roleData.description !== undefined ? roleData.description : rolesData[index].description,
      status: roleData.status !== undefined ? roleData.status : rolesData[index].status
    };
    
    rolesData[index] = updatedRole;
    return updatedRole;
  } catch (error) {
    console.error(`更新角色失败，角色ID: ${roleId}`, error);
    throw error;
  }
};

/**
 * 删除角色
 * @param {number} roleId 角色ID
 * @returns {Promise<boolean>} 是否删除成功
 */
const deleteRole = async (roleId) => {
  try {
    const id = Number(roleId);
    const initialLength = rolesData.length;
    rolesData = rolesData.filter(role => role.id !== id);
    
    // 如果删除了角色，也删除对应的角色菜单关联数据
    if (initialLength > rolesData.length) {
      delete roleMenuData[roleId];
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`删除角色失败，角色ID: ${roleId}`, error);
    throw error;
  }
};

/**
 * 获取角色的菜单权限
 * @param {number} roleId 角色ID
 * @returns {Promise<Array>} 菜单ID列表
 */
const getRoleMenus = async (roleId) => {
  try {
    // 确保以字符串形式查找
    const roleFk = roleId.toString();
    return roleMenuData[roleFk] || [];
  } catch (error) {
    console.error(`获取角色菜单失败，角色ID: ${roleId}`, error);
    throw error;
  }
};

/**
 * 设置角色的菜单权限
 * @param {number} roleId 角色ID
 * @param {Array} menuIds 菜单ID列表
 * @returns {Promise<boolean>} 是否设置成功
 */
const setRoleMenus = async (roleId, menuIds) => {
  try {
    // 确保以字符串形式存储
    const roleFk = roleId.toString();
    
    // 确保菜单ID为数字类型
    roleMenuData[roleFk] = menuIds.map(id => Number(id));
    return true;
  } catch (error) {
    console.error(`设置角色菜单失败，角色ID: ${roleId}`, error);
    throw error;
  }
};

module.exports = {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getRoleMenus,
  setRoleMenus
}; 