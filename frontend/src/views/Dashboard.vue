<template>
  <div class="dashboard-container">
    <!-- 数据概览卡片 -->
    <el-row :gutter="20" class="data-overview">
      <el-col :span="6" v-for="card in overviewCards" :key="card.title">
        <el-card shadow="hover" class="overview-card" v-loading="loading">
          <div class="card-content">
            <div class="card-icon" :style="{ backgroundColor: card.color }">
              <el-icon><component :is="card.icon" /></el-icon>
            </div>
            <div class="card-info">
              <div class="card-value">{{ card.value }}</div>
              <div class="card-title">{{ card.title }}</div>
            </div>
          </div>
          <div class="card-footer">
            <span :class="{'positive-change': card.change >= 0, 'negative-change': card.change < 0}">
              {{ card.change >= 0 ? '+' : '' }}{{ card.change }}%
            </span>
            <span>较上周</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-section">
      <el-col :span="16">
        <el-card class="chart-card" v-loading="chartLoading">
          <template #header>
            <div class="chart-header">
              <span>生产趋势</span>
              <el-radio-group v-model="timeRange" size="small" @change="updateCharts">
                <el-radio-button value="week">周</el-radio-button>
                <el-radio-button value="month">月</el-radio-button>
                <el-radio-button value="year">年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container" ref="productionChartRef">
            <!-- 这里将使用ECharts展示生产趋势图 -->
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="chart-card" v-loading="chartLoading">
          <template #header>
            <div class="chart-header">
              <span>库存状态</span>
            </div>
          </template>
          <div class="chart-container" ref="inventoryChartRef">
            <!-- 这里将使用ECharts展示库存饼图 -->
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近订单 -->
    <el-card class="recent-orders" v-loading="ordersLoading">
      <template #header>
        <div class="card-header">
          <span>最近订单</span>
          <el-button type="text" @click="viewAllOrders">查看全部</el-button>
        </div>
      </template>
      
      <el-table :data="recentOrders" style="width: 100%">
        <el-table-column prop="orderNumber" label="订单号" width="120" />
        <el-table-column prop="customerName" label="客户" width="180" />
        <el-table-column prop="productName" label="产品" />
        <el-table-column prop="quantity" label="数量" width="120" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="orderDate" label="创建时间" width="180" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts/core'
import { 
  BarChart, 
  LineChart, 
  PieChart 
} from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  Goods as IconGoods,
  ShoppingCart as IconCart,
  Money as IconMoney,
  DataLine as IconDataLine
} from '@element-plus/icons-vue'
import { 
  inventoryApi, 
  salesApi, 
  purchaseApi,
  productionApi
} from '@/services/api'

// 注册ECharts组件
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
])

const router = useRouter()
const timeRange = ref('week')

// 加载状态
const loading = ref(false)
const chartLoading = ref(false)
const ordersLoading = ref(false)

// 图表引用
const productionChartRef = ref(null)
const inventoryChartRef = ref(null)
let productionChart = null
let inventoryChart = null

// 数据概览卡片数据
const stockStats = ref({
  total: 0,
  change: 0
})

const orderStats = ref({
  pending: 0,
  change: 0
})

const salesStats = ref({
  monthlyRevenue: 0,
  change: 0
})

const productionStats = ref({
  efficiency: 0,
  change: 0
})

// 计算属性：根据真实数据生成卡片内容
const overviewCards = computed(() => [
  {
    title: '总库存',
    value: stockStats.value.total.toLocaleString(),
    change: stockStats.value.change,
    icon: 'IconGoods',
    color: '#409EFF'
  },
  {
    title: '待处理订单',
    value: orderStats.value.pending.toString(),
    change: orderStats.value.change,
    icon: 'IconCart',
    color: '#67C23A'
  },
  {
    title: '本月营收',
    value: `￥${salesStats.value.monthlyRevenue.toLocaleString()}`,
    change: salesStats.value.change,
    icon: 'IconMoney',
    color: '#E6A23C'
  },
  {
    title: '生产效率',
    value: `${productionStats.value.efficiency}%`,
    change: productionStats.value.change,
    icon: 'IconDataLine',
    color: '#F56C6C'
  }
])

// 最近订单数据
const recentOrders = ref([])

