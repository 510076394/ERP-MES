<template>
  <div class="departments-container">
    <div class="page-header">
      <h2>部门管理</h2>
      <el-button type="primary" @click="showAddDialog">新增部门</el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="部门名称">
          <el-input v-model="searchForm.name" placeholder="输入部门名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="选择状态" clearable style="width: 120px">
            <el-option label="启用" :value="1"></el-option>
            <el-option label="禁用" :value="0"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchDepartments">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 表格区域 -->
    <el-card class="data-card">
      <el-table
        :data="departmentList"
        style="width: 100%"
        border
        row-key="id"
        default-expand-all
        :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
        v-loading="loading"
        empty-text="暂无数据"
      >
        <el-table-column prop="name" label="部门名称" width="250"></el-table-column>
        <el-table-column prop="code" label="部门编码" width="150"></el-table-column>
        <el-table-column prop="manager" label="负责人" width="120"></el-table-column>
        <el-table-column prop="phone" label="联系电话" width="150"></el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row && scope.row.status === 1 ? 'success' : 'danger'">
              {{ scope.row && scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="scope">
            {{ scope.row && scope.row.created_at ? new Date(scope.row.created_at).toLocaleString() : '' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="success" size="small" @click="handleAddChild(scope.row)">添加子部门</el-button>
            <el-button
              :type="scope.row && scope.row.status === 1 ? 'danger' : 'success'"
              size="small"
              @click="handleToggleStatus(scope.row)"
            >
              {{ scope.row && scope.row.status === 1 ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 添加/编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="departmentForm" :rules="departmentRules" ref="departmentFormRef" label-width="100px">
        <el-form-item label="上级部门">
          <el-tree-select
            v-model="departmentForm.parent_id"
            :data="departmentTree"
            check-strictly
            default-expand-all
            node-key="id"
            :render-after-expand="false"
            :props="{ label: 'name', children: 'children' }"
            placeholder="请选择上级部门"
            style="width: 100%"
          ></el-tree-select>
        </el-form-item>
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="departmentForm.name" placeholder="请输入部门名称"></el-input>
        </el-form-item>
        <el-form-item label="部门编码" prop="code">
          <el-input v-model="departmentForm.code" placeholder="请输入部门编码"></el-input>
        </el-form-item>
        <el-form-item label="负责人" prop="manager">
          <el-input v-model="departmentForm.manager" placeholder="请输入负责人"></el-input>
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="departmentForm.phone" placeholder="请输入联系电话"></el-input>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="departmentForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="departmentForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveDepartment" :loading="saveLoading">确认</el-button>
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

// 表单相关
const dialogVisible = ref(false);
const dialogTitle = ref('新增部门');
const departmentFormRef = ref(null);

// 数据列表
const departmentList = ref([]);
const departmentTree = ref([]);

// 搜索表单
const searchForm = reactive({
  name: '',
  status: ''
});

// 部门表单
const departmentForm = reactive({
  id: null,
  parent_id: null,
  name: '',
  code: '',
  manager: '',
  phone: '',
  status: 1,
  remark: ''
});

// 表单验证规则
const departmentRules = {
  name: [
    { required: true, message: '请输入部门名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入部门编码', trigger: 'blur' }
  ]
};

// 加载部门树结构
const loadDepartments = async () => {
  loading.value = true;
  try {
    const params = {
      name: searchForm.name,
      status: searchForm.status
    };
    
    console.log('Fetching departments with params:', params);
    const response = await api.get('/system/departments', { params });
    
    // 确保我们处理的是数组数据
    let responseData = response.data;
    console.log('Department response:', responseData);
    
    // 处理不同的响应数据格式
    if (Array.isArray(responseData)) {
      departmentList.value = responseData;
    } else if (responseData && responseData.data && Array.isArray(responseData.data)) {
      // 如果数据在data字段中
      departmentList.value = responseData.data;
    } else if (responseData && responseData.list && Array.isArray(responseData.list)) {
      // 如果数据在list字段中
      departmentList.value = responseData.list;
    } else {
      console.error('Expected array but got:', typeof responseData, responseData);
      departmentList.value = []; // 确保是空数组而不是null或undefined
    }
    
    console.log('Set departmentList:', departmentList.value);
    
    // 构建部门树，添加一个虚拟的根节点，确保children总是数组
    departmentTree.value = [
      {
        id: 0,
        name: '顶级部门',
        children: Array.isArray(departmentList.value) ? JSON.parse(JSON.stringify(departmentList.value)) : []
      }
    ];
    
    console.log('Set departmentTree:', departmentTree.value);
  } catch (error) {
    console.error('加载部门列表失败:', error);
    departmentList.value = []; // 确保错误时也是空数组
    departmentTree.value = [{ id: 0, name: '顶级部门', children: [] }];
    ElMessage.error(`加载部门列表失败: ${error.response?.data?.message || error.message}`);
  } finally {
    loading.value = false;
  }
};

// 搜索部门
const searchDepartments = () => {
  loadDepartments();
};

// 重置搜索条件
const resetSearch = () => {
  searchForm.name = '';
  searchForm.status = '';
  searchDepartments();
};

// 新增部门
const showAddDialog = () => {
  dialogTitle.value = '新增部门';
  resetDepartmentForm();
  departmentForm.parent_id = 0; // 默认顶级部门
  dialogVisible.value = true;
};

// 添加子部门
const handleAddChild = (row) => {
  dialogTitle.value = '新增子部门';
  resetDepartmentForm();
  departmentForm.parent_id = row.id;
  dialogVisible.value = true;
};

// 编辑部门
const handleEdit = (row) => {
  dialogTitle.value = '编辑部门';
  resetDepartmentForm();
  
  // 填充表单数据
  departmentForm.id = row.id;
  departmentForm.parent_id = row.parent_id;
  departmentForm.name = row.name;
  departmentForm.code = row.code;
  departmentForm.manager = row.manager;
  departmentForm.phone = row.phone;
  departmentForm.status = row.status;
  departmentForm.remark = row.remark;
  
  dialogVisible.value = true;
};

// 切换部门状态
const handleToggleStatus = (row) => {
  const statusText = row.status === 1 ? '禁用' : '启用';
  const newStatus = row.status === 1 ? 0 : 1;
  
  ElMessageBox.confirm(
    `确认要${statusText}该部门吗？`, 
    '提示', 
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await api.put(`/system/departments/${row.id}/status`, { status: newStatus });
      ElMessage.success(`${statusText}成功`);
      loadDepartments();
    } catch (error) {
      console.error(`${statusText}失败:`, error);
      ElMessage.error(`${statusText}失败`);
    }
  }).catch(() => {});
};

// 保存部门
const saveDepartment = async () => {
  if (!departmentFormRef.value) return;
  
  await departmentFormRef.value.validate(async (valid) => {
    if (valid) {
      saveLoading.value = true;
      try {
        if (departmentForm.id) {
          // 更新
          await api.put(`/system/departments/${departmentForm.id}`, departmentForm);
          ElMessage.success('更新成功');
        } else {
          // 新增
          await api.post('/system/departments', departmentForm);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        loadDepartments();
      } catch (error) {
        console.error('保存部门失败:', error);
        ElMessage.error('保存部门失败');
      } finally {
        saveLoading.value = false;
      }
    }
  });
};

// 重置部门表单
const resetDepartmentForm = () => {
  departmentForm.id = null;
  departmentForm.parent_id = null;
  departmentForm.name = '';
  departmentForm.code = '';
  departmentForm.manager = '';
  departmentForm.phone = '';
  departmentForm.status = 1;
  departmentForm.remark = '';
  
  // 清除校验
  if (departmentFormRef.value) {
    departmentFormRef.value.resetFields();
  }
};

// 页面加载时执行
onMounted(() => {
  loadDepartments();
});
</script>

<style scoped>
.departments-container {
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style> 