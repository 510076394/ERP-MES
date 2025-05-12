<template>
  <div class="customers-container">
    <div class="page-header">
      <h2>客户管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon> 新增客户
      </el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="客户编码">
          <el-input v-model="searchForm.code" placeholder="请输入客户编码" clearable></el-input>
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input v-model="searchForm.name" placeholder="请输入客户名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option :value="'active'" label="启用"></el-option>
            <el-option :value="'inactive'" label="禁用"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><Refresh /></el-icon> 重置
          </el-button>
          <el-button type="success" @click="handleExport">
            <el-icon><Download /></el-icon> 导出
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.total || 0 }}</div>
        <div class="stat-label">客户总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.active || 0 }}</div>
        <div class="stat-label">启用状态</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.inactive || 0 }}</div>
        <div class="stat-label">禁用状态</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.totalCredit || 0 }} 元</div>
        <div class="stat-label">总信用额度</div>
      </el-card>
    </div>

    <!-- 表格区域 -->
    <el-card class="data-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        style="width: 100%"
        :max-height="tableHeight"
      >
        <el-table-column prop="name" label="客户名称" min-width="200">
          <template #default="scope">
            <el-tooltip :content="scope.row.name" placement="top" :show-after="500">
              <span class="ellipsis-cell">{{ scope.row.name }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="contact_person" label="联系人" width="120"></el-table-column>
        <el-table-column prop="contact_phone" label="联系电话" width="120"></el-table-column>
        <el-table-column prop="email" label="电子邮箱" min-width="180">
          <template #default="scope">
            <el-tooltip :content="scope.row.email" placement="top" :show-after="500">
              <span class="ellipsis-cell">{{ scope.row.email }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'active' ? 'success' : 'danger'">
              {{ scope.row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="credit_limit" label="信用额度" width="100"></el-table-column>
        <el-table-column prop="address" label="地址" min-width="200">
          <template #default="scope">
            <el-tooltip :content="scope.row.address" placement="top" :show-after="500">
              <span class="ellipsis-cell">{{ scope.row.address }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150">
          <template #default="scope">
            <el-tooltip :content="scope.row.remark" placement="top" :show-after="500">
              <span class="ellipsis-cell">{{ scope.row.remark }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handleEdit(scope.row)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="600px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="客户名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入客户名称"></el-input>
        </el-form-item>
        <el-form-item label="联系人" prop="contact_person">
          <el-input v-model="form.contact_person" placeholder="请输入联系人"></el-input>
        </el-form-item>
        <el-form-item label="联系电话" prop="contact_phone">
          <el-input v-model="form.contact_phone" placeholder="请输入联系电话"></el-input>
        </el-form-item>
        <el-form-item label="电子邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入电子邮箱"></el-input>
        </el-form-item>
        <el-form-item label="信用额度" prop="credit_limit">
          <el-input-number v-model="form.credit_limit" :min="0" :precision="2" :step="100" placeholder="请输入信用额度"></el-input-number>
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" type="textarea" :rows="2" placeholder="请输入地址"></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { baseDataApi } from '@/services/api';
import { Plus, Edit, Delete, Search, Refresh, Download } from '@element-plus/icons-vue';

// 数据加载状态
const loading = ref(false);

// 表格数据
const tableData = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const tableHeight = ref('calc(100vh - 350px)');

// 统计数据
const stats = reactive({
  total: 0,
  active: 0,
  inactive: 0,
  totalCredit: 0
});

// 搜索表单
const searchForm = reactive({
  code: '',
  name: '',
  status: ''
});

// 新增/编辑表单
const formRef = ref(null);
const form = reactive({
  id: '',
  name: '',
  contact_person: '',
  contact_phone: '',
  email: '',
  address: '',
  credit_limit: 0,
  status: 'active',  // 使用字符串类型的status
  remark: ''
});

// 表单校验规则
const rules = {
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  contact_person: [{ message: '请输入联系人', trigger: 'blur' }],
  contact_phone: [{ message: '请输入联系电话', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }]
};

// 对话框控制
const dialogVisible = ref(false);
const dialogTitle = ref('新增客户');
const isEdit = ref(false);

// 初始化
onMounted(() => {
  fetchData();
});

// 导出数据
const handleExport = async () => {
  try {
    const response = await baseDataApi.exportCustomers({
      code: searchForm.code,
      name: searchForm.name,
      status: searchForm.status
    });
    // 处理文件下载
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '客户列表.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  }
};

// 计算统计数据
const calculateStats = () => {
  stats.total = tableData.value.length;
  stats.active = tableData.value.filter(item => item.status === 'active').length;
  stats.inactive = tableData.value.filter(item => item.status === 'inactive').length;
  
  // 计算总信用额度
  stats.totalCredit = tableData.value.reduce((total, customer) => {
    return total + (parseFloat(customer.credit_limit) || 0);
  }, 0).toFixed(2);
};

// 获取客户列表
const fetchData = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      ...searchForm
    };
    
    const response = await baseDataApi.getCustomers(params);
    tableData.value = response.data.list;
    total.value = response.data.total;
    
    // 计算统计数据
    calculateStats();
  } catch (error) {
    console.error('获取客户列表失败:', error);
    ElMessage.error('获取客户列表失败');
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  currentPage.value = 1;
  fetchData();
};

// 重置搜索
const resetSearch = () => {
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = '';
  });
  currentPage.value = 1;
  fetchData();
};

// 分页相关
const handleSizeChange = (val) => {
  pageSize.value = val;
  fetchData();
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  fetchData();
};

// 新增客户
const handleAdd = () => {
  dialogTitle.value = '新增客户';
  isEdit.value = false;
  resetForm();
  dialogVisible.value = true;
};

// 编辑客户
const handleEdit = (row) => {
  dialogTitle.value = '编辑客户';
  isEdit.value = true;
  resetForm();
  Object.assign(form, {
    ...row,
    credit_limit: parseFloat(row.credit_limit) || 0
  });
  dialogVisible.value = true;
};

// 删除客户
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该客户吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await baseDataApi.deleteCustomer(row.id);
      ElMessage.success('删除成功');
      fetchData();
    } catch (error) {
      console.error('删除客户失败:', error);
      ElMessage.error('删除客户失败');
    }
  }).catch(() => {});
};

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  
  Object.keys(form).forEach(key => {
    if (key === 'status') {
      form[key] = 'active';  // 使用字符串类型的status
    } else if (key === 'credit_limit') {
      form[key] = 0;
    } else {
      form[key] = '';
    }
  });
};