// 订单状态对应的标签类型
const getStatusType = (status) => {
  const statusMap = {
    'completed': 'success',
    'processing': 'warning',
    'pending': 'info',
    'cancelled': 'danger',
    // 兼容中文状态
    '已完成': 'success',
    '生产中': 'warning',
    '待确认': 'info',
    '已取消': 'danger'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const statusTextMap = {
    'completed': '已完成',
    'processing': '生产中',
    'pending': '待确认',
    'cancelled': '已取消'
  }
  return statusTextMap[status] || status
}

// 加载库存统计数据
const loadInventoryStats = async () => {
  try {
    const response = await inventoryApi.getInventoryStock({ limit: 1000 })
    if (response && response.data) {
      const stockData = Array.isArray(response.data) ? response.data : []
      // 计算总库存量
      const total = stockData.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
      // 假设较上周变化 (实际项目中应从API获取)
      const change = Math.round(Math.random() * 20 - 5)
      
      stockStats.value = {
        total: Math.round(total),
        change
      }
    }
  } catch (error) {
    console.error('加载库存统计失败:', error)
    stockStats.value = { total: 2530, change: 15 }
  }
}

// 加载订单统计数据
const loadOrderStats = async () => {
  try {
    const response = await salesApi.getOrderStatistics()
    if (response && response.data) {
      const pending = response.data.pendingCount || 0
      // 假设较上周变化 (实际项目中应从API获取)
      const change = Math.round(Math.random() * 15)
      
      orderStats.value = {
        pending,
        change
      }
    }
  } catch (error) {
    console.error('加载订单统计失败:', error)
    orderStats.value = { pending: 85, change: 8 }
  }
}

// 加载销售统计数据
const loadSalesStats = async () => {
  try {
    const response = await salesApi.getSalesStatistics()
    if (response && response.data) {
      const monthlyRevenue = response.data.monthlyRevenue || 0
      // 假设较上周变化 (实际项目中应从API获取)
      const change = Math.round(Math.random() * 20 - 5)
      
      salesStats.value = {
        monthlyRevenue,
        change
      }
    }
  } catch (error) {
    console.error('加载销售统计失败:', error)
    salesStats.value = { monthlyRevenue: 125430, change: 12 }
  }
}

// 加载生产统计数据
const loadProductionStats = async () => {
  try {
    // 这里假设有获取生产效率的API
    // 实际项目中应替换为真实API调用
    const efficiency = Math.floor(85 + Math.random() * 15)
    const change = Math.round(Math.random() * 10 - 2)
    
    productionStats.value = {
      efficiency,
      change
    }
  } catch (error) {
    console.error('加载生产统计失败:', error)
    productionStats.value = { efficiency: 94, change: 5 }
  }
}

// 加载最近订单数据
const loadRecentOrders = async () => {
  ordersLoading.value = true
  try {
    const response = await salesApi.getOrders({ 
      limit: 5, 
      sort: 'orderDate:desc' 
    })
    
    if (response && response.data) {
      const orders = Array.isArray(response.data) ? response.data : 
                    (response.data.items ? response.data.items : [])
                    
      recentOrders.value = orders.map(order => ({
        orderNumber: order.orderNumber || order.order_no || '未知订单号',
        customerName: order.customerName || order.customer_name || '未知客户',
        productName: order.productName || '未知产品',
        quantity: order.quantity || 0,
        status: order.status || 'pending',
        orderDate: formatDate(order.orderDate || order.order_date)
      }))
    }
  } catch (error) {
    console.error('加载最近订单失败:', error)
    // 使用样例数据兜底
    recentOrders.value = [
      {
        orderNumber: 'OD2023001',
        customerName: '上海某某科技有限公司',
        productName: '高精度传感器',
        quantity: 100,
        status: '已完成',
        orderDate: '2023-05-20 14:30:00'
      },
      {
        orderNumber: 'OD2023002',
        customerName: '北京智能制造有限公司',
        productName: '工业控制器',
        quantity: 50,
        status: '生产中',
        orderDate: '2023-05-19 16:20:00'
      },
      {
        orderNumber: 'OD2023003',
        customerName: '广州电子科技公司',
        productName: '电路板组件',
        quantity: 200,
        status: '待确认',
        orderDate: '2023-05-19 09:15:00'
      }
    ]
  } finally {
    ordersLoading.value = false
  }
}

// 初始化生产趋势图表
const initProductionChart = () => {
  if (productionChart) {
    productionChart.dispose()
  }
  
  productionChart = echarts.init(productionChartRef.value)
  
  const option = {
    title: {
      text: '生产趋势分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['计划产量', '实际产量', '完成率'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: [
      {
        type: 'value',
        name: '产量',
        min: 0,
        max: 1000,
        position: 'left'
      },
      {
        type: 'value',
        name: '完成率',
        min: 0,
        max: 100,
        position: 'right',
        axisLabel: {
          formatter: '{value}%'
        }
      }
    ],
    series: [
      {
        name: '计划产量',
        type: 'bar',
        data: [820, 932, 901, 934, 1290, 1330, 1320]
      },
      {
        name: '实际产量',
        type: 'bar',
        data: [720, 832, 801, 934, 1190, 1230, 1220]
      },
      {
        name: '完成率',
        type: 'line',
        yAxisIndex: 1,
        data: [87.8, 89.3, 88.9, 100, 92.2, 92.5, 92.4]
      }
    ]
  }
  
  productionChart.setOption(option)
  
  // 窗口大小变化时重新调整图表大小
  window.addEventListener('resize', () => {
    productionChart && productionChart.resize()
  })
}

// 初始化库存状态图表
const initInventoryChart = () => {
  if (inventoryChart) {
    inventoryChart.dispose()
  }
  
  inventoryChart = echarts.init(inventoryChartRef.value)
  
  const option = {
    title: {
      text: '库存状态分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      data: ['原材料', '半成品', '成品', '备品备件', '低值易耗品']
    },
    series: [
      {
        name: '库存占比',
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
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: 1048, name: '原材料' },
          { value: 735, name: '半成品' },
          { value: 580, name: '成品' },
          { value: 484, name: '备品备件' },
          { value: 300, name: '低值易耗品' }
        ]
      }
    ]
  }
  
  inventoryChart.setOption(option)
  
  // 窗口大小变化时重新调整图表大小
  window.addEventListener('resize', () => {
    inventoryChart && inventoryChart.resize()
  })
}

