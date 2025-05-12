<template>
  <div class="users-container">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="showAddDialog">新增用户</el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="用户名">
          <el-input v-model="searchForm.username" placeholder="输入用户名" clearable></el-input>
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="searchForm.name" placeholder="输入姓名" clearable></el-input>
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="searchForm.departmentId" placeholder="选择部门" clearable style="width: 180px">
            <el-option
              v-for="dept in departmentOptions"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="选择状态" clearable style="width: 120px">
            <el-option label="启用" :value="1"></el-option>
            <el-option label="禁用" :value="0"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchUsers">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 表格区域 -->
    <el-card class="data-card">
      <el-table
        :data="userList"
        style="width: 100%"
        border
        v-loading="loading"
      >
        <el-table-column prop="username" label="用户名" width="150"></el-table-column>
        <el-table-column prop="name" label="姓名" width="120"></el-table-column>
        <el-table-column prop="email" label="邮箱" width="200"></el-table-column>
        <el-table-column prop="phone" label="手机号" width="150"></el-table-column>
        <el-table-column prop="departmentName" label="所属部门" width="150"></el-table-column>
        <el-table-column prop="roleNames" label="角色" width="150"></el-table-column>
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
            <el-button type="primary" size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button
              :type="scope.row.status === 1 ? 'danger' : 'success'"
              size="small"
              @click="handleToggleStatus(scope.row)"
            >
              {{ scope.row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button type="warning" size="small" @click="handleResetPassword(scope.row)">重置密码</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        >
        </el-pagination>
      </div>
    </el-card>
    
    <!-- 添加/编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" :disabled="userForm.id"></el-input>
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="userForm.name" placeholder="请输入姓名"></el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="请输入邮箱"></el-input>
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" placeholder="请输入手机号"></el-input>
        </el-form-item>
        <el-form-item v-if="!userForm.id" label="密码" prop="password">
          <el-input v-model="userForm.password" placeholder="请输入密码" type="password"></el-input>
        </el-form-item>
        <el-form-item label="部门" prop="departmentId">
          <el-select v-model="userForm.departmentId" placeholder="请选择部门" style="width: 100%">
            <el-option
              v-for="dept in departmentOptions"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="roleIds">
          <el-select v-model="userForm.roleIds" placeholder="请选择角色" multiple style="width: 100%">
            <el-option
              v-for="role in roleOptions"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="userForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveUser" :loading="saveLoading">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '../../services/api';

// 数据加载状态
const loading = ref(false);
const saveLoading = ref(false);

// 分页相关
const total = ref(0);
const pageSize = ref(10);
const currentPage = ref(1);

// 表单相关
const dialogVisible = ref(false);
const dialogTitle = ref('新增用户');
const userFormRef = ref(null);

// 数据列表
const userList = ref([]);
const departmentOptions = ref([]);
const roleOptions = ref([]);

// 搜索表单
const searchForm = reactive({
  username: '',
  name: '',
  departmentId: '',
  status: ''
});

// 用户表单
const userForm = reactive({
  id: null,
  username: '',
  name: '',
  password: '',
  email: '',
  phone: '',
  departmentId: null,
  roleIds: [],
  status: 1
});

// 表单验证规则
const userRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在3到20个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在6到20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
  departmentId: [
    { required: true, message: '请选择部门', trigger: 'change' }
  ],
  roleIds: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
};

// 加载用户列表
const loadUsers = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      username: searchForm.username,
      name: searchForm.name,
      departmentId: searchForm.departmentId,
      status: searchForm.status
    };
    
    const response = await api.get(`/system/users`, { params });
    userList.value = response.data.data;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载用户列表失败:', error);
    ElMessage.error('加载用户列表失败');
  } finally {
    loading.value = false;
  }
};

// 加载部门选项
const loadDepartmentOptions = async () => {
  try {
    const response = await api.get(`/system/departments/list`);
    console.log('Department options response:', response.data);
    
    // Handle different response formats
    if (response.data && Array.isArray(response.data)) {
      departmentOptions.value = response.data;
    } else if (response.data && Array.isArray(response.data.data)) {
      departmentOptions.value = response.data.data;
    } else {
      console.error('Unexpected department data format:', response.data);
      departmentOptions.value = [];
    }
  } catch (error) {
    console.error('加载部门列表失败:', error);
    departmentOptions.value = []; // Ensure it's an empty array on error
    ElMessage.error('加载部门列表失败: ' + (error.response?.data?.message || error.message));
  }
};

