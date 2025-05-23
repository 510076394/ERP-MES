<template>
  <div class="periods-container">
    <div class="page-header">
      <h2>会计期间管理</h2>
      <el-button type="primary" @click="showAddDialog">新增期间</el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="财政年度">
          <el-select v-model="searchForm.fiscalYear" placeholder="选择财政年度" clearable style="width: 180px">
            <el-option
              v-for="year in fiscalYears"
              :key="year"
              :label="year"
              :value="year"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.isClosed" placeholder="选择状态" clearable style="width: 180px">
            <el-option label="已关闭" :value="true"></el-option>
            <el-option label="未关闭" :value="false"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchPeriods">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 表格区域 -->
    <el-card class="data-card">
      <el-table
        :data="periodList"
        style="width: 100%"
        row-key="id"
        border
        v-loading="loading"
      >
        <el-table-column prop="periodName" label="期间名称" width="150"></el-table-column>
        <el-table-column prop="fiscalYear" label="财政年度" width="120"></el-table-column>
        <el-table-column label="开始日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.startDate) }}
          </template>
        </el-table-column>
        <el-table-column label="结束日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.endDate) }}
          </template>
        </el-table-column>
        <el-table-column label="期间类型" width="120">
          <template #default="scope">
            <el-tag type="info" v-if="scope.row.isAdjusting">调整期</el-tag>
            <span v-else>普通期间</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.isClosed ? 'danger' : 'success'">
              {{ scope.row.isClosed ? '已关闭' : '未关闭' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="200">
          <template #default="scope">
            <el-button 
              type="primary" 
              size="small" 
              @click="handleEdit(scope.row)"
              :disabled="scope.row.isClosed"
            >编辑</el-button>
            <el-button 
              type="warning" 
              size="small" 
              @click="handleClose(scope.row)" 
              :disabled="scope.row.isClosed"
            >关闭期间</el-button>
            <el-button 
              type="success" 
              size="small" 
              @click="handleReopen(scope.row)" 
              :disabled="!scope.row.isClosed"
            >重新开启</el-button>
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
      <el-form :model="periodForm" :rules="periodRules" ref="periodFormRef" label-width="100px" class="period-form">
        <el-form-item label="期间名称" prop="periodName">
          <el-input v-model="periodForm.periodName" placeholder="请输入期间名称"></el-input>
        </el-form-item>
        <el-form-item label="财政年度" prop="fiscalYear">
          <el-input-number v-model="periodForm.fiscalYear" :min="2000" :max="2100" style="width: 100%"></el-input-number>
        </el-form-item>
        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker
            v-model="periodForm.startDate"
            type="date"
            placeholder="选择开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="结束日期" prop="endDate">
          <el-date-picker
            v-model="periodForm.endDate"
            type="date"
            placeholder="选择结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="期间类型" prop="isAdjusting">
          <el-radio-group v-model="periodForm.isAdjusting">
            <el-radio :label="false">普通期间</el-radio>
            <el-radio :label="true">调整期</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="savePeriod" :loading="saveLoading">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

// 数据加载状态
const loading = ref(false);
const saveLoading = ref(false);

// 分页相关
const total = ref(0);
const pageSize = ref(20);
const currentPage = ref(1);

// 表单相关
const dialogVisible = ref(false);
const dialogTitle = ref('新增会计期间');
const periodFormRef = ref(null);

// 会计期间列表
const periodList = ref([]);

// 搜索表单
const searchForm = reactive({
  fiscalYear: '',
  isClosed: ''
});

// 会计期间表单
const periodForm = reactive({
  id: null,
  periodName: '',
  fiscalYear: new Date().getFullYear(),
  startDate: '',
  endDate: '',
  isAdjusting: false,
  isClosed: false
});

// 可选财政年度
const fiscalYears = computed(() => {
  const years = new Set();
  const currentYear = new Date().getFullYear();
  
  // 添加当前年度和前后两年
  years.add(currentYear - 2);
  years.add(currentYear - 1);
  years.add(currentYear);
  years.add(currentYear + 1);
  
  // 添加期间列表中的年度
  if (periodList.value && Array.isArray(periodList.value)) {
    periodList.value.forEach(period => {
      if (period && period.fiscalYear) {
        years.add(period.fiscalYear);
      }
    });
  }
  
  return Array.from(years).sort((a, b) => b - a); // 降序排列
});

// 表单验证规则
const periodRules = {
  periodName: [
    { required: true, message: '请输入期间名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在1到50个字符', trigger: 'blur' }
  ],
  fiscalYear: [
    { required: true, message: '请输入财政年度', trigger: 'blur' }
  ],
  startDate: [
    { required: true, message: '请选择开始日期', trigger: 'change' }
  ],
  endDate: [
    { required: true, message: '请选择结束日期', trigger: 'change' },
    {
      validator: (rule, value, callback) => {
        if (value && periodForm.startDate && new Date(value) < new Date(periodForm.startDate)) {
          callback(new Error('结束日期不能早于开始日期'));
        } else {
          callback();
        }
      },
      trigger: 'change'
    }
  ]
};

// 加载会计期间列表
const loadPeriods = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      fiscalYear: searchForm.fiscalYear,
      isClosed: searchForm.isClosed
    };
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/periods`, { params });
    
    // 检查响应数据结构并正确赋值
    if (response.data && response.data.periods) {
      // 转换后端字段名为前端使用的驼峰命名法
      periodList.value = response.data.periods.map(period => ({
        id: period.id,
        periodName: period.period_name,
        fiscalYear: period.fiscal_year,
        startDate: period.start_date,
        endDate: period.end_date,
        isClosed: period.is_closed,
        isAdjusting: period.is_adjusting
      }));
      total.value = response.data.periods.length;
    } else if (Array.isArray(response.data)) {
      // 如果直接返回数组
      periodList.value = response.data.map(period => ({
        id: period.id,
        periodName: period.period_name,
        fiscalYear: period.fiscal_year,
        startDate: period.start_date,
        endDate: period.end_date,
        isClosed: period.is_closed,
        isAdjusting: period.is_adjusting
      }));
      total.value = response.data.length;
    } else {
      periodList.value = [];
      total.value = 0;
      console.warn('未找到会计期间数据或数据格式不正确:', response.data);
    }
  } catch (error) {
    console.error('加载会计期间失败:', error);
    ElMessage.error('加载会计期间失败');
    periodList.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

// 搜索会计期间
const searchPeriods = () => {
  currentPage.value = 1;
  loadPeriods();
};

// 重置搜索条件
const resetSearch = () => {
  searchForm.fiscalYear = '';
  searchForm.isClosed = '';
  searchPeriods();
};

// 新增会计期间
const showAddDialog = () => {
  dialogTitle.value = '新增会计期间';
  resetPeriodForm();
  dialogVisible.value = true;
};

// 编辑会计期间
const handleEdit = (row) => {
  dialogTitle.value = '编辑会计期间';
  Object.keys(periodForm).forEach(key => {
    periodForm[key] = row[key];
  });
  dialogVisible.value = true;
};

// 关闭会计期间
const handleClose = (row) => {
  ElMessageBox.confirm(
    '关闭会计期间将阻止在该期间内创建新的会计凭证。确认要关闭此期间吗？', 
    '警告', 
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/finance/periods/${row.id}/close`);
      ElMessage.success('会计期间已关闭');
      loadPeriods();
    } catch (error) {
      console.error('关闭会计期间失败:', error);
      ElMessage.error('关闭会计期间失败');
    }
  }).catch(() => {});
};

