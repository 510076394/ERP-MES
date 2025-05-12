<template>
  <div class="locations-container">
    <div class="page-header">
      <h2>库位管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon> 新增库位
      </el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="库位名称">
          <el-input v-model="searchForm.name" placeholder="请输入库位名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="库位编码">
          <el-input v-model="searchForm.code" placeholder="请输入库位编码" clearable></el-input>
        </el-form-item>
        <el-form-item label="库位类型">
          <el-select v-model="searchForm.type" placeholder="请选择库位类型" clearable>
            <el-option
              v-for="item in locationTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
          </el-select>
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
        <div class="stat-label">库位总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.active || 0 }}</div>
        <div class="stat-label">启用状态</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.inactive || 0 }}</div>
        <div class="stat-label">禁用状态</div>
      </el-card>
      <el-card class="stat-card" shadow="hover" v-for="(count, type) in stats.types" :key="type">
        <div class="stat-value">{{ count }}</div>
        <div class="stat-label">{{ getLocationTypeLabel(type) }}</div>
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
        <el-table-column prop="name" label="库位名称" width="180"></el-table-column>
        <el-table-column prop="code" label="库位编码" width="150"></el-table-column>
        <el-table-column prop="type" label="库位类型" width="120">
          <template #default="scope">
            <el-tag>{{ getLocationTypeLabel(scope.row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="area" label="区域" width="120"></el-table-column>
        <el-table-column prop="address" label="地址"></el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="Number(scope.row.status) === 1 ? 'success' : 'danger'">
              {{ Number(scope.row.status) === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注"></el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
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
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="500px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="库位名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入库位名称"></el-input>
        </el-form-item>
        <el-form-item label="库位编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入库位编码"></el-input>
        </el-form-item>
        <el-form-item label="库位类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择库位类型" style="width: 100%">
            <el-option
              v-for="item in locationTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="区域">
          <el-input v-model="form.area" placeholder="请输入区域"></el-input>
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="请输入地址"></el-input>
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
const tableHeight = ref('calc(100vh - 300px)');
const pagination = reactive({
  current: 1,
  size: 10,
  total: 0
});

// 统计数据
const stats = reactive({
  total: 0,
  active: 0,
  inactive: 0,
  types: {}
});

// 新增/编辑表单
const formRef = ref(null);
const form = reactive({
  id: '',
  name: '',
  code: '',
  type: '',
  area: '',
  address: '',
  status: 1,
  remark: ''
});

// 搜索表单
const searchForm = reactive({
  name: '',
  code: '',
  type: '',
  status: ''
});

// 表单校验规则
const rules = {
  name: [{ required: true, message: '请输入库位名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入库位编码', trigger: 'blur' }],
  type: [{ required: true, message: '请选择库位类型', trigger: 'change' }]
};

// 对话框控制
const dialogVisible = ref(false);
const dialogTitle = ref('新增库位');
const isEdit = ref(false);

// 库位类型选项
const locationTypes = [
  { value: 'warehouse', label: '仓库' },
  { value: 'production', label: '生产区' },
  { value: 'staging', label: '暂存区' },
  { value: 'shipping', label: '发货区' },
  { value: 'receiving', label: '收货区' },
  { value: 'quality', label: '质检区' },
  { value: 'return', label: '退货区' },
  { value: 'other', label: '其他' },
];

// 初始化
onMounted(() => {
  fetchData();
});

// 导出数据
const handleExport = async () => {
  try {
    const response = await baseDataApi.exportLocations({
      name: searchForm.name,
      code: searchForm.code,
      type: searchForm.type,
      status: searchForm.status
    });
    // 处理文件下载
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '库位列表.xlsx');
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
  stats.active = tableData.value.filter(item => Number(item.status) === 1).length;
  stats.inactive = tableData.value.filter(item => Number(item.status) === 0).length;
  
  // 计算不同类型的数量
  const typeCount = {};
  tableData.value.forEach(item => {
    if (!typeCount[item.type]) {
      typeCount[item.type] = 0;
    }
    typeCount[item.type]++;
  });
  
  stats.types = typeCount;
};

// 搜索
const handleSearch = () => {
  pagination.current = 1;
  fetchData();
};

// 重置搜索
const resetSearch = () => {
  searchForm.name = '';
  searchForm.code = '';
  searchForm.type = '';
  searchForm.status = '';
  pagination.current = 1;
  fetchData();
};

// 获取库位列表
const fetchData = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.current,
      limit: pagination.size,
      name: searchForm.name,
      code: searchForm.code,
      type: searchForm.type,
      status: searchForm.status
    };
    
    const response = await baseDataApi.getLocations(params);
    
    // 统一处理后端返回的不同数据格式
    if (response.data.list) {
      // 处理返回 { list: [...], total: 100 } 格式的数据
      tableData.value = response.data.list;
      pagination.total = response.data.total;
    } else if (response.data.data) {
      // 处理返回 { data: [...], total: 100 } 格式的数据
      tableData.value = response.data.data;
      pagination.total = response.data.total;
    } else if (Array.isArray(response.data)) {
      // 处理直接返回数组的情况
      tableData.value = response.data;
      pagination.total = response.data.length;
    } else {
      tableData.value = [];
      pagination.total = 0;
    }
    
    // 计算统计数据
    calculateStats();
  } catch (error) {
    console.error('获取库位列表失败:', error);
    ElMessage.error(`获取库位列表失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 新增库位
const handleAdd = () => {
  dialogTitle.value = '新增库位';
  isEdit.value = false;
  resetForm();
  dialogVisible.value = true;
};

// 编辑库位
const handleEdit = (row) => {
  dialogTitle.value = '编辑库位';
  isEdit.value = true;
  resetForm();
  
  // 复制行数据并确保status是数字类型
  const rowData = { ...row };
  rowData.status = Number(rowData.status);
  
  Object.assign(form, rowData);
  dialogVisible.value = true;
};

// 删除库位
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该库位吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await baseDataApi.deleteLocation(row.id);
      ElMessage.success('删除成功');
      fetchData();
    } catch (error) {
      console.error('删除库位失败:', error);
      ElMessage.error(`删除库位失败: ${error.message}`);
    }
  }).catch(() => {});
};

// 分页变化
const handlePageChange = (page) => {
  pagination.current = page;
  fetchData();
};

// 每页条数变化
const handleSizeChange = (size) => {
  pagination.size = size;
  pagination.current = 1;
  fetchData();
};

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  
  form.id = '';
  form.name = '';
  form.code = '';
  form.type = '';
  form.area = '';
  form.address = '';
  form.status = 1;
  form.remark = '';
};

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        // 创建提交数据对象，移除不需要的字段
        const submitData = { ...form };
        delete submitData.created_at;
        delete submitData.updated_at;
        
        // 确保status为数字类型
        submitData.status = Number(submitData.status);
        
        if (isEdit.value) {
          // 更新库位
          await baseDataApi.updateLocation(form.id, submitData);
          ElMessage.success('库位更新成功');
        } else {
          // 创建库位
          await baseDataApi.createLocation(submitData);
          ElMessage.success('库位创建成功');
        }
        dialogVisible.value = false;
        fetchData(); // 重新获取数据
      } catch (error) {
        console.error('保存库位失败:', error);
        // 显示详细的错误信息
        const errorMsg = error.response?.data?.message || 
                         error.message || 
                         '操作失败，请重试';
        ElMessage.error(`保存库位失败: ${errorMsg}`);
      } finally {
        loading.value = false;
      }
    }
  });
};

// 获取库位类型标签
const getLocationTypeLabel = (type) => {
  const found = locationTypes.find(item => item.value === type);
  return found ? found.label : type;
};
</script>

<style scoped>
.locations-container {
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
</style>