// 加载角色选项
const loadRoleOptions = async () => {
  try {
    const response = await api.get(`/system/roles/list`);
    console.log('Role options response:', response.data);
    
    // Handle different response formats
    if (response.data && Array.isArray(response.data)) {
      roleOptions.value = response.data;
    } else if (response.data && Array.isArray(response.data.data)) {
      roleOptions.value = response.data.data;
    } else {
      console.error('Unexpected role data format:', response.data);
      roleOptions.value = [];
    }
  } catch (error) {
    console.error('加载角色列表失败:', error);
    roleOptions.value = []; // Ensure it's an empty array on error
    ElMessage.error('加载角色列表失败: ' + (error.response?.data?.message || error.message));
  }
};

// 搜索用户
const searchUsers = () => {
  currentPage.value = 1;
  loadUsers();
};

// 重置搜索条件
const resetSearch = () => {
  searchForm.username = '';
  searchForm.name = '';
  searchForm.departmentId = '';
  searchForm.status = '';
  searchUsers();
};

// 新增用户
const showAddDialog = () => {
  dialogTitle.value = '新增用户';
  resetUserForm();
  dialogVisible.value = true;
};

// 编辑用户
const handleEdit = async (row) => {
  dialogTitle.value = '编辑用户';
  resetUserForm();
  
  try {
    const response = await api.get(`/system/users/${row.id}`);
    const user = response.data.data;
    
    if (!user) {
      throw new Error('无法获取用户数据');
    }
    
    // 填充表单数据
    userForm.id = user.id;
    userForm.username = user.username;
    userForm.name = user.name || '';
    userForm.email = user.email || '';
    userForm.phone = user.phone || '';
    userForm.departmentId = user.department_id || null;
    userForm.roleIds = user.roles && Array.isArray(user.roles) ? user.roles.map(role => role.id) : [];
    userForm.status = user.status === undefined ? 1 : user.status;
    
    dialogVisible.value = true;
  } catch (error) {
    console.error('获取用户详情失败:', error);
    ElMessage.error('获取用户详情失败: ' + (error.message || '未知错误'));
  }
};

// 切换用户状态
const handleToggleStatus = (row) => {
  const statusText = row.status === 1 ? '禁用' : '启用';
  const newStatus = row.status === 1 ? 0 : 1;
  
  ElMessageBox.confirm(
    `确认要${statusText}该用户吗？`, 
    '提示', 
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await api.put(`/system/users/${row.id}/status`, { status: newStatus });
      ElMessage.success(`${statusText}成功`);
      loadUsers();
    } catch (error) {
      console.error(`${statusText}失败:`, error);
      ElMessage.error(`${statusText}失败`);
    }
  }).catch(() => {});
};

// 重置密码
const handleResetPassword = (row) => {
  ElMessageBox.prompt(
    '请输入新密码', 
    '重置密码', 
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputType: 'password',
      inputValidator: (value) => {
        if (!value) {
          return '密码不能为空';
        }
        if (value.length < 6) {
          return '密码长度不能小于6位';
        }
        return true;
      }
    }
  ).then(async ({ value }) => {
    try {
      await api.put(`/system/users/${row.id}/reset-password`, { password: value });
      ElMessage.success('密码重置成功');
    } catch (error) {
      console.error('密码重置失败:', error);
      ElMessage.error('密码重置失败');
    }
  }).catch(() => {});
};

// 保存用户
const saveUser = async () => {
  if (!userFormRef.value) return;
  
  await userFormRef.value.validate(async (valid) => {
    if (valid) {
      saveLoading.value = true;
      try {
        if (userForm.id) {
          // 更新
          await api.put(`/system/users/${userForm.id}`, userForm);
          ElMessage.success('更新成功');
        } else {
          // 新增
          await api.post(`/system/users`, userForm);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        loadUsers();
      } catch (error) {
        console.error('保存用户失败:', error);
        ElMessage.error('保存用户失败');
      } finally {
        saveLoading.value = false;
      }
    }
  });
};

// 重置用户表单
const resetUserForm = () => {
  userForm.id = null;
  userForm.username = '';
  userForm.name = '';
  userForm.password = '';
  userForm.email = '';
  userForm.phone = '';
  userForm.departmentId = null;
  userForm.roleIds = [];
  userForm.status = 1;
  
  // 清除校验
  if (userFormRef.value) {
    userFormRef.value.resetFields();
  }
};

// 分页相关方法
const handleSizeChange = (size) => {
  pageSize.value = size;
  loadUsers();
};

const handleCurrentChange = (page) => {
  currentPage.value = page;
  loadUsers();
};

// 页面加载时执行
onMounted(() => {
  loadUsers();
  loadDepartmentOptions();
  loadRoleOptions();
});
</script>

<style scoped>
.users-container {
  padding: 10px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-card {
  margin-bottom: 20px;
}

.data-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style> 