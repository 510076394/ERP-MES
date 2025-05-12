<template>
  <div class="suppliers-container">
    <div class="page-header">
      <h2>供应商管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon> 新增供应商
      </el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="供应商编码">
          <el-input v-model="searchForm.code" placeholder="请输入供应商编码" clearable></el-input>
        </el-form-item>
        <el-form-item label="供应商名称">
          <el-input v-model="searchForm.name" placeholder="请输入供应商名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option :value="1" label="启用"></el-option>
            <el-option :value="0" label="禁用"></el-option>
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
        <div class="stat-label">供应商总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.active || 0 }}</div>
        <div class="stat-label">启用状态</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.inactive || 0 }}</div>
        <div class="stat-label">禁用状态</div>
      </el-card>
    </div>

    <!-- 表格区域 -->
    <el-card class="data-card">
      <el-table
        v-loading="loading"
        :data="paginatedData"
        border
        style="width: 100%"
        :max-height="tableHeight"
      >
        <el-table-column prop="code" label="供应商编码" width="120">
          <template #default="scope">
            {{ scope.row.code || scope.row.supplier_code }}
          </template>
        </el-table-column>
        <el-table-column prop="name" label="供应商名称" min-width="200">
          <template #default="scope">
            <el-tooltip :content="scope.row.name || scope.row.supplier_name" placement="top" :show-after="500">
              <span class="ellipsis-cell">{{ scope.row.name || scope.row.supplier_name }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="contact_person" label="联系人" width="120">
          <template #default="scope">
            {{ scope.row.contact_person || scope.row.contact || scope.row.contactPerson || '无' }}
          </template>
        </el-table-column>
        <el-table-column prop="contact_phone" label="联系电话" width="120">
          <template #default="scope">
            {{ scope.row.contact_phone || scope.row.phone || scope.row.contactPhone || '无' }}
          </template>
        </el-table-column>
        <el-table-column prop="email" label="电子邮箱" min-width="180">
          <template #default="scope">
            <el-tooltip :content="scope.row.email || '无'" placement="top" :show-after="500">
              <span class="ellipsis-cell">{{ scope.row.email || '无' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="scope">
            <el-tag :type="(scope.row.status || scope.row.is_active) === 1 ? 'success' : 'danger'">
              {{ (scope.row.status || scope.row.is_active) === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="address" label="地址" min-width="200">
          <template #default="scope">
            <el-tooltip :content="scope.row.address || '无'" placement="top" :show-after="500">
              <span class="ellipsis-cell">{{ scope.row.address || '无' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150">
          <template #default="scope">
            <el-tooltip :content="scope.row.remark || scope.row.remarks" placement="top" :show-after="500">
              <span class="ellipsis-cell">{{ scope.row.remark || scope.row.remarks }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <div class="operation-buttons">
              <el-button size="small" type="primary" @click="handleEdit(scope.row)">
                <el-icon><Edit /></el-icon> 编辑
              </el-button>
              <el-button size="small" type="danger" @click="handleDelete(scope.row)">
                <el-icon><Delete /></el-icon> 删除
              </el-button>
            </div>
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
          :total="filteredTotal"
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
        <el-form-item label="供应商编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入供应商编码"></el-input>
        </el-form-item>
        <el-form-item label="供应商名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入供应商名称"></el-input>
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
        <el-form-item label="地址">
          <el-input v-model="form.address" type="textarea" :rows="2" placeholder="请输入地址"></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
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
  inactive: 0
});

// 搜索表单
const searchForm = reactive({
  code: '', // 对应后端的 supplierCode
  name: '', // 对应后端的 supplierName
  status: '' // 状态保持不变
});

// 新增/编辑表单
const formRef = ref(null);
const form = reactive({
  id: '',
  code: '',
  name: '',
  contact_person: '',
  contact_phone: '',
  email: '',
  address: '',
  status: 1,
  remark: ''
});

// 表单校验规则
const rules = {
  code: [{ required: true, message: '请输入供应商编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
  contact_person: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  contact_phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }]
};

// 对话框控制
const dialogVisible = ref(false);
const dialogTitle = ref('新增供应商');
const isEdit = ref(false);

// 初始化
onMounted(() => {
  fetchData();
});

// 导出数据
const handleExport = async () => {
  try {
    const response = await baseDataApi.exportSuppliers({
      code: searchForm.code,
      name: searchForm.name,
      status: searchForm.status
    });
    // 处理文件下载
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '供应商列表.xlsx');
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
  stats.active = tableData.value.filter(item => 
    (item.status !== undefined ? Number(item.status) : 
    (item.is_active !== undefined ? Number(item.is_active) : 0)) === 1
  ).length;
  stats.inactive = tableData.value.filter(item => 
    (item.status !== undefined ? Number(item.status) : 
    (item.is_active !== undefined ? Number(item.is_active) : 0)) === 0
  ).length;
};

// 获取供应商列表
const fetchData = async () => {
  loading.value = true;
  try {
    console.log('开始获取供应商数据');
    const response = await baseDataApi.getSuppliers();
    console.log('供应商API响应:', response);
    
    if (!response || !response.data) {
      console.error('API响应为空或无数据');
      ElMessage.error('获取供应商数据失败，响应为空');
      tableData.value = [];
      total.value = 0;
      return;
    }
    
    // 处理后端返回的数据格式（直接数组形式）
    if (Array.isArray(response.data)) {
      console.log('使用直接数组格式，记录数:', response.data.length);
      
      tableData.value = response.data;
      total.value = response.data.length;
    } 
    // 保留原有的处理逻辑以兼容可能的其他格式
    else if (response.data.list && Array.isArray(response.data.list)) {
      console.log('使用list格式，记录数:', response.data.list.length);
      tableData.value = response.data.list;
      total.value = response.data.total || response.data.list.length;
    } else if (response.data.data && Array.isArray(response.data.data)) {
      console.log('使用data格式，记录数:', response.data.data.length);
      tableData.value = response.data.data;
      total.value = response.data.pagination?.total || response.data.total || response.data.data.length;
    } else if (typeof response.data === 'object') {
      console.log('收到对象响应，尝试提取数据');
      
      // 尝试查找响应中的任何数组字段
      let foundArray = null;
      for (const key in response.data) {
        if (Array.isArray(response.data[key])) {
          console.log(`在字段"${key}"中找到数组`, response.data[key]);
          foundArray = response.data[key];
          break;
        }
      }
      
      if (foundArray) {
        tableData.value = foundArray;
        total.value = foundArray.length;
      } else {
        // 最后尝试，将整个对象作为单个记录
        console.log('未找到数组，将整个对象作为单条记录处理');
        tableData.value = [response.data];
        total.value = 1;
      }
    } else {
      console.error('未知的响应数据格式', response.data);
      tableData.value = [];
      total.value = 0;
    }
    
    console.log('最终表格数据:', tableData.value);
    console.log('数据长度:', tableData.value.length);
    
    // 在这里初始化分页
    currentPage.value = 1;
    
    // 计算统计数据
    calculateStats();
    
  } catch (error) {
    console.error('获取供应商列表失败:', error);
    if (error.response) {
      console.error('错误响应:', error.response.status, error.response.data);
    }
    ElMessage.error('获取供应商列表失败');
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

// 添加一个新的计算属性，用于过滤和分页
const filteredData = computed(() => {
  if (!tableData.value || tableData.value.length === 0) return [];
  
  console.log('开始本地过滤，条件:', searchForm);
  
  return tableData.value.filter(item => {
    // 记录过滤前各字段值
    const codeValue = item.code?.toString() || item.supplier_code?.toString() || '';
    const nameValue = item.name?.toString() || item.supplier_name?.toString() || '';
    const statusValue = item.status !== undefined ? Number(item.status) : 
                       (item.is_active !== undefined ? Number(item.is_active) : -1);
    
    // 按编码过滤
    if (searchForm.code && 
        !codeValue.toLowerCase().includes(searchForm.code.toLowerCase())) {
      return false;
    }
    
    // 按名称过滤
    if (searchForm.name && 
        !nameValue.toLowerCase().includes(searchForm.name.toLowerCase())) {
      return false;
    }
    
    // 按状态过滤
    if (searchForm.status !== '' && statusValue !== Number(searchForm.status)) {
      return false;
    }
    
    return true;
  });
});

// 更新计算属性，使用过滤后的数据进行分页
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredData.value.slice(start, end);
});

// 更新总数计算
const filteredTotal = computed(() => {
  return filteredData.value.length;
});

// 搜索
const handleSearch = () => {
  // 在本地过滤数据，不重新请求
  console.log('执行本地搜索，条件:', searchForm);
  
  // 重置到第一页
  currentPage.value = 1;
};

// 重置搜索
const resetSearch = () => {
  searchForm.code = '';
  searchForm.name = '';
  searchForm.status = '';
  
  // 重置到第一页
  currentPage.value = 1;
  
  // 重新获取所有数据
  fetchData();
};

// 分页相关
const handleSizeChange = (val) => {
  console.log('改变每页显示数量:', val);
  pageSize.value = val;
  // 不重新请求数据，使用本地分页
};

const handleCurrentChange = (val) => {
  console.log('切换到页码:', val);
  currentPage.value = val;
  // 不重新请求数据，使用本地分页
};

// 新增供应商
const handleAdd = () => {
  dialogTitle.value = '新增供应商';
  isEdit.value = false;
  resetForm();
  dialogVisible.value = true;
};

// 编辑供应商
const handleEdit = (row) => {
  dialogTitle.value = '编辑供应商';
  isEdit.value = true;
  resetForm();
  Object.assign(form, row);
  dialogVisible.value = true;
};

// 删除供应商
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该供应商吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await baseDataApi.deleteSupplier(row.id);
      ElMessage.success('删除成功');
      fetchData();
    } catch (error) {
      console.error('删除供应商失败:', error);
      ElMessage.error('删除供应商失败');
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
      form[key] = 1;
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
        // 过滤掉时间戳字段
        const submitData = { ...form };
        delete submitData.created_at;
        delete submitData.updated_at;
        
        // 添加字段映射，确保字段名称正确
        if (!submitData.supplier_code && submitData.code) {
          submitData.supplier_code = submitData.code;
        }
        if (!submitData.supplier_name && submitData.name) {
          submitData.supplier_name = submitData.name;
        }
        if (!submitData.contact && submitData.contact_person) {
          submitData.contact = submitData.contact_person;
        }
        if (!submitData.phone && submitData.contact_phone) {
          submitData.phone = submitData.contact_phone;
        }
        if (!submitData.remarks && submitData.remark) {
          submitData.remarks = submitData.remark;
        }
        
        console.log('提交供应商数据:', submitData);
        
        if (isEdit.value) {
          // 编辑
          await baseDataApi.updateSupplier(form.id, submitData);
          ElMessage.success('编辑成功');
        } else {
          // 新增
          await baseDataApi.createSupplier(submitData);
          ElMessage.success('新增成功');
        }
        dialogVisible.value = false;
        fetchData();
      } catch (error) {
        console.error('保存供应商失败:', error);
        // 增加更详细的错误信息
        if (error.response) {
          ElMessage.error(`保存供应商失败: ${error.response.data?.message || error.message}`);
        } else {
          ElMessage.error(`保存供应商失败: ${error.message}`);
        }
      }
    }
  });
};
</script>

<style scoped>
.suppliers-container {
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