<template>
  <div class="permissions-container">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 角色管理 -->
      <el-tab-pane label="角色管理" name="roles">
        <div class="role-header">
          <h3>系统角色</h3>
          <el-button type="primary" @click="showAddRoleDialog">新增角色</el-button>
        </div>
        
        <el-table
          :data="roleList"
          style="width: 100%"
          border
          v-loading="roleLoading"
        >
          <el-table-column prop="name" label="角色名称" width="180"></el-table-column>
          <el-table-column prop="code" label="角色编码" width="180"></el-table-column>
          <el-table-column prop="description" label="角色描述"></el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
                {{ scope.row.status === 1 ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180"></el-table-column>
          <el-table-column label="操作" width="250" fixed="right">
            <template #default="scope">
              <el-button type="primary" size="small" @click="handleEditRole(scope.row)">编辑</el-button>
              <el-button
                :type="scope.row.status === 1 ? 'danger' : 'success'"
                size="small"
                @click="handleToggleRoleStatus(scope.row)"
              >
                {{ scope.row.status === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button type="warning" size="small" @click="handleRolePermission(scope.row)">分配权限</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      
      <!-- 菜单权限 -->
      <el-tab-pane label="菜单权限" name="menus">
        <div class="menu-header">
          <h3>菜单权限</h3>
          <div>
            <el-button type="primary" @click="showAddMenuDialog">新增菜单</el-button>
            <el-button type="success" @click="importMenuData">导入完整菜单</el-button>
          </div>
        </div>
        
        <el-table
          :data="menuList"
          style="width: 100%"
          border
          row-key="id"
          default-expand-all
          :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
          v-loading="menuLoading"
          :default-sort="{ prop: 'sort', order: 'ascending' }"
        >
          <el-table-column prop="name" label="菜单名称" width="180">
            <template #default="scope">
              <span v-if="scope.row.icon" class="menu-icon">
                <i :class="scope.row.icon"></i>
              </span>
              {{ scope.row.name }}
              <el-tag v-if="scope.row.type === 0" type="primary" size="small">目录</el-tag>
              <el-tag v-else-if="scope.row.type === 1" type="success" size="small">菜单</el-tag>
              <el-tag v-else-if="scope.row.type === 2" type="warning" size="small">按钮</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="path" label="路由路径" width="180"></el-table-column>
          <el-table-column label="菜单类型" width="120">
            <template #default="scope">
              <el-tag v-if="scope.row.type === 0" type="primary">目录</el-tag>
              <el-tag v-else-if="scope.row.type === 1" type="success">菜单</el-tag>
              <el-tag v-else-if="scope.row.type === 2" type="warning">按钮</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="permission" label="权限标识" width="180"></el-table-column>
          <el-table-column prop="icon" label="图标" width="100">
            <template #default="scope">
              <el-icon v-if="scope.row.icon">
                <component :is="scope.row.icon" />
              </el-icon>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="80"></el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
                {{ scope.row.status === 1 ? '显示' : '隐藏' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="scope">
              <el-button type="primary" size="small" @click="handleEditMenu(scope.row)">编辑</el-button>
              <el-button type="success" size="small" @click="handleAddChildMenu(scope.row)" v-if="scope.row.type < 2">添加子菜单</el-button>
              <el-button type="danger" size="small" @click="handleDeleteMenu(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 角色添加/编辑对话框 -->
    <el-dialog
      :title="roleDialogTitle"
      v-model="roleDialogVisible"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="roleForm" :rules="roleRules" ref="roleFormRef" label-width="100px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="请输入角色名称"></el-input>
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="roleForm.code" placeholder="请输入角色编码"></el-input>
        </el-form-item>
        <el-form-item label="角色描述" prop="description">
          <el-input
            v-model="roleForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述"
          ></el-input>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="roleForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="roleDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveRole" :loading="roleSaveLoading">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 分配权限对话框 -->
    <el-dialog
      title="分配权限"
      v-model="permissionDialogVisible"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="current-role">当前角色：<strong>{{ currentRole.name }}</strong></div>
      <el-tree
        ref="permissionTreeRef"
        :data="menuTree"
        show-checkbox
        node-key="id"
        :props="{
          label: 'name',
          children: 'children'
        }"
        :default-checked-keys="selectedMenuIds"
        default-expand-all
      ></el-tree>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="permissionDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveRolePermission" :loading="permissionSaveLoading">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 菜单添加/编辑对话框 -->
    <el-dialog
      :title="menuDialogTitle"
      v-model="menuDialogVisible"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="menuForm" :rules="menuRules" ref="menuFormRef" label-width="100px">
        <el-form-item label="上级菜单">
          <el-tree-select
            v-model="menuForm.parentId"
            :data="menuTree"
            check-strictly
            default-expand-all
            node-key="id"
            :render-after-expand="false"
            :props="{ label: 'name', children: 'children' }"
            placeholder="请选择上级菜单"
            style="width: 100%"
          ></el-tree-select>
        </el-form-item>
        <el-form-item label="菜单类型" prop="type">
          <el-radio-group v-model="menuForm.type">
            <el-radio :label="0">目录</el-radio>
            <el-radio :label="1">菜单</el-radio>
            <el-radio :label="2">按钮</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="菜单名称" prop="name">
          <el-input v-model="menuForm.name" placeholder="请输入菜单名称"></el-input>
        </el-form-item>
        <el-form-item label="路由路径" prop="path" v-if="menuForm.type !== 2">
          <el-input v-model="menuForm.path" placeholder="请输入路由路径"></el-input>
        </el-form-item>
        <el-form-item label="组件路径" prop="component" v-if="menuForm.type === 1">
          <el-input v-model="menuForm.component" placeholder="请输入组件路径"></el-input>
        </el-form-item>
        <el-form-item label="权限标识" prop="permission" v-if="menuForm.type !== 0">
          <el-input v-model="menuForm.permission" placeholder="请输入权限标识"></el-input>
        </el-form-item>
        <el-form-item label="图标" prop="icon" v-if="menuForm.type !== 2">
          <el-input v-model="menuForm.icon" placeholder="请输入图标名称"></el-input>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="menuForm.sort" :min="0" :max="999" style="width: 100%"></el-input-number>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="menuForm.status">
            <el-radio :label="1">显示</el-radio>
            <el-radio :label="0">隐藏</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="menuDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveMenu" :loading="menuSaveLoading">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '../../services/api';
import menuPermissions, { buildMenuTree, generateMenuSQL } from '../../utils/menuPermissions';

// 当前激活的标签页
const activeTab = ref('roles');

// 角色相关
const roleList = ref([]);
const roleLoading = ref(false);
const roleSaveLoading = ref(false);
const roleDialogVisible = ref(false);
const roleDialogTitle = ref('新增角色');
const roleFormRef = ref(null);

// 菜单相关
const menuList = ref([]);
const menuTree = ref([]);
const menuLoading = ref(false);
const menuSaveLoading = ref(false);
const menuDialogVisible = ref(false);
const menuDialogTitle = ref('新增菜单');
const menuFormRef = ref(null);

// 权限分配相关
const permissionDialogVisible = ref(false);
const permissionTreeRef = ref(null);
const permissionSaveLoading = ref(false);
const currentRole = ref({});
const selectedMenuIds = ref([]);

// 角色表单
const roleForm = reactive({
  id: null,
  name: '',
  code: '',
  description: '',
  status: 1
});

// 菜单表单
const menuForm = reactive({
  id: null,
  parentId: null,
  name: '',
  path: '',
  component: '',
  permission: '',
  type: 1,
  icon: '',
  sort: 0,
  status: 1
});

// 角色表单验证规则
const roleRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' }
  ]
};

// 菜单表单验证规则
const menuRules = {
  name: [
    { required: true, message: '请输入菜单名称', trigger: 'blur' }
  ],
  path: [
    { required: true, message: '请输入路由路径', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择菜单类型', trigger: 'change' }
  ]
};

// 加载角色列表
const loadRoles = async () => {
  roleLoading.value = true;
  try {
    const response = await api.get('/system/roles');
    
    // 确保处理的是数组数据
    let responseData = response.data;
    
    if (Array.isArray(responseData)) {
      roleList.value = responseData;
    } else if (responseData && responseData.data && Array.isArray(responseData.data)) {
      roleList.value = responseData.data;
    } else if (responseData && responseData.list && Array.isArray(responseData.list)) {
      roleList.value = responseData.list;
    } else {
      console.error('Expected array for roles but got:', typeof responseData, responseData);
      roleList.value = []; // 确保是空数组
    }
  } catch (error) {
    console.error('加载角色列表失败:', error);
    roleList.value = []; // 确保错误时也是空数组
    ElMessage.error('加载角色列表失败');
  } finally {
    roleLoading.value = false;
  }
};

// 加载菜单数据
const loadMenus = async () => {
  try {
    menuLoading.value = true;
    console.log('开始加载菜单数据...');
    const response = await api.get('/system/menus');
    console.log('菜单数据响应:', response);
    
    // 检查响应数据
    if (!response || !response.data) {
      console.error('菜单数据响应无效:', response);
      ElMessage.error('加载菜单失败：响应数据无效');
      return;
    }
    
    let menuData = response.data;
    // 如果响应数据被包装在data字段中
    if (!Array.isArray(menuData) && menuData.data) {
      menuData = menuData.data;
    }
    
    if (Array.isArray(menuData)) {
      menuList.value = menuData;
      console.log('原始菜单数据:', menuList.value);
      
      // 构建菜单树
      menuTree.value = buildTree(menuList.value);
      console.log('构建的菜单树:', menuTree.value);
    } else {
      console.error('菜单数据格式错误:', menuData);
      ElMessage.error('加载菜单失败：数据格式错误');
    }
  } catch (error) {
    console.error('加载菜单失败:', error);
    if (error.response?.status === 401) {
      ElMessage.error('请先登录');
    } else {
      ElMessage.error('加载菜单失败：' + (error.response?.data?.message || error.message));
    }
  } finally {
    menuLoading.value = false;
  }
};

// 构建树形结构
const buildTree = (list) => {
  const map = {};
  const tree = [];

  // 首先创建一个以id为键的映射
  list.forEach(item => {
    map[item.id] = { ...item, children: [] };
  });

  // 然后构建树形结构
  list.forEach(item => {
    const node = map[item.id];
    if (item.parent_id === null || item.parent_id === 0) {
      // 顶级节点直接加入树中
      tree.push(node);
    } else {
      // 将当前节点添加到父节点的children中
      const parent = map[item.parent_id];
      if (parent) {
        parent.children.push(node);
      }
    }
  });

  // 对树进行排序
  const sortTree = (nodes) => {
    nodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortTree(node.children);
      }
    });
  };
  sortTree(tree);

  return tree;
};

// 新增角色
const showAddRoleDialog = () => {
  roleDialogTitle.value = '新增角色';
  resetRoleForm();
  roleDialogVisible.value = true;
};

// 编辑角色
const handleEditRole = (row) => {
  roleDialogTitle.value = '编辑角色';
  resetRoleForm();
  
  // 填充表单数据
  Object.keys(roleForm).forEach(key => {
    if (key in row) {
      roleForm[key] = row[key];
    }
  });
  
  roleDialogVisible.value = true;
};

// 切换角色状态
const handleToggleRoleStatus = (row) => {
  const statusText = row.status === 1 ? '禁用' : '启用';
  const newStatus = row.status === 1 ? 0 : 1;
  
  ElMessageBox.confirm(
    `确认要${statusText}该角色吗？`, 
    '提示', 
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await api.put(`/system/roles/${row.id}/status`, { status: newStatus });
      ElMessage.success(`${statusText}成功`);
      loadRoles();
    } catch (error) {
      console.error(`${statusText}失败:`, error);
      ElMessage.error(`${statusText}失败`);
    }
  }).catch(() => {});
};

