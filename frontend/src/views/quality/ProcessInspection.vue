<template>
  <div class="inspection-container">
    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">{{ inspectionStats.total }}</div>
        <div class="stat-label">全部检验单</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ inspectionStats.pending }}</div>
        <div class="stat-label">待检验</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ inspectionStats.passed }}</div>
        <div class="stat-label">合格</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ inspectionStats.failed }}</div>
        <div class="stat-label">不合格</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ inspectionStats.rework }}</div>
        <div class="stat-label">返工</div>
      </div>
    </div>

    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>过程检验管理</span>
        </div>
      </template>
      
      <!-- 搜索表单 -->
      <div class="search-container">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input
              v-model="searchKeyword"
              placeholder="请输入检验单号/工单号/产品名称"
              @keyup.enter="handleSearch"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          
          <el-col :span="4">
            <el-select v-model="statusFilter" placeholder="检验状态" clearable @change="handleSearch" style="width: 100%">
              <el-option label="待检验" value="pending" />
              <el-option label="合格" value="passed" />
              <el-option label="不合格" value="failed" />
              <el-option label="返工" value="rework" />
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
              <el-button @click="handleRefresh">
                <el-icon><Refresh /></el-icon>重置
              </el-button>
              <el-button type="primary" @click="handleCreate">
                <el-icon><Plus /></el-icon>新增
              </el-button>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 检验单列表 -->
      <el-table
        :data="inspectionList"
        border
        style="width: 100%; margin-top: 16px;"
        v-loading="loading"
        :max-height="tableHeight"
      >
        <el-table-column prop="inspectionNo" label="检验单号" min-width="150" />
        <el-table-column prop="productionOrderNo" label="工单号" min-width="150" />
        <el-table-column prop="processName" label="工序名称" min-width="150" />
        <el-table-column prop="productName" label="产品名称" min-width="180" />
        <el-table-column prop="batchNo" label="批次号" min-width="120" />
        <el-table-column prop="quantity" label="检验数量" min-width="100">
          <template #default="scope">
            {{ scope.row.quantity }} {{ scope.row.unit }}
          </template>
        </el-table-column>
        <el-table-column prop="inspectionDate" label="检验日期" min-width="120">
          <template #default="scope">
            {{ formatDate(scope.row.inspectionDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="inspector" label="检验员" min-width="120" />
        <el-table-column prop="status" label="检验状态" min-width="100">
          <template #default="scope">
            <el-tag
              :type="getStatusType(scope.row.status)"
            >
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="scope">
            <el-button link type="primary" size="small" @click="handleView(scope.row)">
              <el-icon><View /></el-icon>查看
            </el-button>
            <el-button
              v-if="scope.row.status === 'pending'"
              link
              type="primary"
              size="small"
              @click="handleInspect(scope.row)"
            >
              <el-icon><Check /></el-icon>检验
            </el-button>
            <el-dropdown v-if="scope.row.status !== 'pending'" @command="command => handleDropdownCommand(command, scope.row)">
              <el-button link type="success" size="small">
                更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="report">查看报告</el-dropdown-item>
                  <el-dropdown-item v-if="scope.row.status === 'failed'" command="rework">返工</el-dropdown-item>
                  <el-dropdown-item command="print">打印报告</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 新建检验单弹窗 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建过程检验单"
      width="650px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="采购单号" prop="purchaseOrderNo">
          <el-select 
            v-model="form.purchaseOrderNo" 
            placeholder="选择采购单号"
            filterable
            :loading="orderLoading"
            :remote-method="fetchPurchaseOrders"
            @change="handleOrderChange"
          >
            <el-option 
              v-for="order in purchaseOrderOptions" 
              :key="order.id" 
              :label="order.orderNo" 
              :value="order.orderNo" 
            />
            <template #empty>
              <el-empty description="暂无采购单数据" />
            </template>
          </el-select>
        </el-form-item>
        
        <el-form-item label="产品名称" prop="productName">
          <el-input v-model="form.productName" disabled />
        </el-form-item>
        
        <el-form-item label="工序" prop="processId">
          <el-select 
            v-model="form.processId" 
            placeholder="选择工序"
            filterable
          >
            <el-option 
              v-for="process in processOptions" 
              :key="process.id" 
              :label="process.name" 
              :value="process.id" 
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="批次号" prop="batchNo">
          <el-input v-model="form.batchNo" placeholder="请输入批次号" />
        </el-form-item>
        
        <el-form-item label="检验数量" prop="quantity">
          <el-input-number v-model="form.quantity" :min="1" />
          <span class="unit-text">{{ form.unit }}</span>
        </el-form-item>
        
        <el-form-item label="计划检验日期" prop="plannedDate">
          <el-date-picker 
            v-model="form.plannedDate"
            type="date"
            placeholder="选择计划检验日期"
          />
        </el-form-item>
        
        <el-form-item label="备注" prop="note">
          <el-input
            v-model="form.note"
            type="textarea"
            placeholder="请输入备注信息"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 检验弹窗 -->
    <el-dialog
      v-model="inspectDialogVisible"
      title="过程检验"
      width="800px"
      destroy-on-close
    >
      <!-- 保持不变 -->
    </el-dialog>
    
    <!-- 查看检验单弹窗 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="检验单详情"
      width="800px"
    >
      <!-- 保持不变 -->
    </el-dialog>
    
    <!-- 检验报告弹窗 -->
    <el-dialog
      v-model="reportDialogVisible"
      title="检验报告"
      width="800px"
    >
      <!-- 保持不变 -->
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, Refresh, Plus, ArrowDown, View, Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

// 搜索相关
const searchKeyword = ref('')
const statusFilter = ref('')
const dateRange = ref([])

// 表格数据相关
const loading = ref(false)
const inspectionList = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 创建检验单相关
const createDialogVisible = ref(false)
const formRef = ref(null)
const form = reactive({
  purchaseOrderNo: '',
  productName: '',
  processId: '',
  processName: '',
  batchNo: '',
  quantity: 1,
  unit: '',
  plannedDate: new Date(),
  note: ''
})

// 表单验证规则
const rules = {
  purchaseOrderNo: [{ required: true, message: '请选择采购单号', trigger: 'change' }],
  processId: [{ required: true, message: '请选择工序', trigger: 'change' }],
  batchNo: [{ required: true, message: '请输入批次号', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入检验数量', trigger: 'blur' }],
  plannedDate: [{ required: true, message: '请选择计划检验日期', trigger: 'change' }]
}

// 工单选项和工序选项
const purchaseOrderOptions = ref([])
const processOptions = ref([])
const orderLoading = ref(false)

// 添加表格高度自适应
const tableHeight = ref('calc(100vh - 280px)')

// 添加检验单统计数据
const inspectionStats = ref({
  total: 0,
  pending: 0,
  passed: 0,
  failed: 0,
  rework: 0
})

// 计算统计数据的方法
const calculateInspectionStats = () => {
  const stats = {
    total: inspectionList.value.length,
    pending: 0,
    passed: 0,
    failed: 0,
    rework: 0
  }
  
  inspectionList.value.forEach(inspection => {
    if (inspection.status === 'pending') stats.pending++
    else if (inspection.status === 'passed') stats.passed++
    else if (inspection.status === 'failed') stats.failed++
    else if (inspection.status === 'rework') stats.rework++
  })
  
  inspectionStats.value = stats
}

// 添加统一的日期格式化方法
const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

// 初始化
onMounted(() => {
  fetchData()
  fetchPurchaseOrders()
})

// 获取检验单列表
const fetchData = async () => {
  loading.value = true
  
  // 模拟数据，实际项目中应该从API获取
  setTimeout(() => {
    inspectionList.value = [
      {
        id: 1,
        inspectionNo: 'IPQC20250414001',
        productionOrderNo: 'PD20250413001',
        processName: '组装',
        productName: '智能照明控制器',
        batchNo: 'B20250414001',
        quantity: 200,
        unit: '个',
        inspectionDate: '2025-04-14',
        inspector: '张工',
        status: 'pending'
      },
      {
        id: 2,
        inspectionNo: 'IPQC20250413002',
        productionOrderNo: 'PD20250412002',
        processName: '焊接',
        productName: '电路板组件',
        batchNo: 'B20250413002',
        quantity: 300,
        unit: '个',
        inspectionDate: '2025-04-13',
        inspector: '李工',
        status: 'passed'
      },
      {
        id: 3,
        inspectionNo: 'IPQC20250413001',
        productionOrderNo: 'PD20250412001',
        processName: '注塑',
        productName: '外壳部件',
        batchNo: 'B20250413001',
        quantity: 500,
        unit: '个',
        inspectionDate: '2025-04-13',
        inspector: '王工',
        status: 'failed'
      },
      {
        id: 4,
        inspectionNo: 'IPQC20250412003',
        productionOrderNo: 'PD20250411003',
        processName: '涂装',
        productName: '面板',
        batchNo: 'B20250412003',
        quantity: 400,
        unit: '个',
        inspectionDate: '2025-04-12',
        inspector: '赵工',
        status: 'rework'
      }
    ]
    
    total.value = inspectionList.value.length
    calculateInspectionStats()
    loading.value = false
  }, 500)
}

// 获取采购单选项
const fetchPurchaseOrders = async () => {
  orderLoading.value = true
  try {
    // 这里应该替换为实际的API调用
    // const response = await api.getPurchaseOrders()
    // purchaseOrderOptions.value = response.data
    
    // 模拟数据，实际项目中应该从API获取
    purchaseOrderOptions.value = [
      { id: 1, orderNo: 'PO20250413001', productName: '智能照明控制器', unit: '个' },
      { id: 2, orderNo: 'PO20250412002', productName: '电路板组件', unit: '个' },
      { id: 3, orderNo: 'PO20250412001', productName: '外壳部件', unit: '个' },
      { id: 4, orderNo: 'PO20250411003', productName: '面板', unit: '个' }
    ]
  } catch (error) {
    console.error('获取采购单列表失败:', error)
    ElMessage.error('获取采购单列表失败，请稍后重试')
    purchaseOrderOptions.value = []
  } finally {
    orderLoading.value = false
  }
}

// 根据采购单获取工序选项
const handleOrderChange = (orderNo) => {
  const order = purchaseOrderOptions.value.find(item => item.orderNo === orderNo)
  if (order) {
    form.productName = order.productName
    form.unit = order.unit
    
    // 模拟获取该采购单对应的工序
    if (orderNo === 'PO20250413001') {
      processOptions.value = [
        { id: 1, name: '组装' },
        { id: 2, name: '测试' }
      ]
    } else if (orderNo === 'PO20250412002') {
      processOptions.value = [
        { id: 3, name: '焊接' },
        { id: 4, name: '清洗' }
      ]
    } else if (orderNo === 'PO20250412001') {
      processOptions.value = [
        { id: 5, name: '注塑' },
        { id: 6, name: '修边' }
      ]
    } else if (orderNo === 'PO20250411003') {
      processOptions.value = [
        { id: 7, name: '涂装' },
        { id: 8, name: '烘干' }
      ]
    }
  }
}

// 获取状态类型（用于tag颜色）
const getStatusType = (status) => {
  const statusMap = {
    pending: 'info',
    passed: 'success',
    failed: 'danger',
    rework: 'warning'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    pending: '待检验',
    passed: '合格',
    failed: '不合格',
    rework: '返工'
  }
  return statusMap[status] || '未知'
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  fetchData()
}

// 刷新
const handleRefresh = () => {
  searchKeyword.value = ''
  statusFilter.value = ''
  dateRange.value = []
  currentPage.value = 1
  pageSize.value = 20
  fetchData()
}

// 分页相关
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchData()
}

// 新建检验单
const handleCreate = () => {
  // 重置表单
  Object.keys(form).forEach(key => {
    if (key === 'quantity') {
      form[key] = 1
    } else if (key === 'plannedDate') {
      form[key] = new Date()
    } else {
      form[key] = ''
    }
  })
  
  createDialogVisible.value = true
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    // 模拟提交
    setTimeout(() => {
      ElMessage.success('检验单创建成功')
      createDialogVisible.value = false
      fetchData()
    }, 500)
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 查看详情
const handleView = (row) => {
  ElMessage.info(`查看检验单: ${row.inspectionNo}`)
}

// 进行检验
const handleInspect = (row) => {
  ElMessage.info(`对检验单进行检验: ${row.inspectionNo}`)
}

// 处理下拉菜单命令
const handleDropdownCommand = (command, row) => {
  if (command === 'report') {
    handleReport(row)
  } else if (command === 'rework') {
    handleRework(row)
  } else if (command === 'print') {
    handlePrint(row)
  }
}

// 查看报告
const handleReport = (row) => {
  ElMessage.info(`查看检验报告: ${row.inspectionNo}`)
}

// 返工
const handleRework = (row) => {
  ElMessage.info(`对检验单进行返工: ${row.inspectionNo}`)
}

// 打印报告
const handlePrint = (row) => {
  ElMessage.info(`打印检验报告: ${row.inspectionNo}`)
}
</script>

<style scoped>
.inspection-container {
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

.unit-text {
  margin-left: 8px;
}

.inspection-criteria {
  margin-top: 16px;
}

.criteria-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.criteria-item {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #eee;
}

.criteria-item:last-child {
  border-bottom: none;
}
</style> 