// 提交表单
const submitForm = () => {
  formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 确保表单数据格式正确
        const formData = {
          ...form,
          name: form.name.trim(),
          contact_person: form.contact_person ? form.contact_person.trim() : '',
          contact_phone: form.contact_phone ? form.contact_phone.trim() : '',
          email: form.email ? form.email.trim() : '',
          address: form.address ? form.address.trim() : '',
          credit_limit: parseFloat(form.credit_limit) || 0,
          remark: form.remark ? form.remark.trim() : ''
        };

        if (isEdit.value) {
          // 编辑
          await baseDataApi.updateCustomer(form.id, formData);
          ElMessage.success('编辑成功');
        } else {
          // 新增
          await baseDataApi.createCustomer(formData);
          ElMessage.success('新增成功');
        }
        dialogVisible.value = false;
        fetchData();
      } catch (error) {
        console.error('保存客户失败:', error);
        if (error.response && error.response.data && error.response.data.message) {
          ElMessage.error(`保存失败: ${error.response.data.message}`);
        } else {
          ElMessage.error('保存客户失败');
        }
      }
    }
  });
};
</script>

<style scoped>
.customers-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #303133;
}

.search-card {
  margin-bottom: 16px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
}

.statistics-row {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 15px;
}

.stat-card {
  flex: 0 0 180px;
  min-width: 150px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.data-card {
  margin-bottom: 20px;
  border-radius: 4px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.ellipsis-cell {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* 优化表格内容显示 */
:deep(.el-table .cell) {
  word-break: break-word;
  line-height: 1.5;
}
</style>