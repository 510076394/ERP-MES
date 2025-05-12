<template>
  <div class="quotation-container">
    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">{{ quotationStats.total }}</div>
        <div class="stat-label">全部报价</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ quotationStats.pending }}</div>
        <div class="stat-label">待确认</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ quotationStats.confirmed }}</div>
        <div class="stat-label">已确认</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ quotationStats.converted }}</div>
        <div class="stat-label">已转订单</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ quotationStats.expired }}</div>
        <div class="stat-label">已过期</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ conversionRate }}%</div>
        <div class="stat-label">转化率</div>
      </div>
    </div>

    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>报价单管理</span>
        </div>
      </template>
      
      <!-- 搜索表单 -->
      <div class="search-container">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input
              v-model="searchQuery"
              placeholder="报价单号/客户名称"
              @keyup.enter="handleSearch"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          
          <el-col :span="4">
            <el-select v-model="statusFilter" placeholder="报价状态" clearable @change="handleSearch" style="width: 100%">
              <el-option
                v-for="item in quotationStatuses"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-col>
          
          <el-col :span="8">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              @change="handleSearch"
              style="width: 100%"
            />
          </el-col>
          
          <el-col :span="6">
            <div class="search-buttons">
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon>查询
              </el-button>
              <el-button @click="resetSearch">
                <el-icon><Refresh /></el-icon>重置
              </el-button>
              <el-button type="primary" @click="showCreateDialog">
                <el-icon><Plus /></el-icon>新增
              </el-button>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 报价单表格 -->
      <el-table 
        :data="quotations" 
        border
        style="width: 100%; margin-top: 16px;"
        v-loading="loading"
        :max-height="tableHeight"
      >
        <el-table-column prop="id" label="报价单号" width="150" />
        <el-table-column prop="customerName" label="客户名称" width="180" />
        <el-table-column prop="quotationDate" label="报价日期">
          <template #default="scope">
            {{ formatDate(scope.row.quotationDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="报价金额">
          <template #default="scope">
            ¥{{ scope.row.totalAmount.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button link type="primary" size="small" @click="handleView(scope.row)">
              <el-icon><View /></el-icon>查看
            </el-button>
            <el-button link type="success" size="small" @click="handleConvert(scope.row)">
              转为订单
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
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
    
    <!-- 创建/编辑报价单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'create' ? '创建报价单' : '编辑报价单'"
      width="60%"
    >
      <el-form :model="quotationForm" ref="quotationFormRef" :rules="rules" label-width="100px">
        <el-form-item label="客户" prop="customer_id">
          <el-select v-model="quotationForm.customer_id" placeholder="请选择客户">
            <el-option
              v-for="customer in customers"
              :key="customer.id"
              :label="customer.name"
              :value="customer.id"
            />
          </el-select>
        </el-form-item>
        
        <!-- 报价单明细 -->
        <el-form-item label="报价明细">
          <div v-for="(item, index) in quotationForm.items" :key="index" class="item-row">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item
                  :prop="'items.' + index + '.product_name'"
                  :rules="{ required: true, message: '请输入产品名称' }"
                >
                  <el-input v-model="item.product_name" placeholder="产品名称" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item
                  :prop="'items.' + index + '.quantity'"
                  :rules="{ required: true, message: '请输入数量' }"
                >
                  <el-input-number v-model="item.quantity" :min="1" placeholder="数量" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item
                  :prop="'items.' + index + '.unit_price'"
                  :rules="{ required: true, message: '请输入单价' }"
                >
                  <el-input-number v-model="item.unit_price" :precision="2" :step="0.1" placeholder="单价" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-button type="danger" @click="removeItem(index)">删除</el-button>
              </el-col>
            </el-row>
          </div>
          <el-button type="primary" @click="addItem">添加明细</el-button>
        </el-form-item>

        <el-form-item label="备注">
          <el-input type="textarea" v-model="quotationForm.remarks" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitQuotation">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'
import { ref, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from '@/services/api'
import { salesApi } from '@/services/api'
import { Search, Refresh, Plus, Download, Upload, View } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const quotations = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableHeight = ref('calc(100vh - 280px)')
const searchQuery = ref('')
const statusFilter = ref('')
const dateRange = ref([])

// 报价单统计数据
const quotationStats = ref({
  total: 0,
  pending: 0,
  confirmed: 0,
  converted: 0,
  expired: 0
})

const monthlyQuotations = ref(0)
const monthlyAmount = ref(0)
const conversionRate = ref(0)
const customers = ref([])
const dialogVisible = ref(false)
const dialogType = ref('create')
const quotationFormRef = ref(null)

// 表单数据
const quotationForm = ref({
  customer_id: '',
  items: [
    {
      product_name: '',
      quantity: 1,
      unit_price: 0
    }
  ],
  remarks: ''
})

// 表单验证规则
const rules = {
  customer_id: [
    { required: true, message: '请选择客户', trigger: 'change' }
  ]
}

// 状态映射
const quotationStatuses = [
  { value: '待确认', label: '待确认' },
  { value: '已确认', label: '已确认' },
  { value: '已转订单', label: '已转订单' },
  { value: '已过期', label: '已过期' }
]

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    '待确认': 'info',
    '已确认': 'success',
    '已转订单': 'primary',
    '已过期': 'danger'
  }
  return statusMap[status] || 'info'
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

// 计算统计数据
const calculateQuotationStats = () => {
  const stats = {
    total: quotations.value.length,
    pending: 0,
    confirmed: 0,
    converted: 0,
    expired: 0
  }
  
  quotations.value.forEach(quotation => {
    if (quotation.status === '待确认') stats.pending++
    else if (quotation.status === '已确认') stats.confirmed++
    else if (quotation.status === '已转订单') stats.converted++
    else if (quotation.status === '已过期') stats.expired++
  })
  
  quotationStats.value = stats
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

// 获取报价单数据
const fetchData = async () => {
  loading.value = true
  try {
    // 这里应该从后端获取数据
    // 模拟API调用
    setTimeout(() => {
      quotations.value = [
        {
          id: 'QUO001',
          customerName: '张三',
          quotationDate: '2023-05-01',
          totalAmount: 10000,
          status: '待确认'
        },
        {
          id: 'QUO002',
          customerName: '李四',
          quotationDate: '2023-05-02',
          totalAmount: 15000,
          status: '已确认'
        }
      ]
      total.value = quotations.value.length
      calculateQuotationStats()
      loading.value = false
    }, 500)
  } catch (error) {
    ElMessage.error('获取报价单数据失败')
    loading.value = false
  }
}

// 在组件挂载时获取数据
onMounted(() => {
  fetchData()
  // 获取客户数据
  // fetchCustomers()
})

// 添加明细项
const addItem = () => {
  quotationForm.value.items.push({
    product_name: '',
    quantity: 1,
    unit_price: 0
  })
}

// 移除明细项
const removeItem = (index) => {
  quotationForm.value.items.splice(index, 1)
}

// 显示创建对话框
const showCreateDialog = () => {
  dialogType.value = 'create'
  quotationForm.value = {
    customer_id: '',
    items: [
      {
        product_name: '',
        quantity: 1,
        unit_price: 0
      }
    ],
    remarks: ''
  }
  dialogVisible.value = true
}

// 提交报价单
const submitQuotation = async () => {
  // 实现提交逻辑
  dialogVisible.value = false
  ElMessage.success('报价单已保存')
  fetchData()
}

// 刷新数据
const refreshData = () => {
  fetchData()
}

const handleView = (row) => {
  ElMessageBox.alert(`报价单号：${row.id}<br>客户：${row.customerName}<br>日期：${row.quotationDate}<br>金额：${row.totalAmount}`, '报价单详情', {
    dangerouslyUseHTMLString: true
  })
}

const handleConvert = (row) => {
  ElMessageBox.confirm('确定将此报价单转为销售订单？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    ElMessage.success(`报价单 ${row.id} 已转为销售订单`)
  }).catch(() => {})
}
</script>

<style scoped>
.quotation-container {
  padding: 16px;
}

.search-container {
  margin-bottom: 16px;
}

.search-buttons {
  display: flex;
  gap: 8px;
}

.stat-cards {
  display: flex;
  margin-bottom: 16px;
  gap: 16px;
}

.stat-card {
  background-color: #fff;
  border-radius: 4px;
  padding: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  flex: 1;
  text-align: center;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-row {
  margin-bottom: 16px;
  border-bottom: 1px dashed #eee;
  padding-bottom: 16px;
}
</style>