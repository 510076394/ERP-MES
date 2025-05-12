<template>
  <div class="production-management">
    <div class="page-header">
      <h2>生产管理</h2>
      <div>
        <el-button type="primary" @click="showCreateModal">
          <el-icon><Plus /></el-icon>新建生产计划
        </el-button>
        <el-button type="primary" @click="goToTasks">
          <el-icon><List /></el-icon>生产任务
        </el-button>
      </div>
    </div>
    
    <!-- 搜索区域 -->
    <div class="search-bar">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="计划编号">
          <el-input v-model="searchForm.code" placeholder="搜索计划编号" clearable/>
        </el-form-item>
        <el-form-item label="产品">
          <el-input v-model="searchForm.product" placeholder="搜索产品" clearable/>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="生产状态" clearable>
            <el-option label="未开始" value="draft" />
            <el-option label="生产中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>查询
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><Refresh /></el-icon>重置
          </el-button>
          <el-button type="warning" @click="handleExport">
            <el-icon><Download /></el-icon>导出
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 统计信息 -->
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-number">{{ productionStats.total || 0 }}</div>
        <div class="stat-label">计划总数</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">{{ productionStats.draft || 0 }}</div>
        <div class="stat-label">未开始</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">{{ productionStats.inProgress || 0 }}</div>
        <div class="stat-label">生产中</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">{{ productionStats.completed || 0 }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">{{ productionStats.cancelled || 0 }}</div>
        <div class="stat-label">已取消</div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="data-table">
      <el-table
        :data="planList"
        border
        style="width: 100%"
        v-loading="loading"
        :max-height="tableHeight"
      >
        <el-table-column prop="code" label="计划编号" width="150" />
        <el-table-column prop="name" label="计划名称" min-width="150" />
        <el-table-column prop="planDate" label="计划日期" width="120" />
        <el-table-column prop="productName" label="产品名称" width="150" />
        <el-table-column prop="quantity" label="计划数量" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="BOM" width="100">
          <template #default="scope">
            <el-link 
              type="primary" 
              @click="showBomDetail(scope.row.productId)"
            >
              查看BOM
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="showPlanDetail(scope.row)">查看</el-button>
            <el-button 
              size="small" 
              type="primary" 
              @click="handleEdit(scope.row)"
              v-if="scope.row.status === 'draft'"
            >
              编辑
            </el-button>
            <el-dropdown v-if="scope.row.status !== 'cancelled' && scope.row.status !== 'completed'">
              <el-button size="small" type="success">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="startProduction(scope.row)" v-if="scope.row.status === 'draft'">开始生产</el-dropdown-item>
                  <el-dropdown-item @click="completePlan(scope.row)" v-if="scope.row.status === 'in_progress'">完成计划</el-dropdown-item>
                  <el-dropdown-item @click="cancelPlan(scope.row)">取消计划</el-dropdown-item>
                  <el-dropdown-item @click="handleDelete(scope.row)" v-if="scope.row.status === 'draft'" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
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
    </div>

    <!-- 新建/编辑生产计划对话框 -->
    <el-dialog
      v-model="modalVisible"
      :title="modalTitle"
      width="60%"
      @close="handleModalCancel"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="计划编号" prop="code">
          <el-input v-model="formData.code" placeholder="请输入计划编号" />
        </el-form-item>
        
        <el-form-item label="计划名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入计划名称" />
        </el-form-item>

        <el-form-item label="计划日期" prop="planDate">
          <el-date-picker
            v-model="formData.planDate"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="产品" prop="productId">
          <el-select
            v-model="formData.productId"
            placeholder="请选择产品"
            style="width: 100%"
            @change="handleProductChange"
          >
            <el-option
              v-for="product in productList"
              :key="product.id"
              :label="product.code + ' - ' + product.name"
              :value="product.id"
              :disabled="!product.hasBom"
            >
              <span>{{ product.code }} - {{ product.name }}</span>
              <el-tag v-if="!product.hasBom" type="danger" size="small" style="margin-left: 8px">
                无BOM
              </el-tag>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="计划数量" prop="quantity">
          <el-input-number
            v-model="formData.quantity"
            :min="1"
            style="width: 100%"
            @change="calculateMaterials"
          />
        </el-form-item>

        <el-divider>原材料需求</el-divider>

        <el-table
          :data="materialList"
          border
          style="width: 100%"
        >
          <el-table-column prop="code" label="物料编码" width="120" />
          <el-table-column prop="name" label="物料名称" min-width="150" />
          <el-table-column prop="requiredQuantity" label="需求数量" width="100" />
          <el-table-column prop="unit" label="单位" width="80" />
          <el-table-column prop="stockQuantity" label="当前库存" width="100">
            <template #default="scope">
              <span :class="{ 'text-danger': scope.row.stockQuantity < scope.row.requiredQuantity }">
                {{ scope.row.stockQuantity }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="库存状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.stockQuantity >= scope.row.requiredQuantity ? 'success' : 'danger'">
                {{ scope.row.stockQuantity >= scope.row.requiredQuantity ? '库存充足' : '库存不足' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleModalCancel">取消</el-button>
          <el-button type="primary" @click="handleModalOk">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- BOM详情对话框 -->
    <el-dialog
      v-model="bomModalVisible"
      title="BOM详情"
      width="60%"
    >
      <template v-if="currentBom">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="产品名称">{{ currentBom.product_name }}</el-descriptions-item>
          <el-descriptions-item label="产品编码">{{ currentBom.product_code }}</el-descriptions-item>
          <el-descriptions-item label="BOM版本">{{ currentBom.version }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ currentBom.status === 1 ? '启用' : '禁用' }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider>物料清单</el-divider>
        
        <el-table
          :data="currentBom.details"
          border
          style="width: 100%"
        >
          <el-table-column prop="material_code" label="物料编码" width="120" />
          <el-table-column prop="material_name" label="物料名称" min-width="150" />
          <el-table-column label="数量" width="120">
            <template #default="scope">
              {{ scope.row.quantity }} {{ scope.row.unit_name }}
            </template>
          </el-table-column>
          <el-table-column prop="unit_name" label="单位" width="80" />
        </el-table>
      </template>
    </el-dialog>

    <!-- 计划详情弹窗 -->
    <el-dialog
      v-model="planDetailVisible"
      title="计划详情"
      width="60%"
    >
      <template v-if="currentPlan">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="计划编号">{{ currentPlan.code }}</el-descriptions-item>
          <el-descriptions-item label="计划名称">{{ currentPlan.name }}</el-descriptions-item>
          <el-descriptions-item label="计划日期">{{ currentPlan.start_date }} - {{ currentPlan.end_date }}</el-descriptions-item>
          <el-descriptions-item label="产品">{{ currentPlan.productName }}</el-descriptions-item>
          <el-descriptions-item label="数量">{{ currentPlan.quantity }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ getStatusText(currentPlan.status) }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider>物料清单</el-divider>
        
        <el-table
          :data="currentPlan.materials"
          border
          style="width: 100%"
        >
          <el-table-column prop="code" label="物料编码" width="120" />
          <el-table-column prop="name" label="物料名称" min-width="150" />
          <el-table-column prop="requiredQuantity" label="需求数量" width="100" />
          <el-table-column prop="unit" label="单位" width="80" />
          <el-table-column prop="stockQuantity" label="当前库存" width="100">
            <template #default="scope">
              <span :class="{ 'text-danger': scope.row.stockQuantity < scope.row.requiredQuantity }">
                {{ scope.row.stockQuantity }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="库存状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.stockQuantity >= scope.row.requiredQuantity ? 'success' : 'danger'">
                {{ scope.row.stockQuantity >= scope.row.requiredQuantity ? '库存充足' : '库存不足' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Search, Download, Plus, List, Refresh, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { productionApi } from '@/services/api'
import axios from '@/services/api'
import { useRouter } from 'vue-router'

// 路由实例
const router = useRouter()

// 数据定义
const loading = ref(false)
const planList = ref([])
const productList = ref([])
const materialList = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableHeight = ref('calc(100vh - 280px)')
const searchForm = ref({
  code: '',
  product: '',
  status: ''
})

// 表单相关
const modalVisible = ref(false)
const modalTitle = ref('新建生产计划')
const formRef = ref()
const formData = ref({
  code: '',
  name: '',
  planDate: null,
  productId: undefined,
  quantity: 1,
  bomId: null
})

// BOM详情相关
const bomModalVisible = ref(false)
const currentBom = ref(null)

// 计划详情相关
const planDetailVisible = ref(false)
const currentPlan = ref(null)

// 表单验证规则
const rules = {
  code: [{ required: true, message: '请输入计划编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
  planDate: [{ required: true, message: '请选择计划日期', trigger: 'change' }],
  productId: [{ required: true, message: '请选择产品', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入计划数量', trigger: 'change' }]
}

// 状态映射
const statusMap = {
  draft: { type: 'info', text: '未开始' },
  preparing: { type: 'warning', text: '配料中' },
  in_progress: { type: 'warning', text: '生产中' },
  completed: { type: 'success', text: '已完成' },
  cancelled: { type: 'danger', text: '已取消' }
}

// 获取状态样式
const getStatusType = (status) => {
  return statusMap[status]?.type || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  return statusMap[status]?.text || status
}

// 添加生产统计数据
const productionStats = ref({
  total: 0,
  draft: 0,
  inProgress: 0,
  completed: 0,
  cancelled: 0
});

// 重置搜索方法
const resetSearch = () => {
  searchForm.value.code = '';
  searchForm.value.product = '';
  searchForm.value.status = '';
  handleSearch();
};

// 计算统计数据
const calculateStats = () => {
  const stats = {
    total: planList.value.length,
    draft: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0
  };
  
  planList.value.forEach(plan => {
    if (plan.status === 'draft') stats.draft++;
    else if (plan.status === 'in_progress') stats.inProgress++;
    else if (plan.status === 'completed') stats.completed++;
    else if (plan.status === 'cancelled') stats.cancelled++;
  });
  
  productionStats.value = stats;
};

// 获取生产计划列表
const fetchPlanList = async () => {
  loading.value = true
  try {
    const response = await productionApi.getProductionPlans({
      page: currentPage.value,
      pageSize: pageSize.value,
      ...searchForm.value
    })
    planList.value = await Promise.all(response.data.items.map(async item => {
  try {
    const bomResponse = await axios.get('/baseData/boms', {
      params: { product_id: item.productId }
    })
    const hasBom = bomResponse.data && bomResponse.data.data && bomResponse.data.data.length > 0
    return {
      ...item,
      bomId: hasBom ? bomResponse.data.data[0].id : null
    }
  } catch (error) {
    console.error(`获取产品 ${item.productId} 的BOM信息失败:`, error)
    return {
      ...item,
      bomId: null
    }
  }
}))
    total.value = response.data.total
    
    // 计算统计数据
    calculateStats();
  } catch (error) {
    ElMessage.error('获取生产计划列表失败')
  }
  loading.value = false
}

// 获取产品列表
const fetchProductList = async () => {
  try {
    const response = await axios.get('/baseData/materials', {
      params: { category: 'product' }
    })
    
    if (response.data && response.data.data) {
      const productsWithBom = await Promise.all(
        response.data.data.map(async (product) => {
          try {
            const bomResponse = await axios.get('/baseData/boms', {
              params: { productId: product.id }
            })
            const hasBom = bomResponse.data && bomResponse.data.data && bomResponse.data.data.length > 0
            
            return {
              id: product.id,
              code: product.code || '无编码',
              name: product.name,
              hasBom: hasBom,
              bomId: hasBom ? bomResponse.data.data[0].id : null
            }
          } catch (error) {
            console.error(`获取产品 ${product.code} 的BOM信息失败:`, error)
            return {
              id: product.id,
              code: product.code || '无编码',
              name: product.name,
              hasBom: false,
              bomId: null
            }
          }
        })
      )
      
      productList.value = productsWithBom
    }
  } catch (error) {
    console.error('获取产品列表失败:', error)
    ElMessage.error('获取产品列表失败')
  }
}

// 计算物料需求
const calculateMaterials = async () => {
  if (!formData.value.productId || !formData.value.quantity || !formData.value.bomId) return
  
  try {
    const response = await axios.post('/production/calculate-materials', {
      productId: formData.value.productId,
      bomId: formData.value.bomId,
      quantity: formData.value.quantity
    })
    materialList.value = response.data
  } catch (error) {
    console.error('计算物料需求失败:', error)
    ElMessage.error('计算物料需求失败')
    materialList.value = []
  }
}

// 查看计划详情
const showPlanDetail = async (plan) => {
  try {
    loading.value = true
    // 获取计划详情
    const response = await productionApi.getProductionPlan(plan.id)
    if (response.data) {
      currentPlan.value = response.data
      
      // 格式化日期
      if (currentPlan.value.start_date) {
        currentPlan.value.start_date = dayjs(currentPlan.value.start_date).format('YYYY-MM-DD')
      }
      if (currentPlan.value.end_date) {
        currentPlan.value.end_date = dayjs(currentPlan.value.end_date).format('YYYY-MM-DD')
      }
      
      // 尝试获取物料需求
      try {
        const materialsResponse = await axios.post('/production/calculate-materials', {
          productId: plan.productId,
          bomId: plan.bomId,
          quantity: plan.quantity
        })
        currentPlan.value.materials = materialsResponse.data || []
      } catch (materialError) {
        console.error('获取物料需求失败:', materialError)
        currentPlan.value.materials = []
      }
      
      planDetailVisible.value = true
    } else {
      ElMessage.warning('未找到计划详情')
    }
  } catch (error) {
    console.error('获取计划详情失败:', error)
    ElMessage.error('获取计划详情失败')
  } finally {
    loading.value = false
  }
}

// 查看BOM详情
const showBomDetail = async (productId) => {
  if (!productId) {
    ElMessage.warning('无法获取产品ID')
    return
  }
  
  try {
    loading.value = true
    const response = await axios.get('/baseData/boms', {
      params: { product_id: productId }
    })
    
    if (response.data?.data?.[0]) {
      currentBom.value = response.data.data[0]
      bomModalVisible.value = true
    } else {
      ElMessage.warning('未找到相关的BOM信息')
    }
  } catch (error) {
    console.error('获取BOM详情失败:', error)
    if (error.response && error.response.status === 404) {
      ElMessage.warning('未找到相关的BOM信息')
    } else {
      ElMessage.error('获取BOM详情失败')
    }
  } finally {
    loading.value = false
  }
}

// 事件处理函数
const handleSearch = () => {
  currentPage.value = 1
  fetchPlanList()
}

const handleExport = async () => {
  try {
    const response = await productionApi.exportProductionData(searchForm.value)
    // 处理文件下载
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', '生产计划数据.xlsx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

const showCreateModal = async () => {
  modalTitle.value = '新建生产计划'
  // 生成随机计划编号 (SC+日期+3位随机数)
  const now = dayjs()
  const dateStr = now.format('YYMMDD')
  const randomNum = Math.floor(Math.random() * 900) + 100
  
  formData.value = {
    code: `SC${dateStr}${randomNum}`,
    name: '',
    planDate: now.toDate(),
    productId: undefined,
    quantity: 1,
    bomId: null
  }
  materialList.value = []
  modalVisible.value = true
}

const handleProductChange = async () => {
  const selectedProduct = productList.value.find(p => p.id === formData.value.productId)
  if (!selectedProduct) {
    formData.value.bomId = null
    materialList.value = []
    return
  }

  try {
    loading.value = true
    if (!selectedProduct.hasBom) {
      formData.value.bomId = null
      materialList.value = []
      ElMessage({
        message: '该产品没有关联的BOM，请先在BOM管理中创建BOM',
        type: 'warning',
        duration: 5000
      })
      return
    }

    // 获取产品的最新活跃BOM
    const response = await axios.get(`/baseData/boms`, {
      params: { product_id: selectedProduct.id, status: 'active' }
    })
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      const activeBom = response.data.data[0]
      console.log('获取到活跃BOM:', activeBom)
      formData.value.bomId = activeBom.id
      // 计算物料需求
      await calculateMaterials()
    } else {
      ElMessage.warning('未找到该产品的活跃BOM，请先在BOM管理中创建并激活BOM')
      formData.value.bomId = null
      materialList.value = []
    }
  } catch (error) {
    console.error('处理产品选择失败:', error)
    ElMessage.error('获取产品BOM失败')
    formData.value.bomId = null
    materialList.value = []
  } finally {
    loading.value = false
  }
}

const handleModalOk = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.value = true
    
    // 准备提交的数据
    const data = {
      code: formData.value.code,
      name: formData.value.name,
      planDate: dayjs(formData.value.planDate).format('YYYY-MM-DD'),
      productId: formData.value.productId,
      quantity: formData.value.quantity,
      bomId: formData.value.bomId
    }
    
    console.log('提交生产计划数据:', data)
    
    if (modalTitle.value === '编辑生产计划') {
      await productionApi.updateProductionPlan(formData.value.id, data)
      ElMessage.success('生产计划更新成功')
    } else {
      await productionApi.createProductionPlan(data)
      ElMessage.success('生产计划创建成功')
    }
    
    modalVisible.value = false
    fetchPlanList()
  } catch (error) {
    console.error('保存生产计划失败:', error)
    ElMessage.error('保存生产计划失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

const handleModalCancel = () => {
  modalVisible.value = false
}

const handleEdit = async (row) => {
  modalTitle.value = '编辑生产计划'
  try {
    // 获取计划完整信息
    const response = await productionApi.getProductionPlan(row.id)
    if (response.data) {
      const plan = response.data
      formData.value = {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        planDate: plan.plan_date ? dayjs(plan.plan_date).toDate() : null,
        productId: plan.product_id,
        quantity: plan.quantity,
        bomId: plan.bom_id
      }
      
      // 加载物料清单
      await calculateMaterials()
      modalVisible.value = true
    } else {
      ElMessage.warning('获取计划详情失败')
    }
  } catch (error) {
    console.error('获取计划详情失败:', error)
    ElMessage.error('获取计划详情失败')
  }
}

const handleDelete = async (row) => {
  try {
    loading.value = true
    await productionApi.deleteProductionPlan(row.id)
    ElMessage.success('删除成功')
    fetchPlanList()
  } catch (error) {
    console.error('删除生产计划失败:', error)
    ElMessage.error('删除失败')
  } finally {
    loading.value = false
  }
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchPlanList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchPlanList()
}

// 跳转到生产任务页面
const goToTasks = () => {
  router.push('/production/task')
}

// 开始生产
const startProduction = async (row) => {
  try {
    loading.value = true
    await productionApi.updateProductionPlanStatus(row.id, { status: 'in_progress' })
    ElMessage.success('生产计划已开始')
    fetchPlanList()
  } catch (error) {
    console.error('开始生产失败:', error)
    ElMessage.error('开始生产失败')
  } finally {
    loading.value = false
  }
}

// 完成计划
const completePlan = async (row) => {
  try {
    loading.value = true
    await productionApi.updateProductionPlanStatus(row.id, { status: 'completed' })
    ElMessage.success('生产计划已完成')
    fetchPlanList()
  } catch (error) {
    console.error('完成计划失败:', error)
    ElMessage.error('完成计划失败')
  } finally {
    loading.value = false
  }
}

// 取消计划
const cancelPlan = async (row) => {
  try {
    loading.value = true
    await productionApi.updateProductionPlanStatus(row.id, { status: 'cancelled' })
    ElMessage.success('生产计划已取消')
    fetchPlanList()
  } catch (error) {
    console.error('取消计划失败:', error)
    ElMessage.error('取消计划失败')
  } finally {
    loading.value = false
  }
}

// 生命周期钩子
onMounted(() => {
  fetchPlanList()
  fetchProductList()
})
</script>

<style scoped>
.production-management {
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
  font-size: 22px;
  font-weight: 500;
  color: #303133;
}

.search-bar {
  margin-bottom: 20px;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.stat-box {
  flex: 1;
  min-width: 120px;
  text-align: center;
  padding: 15px 5px;
  border-radius: 4px;
  background-color: #f4f8fd;
  border: 1px solid #ebeef5;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.data-table {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.text-danger {
  color: #f56c6c;
}
</style>