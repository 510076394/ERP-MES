<template>
  <div class="aging-container">
    <div class="page-header">
      <h2>应付账款账龄分析</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="generateReport" :loading="loading">生成报表</el-button>
        <el-button type="success" @click="exportToExcel" :disabled="!hasData">导出Excel</el-button>
        <el-button type="info" @click="printReport" :disabled="!hasData">打印报表</el-button>
      </div>
    </div>
    
    <!-- 搜索表单 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" ref="searchFormRef" class="search-form">
        <el-form-item label="报表日期" prop="reportDate" required>
          <el-date-picker
            v-model="searchForm.reportDate"
            type="date"
            placeholder="选择报表截止日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="供应商类型">
          <el-select v-model="searchForm.supplierType" placeholder="全部类型" clearable>
            <el-option label="生产物料" value="production"></el-option>
            <el-option label="辅助物料" value="auxiliary"></el-option>
            <el-option label="包装物料" value="packaging"></el-option>
            <el-option label="办公用品" value="office"></el-option>
            <el-option label="服务提供商" value="service"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="供应商名称">
          <el-input v-model="searchForm.supplierName" placeholder="输入供应商名称" clearable></el-input>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 统计卡片 -->
    <div class="statistics-row" v-if="hasData">
      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>总应付账款</span>
          </div>
        </template>
        <div class="stat-value">{{ formatCurrency(summaryData.totalAmount) }}</div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>30天内</span>
          </div>
        </template>
        <div class="stat-value">{{ formatCurrency(summaryData.within30Days) }}</div>
        <div class="stat-percent">{{ calculatePercent(summaryData.within30Days, summaryData.totalAmount) }}%</div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>31-60天</span>
          </div>
        </template>
        <div class="stat-value">{{ formatCurrency(summaryData.days31to60) }}</div>
        <div class="stat-percent">{{ calculatePercent(summaryData.days31to60, summaryData.totalAmount) }}%</div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>61-90天</span>
          </div>
        </template>
        <div class="stat-value">{{ formatCurrency(summaryData.days61to90) }}</div>
        <div class="stat-percent">{{ calculatePercent(summaryData.days61to90, summaryData.totalAmount) }}%</div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>90天以上</span>
          </div>
        </template>
        <div class="stat-value">{{ formatCurrency(summaryData.over90Days) }}</div>
        <div class="stat-percent">{{ calculatePercent(summaryData.over90Days, summaryData.totalAmount) }}%</div>
      </el-card>
    </div>
    
    <!-- 图表展示 -->
    <el-card class="chart-card" v-if="hasData">
      <template #header>
        <div class="card-header">
          <span>账龄分布图</span>
        </div>
      </template>
      <div class="charts-container">
        <div id="pieChart" class="chart"></div>
        <div id="barChart" class="chart"></div>
      </div>
    </el-card>
    
    <!-- 数据表格 -->
    <el-card class="data-card">
      <template #header>
        <div class="card-header">
          <span>应付账款账龄明细</span>
        </div>
      </template>
      
      <div v-if="!hasData" class="empty-container">
        <el-empty description='请选择报表日期并点击"生成报表"按钮'></el-empty>
      </div>
      
      <el-table
        v-else
        :data="tableData"
        style="width: 100%"
        border
        stripe
        :summary-method="getSummaries"
        show-summary
      >
        <el-table-column prop="supplierName" label="供应商名称" min-width="180"></el-table-column>
        <el-table-column prop="supplierType" label="供应商类型" width="120">
          <template #default="scope">
            {{ getSupplierTypeText(scope.row.supplierType) }}
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="应付总额" width="150" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.totalAmount) }}
          </template>
        </el-table-column>
        <el-table-column prop="within30Days" label="30天内" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.within30Days) }}
          </template>
        </el-table-column>
        <el-table-column prop="days31to60" label="31-60天" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.days31to60) }}
          </template>
        </el-table-column>
        <el-table-column prop="days61to90" label="61-90天" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.days61to90) }}
          </template>
        </el-table-column>
        <el-table-column prop="over90Days" label="90天以上" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.over90Days) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="showDetails(scope.row)">查看明细</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 明细对话框 -->
    <el-dialog
      title="应付账款明细"
      v-model="detailsDialogVisible"
      width="800px"
    >
      <el-descriptions title="供应商信息" :column="2" border>
        <el-descriptions-item label="供应商名称">{{ selectedSupplier.supplierName }}</el-descriptions-item>
        <el-descriptions-item label="供应商类型">{{ getSupplierTypeText(selectedSupplier.supplierType) }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ selectedSupplier.contactPerson }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ selectedSupplier.contactPhone }}</el-descriptions-item>
      </el-descriptions>
      
      <div style="margin-top: 20px">
        <h4>未付发票列表</h4>
        <el-table :data="detailsList" border style="width: 100%">
          <el-table-column prop="invoiceNumber" label="发票编号" width="150"></el-table-column>
          <el-table-column prop="invoiceDate" label="发票日期" width="120"></el-table-column>
          <el-table-column prop="dueDate" label="到期日期" width="120"></el-table-column>
          <el-table-column prop="amount" label="发票金额" width="120" align="right">
            <template #default="scope">
              {{ formatCurrency(scope.row.amount) }}
            </template>
          </el-table-column>
          <el-table-column prop="paidAmount" label="已付金额" width="120" align="right">
            <template #default="scope">
              {{ formatCurrency(scope.row.paidAmount) }}
            </template>
          </el-table-column>
          <el-table-column prop="balance" label="未付金额" width="120" align="right">
            <template #default="scope">
              {{ formatCurrency(scope.row.balance) }}
            </template>
          </el-table-column>
          <el-table-column prop="agingDays" label="账龄(天)" width="100" align="center"></el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import * as echarts from 'echarts';