// 分配权限
const handleRolePermission = async (row) => {
  try {
    console.log('开始分配权限，角色:', row);
    currentRole.value = row;
    
    // 先加载菜单数据
    console.log('加载菜单数据...');
    await loadMenus();
    
    if (!menuList.value || menuList.value.length === 0) {
      console.error('菜单数据为空');
      ElMessage.error('无法加载菜单数据');
      return;
    }
    
    // 显示对话框
    permissionDialogVisible.value = true;
    
    // 获取角色权限
    console.log('获取角色权限...');
    const response = await api.get(`/system/roles/${row.id}/permissions`);
    console.log('角色权限响应:', response);
    
    if (!response || !response.data) {
      console.error('角色权限响应无效:', response);
      ElMessage.error('获取角色权限失败：响应数据无效');
      return;
    }
    
    // 设置选中的菜单ID
    selectedMenuIds.value = Array.isArray(response.data) ? response.data : [];
    console.log('已选择的菜单权限:', selectedMenuIds.value);
    
    // 确保树形组件更新选中状态
    if (permissionTreeRef.value) {
      console.log('更新树形组件选中状态');
      permissionTreeRef.value.setCheckedKeys(selectedMenuIds.value);
    } else {
      console.error('树形组件引用未找到');
    }
  } catch (error) {
    console.error('获取角色权限失败:', error);
    if (error.response?.status === 401) {
      ElMessage.error('请先登录');
    } else {
      ElMessage.error('获取角色权限失败：' + (error.response?.data?.message || error.message));
    }
  }
};

