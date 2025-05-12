<template>
  <div class="inventory-report-container">
    <div class="page-header">
      <h2>库存报表</h2>
      <div class="header-actions">
        <el-button type="primary" @click="handleExport">
          导出报表
        </el-button>
      </div>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="报表类型">
          <el-select v-model="searchForm.reportType" placeholder="选择报表类型" clearable @change="handleReportTypeChange">
            <el-option label="库存汇总报表" value="summary" />
            <el-option label="库存分布报表" value="location" />
            <el-option label="库存价值报表" value="value" />
            <el-option label="低库存预警" value="warning" />
          </el-select>
        </el-form-item>
        <el-form-item label="物料名称">
          <el-input v-model="searchForm.materialName" placeholder="输入物料名称" clearable />
        </el-form-item>
        <el-form-item label="物料类别">
          <el-select v-model="searchForm.categoryId" placeholder="选择物料类别" clearable>
            <el-option 
              v-for="category in categoryOptions" 
              :key="category.id" 
              :label="category.name" 
              :value="category.id" 
            />
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
            查询
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ statistics.totalItems || 0 }}</div>
        <div class="stat-label">物料种类</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatCurrency(statistics.totalValue) }}</div>
        <div class="stat-label">库存总价值</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ statistics.totalLocations || 0 }}</div>
        <div class="stat-label">库位数量</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ statistics.lowStock || 0 }}</div>
        <div class="stat-label">低库存预警</div>
      </el-card>
    </div>

    <!-- 汇总报表 -->
    <el-card class="data-card" v-if="searchForm.reportType === 'summary'">
      <h3 class="card-title">
        库存汇总报表
      </h3>
      <el-table
        :data="reportData"
        border
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="materialCode" label="物料编码" width="170" />
        <el-table-column prop="materialName" label="物料名称" width="229" />
        <el-table-column prop="specification" label="规格" width="250" />
        <el-table-column prop="categoryName" label="类别" width="150" />
        <el-table-column prop="quantity" label="库存数量" width="150">
          <template #default="scope">
            {{ formatNumber(scope.row.quantity) }}
          </template>
        </el-table-column>
        <el-table-column prop="unitName" label="单位" width="60" />
        <el-table-column prop="unitPrice" label="单价" width="120">
          <template #default="scope">
            {{ formatCurrency(scope.row.unitPrice) }}
          </template>
        </el-table-column>
        <el-table-column prop="totalValue" label="总价值" width="150">
          <template #default="scope">
            {{ formatCurrency(scope.row.totalValue) }}
          </template>
        </el-table-column>
        <el-table-column prop="safetyStock" label="安全库存" width="120" />
        <el-table-column prop="stockStatus" label="库存状态" width="150">
          <template #default="scope">
            <el-tag :type="getStockStatusType(scope.row)">
              {{ getStockStatusText(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 库存分布报表 -->
    <el-card class="data-card" v-if="searchForm.reportType === 'location'">
      <h3 class="card-title">
        库存分布报表
      </h3>
      <el-table
        :data="reportData"
        border
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="materialCode" label="物料编码" width="120" />
        <el-table-column prop="materialName" label="物料名称" width="180" />
        <el-table-column prop="specification" label="规格" width="120" />
        <el-table-column prop="locationName" label="仓库位置" width="120" />
        <el-table-column prop="quantity" label="库存数量" width="100">
          <template #default="scope">
            {{ formatNumber(scope.row.quantity) }}
          </template>
        </el-table-column>
        <el-table-column prop="unitName" label="单位" width="80" />
        <el-table-column prop="storageConditions" label="存储条件" width="150" />
        <el-table-column prop="lastMoveDate" label="最后移动日期" width="150">
          <template #default="scope">
            {{ formatDate(scope.row.lastMoveDate) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 库存价值报表 -->
    <el-card class="data-card" v-if="searchForm.reportType === 'value'">
      <h3 class="card-title">
        库存价值报表
      </h3>
      <el-table
        :data="reportData"
        border
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="categoryName" label="物料类别" width="120" />
        <el-table-column prop="materialCount" label="物料数量" width="100" />
        <el-table-column prop="totalQuantity" label="总库存量" width="100">
          <template #default="scope">
            {{ formatNumber(scope.row.totalQuantity) }}
          </template>
        </el-table-column>
        <el-table-column prop="totalValue" label="总价值" width="150">
          <template #default="scope">
            {{ formatCurrency(scope.row.totalValue) }}
          </template>
        </el-table-column>
        <el-table-column prop="valuePercent" label="价值占比" width="150">
          <template #default="scope">
            <div class="value-percent">
              <span>{{ formatPercent(scope.row.valuePercent) }}</span>
              <el-progress :percentage="scope.row.valuePercent" :format="() => ''" />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="avgUnitPrice" label="平均单价" width="120">
          <template #default="scope">
            {{ formatCurrency(scope.row.avgUnitPrice) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 低库存预警报表 -->
    <el-card class="data-card" v-if="searchForm.reportType === 'warning'">
      <h3 class="card-title">
        低库存预警报表
      </h3>
      <el-table
        :data="reportData"
        border
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="materialCode" label="物料编码" width="120" />
        <el-table-column prop="materialName" label="物料名称" width="180" />
        <el-table-column prop="specification" label="规格" width="120" />
        <el-table-column prop="quantity" label="当前库存" width="100">
          <template #default="scope">
            {{ formatNumber(scope.row.quantity) }}
          </template>
        </el-table-column>
        <el-table-column prop="safetyStock" label="安全库存" width="100">
          <template #default="scope">
            {{ formatNumber(scope.row.safetyStock) }}
          </template>
        </el-table-column>
        <el-table-column prop="gap" label="差额" width="100">
          <template #default="scope">
            <span :class="scope.row.gap < 0 ? 'danger-text' : ''">
              {{ formatNumber(scope.row.gap) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="unitName" label="单位" width="80" />
        <el-table-column prop="warningLevel" label="预警等级" width="100">
          <template #default="scope">
            <el-tag :type="getWarningLevelType(scope.row)">
              {{ getWarningLevelText(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="suggestedPurchase" label="建议采购" width="100">
          <template #default="scope">
            {{ formatNumber(scope.row.suggestedPurchase) }}
          </template>
        </el-table-column>
        <el-table-column prop="lastPurchaseDate" label="最后采购日期" width="150">
          <template #default="scope">
            {{ formatDate(scope.row.lastPurchaseDate) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import axios from '@/services/api'

// 页面数据
const loading = ref(false)
const reportData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 统计信息
const statistics = ref({
  totalItems: 0,
  totalValue: 0,
  totalLocations: 0,
  lowStock: 0
})

// 基础数据
const categoryOptions = ref([])
const locationOptions = ref([])

// 搜索表单
const searchForm = ref({
  reportType: 'summary',
  materialName: '',
  categoryId: '',
  locationId: ''
})

// 报表类型变更
const handleReportTypeChange = () => {
  currentPage.value = 1
  fetchReportData()
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
  fetchReportData()
}

// 重置搜索
const handleReset = () => {
  searchForm.value = {
    reportType: 'summary',
    materialName: '',
    categoryId: '',
    locationId: ''
  }
  currentPage.value = 1
  fetchReportData()
}

// 获取报表数据
const fetchReportData = async () => {
  try {
    loading.value = true
    
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      reportType: searchForm.value.reportType,
      materialName: searchForm.value.materialName,
      categoryId: searchForm.value.categoryId,
      locationId: searchForm.value.locationId
    }
    
    const response = await axios.get('/inventory/report', { params })
    
    // 处理统计数据
    statistics.value = response.data.statistics || {
      totalItems: 0,
      totalValue: 0,
      totalLocations: 0,
      lowStock: 0
    }
    
    // 处理报表数据
    reportData.value = response.data.items || []
    total.value = response.data.total || 0
    
  } catch (error) {
    console.error('获取报表数据失败:', error)
    ElMessage.error('获取报表数据失败')
  } finally {
    loading.value = false
  }
}

// 获取基础数据
const fetchBaseData = async () => {
  try {
    // 获取物料类别
    const categoryResponse = await axios.get('/baseData/categories')
    categoryOptions.value = categoryResponse.data.items || []
    
    // 获取仓库位置
    const locationResponse = await axios.get('/inventory/locations')
    locationOptions.value = locationResponse.data.items || []
  } catch (error) {
    console.error('获取基础数据失败:', error)
  }
}

// 导出报表
const handleExport = async () => {
  try {
    const response = await axios.get('/inventory/report/export', {
      params: {
        reportType: searchForm.value.reportType,
        materialName: searchForm.value.materialName,
        categoryId: searchForm.value.categoryId,
        locationId: searchForm.value.locationId
      },
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data], { type: 'application/vnd.ms-excel' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `库存${getReportTypeText()}_${dayjs().format('YYYYMMDD')}.xlsx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('导出报表失败:', error)
    ElMessage.error('导出报表失败')
  }
}

// 获取报表类型文本
const getReportTypeText = () => {
  const typeMap = {
    summary: '汇总报表',
    location: '分布报表',
    value: '价值报表',
    warning: '预警报表'
  }
  return typeMap[searchForm.value.reportType] || '报表'
}

// 格式化数字
const formatNumber = (number) => {
  if (number === undefined || number === null) return '-'
  return Number(number).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 格式化货币
const formatCurrency = (number) => {
  if (number === undefined || number === null) return '-'
  return `¥ ${Number(number).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// 格式化百分比
const formatPercent = (number) => {
  if (number === undefined || number === null) return '-'
  return `${Number(number).toFixed(2)}%`
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

// 库存状态类型
const getStockStatusType = (row) => {
  if (row.quantity <= 0) return 'danger'
  if (row.quantity < row.safetyStock) return 'warning'
  return 'success'
}

// 库存状态文本
const getStockStatusText = (row) => {
  if (row.quantity <= 0) return '缺货'
  if (row.quantity < row.safetyStock) return '低库存'
  return '正常'
}

// 预警等级类型
const getWarningLevelType = (row) => {
  const ratio = row.quantity / row.safetyStock
  if (ratio <= 0.3) return 'danger'
  if (ratio <= 0.7) return 'warning'
  return 'info'
}

// 预警等级文本
const getWarningLevelText = (row) => {
  const ratio = row.quantity / row.safetyStock
  if (ratio <= 0.3) return '紧急'
  if (ratio <= 0.7) return '警告'
  return '关注'
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchReportData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchReportData()
}

// 初始化
onMounted(() => {
  fetchBaseData()
  fetchReportData()
})
</script>

<style scoped>
.inventory-report-container {
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
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.stat-card {
  flex: 1;
  min-width: 150px;
  text-align: center;
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  padding-top: 15px;
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

.card-title {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.value-percent {
  display: flex;
  flex-direction: column;
}

.danger-text {
  color: #F56C6C;
}
</style> 