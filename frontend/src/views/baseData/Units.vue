<template>
  <div class="units-container">
    <div class="page-header">
      <h2>产品单位管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon> 新增单位
      </el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="单位名称">
          <el-input v-model="searchForm.name" placeholder="请输入单位名称" clearable></el-input>
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
        <div class="stat-label">单位总数</div>
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
        :data="tableData"
        border
        style="width: 100%"
        :max-height="tableHeight"
      >
        <el-table-column prop="name" label="单位名称" width="150"></el-table-column>
        <el-table-column prop="code" label="单位编码" width="150"></el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注"></el-table-column>
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
      width="500px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="单位名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入单位名称"></el-input>
        </el-form-item>
        <el-form-item label="单位编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入单位编码"></el-input>
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
  name: '',
  status: ''
});

// 新增/编辑表单
const formRef = ref(null);
const form = reactive({
  id: '',
  name: '',
  code: '',
  status: 1,
  remark: ''
});

// 表单校验规则
const rules = {
  name: [{ required: true, message: '请输入单位名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入单位编码', trigger: 'blur' }]
};

// 对话框控制
const dialogVisible = ref(false);
const dialogTitle = ref('新增单位');
const isEdit = ref(false);

// 初始化
onMounted(() => {
  fetchData();
});

// 导出数据
const handleExport = async () => {
  try {
    const response = await baseDataApi.exportUnits({
      name: searchForm.name,
      status: searchForm.status
    });
    // 处理文件下载
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '单位列表.xlsx');
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
  stats.active = tableData.value.filter(item => item.status === 1).length;
  stats.inactive = tableData.value.filter(item => item.status === 0).length;
};

// 获取单位列表
const fetchData = async () => {
  loading.value = true;
  try {
    // 构建查询参数，将前端参数名映射到后端参数名
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      unitName: searchForm.name, // 映射单位名称
      status: searchForm.status   // 状态保持不变
    };
    
    // 移除空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });
    
    const response = await baseDataApi.getUnits(params);
    
    // 处理后端返回的数据格式
    if (response.data.list) {
      // 处理 { list: [...], total: number } 格式
      tableData.value = response.data.list;
      total.value = response.data.total;
    } else if (response.data.data) {
      // 处理 { data: [...], pagination: { total: number } } 格式
      tableData.value = response.data.data;
      total.value = response.data.pagination.total;
    } else if (Array.isArray(response.data)) {
      // 处理直接返回数组的情况
      tableData.value = response.data;
      total.value = response.data.length;
    } else {
      tableData.value = [];
      total.value = 0;
    }
    
    // 计算统计数据
    calculateStats();
  } catch (error) {
    console.error('获取单位列表失败:', error);
    ElMessage.error('获取单位列表失败');
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

// 新增单位
const handleAdd = () => {
  dialogTitle.value = '新增单位';
  isEdit.value = false;
  resetForm();
  dialogVisible.value = true;
};

// 编辑单位
const handleEdit = (row) => {
  dialogTitle.value = '编辑单位';
  isEdit.value = true;
  resetForm();
  Object.assign(form, row);
  dialogVisible.value = true;
};

// 删除单位
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该单位吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await baseDataApi.deleteUnit(row.id);
      ElMessage.success('删除成功');
      fetchData();
    } catch (error) {
      console.error('删除单位失败:', error);
      ElMessage.error('删除单位失败');
    }
  }).catch(() => {});
};

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  
  form.id = '';
  form.name = '';
  form.code = '';
  form.status = 1;
  form.remark = '';
};

// 提交表单
const submitForm = () => {
  formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 创建提交数据对象，移除不需要的字段
        const submitData = { ...form };
        delete submitData.created_at;
        delete submitData.updated_at;
        
        if (isEdit.value) {
          // 编辑
          await baseDataApi.updateUnit(form.id, submitData);
          ElMessage.success('编辑成功');
        } else {
          // 新增
          await baseDataApi.createUnit(submitData);
          ElMessage.success('新增成功');
        }
        dialogVisible.value = false;
        fetchData();
      } catch (error) {
        console.error('保存单位失败:', error);
        ElMessage.error(error.response?.data?.message || '保存单位失败');
      }
    }
  });
};
</script>

<style scoped>
.units-container {
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