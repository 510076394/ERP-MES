<template>
  <div class="orders-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>销售订单管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon> 增加订单
      </el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" class="search-form">
        <el-form-item label="订单编号/客户">
          <el-input
            v-model="searchQuery"
            placeholder="订单编号/客户名称"
            @keyup.enter="handleSearch"
            clearable
          ></el-input>
        </el-form-item>
        
        <el-form-item label="订单状态">
          <el-select v-model="statusFilter" placeholder="订单状态" clearable @change="handleSearch" style="width: 100%">
            <el-option
              v-for="item in orderStatuses"
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
      
      <div class="action-buttons">
        <el-dropdown>
          <el-button type="primary">
            更多操作<el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleImport">
                <el-icon><Upload /></el-icon> 导入
              </el-dropdown-item>
              <el-dropdown-item @click="handleExport">
                <el-icon><Download /></el-icon> 导出
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ orderStats.total }}</div>
        <div class="stat-label">全部订单</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ orderStats.pending }}</div>
        <div class="stat-label">待处理</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ orderStats.confirmed }}</div>
        <div class="stat-label">已确认</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ orderStats.inProduction }}</div>
        <div class="stat-label">生产中</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ orderStats.readyToShip }}</div>
        <div class="stat-label">可发货</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ orderStats.completed }}</div>
        <div class="stat-label">已完成</div>
      </el-card>
    </div>

    <!-- 订单表格 -->
    <el-card class="data-card">
      <el-table
        :data="tableData"
        border
        style="width: 100%"
        v-loading="loading"
        :max-height="tableHeight"
        table-layout="fixed"
        :default-sort="{prop: 'order_no', order: 'descending'}"
        @sort-change="handleSortChange"
        @header-dragend="(newWidth, oldWidth, column) => {
          if (column.property) {
            saveColumnWidth(column.property, newWidth)
          }
        }"
      >
        <el-table-column type="expand" width="50">
          <template #default="props">
            <div class="order-detail">
              <el-descriptions :column="3" border>
                <el-descriptions-item label="收货地址">{{ props.row.address }}</el-descriptions-item>
                <el-descriptions-item label="联系人">{{ props.row.contact }}</el-descriptions-item>
                <el-descriptions-item label="联系电话">{{ props.row.phone }}</el-descriptions-item>
                <el-descriptions-item label="订单备注" :span="3">{{ props.row.remark }}</el-descriptions-item>
              </el-descriptions>
              
              <div class="products-title">订单物料</div>
              <el-table :data="props.row.items" border style="width: 100%" table-layout="fixed">
                <el-table-column prop="code" label="物料编码" width="120" />
                <el-table-column prop="material_name" label="物料名称" />
                <el-table-column prop="specification" label="规格" />
                <el-table-column prop="quantity" label="数量" width="150" />
                <el-table-column prop="unit_name" label="单位" width="100" />
                <el-table-column prop="unit_price" label="单价" width="150">
                  <template #default="{ row }">
                    ¥{{ row.unit_price.toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column prop="amount" label="金额" width="120">
                  <template #default="{ row }">
                    ¥{{ row.amount.toFixed(2) }}
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column 
          prop="order_no" 
          :width="getColumnWidth('order_no', 120)" 
          fixed
          sortable="custom"
          resizable>
          <template #header>
            <el-popover
              placement="bottom"
              title="订单编号"
              :width="200"
              trigger="hover"
              content="订单编号格式：DD年月日序号，如DD250328001表示2025年03月28日的第1个订单。"
            >
              <template #reference>
                <span>订单编号 <el-icon><info-filled /></el-icon></span>
              </template>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column 
          prop="customer" 
          :min-width="getColumnWidth('customer', 150)"
          resizable>
          <template #header>
            <el-popover
              placement="bottom"
              title="客户名称"
              :width="200"
              trigger="hover"
              content="这里显示下单客户的名称。"
            >
              <template #reference>
                <span>客户名称 <el-icon><info-filled /></el-icon></span>
              </template>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column 
          prop="totalAmount" 
          label="订单金额" 
          :width="getColumnWidth('totalAmount', 120)"
          resizable>
          <template #default="{ row }">
            ¥{{ (typeof row.totalAmount === 'number' ? row.totalAmount : parseFloat(row.totalAmount) || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column 
          prop="orderDate" 
          label="下单日期" 
          :width="getColumnWidth('orderDate', 120)"
          sortable="custom"
          resizable>
          <template #default="{ row }">
            {{ formatDate(row.orderDate) }}
          </template>
        </el-table-column>
        <el-table-column 
          prop="deliveryDate" 
          label="交付日期" 
          :width="getColumnWidth('deliveryDate', 120)"
          resizable>
          <template #default="{ row }">
            {{ formatDate(row.deliveryDate) }}
          </template>
        </el-table-column>
        <el-table-column 
          prop="status" 
          label="状态" 
          :width="getColumnWidth('status', 100)"
          resizable>
          <template #default="{ row }">
            <el-tag 
              :style="{ backgroundColor: getSalesStatusColor(row.status), color: '#fff', borderColor: getSalesStatusColor(row.status) }"
            >
              {{ getSalesStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column 
          label="操作" 
          :width="getColumnWidth('operations', 300)" 
          fixed="right"
          resizable>
          <template #default="{ row }">
            <div class="table-operations">
              <div class="operation-group">
                <el-button 
                  link 
                  type="primary" 
                  size="small" 
                  @click="handleEdit(row)"
                >
                  <el-icon><Edit /></el-icon>编辑
                </el-button>
              </div>
              
              <div class="operation-group">
                <el-button
                  link
                  type="success"
                  size="small"
                  :disabled="!canConfirm(row)"
                  @click="handleConfirm(row)"
                >
                  <el-icon><Check /></el-icon>确认
                </el-button>
                <el-button
                  link
                  type="danger"
                  size="small"
                  :disabled="!canCancel(row)"
                  @click="handleCancel(row)"
                >
                  <el-icon><Close /></el-icon>取消
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

    <!-- 新增/编辑订单对话框 -->
    <el-dialog
      :title="dialogType === 'add' ? '新增订单' : '编辑订单'"
      v-model="dialogVisible"
      width="1200px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="客户名称" prop="customer_id">
          <el-select 
            v-model="form.customer_id" 
            placeholder="请选择客户"
            filterable
            @change="handleCustomerChange"
            style="width: 100%"
          >
            <el-option
              v-for="item in customers"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="联系人" prop="contact">
          <el-input v-model="form.contact" placeholder="请输入联系人" />
        </el-form-item>
        
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" />
        </el-form-item>
        
        <el-form-item label="收货地址" prop="address">
          <el-input v-model="form.address" type="textarea" placeholder="请输入收货地址" />
        </el-form-item>
        
        <el-form-item label="交付日期" prop="deliveryDate">
          <el-date-picker
            v-model="form.deliveryDate"
            type="date"
            placeholder="选择交付日期"
          />
        </el-form-item>
        
        <el-form-item label="订单物料">
          <div class="materials-table">
            <el-table :data="form.items" border>
              <el-table-column label="物料" width="280">
                <template #default="{ row, $index }">
                  <el-select 
                    v-model="row.code" 
                    placeholder="选择物料"
                    filterable
                    clearable
                    @change="(val) => handleMaterialChange(val, $index)"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in products"
                      :key="item.code"
                      :label="item.label"
                      :value="item.code"
                    >
                      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                        <span style="font-weight: bold">{{ item.code }}</span>
                        <span style="color: #8492a6; font-size: 13px">{{ item.name }}</span>
                      </div>
                    </el-option>
                  </el-select>
                  <div style="font-size: 12px; color: #999; margin-top: 5px;" v-if="dialogType === 'edit'">
                    {{row.material_id ? `ID:${row.material_id}, 编码:${row.code}` : ''}}
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column label="规格" width="180">
                <template #default="{ row }">
                  <el-input v-model="row.specification" disabled />
                </template>
              </el-table-column>
              
              <el-table-column label="数量" width="150">
                <template #default="{ row }">
                  <el-input-number 
                    v-model="row.quantity" 
                    :min="1"
                    @change="(val) => calculateItemAmount($index)" 
                  />
                </template>
              </el-table-column>
              
              <el-table-column label="单价" width="150">
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.unit_price"
                    :min="0"
                    :precision="2"
                    :step="0.1"
                    @change="(val) => calculateItemAmount($index)"
                  />
                </template>
              </el-table-column>
              
              <el-table-column label="金额" width="120">
                <template #default="{ row }">
                  ¥{{ row.amount.toFixed(2) }}
                </template>
              </el-table-column>
              
              <el-table-column label="操作" width="100">
                <template #default="{ $index }">
                  <el-button
                    type="danger"
                    circle
                    @click="removeMaterial($index)"
                  >
                    <el-icon><delete /></el-icon>
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <div class="add-material">
              <el-button type="primary" @click="addMaterial">
                <el-icon><plus /></el-icon>添加物料
              </el-button>
            </div>
          </div>
        </el-form-item>
        
        <el-form-item label="订单备注" prop="remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            placeholder="请输入订单备注"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { baseDataApi, salesApi, inventoryApi, productionApi } from '@/services/api'
import {
  Search,
  Plus,
  Upload,
  Download,
  Delete,
  Edit,
  Check,
  Close,
  View,
  ArrowDown
} from '@element-plus/icons-vue'
import { getSalesStatusText, getSalesStatusColor } from '@/constants/status'

// 数据定义
const loading = ref(false)
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableHeight = ref('500px') // 固定高度为500px，大约能显示10条记录
const searchQuery = ref('')
const statusFilter = ref('')
const dateRange = ref([])

// 表格列宽存储键
const TABLE_COLUMN_WIDTH_KEY = 'salesOrders_column_widths'

// 存储列宽
const saveColumnWidth = (columnName, width) => {
  try {
    const widths = JSON.parse(localStorage.getItem(TABLE_COLUMN_WIDTH_KEY) || '{}')
    widths[columnName] = width
    localStorage.setItem(TABLE_COLUMN_WIDTH_KEY, JSON.stringify(widths))
  } catch (error) {
    console.error('保存列宽失败:', error)
  }
}

// 获取保存的列宽
const getColumnWidth = (columnName, defaultWidth) => {
  try {
    const widths = JSON.parse(localStorage.getItem(TABLE_COLUMN_WIDTH_KEY) || '{}')
    return widths[columnName] || defaultWidth
  } catch (error) {
    console.error('获取列宽失败:', error)
    return defaultWidth
  }
}

onMounted(() => {
  // 不再需要计算表格高度
  // calculateTableHeight()
  // window.removeEventListener('resize', calculateTableHeight)
  fetchCustomersAndProducts() // 确保在组件挂载时获取客户和物料数据
  fetchData() // 获取订单数据，默认按日期降序排列
})

onUnmounted(() => {
  // 不再需要移除事件监听器
  // window.removeEventListener('resize', calculateTableHeight)
})

// 状态映射
const orderStatuses = [
  { value: 'pending', label: '待处理' },
  { value: 'confirmed', label: '已确认' },
  { value: 'in_production', label: '生产中' },
  { value: 'ready_to_ship', label: '可发货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

// 客户列表和产品列表
const customers = ref([])
const products = ref([])
const fetchCustomersAndProducts = async () => {
  try {
    console.log('开始获取客户和物料数据...')
    const [customersRes, materialsRes] = await Promise.all([
      baseDataApi.getCustomers(),
      baseDataApi.getMaterials({ type: 'finished' })
    ])
    console.log('原始物料响应数据:', materialsRes)
    
    // 处理物料数据
    let materialsData = []
    if (materialsRes.data && Array.isArray(materialsRes.data.data)) {
      // 新的API返回结构
      materialsData = materialsRes.data.data
    } else if (materialsRes.data && Array.isArray(materialsRes.data.list)) {
      // 旧的API返回结构
      materialsData = materialsRes.data.list
    } else if (Array.isArray(materialsRes.data)) {
      materialsData = materialsRes.data
    }

    // 处理客户数据 - 确保是数组
    if (customersRes.data && Array.isArray(customersRes.data)) {
      customers.value = customersRes.data
    } else if (customersRes.data && customersRes.data.list && Array.isArray(customersRes.data.list)) {
      customers.value = customersRes.data.list
    } else if (Array.isArray(customersRes.data)) {
      customers.value = customersRes.data
    } else if (Array.isArray(customersRes)) {
      customers.value = customersRes
    } else {
      customers.value = []
      console.error('客户数据格式不正确:', customersRes)
    }

    // 处理客户数据 - 确保是数组
    if (customersRes.data && Array.isArray(customersRes.data.list)) {
      customers.value = customersRes.data.list
    } else if (Array.isArray(customersRes.data)) {
      customers.value = customersRes.data
    } else {
      customers.value = []
      console.error('客户数据格式不正确:', customersRes)
    }

    products.value = materialsData.map(material => {
      const mappedMaterial = {
        id: material.id,
        code: material.code,
        value: material.code,
        name: material.name,
        material_name: material.name,
        specs: material.specs || material.specification || '', // 确保规格型号字段存在
        label: `${material.code} - ${material.name} ${material.specs ? `(${material.specs})` : ''}`,
        specification: material.specification || material.specs || '',
        unit_id: material.unit_id,
        unit_name: material.unit_name || '个',
        price: material.price || 0
      }
      return mappedMaterial
    })

    console.log('处理后的客户数据:', customers.value)
    console.log('处理后的产品数据:', products.value)
  } catch (error) {
    console.error('获取数据失败:', error)
    ElMessage.error('获取客户或产品数据失败')
  }
}

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    '待确认': 'info',
    '已确认': 'warning',
    '生产中': 'warning',
    '已完成': 'success',
    '已取消': 'danger'
  }
  return statusMap[status] || 'info'
}

// 添加订单统计数据
const orderStats = ref({
  total: 0,
  pending: 0,
  confirmed: 0,
  inProduction: 0,
  readyToShip: 0,
  completed: 0,
  cancelled: 0
})

// 格式化日期
const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

// 计算统计数据
const calculateOrderStats = () => {
  const stats = {
    total: tableData.value.length,
    pending: 0,
    confirmed: 0,
    inProduction: 0,
    readyToShip: 0,
    completed: 0,
    cancelled: 0
  }
  
  tableData.value.forEach(order => {
    if (order.status === 'pending') stats.pending++
    else if (order.status === 'confirmed') stats.confirmed++
    else if (order.status === 'in_production') stats.inProduction++
    else if (order.status === 'ready_to_ship') stats.readyToShip++
    else if (order.status === 'completed') stats.completed++
    else if (order.status === 'cancelled') stats.cancelled++
  })
  
  orderStats.value = stats
}

// 重置搜索方法
const resetSearch = () => {
  searchQuery.value = '';
  statusFilter.value = '';
  dateRange.value = [];
  fetchData();
};

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1;
  fetchData();
};

// 获取订单数据
const fetchData = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchQuery.value,
      status: statusFilter.value,
      sort: 'order_no',  // 使用订单编号排序
      order: 'desc'  // 降序排列，最新的在最前面
    };
    
    // 添加日期范围参数
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD');
      params.endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD');
    }
    
    const response = await salesApi.getOrders(params);
    let orders = response.data.items || response.data;
    
    // 如果后端没有实现排序功能，在前端对数据进行排序
    if (Array.isArray(orders)) {
      // 根据订单编号排序
      orders.sort((a, b) => {
        const orderNoA = a.order_no || '';
        const orderNoB = b.order_no || '';
        
        // 降序排列（较大的订单编号在前）
        if (orderNoA > orderNoB) return -1;
        if (orderNoA < orderNoB) return 1;
        return 0;
      });
    }
    
    tableData.value = orders;
    total.value = response.data.total || (response.data ? response.data.length : 0);
    
    // 计算统计数据
    calculateOrderStats();
  } catch (error) {
    ElMessage.error('获取订单数据失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 对话框控制
const dialogVisible = ref(false)
const dialogType = ref('add')

// 表单数据
const form = reactive({
  customer_id: '',
  customer_name: '',
  contact: '',
  phone: '',
  address: '',
  deliveryDate: '',
  items: [],
  remark: '',
  total_amount: 0
})

// 表单验证规则
const rules = {
  customer_id: [
    { required: true, message: '请选择客户', trigger: 'change' }
  ],
  deliveryDate: [
    { required: true, message: '请选择交付日期', trigger: 'change' }
  ]
}

// 计算订单总金额
const calculateTotalAmount = () => {
  form.total_amount = form.items.reduce((total, item) => {
    return total + (item.quantity * item.unit_price || 0)
  }, 0)
}

// 监听订单项变化，自动计算总金额
watch(() => form.items, () => {
  calculateTotalAmount()
}, { deep: true })

// 计算单个物料项的金额
const calculateItemAmount = (index) => {
  const item = form.items[index]
  if (item && item.quantity && item.unit_price) {
    item.amount = item.quantity * item.unit_price
    calculateTotalAmount()
  }
}

// 检查库存
const checkInventory = async (items) => {
  console.log('checkInventory 开始检查物料库存:', JSON.stringify(items));
  
  // 筛选有效的物料项
  const materialItems = items.filter(item => {
    if (!item.material_id || isNaN(parseInt(item.material_id))) {
      console.warn('跳过无效的物料项:', item);
      return false;
    }
    return true;
  });
  
  if (materialItems.length === 0) {
    console.log('没有有效的物料项需要检查库存');
    return [];
  }
  
  try {
    // 获取所有物料的库存数据
    const materialIds = materialItems.map(item => item.material_id);
    console.log('准备查询以下物料的库存:', materialIds);
    
    const { data: stockResult } = await inventoryApi.getStocks({
      material_ids: materialIds.join(','),
      show_all: true
    });
    
    console.log('库存API返回数据:', JSON.stringify(stockResult));
    
    // 处理库存结果，检查每个物料是否足够
    const insufficientItems = [];
    
    materialItems.forEach(item => {
      // 将数量转换为数字以确保比较正确
      const requiredQuantity = parseFloat(item.quantity);
      console.log(`检查物料 ID:${item.material_id}, 名称:${item.material_name}, 需求数量:${requiredQuantity}`);
      
      // 从API结果中查找对应物料的库存记录
      let stockRecords = [];
      let totalStock = 0;
      
      // 处理不同格式的API响应
      if (stockResult) {
        if (Array.isArray(stockResult)) {
          // 如果stockResult直接是数组
          stockRecords = stockResult.filter(s => s.material_id == item.material_id);
        } else if (stockResult.items && Array.isArray(stockResult.items)) {
          // 如果stockResult有items属性且是数组
          stockRecords = stockResult.items.filter(s => s.material_id == item.material_id);
        } else if (stockResult.data && Array.isArray(stockResult.data)) {
          // 如果stockResult有data属性且是数组
          stockRecords = stockResult.data.filter(s => s.material_id == item.material_id);
        } else if (stockResult.data && stockResult.data.items && Array.isArray(stockResult.data.items)) {
          // 如果stockResult.data有items属性且是数组
          stockRecords = stockResult.data.items.filter(s => s.material_id == item.material_id);
        }
      }
      
      // 计算总库存
      if (stockRecords && stockRecords.length > 0) {
        console.log(`找到物料 ID:${item.material_id} 的库存记录:`, JSON.stringify(stockRecords));
        
        totalStock = stockRecords.reduce((sum, record) => {
          const quantity = parseFloat(record.quantity || 0);
          return sum + quantity;
        }, 0);
      } else {
        console.warn(`未找到物料 ID:${item.material_id} 的库存记录，设置库存为0`);
        totalStock = 0;
      }
      
      console.log(`物料 ID:${item.material_id}, 名称:${item.material_name}, 总库存:${totalStock}, 需求:${requiredQuantity}`);
      
      // 检查库存是否不足
      if (totalStock < requiredQuantity) {
        console.warn(`物料 ID:${item.material_id}, 名称:${item.material_name} 库存不足! 库存:${totalStock}, 需求:${requiredQuantity}`);
        insufficientItems.push({
          ...item,
          currentStock: totalStock,
          stockRecords: stockRecords
        });
      }
    });
    
    console.log(`库存检查完成，发现 ${insufficientItems.length} 个库存不足的物料:`, JSON.stringify(insufficientItems));
    return insufficientItems;
  } catch (error) {
    console.error('检查库存时出错:', error);
    return [];
  }
}

// 获取当前最大序号
const getMaxSequence = async () => {
  let maxSequence = 0;
  try {
    const response = await productionApi.getTodayMaxSequence();
    maxSequence = parseInt(response.data.sequence || '0');
  } catch (seqError) {
    console.warn('获取序号失败，使用本地计算的序号:', seqError);
    
    // 如果获取失败，尝试从现有生产计划中获取最大序号
    try {
      const plansResponse = await productionApi.getProductionPlans();
      const today = new Date();
      const datePrefix = `SC${today.getFullYear().toString().slice(-2)}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
      
      // 筛选出今天的生产计划
      const todayPlans = plansResponse.data.items.filter(plan => 
        plan.code && plan.code.startsWith(datePrefix)
      );
      
      if (todayPlans.length > 0) {
        // 从编码中提取序号部分并找出最大值
        const sequences = todayPlans.map(plan => {
          const seqPart = plan.code.substring(datePrefix.length);
          return parseInt(seqPart) || 0;
        });
        maxSequence = Math.max(...sequences);
      }
    } catch (planError) {
      console.error('获取生产计划失败:', planError);
      // 如果获取失败或没有找到今天的计划，从0开始
      console.log('使用默认序号 0');
    }
  }
  return maxSequence;
};

// 创建生产计划
const createProductionPlan = async (items, orderId = null) => {
  try {
    // 获取当前最大序号
    const maxSequence = await getMaxSequence();
    
    // 生成当前日期的代码前缀
    const today = new Date();
    const datePrefix = `SC${today.getFullYear().toString().slice(-2)}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    
    // 过滤有效的物料项，计算实际需要生产的数量
    const validItems = items.filter(item => {
      // 检查物料是否存在
      if (!item.material_id) {
        console.warn(`跳过物料ID不存在的项: ${item.material_name || '未知物料'}`);
        return false;
      }

      // 确保material_id是数字类型
      const materialId = Number(item.material_id);
      if (isNaN(materialId)) {
        console.warn(`跳过物料ID格式不正确的项: ${item.material_id}`);
        return false;
      }

      // 计算实际需要生产的数量
      const productionQuantity = item.quantity - (item.currentStock || 0);
      if (productionQuantity <= 0) {
        console.warn(`跳过无需生产的物料: ${item.material_name}，需求:${item.quantity}，库存:${item.currentStock}`);
        return false;
      }

      // 补充生产数量字段
      item.productionQuantity = productionQuantity;
      return true;
    });

    if (validItems.length === 0) {
      console.log('没有需要创建生产计划的有效物料项');
      return;
    }
    
    // 创建生产计划，确保每个计划有唯一的编码
    const planPromises = validItems.map(async (item, index) => {
      const sequence = (maxSequence + index + 1).toString().padStart(3, '0');
      const planCode = `${datePrefix}${sequence}`;
      
      const planData = {
        code: planCode,
        name: `订单物料生产计划-${item.material_name}`,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 默认7天后交付
        productId: item.material_id,
        quantity: item.productionQuantity,
        status: 'draft', // 初始状态为草稿
        remark: `为订单${orderId ? `#${orderId}` : ''}创建的生产计划`,
        plan_date: new Date().toISOString().split('T')[0] // 添加当前日期作为计划日期
      };
      
      console.log(`创建生产计划 ${index + 1}/${validItems.length}:`, JSON.stringify(planData));
      
      try {
        const response = await productionApi.createProductionPlan(planData);
        console.log(`生产计划 ${planCode} 创建成功:`, response);
        
        // 如果有订单ID，更新订单状态为生产中
        if (orderId) {
          await salesApi.updateOrderStatus(orderId, { newStatus: 'in_production' });
          console.log(`订单 #${orderId} 状态已更新为生产中`);
        }
        
        return response.data;
      } catch (error) {
        console.error(`生产计划 ${planCode} 创建失败:`, error);
        throw error;
      }
    });
    
    const results = await Promise.all(planPromises);
    console.log(`全部 ${results.length} 个生产计划创建完成`);
    
    // 显示创建成功消息
    ElMessage.success(`成功创建 ${results.length} 个生产计划`);
    
    return results;
  } catch (error) {
    console.error('创建生产计划失败:', error);
    ElMessageBox.alert(
      `创建生产计划失败，请手动创建\n\n错误信息：${error.message || '未知错误'}`,
      '错误提示',
      {
        type: 'error',
        confirmButtonText: '确定'
      }
    );
    throw error; // 抛出错误以便调用方处理
  }
};

// 表单提交
const handleSubmit = async () => {
  console.log('提交表单:', JSON.stringify(form.items));
  
  if (!form.customer_id) {
    ElMessage.error('请选择客户');
    return;
  }
  
  if (form.items.length === 0) {
    ElMessage.error('请添加至少一项产品');
    return;
  }
  
  // 检查库存
  try {
    console.log('开始检查库存');
    const insufficientItems = await checkInventory(form.items);
    console.log('库存检查结果:', JSON.stringify(insufficientItems), '不足项数量:', insufficientItems.length);
    
    // 默认订单状态
    let orderStatus = 'pending';
    
    // 如果有库存不足的物料，显示提示并询问是否继续
    if (insufficientItems.length > 0) {
      // 构建提示消息
      const itemMessages = insufficientItems.map(item => 
        `${item.material_name || '未知物料'}: 需要 ${item.quantity}, 库存 ${item.currentStock}`
      );
      
      const alertMessage = `以下物料库存不足:\n${itemMessages.join('\n')}\n\n是否仍要创建订单?`;
      console.log('显示库存不足提示:', alertMessage);
      
      try {
        await ElMessageBox.confirm(alertMessage, '库存不足警告', {
          confirmButtonText: '继续创建',
          cancelButtonText: '取消',
          type: 'warning',
        });
        console.log('用户选择继续创建订单');
        
        // 用户确认创建订单，创建生产计划并设置状态为生产中
        try {
          console.log('开始为库存不足的物料创建生产计划');
          await createProductionPlan(insufficientItems, form.id);
          console.log('生产计划创建完成');
          // 设置订单状态为生产中，因为需要执行生产计划
          orderStatus = 'in_production';
        } catch (prodError) {
          console.error('创建生产计划过程出错:', prodError);
          // 生产计划创建失败继续创建订单，但显示警告
          ElMessage.warning('创建生产计划失败，订单将继续创建，但请手动创建生产计划');
        }
      } catch (userChoice) {
        console.log('用户取消创建订单:', userChoice);
        return; // 用户取消，退出函数
      }
    } else {
      // 所有物料库存充足，可以直接设置为可发货状态
      orderStatus = 'ready_to_ship';
    }
    
    // 处理表单数据
    loading.value = true;
    const postData = {
      customer_id: form.customer_id,
      delivery_date: form.deliveryDate,
      order_date: form.deliveryDate || new Date().toISOString().split('T')[0],
      status: orderStatus, // 使用根据库存情况计算出的订单状态
      notes: form.remark || '',
      items: form.items.map(item => ({
        material_id: item.material_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        specification: item.specification,
        notes: item.remark
      }))
    };
    
    console.log('准备提交的数据:', JSON.stringify(postData));
    
    // 发送请求保存订单
    try {
      const { data } = await salesApi.createOrder(postData);
      console.log('订单创建成功:', data);
      ElMessage.success('订单创建成功');
      dialogVisible.value = false;
      fetchData(); // 刷新订单列表
    } catch (error) {
      console.error('创建订单失败:', error);
      ElMessage.error('创建订单失败: ' + (error.message || '未知错误'));
    } finally {
      loading.value = false;
    }
  } catch (error) {
    console.error('提交过程中发生错误:', error);
    ElMessage.error('提交过程中发生错误: ' + (error.message || '未知错误'));
  }
}

// 选择客户时自动填充客户信息
const handleCustomerChange = (customerId) => {
  if (!Array.isArray(customers.value)) {
    console.error('customers.value不是数组:', customers.value)
    ElMessage.error('客户数据格式错误')
    return
  }
  
  const selectedCustomer = customers.value.find(c => c.id === customerId)
  console.log('找到的客户:', selectedCustomer)
  
  if (selectedCustomer) {
    form.customer_name = selectedCustomer.name
    form.contact = selectedCustomer.contact_person || selectedCustomer.contact || ''
    form.phone = selectedCustomer.contact_phone || selectedCustomer.phone || ''
    form.address = selectedCustomer.address || ''
  } else {
    console.warn(`未找到ID为${customerId}的客户`)
  }
}

// 处理物料选择变化
const handleMaterialChange = (materialCode, index) => {
  console.log('物料选择变化:', { materialCode, index });
  
  // 查找选中的物料
  const selectedMaterial = products.value.find(p => p.code === materialCode);
  console.log('选中的物料:', selectedMaterial);
  
  if (selectedMaterial) {
    // 确保ID存在
    if (!selectedMaterial.id) {
      console.error('选中的物料缺少ID:', selectedMaterial);
      ElMessage.error('物料数据不完整，请联系管理员');
      return;
    }

    // 确保ID是数字类型
    const materialId = Number(selectedMaterial.id);
    if (isNaN(materialId)) {
      console.error('物料ID不是有效的数字:', selectedMaterial.id);
      ElMessage.error('物料ID格式不正确，请联系管理员');
      return;
    }

    // 更新物料相关信息
    const updatedItem = {
      ...form.items[index],
      material_name: selectedMaterial.name,
      material_code: selectedMaterial.code,
      material_id: materialId, // 使用数字类型的ID
      specification: selectedMaterial.specification || '',
      unit_name: selectedMaterial.unit_name,
      unit_id: selectedMaterial.unit_id,
      unit_price: selectedMaterial.price,
      quantity: form.items[index].quantity || 0,
      amount: (form.items[index].quantity || 0) * (selectedMaterial.price || 0)
    };

    // 打印更新后的物料信息
    console.log(`更新物料 ${index} 的信息:`, updatedItem);
    
    form.items[index] = updatedItem;
    calculateTotalAmount();
  } else {
    console.warn(`未找到编码为${materialCode}的物料`)
  }
}

// 处理物料ID选择变化的函数
const handleMaterialIdChange = (materialId, index) => {
  console.log('选择物料ID:', materialId, '索引:', index)
  console.log('当前物料列表:', products.value)
  
  // 确保products.value是数组
  if (!Array.isArray(products.value)) {
    console.error('products.value不是数组:', products.value)
    ElMessage.error('物料数据格式错误')
    return
  }
  
  const selectedMaterial = products.value.find(p => p.value === materialId)
  console.log('找到的物料:', selectedMaterial)
  
  if (selectedMaterial) {
    form.items[index] = {
      ...form.items[index],
      material_name: selectedMaterial.label.split(' - ')[1],
      material_code: selectedMaterial.label.split(' - ')[0],
      material_id: selectedMaterial.value,
      specification: selectedMaterial.specification || '',
      unit_name: selectedMaterial.unit_name,
      unit_id: selectedMaterial.unit_id,
      unit_price: selectedMaterial.price,
      quantity: form.items[index].quantity || 1
    }
    calculateItemAmount(index)
  } else {
    console.warn(`未找到ID为${materialId}的物料`)
  }
}


// 物料操作
const addMaterial = () => {
  form.items.push({
    id: '',
    name: '',
    code: '',
    specification: '',
    quantity: 1,
    unit_name: '',
    unit_id: '',
    unit_price: 0,
    amount: 0
  })
}

const removeMaterial = (index) => {
  form.items.splice(index, 1)
}

// 状态判断函数
const canConfirm = (row) => row.status === 'pending'
const canCancel = (row) => ['pending', 'confirmed', 'in_production'].includes(row.status)

// 订单操作
const handleAdd = () => {
  console.log('点击新增订单按钮')
  dialogType.value = 'add'
  // 重置表单
  Object.keys(form).forEach(key => {
    if (key === 'items') {
      form[key] = [{
        id: '',
        name: '',
        code: '',
        specification: '',
        quantity: 1,
        unit_name: '',
        unit_id: '',
        unit_price: 0,
        amount: 0
      }]
    } else {
      form[key] = ''
    }
  })
  console.log('新增订单时的物料列表:', products.value)
  dialogVisible.value = true
}

const handleEdit = (row) => {
  console.log('开始编辑订单，原始行数据:', row)
  dialogType.value = 'edit'
  
  // 先清空表单，避免数据混淆
  Object.keys(form).forEach(key => {
    if (key === 'items') {
      form[key] = []
    } else {
      form[key] = ''
    }
  })
  
  // 然后将行数据复制到表单中
  Object.assign(form, {
    ...row,
    // 确保客户ID正确设置，可能需要从不同字段获取
    customer_id: row.customer_id || '',
    customer_name: row.customer_name || row.customer || '',
    deliveryDate: row.deliveryDate || row.delivery_date || '',
    address: row.address || row.delivery_address || '',
    contact: row.contact || row.contact_person || '',
    phone: row.phone || row.contact_phone || '',
    remark: row.remark || row.remarks || row.notes || '',
    items: [] // 先设置为空数组，后面处理
  })
  
  // 处理物料项
  if (Array.isArray(row.items) && row.items.length > 0) {
    // 深拷贝物料项数组
    form.items = row.items.map(item => {
      // 确保每个物料项包含正确的字段
      return {
        ...item,
        code: item.code || item.material_code || '',
        material_name: item.material_name || item.name || '',
        material_id: item.material_id || '',
        specification: item.specification || item.specs || '',
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        unit_name: item.unit_name || '个',
        amount: parseFloat(item.amount) || parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)
      }
    })
  }
  
  // 计算总金额
  calculateTotalAmount()
  
  // 打印调试信息
  console.log('编辑订单，处理后的表单数据:', form)
  
  // 如果没有客户ID，尝试通过客户名查找对应的客户ID
  if (!form.customer_id && form.customer_name && Array.isArray(customers.value)) {
    const matchedCustomer = customers.value.find(c => 
      c.name === form.customer_name || 
      c.name === form.customer
    )
    
    if (matchedCustomer) {
      console.log('通过客户名匹配到客户:', matchedCustomer)
      form.customer_id = matchedCustomer.id
    }
  }
  
  dialogVisible.value = true
}

const handleConfirm = (row) => {
  ElMessageBox.confirm(
    '确定要确认该订单吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      // 确认订单前先检查库存
      console.log('确认订单前检查库存:', row);
      const insufficientItems = await checkInventory(row.items || []);
      
      let newStatus = 'confirmed';
      
      // 如果有库存不足的物料，则创建生产计划并设置状态为生产中
      if (insufficientItems.length > 0) {
        await createProductionPlan(insufficientItems, row.id);
        newStatus = 'in_production'; // 需要生产，设置为生产中
      } else {
        newStatus = 'ready_to_ship'; // 库存充足，可以直接发货
      }
      
      // 调用API更新订单状态
      await salesApi.updateOrderStatus(row.id, { newStatus });
      
      ElMessage.success('订单已确认');
      fetchData(); // 刷新列表
    } catch (error) {
      console.error('确认订单时出错:', error);
      ElMessage.error('确认订单失败: ' + (error.message || '未知错误'));
    }
  }).catch(() => {
    // 用户取消操作
  });
}

const handleCancel = (row) => {
  ElMessageBox.confirm(
    '确定要取消该订单吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      // 调用API更新订单状态为已取消
      await salesApi.updateOrderStatus(row.id, { newStatus: 'cancelled' });
      
      ElMessage.success('订单已取消');
      fetchData(); // 刷新列表
    } catch (error) {
      console.error('取消订单时出错:', error);
      ElMessage.error('取消订单失败: ' + (error.message || '未知错误'));
    }
  }).catch(() => {
    // 用户取消操作
  });
}

// 导入导出
const handleImport = () => {
  // 实现导入逻辑
}

const handleExport = () => {
  // 实现导出逻辑
}

// 表格排序事件处理函数
const handleSortChange = ({ prop, order }) => {
  console.log('表格排序变更:', { prop, order });
  
  // 根据不同列实现排序
  if (prop === 'orderDate') {
    const sortOrder = order === 'descending' ? 'desc' : 'asc';
    // 按日期排序
    tableData.value.sort((a, b) => {
      const dateA = a.orderDate || a.order_date || a.created_at || '';
      const dateB = b.orderDate || b.order_date || b.created_at || '';
      
      const comparison = new Date(dateA) - new Date(dateB);
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  } else if (prop === 'order_no') {
    const sortOrder = order === 'descending' ? 'desc' : 'asc';
    // 按订单编号排序
    tableData.value.sort((a, b) => {
      const orderNoA = a.order_no || '';
      const orderNoB = b.order_no || '';
      
      // 比较订单编号
      let result = 0;
      if (orderNoA > orderNoB) result = 1;
      if (orderNoA < orderNoB) result = -1;
      
      // 根据排序方向返回结果
      return sortOrder === 'desc' ? -result : result;
    });
  }
}

</script>

<style scoped>
.orders-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #303133;
}

.search-card {
  margin-bottom: 16px;
  position: relative;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
}

.action-buttons {
  position: absolute;
  top: 20px;
  right: 20px;
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
  cursor: default;
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
  margin-bottom: 16px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.search-buttons {
  display: flex;
  gap: 8px;
}

.more-actions {
  display: flex;
  justify-content: flex-start;
}

.products-title {
  font-weight: bold;
  margin: 16px 0 8px 0;
}

.order-detail {
  padding: 10px;
}

.table-operations {
  display: flex;
  gap: 8px;
  align-items: center;
}

.operation-group {
  display: flex;
  gap: 4px;
}

.operation-group:not(:last-child) {
  border-right: 1px solid #ebeef5;
  padding-right: 8px;
}
</style>