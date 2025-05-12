<template>
  <div class="aging-container">
    <div class="page-header">
      <h2>应收账款账龄分析</h2>
      <div class="header-actions">
        <el-button type="primary" @click="generateReport">生成报表</el-button>
        <el-button @click="exportExcel" :disabled="!reportData.length">导出Excel</el-button>
        <el-button @click="printReport" :disabled="!reportData.length">打印报表</el-button>
      </div>
    </div>
    
    <!-- 搜索条件区域 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="queryParams" class="search-form">
        <el-form-item label="截止日期" required>
          <el-date-picker
            v-model="queryParams.reportDate"
            type="date"
            placeholder="选择截止日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 180px"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="客户分类">
          <el-select v-model="queryParams.customerType" placeholder="选择客户分类" clearable style="width: 180px">
            <el-option label="全部" value=""></el-option>
            <el-option label="直销客户" value="direct"></el-option>
            <el-option label="经销商" value="distributor"></el-option>
            <el-option label="零售客户" value="retail"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input v-model="queryParams.customerName" placeholder="输入客户名称" clearable style="width: 180px"></el-input>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 报表区域 -->
    <el-card class="report-card" v-loading="loading">
      <div class="report-title" v-if="reportData.length">
        <h1>应收账款账龄分析表</h1>
        <h3>截至：{{ formatDate(queryParams.reportDate) }}</h3>
        <h4>单位：元</h4>
      </div>
      
      <!-- 报表主体 -->
      <div class="report-body" v-if="reportData.length">
        <el-table
          :data="reportData"
          style="width: 100%"
          :summary-method="getSummaries"
          show-summary
          border
        >
          <el-table-column prop="customerName" label="客户名称" width="200" fixed="left"></el-table-column>
          <el-table-column prop="customerType" label="客户类型" width="100">
            <template #default="scope">
              {{ getCustomerTypeText(scope.row.customerType) }}
            </template>
          </el-table-column>
          <el-table-column prop="totalAmount" label="应收金额" width="120" align="right">
            <template #default="scope">
              {{ formatAmount(scope.row.totalAmount) }}
            </template>
          </el-table-column>
          <el-table-column prop="currentAmount" label="未逾期" width="120" align="right">
            <template #default="scope">
              {{ formatAmount(scope.row.currentAmount) }}
            </template>
          </el-table-column>
          <el-table-column prop="within30Days" label="1-30天" width="120" align="right">
            <template #default="scope">
              {{ formatAmount(scope.row.within30Days) }}
            </template>
          </el-table-column>
          <el-table-column prop="within60Days" label="31-60天" width="120" align="right">
            <template #default="scope">
              {{ formatAmount(scope.row.within60Days) }}
            </template>
          </el-table-column>
          <el-table-column prop="within90Days" label="61-90天" width="120" align="right">
            <template #default="scope">
              {{ formatAmount(scope.row.within90Days) }}
            </template>
          </el-table-column>
          <el-table-column prop="over90Days" label="90天以上" width="120" align="right">
            <template #default="scope">
              {{ formatAmount(scope.row.over90Days) }}
            </template>
          </el-table-column>
          <el-table-column label="逾期比例" width="120" align="right">
            <template #default="scope">
              {{ calculateOverduePercentage(scope.row) }}
            </template>
          </el-table-column>
          <el-table-column prop="lastPaymentDate" label="最近收款" width="120"></el-table-column>
          <el-table-column prop="contactPerson" label="联系人" width="120"></el-table-column>
          <el-table-column prop="contactPhone" label="联系电话" width="150"></el-table-column>
        </el-table>
      </div>
      
      <!-- 图表展示 -->
      <div class="chart-container" v-if="reportData.length">
        <div class="chart-title">账龄分析图表</div>
        <div class="charts">
          <div class="chart-item">
            <div ref="pieChart" style="width: 100%; height: 300px;"></div>
          </div>
          <div class="chart-item">
            <div ref="barChart" style="width: 100%; height: 300px;"></div>
          </div>
        </div>
      </div>
      
      <!-- 无数据提示 -->
      <div class="empty-tip" v-if="!loading && !reportData.length">
        <el-empty description='请选择截止日期并点击"生成报表"按钮'></el-empty>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import * as echarts from 'echarts';