// 保存角色
const saveRole = async () => {
  if (!roleFormRef.value) return;
  
  await roleFormRef.value.validate(async (valid) => {
    if (valid) {
      roleSaveLoading.value = true;
      try {
        if (roleForm.id) {
          // 更新
          await api.put(`/system/roles/${roleForm.id}`, roleForm);
          ElMessage.success('更新成功');
        } else {
          // 新增
          await api.post('/system/roles', roleForm);
          ElMessage.success('添加成功');
        }
        roleDialogVisible.value = false;
        loadRoles();
      } catch (error) {
        console.error('保存角色失败:', error);
        ElMessage.error('保存角色失败');
      } finally {
        roleSaveLoading.value = false;
      }
    }
  });
};

// 保存角色权限
const saveRolePermission = async () => {
  permissionSaveLoading.value = true;
  try {
    const checkedKeys = permissionTreeRef.value.getCheckedKeys();
    const halfCheckedKeys = permissionTreeRef.value.getHalfCheckedKeys();
    const menuIds = [...checkedKeys, ...halfCheckedKeys];
    
    console.log('选中的菜单ID:', checkedKeys);
    console.log('半选中的菜单ID:', halfCheckedKeys);
    console.log('所有菜单ID:', menuIds);
    console.log('当前角色:', currentRole.value);
    
    const response = await api.put(`/system/roles/${currentRole.value.id}/permissions`, { menuIds });
    console.log('保存权限响应:', response);
    
    ElMessage.success('权限分配成功');
    permissionDialogVisible.value = false;
  } catch (error) {
    console.error('保存角色权限失败:', error);
    console.error('错误详情:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    ElMessage.error('保存角色权限失败: ' + (error.response?.data?.message || error.message));
  } finally {
    permissionSaveLoading.value = false;
  }
};

// 新增菜单
const showAddMenuDialog = () => {
  menuDialogTitle.value = '新增菜单';
  resetMenuForm();
  menuForm.parentId = 0; // 默认顶级菜单
  menuDialogVisible.value = true;
};

// 添加子菜单
const handleAddChildMenu = (row) => {
  menuDialogTitle.value = '新增子菜单';
  resetMenuForm();
  menuForm.parentId = row.id;
  
  // 如果父级是目录，则子级默认为菜单
  if (row.type === 0) {
    menuForm.type = 1;
  }
  // 如果父级是菜单，则子级默认为按钮
  else if (row.type === 1) {
    menuForm.type = 2;
  }
  
  menuDialogVisible.value = true;
};

// 编辑菜单
const handleEditMenu = (row) => {
  menuDialogTitle.value = '编辑菜单';
  resetMenuForm();
  
  // 填充表单数据
  Object.keys(menuForm).forEach(key => {
    if (key in row) {
      menuForm[key] = row[key];
    }
  });
  
  menuDialogVisible.value = true;
};

// 删除菜单
const handleDeleteMenu = (row) => {
  ElMessageBox.confirm(
    '确认要删除该菜单吗？删除后不可恢复！', 
    '警告', 
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await api.delete(`/system/menus/${row.id}`);
      ElMessage.success('删除成功');
      loadMenus(); // 重新加载菜单数据
    } catch (error) {
      console.error('删除失败:', error);
      ElMessage.error('删除失败: ' + error.message);
    }
  }).catch(() => {});
};

