<template>
  <div class="production-process-container">
    <div class="page-header">
      <h2>生产过程管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showAddProcessModal" v-if="searchForm.taskId">
          <el-icon><Plus /></el-icon> 添加工序
        </el-button>
      </div>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="任务编号">
          <el-input v-model="searchForm.code" placeholder="输入任务编号" clearable></el-input>
        </el-form-item>
        <el-form-item label="产品名称">
          <el-input v-model="searchForm.productName" placeholder="输入产品名称" clearable></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="handleRefresh">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ processStats.total || 0 }}</div>
        <div class="stat-label">工序总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ processStats.pending || 0 }}</div>
        <div class="stat-label">待开始</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ processStats.inProgress || 0 }}</div>
        <div class="stat-label">进行中</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ processStats.completed || 0 }}</div>
        <div class="stat-label">已完成</div>
      </el-card>
    </div>
    
    <!-- 数据表格 -->
    <el-card class="data-card">
      <el-table
        :data="taskList"
        border
        style="width: 100%"
        v-loading="loading"
      >
        <!-- 展开详情列 -->
        <el-table-column type="expand" width="50">
          <template #default="props">
            <div class="process-detail">
              <h4>工序列表</h4>
              <el-table :data="props.row.processes" border>
                <el-table-column prop="processName" label="工序名称" width="150" />
                <el-table-column label="计划开始时间" width="150">
                  <template #default="scope">
                    {{ formatDateTime(scope.row.plannedStartTime) }}
                  </template>
                </el-table-column>
                <el-table-column label="计划结束时间" width="150">
                  <template #default="scope">
                    {{ formatDateTime(scope.row.plannedEndTime) }}
                  </template>
                </el-table-column>
                <el-table-column label="进度" width="800">
                  <template #default="scope">
                    <el-progress :percentage="scope.row.progress" :status="getProgressStatus(scope.row.progress)"></el-progress>
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="100">
                  <template #default="scope">
                    <el-tag :type="getStatusType(scope.row.status)">
                      {{ getStatusText(scope.row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="160">
                  <template #default="scope">
                    <el-button size="small" type="primary" @click="showUpdateModal(scope.row)">更新</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
        
        <!-- 主表格内容 -->
        <el-table-column prop="code" label="任务编号" width="140" />
        <el-table-column prop="productName" label="产品名称" width="250" />
        <el-table-column label="关联单据" width="140">
          <template #default="scope">
            <template v-if="scope.row.plan_id">
              {{ getPlanCode(scope.row.plan_id) }}
            </template>
            <span v-else>无关联计划</span>
          </template>
        </el-table-column>
        <el-table-column label="生产数量" width="150">
          <template #default="scope">
            {{ formatQuantity(scope.row.quantity) }}
          </template>
        </el-table-column>
        <el-table-column label="开始日期" width="150">
          <template #default="scope">
            {{ formatDate(scope.row.start_date) }}
          </template>
        </el-table-column>
        <el-table-column label="预计结束日期" width="150">
          <template #default="scope">
            {{ formatDate(scope.row.expected_end_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="manager" label="负责人" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getTaskStatusType(scope.row.status)">
              {{ getTaskStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="327" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handleAddProcessToTask(scope.row.id)">添加工序</el-button>
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
    </el-card>

    <!-- 更新进度弹窗 -->
    <el-dialog
      v-model="modalVisible"
      title="更新生产进度"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="工序名称" prop="processName">
              <el-input v-model="formData.processName" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="当前状态" prop="status">
              <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
                <el-option label="未开始" value="pending" v-if="formData.progress === 0" />
                <el-option label="进行中" value="inProgress" v-if="formData.progress < 100" />
                <el-option label="已完成" value="completed" v-if="formData.progress === 100" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="进度" prop="progress">
              <el-slider
                v-model="formData.progress"
                :min="0"
                :max="100"
                :step="5"
                show-input
                :disabled="formData.status === 'completed'"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20" v-if="!formData.actualStartTime">
          <el-col :span="24">
            <el-form-item label="实际开始时间" prop="actualStartTime">
              <el-date-picker
                v-model="formData.actualStartTime"
                type="datetime"
                placeholder="选择实际开始时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20" v-if="formData.status === 'completed'">
          <el-col :span="24">
            <el-form-item label="实际结束时间" prop="actualEndTime">
              <el-date-picker
                v-model="formData.actualEndTime"
                type="datetime"
                placeholder="选择实际结束时间"
                style="width: 100%"
              />
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
          <el-button @click="modalVisible = false">取消</el-button>
          <el-button type="primary" @click="handleModalOk">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加工序弹窗 -->
    <el-dialog
      v-model="addModalVisible"
      title="添加工序"
      width="600px"
    >
      <el-form
        ref="addFormRef"
        :model="addFormData"
        :rules="addRules"
        label-width="120px"
      >
        <el-form-item label="工序名称" prop="processName">
          <el-input v-model="addFormData.processName" placeholder="请输入工序名称" />
        </el-form-item>
        
        <el-form-item label="计划开始时间" prop="plannedStartTime">
          <el-date-picker
            v-model="addFormData.plannedStartTime"
            type="datetime"
            placeholder="选择计划开始时间"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="计划结束时间" prop="plannedEndTime">
          <el-date-picker
            v-model="addFormData.plannedEndTime"
            type="datetime"
            placeholder="选择计划结束时间"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="工序顺序" prop="sequence">
          <el-input-number v-model="addFormData.sequence" :min="1" :step="1" />
        </el-form-item>
        
        <el-form-item label="负责人" prop="responsiblePerson">
          <el-input v-model="addFormData.responsiblePerson" placeholder="请输入负责人" />
        </el-form-item>
        
        <el-form-item label="备注" prop="remarks">
          <el-input
            v-model="addFormData.remarks"
            type="textarea"
            placeholder="请输入备注信息"
            :rows="4"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addModalVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAddProcess">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import axios from '@/services/api'

// 数据定义
const loading = ref(false)
const taskList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 搜索表单
const searchForm = ref({
  code: '',
  productName: ''
})

// 统计数据
const processStats = ref({
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0
})

// 表单相关
const modalVisible = ref(false)
const formRef = ref()
const formData = ref({
  id: '',
  processName: '',
  status: '',
  progress: 0,
  actualStartTime: null,
  actualEndTime: null,
  remarks: ''
})

// 添加工序表单
const addModalVisible = ref(false)
const addFormRef = ref()
const addFormData = ref({
  processName: '',
  plannedStartTime: null,
  plannedEndTime: null,
  sequence: 1,
  responsiblePerson: '',
  remarks: ''
})

const rules = {
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  progress: [{ required: true, message: '请设置进度', trigger: 'change' }],
  actualStartTime: [{ required: true, message: '请选择实际开始时间', trigger: 'change' }],
  actualEndTime: [{ 
    required: true, 
    message: '请选择实际结束时间', 
    trigger: 'change',
    validator: (rule, value, callback) => {
      if (formData.value.status === 'completed' && !value) {
        callback(new Error('已完成状态下必须填写实际结束时间'))
      } else {
        callback()
      }
    }
  }]
}

// 添加工序的校验规则
const addRules = {
  processName: [
    { required: true, message: '请输入工序名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度应在 2 到 50 个字符之间', trigger: 'blur' }
  ],
  plannedStartTime: [
    { required: true, message: '请选择计划开始时间', trigger: 'change' }
  ],
  plannedEndTime: [
    { required: true, message: '请选择计划结束时间', trigger: 'change' },
    { 
      validator: (rule, value, callback) => {
        if (addFormData.value.plannedStartTime && value && value <= addFormData.value.plannedStartTime) {
          callback(new Error('计划结束时间必须晚于计划开始时间'))
        } else {
          callback()
        }
      }, 
      trigger: 'change' 
    }
  ],
  sequence: [
    { required: true, message: '请输入工序顺序', trigger: 'blur' }
  ]
}

// 格式化日期时间
const formatDateTime = (datetime) => {
  if (!datetime) return '-'
  return dayjs(datetime).format('YYYY-MM-DD HH:mm')
}

// 格式化数量
const formatQuantity = (quantity) => {
  if (quantity === null || quantity === undefined || quantity === '') return '-'
  return Number(quantity).toLocaleString()
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

// 获取计划编号
const getPlanCode = (planId) => {
  const plan = planList.value.find(p => p.id === planId)
  return plan ? plan.code : `计划${planId}`
}

// 获取生产任务列表
const fetchTaskList = async () => {
  try {
    loading.value = true
    
    // 修改查询参数，不指定status，以便获取所有状态的任务
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      code: searchForm.value.code,
      productName: searchForm.value.productName
      // 移除status限制，以便获取所有状态的任务
    }
    
    const response = await axios.get('/production/tasks', { params })
    
    // 先获取所有计划
    await fetchPlanList()
    
    // 处理任务数据
    const tasks = response.data.items || []
    
    // 筛选进行中和已完成的任务
    const filteredTasks = tasks.filter(task => {
      return task.status === 'inProgress' || 
             task.status === 'in_progress' || 
             task.status === 'processing' || 
             task.status === 'doing' ||
             task.status === 'completed' ||
             task.status === 'done'
    })
    
    // 为每个任务添加工序列表
    const tasksWithProcesses = await Promise.all(filteredTasks.map(async task => {
      try {
        // 获取任务关联的工序
        const processResponse = await axios.get('/production/processes', {
          params: { taskId: task.id }
        })
        
        return {
          ...task,
          processes: processResponse.data.items || []
        }
      } catch (error) {
        console.error(`获取任务${task.id}的工序失败:`, error)
        return {
          ...task,
          processes: []
        }
      }
    }))
    
    taskList.value = tasksWithProcesses
    total.value = response.data.total || 0
    
    // 计算工序统计数据
    calculateProcessStats()
  } catch (error) {
    console.error('获取生产任务列表失败:', error)
    ElMessage.error('获取生产任务列表失败')
  } finally {
    loading.value = false
  }
}

// 获取计划列表
const planList = ref([])
const fetchPlanList = async () => {
  try {
    const response = await axios.get('/production/plans', {
      params: { pageSize: 500 }  // 获取足够多的计划以便引用
    })
    
    planList.value = response.data.items || []
  } catch (error) {
    console.error('获取生产计划列表失败:', error)
  }
}

// 添加工序到特定任务
const handleAddProcessToTask = (taskId) => {
  if (!taskId) {
    ElMessage.warning('请选择一个生产任务')
    return
  }
  
  // 设置当前选择的任务ID
  searchForm.value.taskId = taskId
  
  // 重置表单
  addFormData.value = {
    processName: '',
    plannedStartTime: null,
    plannedEndTime: null,
    sequence: 1,
    responsiblePerson: '',
    remarks: ''
  }
  
  // 获取当前任务的工序数量来设置序号
  const task = taskList.value.find(t => t.id === taskId)
  if (task && task.processes) {
    addFormData.value.sequence = task.processes.length + 1
  }
  
  // 显示对话框
  addModalVisible.value = true
}

// 计算工序统计数据
const calculateProcessStats = () => {
  const stats = {
    total: taskList.value.length,
    pending: 0,
    inProgress: 0,
    completed: 0
  }
  
  taskList.value.forEach(task => {
    task.processes.forEach(process => {
      if (process.status === 'pending') stats.pending++
      else if (process.status === 'inProgress') stats.inProgress++
      else if (process.status === 'completed') stats.completed++
    })
  })
  
  processStats.value = stats
}

// 状态相关
const getStatusType = (status) => {
  const statusMap = {
    pending: 'info',
    inProgress: 'warning',
    completed: 'success'
  }
  return statusMap[status] || 'default'
}

const getStatusText = (status) => {
  const statusMap = {
    pending: '待开始',
    inProgress: '进行中',
    completed: '已完成'
  }
  return statusMap[status] || status
}

// 任务状态类型
const getTaskStatusType = (status) => {
  const statusMap = {
    pending: 'info',
    inProgress: 'primary',
    in_progress: 'primary',
    processing: 'primary',
    doing: 'primary',
    completed: 'success',
    done: 'success',
    cancelled: 'danger',
    cancel: 'danger'
  }
  return statusMap[status] || 'default'
}

// 任务状态文本
const getTaskStatusText = (status) => {
  const statusMap = {
    pending: '待开始',
    inProgress: '进行中',
    in_progress: '进行中',
    processing: '进行中',
    doing: '进行中',
    completed: '已完成',
    done: '已完成',
    cancelled: '已取消',
    cancel: '已取消'
  }
  return statusMap[status] || status
}

// 事件处理
const handleSearch = () => {
  currentPage.value = 1
  fetchTaskList()
}

const handleRefresh = () => {
  fetchTaskList()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchTaskList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchTaskList()
}

const showUpdateModal = (record) => {
  formData.value = {
    id: record.id,
    processName: record.processName,
    status: record.status,
    progress: record.progress,
    actualStartTime: record.actualStartTime ? dayjs(record.actualStartTime).toDate() : null,
    actualEndTime: record.actualEndTime ? dayjs(record.actualEndTime).toDate() : null,
    remarks: ''
  }
  modalVisible.value = true
}

const handleModalOk = async () => {
  try {
    await formRef.value.validate()
    
    // 检查状态和进度是否匹配
    if (formData.value.status === 'completed' && formData.value.progress !== 100) {
      ElMessage.warning('已完成状态下进度必须为100%')
      return
    }
    
    if (formData.value.status === 'pending' && formData.value.progress > 0) {
      ElMessage.warning('未开始状态下进度必须为0%')
      return
    }
    
    // 如果状态是已完成，但是没有设置实际结束时间，则使用当前时间
    if (formData.value.status === 'completed' && !formData.value.actualEndTime) {
      formData.value.actualEndTime = new Date()
    }
    
    const data = {
      status: formData.value.status,
      progress: formData.value.progress,
      actualStartTime: formData.value.actualStartTime ? dayjs(formData.value.actualStartTime).format('YYYY-MM-DD HH:mm:ss') : null,
      actualEndTime: formData.value.actualEndTime ? dayjs(formData.value.actualEndTime).format('YYYY-MM-DD HH:mm:ss') : null,
      remarks: formData.value.remarks
    }
    
    await axios.put(`/production/processes/${formData.value.id}`, data)
    ElMessage.success('进度更新成功')
    modalVisible.value = false
    fetchTaskList()
  } catch (error) {
    console.error('更新进度失败:', error)
    ElMessage.error('更新进度失败: ' + (error.response?.data?.message || error.message))
  }
}

// 监听进度变化自动更改状态
watch(() => formData.value.progress, (newValue) => {
  if (newValue === 0) {
    formData.value.status = 'pending'
  } else if (newValue === 100) {
    formData.value.status = 'completed'
  } else {
    formData.value.status = 'inProgress'
  }
})

// 添加进度状态函数
const getProgressStatus = (progress) => {
  if (progress === 100) return 'success'
  if (progress > 50) return 'warning'
  return ''
}

// 生命周期
onMounted(() => {
  fetchTaskList()
})

// 显示添加工序对话框
const showAddProcessModal = () => {
  if (!searchForm.value.taskId) {
    ElMessage.warning('请先选择一个生产任务')
    return
  }
  
  // 重置表单
  addFormData.value = {
    processName: '',
    plannedStartTime: null,
    plannedEndTime: null,
    sequence: taskList.value.length + 1,
    responsiblePerson: '',
    remarks: ''
  }
  
  // 显示对话框
  addModalVisible.value = true
}

// 添加工序
const handleAddProcess = async () => {
  try {
    await addFormRef.value.validate()
    
    // 检查时间是否合理
    if (addFormData.value.plannedEndTime <= addFormData.value.plannedStartTime) {
      ElMessage.warning('计划结束时间必须晚于计划开始时间')
      return
    }
    
    // 准备提交的数据
    const data = {
      taskId: searchForm.value.taskId,
      processName: addFormData.value.processName,
      sequenceNumber: addFormData.value.sequence,
      plannedStartTime: addFormData.value.plannedStartTime ? dayjs(addFormData.value.plannedStartTime).format('YYYY-MM-DD HH:mm:ss') : null,
      plannedEndTime: addFormData.value.plannedEndTime ? dayjs(addFormData.value.plannedEndTime).format('YYYY-MM-DD HH:mm:ss') : null,
      responsiblePerson: addFormData.value.responsiblePerson,
      description: addFormData.value.remarks,
      status: 'pending',
      progress: 0
    }
    
    // 发送请求
    loading.value = true
    const response = await axios.post('/production/processes', data)
    
    // 处理响应
    ElMessage.success('工序添加成功')
    addModalVisible.value = false
    
    // 刷新列表
    fetchTaskList()
  } catch (error) {
    console.error('添加工序失败:', error)
    
    // 提供更详细的错误信息
    if (error.response && error.response.data && error.response.data.message) {
      ElMessage.error(`添加工序失败: ${error.response.data.message}`)
    } else if (error.message) {
      ElMessage.error(`添加工序失败: ${error.message}`)
    } else {
      ElMessage.error('添加工序失败，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.production-process-container {
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
}

.statistics-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
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
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.data-card {
  margin-bottom: 20px;
  border-radius: 4px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.process-detail {
  padding: 20px;
}
</style>