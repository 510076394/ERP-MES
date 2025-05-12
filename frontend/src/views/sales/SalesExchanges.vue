<template>
  <div class="exchanges-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>销售换货管理</h2>
      <el-button type="primary" @click="handleView">
        <el-icon><Plus /></el-icon> 增加换货单
      </el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" class="search-form">
        <el-form-item label="换货单号/客户">
          <el-input
            v-model="searchQuery"
            placeholder="换货单号/订单号/客户名称"
            @keyup.enter="handleSearch"
            clearable
          ></el-input>
        </el-form-item>
        
        <el-form-item label="换货状态">
          <el-select v-model="statusFilter" placeholder="换货状态" clearable @change="handleSearch" style="width: 100%">
            <el-option
              v-for="item in exchangeStatuses"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="handleSearch"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><Refresh /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计卡片 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ exchangeStats.total }}</div>
        <div class="stat-label">全部换货</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ exchangeStats.pending }}</div>
        <div class="stat-label">待处理</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ exchangeStats.processing }}</div>
        <div class="stat-label">处理中</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ exchangeStats.completed }}</div>
        <div class="stat-label">已完成</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ exchangeStats.rejected }}</div>
        <div class="stat-label">已拒绝</div>
      </el-card>
    </div>

    <!-- 换货单表格 -->
    <el-card class="data-card">
      <el-table 
        :data="exchangeRecords" 
        border
        style="width: 100%" 
        v-loading="loading"
        :max-height="tableHeight"
        table-layout="fixed"
      >
        <el-table-column type="expand" width="50">
          <template #default="props">
            <div class="exchange-detail">
              <el-descriptions :column="3" border>
                <el-descriptions-item label="原订单号">{{ props.row.orderNo }}</el-descriptions-item>
                <el-descriptions-item label="客户名称">{{ props.row.customerName }}</el-descriptions-item>
                <el-descriptions-item label="换货日期">{{ formatDate(props.row.exchangeDate) }}</el-descriptions-item>
                <el-descriptions-item label="换货原因" :span="3">{{ props.row.reason || '无' }}</el-descriptions-item>
              </el-descriptions>
              
              <div class="products-title">换货物品</div>
              <el-table :data="props.row.items || []" border style="width: 100%" table-layout="fixed">
                <el-table-column prop="productCode" label="产品编码" width="120" />
                <el-table-column prop="productName" label="产品名称" />
                <el-table-column prop="specification" label="规格" />
                <el-table-column prop="quantity" label="数量" width="100" />
                <el-table-column prop="exchangeReason" label="换货原因" />
              </el-table>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="id" label="换货单号" width="150" fixed />
        <el-table-column prop="orderNo" label="原订单号" width="150" />
        <el-table-column prop="customerName" label="客户名称" min-width="150" />
        <el-table-column prop="exchangeDate" label="换货日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.exchangeDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="换货原因" min-width="150" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <div class="table-operations">
              <div class="operation-group">
                <el-button link type="primary" size="small" @click="handleView(scope.row)">
                  <el-icon><View /></el-icon>查看
                </el-button>
              </div>
              
              <div class="operation-group">
                <el-button link type="warning" size="small" @click="handleProcess(scope.row)" :disabled="scope.row.status !== '待处理'">
                  <el-icon><Tools /></el-icon>处理
                </el-button>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from '@/services/api'
import { salesApi } from '@/services/api'
import { Search, Refresh, Plus, View, Tools } from '@element-plus/icons-vue'

const loading = ref(false)
const exchangeRecords = ref([
  {
    id: 'EXC001',
    orderNo: 'ORD001',
    customerName: '张三',
    exchangeDate: '2023-05-07',
    reason: '尺寸不合适',
    status: '待处理'
  },
  {
    id: 'EXC002',
    orderNo: 'ORD002',
    customerName: '李四',
    exchangeDate: '2023-05-08',
    reason: '颜色不满意',
    status: '已完成'
  }
])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(2)
const tableHeight = ref('calc(100vh - 280px)')
const searchQuery = ref('')
const statusFilter = ref('')
const dateRange = ref([])

// 换货单统计数据
const exchangeStats = ref({
  total: 2,
  pending: 1,
  processing: 0,
  completed: 1,
  rejected: 0
})

// 状态映射
const exchangeStatuses = [
  { value: '待处理', label: '待处理' },
  { value: '处理中', label: '处理中' },
  { value: '已完成', label: '已完成' },
  { value: '已拒绝', label: '已拒绝' }
]

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    '待处理': 'info',
    '处理中': 'warning',
    '已完成': 'success',
    '已拒绝': 'danger'
  }
  return statusMap[status] || 'info'
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

// 计算统计数据
const calculateExchangeStats = () => {
  const stats = {
    total: exchangeRecords.value.length,
    pending: 0,
    processing: 0,
    completed: 0,
    rejected: 0
  }
  
  exchangeRecords.value.forEach(record => {
    if (record.status === '待处理') stats.pending++
    else if (record.status === '处理中') stats.processing++
    else if (record.status === '已完成') stats.completed++
    else if (record.status === '已拒绝') stats.rejected++
  })
  
  exchangeStats.value = stats
}

// 搜索方法
const handleSearch = () => {
  currentPage.value = 1
  fetchData()
}

// 重置搜索方法
const resetSearch = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  dateRange.value = []
  fetchData()
}

// 获取换货单数据
const fetchData = async () => {
  loading.value = true
  try {
    // 模拟API调用
    setTimeout(() => {
      // 假数据
      exchangeRecords.value = [
        {
          id: 'EXC001',
          orderNo: 'ORD001',
          customerName: '张三',
          exchangeDate: '2023-05-07',
          reason: '尺寸不合适',
          status: '待处理'
        },
        {
          id: 'EXC002',
          orderNo: 'ORD002',
          customerName: '李四',
          exchangeDate: '2023-05-08',
          reason: '颜色不满意',
          status: '已完成'
        }
      ]
      total.value = exchangeRecords.value.length
      calculateExchangeStats()
      loading.value = false
    }, 500)
  } catch (error) {
    ElMessage.error('获取换货单数据失败')
    loading.value = false
  }
}

// 在组件挂载时获取数据
onMounted(() => {
  fetchData()
})

const handleView = (row) => {
  ElMessageBox.alert(`换货单号：${row.id}<br>原订单号：${row.orderNo}<br>客户：${row.customerName}<br>换货日期：${row.exchangeDate}<br>换货原因：${row.reason}`, '换货单详情', {
    dangerouslyUseHTMLString: true
  })
}

const handleProcess = (row) => {
  ElMessageBox.confirm('确定要处理此换货单吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    ElMessage.success(`换货单 ${row.id} 已开始处理`)
    row.status = '处理中'
    calculateExchangeStats()
  }).catch(() => {})
}
</script>

<style scoped>
.exchanges-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.search-card {
  margin-bottom: 16px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.action-buttons {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.statistics-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 200px;
  text-align: center;
  padding: 16px;
  transition: all 0.3s;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.data-card {
  margin-bottom: 20px;
}

.table-operations {
  display: flex;
  gap: 8px;
}

.operation-group {
  display: flex;
  gap: 4px;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.exchange-detail {
  padding: 16px;
}

.products-title {
  margin: 16px 0;
  font-weight: bold;
  font-size: 16px;
}
</style>