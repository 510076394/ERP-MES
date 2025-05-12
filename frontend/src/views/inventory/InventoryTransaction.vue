<template>
  <div class="inventory-transaction-container">
    <div class="page-header">
      <h2>库存流水报表</h2>
      <div class="header-actions">
        <el-button type="primary" @click="handleExport">
          <el-icon><Download /></el-icon> 导出报表
        </el-button>
      </div>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :shortcuts="dateShortcuts"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="物料名称">
          <el-input v-model="searchForm.materialName" placeholder="输入物料名称" clearable />
        </el-form-item>
        <el-form-item label="流水类型">
          <el-select v-model="searchForm.transactionType" placeholder="选择流水类型" clearable>
            <el-option label="入库" value="inbound" />
            <el-option label="出库" value="outbound" />
            <el-option label="调拨" value="transfer" />
            <el-option label="盘点" value="check" />
            <el-option label="其他" value="other" />
            <el-option label="委外出库" value="outsourced_outbound" />
            <el-option label="委外入库" value="outsourced_inbound" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库位置">
          <el-select v-model="searchForm.locationId" placeholder="选择仓库位置" clearable>
            <el-option 
              v-for="location in locationOptions" 
              :key="location.id" 
              :label="location.name" 
              :value="location.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ statistics.totalTransactions || 0 }}</div>
        <div class="stat-label">流水总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ statistics.inboundCount || 0 }}</div>
        <div class="stat-label">入库数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ statistics.outboundCount || 0 }}</div>
        <div class="stat-label">出库数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatCurrency(statistics.totalAmount) }}</div>
        <div class="stat-label">交易总金额</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ statistics.transferCount || 0 }}</div>
        <div class="stat-label">调拨数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ statistics.checkCount || 0 }}</div>
        <div class="stat-label">盘点数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ statistics.totalQuantity || 0 }}</div>
        <div class="stat-label">总交易数量</div>
      </el-card>
    </div>
    
    <!-- 流水记录列表 -->
    <el-card class="data-card">
      <el-tabs v-model="activeTab" @tab-click="handleTabChange">
        <el-tab-pane label="流水列表" name="list">
          <el-table
            :data="transactionList"
            border
            style="width: 100%"
            v-loading="loading"
            @row-click="handleRowClick"
          >
            <el-table-column prop="transactionNo" label="流水编号" width="150" />
            <el-table-column prop="transactionTime" label="交易时间" width="160">
              <template #default="scope">
                {{ formatDateTime(scope.row.transactionTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="materialCode" label="物料编码" width="150" />
            <el-table-column prop="materialName" label="物料名称" width="200" />
            <el-table-column prop="transactionType" label="流水类型" width="100">
              <template #default="scope">
                <el-tag :type="getTransactionTypeColor(scope.row.transactionType)">
                  {{ getTransactionTypeText(scope.row.transactionType) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="100">
              <template #default="scope">
                <span :class="getQuantityClass(scope.row)">
                  {{ getQuantityPrefix(scope.row) + formatNumber(scope.row.quantity) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="unitName" label="单位" width="60" />
            <el-table-column
              prop="beforeQuantity"
              label="变动前数量"
              width="110"
              align="right">
              <template #default="scope">
                {{ formatNumber(scope.row.beforeQuantity) }}
              </template>
            </el-table-column>
            <el-table-column
              prop="afterQuantity"
              label="变动后数量"
              width="110"
              align="right">
              <template #default="scope">
                {{ formatNumber(scope.row.afterQuantity) }}
              </template>
            </el-table-column>
            <el-table-column
              prop="amount"
              label="金额"
              width="120"
              align="right">
              <template #default="scope">
                {{ formatCurrency(scope.row.amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="locationName" label="仓库位置" width="120" />
            <el-table-column prop="createdBy" label="操作人" width="100" />
            <el-table-column prop="remarks" label="备注" min-width="300" />
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="scope">
                <el-button
                  type="primary"
                  link
                  @click.stop="showTransactionDetail(scope.row)"
                >
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="流水统计" name="stats">
          <div class="chart-container">
            <div class="chart-row">
              <el-card class="chart-card">
                <h3 class="chart-title">
                  <el-icon><PieChart /></el-icon>
                  交易类型分布
                </h3>
                <div class="chart-box" ref="typeChartRef"></div>
              </el-card>
              
              <el-card class="chart-card">
                <h3 class="chart-title">
                  <el-icon><Histogram /></el-icon>
                  交易金额统计
                </h3>
                <div class="chart-box" ref="amountChartRef"></div>
              </el-card>
            </div>
            
            <el-card class="chart-card full-width">
              <h3 class="chart-title">
                <el-icon><TrendCharts /></el-icon>
                交易数量趋势
              </h3>
              <div class="chart-box" ref="trendChartRef"></div>
            </el-card>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
    
    <!-- 交易详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="流水详情"
      width="800px"
      destroy-on-close
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="流水编号">{{ currentTransaction.transactionNo }}</el-descriptions-item>
        <el-descriptions-item label="交易时间">{{ formatDateTime(currentTransaction.transactionTime) }}</el-descriptions-item>
        <el-descriptions-item label="物料编码">{{ currentTransaction.materialCode }}</el-descriptions-item>
        <el-descriptions-item label="物料名称">{{ currentTransaction.materialName }}</el-descriptions-item>
        <el-descriptions-item label="流水类型">
          <el-tag :type="getTransactionTypeColor(currentTransaction.transactionType)">
            {{ getTransactionTypeText(currentTransaction.transactionType) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="数量">
          <span :class="getQuantityClass(currentTransaction)">
            {{ getQuantityPrefix(currentTransaction) + formatNumber(currentTransaction.quantity) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="变动前数量">{{ formatNumber(currentTransaction.beforeQuantity) }}</el-descriptions-item>
        <el-descriptions-item label="变动后数量">{{ formatNumber(currentTransaction.afterQuantity) }}</el-descriptions-item>
        <el-descriptions-item label="金额">{{ formatCurrency(currentTransaction.amount) }}</el-descriptions-item>
        <el-descriptions-item label="单位">{{ currentTransaction.unitName }}</el-descriptions-item>
        <el-descriptions-item label="仓库位置">{{ currentTransaction.locationName }}</el-descriptions-item>
        <el-descriptions-item label="操作人">{{ currentTransaction.createdBy }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">{{ formatDateTime(currentTransaction.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ currentTransaction.remarks || '无' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Search, 
  Refresh, 
  Download, 
  Share, 
  Coin, 
  Timer, 
  TrendCharts, 
  Money, 
  ArrowDown, 
  PieChart, 
  Histogram, 
  List,
  Right,
  Check,
  Goods,
  User
} from '@element-plus/icons-vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart as EchartsPie } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import dayjs from 'dayjs'
import axios from '@/services/api'

// 注册 ECharts 组件
echarts.use([
  BarChart,
  LineChart,
  EchartsPie,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  TitleComponent,
  CanvasRenderer
])

// 页面数据
const loading = ref(false)
const transactionList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const activeTab = ref('list')

// 统计信息
const statistics = ref({
  totalTransactions: 0,
  inboundCount: 0,
  outboundCount: 0,
  transferCount: 0,
  checkCount: 0,
  totalAmount: 0,
  totalQuantity: 0,
  uniqueOperators: 0
})

// 当前选中的交易详情
const detailDialogVisible = ref(false)
const currentTransaction = ref({})

// 图表引用
const typeChartRef = ref(null)
const amountChartRef = ref(null)
const trendChartRef = ref(null)
let typeChart = null
let amountChart = null
let trendChart = null

// 基础数据
const locationOptions = ref([])

// 日期快捷选项
const dateShortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    }
  },
  {
    text: '最近三个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    }
  }
]

// 搜索表单
const searchForm = ref({
  dateRange: [
    dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD')
  ],
  materialName: '',
  transactionType: '',
  locationId: ''
})

// Tab 切换处理
const handleTabChange = (tab) => {
  if (tab.props.name === 'stats') {
    nextTick(() => {
      initCharts()
    })
  }
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
  fetchTransactionList()
}

// 重置搜索
const handleReset = () => {
  searchForm.value = {
    dateRange: [
      dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      dayjs().format('YYYY-MM-DD')
    ],
    materialName: '',
    transactionType: '',
    locationId: ''
  }
  currentPage.value = 1
  fetchTransactionList()
}

// 获取交易列表
const fetchTransactionList = async () => {
  try {
    loading.value = true
    
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      startDate: searchForm.value.dateRange[0],
      endDate: searchForm.value.dateRange[1],
      materialName: searchForm.value.materialName,
      transactionType: searchForm.value.transactionType,
      locationId: searchForm.value.locationId
    }
    
    const response = await axios.get('/inventory/transactions', { params })
    
    // 处理统计数据
    statistics.value = response.data.statistics || {
      totalTransactions: 0,
      inboundCount: 0,
      outboundCount: 0,
      totalAmount: 0
    }
    
    // 处理交易数据
    transactionList.value = response.data.items || []
    
    // 处理变动前后数量
    calculateBeforeAfterQuantity()
    
    total.value = response.data.total || 0
    
  } catch (error) {
    console.error('获取库存流水数据失败:', error)
    ElMessage.error('获取库存流水数据失败')
  } finally {
    loading.value = false
  }
}

// 计算变动前后数量
const calculateBeforeAfterQuantity = () => {
  // 首先检查是否所有记录都已有变动前后数量
  const needCalculation = transactionList.value.some(
    item => item.beforeQuantity === undefined || item.beforeQuantity === null || 
           item.afterQuantity === undefined || item.afterQuantity === null
  );
  
  // 如果所有记录都已有变动前后数量，直接返回
  if (!needCalculation) {
    console.log('所有记录都已有变动前后数量，无需计算');
    return;
  }
  
  console.log('需要计算变动前后数量');
  
  // 按物料ID、位置ID和时间排序
  const sortedList = [...transactionList.value].sort((a, b) => {
    if (a.materialId !== b.materialId) return a.materialId - b.materialId;
    if (a.locationId !== b.locationId) return a.locationId - b.locationId;
    return new Date(a.transactionTime) - new Date(b.transactionTime);
  });
  
  // 用于跟踪每个物料在每个位置的当前库存
  const stockMap = {};
  
  // 处理每条记录
  sortedList.forEach(item => {
    // 组合key，确保每个物料在每个位置都有独立的库存跟踪
    const key = `${item.materialId}_${item.locationId}`;
    
    // 如果记录已经有变动前后数量，无需计算
    if (item.beforeQuantity !== undefined && item.beforeQuantity !== null && 
        item.afterQuantity !== undefined && item.afterQuantity !== null) {
      // 更新stockMap以保持状态一致
      stockMap[key] = item.afterQuantity;
      return;
    }
    
    const quantity = parseFloat(item.quantity || 0);
    const absQuantity = Math.abs(quantity);
    
    // 如果是第一次遇到这个物料位置组合，设置初始库存
    if (stockMap[key] === undefined) {
      // 委外入库和普通入库一样是增加库存，入库前的库存默认为0
      // 委外出库和普通出库一样是减少库存，出库前的库存默认为出库数量
      if (item.transactionType === 'inbound' || 
          item.transactionType === 'outsourced_inbound') {
        stockMap[key] = 0;
      } else if (item.transactionType === 'outbound' || 
                 item.transactionType === 'outsourced_outbound') {
        stockMap[key] = absQuantity;
      } else {
        stockMap[key] = 0; // 其他类型初始库存为0
      }
    }
    
    // 设置变动前数量
    item.beforeQuantity = stockMap[key];
    
    // 更新库存并设置变动后数量
    if (item.transactionType === 'inbound' || 
        item.transactionType === 'outsourced_inbound') {
      stockMap[key] += absQuantity; // 入库增加库存，确保使用绝对值
    } else if (item.transactionType === 'outbound' || 
               item.transactionType === 'outsourced_outbound') {
      stockMap[key] -= absQuantity; // 出库减少库存，确保使用绝对值
    } else if (item.transactionType === 'transfer') {
      stockMap[key] += quantity; // 调拨可能是正数或负数
    } else {
      stockMap[key] += quantity; // 其他类型按实际值调整
    }
    
    item.afterQuantity = stockMap[key];
  });
  
  // 更新交易列表
  transactionList.value.forEach(item => {
    const matchItem = sortedList.find(s => s.id === item.id);
    if (matchItem) {
      item.beforeQuantity = matchItem.beforeQuantity;
      item.afterQuantity = matchItem.afterQuantity;
    }
  });
}

// 获取统计数据
const fetchStatsData = async () => {
  try {
    const params = {
      startDate: searchForm.value.dateRange[0],
      endDate: searchForm.value.dateRange[1],
      materialName: searchForm.value.materialName,
      transactionType: searchForm.value.transactionType,
      locationId: searchForm.value.locationId
    }
    
    const response = await axios.get('/inventory/transactions/stats', { params })
    return response.data
  } catch (error) {
    console.error('获取统计数据失败:', error)
    ElMessage.error('获取统计数据失败')
    return null
  }
}

// 获取基础数据
const fetchBaseData = async () => {
  try {
    // 获取仓库位置
    const locationResponse = await axios.get('/inventory/locations')
    locationOptions.value = locationResponse.data.items || []
  } catch (error) {
    console.error('获取基础数据失败:', error)
  }
}

// 初始化图表
const initCharts = async () => {
  const statsData = await fetchStatsData()
  if (!statsData) return
  
  // 类型分布图表
  if (typeChartRef.value) {
    typeChart = echarts.init(typeChartRef.value)
    typeChart.setOption({
      title: {
        text: '交易类型分布',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        data: statsData.typeDistribution.map(item => item.name)
      },
      series: [
        {
          name: '交易类型',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
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
          data: statsData.typeDistribution
        }
      ]
    })
  }
  
  // 交易金额统计图表
  if (amountChartRef.value) {
    amountChart = echarts.init(amountChartRef.value)
    amountChart.setOption({
      title: {
        text: '交易金额统计',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: '{b}: {c} 元'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: statsData.amountStats.map(item => item.name)
      },
      yAxis: {
        type: 'value',
        name: '金额(元)'
      },
      series: [
        {
          name: '金额',
          type: 'bar',
          barWidth: '60%',
          data: statsData.amountStats.map(item => item.value)
        }
      ]
    })
  }
  
  // 交易趋势图表
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
    trendChart.setOption({
      title: {
        text: '交易数量趋势',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['入库', '出库', '调拨', '盘点', '委外入库', '委外出库'],
        top: 30
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: statsData.trend.dates
      },
      yAxis: {
        type: 'value',
        name: '数量'
      },
      series: [
        {
          name: '入库',
          type: 'line',
          smooth: true,
          stack: 'Total',
          areaStyle: {},
          emphasis: {
            focus: 'series'
          },
          data: statsData.trend.inbound
        },
        {
          name: '出库',
          type: 'line',
          smooth: true,
          stack: 'Total',
          areaStyle: {},
          emphasis: {
            focus: 'series'
          },
          data: statsData.trend.outbound
        },
        {
          name: '调拨',
          type: 'line',
          smooth: true,
          stack: 'Total',
          areaStyle: {},
          emphasis: {
            focus: 'series'
          },
          data: statsData.trend.transfer
        },
        {
          name: '盘点',
          type: 'line',
          smooth: true,
          stack: 'Total',
          areaStyle: {},
          emphasis: {
            focus: 'series'
          },
          data: statsData.trend.check
        },
        {
          name: '委外入库',
          type: 'line',
          smooth: true,
          stack: 'Total',
          areaStyle: {},
          emphasis: {
            focus: 'series'
          },
          data: statsData.trend.outsourced_inbound || []
        },
        {
          name: '委外出库',
          type: 'line',
          smooth: true,
          stack: 'Total',
          areaStyle: {},
          emphasis: {
            focus: 'series'
          },
          data: statsData.trend.outsourced_outbound || []
        }
      ]
    })
  }
}

// 处理窗口大小变化
const handleResize = () => {
  if (typeChart) typeChart.resize()
  if (amountChart) amountChart.resize()
  if (trendChart) trendChart.resize()
}

// 导出报表
const handleExport = async () => {
  try {
    loading.value = true
    
    const params = {
      startDate: searchForm.value.dateRange[0],
      endDate: searchForm.value.dateRange[1],
      materialName: searchForm.value.materialName,
      transactionType: searchForm.value.transactionType,
      locationId: searchForm.value.locationId
    }
    
    const response = await axios.get('/inventory/transactions/export', {
      params,
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data], { type: 'application/vnd.ms-excel' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `库存流水报表_${dayjs().format('YYYYMMDD')}.xlsx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出报表失败:', error)
    ElMessage.error('导出报表失败')
  } finally {
    loading.value = false
  }
}

// 交易类型颜色
const getTransactionTypeColor = (type) => {
  const typeMap = {
    inbound: 'success',
    outbound: 'danger',
    transfer: 'warning',
    check: 'info',
    other: 'default',
    outsourced_outbound: 'danger',
    outsourced_inbound: 'success'
  }
  return typeMap[type] || 'default'
}

// 交易类型文本
const getTransactionTypeText = (type) => {
  const typeMap = {
    inbound: '入库',
    outbound: '出库',
    transfer: '调拨',
    check: '盘点',
    other: '其他',
    outsourced_outbound: '委外出库',
    outsourced_inbound: '委外入库',
    purchase_inbound: '采购入库'
  }
  // 如果有后端传来的transactionTypeName，使用它
  return typeMap[type] || type
}

// 数量显示类
const getQuantityClass = (row) => {
  const type = row.transactionType;
  
  // 入库类型显示绿色
  if (type === 'inbound' || type === 'outsourced_inbound' || type === 'purchase_inbound') {
    return 'increase-text';
  }
  
  // 出库类型显示红色
  if (type === 'outbound' || type === 'outsourced_outbound') {
    return 'decrease-text';
  }
  
  // 调拨和其他类型，根据数量正负决定显示颜色
  const quantity = parseFloat(row.quantity || 0);
  if (quantity > 0) return 'increase-text';
  if (quantity < 0) return 'decrease-text';
  
  return '';
}

// 数量显示前缀
const getQuantityPrefix = (row) => {
  const type = row.transactionType;
  
  // 入库类型显示"+"
  if (type === 'inbound' || type === 'outsourced_inbound' || type === 'purchase_inbound') {
    return '+';
  }
  
  // 出库类型显示"-"
  if (type === 'outbound' || type === 'outsourced_outbound') {
    return '-';
  }
  
  // 调拨和其他类型，根据数量正负决定显示前缀
  const quantity = parseFloat(row.quantity || 0);
  if (quantity > 0) return '+';
  if (quantity < 0) return '';  // 负数不需要前缀，因为已经有负号
  
  return '';
}

// 打开交易详情
const showTransactionDetail = (row) => {
  // 使用服务器提供的变动前后数量数据
  if (row.beforeQuantity !== undefined && row.afterQuantity !== undefined) {
    currentTransaction.value = row
    detailDialogVisible.value = true
    return
  }
  
  // 如果没有变动前后数量数据，设置默认值
  const rowQuantity = parseFloat(row.quantity || 0)
  const absQuantity = Math.abs(rowQuantity)
  
  // 设置默认值
  if (row.transactionType === 'inbound' || row.transactionType === 'outsourced_inbound') {
    row.beforeQuantity = 0
    row.afterQuantity = absQuantity
  } else if (row.transactionType === 'outbound' || row.transactionType === 'outsourced_outbound') {
    row.beforeQuantity = absQuantity
    row.afterQuantity = 0
  } else {
    // 对于其他类型，假设变动前为0
    row.beforeQuantity = 0
    row.afterQuantity = rowQuantity // 可能是正数或负数
  }
  
  currentTransaction.value = row
  detailDialogVisible.value = true
}

// 格式化数字
const formatNumber = (value) => {
  if (value === undefined || value === null) return '0.00'
  return parseFloat(value).toFixed(2)
}

// 格式化货币
const formatCurrency = (value) => {
  if (value === undefined || value === null) return '¥0.00'
  return `¥${parseFloat(value).toFixed(2)}`
}

// 格式化日期时间
const formatDateTime = (datetime) => {
  if (!datetime) return '-'
  return dayjs(datetime).format('YYYY-MM-DD HH:mm:ss')
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchTransactionList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchTransactionList()
}

// 初始化
onMounted(() => {
  fetchBaseData()
  fetchTransactionList()
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 添加点击行事件
const handleRowClick = (row) => {
  showTransactionDetail(row)
}
</script>

<style scoped>
.inventory-transaction-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.search-card {
  margin-bottom: 20px;
  border-radius: 4px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
}

.statistics-row {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 20px;
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
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 5px;
  color: #409EFF;
}

.stat-label {
  font-size: 0.9rem;
  color: #606266;
}

.data-card {
  margin-bottom: 20px;
  border-radius: 4px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.chart-container {
  padding: 15px 0;
}

.chart-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card {
  flex: 1;
  min-height: 350px;
}

.chart-title {
  text-align: center;
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.chart-title .el-icon {
  color: #409EFF;
}

.chart-box {
  height: 300px;
}

.full-width {
  width: 100%;
}

.increase-text {
  color: #67C23A;
  font-weight: 600;
}

.decrease-text {
  color: #F56C6C;
  font-weight: 600;
}

.el-table {
  cursor: pointer;
}

.el-table .el-button--link {
  padding: 2px 0;
}

.el-descriptions {
  margin: 20px 0;
}

.el-descriptions-item__label {
  width: 120px;
  background-color: #f5f7fa;
}

.el-descriptions-item__content {
  padding: 12px 15px;
}
</style>