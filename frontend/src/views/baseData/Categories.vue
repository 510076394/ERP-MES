<template>
  <div class="categories-container">
    <div class="page-header">
      <h2>产品分类管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon> 新增分类
      </el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="分类名称">
          <el-input v-model="searchForm.name" placeholder="请输入分类名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="分类编码">
          <el-input v-model="searchForm.code" placeholder="请输入分类编码" clearable></el-input>
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
        <div class="stat-label">分类总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.parentCategories || 0 }}</div>
        <div class="stat-label">父分类</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.childCategories || 0 }}</div>
        <div class="stat-label">子分类</div>
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
        row-key="id"
        border
        default-expand-all
        :tree-props="{ children: 'children' }"
        style="width: 100%"
        :max-height="tableHeight"
      >
        <el-table-column prop="name" label="分类名称" width="220"></el-table-column>
        <el-table-column prop="code" label="分类编码" width="150"></el-table-column>
        <el-table-column prop="sort" label="排序" width="100"></el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注"></el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="handleAdd(scope.row)">
              <el-icon><Plus /></el-icon> 添加子分类
            </el-button>
            <el-button size="small" type="primary" @click="handleEdit(scope.row)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="500px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="上级分类">
          <el-cascader
            v-model="form.parent_id"
            :options="categoryOptions"
            :props="{ 
              checkStrictly: true,
              value: 'id',
              label: 'name',
              emitPath: false
            }"
            clearable
            placeholder="请选择上级分类"
            style="width: 100%"
          ></el-cascader>
        </el-form-item>
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称"></el-input>
        </el-form-item>
        <el-form-item label="分类编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入分类编码"></el-input>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="9999"></el-input-number>
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

// 统计数据
const stats = reactive({
  total: 0,
  active: 0,
  inactive: 0,
  parentCategories: 0,
  childCategories: 0
});

// 新增/编辑表单
const formRef = ref(null);
const form = reactive({
  id: '',
  parent_id: null,
  name: '',
  code: '',
  sort: 0,
  status: 1,
  remark: '',
  children: [], // 添加children字段以支持树形结构
});

// 搜索表单
const searchForm = reactive({
  name: '',
  code: '',
  status: ''
});

// 表单校验规则
const rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入分类编码', trigger: 'blur' }]
};

// 对话框控制
const dialogVisible = ref(false);
const dialogTitle = ref('新增分类');
const isEdit = ref(false);

// 分类选项（用于级联选择器）
const categoryOptions = ref([]);

// 初始化
onMounted(() => {
  fetchData();
});

// 导出数据
const handleExport = async () => {
  try {
    const response = await baseDataApi.exportCategories({ 
      name: searchForm.name,
      code: searchForm.code,
      status: searchForm.status
    });
    // 处理文件下载
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '分类列表.xlsx');
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
  const allCategories = getAllCategories(tableData.value);
  const activeCount = allCategories.filter(item => item.status === 1).length;
  const inactiveCount = allCategories.filter(item => item.status === 0).length;
  
  // 计算父分类和子分类数量
  const parentCount = tableData.value.length;
  const childCount = allCategories.length - parentCount;
  
  stats.total = allCategories.length;
  stats.active = activeCount;
  stats.inactive = inactiveCount;
  stats.parentCategories = parentCount;
  stats.childCategories = childCount;
};

// 递归获取所有分类 (包括子分类)
const getAllCategories = (categories) => {
  let allCategories = [];
  
  categories.forEach(category => {
    allCategories.push(category);
    if (category.children && category.children.length > 0) {
      allCategories = allCategories.concat(getAllCategories(category.children));
    }
  });
  
  return allCategories;
};

// 搜索
const handleSearch = () => {
  fetchData();
};

// 重置搜索
const resetSearch = () => {
  searchForm.name = '';
  searchForm.code = '';
  searchForm.status = '';
  fetchData();
};

// 获取分类列表
const fetchData = async () => {
  loading.value = true;
  try {
    const params = {
      tree: 'true',
      name: searchForm.name,
      code: searchForm.code,
      status: searchForm.status
    };
    
    const response = await baseDataApi.getCategories(params);
    // 统一处理后端返回的不同数据格式
    let categoryData;
    if (response.data.list) {
      // 处理返回 { list: [...] } 格式的数据
      categoryData = response.data.list;
    } else if (response.data.data) {
      // 处理返回 { data: [...] } 格式的数据
      categoryData = response.data.data;
    } else if (Array.isArray(response.data)) {
      // 处理直接返回数组的情况
      categoryData = response.data;
    } else {
      categoryData = [];
    }
    
    tableData.value = categoryData;
    
    // 处理分类选项，用于级联选择器
    const processOptions = (data) => {
      return data.map(item => {
        const option = {
          id: item.id,
          name: item.name,
          label: item.name,
          value: item.id  // 添加value字段，确保级联选择器正常工作
        };
        
        if (item.children && item.children.length > 0) {
          option.children = processOptions(item.children);
        }
        
        return option;
      });
    };
    
    categoryOptions.value = processOptions(categoryData);
    
    // 计算统计数据
    calculateStats();
  } catch (error) {
    console.error('获取分类列表失败:', error);
    ElMessage.error(`获取分类列表失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 新增分类
const handleAdd = (row) => {
  dialogTitle.value = row ? '添加子分类' : '新增分类';
  isEdit.value = false;
  resetForm();
  
  if (row) {
    form.parent_id = row.id;
  }
  
  dialogVisible.value = true;
};

// 编辑分类
const handleEdit = (row) => {
  dialogTitle.value = '编辑分类';
  isEdit.value = true;
  resetForm();
  Object.assign(form, row);
  dialogVisible.value = true;
};

// 删除分类
const handleDelete = (row) => {
  if (row.children && row.children.length > 0) {
    ElMessage.warning('该分类下有子分类，不能删除');
    return;
  }
  
  ElMessageBox.confirm('确定要删除该分类吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await baseDataApi.deleteCategory(row.id);
      ElMessage.success('删除成功');
      fetchData();
    } catch (error) {
      console.error('删除分类失败:', error);
      ElMessage.error(`删除分类失败: ${error.message}`);
    }
  }).catch(() => {});
};

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  
  form.id = '';
  form.parent_id = null;
  form.name = '';
  form.code = '';
  form.sort = 0;
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
        delete submitData.children;
        delete submitData.created_at;
        delete submitData.updated_at;
        
        if (isEdit.value) {
          // 更新分类
          await baseDataApi.updateCategory(form.id, submitData);
          ElMessage.success('分类更新成功');
        } else {
          // 创建分类
          await baseDataApi.createCategory(submitData);
          ElMessage.success('分类创建成功');
        }
        dialogVisible.value = false;
        fetchData(); // 重新获取数据
      } catch (error) {
        console.error('保存分类失败:', error);
        ElMessage.error(error.response?.data?.message || '操作失败，请重试');
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>

<style scoped>
.categories-container {
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
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 15px;
}

.stat-card {
  flex: 1;
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>