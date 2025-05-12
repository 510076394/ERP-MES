<template>
  <div class="outbound-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>销售出库管理</h2>
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon> 增加出库单
      </el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" class="search-form">
        <el-form-item label="出库单号/客户">
          <el-input
            v-model="searchQuery"
            placeholder="出库单号/订单号/客户名称"
            @keyup.enter="handleSearch"
            clearable
          ></el-input>
        </el-form-item>
        
        <el-form-item label="出库状态">
          <el-select v-model="statusFilter" placeholder="出库状态" clearable @change="handleSearch" style="width: 100%">
            <el-option
              v-for="item in outboundStatuses"
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
            value-format="YYYY-MM-DD"
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
      <el-card class="stat-card" shadow="hover" @click="resetStatusFilter">
        <div class="stat-value">{{ outboundStats.total }}</div>
        <div class="stat-label">全部出库单</div>
      </el-card>
      <el-card class="stat-card" shadow="hover" @click="setStatusFilter('draft')">
        <div class="stat-value">{{ outboundStats.draft }}</div>
        <div class="stat-label">草稿</div>
      </el-card>
      <el-card class="stat-card" shadow="hover" @click="setStatusFilter('processing')">
        <div class="stat-value">{{ outboundStats.processing }}</div>
        <div class="stat-label">处理中</div>
      </el-card>
      <el-card class="stat-card" shadow="hover" @click="setStatusFilter('completed')">
        <div class="stat-value">{{ outboundStats.completed }}</div>
        <div class="stat-label">已完成</div>
      </el-card>
      <el-card class="stat-card" shadow="hover" @click="setStatusFilter('cancelled')">
        <div class="stat-value">{{ outboundStats.cancelled }}</div>
        <div class="stat-label">已取消</div>
      </el-card>
    </div>

    <!-- 出库单表格 -->
    <el-card class="data-card">
      <el-table 
        :data="outbounds" 
        border
        style="width: 100%" 
        v-loading="loading"
        :max-height="tableHeight"
        table-layout="fixed"
      >
        <el-table-column prop="outbound_no" label="出库单号" width="150" fixed />
        <el-table-column prop="order_no" label="关联订单号" width="150" />
        <el-table-column prop="product_code" label="物料编码" width="120" />
        <el-table-column prop="model" label="产品型号" width="120">
          <template #default="scope">
            {{ scope.row.product_model || scope.row.model || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="customer_name" label="客户名称" min-width="120" />
        <el-table-column prop="delivery_date" label="出库日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.delivery_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="scope">
            <div class="table-operations">
              <el-button link type="primary" size="small" @click="showDetails(scope.row)">
                <el-icon><View /></el-icon>查看
              </el-button>
              <el-dropdown v-if="['draft', 'processing'].includes(scope.row.status)">
                <el-button link type="primary" size="small">
                  更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="scope.row.status === 'draft'" @click="handleStatusChange(scope.row, 'processing')">
                      <el-icon><CaretRight /></el-icon>开始处理
                    </el-dropdown-item>
                    <el-dropdown-item v-if="scope.row.status === 'processing'" @click="handleStatusChange(scope.row, 'completed')">
                      <el-icon><Check /></el-icon>标记完成
                    </el-dropdown-item>
                    <el-dropdown-item @click="handleStatusChange(scope.row, 'cancelled')">
                      <el-icon><Close /></el-icon>取消出库
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button v-if="scope.row.status === 'draft'" link type="primary" size="small" @click="showEditDialog(scope.row)">
                <el-icon><Edit /></el-icon>编辑
              </el-button>
              <el-button v-if="scope.row.status === 'draft'" link type="danger" size="small" @click="handleDelete(scope.row)">
                <el-icon><Delete /></el-icon>删除
              </el-button>
              <el-button v-if="scope.row.status === 'completed'" link type="success" size="small" @click="printOutbound(scope.row)">
                <el-icon><Printer /></el-icon>打印
              </el-button>
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
          @size-change="fetchOutbounds"
          @current-change="fetchOutbounds"
        />
      </div>
    </el-card>

    <!-- 出库单详情对话框 -->
    <el-dialog v-model="detailsVisible" title="出库单详情" width="50%">
      <div v-if="currentOutbound" v-loading="!currentOutbound">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="出库单号">{{ currentOutbound.outbound_no }}</el-descriptions-item>
          <el-descriptions-item label="关联订单号">{{ currentOutbound.order_no }}</el-descriptions-item>
          <el-descriptions-item label="客户名称">{{ currentOutbound.customer_name }}</el-descriptions-item>
          <el-descriptions-item label="出库日期">{{ formatDate(currentOutbound.delivery_date) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentOutbound.status)">{{ getStatusText(currentOutbound.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(currentOutbound.created_at) }}</el-descriptions-item>
        </el-descriptions>

        <h3 class="mt-4">出库明细</h3>
        <el-table :data="currentOutbound.items || []" style="width: 100%" border>
          <el-table-column prop="product_code" label="物料编码" width="120" />
          <el-table-column prop="product_name" label="物料名称" />
          <el-table-column prop="specification" label="规格" />
          <el-table-column prop="quantity" label="数量" width="100" />
          <el-table-column prop="unit" label="单位" width="80" />
        </el-table>
      </div>
    </el-dialog>

    <!-- 创建/编辑出库单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'create' ? '创建出库单' : '编辑出库单'"
      width="60%"
      destroy-on-close
    >
      <el-form :model="outboundForm" ref="outboundFormRef" :rules="rules" label-width="100px">
        <el-form-item label="关联订单" prop="order_id">
          <el-select v-model="outboundForm.order_id" placeholder="请选择可发货状态的订单" @change="handleOrderChange" style="width: 100%">
            <el-option
              v-for="order in orders"
              :key="order.id"
              :label="`${order.order_no} - ${order.customer || ''} (可发货)`"
              :value="order.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="客户名称">
          <el-input v-model="outboundForm.customer_name" placeholder="客户信息" disabled />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系人">
              <el-input v-model="outboundForm.contact" placeholder="联系人" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="outboundForm.phone" placeholder="联系电话" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="收货地址">
          <el-input v-model="outboundForm.address" placeholder="收货地址" disabled />
        </el-form-item>

        <el-form-item label="出库日期" prop="delivery_date">
          <el-date-picker
            v-model="outboundForm.delivery_date"
            type="date"
            placeholder="选择出库日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-select v-model="outboundForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option 
              v-for="item in outboundStatuses" 
              :key="item.value" 
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        
        <!-- 出库明细 -->
        <el-form-item label="出库明细">
          <div class="materials-table-container">
            <el-table 
              :data="outboundForm.items" 
              border 
              style="width: 100%" 
              table-layout="fixed"
              :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
              empty-text="请添加出库物料"
            >
              <el-table-column label="物料编码" prop="material_code" width="120" />
              <el-table-column label="物料名称" prop="product_name" width="180" />
              <el-table-column label="规格" prop="specification" width="120" />
              <el-table-column label="数量" width="100">
                <template #default="{ row }">
                  <el-input-number 
                    v-model="row.quantity" 
                    :min="1" 
                    controls-position="right"
                    size="small"
                    style="width: 90px"
                  />
                </template>
              </el-table-column>
              <el-table-column label="单位" prop="unit_name" width="70" />
              <el-table-column label="操作" width="70" fixed="right">
                <template #default="{ $index }">
                  <el-button
                    type="danger"
                    size="small"
                    circle
                    @click="removeItem($index)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <div class="add-material" style="margin-top: 10px;">
              <el-button type="primary" @click="addItem">
                <el-icon><Plus /></el-icon>添加物料
              </el-button>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="备注">
          <el-input type="textarea" v-model="outboundForm.remarks" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitOutbound">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 打印预览对话框 -->
    <el-dialog
      v-model="printVisible"
      title="出库单打印预览"
      width="80%"
      :before-close="() => printVisible = false"
      append-to-body
      class="print-dialog"
    >
      <div id="print-content" class="print-content">
        <div class="print-header">
          <h1>销售出库单</h1>
          <div class="print-no">出库单号: {{ currentOutbound?.outbound_no }}</div>
        </div>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item label="出库单号">{{ currentOutbound?.outbound_no }}</el-descriptions-item>
          <el-descriptions-item label="关联订单号">{{ currentOutbound?.order_no }}</el-descriptions-item>
          <el-descriptions-item label="客户名称">{{ currentOutbound?.customer_name }}</el-descriptions-item>
          <el-descriptions-item label="出库日期">{{ formatDate(currentOutbound?.delivery_date) }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ currentOutbound?.contact || currentOutbound?.contact_person || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentOutbound?.phone || currentOutbound?.contact_phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="收货地址" :span="2">{{ currentOutbound?.address || currentOutbound?.delivery_address || '-' }}</el-descriptions-item>
        </el-descriptions>

        <h3>出库物料清单</h3>
        <el-table :data="currentOutbound?.items || []" style="width: 100%" border>
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="product_code" label="物料编码" min-width="120" />
          <el-table-column prop="product_name" label="物料名称" min-width="180" />
          <el-table-column prop="specification" label="规格" min-width="120" />
          <el-table-column prop="quantity" label="数量" width="100" />
          <el-table-column prop="unit_name" label="单位" width="80" />
        </el-table>
        
        <div class="print-footer">
          <div class="sign-area">
            <div class="sign-item">
              <div>仓库经办人：________________</div>
            </div>
            <div class="sign-item">
              <div>客户签收：________________</div>
            </div>
            <div class="sign-item">
              <div>日期：________________</div>
            </div>
          </div>
          <div class="print-remark">
            <div>备注：{{ currentOutbound?.remarks || '无' }}</div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="printVisible = false">关闭</el-button>
          <el-button type="primary" @click="doPrint">立即打印</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { salesApi } from '@/services/api'
import { 
  Search, 
  Refresh, 
  Plus, 
  View, 
  Edit, 
  Delete, 
  CaretRight, 
  Check, 
  Close,
  ArrowDown,
  Printer
} from '@element-plus/icons-vue'

// 状态变量
const loading = ref(false)
const outbounds = ref([])
const orders = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tableHeight = ref('calc(100vh - 280px)')
const searchQuery = ref('')
const statusFilter = ref('')
const dateRange = ref([])
const dialogVisible = ref(false)
const detailsVisible = ref(false)
const dialogType = ref('create')
const outboundFormRef = ref(null)
const currentOutbound = ref(null)
const printVisible = ref(false)

// 表单数据
const outboundForm = ref({
  order_id: '',
  customer_id: '',
  customer_name: '',
  contact: '',
  phone: '',
  address: '',
  delivery_date: '',
  status: 'draft',
  items: [],
  remarks: ''
})

// 表单验证规则
const rules = {
  order_id: [
    { required: true, message: '请选择关联订单', trigger: 'change' }
  ],
  delivery_date: [
    { required: true, message: '请选择出库日期', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 出库单统计数据
const outboundStats = ref({
  total: 0,
  draft: 0,
  processing: 0,
  completed: 0,
  cancelled: 0
})

// 状态映射
const outboundStatuses = [
  { value: 'draft', label: '草稿' },
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

// 状态映射对象
const statusMap = {
  draft: { text: '草稿', type: 'info' },
  processing: { text: '处理中', type: 'warning' },
  completed: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'danger' }
}

// 获取状态类型
const getStatusType = (status) => statusMap[status]?.type || 'info'

// 获取状态文本
const getStatusText = (status) => statusMap[status]?.text || status

// 格式化日期
const formatDate = (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-'

// 格式化日期时间
const formatDateTime = (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'

// 计算统计数据
const calculateOutboundStats = () => {
  const stats = {
    total: outbounds.value.length,
    draft: 0,
    processing: 0,
    completed: 0,
    cancelled: 0
  }
  
  outbounds.value.forEach(outbound => {
    stats[outbound.status] = (stats[outbound.status] || 0) + 1
  })
  
  outboundStats.value = stats
}

// 搜索参数计算属性
const searchParams = computed(() => {
  const params = {
    page: currentPage.value,
    pageSize: pageSize.value,
    search: searchQuery.value,
    status: statusFilter.value
  }
  
  // 添加日期范围参数
  if (dateRange.value?.length === 2) {
    params.startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
    params.endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD')
  }
  
  return params
})

// 搜索方法
const handleSearch = () => {
  currentPage.value = 1
  fetchOutbounds()
}

// 重置搜索方法
const resetSearch = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  dateRange.value = []
  fetchOutbounds()
}

// 获取所有出库单
const fetchOutbounds = async () => {
  try {
    loading.value = true
    const response = await salesApi.getOutbounds(searchParams.value)
    const data = response.data.items || response.data
    
    // 一次性处理所有数据，而不是逐条请求
    const outboundDetails = []
    const detailsPromises = []
    
    // 处理数据，确保每个出库单都有物料编码和产品型号信息
    outbounds.value = data.map(item => {
      let productCode = '';
      let productModel = '';
      
      // 尝试从多个可能的字段获取数据
      if (item.items && item.items.length > 0) {
        const firstItem = item.items[0];
        productCode = firstItem.product_code || firstItem.material_code || firstItem.code || '';
        productModel = firstItem.product_model || firstItem.model || firstItem.specification || '';
      } else if (item.first_item) {
        // 有些API可能返回first_item字段
        productCode = item.first_item.product_code || item.first_item.material_code || item.first_item.code || '';
        productModel = item.first_item.product_model || item.first_item.model || item.first_item.specification || '';
      }
      
      // 尝试从主数据中获取
      if (!productModel) {
        productModel = item.product_model || item.model || item.specification || '';
      }
      
      if (!productCode) {
        productCode = item.product_code || item.code || item.material_code || '';
      }
      
      // 如果需要获取详情数据，添加到批量请求队列
      if ((!productCode || !productModel) && item.id) {
        detailsPromises.push(salesApi.getOutbound(item.id).then(response => {
          const detailData = response.data;
          let detailProductCode = '';
          let detailProductModel = '';
          
          if (detailData.items && detailData.items.length > 0) {
            const firstItem = detailData.items[0];
            detailProductCode = firstItem.product_code || firstItem.material_code || firstItem.code || '';
            detailProductModel = firstItem.product_model || firstItem.model || firstItem.specification || '';
          }
          
          // 从详情主数据中获取
          if (!detailProductModel) {
            detailProductModel = detailData.product_model || detailData.model || detailData.specification || '';
          }
          
          if (!detailProductCode) {
            detailProductCode = detailData.product_code || detailData.material_code || detailData.code || '';
          }
          
          return {
            id: item.id,
            product_code: detailProductCode,
            product_model: detailProductModel,
            model: detailProductModel
          };
        }).catch(error => {
          console.error('获取出库单详情失败:', error);
          return { id: item.id };
        }));
      }
      
      return {
        ...item,
        product_code: productCode,
        product_model: productModel,
        model: productModel
      };
    });
    
    // 一次等待所有详情请求完成
    if (detailsPromises.length > 0) {
      const detailsResults = await Promise.all(detailsPromises);
      
      // 更新主列表数据
      detailsResults.forEach(detail => {
        if (!detail || !detail.id) return;
        
        const index = outbounds.value.findIndex(item => item.id === detail.id);
        if (index !== -1) {
          if (detail.product_code) {
            outbounds.value[index].product_code = detail.product_code;
          }
          if (detail.product_model) {
            outbounds.value[index].product_model = detail.product_model;
            outbounds.value[index].model = detail.product_model;
          } else if (detail.model) {
            outbounds.value[index].product_model = detail.model;
            outbounds.value[index].model = detail.model;
          }
        }
      });
    }
    
    total.value = response.data.total || outbounds.value.length
    calculateOutboundStats()
  } catch (error) {
    ElMessage.error('获取出库单数据失败')
    console.error('获取出库单列表错误:', error)
  } finally {
    loading.value = false
  }
}

// 获取订单列表
const fetchOrders = async () => {
  try {
    const response = await salesApi.getOrders()
    const allOrders = response.data
    // 筛选状态为"可发货"的销售订单
    orders.value = allOrders.filter(order => order.status === 'ready_to_ship')
    console.log(`获取到 ${allOrders.length} 个订单，其中 ${orders.value.length} 个是可发货状态`)
    
    if (orders.value.length === 0 && allOrders.length > 0) {
      ElMessage.info('当前没有处于"可发货"状态的销售订单，请先在销售订单管理中将订单状态更新为"可发货"')
    }
  } catch (error) {
    ElMessage.error('获取订单列表失败')
    console.error('获取订单列表失败:', error)
  }
}

// 在组件挂载时获取数据
onMounted(() => {
  fetchOutbounds()
  fetchOrders()
})

// 查看详情
const showDetails = async (row) => {
  currentOutbound.value = null
  loading.value = true
  
  try {
    const response = await salesApi.getOutbound(row.id)
    currentOutbound.value = response.data
    
    // 确保items存在
    if (!currentOutbound.value.items) {
      currentOutbound.value.items = []
    }
    
    detailsVisible.value = true
  } catch (error) {
    ElMessage.error('获取出库单详情失败')
  } finally {
    loading.value = false
  }
}

// 显示创建对话框
const showCreateDialog = () => {
  // 检查是否有可发货状态的订单
  if (orders.value.length === 0) {
    ElMessage.warning('当前没有处于"可发货"状态的销售订单，请先确认订单状态')
    return
  }
  
  dialogType.value = 'create'
  outboundForm.value = {
    order_id: '',
    customer_id: '',
    customer_name: '',
    contact: '',
    phone: '',
    address: '',
    delivery_date: new Date(),
    status: 'draft',
    items: [],
    remarks: ''
  }
  dialogVisible.value = true
}

// 显示编辑对话框
const showEditDialog = async (row) => {
  dialogType.value = 'edit'
  
  try {
    // 获取完整的出库单数据
    const response = await salesApi.getOutbound(row.id)
    const fullOutboundData = response.data
    
    // 确保表单数据完整
    outboundForm.value = {
      id: row.id,
      order_id: fullOutboundData.order_id || row.order_id,
      customer_id: fullOutboundData.customer_id || row.customer_id,
      customer_name: fullOutboundData.customer_name || row.customer_name,
      contact: fullOutboundData.contact_person || row.contact_name,
      phone: fullOutboundData.contact_phone || row.contact_phone,
      address: fullOutboundData.delivery_address || row.address,
      delivery_date: fullOutboundData.delivery_date || row.delivery_date,
      status: fullOutboundData.status || row.status,
      items: fullOutboundData.items || [],
      remarks: fullOutboundData.remarks || row.remarks || ''
    }
    
    console.log('编辑出库单表单数据:', outboundForm.value)
    
    dialogVisible.value = true
  } catch (error) {
    console.error('获取出库单详情失败:', error)
    ElMessage.error('获取出库单详情失败')
    
    // 如果获取失败，使用行数据
    outboundForm.value = { ...row }
    dialogVisible.value = true
  }
}

// 添加明细项
const addItem = () => {
  outboundForm.value.items.push({
    material_id: '',
    product_name: '请选择物料',
    material_code: '',
    specification: '',
    quantity: 1,
    unit_name: '',
    unit_id: '',
    unit_price: 0
  })
}

// 移除明细项
const removeItem = (index) => {
  outboundForm.value.items.splice(index, 1)
}

// 提交出库单
const submitOutbound = async () => {
  outboundFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    try {
      // 过滤掉无效的物料项
      const validItems = outboundForm.value.items.filter(item => 
        (item.material_id || item.product_id) && item.quantity > 0
      )
      
      if (validItems.length === 0) {
        ElMessage.warning('请至少添加一个有效的物料项')
        return
      }
      
      console.log('提交物料项:', validItems)
      
      // 构建提交数据
      const submitData = {
        outbound_date: outboundForm.value.delivery_date,
        order_id: outboundForm.value.order_id || '',
        customer_id: outboundForm.value.customer_id,
        expected_delivery_date: outboundForm.value.delivery_date,
        warehouse_id: outboundForm.value.warehouse_id || 1,
        status: outboundForm.value.status || 'draft',
        remarks: outboundForm.value.remarks || '',
        items: validItems.map(item => ({
          material_id: item.material_id || item.product_id, // 发送物料ID
          product_id: item.material_id || item.product_id, // 向后兼容
          unit_id: item.unit_id,
          quantity: item.quantity,
          price: item.unit_price || 0,
          remarks: item.remarks || ''
        }))
      }
      
      console.log('提交数据:', submitData)
      
      if (dialogType.value === 'create') {
        await salesApi.createOutbound(submitData)
        ElMessage.success('出库单创建成功')
      } else {
        await salesApi.updateOutbound(outboundForm.value.id, submitData)
        ElMessage.success('出库单更新成功')
      }
      dialogVisible.value = false
      fetchOutbounds()
    } catch (error) {
      ElMessage.error(`保存出库单失败: ${error.message || '未知错误'}`)
      console.error('保存出库单失败:', error)
    }
  })
}

// 处理删除
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该出库单吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await salesApi.deleteOutbound(row.id)
      ElMessage.success('删除成功')
      fetchOutbounds()
    } catch (error) {
      ElMessage.error('删除出库单失败')
    }
  }).catch(() => {})
}

// 订单选择处理
const handleOrderChange = async (orderId) => {
  if (!orderId) return
  
  try {
    // 获取订单详情
    const response = await salesApi.getOrder(orderId)
    const orderDetails = response.data
    
    // 自动填充客户信息
    if (orderDetails.customer_name || orderDetails.customer) {
      outboundForm.value.customer_name = orderDetails.customer_name || orderDetails.customer
      outboundForm.value.customer_id = orderDetails.customer_id
      outboundForm.value.contact = orderDetails.contact || orderDetails.contact_person
      outboundForm.value.phone = orderDetails.phone || orderDetails.contact_phone
      outboundForm.value.address = orderDetails.address || orderDetails.delivery_address
    }
    
    // 从订单中获取物料项
    outboundForm.value.items = []
    
    if (orderDetails.items?.length > 0) {
      console.log('订单物料项:', orderDetails.items)
      
      // 确保每个物料项都包含正确的ID
      outboundForm.value.items = orderDetails.items
        .filter(item => item.material_id || item.product_id) // 过滤掉没有ID的项
        .map(item => ({
          material_id: item.material_id || item.product_id, // 优先使用material_id
          product_name: item.material_name || item.name,
          material_code: item.code || item.material_code,
          specification: item.specification || item.specs,
          quantity: item.quantity,
          unit_name: item.unit_name || item.unit,
          unit_id: item.unit_id,
          unit_price: item.unit_price || item.price
        }))
      
      console.log('转换后的出库单物料项:', outboundForm.value.items)
    }
  } catch (error) {
    ElMessage.error('获取订单详情失败')
    console.error('获取订单详情错误:', error)
  }
}

// 修改出库单状态
const handleStatusChange = async (row, status) => {
  // 确认对话框
  if (status === 'completed' || status === 'cancelled') {
    const action = status === 'completed' ? '完成' : '取消'
    const message = status === 'completed' 
      ? '确定要将出库单标记为已完成吗？此操作将减少库存并更新订单状态。'
      : '确定要取消此出库单吗？如果出库单之前已完成，此操作将恢复库存。'
      
    try {
      await ElMessageBox.confirm(message, '确认操作', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
    } catch {
      return // 用户取消操作
    }
  }
  
  loading.value = true
  try {
    // 构建更新数据
    const updateData = {
      status: status,
      outbound_date: row.delivery_date,
      order_id: row.order_id,
      customer_id: row.customer_id,
      expected_delivery_date: row.delivery_date,
      warehouse_id: row.warehouse_id || 1,
      remarks: row.remarks || ''
    }
    
    await salesApi.updateOutbound(row.id, updateData)
    
    // 更新本地数据
    const index = outbounds.value.findIndex(item => item.id === row.id)
    if (index !== -1) {
      outbounds.value[index].status = status
      calculateOutboundStats()
    }
    
    ElMessage.success(`出库单状态已更新为${getStatusText(status)}`)
    
    await fetchOutbounds()
  } catch (error) {
    const errorMsg = error.response?.data?.error || '状态更新失败'
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}

// 重置状态过滤器
const resetStatusFilter = () => {
  statusFilter.value = ''
  fetchOutbounds()
}

// 设置状态过滤器
const setStatusFilter = (status) => {
  statusFilter.value = status
  fetchOutbounds()
}

// 打印出库单
const printOutbound = async (row) => {
  try {
    loading.value = true
    
    // 获取完整的出库单数据
    const response = await salesApi.getOutbound(row.id)
    currentOutbound.value = response.data
    
    // 确保items存在
    if (!currentOutbound.value.items) {
      currentOutbound.value.items = []
    }
    
    // 打开打印预览对话框
    printVisible.value = true
  } catch (error) {
    ElMessage.error('获取出库单打印数据失败')
    console.error('获取出库单打印数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 执行打印
const doPrint = () => {
  const printContent = document.getElementById('print-content')
  const originalContents = document.body.innerHTML
  
  // 创建打印样式
  const style = document.createElement('style')
  style.textContent = `
    @media print {
      body * {
        visibility: hidden;
      }
      #print-content, #print-content * {
        visibility: visible;
      }
      #print-content {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      .el-table__header {
        background-color: #f5f7fa !important;
      }
      .el-table th {
        background-color: #f5f7fa !important;
      }
    }
  `
  document.head.appendChild(style)
  
  window.print()
  
  // 移除打印样式
  document.head.removeChild(style)
}
</script>

<style scoped>
.outbound-container {
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

.statistics-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 140px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #409EFF;
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
  align-items: center;
  height: 100%;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.outbound-detail {
  padding: 16px;
}

.products-title {
  margin: 16px 0;
  font-weight: bold;
  font-size: 16px;
}

.materials-table-container {
  margin-bottom: 16px;
  width: 100%;
  overflow-x: auto;
}

.add-material {
  margin-top: 10px;
  text-align: right;
}

.mt-4 {
  margin-top: 16px;
}

.print-dialog {
  max-width: 210mm;
  margin: 0 auto;
}

.print-content {
  padding: 20px;
  background-color: white;
  font-size: 14px;
}

.print-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 2px solid #409EFF;
  padding-bottom: 10px;
}

.print-header h1 {
  font-size: 24px;
  color: #303133;
  margin: 0;
}

.print-no {
  font-size: 16px;
  font-weight: bold;
}

.print-footer {
  margin-top: 40px;
}

.sign-area {
  display: flex;
  justify-content: space-between;
  margin-top: 50px;
  border-top: 1px dashed #dcdfe6;
  padding-top: 20px;
}

.sign-item {
  margin-bottom: 10px;
  flex: 1;
}

.print-remark {
  margin-top: 20px;
  border-top: 1px dashed #dcdfe6;
  padding-top: 10px;
}

@media print {
  .print-dialog {
    box-shadow: none;
    width: 100%;
  }
  
  .el-button,
  .el-dialog__header,
  .el-dialog__footer {
    display: none !important;
  }
  
  .el-dialog__body {
    padding: 0 !important;
  }
  
  .print-content {
    margin: 0;
    padding: 10px;
    box-shadow: none;
  }
}
</style>