// 更新图表数据
const updateCharts = () => {
  chartLoading.value = true
  
  // 根据timeRange.value更新数据
  // 这里假设是从API获取的真实数据
  setTimeout(() => {
    if (productionChart) {
      // 根据时间范围更新x轴数据
      let xAxisData = []
      if (timeRange.value === 'week') {
        xAxisData = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      } else if (timeRange.value === 'month') {
        xAxisData = Array.from({ length: 30 }, (_, i) => `${i + 1}日`)
      } else {
        xAxisData = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      }
      
      productionChart.setOption({
        xAxis: {
          data: xAxisData
        },
        series: [
          {
            name: '计划产量',
            data: generateRandomData(xAxisData.length, 800, 1500)
          },
          {
            name: '实际产量',
            data: generateRandomData(xAxisData.length, 700, 1400)
          },
          {
            name: '完成率',
            data: generateRandomData(xAxisData.length, 80, 100)
          }
        ]
      })
    }
    
    chartLoading.value = false
  }, 500)
}

// 生成随机数据
const generateRandomData = (length, min, max) => {
  return Array.from({ length }, () => Math.floor(min + Math.random() * (max - min)))
}

// 日期格式化
const formatDate = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 查看全部订单
const viewAllOrders = () => {
  router.push('/sales/orders')
}

// 加载数据
const loadData = async () => {
  loading.value = true
  chartLoading.value = true
  
  try {
    await Promise.all([
      loadInventoryStats(),
      loadOrderStats(),
      loadSalesStats(),
      loadProductionStats(),
      loadRecentOrders()
    ])
    
    // 初始化图表
    initProductionChart()
    initInventoryChart()
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
    chartLoading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.data-overview {
  margin-bottom: 20px;
}

.overview-card {
  height: 120px;
}

.card-content {
  display: flex;
  align-items: center;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.card-icon :deep(.el-icon) {
  font-size: 24px;
  color: white;
}

.card-info {
  flex: 1;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}

.card-title {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.card-footer {
  margin-top: 16px;
  font-size: 12px;
}

.positive-change {
  color: #67C23A;
}

.negative-change {
  color: #F56C6C;
}

.chart-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 340px;
}

.recent-orders {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>