const loading = ref(false);
const tableData = ref([]);
const hasData = computed(() => tableData.value.length > 0);

// 搜索表单
const searchForm = reactive({
  reportDate: new Date().toISOString().slice(0, 10),
  supplierType: '',
  supplierName: ''
});

// 摘要数据
const summaryData = reactive({
  totalAmount: 0,
  within30Days: 0,
  days31to60: 0,
  days61to90: 0,
  over90Days: 0
});

// 明细对话框
const detailsDialogVisible = ref(false);
const selectedSupplier = ref({});
const detailsList = ref([]);

// 格式化货币
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// 计算百分比
const calculatePercent = (value, total) => {
  if (!total) return 0;
  return ((value / total) * 100).toFixed(2);
};

// 获取供应商类型文本
const getSupplierTypeText = (type) => {
  const typeMap = {
    production: '生产物料',
    auxiliary: '辅助物料',
    packaging: '包装物料',
    office: '办公用品',
    service: '服务提供商'
  };
  return typeMap[type] || type;
};

// 生成报表
const generateReport = async () => {
  if (!searchForm.reportDate) {
    ElMessage.warning('请选择报表日期');
    return;
  }
  
  loading.value = true;
  try {
    const params = {
      reportDate: searchForm.reportDate,
      supplierType: searchForm.supplierType,
      supplierName: searchForm.supplierName
    };
    
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/ap/aging`, { params });
    tableData.value = response.data.details;
    
    // 计算汇总数据
    calculateSummary();
    
    // 渲染图表
    nextTick(() => {
      renderCharts();
    });
  } catch (error) {
    console.error('获取账龄分析数据失败:', error);
    ElMessage.error('获取账龄分析数据失败');
  } finally {
    loading.value = false;
  }
};

// 计算汇总数据
const calculateSummary = () => {
  summaryData.totalAmount = 0;
  summaryData.within30Days = 0;
  summaryData.days31to60 = 0;
  summaryData.days61to90 = 0;
  summaryData.over90Days = 0;
  
  tableData.value.forEach(item => {
    summaryData.totalAmount += item.totalAmount;
    summaryData.within30Days += item.within30Days;
    summaryData.days31to60 += item.days31to60;
    summaryData.days61to90 += item.days61to90;
    summaryData.over90Days += item.over90Days;
  });
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
    
    if (index === 1) {
      sums[index] = '';
      return;
    }
    
    const values = tableData.value.map(item => {
      if (column.property === 'totalAmount') return item.totalAmount;
      if (column.property === 'within30Days') return item.within30Days;
      if (column.property === 'days31to60') return item.days31to60;
      if (column.property === 'days61to90') return item.days61to90;
      if (column.property === 'over90Days') return item.over90Days;
      return 0;
    });
    
    if (['totalAmount', 'within30Days', 'days31to60', 'days61to90', 'over90Days'].includes(column.property)) {
      const sum = values.reduce((prev, curr) => {
        const value = Number(curr);
        if (!isNaN(value)) {
          return prev + value;
        } else {
          return prev;
        }
      }, 0);
      
      sums[index] = formatCurrency(sum);
    } else {
      sums[index] = '';
    }
  });
  
  return sums;
};

// 渲染图表
const renderCharts = () => {
  // 饼图
  const pieChart = echarts.init(document.getElementById('pieChart'));
  const pieOption = {
    title: {
      text: '应付账款账龄分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: ['30天内', '31-60天', '61-90天', '90天以上']
    },
    series: [
      {
        name: '账龄分布',
        type: 'pie',
        radius: '60%',
        center: ['50%', '60%'],
        data: [
          { value: summaryData.within30Days, name: '30天内' },
          { value: summaryData.days31to60, name: '31-60天' },
          { value: summaryData.days61to90, name: '61-90天' },
          { value: summaryData.over90Days, name: '90天以上' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        itemStyle: {
          color: function(params) {
            const colorList = ['#91cc75', '#fac858', '#ee6666', '#73c0de'];
            return colorList[params.dataIndex];
          }
        }
      }
    ]
  };
  pieChart.setOption(pieOption);
  
  // 柱状图
  const barChart = echarts.init(document.getElementById('barChart'));
  
  // 获取金额最高的5个供应商
  const top5Suppliers = [...tableData.value]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);
  
  const barOption = {
    title: {
      text: '前5大供应商应付账款',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['30天内', '31-60天', '61-90天', '90天以上'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value) => {
          return value >= 10000 
            ? (value / 10000).toFixed(1) + '万' 
            : value;
        }
      }
    },
    yAxis: {
      type: 'category',
      data: top5Suppliers.map(item => item.supplierName)
    },
    series: [
      {
        name: '30天内',
        type: 'bar',
        stack: 'total',
        label: {
          show: false
        },
        emphasis: {
          focus: 'series'
        },
        data: top5Suppliers.map(item => item.within30Days),
        itemStyle: {
          color: '#91cc75'
        }
      },
      {
        name: '31-60天',
        type: 'bar',
        stack: 'total',
        label: {
          show: false
        },
        emphasis: {
          focus: 'series'
        },
        data: top5Suppliers.map(item => item.days31to60),
        itemStyle: {
          color: '#fac858'
        }
      },
      {
        name: '61-90天',
        type: 'bar',
        stack: 'total',
        label: {
          show: false
        },
        emphasis: {
          focus: 'series'
        },
        data: top5Suppliers.map(item => item.days61to90),
        itemStyle: {
          color: '#ee6666'
        }
      },
      {
        name: '90天以上',
        type: 'bar',
        stack: 'total',
        label: {
          show: false
        },
        emphasis: {
          focus: 'series'
        },
        data: top5Suppliers.map(item => item.over90Days),
        itemStyle: {
          color: '#73c0de'
        }
      }
    ]
  };
  barChart.setOption(barOption);
  
  // 响应窗口大小变化
  window.addEventListener('resize', function() {
    pieChart.resize();
    barChart.resize();
  });
};

// 查看明细
const showDetails = async (supplier) => {
  selectedSupplier.value = supplier;
  
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/ap/aging/details`, {
      params: {
        reportDate: searchForm.reportDate,
        supplierId: supplier.id
      }
    });
    
    detailsList.value = response.data;
    detailsDialogVisible.value = true;
  } catch (error) {
    console.error('获取应付账款明细失败:', error);
    ElMessage.error('获取应付账款明细失败');
  }
};

// 导出到Excel
const exportToExcel = () => {
  window.open(`${import.meta.env.VITE_API_URL}/api/finance/ap/aging/export?reportDate=${searchForm.reportDate}&supplierType=${searchForm.supplierType}&supplierName=${searchForm.supplierName}`);
};

// 打印报表
const printReport = () => {
  ElMessage.info('打印功能待实现');
};

// 初始化
onMounted(() => {
  // 初始加载可以选择不自动生成报表，等用户点击按钮
});
</script>

<style scoped>
.aging-container {
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
  min-width: 180px;
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
}

.stat-percent {
  font-size: 16px;
  color: #606266;
  margin-top: 5px;
}

.chart-card {
  margin-bottom: 20px;
}

.charts-container {
  display: flex;
  flex-wrap: wrap;
}

.chart {
  height: 400px;
  width: 50%;
}

@media (max-width: 1200px) {
  .chart {
    width: 100%;
  }
}

.data-card {
  margin-bottom: 20px;
}

.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style> 