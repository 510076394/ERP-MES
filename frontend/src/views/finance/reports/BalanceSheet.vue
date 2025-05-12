<template>
  <div class="report-container">
    <div class="page-header">
      <h2>资产负债表</h2>
      <div class="header-actions">
        <el-button type="primary" @click="generateReport">生成报表</el-button>
        <el-button @click="printReport" :disabled="!reportData.length">打印报表</el-button>
        <el-button @click="exportExcel" :disabled="!reportData.length">导出Excel</el-button>
      </div>
    </div>
    
    <!-- 查询条件区域 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="queryParams" class="search-form">
        <el-form-item label="报表日期" required>
          <el-date-picker
            v-model="queryParams.reportDate"
            type="date"
            placeholder="选择报表日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 180px"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="比较日期">
          <el-date-picker
            v-model="queryParams.compareDate"
            type="date"
            placeholder="选择比较日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 180px"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="显示层级">
          <el-select v-model="queryParams.level" placeholder="选择显示层级" style="width: 180px">
            <el-option label="一级科目" :value="1"></el-option>
            <el-option label="二级科目" :value="2"></el-option>
            <el-option label="三级科目" :value="3"></el-option>
            <el-option label="四级科目" :value="4"></el-option>
            <el-option label="所有明细" :value="0"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="单位">
          <el-select v-model="queryParams.unit" placeholder="选择金额单位" style="width: 120px">
            <el-option label="元" :value="1"></el-option>
            <el-option label="千元" :value="1000"></el-option>
            <el-option label="万元" :value="10000"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 报表区域 -->
    <el-card class="report-card" v-loading="loading">
      <div class="report-title" v-if="reportData.length">
        <h1>资产负债表</h1>
        <h3>{{ formatDate(queryParams.reportDate) }}</h3>
        <h4>单位：{{ unitText }}</h4>
      </div>
      
      <!-- 报表主体 -->
      <div class="report-body" v-if="reportData.length">
        <el-row>
          <el-col :span="12">
            <div class="report-section">
              <h3>资产</h3>
              <el-table
                :data="assetData"
                style="width: 100%"
                :show-header="true"
                border
                row-key="id"
                :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
              >
                <el-table-column prop="name" label="资产" width="280"></el-table-column>
                <el-table-column label="行次" width="60" align="center">
                  <template #default="scope">
                    {{ scope.row.rowNum }}
                  </template>
                </el-table-column>
                <el-table-column prop="endAmount" label="期末余额" align="right">
                  <template #default="scope">
                    {{ formatAmount(scope.row.endAmount) }}
                  </template>
                </el-table-column>
                <el-table-column prop="beginAmount" label="期初余额" align="right" v-if="queryParams.compareDate">
                  <template #default="scope">
                    {{ formatAmount(scope.row.beginAmount) }}
                  </template>
                </el-table-column>
                <el-table-column label="变动" align="right" v-if="queryParams.compareDate">
                  <template #default="scope">
                    <span :class="getChangeClass(scope.row.endAmount - scope.row.beginAmount)">
                      {{ formatAmount(scope.row.endAmount - scope.row.beginAmount) }}
                    </span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-col>
          
          <el-col :span="12">
            <div class="report-section">
              <h3>负债和所有者权益</h3>
              <el-table
                :data="liabilityEquityData"
                style="width: 100%"
                :show-header="true"
                border
                row-key="id"
                :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
              >
                <el-table-column prop="name" label="负债和所有者权益" width="280"></el-table-column>
                <el-table-column label="行次" width="60" align="center">
                  <template #default="scope">
                    {{ scope.row.rowNum }}
                  </template>
                </el-table-column>
                <el-table-column prop="endAmount" label="期末余额" align="right">
                  <template #default="scope">
                    {{ formatAmount(scope.row.endAmount) }}
                  </template>
                </el-table-column>
                <el-table-column prop="beginAmount" label="期初余额" align="right" v-if="queryParams.compareDate">
                  <template #default="scope">
                    {{ formatAmount(scope.row.beginAmount) }}
                  </template>
                </el-table-column>
                <el-table-column label="变动" align="right" v-if="queryParams.compareDate">
                  <template #default="scope">
                    <span :class="getChangeClass(scope.row.endAmount - scope.row.beginAmount)">
                      {{ formatAmount(scope.row.endAmount - scope.row.beginAmount) }}
                    </span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-col>
        </el-row>
      </div>
      
      <!-- 无数据提示 -->
      <div class="empty-tip" v-if="!loading && !reportData.length">
        <el-empty description='请选择报表日期并点击"生成报表"按钮'></el-empty>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import * as XLSX from 'xlsx';

// 查询参数
const queryParams = reactive({
  reportDate: new Date().toISOString().slice(0, 10), // 默认为今天
  compareDate: '',
  level: 2, // 默认显示二级科目
  unit: 1 // 默认单位为元
});

// 报表数据
const reportData = ref([]);
const loading = ref(false);

// 计算资产数据和负债权益数据
const assetData = computed(() => {
  return reportData.value.filter(item => item.category === 'asset');
});