// 保存菜单
const saveMenu = async () => {
  if (!menuFormRef.value) return;
  
  await menuFormRef.value.validate(async (valid) => {
    if (valid) {
      menuSaveLoading.value = true;
      try {
        if (menuForm.id) {
          // 更新
          await api.put(`/system/menus/${menuForm.id}`, menuForm);
          ElMessage.success('更新成功');
        } else {
          // 新增
          const response = await api.post('/system/menus', menuForm);
          ElMessage.success('添加成功');
          // 如果API返回了新创建的菜单ID，更新表单
          if (response.data && response.data.id) {
            menuForm.id = response.data.id;
          }
        }
        menuDialogVisible.value = false;
        loadMenus(); // 重新加载菜单数据
      } catch (error) {
        console.error('保存菜单失败:', error);
        ElMessage.error('保存菜单失败: ' + error.message);
      } finally {
        menuSaveLoading.value = false;
      }
    }
  });
};

// 重置角色表单
const resetRoleForm = () => {
  roleForm.id = null;
  roleForm.name = '';
  roleForm.code = '';
  roleForm.description = '';
  roleForm.status = 1;
  
  // 清除校验
  if (roleFormRef.value) {
    roleFormRef.value.resetFields();
  }
};

// 重置菜单表单
const resetMenuForm = () => {
  menuForm.id = null;
  menuForm.parentId = null;
  menuForm.name = '';
  menuForm.path = '';
  menuForm.component = '';
  menuForm.permission = '';
  menuForm.type = 1;
  menuForm.icon = '';
  menuForm.sort = 0;
  menuForm.status = 1;
  
  // 清除校验
  if (menuFormRef.value) {
    menuFormRef.value.resetFields();
  }
};

// 导入菜单数据
const importMenuData = async () => {
  ElMessageBox.confirm(
    '确认要导入完整的菜单数据吗？这将覆盖现有的菜单配置。',
    '确认导入',
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await api.post('/system/menus/import', { menus: menuPermissions });
      ElMessage.success('菜单数据导入成功');
      loadMenus(); // 重新加载菜单数据
    } catch (error) {
      console.error('导入菜单数据失败:', error);
      ElMessage.error('导入菜单数据失败: ' + error.message);
    }
  }).catch(() => {});
};

// 页面加载时执行
onMounted(() => {
  loadRoles();
  loadMenus();
});
</script>

<style scoped>
.permissions-container {
  padding: 10px;
  height: 100%;
}

.role-header, .menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.current-role {
  margin-bottom: 20px;
  font-size: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.menu-header h3 {
  margin: 0;
}

.menu-header div {
  display: flex;
  gap: 10px;
}

.menu-icon {
  margin-right: 5px;
}
</style> 