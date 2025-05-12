<template>
  <div class="inventory-stock-container">
    <div class="page-header">
      <h2>库存查询</h2>
      <el-button type="primary" @click="stockAddDialogVisible = true">
        <el-icon><Plus /></el-icon> 库存调整
      </el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="物料">
          <el-input v-model="searchQuery" placeholder="搜索物料" clearable />
        </el-form-item>
        <el-form-item label="库位">
          <el-select v-model="locationFilter" placeholder="库位" clearable>
            <el-option
              v-for="item in locations"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="物料类别">
          <el-select v-model="categoryFilter" placeholder="物料类别" clearable>
            <el-option
              v-for="item in categories"
              :key="item.id"
              :label="item.name"
              :value="item.id"
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
          <el-button type="warning" @click="handleExport">
            <el-icon><Download /></el-icon> 导出
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
        <div class="stat-value">{{ statistics.totalLocations || 0 }}</div>
        <div class="stat-label">库位数量</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ statistics.lowStock || 0 }}</div>
        <div class="stat-label">低库存预警</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ statistics.outOfStock || 0 }}</div>
        <div class="stat-label">零库存物料</div>
      </el-card>
    </div>
    
    <!-- 数据表格 -->
    <el-card class="data-card">
      <el-table
        :data="tableData"
        border
        style="width: 100%"
        v-loading="loading"
        :max-height="tableHeight"
      >
        <el-table-column prop="material_code" label="物料编码" width="120" />
        <el-table-column prop="material_name" label="物料名称" min-width="150" />
        <el-table-column prop="specification" label="规格" width="250" />
        <el-table-column prop="location_name" label="仓库" width="120" />
        <el-table-column prop="category_name" label="类别" width="120" />
        <el-table-column label="库存数量" width="100">
          <template #default="scope">
            {{ scope.row.quantity === null ? '0' : scope.row.quantity }}
          </template>
        </el-table-column>
        <el-table-column prop="unit_name" label="单位" width="80" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="handleViewDetail(scope.row)">查看明细</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :small="false"
          :disabled="false"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 明细对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="库存明细"
      width="80%"
    >
      <el-descriptions :column="3" border>
        <el-descriptions-item label="物料编码">{{ currentDetail.material_code }}</el-descriptions-item>
        <el-descriptions-item label="物料名称">{{ currentDetail.material_name }}</el-descriptions-item>
        <el-descriptions-item label="规格">{{ currentDetail.specification }}</el-descriptions-item>
        <el-descriptions-item label="当前库存">{{ currentDetail.quantity }} {{ currentDetail.unit_name }}</el-descriptions-item>
        <el-descriptions-item label="仓库">{{ currentDetail.location_name }}</el-descriptions-item>
        <el-descriptions-item label="类别">{{ currentDetail.category_name }}</el-descriptions-item>
      </el-descriptions>

      <el-table :data="detailRecords" border style="margin-top: 20px">
        <el-table-column prop="date" label="日期" width="180" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="quantity" label="数量" width="100" />
        <el-table-column prop="before_quantity" label="变动前数量" width="120" />
        <el-table-column prop="after_quantity" label="变动后数量" width="120" />
        <el-table-column prop="operator" label="操作人" width="120" />
        <el-table-column prop="remark" label="备注" />
      </el-table>
    </el-dialog>

    <!-- 库存调整对话框 -->
    <InventoryStockAdd v-model="stockAddDialogVisible" @success="handleStockAddSuccess" />
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { Search, Download, Plus, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { inventoryApi, baseDataApi } from '@/services/api'
import InventoryStockAdd from './InventoryStockAdd.vue'

// 数据定义
const searchForm = reactive({})
const searchQuery = ref('')
const locationFilter = ref('')
const categoryFilter = ref('')
const locations = ref([])
const categories = ref([])
const tableData = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableHeight = ref('calc(100vh - 350px)')
const materialsList = ref([]) // 物料列表

// 统计数据
const statistics = reactive({
  totalItems: 0,
  totalLocations: 0,
  lowStock: 0,
  outOfStock: 0
})

// 明细相关
const detailDialogVisible = ref(false)
const currentDetail = ref({})
const detailRecords = ref([])
const stockAddDialogVisible = ref(false)

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value,
      location_id: locationFilter.value,
      category_id: categoryFilter.value,
      show_all: true
    }
    const { data } = await inventoryApi.getStocks(params)
    tableData.value = data.items
    total.value = data.total
    
    // 更新统计数据
    updateStatistics()
  } catch (error) {
    ElMessage.error('获取数据失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 更新统计数据
const updateStatistics = async () => {
  try {
    const { data } = await inventoryApi.getStockStatistics()
    statistics.value = {
      totalItems: data.totalItems || 0,
      totalLocations: data.totalLocations || 0,
      lowStock: data.lowStock || 0,
      outOfStock: data.outOfStock || 0
    }
  } catch (error) {
    console.error('获取统计数据失败', error)
    // 设置默认值
    statistics.value = {
      totalItems: 0,
      totalLocations: 0,
      lowStock: 0,
      outOfStock: 0
    }
  }
}

// 获取基础数据
const fetchBaseData = async () => {
  try {
    const [locationsRes, categoriesRes] = await Promise.all([
      inventoryApi.getLocations({ limit: 1000 }),
      baseDataApi.getCategories({ limit: 1000 })
    ])
    locations.value = locationsRes.data.items
    categories.value = categoriesRes.data.items
  } catch (error) {
    ElMessage.error('获取基础数据失败')
    console.error(error)
  }
}

// 获取物料列表
const fetchMaterials = async (query = '') => {
  try {
    const params = {
      search: query,
      category: categoryFilter.value || ''
    }
    const { data } = await inventoryApi.getMaterials(params)
    materialsList.value = data
    return materialsList.value
  } catch (error) {
    ElMessage.error('获取物料列表失败')
    console.error(error)
    return []
  }
}

// 重置搜索条件
const handleReset = () => {
  searchQuery.value = ''
  locationFilter.value = ''
  categoryFilter.value = ''
  fetchData()
}

// 查看明细
const handleViewDetail = async (row) => {
  currentDetail.value = row
  try {
    console.log('查询物料ID:', row.material_id)
    // 使用物料ID查询库存记录
    const materialId = row.material_id
    
    // 先尝试使用物料ID获取记录
    try {
      const { data } = await inventoryApi.getMaterialRecords(materialId)
      detailRecords.value = data || []
      detailDialogVisible.value = true
    } catch (materialError) {
      console.error('通过物料ID获取记录失败，尝试使用库存ID:', materialError)
      // 如果通过物料ID获取失败，尝试使用库存ID
      const { data } = await inventoryApi.getStockRecords(row.id)
      detailRecords.value = data || []
      detailDialogVisible.value = true
    }
  } catch (error) {
    console.error('获取明细失败:', error)
    ElMessage.error('获取明细失败，请确保后端服务已启动')
    // 即使没有记录也显示对话框，但提示没有数据
    detailRecords.value = []
    detailDialogVisible.value = true
  }
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
  fetchData()
}

// 导出
const handleExport = async () => {
  try {
    const response = await inventoryApi.exportStock({
      search: searchQuery.value,
      location: locationFilter.value,
      category: categoryFilter.value
    })
    const blob = response.data
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `库存报表_${new Date().toLocaleDateString()}.xlsx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    ElMessage.error('导出失败')
    console.error(error)
  }
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchData()
}

// 库存调整成功后的处理
const handleStockAddSuccess = () => {
  ElMessage.success('库存调整成功')
  fetchData()
}

// 生命周期
onMounted(() => {
  fetchBaseData()
  fetchData()
})
</script>

<style scoped>
.inventory-stock-container {
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

.search-card {
  margin-bottom: 20px;
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
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>