import * as XLSX from 'xlsx';

// 查询参数
const queryParams = reactive({
  reportDate: new Date().toISOString().slice(0, 10), // 默认为今天
  customerType: '',
  customerName: ''
});

// 报表数据
const reportData = ref([]);
const loading = ref(false);

// 图表实例
let pieChartInstance = null;
let barChartInstance = null;
const pieChart = ref(null);
const barChart = ref(null);

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

// 格式化金额
const formatAmount = (amount) => {
  if (amount === undefined || amount === null) return '0.00';
  
  // 格式化为千分位
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// 计算逾期比例
const calculateOverduePercentage = (row) => {
  if (!row.totalAmount || row.totalAmount === 0) return '0.00%';
  
  const overdueAmount = row.within30Days + row.within60Days + row.within90Days + row.over90Days;
  const percentage = (overdueAmount / row.totalAmount) * 100;
  
  return percentage.toFixed(2) + '%';
};

// 获取客户类型文本
const getCustomerTypeText = (type) => {
  const typeMap = {
    direct: '直销客户',
    distributor: '经销商',
    retail: '零售客户'
  };
  return typeMap[type] || type;
};

// 获取表格合计
const getSummaries = (param) => {
  const { columns, data } = param;
  const sums = [];
  
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '总计';
      return;
    }
    
    if (index === 1) {
      sums[index] = '';
      return;
    }
    
    const values = data.map(item => Number(item[column.property]) || 0);
    
    if (values.every(value => Number.isNaN(value))) {
      sums[index] = 'N/A';
    } else {
      const sum = values.reduce((prev, curr) => {
        const value = Number(curr);
        if (!Number.isNaN(value)) {
          return prev + value;
        } else {
          return prev;
        }
      }, 0);
      
      if (index === 8) { // 逾期比例列
        const totalAmount = data.reduce((prev, curr) => prev + (curr.totalAmount || 0), 0);
        const overdueAmount = data.reduce((prev, curr) => {
          return prev + (curr.within30Days || 0) + (curr.within60Days || 0) + 
                 (curr.within90Days || 0) + (curr.over90Days || 0);
        }, 0);
        
        const percentage = totalAmount ? (overdueAmount / totalAmount) * 100 : 0;
        sums[index] = percentage.toFixed(2) + '%';
      } else if (index >= 2 && index <= 7) { // 金额列
        sums[index] = formatAmount(sum);
      } else {
        sums[index] = '';
      }
    }
  });
  
  return sums;
};

