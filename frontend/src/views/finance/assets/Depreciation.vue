<template>
  <div class="depreciation-container">
    <div class="page-header">
      <h2>资产折旧计提</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="calculateDepreciation" :loading="loading">计算折旧</el-button>
        <el-button type="success" @click="confirmDepreciation" :disabled="!hasDepreciation || savingDepreciation">
          确认计提
          <el-icon v-if="savingDepreciation"><Loading /></el-icon>
        </el-button>
        <el-button type="warning" @click="exportData" :disabled="!hasDepreciation">导出数据</el-button>
      </div>
    </div>
    
    <!-- 搜索表单 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" ref="searchFormRef" class="search-form">
        <el-form-item label="计提年月" prop="depreciationDate" required>
          <el-date-picker
            v-model="searchForm.depreciationDate"
            type="month"
            placeholder="选择计提年月"
            format="YYYY-MM"
            value-format="YYYY-MM"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="资产类别">
          <el-select v-model="searchForm.categoryId" placeholder="选择资产类别" clearable>
            <el-option
              v-for="item in categoryOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="使用部门">
          <el-select v-model="searchForm.department" placeholder="选择使用部门" clearable>
            <el-option
              v-for="item in departmentOptions"
              :key="item.id"
              :label="item.name"
              :value="item.name"
            ></el-option>
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 统计信息 -->
    <div class="statistics-row" v-if="hasDepreciation">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ depreciationSummary.assetsCount }}</div>
        <div class="stat-label">计提资产数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatCurrency(depreciationSummary.totalOriginalValue) }}</div>
        <div class="stat-label">资产原值合计</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatCurrency(depreciationSummary.totalNetValueBefore) }}</div>
        <div class="stat-label">计提前净值</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatCurrency(depreciationSummary.totalDepreciationAmount) }}</div>
        <div class="stat-label">折旧额合计</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatCurrency(depreciationSummary.totalNetValueAfter) }}</div>
        <div class="stat-label">计提后净值</div>
      </el-card>
    </div>
    
    <!-- 数据表格 -->
    <el-card class="data-card">
      <template #header>
        <div class="card-header">
          <span>折旧计提明细</span>
          <el-checkbox v-model="onlyShowDepreciatingAssets" @change="filterAssets">
            只显示需计提折旧资产
          </el-checkbox>
        </div>
      </template>
      
      <div v-if="!hasDepreciation" class="empty-container">
        <el-empty description='请选择计提年月并点击"计算折旧"按钮'></el-empty>
      </div>
      
      <el-table
        v-else
        :data="filteredAssetsList"
        style="width: 100%"
        border
        stripe
        v-loading="loading"
        :summary-method="getSummaries"
        show-summary
      >
        <el-table-column type="expand">
          <template #default="scope">
            <div class="asset-details">
              <el-descriptions :column="3" border size="small">
                <el-descriptions-item label="预计使用年限">{{ scope.row.usefulLife }}年</el-descriptions-item>
                <el-descriptions-item label="残值率">{{ scope.row.salvageRate }}%</el-descriptions-item>
                <el-descriptions-item label="折旧方法">{{ getDepreciationMethodText(scope.row.depreciationMethod) }}</el-descriptions-item>
                <el-descriptions-item label="已使用月数">{{ scope.row.usedMonths }}个月</el-descriptions-item>
                <el-descriptions-item label="使用部门">{{ scope.row.department }}</el-descriptions-item>
                <el-descriptions-item label="存放地点">{{ scope.row.location }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="assetCode" label="资产编号" width="110"></el-table-column>
        <el-table-column prop="assetName" label="资产名称" width="150"></el-table-column>
        <el-table-column prop="categoryName" label="资产类别" width="120"></el-table-column>
        <el-table-column prop="purchaseDate" label="购入日期" width="100"></el-table-column>
        <el-table-column prop="originalValue" label="原值" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.originalValue) }}
          </template>
        </el-table-column>
        <el-table-column prop="netValueBefore" label="计提前净值" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.netValueBefore) }}
          </template>
        </el-table-column>
        <el-table-column prop="depreciationAmount" label="折旧额" width="120" align="right">
          <template #default="scope">
            <span :class="{ 'zero-value': scope.row.depreciationAmount <= 0 }">
              {{ formatCurrency(scope.row.depreciationAmount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="netValueAfter" label="计提后净值" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.netValueAfter) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="折旧状态" width="120">
          <template #default="scope">
            <el-tag 
              :type="scope.row.depreciationAmount > 0 ? 'warning' : 'info'"
              :effect="scope.row.depreciationAmount > 0 ? 'dark' : 'plain'"
            >
              {{ scope.row.depreciationAmount > 0 ? '需计提' : '无需计提' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="150"></el-table-column>
      </el-table>
    </el-card>
    
    <!-- 确认对话框 -->
    <el-dialog
      title="确认折旧计提"
      v-model="confirmDialogVisible"
      width="500px"
    >
      <div class="confirm-content">
        <p>您确定要为 <strong>{{ searchForm.depreciationDate }}</strong> 执行折旧计提操作吗？</p>
        <p>此操作将影响 <strong>{{ depreciatingAssetsCount }}</strong> 个资产的净值，折旧总额为 <strong>{{ formatCurrency(depreciationSummary.totalDepreciationAmount) }}</strong>。</p>
        <p>折旧计提操作将自动生成相应的会计凭证。</p>
        <div class="warning-message">注意：此操作执行后不可撤销！</div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="confirmDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitDepreciation" :loading="savingDepreciation">确认计提</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { Loading } from '@element-plus/icons-vue';

// 数据加载状态
const loading = ref(false);
const savingDepreciation = ref(false);

// 对话框状态
const confirmDialogVisible = ref(false);

// 数据列表
const assetsList = ref([]);
const filteredAssetsList = ref([]);
const categoryOptions = ref([]);
const departmentOptions = ref([]);
const onlyShowDepreciatingAssets = ref(false);

// 搜索表单
const searchForm = reactive({
  depreciationDate: new Date().toISOString().slice(0, 7), // 默认当前年月
  categoryId: '',
  department: ''
});

// 折旧汇总数据
const depreciationSummary = reactive({
  assetsCount: 0,
  totalOriginalValue: 0,
  totalNetValueBefore: 0,
  totalDepreciationAmount: 0,
  totalNetValueAfter: 0
});

// 计算属性
const hasDepreciation = computed(() => assetsList.value.length > 0);
const depreciatingAssetsCount = computed(() => 
  assetsList.value.filter(asset => asset.depreciationAmount > 0).length
);

// 格式化货币
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    in_use: 'success',
    idle: 'info',
    under_repair: 'warning',
    disposed: 'danger'
  };
  return statusMap[status] || 'info';
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    in_use: '在用',
    idle: '闲置',
    under_repair: '维修',
    disposed: '报废'
  };
  return statusMap[status] || status;
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

// 计算折旧
const calculateDepreciation = async () => {
  if (!searchForm.depreciationDate) {
    ElMessage.warning('请选择计提年月');
    return;
  }
  
  loading.value = true;
  try {
    const params = {
      depreciationDate: searchForm.depreciationDate,
      categoryId: searchForm.categoryId,
      department: searchForm.department
    };
    
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/assets/depreciation/calculate`, { params });
    assetsList.value = response.data;
    
    // 应用过滤器
    filterAssets();
    
    // 计算汇总数据
    calculateSummary();
  } catch (error) {
    console.error('计算折旧失败:', error);
    ElMessage.error('计算折旧失败');
  } finally {
    loading.value = false;
  }
};

// 过滤资产列表
const filterAssets = () => {
  if (onlyShowDepreciatingAssets.value) {
    filteredAssetsList.value = assetsList.value.filter(asset => asset.depreciationAmount > 0);
  } else {
    filteredAssetsList.value = assetsList.value;
  }
};

// 计算汇总数据
const calculateSummary = () => {
  depreciationSummary.assetsCount = assetsList.value.length;
  depreciationSummary.totalOriginalValue = assetsList.value.reduce((sum, asset) => sum + asset.originalValue, 0);
  depreciationSummary.totalNetValueBefore = assetsList.value.reduce((sum, asset) => sum + asset.netValueBefore, 0);
  depreciationSummary.totalDepreciationAmount = assetsList.value.reduce((sum, asset) => sum + asset.depreciationAmount, 0);
  depreciationSummary.totalNetValueAfter = assetsList.value.reduce((sum, asset) => sum + asset.netValueAfter, 0);
};

// 确认折旧计提
const confirmDepreciation = () => {
  if (!hasDepreciation.value) {
    ElMessage.warning('请先计算折旧');
    return;
  }
  
  if (depreciatingAssetsCount.value === 0) {
    ElMessage.warning('当前没有需要计提折旧的资产');
    return;
  }
  
  confirmDialogVisible.value = true;
};

// 提交折旧计提
const submitDepreciation = async () => {
  savingDepreciation.value = true;
  try {
    // 准备提交的数据
    const data = {
      depreciationDate: searchForm.depreciationDate,
      assets: assetsList.value.filter(asset => asset.depreciationAmount > 0).map(asset => ({
        id: asset.id,
        depreciationAmount: asset.depreciationAmount,
        netValueAfter: asset.netValueAfter
      }))
    };
    
    await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/assets/depreciation/submit`, data);
    
    ElMessage.success('折旧计提成功');
    confirmDialogVisible.value = false;
    
    // 重新计算折旧
    calculateDepreciation();
  } catch (error) {
    console.error('提交折旧计提失败:', error);
    ElMessage.error('提交折旧计提失败');
  } finally {
    savingDepreciation.value = false;
  }
};

// 导出数据
const exportData = () => {
  if (!hasDepreciation.value) {
    ElMessage.warning('请先计算折旧');
    return;
  }
  
  window.open(`${import.meta.env.VITE_API_URL}/api/finance/assets/depreciation/export?depreciationDate=${searchForm.depreciationDate}&categoryId=${searchForm.categoryId}&department=${searchForm.department}`);
};

// 表格合计行
const getSummaries = (param) => {
  const { columns } = param;
  const sums = [];
  
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '合计';
      return;
    }
    
    if (['originalValue', 'netValueBefore', 'depreciationAmount', 'netValueAfter'].includes(column.property)) {
      const values = filteredAssetsList.value.map(item => {
        return Number(item[column.property]);
      });
      
      const sum = values.reduce((prev, curr) => {
        return prev + (isNaN(curr) ? 0 : curr);
      }, 0);
      
      sums[index] = formatCurrency(sum);
    } else {
      sums[index] = '';
    }
  });
  
  return sums;
};

// 加载资产类别选项
const loadCategoryOptions = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/assets/categories`);
    categoryOptions.value = response.data;
  } catch (error) {
    console.error('加载资产类别列表失败:', error);
    ElMessage.error('加载资产类别列表失败');
  }
};

// 加载部门选项
const loadDepartmentOptions = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/system/departments/list`);
    departmentOptions.value = response.data;
  } catch (error) {
    console.error('加载部门列表失败:', error);
    ElMessage.error('加载部门列表失败');
  }
};

// 页面加载时执行
onMounted(() => {
  loadCategoryOptions();
  loadDepartmentOptions();
  // 不自动计算折旧，等用户主动点击按钮
});
</script>

<style scoped>
.depreciation-container {
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

.statistics-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 150px;
  margin-right: 15px;
  text-align: center;
  margin-bottom: 15px;
}

.stat-card:last-child {
  margin-right: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.data-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

.zero-value {
  color: #909399;
}

.asset-details {
  padding: 5px 20px;
  background-color: #f8f8f8;
}

.confirm-content {
  padding: 10px 0;
}

.warning-message {
  margin-top: 15px;
  padding: 10px;
  background-color: #fef0f0;
  color: #f56c6c;
  border-radius: 4px;
  font-weight: bold;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style> 