const liabilityEquityData = computed(() => {
  return reportData.value.filter(item => item.category === 'liability' || item.category === 'equity');
});

// 计算金额单位显示文本
const unitText = computed(() => {
  switch (queryParams.unit) {
    case 1: return '元';
    case 1000: return '千元';
    case 10000: return '万元';
    default: return '元';
  }
});

// 生成报表
const generateReport = async () => {
  if (!queryParams.reportDate) {
    ElMessage.warning('请选择报表日期');
    return;
  }
  
  loading.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/reports/balance-sheet`, {
      params: {
        reportDate: queryParams.reportDate,
        compareDate: queryParams.compareDate,
        level: queryParams.level,
        unit: queryParams.unit
      }
    });
    
    reportData.value = response.data.data;
  } catch (error) {
    console.error('获取资产负债表数据失败:', error);
    ElMessage.error('获取资产负债表数据失败');
  } finally {
    loading.value = false;
  }
};

// 打印报表
const printReport = () => {
  window.print();
};

// 导出Excel
const exportExcel = () => {
  // 创建工作簿和工作表
  const wb = XLSX.utils.book_new();
  
  // 准备报表数据
  const assetRows = prepareExcelData(assetData.value, '资产');
  const liabilityEquityRows = prepareExcelData(liabilityEquityData.value, '负债和所有者权益');
  
  // 合并数据并创建工作表
  const ws = XLSX.utils.json_to_sheet([
    { A: '资产负债表', B: '', C: '', D: '', E: '', F: '' },
    { A: `报表日期: ${formatDate(queryParams.reportDate)}`, B: '', C: '', D: '', E: '', F: '' },
    { A: `单位: ${unitText.value}`, B: '', C: '', D: '', E: '', F: '' },
    { A: '', B: '', C: '', D: '', E: '', F: '' },
    ...assetRows,
    { A: '', B: '', C: '', D: '', E: '', F: '' },
    ...liabilityEquityRows
  ], { skipHeader: true });
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '资产负债表');
  
  // 生成Excel文件并下载
  XLSX.writeFile(wb, `资产负债表_${queryParams.reportDate}.xlsx`);
};

// 准备Excel数据
const prepareExcelData = (data, sectionTitle) => {
  const rows = [
    { A: sectionTitle, B: '行次', C: '期末余额', D: '期初余额', E: '变动', F: '变动率(%)' }
  ];
  
  data.forEach(item => {
    const change = item.endAmount - item.beginAmount;
    const changeRate = item.beginAmount !== 0 ? (change / Math.abs(item.beginAmount) * 100).toFixed(2) : 'N/A';
    
    rows.push({
      A: item.name,
      B: item.rowNum,
      C: formatAmount(item.endAmount),
      D: formatAmount(item.beginAmount),
      E: formatAmount(change),
      F: changeRate
    });
    
    // 处理子项
    if (item.children && item.children.length) {
      item.children.forEach(child => {
        const childChange = child.endAmount - child.beginAmount;
        const childChangeRate = child.beginAmount !== 0 ? (childChange / Math.abs(child.beginAmount) * 100).toFixed(2) : 'N/A';
        
        rows.push({
          A: '  ' + child.name, // 增加缩进
          B: child.rowNum,
          C: formatAmount(child.endAmount),
          D: formatAmount(child.beginAmount),
          E: formatAmount(childChange),
          F: childChangeRate
        });
      });
    }
  });
  
  return rows;
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

// 格式化金额
const formatAmount = (amount) => {
  if (amount === undefined || amount === null) return '-';
  
  // 换算单位
  const convertedAmount = amount / queryParams.unit;
  
  // 格式化为千分位
  return convertedAmount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// 获取变动金额的样式
const getChangeClass = (change) => {
  if (change > 0) return 'positive-change';
  if (change < 0) return 'negative-change';
  return '';
};

// 页面加载时执行
onMounted(() => {
  // 可以选择自动加载报表，也可以等用户点击按钮
  // generateReport();
});
</script>

<style scoped>
.report-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-card {
  margin-bottom: 20px;
}

.report-card {
  margin-bottom: 20px;
}

.report-title {
  text-align: center;
  margin-bottom: 20px;
}

.report-title h1 {
  font-size: 24px;
  margin-bottom: 10px;
}

.report-title h3 {
  font-size: 16px;
  font-weight: normal;
  margin-bottom: 8px;
}

.report-title h4 {
  font-size: 14px;
  font-weight: normal;
  color: #666;
}

.report-body {
  margin-top: 20px;
}

.report-section {
  margin-bottom: 20px;
}

.report-section h3 {
  margin-bottom: 10px;
  font-size: 16px;
}

.positive-change {
  color: #67C23A;
}

.negative-change {
  color: #F56C6C;
}

.empty-tip {
  padding: 40px 0;
}

/* 打印样式 */
@media print {
  .filter-card,
  .header-actions {
    display: none;
  }
  
  .report-container {
    padding: 0;
  }
  
  .report-card {
    box-shadow: none;
    border: none;
  }
}
</style> 