// 生成报表
const generateReport = async () => {
  if (!queryParams.reportDate) {
    ElMessage.warning('请选择截止日期');
    return;
  }
  
  loading.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/ar/aging`, {
      params: {
        reportDate: queryParams.reportDate,
        customerType: queryParams.customerType,
        customerName: queryParams.customerName
      }
    });
    
    reportData.value = response.data.data;
    
    // 更新图表
    nextTick(() => {
      initCharts();
    });
  } catch (error) {
    console.error('获取账龄分析数据失败:', error);
    ElMessage.error('获取账龄分析数据失败');
  } finally {
    loading.value = false;
  }
};

// 初始化图表
const initCharts = () => {
  // 初始化饼图
  initPieChart();
  
  // 初始化柱状图
  initBarChart();
};

// 初始化饼图
const initPieChart = () => {
  if (!pieChart.value) return;
  
  // 计算各账龄段合计金额
  const totalAmount = reportData.value.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const currentAmount = reportData.value.reduce((sum, item) => sum + (item.currentAmount || 0), 0);
  const within30Days = reportData.value.reduce((sum, item) => sum + (item.within30Days || 0), 0);
  const within60Days = reportData.value.reduce((sum, item) => sum + (item.within60Days || 0), 0);
  const within90Days = reportData.value.reduce((sum, item) => sum + (item.within90Days || 0), 0);
  const over90Days = reportData.value.reduce((sum, item) => sum + (item.over90Days || 0), 0);
  
  // 销毁旧图表
  if (pieChartInstance) {
    pieChartInstance.dispose();
  }
  
  // 创建新图表
  pieChartInstance = echarts.init(pieChart.value);
  
  const pieOption = {
    title: {
      text: '应收账款账龄比例',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: ['未逾期', '1-30天', '31-60天', '61-90天', '90天以上']
    },
    series: [
      {
        name: '账龄分析',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: currentAmount, name: '未逾期' },
          { value: within30Days, name: '1-30天' },
          { value: within60Days, name: '31-60天' },
          { value: within90Days, name: '61-90天' },
          { value: over90Days, name: '90天以上' }
        ]
      }
    ]
  };
  
  pieChartInstance.setOption(pieOption);
};

// 初始化柱状图
const initBarChart = () => {
  if (!barChart.value) return;
  
  // 筛选出有逾期金额的前10名客户
  const top10Customers = [...reportData.value]
    .sort((a, b) => {
      const aOverdue = (a.within30Days || 0) + (a.within60Days || 0) + (a.within90Days || 0) + (a.over90Days || 0);
      const bOverdue = (b.within30Days || 0) + (b.within60Days || 0) + (b.within90Days || 0) + (b.over90Days || 0);
      return bOverdue - aOverdue;
    })
    .slice(0, 10);
  
  // 准备数据
  const customerNames = top10Customers.map(item => item.customerName);
  const within30DaysData = top10Customers.map(item => item.within30Days || 0);
  const within60DaysData = top10Customers.map(item => item.within60Days || 0);
  const within90DaysData = top10Customers.map(item => item.within90Days || 0);
  const over90DaysData = top10Customers.map(item => item.over90Days || 0);
  
  // 销毁旧图表
  if (barChartInstance) {
    barChartInstance.dispose();
  }
  
  // 创建新图表
  barChartInstance = echarts.init(barChart.value);
  
  const barOption = {
    title: {
      text: '逾期TOP10客户账龄分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['1-30天', '31-60天', '61-90天', '90天以上'],
      top: 'bottom'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: customerNames,
      axisLabel: {
        formatter: function(value) {
          if (value.length > 8) {
            return value.substring(0, 8) + '...';
          }
          return value;
        }
      }
    },
    series: [
      {
        name: '1-30天',
        type: 'bar',
        stack: 'total',
        label: {
          show: false
        },
        emphasis: {
          focus: 'series'
        },
        data: within30DaysData
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
        data: within60DaysData
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
        data: within90DaysData
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
        data: over90DaysData
      }
    ]
  };
  
  barChartInstance.setOption(barOption);
};

// 导出Excel
const exportExcel = () => {
  // 创建工作簿和工作表
  const wb = XLSX.utils.book_new();
  
  // 准备导出数据
  const exportData = reportData.value.map(item => {
    return {
      '客户名称': item.customerName,
      '客户类型': getCustomerTypeText(item.customerType),
      '应收金额': item.totalAmount,
      '未逾期': item.currentAmount,
      '1-30天': item.within30Days,
      '31-60天': item.within60Days,
      '61-90天': item.within90Days,
      '90天以上': item.over90Days,
      '逾期比例': calculateOverduePercentage(item),
      '最近收款': item.lastPaymentDate,
      '联系人': item.contactPerson,
      '联系电话': item.contactPhone
    };
  });
  
  // 添加表头
  const ws = XLSX.utils.json_to_sheet(exportData);
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '应收账款账龄分析');
  
  // 生成Excel文件并下载
  XLSX.writeFile(wb, `应收账款账龄分析_${queryParams.reportDate}.xlsx`);
};

// 打印报表
const printReport = () => {
  window.print();
};

// 页面加载时执行
onMounted(() => {
  // 立即生成报表
  // generateReport();
  
  // 监听窗口大小变化，重绘图表
  window.addEventListener('resize', () => {
    if (pieChartInstance) {
      pieChartInstance.resize();
    }
    if (barChartInstance) {
      barChartInstance.resize();
    }
  });
});
</script>

<style scoped>
.aging-container {
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

.chart-container {
  margin-top: 40px;
}

.chart-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
}

.charts {
  display: flex;
  flex-wrap: wrap;
}

.chart-item {
  flex: 1;
  min-width: 500px;
  margin-bottom: 20px;
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
  
  .aging-container {
    padding: 0;
  }
  
  .report-card {
    box-shadow: none;
    border: none;
  }
  
  .chart-container {
    page-break-before: always;
  }
}
</style> 