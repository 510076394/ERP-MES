<template>
  <div class="production-report-container">
    <div class="page-header">
      <h2>生产报工管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showReportModal">
          <el-icon><Plus /></el-icon> 新增报工
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
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateRangeChange"
          />
        </el-form-item>
        <el-form-item label="生产任务">
          <el-select v-model="searchForm.taskId" placeholder="选择生产任务" clearable>
            <el-option 
              v-for="task in taskList" 
              :key="task.id" 
              :label="`${task.code} - ${task.productName}`" 
              :value="task.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查 询
          </el-button>
          <el-button type="warning" @click="handleExport">
            <el-icon><Download /></el-icon> 导 出
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ reportStats.total || 0 }}</div>
        <div class="stat-label">报工总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ reportStats.completed || 0 }}</div>
        <div class="stat-label">完工数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ reportStats.inProgress || 0 }}</div>
        <div class="stat-label">在产数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ reportStats.qualifiedRate || '0%' }}</div>
        <div class="stat-label">合格率</div>
      </el-card>
    </div>
    
    <!-- 表格区域 -->
    <el-card class="data-card">
      <el-tabs v-model="activeTab" class="report-tabs" @tab-click="handleTabChange">
        <el-tab-pane label="生产汇总" name="summary">
          <el-table
            :data="summaryData"
            border
            style="width: 100%"
            v-loading="loading"
            stripe
          >
            <!-- 展开详情列 -->
            <el-table-column type="expand" width="50">
              <template #default="props">
                <div class="report-detail">
                  <el-descriptions :column="3" border>
                    <el-descriptions-item label="产品名称">{{ props.row.productName }}</el-descriptions-item>
                    <el-descriptions-item label="计划数量">{{ props.row.plannedQuantity }}</el-descriptions-item>
                    <el-descriptions-item label="完成数量">{{ props.row.actualQuantity }}</el-descriptions-item>
                    <el-descriptions-item label="合格数量">{{ props.row.qualifiedQuantity }}</el-descriptions-item>
                    <el-descriptions-item label="不合格数量">{{ props.row.unqualifiedQuantity }}</el-descriptions-item>
                    <el-descriptions-item label="合格率">{{ props.row.qualificationRate }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column prop="productName" label="产品名称" min-width="180" />
            <el-table-column prop="plannedQuantity" label="计划数量" width="100" align="center" />
            <el-table-column prop="actualQuantity" label="完成数量" width="100" align="center" />
            <el-table-column prop="completionRate" label="完成率" width="100" align="center">
              <template #default="scope">
                {{ typeof scope.row.completionRate === 'number' ? 
                  (scope.row.completionRate * 100).toFixed(2) + '%' : 
                  scope.row.completionRate }}
              </template>
            </el-table-column>
            <el-table-column prop="qualifiedQuantity" label="合格数量" width="100" align="center" />
            <el-table-column prop="unqualifiedQuantity" label="不合格数量" width="100" align="center" />
            <el-table-column prop="qualificationRate" label="合格率" width="100" align="center" />
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="生产明细" name="detail">
          <el-table
            :data="detailData"
            border
            style="width: 100%"
            v-loading="loading"
            stripe
          >
            <!-- 展开详情列 -->
            <el-table-column type="expand" width="50">
              <template #default="props">
                <div class="report-detail">
                  <el-descriptions :column="3" border size="small">
                    <el-descriptions-item label="任务编号">{{ props.row.taskCode }}</el-descriptions-item>
                    <el-descriptions-item label="产品名称">{{ props.row.productName }}</el-descriptions-item>
                    <el-descriptions-item label="工序名称">{{ props.row.processName }}</el-descriptions-item>
                    <el-descriptions-item label="报工日期">{{ props.row.reportDate }}</el-descriptions-item>
                    <el-descriptions-item label="计划数量">{{ props.row.plannedQuantity }}</el-descriptions-item>
                    <el-descriptions-item label="完成数量">{{ props.row.completedQuantity }}</el-descriptions-item>
                    <el-descriptions-item label="合格数量">{{ props.row.qualifiedQuantity }}</el-descriptions-item>
                    <el-descriptions-item label="不合格数量">{{ props.row.unqualifiedQuantity }}</el-descriptions-item>
                    <el-descriptions-item label="合格率">
                      {{ calculateQualifiedRate(props.row.qualifiedQuantity, props.row.completedQuantity) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="工时">{{ props.row.workHours }}小时</el-descriptions-item>
                    <el-descriptions-item label="报工人">{{ props.row.reporter }}</el-descriptions-item>
                    <el-descriptions-item label="备注" :span="3">{{ props.row.remarks || '无' }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column prop="taskCode" label="任务编号" min-width="150" />
            <el-table-column prop="productName" label="产品名称" min-width="180" />
            <el-table-column prop="processName" label="工序名称" min-width="150" />
            <el-table-column prop="reportDate" label="报工日期" width="120" align="center" />
            <el-table-column prop="completedQuantity" label="完成数量" width="100" align="center" />
            <el-table-column prop="qualifiedQuantity" label="合格数量" width="100" align="center" />
            <el-table-column label="合格率" width="100" align="center">
              <template #default="scope">
                {{ calculateQualifiedRate(scope.row.qualifiedQuantity, scope.row.completedQuantity) }}
              </template>
            </el-table-column>
            <el-table-column prop="reporter" label="报工人" width="120" />
            <el-table-column label="操作" width="120" fixed="right" align="center">
              <template #default="scope">
                <el-button size="small" type="primary" @click="viewReportDetail(scope.row)">查看</el-button>
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
      </el-tabs>
    </el-card>
    
    <!-- 报工详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="报工详情"
      width="650px"
      destroy-on-close
    >
      <el-descriptions :column="2" border size="medium">
        <el-descriptions-item label="任务编号" label-align="right" width="120px">{{ reportDetail.taskCode }}</el-descriptions-item>
        <el-descriptions-item label="产品名称" label-align="right" width="120px">{{ reportDetail.productName }}</el-descriptions-item>
        <el-descriptions-item label="工序名称" label-align="right">{{ reportDetail.processName }}</el-descriptions-item>
        <el-descriptions-item label="报工日期" label-align="right">{{ reportDetail.reportDate }}</el-descriptions-item>
        <el-descriptions-item label="计划数量" label-align="right">{{ reportDetail.plannedQuantity }}</el-descriptions-item>
        <el-descriptions-item label="完成数量" label-align="right">{{ reportDetail.completedQuantity }}</el-descriptions-item>
        <el-descriptions-item label="合格数量" label-align="right">{{ reportDetail.qualifiedQuantity }}</el-descriptions-item>
        <el-descriptions-item label="不合格数量" label-align="right">{{ reportDetail.unqualifiedQuantity }}</el-descriptions-item>
        <el-descriptions-item label="合格率" label-align="right">
          {{ calculateQualifiedRate(reportDetail.qualifiedQuantity, reportDetail.completedQuantity) }}
        </el-descriptions-item>
        <el-descriptions-item label="工时" label-align="right">{{ reportDetail.workHours }}小时</el-descriptions-item>
        <el-descriptions-item label="报工人" label-align="right">{{ reportDetail.reporter }}</el-descriptions-item>
      </el-descriptions>
      
      <el-divider>备注信息</el-divider>
      <div class="remarks-content">
        <div style="white-space: pre-line;">{{ reportDetail.remarks || '无' }}</div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailVisible = false">关闭</el-button>
          <el-button type="primary" @click="printReport" v-if="reportDetail.id">打印报工单</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 新增报工弹窗 -->
    <el-dialog
      v-model="reportModalVisible"
      title="新增生产报工"
      width="650px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
        label-position="right"
        class="report-form"
      >
        <el-divider content-position="left">基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="生产任务" prop="taskId">
              <el-select 
                v-model="formData.taskId" 
                placeholder="选择生产任务" 
                style="width: 100%"
                filterable
                @change="handleTaskFormChange"
              >
                <el-option 
                  v-for="task in taskList" 
                  :key="task.id" 
                  :label="`${task.code} - ${task.productName}`" 
                  :value="task.id"
                >
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                    <span style="font-weight: bold">{{ task.code }}</span>
                    <span style="color: #8492a6; font-size: 13px">{{ task.productName }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="工序" prop="processId">
              <el-select 
                v-model="formData.processId" 
                placeholder="选择工序" 
                style="width: 100%"
                filterable
                @change="handleProcessChange"
              >
                <el-option 
                  v-for="process in processList" 
                  :key="process.id" 
                  :label="process.processName" 
                  :value="process.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="报工日期" prop="reportDate">
              <el-date-picker
                v-model="formData.reportDate"
                type="date"
                placeholder="选择报工日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-divider content-position="left">数量信息</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="计划数量" prop="plannedQuantity">
              <el-input v-model="formData.plannedQuantity" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="完成数量" prop="completedQuantity">
              <el-input-number 
                v-model="formData.completedQuantity" 
                :min="0" 
                :max="formData.plannedQuantity"
                style="width: 100%"
                @change="handleQuantityChange"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="合格数量" prop="qualifiedQuantity">
              <el-input-number 
                v-model="formData.qualifiedQuantity" 
                :min="0" 
                :max="formData.completedQuantity"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="不合格数量" prop="unqualifiedQuantity">
              <el-input v-model="unqualifiedQuantity" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-divider content-position="left">其他信息</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="工时(小时)" prop="workHours">
              <el-input-number 
                v-model="formData.workHours" 
                :min="0" 
                :precision="1"
                :step="0.5"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="报工人" prop="reporter">
              <el-input v-model="formData.reporter" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="备注" prop="remarks">
              <el-input
                v-model="formData.remarks"
                type="textarea"
                placeholder="请输入备注信息"
                :rows="4"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reportModalVisible = false">取 消</el-button>
          <el-button type="primary" @click="handleReportSubmit">提 交</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Download, Plus } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import axios from '@/services/api'

// 数据定义
const loading = ref(false)
const activeTab = ref('summary')
const searchForm = ref({
  dateRange: [dayjs().subtract(30, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')],
  taskId: undefined
})

// 表格数据
const summaryData = ref([])
const detailData = ref([])
const taskList = ref([])
const processList = ref([])

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 统计数据
const reportStats = ref({
  total: 0,
  completed: 0,
  inProgress: 0,
  qualifiedRate: '0%'
})

// 表单相关
const formRef = ref()
const formData = ref({
  taskId: undefined,
  processId: undefined,
  reportDate: dayjs().format('YYYY-MM-DD'),
  plannedQuantity: 0,
  completedQuantity: 0,
  qualifiedQuantity: 0,
  workHours: 8,
  reporter: '',
  remarks: ''
})

// 不合格数量计算属性
const unqualifiedQuantity = computed(() => {
  return formData.value.completedQuantity - formData.value.qualifiedQuantity
})

// 详情弹窗
const detailVisible = ref(false)
const reportDetail = ref({})

// 新增报工弹窗
const reportModalVisible = ref(false)

// 表单验证规则
const rules = {
  taskId: [{ required: true, message: '请选择生产任务', trigger: 'change' }],
  processId: [{ required: true, message: '请选择工序', trigger: 'change' }],
  reportDate: [{ required: true, message: '请选择报工日期', trigger: 'change' }],
  completedQuantity: [{ required: true, message: '请输入完成数量', trigger: 'blur' }],
  qualifiedQuantity: [{ required: true, message: '请输入合格数量', trigger: 'blur' }],
  workHours: [{ required: true, message: '请输入工时', trigger: 'blur' }],
  reporter: [{ required: true, message: '请输入报工人', trigger: 'blur' }]
}

// 获取任务列表
const fetchTaskList = async () => {
  try {
    const response = await axios.get('/production/tasks', {
      params: { status: 'in_progress' }
    })
    taskList.value = response.data.items || []
  } catch (error) {
    console.error('获取生产任务列表失败:', error)
    ElMessage.error('获取生产任务列表失败')
  }
}

// 获取工序列表
const fetchProcessList = async (taskId) => {
  if (!taskId) {
    processList.value = []
    return
  }
  
  try {
    const response = await axios.get('/production/processes', {
      params: { taskId, status: 'inProgress' }
    })
    processList.value = response.data.items || []
  } catch (error) {
    console.error('获取工序列表失败:', error)
    ElMessage.error('获取工序列表失败')
  }
}

// 获取汇总数据
const fetchSummaryData = async () => {
  if (!searchForm.value.dateRange || searchForm.value.dateRange.length !== 2) {
    ElMessage.warning('请选择日期范围')
    return
  }
  
  loading.value = true
  try {
    const [startDate, endDate] = searchForm.value.dateRange
    const params = {
      startDate,
      endDate,
      taskId: searchForm.value.taskId
    }
    
    const response = await axios.get('/production/reports/summary', { params })
    summaryData.value = response.data || []
    
    // 计算统计数据
    calculateReportStats()
  } catch (error) {
    console.error('获取生产汇总数据失败:', error)
    ElMessage.error('获取生产汇总数据失败')
  }
  loading.value = false
}

// 获取明细数据
const fetchDetailData = async () => {
  if (!searchForm.value.dateRange || searchForm.value.dateRange.length !== 2) {
    ElMessage.warning('请选择日期范围')
    return
  }
  
  loading.value = true
  try {
    const [startDate, endDate] = searchForm.value.dateRange
    const params = {
      startDate,
      endDate,
      taskId: searchForm.value.taskId,
      page: currentPage.value,
      pageSize: pageSize.value
    }
    
    const response = await axios.get('/production/reports/detail', { params })
    if (response.data) {
      detailData.value = response.data.items || []
      total.value = response.data.total || 0
    }
  } catch (error) {
    console.error('获取生产明细数据失败:', error)
    ElMessage.error('获取生产明细数据失败')
  }
  loading.value = false
}

// 计算报工统计数据
const calculateReportStats = () => {
  if (!summaryData.value || summaryData.value.length === 0) {
    reportStats.value = {
      total: 0,
      completed: 0,
      inProgress: 0,
      qualifiedRate: '0%'
    }
    return
  }
  
  let totalCompleted = 0
  let totalQualified = 0
  let totalQuantity = 0
  
  summaryData.value.forEach(item => {
    totalQuantity += item.actualQuantity || 0
    totalCompleted += (item.completionRate * 100) >= 100 ? 1 : 0
    totalQualified += item.qualifiedQuantity || 0
  })
  
  const qualifiedRate = totalQuantity > 0 ? ((totalQualified / totalQuantity) * 100).toFixed(2) + '%' : '0%'
  
  reportStats.value = {
    total: summaryData.value.length,
    completed: totalCompleted,
    inProgress: summaryData.value.length - totalCompleted,
    qualifiedRate
  }
}

// 计算合格率
const calculateQualifiedRate = (qualified, total) => {
  if (!total || total === 0) return '0%'
  return ((qualified / total) * 100).toFixed(2) + '%'
}

// 导出报表
const handleExport = async () => {
  if (!searchForm.value.dateRange || searchForm.value.dateRange.length !== 2) {
    ElMessage.warning('请选择日期范围')
    return
  }
  
  try {
    const [startDate, endDate] = searchForm.value.dateRange
    const params = {
      startDate,
      endDate,
      taskId: searchForm.value.taskId
    }
    
    const response = await axios.get('/production/reports/export', {
      params,
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = `生产报工_${params.startDate}_${params.endDate}.xlsx`
    link.click()
    
    ElMessage.success('导出报表成功')
  } catch (error) {
    console.error('导出报表失败:', error)
    ElMessage.error('导出报表失败')
  }
}

// 查看报工详情
const viewReportDetail = (record) => {
  reportDetail.value = record
  detailVisible.value = true
}

// 显示新增报工弹窗
const showReportModal = () => {
  formData.value = {
    taskId: undefined,
    processId: undefined,
    reportDate: dayjs().format('YYYY-MM-DD'),
    plannedQuantity: 0,
    completedQuantity: 0,
    qualifiedQuantity: 0,
    workHours: 8,
    reporter: '',
    remarks: ''
  }
  
  reportModalVisible.value = true
}

// 任务变更处理
const handleTaskFormChange = async (taskId) => {
  // 清空工序选择和计划数量
  formData.value.processId = undefined
  formData.value.plannedQuantity = 0
  
  // 获取该任务的工序列表
  await fetchProcessList(taskId)
}

// 工序变更处理
const handleProcessChange = (processId) => {
  const selectedProcess = processList.value.find(p => p.id === processId)
  if (selectedProcess) {
    formData.value.plannedQuantity = selectedProcess.plannedQuantity || 0
    // 默认设置完成数量为计划数量
    formData.value.completedQuantity = selectedProcess.plannedQuantity || 0
    formData.value.qualifiedQuantity = selectedProcess.plannedQuantity || 0
  }
}

// 完成数量变更处理
const handleQuantityChange = (value) => {
  // 如果合格数量大于新的完成数量，则修改合格数量
  if (formData.value.qualifiedQuantity > value) {
    formData.value.qualifiedQuantity = value
  }
}

// 提交报工
const handleReportSubmit = async () => {
  try {
    await formRef.value.validate()
    
    // 检查完成数量和合格数量
    if (formData.value.completedQuantity > formData.value.plannedQuantity) {
      ElMessage.warning('完成数量不能大于计划数量')
      return
    }
    
    if (formData.value.qualifiedQuantity > formData.value.completedQuantity) {
      ElMessage.warning('合格数量不能大于完成数量')
      return
    }
    
    // 准备提交数据
    const reportData = {
      taskId: formData.value.taskId,
      processId: formData.value.processId,
      reportDate: formData.value.reportDate,
      completedQuantity: formData.value.completedQuantity,
      qualifiedQuantity: formData.value.qualifiedQuantity,
      unqualifiedQuantity: formData.value.completedQuantity - formData.value.qualifiedQuantity,
      workHours: formData.value.workHours,
      reporter: formData.value.reporter,
      remarks: formData.value.remarks
    }
    
    // 发送请求
    await axios.post('/production/reports', reportData)
    
    ElMessage.success('报工提交成功')
    reportModalVisible.value = false
    
    // 刷新数据
    fetchData()
  } catch (error) {
    console.error('报工提交失败:', error)
    ElMessage.error('报工提交失败: ' + (error.response?.data?.message || error.message))
  }
}

// 事件处理
const handleDateRangeChange = () => {
  // 日期范围变化时重置页码
  currentPage.value = 1
}

const handleSearch = () => {
  currentPage.value = 1
  fetchData()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchDetailData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchDetailData()
}

const handleTabChange = (tab) => {
  activeTab.value = tab
  fetchData()
}

// 获取数据
const fetchData = () => {
  if (activeTab.value === 'summary') {
    fetchSummaryData()
  } else {
    fetchDetailData()
  }
}

// 生命周期
onMounted(() => {
  fetchTaskList()
  fetchData()
})

// 监听
watch(() => searchForm.value.dateRange, () => {
  if (searchForm.value.dateRange && searchForm.value.dateRange.length === 2) {
    currentPage.value = 1
  }
})

// 添加打印报工单方法
const printReport = () => {
  const printWindow = window.open('', '_blank');
  const reportData = reportDetail.value;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>生产报工单</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        table, th, td {
          border: 1px solid #ddd;
        }
        th, td {
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
        .label {
          font-weight: bold;
          width: 120px;
        }
        .footer {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
        }
        @media print {
          button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">生产报工单</div>
        <div>报工日期：${reportData.reportDate}</div>
      </div>
      
      <table>
        <tr>
          <td class="label">任务编号</td>
          <td>${reportData.taskCode}</td>
          <td class="label">产品名称</td>
          <td>${reportData.productName}</td>
        </tr>
        <tr>
          <td class="label">工序名称</td>
          <td>${reportData.processName}</td>
          <td class="label">报工人</td>
          <td>${reportData.reporter}</td>
        </tr>
        <tr>
          <td class="label">计划数量</td>
          <td>${reportData.plannedQuantity}</td>
          <td class="label">完成数量</td>
          <td>${reportData.completedQuantity}</td>
        </tr>
        <tr>
          <td class="label">合格数量</td>
          <td>${reportData.qualifiedQuantity}</td>
          <td class="label">不合格数量</td>
          <td>${reportData.unqualifiedQuantity}</td>
        </tr>
        <tr>
          <td class="label">工时</td>
          <td colspan="3">${reportData.workHours}小时</td>
        </tr>
        <tr>
          <td class="label">备注</td>
          <td colspan="3">${reportData.remarks || '-'}</td>
        </tr>
      </table>
      
      <div class="footer">
        <div>报工人签名：__________________</div>
        <div>主管签名：__________________</div>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()">打印报工单</button>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
</script>

<style scoped>
.production-report-container {
  padding: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.search-card {
  margin-bottom: 16px;
  border-radius: 4px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.statistics-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 16px;
}

.stat-card {
  flex: 1;
  min-width: 150px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 4px;
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

.data-card {
  margin-bottom: 20px;
  border-radius: 4px;
}

.report-tabs {
  margin-bottom: 16px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.report-detail {
  padding: 20px;
  background-color: #f9f9f9;
}

.report-form .el-form-item {
  margin-bottom: 18px;
}

.remarks-content {
  padding: 10px;
  min-height: 60px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.dialog-footer {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>