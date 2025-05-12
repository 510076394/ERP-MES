<template>
  <div class="category-container">
    <div class="page-header">
      <h2>资产类别管理</h2>
      <el-button type="primary" @click="showAddDialog">新增类别</el-button>
    </div>

    <!-- 表格区域 -->
    <el-card class="data-card">
      <el-table
        :data="categoryList"
        style="width: 100%"
        border
        v-loading="loading"
      >
        <el-table-column prop="id" label="ID" width="80"></el-table-column>
        <el-table-column prop="name" label="类别名称" width="180"></el-table-column>
        <el-table-column prop="code" label="类别编码" width="150"></el-table-column>
        <el-table-column label="折旧年限" width="120">
          <template #default="scope">
            {{ scope.row.default_useful_life }} 年
          </template>
        </el-table-column>
        <el-table-column label="默认折旧方法" width="150">
          <template #default="scope">
            {{ getDepreciationMethodText(scope.row.default_depreciation_method) }}
          </template>
        </el-table-column>
        <el-table-column label="默认残值率" width="150">
          <template #default="scope">
            {{ scope.row.default_salvage_rate }}%
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述"></el-table-column>
        <el-table-column prop="asset_count" label="资产数量" width="120" align="center"></el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handleEdit(scope.row)">编辑</el-button>
            <el-popconfirm
              title="确定删除此类别吗？如果该类别下有资产，将无法删除。"
              @confirm="handleDelete(scope.row.id)"
            >
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
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
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="categoryForm" :rules="categoryRules" ref="categoryFormRef" label-width="100px">
        <el-form-item label="类别名称" prop="name">
          <el-input v-model="categoryForm.name" placeholder="请输入类别名称"></el-input>
        </el-form-item>
        <el-form-item label="类别编码" prop="code">
          <el-input v-model="categoryForm.code" placeholder="请输入类别编码"></el-input>
        </el-form-item>
        <el-form-item label="折旧年限" prop="default_useful_life">
          <el-input-number v-model="categoryForm.default_useful_life" :min="1" :max="50" style="width: 100%"></el-input-number>
        </el-form-item>
        <el-form-item label="折旧方法" prop="default_depreciation_method">
          <el-select v-model="categoryForm.default_depreciation_method" placeholder="请选择折旧方法" style="width: 100%">
            <el-option label="直线法" value="straight_line"></el-option>
            <el-option label="双倍余额递减法" value="double_declining"></el-option>
            <el-option label="年数总和法" value="sum_of_years"></el-option>
            <el-option label="不计提折旧" value="no_depreciation"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="默认残值率" prop="default_salvage_rate">
          <el-input-number 
            v-model="categoryForm.default_salvage_rate" 
            :precision="2" 
            :min="0" 
            :max="30"
            :step="0.5"
            style="width: 100%"
          ></el-input-number>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="categoryForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述信息"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveCategory" :loading="saveLoading">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

// 数据加载状态
const loading = ref(false);
const saveLoading = ref(false);

// 分页相关
const total = ref(0);
const pageSize = ref(10);
const currentPage = ref(1);

// 表单相关
const dialogVisible = ref(false);
const dialogTitle = ref('新增资产类别');
const categoryFormRef = ref(null);

// 数据列表
const categoryList = ref([]);

// 类别表单
const categoryForm = reactive({
  id: null,
  name: '',
  code: '',
  default_useful_life: 5,
  default_depreciation_method: 'straight_line',
  default_salvage_rate: 5.0,
  description: ''
});

// 表单验证规则
const categoryRules = {
  name: [
    { required: true, message: '请输入类别名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入类别编码', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]{2,20}$/, message: '编码只能包含字母、数字、下划线和短横线', trigger: 'blur' }
  ],
  default_useful_life: [
    { required: true, message: '请输入默认折旧年限', trigger: 'blur' }
  ],
  default_depreciation_method: [
    { required: true, message: '请选择默认折旧方法', trigger: 'change' }
  ]
};

// 获取折旧方法文本
const getDepreciationMethodText = (method) => {
  const methodMap = {
    straight_line: '直线法',
    double_declining: '双倍余额递减法',
    sum_of_years: '年数总和法',
    no_depreciation: '不计提折旧'
  };
  return methodMap[method] || method;
};

// 加载资产类别列表
const loadCategories = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    };
    
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/assets/categories`, { params });
    
    // 确保categoryList始终是数组
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      categoryList.value = response.data.data;
      // 如果API返回了total信息
      if (response.data.total) {
        total.value = response.data.total;
      } else {
        total.value = categoryList.value.length;
      }
    } else if (Array.isArray(response.data)) {
      categoryList.value = response.data;
      total.value = response.data.length;
    } else {
      // 如果返回的数据既不是预期格式也不是数组，则设为空数组
      console.error('API返回的数据格式不正确:', response.data);
      categoryList.value = [];
      total.value = 0;
    }
  } catch (error) {
    console.error('加载资产类别列表失败:', error);
    ElMessage.error('加载资产类别列表失败');
    categoryList.value = []; // 错误时也确保是空数组
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

// 新增类别
const showAddDialog = () => {
  dialogTitle.value = '新增资产类别';
  resetCategoryForm();
  dialogVisible.value = true;
};

// 编辑类别
const handleEdit = async (row) => {
  dialogTitle.value = '编辑资产类别';
  
  resetCategoryForm();
  
  // 填充表单数据
  Object.assign(categoryForm, row);
  
  dialogVisible.value = true;
};

// 删除类别
const handleDelete = async (id) => {
  try {
    await axios.delete(`${import.meta.env.VITE_API_URL}/api/finance/assets/categories/${id}`);
    ElMessage.success('删除成功');
    loadCategories();
  } catch (error) {
    console.error('删除资产类别失败:', error);
    if (error.response && error.response.data && error.response.data.message) {
      ElMessage.error(error.response.data.message);
    } else {
      ElMessage.error('删除资产类别失败');
    }
  }
};

// 保存类别
const saveCategory = async () => {
  if (!categoryFormRef.value) return;
  
  await categoryFormRef.value.validate(async (valid) => {
    if (valid) {
      saveLoading.value = true;
      try {
        // 准备提交的数据
        const data = { ...categoryForm };
        
        if (categoryForm.id) {
          // 更新
          await axios.put(`${import.meta.env.VITE_API_URL}/api/finance/assets/categories/${categoryForm.id}`, data);
          ElMessage.success('更新成功');
        } else {
          // 新增
          await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/assets/categories`, data);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        loadCategories();
      } catch (error) {
        console.error('保存资产类别失败:', error);
        if (error.response && error.response.data && error.response.data.message) {
          ElMessage.error(error.response.data.message);
        } else {
          ElMessage.error('保存资产类别失败');
        }
      } finally {
        saveLoading.value = false;
      }
    }
  });
};

// 重置类别表单
const resetCategoryForm = () => {
  categoryForm.id = null;
  categoryForm.name = '';
  categoryForm.code = '';
  categoryForm.default_useful_life = 5;
  categoryForm.default_depreciation_method = 'straight_line';
  categoryForm.default_salvage_rate = 5.0;
  categoryForm.description = '';
  
  // 清除校验
  if (categoryFormRef.value) {
    categoryFormRef.value.resetFields();
  }
};

// 分页相关方法
const handleSizeChange = (size) => {
  pageSize.value = size;
  loadCategories();
};

const handleCurrentChange = (page) => {
  currentPage.value = page;
  loadCategories();
};

// 页面加载时执行
onMounted(() => {
  loadCategories();
});
</script>

<style scoped>
.category-container {
  padding: 10px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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