// 重新开启会计期间
const handleReopen = (row) => {
  ElMessageBox.confirm(
    '重新开启会计期间将允许在该期间内创建新的会计凭证。确认要重新开启此期间吗？', 
    '警告', 
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/finance/periods/${row.id}/reopen`);
      ElMessage.success('会计期间已重新开启');
      loadPeriods();
    } catch (error) {
      console.error('重新开启会计期间失败:', error);
      ElMessage.error('重新开启会计期间失败');
    }
  }).catch(() => {});
};

// 保存会计期间
const savePeriod = async () => {
  if (!periodFormRef.value) return;
  
  await periodFormRef.value.validate(async (valid) => {
    if (valid) {
      saveLoading.value = true;
      try {
        // 转换字段名以匹配后端API期望的格式
        const periodData = {
          period_name: periodForm.periodName,
          start_date: periodForm.startDate,
          end_date: periodForm.endDate,
          is_closed: periodForm.isClosed,
          is_adjusting: periodForm.isAdjusting,
          fiscal_year: periodForm.fiscalYear
        };
        
        if (periodForm.id) {
          // 更新
          await axios.put(`${import.meta.env.VITE_API_URL}/api/finance/periods/${periodForm.id}`, periodData);
          ElMessage.success('更新成功');
        } else {
          // 新增
          await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/periods`, periodData);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        loadPeriods();
      } catch (error) {
        console.error('保存会计期间失败:', error);
        ElMessage.error('保存会计期间失败');
      } finally {
        saveLoading.value = false;
      }
    }
  });
};

// 重置表单
const resetPeriodForm = () => {
  periodForm.id = null;
  periodForm.periodName = '';
  periodForm.fiscalYear = new Date().getFullYear();
  periodForm.startDate = '';
  periodForm.endDate = '';
  periodForm.isAdjusting = false;
  periodForm.isClosed = false;
  
  // 清除校验
  if (periodFormRef.value) {
    periodFormRef.value.resetFields();
  }
};

// 分页相关方法
const handleSizeChange = (size) => {
  pageSize.value = size;
  loadPeriods();
};

const handleCurrentChange = (page) => {
  currentPage.value = page;
  loadPeriods();
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  // 如果日期包含时间部分，只取日期部分
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 页面加载时执行
onMounted(() => {
  loadPeriods();
});
</script>

<style scoped>
.periods-container {
  padding: 10px;
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  width: 100%;
}

.search-card {
  margin-bottom: 20px;
  width: 100%;
}

.data-card {
  margin-bottom: 20px;
  width: 100%;
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

.period-form {
  width: 100%;
}

.period-form :deep(.el-form-item__content) {
  width: calc(100% - 100px); /* 减去label的宽度 */
}

.period-form :deep(.el-input),
.period-form :deep(.el-input-number),
.period-form :deep(.el-date-picker) {
  width: 100%;
}

:deep(.el-table) {
  width: 100% !important;
}

:deep(.el-card__body) {
  width: 100%;
  padding: 20px;
}
</style> 