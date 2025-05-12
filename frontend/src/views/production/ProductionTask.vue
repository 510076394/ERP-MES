<template>
  <div class="production-task-container">
    <div class="page-header">
      <h2>生产任务管理</h2>
      <el-button type="primary" @click="showCreateModal">
        <el-icon><Plus /></el-icon> 创建任务
      </el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="任务编号">
          <el-input v-model="searchForm.code" placeholder="请输入任务编号" clearable />
        </el-form-item>
        <el-form-item label="产品名称">
          <el-input v-model="searchForm.productName" placeholder="请输入产品名称" clearable />
        </el-form-item>
        <el-form-item label="任务状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="未开始" value="pending" />
            <el-option label="进行中" value="inProgress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计卡片区域 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ taskStats.total }}</div>
        <div class="stat-label">总任务数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ taskStats.pending }}</div>
        <div class="stat-label">未开始</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ taskStats.inProgress }}</div>
        <div class="stat-label">进行中</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ taskStats.completed }}</div>
        <div class="stat-label">已完成</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ taskStats.cancelled }}</div>
        <div class="stat-label">已取消</div>
      </el-card>
    </div>

    <!-- 数据表格区域 -->
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
            <div class="task-detail">
              <el-descriptions :column="3" border>
                <el-descriptions-item label="任务编号">{{ props.row.code }}</el-descriptions-item>
                <el-descriptions-item label="产品名称">{{ props.row.productName }}</el-descriptions-item>
                <el-descriptions-item label="关联单据">
                  <template v-if="props.row.plan_id">
                    {{ planList.find(plan => plan.id === props.row.plan_id)?.code || '计划' + props.row.plan_id }}
                  </template>
                  <template v-else>无关联计划</template>
                </el-descriptions-item>
                <el-descriptions-item label="生产数量">
                  <template v-if="props.row.quantity !== null && props.row.quantity !== undefined && props.row.quantity !== '' || props.row.quantity === 0">{{ formatQuantity(props.row.quantity) }}</template>
                  <template v-else>-</template>
                </el-descriptions-item>
                <el-descriptions-item label="负责人">{{ props.row.manager || '-' }}</el-descriptions-item>
                <el-descriptions-item label="开始日期">
                  {{ props.row.startDate ? dayjs(props.row.startDate).format('YYYY-MM-DD') : '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="预计结束日期">
                  {{ props.row.expectedEndDate ? dayjs(props.row.expectedEndDate).format('YYYY-MM-DD') : '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="实际结束日期">
                  {{ props.row.actualEndDate ? dayjs(props.row.actualEndDate).format('YYYY-MM-DD') : '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="备注" :span="3">{{ props.row.remarks || '无' }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="code" label="任务编号" width="140" />
        <el-table-column prop="productName" label="产品名称" min-width="150" />
        <el-table-column label="关联单据" width="140">
          <template #default="scope">
            <template v-if="scope.row.plan_id">
              {{ planList.find(plan => plan.id === scope.row.plan_id)?.code || '计划' + scope.row.plan_id }}
            </template>
            <span v-else>无关联计划</span>
          </template>
        </el-table-column>
        <el-table-column label="生产数量" width="120">
          <template #default="scope">
            <span v-if="scope.row.quantity !== null && scope.row.quantity !== undefined && scope.row.quantity !== '' || scope.row.quantity === 0">
              {{ formatQuantity(scope.row.quantity) }}
            </span>
            <span v-else>
              -
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="startDate" label="开始日期" width="120">
          <template #default="scope">
            {{ scope.row.startDate ? dayjs(scope.row.startDate).format('YYYY-MM-DD') : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="expectedEndDate" label="预计结束日期" width="120">
          <template #default="scope">
            {{ scope.row.expectedEndDate ? dayjs(scope.row.expectedEndDate).format('YYYY-MM-DD') : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="manager" label="负责人" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="scope">
            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
              <el-button size="small" type="primary" @click="showTaskDetail(scope.row)">查看</el-button>
              <el-button size="small" type="success" @click="handleEdit(scope.row)">编辑</el-button>
              <el-dropdown>
                <el-button size="small" type="info">
                  更多 <el-icon class="el-icon--right"><arrow-down /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="scope.row.status === 'pending'" @click="startTask(scope.row)">
                      <el-icon><CaretRight /></el-icon> 开始任务
                    </el-dropdown-item>
                    <el-dropdown-item v-if="scope.row.status === 'inProgress' || scope.row.status === 'processing' || scope.row.status === 'doing'" @click="completeTask(scope.row)">
                      <el-icon><Check /></el-icon> 完成任务
                    </el-dropdown-item>
                    <el-dropdown-item v-if="scope.row.status === 'pending' || scope.row.status === 'inProgress' || scope.row.status === 'processing' || scope.row.status === 'doing'" @click="cancelTask(scope.row)">
                      <el-icon><Close /></el-icon> 取消任务
                    </el-dropdown-item>
                    <el-dropdown-item divided @click="handleDelete(scope.row)" class="danger">
                      <el-icon><Delete /></el-icon> 删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
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
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 创建/编辑任务对话框 -->
    <el-dialog
      v-model="modalVisible"
      :title="modalTitle"
      width="800px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="任务编号" prop="code" v-if="modalTitle === '新建生产任务'">
              <el-input v-model="formData.code" disabled placeholder="系统自动生成" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人" prop="manager">
              <el-input v-model="formData.manager" placeholder="请输入负责人" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="生产计划" prop="planId">
              <el-select v-model="formData.planId" placeholder="请选择生产计划" style="width: 100%" @change="handlePlanChange">
                <el-option v-for="plan in planList" :key="plan.id" :label="plan.code" :value="plan.id">
                  <div style="display: flex; justify-content: space-between; align-items: center">
                    <span>{{ plan.code }}</span>
                    <span style="color: #999; font-size: 13px">{{ plan.productName }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="产品名称">
              <el-input v-model="formData.productName" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产数量">
              <el-input v-model="formData.quantity" disabled>
                <template #append v-if="formData.quantity !== null && formData.quantity !== undefined && formData.quantity !== '' || formData.quantity === 0">件</template>
                <template #append v-else>-</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20" v-if="formData.productId">
          <el-col :span="24">
            <el-form-item label="工序模板" prop="processTemplateId">
              <el-select 
                v-model="formData.processTemplateId" 
                placeholder="选择工序模板" 
                style="width: 100%"
                @change="handleProcessTemplateChange"
                :loading="processTemplateLoading"
              >
                <el-option
                  v-for="template in processTemplateList"
                  :key="template.id"
                  :label="template.name"
                  :value="template.id"
                >
                  <div style="display: flex; justify-content: space-between; align-items: center">
                    <span>{{ template.name }}</span>
                    <span style="color: #999; font-size: 13px">{{ template.processes.length }}个工序</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-divider content-position="center">时间安排</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始日期" prop="startDate">
              <el-date-picker v-model="formData.startDate" type="date" placeholder="选择开始日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期" prop="expectedEndDate">
              <el-date-picker v-model="formData.expectedEndDate" type="date" placeholder="选择预计结束日期" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="备注" prop="remarks">
              <el-input
                v-model="formData.remarks"
                type="textarea"
                :rows="3"
                placeholder="请输入备注信息"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleModalCancel">取消</el-button>
          <el-button type="primary" @click="handleModalOk">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 任务详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="任务详情"
      width="800px"
    >
      <el-descriptions :column="3" border>
        <el-descriptions-item label="任务编号">{{ taskDetail.code }}</el-descriptions-item>
        <el-descriptions-item label="产品名称">{{ taskDetail.productName }}</el-descriptions-item>
        <el-descriptions-item label="关联单据">
          <template v-if="taskDetail.plan_id">
            {{ planList.find(plan => plan.id === taskDetail.plan_id)?.code || '计划' + taskDetail.plan_id }}
          </template>
          <template v-else>无关联计划</template>
        </el-descriptions-item>
        <el-descriptions-item label="生产数量">
          <template v-if="taskDetail.quantity !== null && taskDetail.quantity !== undefined && taskDetail.quantity !== '' || taskDetail.quantity === 0">{{ formatQuantity(taskDetail.quantity) }}</template>
          <template v-else>-</template>
        </el-descriptions-item>
        <el-descriptions-item label="负责人">{{ taskDetail.manager || '-' }}</el-descriptions-item>
        <el-descriptions-item label="开始日期">{{ taskDetail.startDate }}</el-descriptions-item>
        <el-descriptions-item label="预计结束日期">{{ taskDetail.expectedEndDate }}</el-descriptions-item>
        <el-descriptions-item label="实际结束日期">{{ taskDetail.actualEndDate }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(taskDetail.status)">{{ getStatusText(taskDetail.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="3">{{ taskDetail.remarks || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ taskDetail.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ taskDetail.updatedAt }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailVisible = false">关闭</el-button>
          <el-button type="primary" @click="printTaskDetail" v-if="taskDetail.id">打印任务单</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '@/services/api'
import { productionApi } from '@/services/api'
import dayjs from 'dayjs'
import { Plus, Refresh, Search, Delete, Edit, View, More, CaretRight, Check, Close, ArrowDown } from '@element-plus/icons-vue'
import { parseQuantity, formatQuantity, getQuantityFromRelatedItem } from '@/utils/quantity'

// 状态和数据
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const taskList = ref([])
const planList = ref([])
const modalVisible = ref(false)
const modalTitle = ref('新建生产任务')
const formRef = ref(null)

// 工序模板相关
const processTemplateList = ref([])
const processTemplateLoading = ref(false)
const selectedTemplate = ref(null)

// 表单数据和规则
const formData = ref({
  code: '',
  planId: undefined,
  productId: '',
  productName: '',
  quantity: '',
  processTemplateId: undefined,  // 工序模板ID
  startDate: null,
  expectedEndDate: null,
  manager: '',
  remarks: ''
})

const rules = {
  planId: [{ required: false, message: '请选择生产计划', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  expectedEndDate: [{ required: true, message: '请选择预计结束日期', trigger: 'change' }],
  manager: [{ required: true, message: '请输入负责人', trigger: 'blur' }]
}

// 搜索表单
const searchForm = ref({
  code: '',
  productName: '',
  status: ''
})

// 统计数据
const taskStats = ref({
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  cancelled: 0
})

// API函数
// 获取任务列表
const fetchTaskList = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      ...searchForm.value
    }
    
    console.log('请求参数:', params)
    
    const response = await productionApi.getProductionTasks(params)
    console.log('获取到的任务数据:', response.data)
    
    // 确保日期字段和产品名称正确映射
    taskList.value = (response.data.items || []).map(item => {
      console.log('原始任务数据项:', item, '数量类型:', typeof item.quantity, '数量值:', item.quantity)
      
      // 特殊处理数量字段
      let quantity = parseQuantity(item.quantity);
      console.log(`处理前的原始数量: ${item.quantity}, 类型: ${typeof item.quantity}, 是否为空: ${item.quantity === '' || item.quantity === null || item.quantity === undefined}`);

      if (quantity === null) {
        console.log(`原始数量为空，尝试从关联的计划中获取数量`);
        
        // 如果任务数量为空，尝试从关联的生产计划中获取数量
        if (item.plan_id) {
          quantity = getQuantityFromRelatedItem(planList.value, item.plan_id);
          if (quantity !== null) {
            console.log(`从关联计划(ID: ${item.plan_id})获取数量: ${quantity}`);
          } else {
            console.log(`未找到关联计划或计划无数量数据`);
          }
        } else {
          console.log(`任务无关联计划ID，无法获取数量`);
        }
      }
      
      // 确保0值不会丢失
      if (quantity === 0) {
        console.log('最终确认：数量为0，显式转换为数值0');
        quantity = 0; // 确保是数值0而不是其他假值
      }
      
      console.log('最终处理后的数量:', quantity, '类型:', typeof quantity);
      
      const mappedItem = {
        ...item,
        startDate: item.start_date || item.startDate,
        expectedEndDate: item.expected_end_date || item.expectedEndDate,
        actualEndDate: item.actual_end_date || item.actualEndDate,
        productName: item.product_name || item.productName || '无关联产品',
        quantity: quantity  // 使用处理后的数量
      }
      
      return mappedItem
    })
    
    total.value = response.data.total || 0
    
    // 实时计算统计信息
    calculateTaskStats()
  } catch (error) {
    console.error('获取生产任务列表失败:', error)
    ElMessage.error(`获取生产任务列表失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 获取自动生成的任务编号
const getTaskCode = async () => {
  try {
    const response = await productionApi.generateTaskCode()
    return response.data.code
  } catch (error) {
    console.error('获取任务编号失败:', error)
    ElMessage.error(`获取任务编号失败: ${error.message}`)
    return null
  }
}

// 获取计划列表
const fetchPlanList = async () => {
  try {
    const response = await productionApi.getProductionPlans({
      page: 1,
      pageSize: 100,
      status: 'material_issued' // 只获取已发料的计划
    })
    
    console.log('原始计划数据:', response.data.items)
    
    planList.value = (response.data.items || []).map(plan => {
      // 确保quantity字段是数字类型
      const quantity = parseQuantity(plan.quantity);
      
      console.log('计划ID:', plan.id, '原始数量:', plan.quantity, '处理后数量:', quantity);
      
      return {
        id: plan.id,
        code: plan.code,
        productId: plan.product_id,
        productName: plan.product_name || plan.productName || '未知产品',
        quantity: quantity,
        start_date: plan.startDate || plan.start_date,
        end_date: plan.endDate || plan.end_date,
        status: plan.status
      }
    })
    
    console.log('处理后的计划列表:', planList.value)
  } catch (error) {
    console.error('获取生产计划列表失败:', error)
    ElMessage.error(`获取生产计划列表失败: ${error.message}`)
  }
}

// 状态相关
const getStatusType = (status) => {
  const statusMap = {
    pending: 'warning',
    inProgress: 'primary',
    in_progress: 'primary', // 保留兼容性
    processing: 'primary',  // 添加数据库使用的状态值
    doing: 'primary',      // 添加新的数据库使用的状态值
    completed: 'success',
    done: 'success',       // 添加新的数据库使用的状态值
    cancelled: 'info',
    cancel: 'info'         // 添加新的数据库使用的状态值
  }
  return statusMap[status] || 'default'
}

const getStatusText = (status) => {
  const statusTextMap = {
    pending: '未开始',
    inProgress: '进行中',
    in_progress: '进行中', // 保留兼容性
    processing: '进行中',  // 添加数据库使用的状态值
    doing: '进行中',      // 添加新的数据库使用的状态值
    completed: '已完成',
    done: '已完成',       // 添加新的数据库使用的状态值
    cancelled: '已取消',
    cancel: '已取消'      // 添加新的数据库使用的状态值
  }
  return statusTextMap[status] || '未知状态'
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchTaskList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchTaskList()
}

// 表单处理
const showCreateModal = async () => {
  modalTitle.value = '新建生产任务'
  const taskCode = await getTaskCode()
  if (!taskCode) {
    return
  }
  formData.value = {
    code: taskCode,
    planId: undefined,
    productId: '',
    productName: '',
    quantity: '',
    startDate: null,
    expectedEndDate: null,
    manager: '',
    remarks: ''
  }
  modalVisible.value = true
}

const handleEdit = async (record) => {
  modalTitle.value = '编辑生产任务'
  
  console.log('编辑任务，原始数据:', record)
  
  // 处理数量字段
  const quantity = parseQuantity(record.quantity);
  console.log('处理后的数量:', quantity);
  
  // 先设置基本表单数据
  formData.value = {
    ...record,
    planId: record.plan_id,
    quantity: quantity,
    startDate: record.startDate ? new Date(record.startDate) : null,
    expectedEndDate: record.expectedEndDate ? new Date(record.expectedEndDate) : null
  }
  
  // 如果任务有关联的计划ID，但计划相关信息不完整，尝试从计划列表中获取更多信息
  if (record.plan_id) {
    const relatedPlan = planList.value.find(plan => plan.id === record.plan_id);
    if (relatedPlan) {
      console.log('找到关联的计划:', relatedPlan);
      // 如果产品名称为空，从计划中获取
      if (!formData.value.productName && relatedPlan.productName) {
        formData.value.productName = relatedPlan.productName;
      }
      // 如果产品ID为空，从计划中获取
      if (!formData.value.productId && relatedPlan.productId) {
        formData.value.productId = relatedPlan.productId;
      }
    } else {
      console.log('未找到ID为', record.plan_id, '的计划，可能需要刷新计划列表');
      // 如果没有找到关联计划，尝试重新获取计划列表
      await fetchPlanList();
      // 再次尝试找到关联计划
      const refreshedPlan = planList.value.find(plan => plan.id === record.plan_id);
      if (refreshedPlan) {
        console.log('刷新后找到关联的计划:', refreshedPlan);
        if (!formData.value.productName && refreshedPlan.productName) {
          formData.value.productName = refreshedPlan.productName;
        }
        if (!formData.value.productId && refreshedPlan.productId) {
          formData.value.productId = refreshedPlan.productId;
        }
      }
    }
  }
  
  console.log('编辑表单数据:', formData.value)
  modalVisible.value = true
}

const handleModalOk = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    const payload = {
      plan_id: formData.value.planId,
      product_id: formData.value.productId,
      quantity: formData.value.quantity,
      start_date: formData.value.startDate ? dayjs(formData.value.startDate).format('YYYY-MM-DD') : null,
      expected_end_date: formData.value.expectedEndDate ? dayjs(formData.value.expectedEndDate).format('YYYY-MM-DD') : null,
      manager: formData.value.manager,
      remarks: formData.value.remarks,
      process_template_id: formData.value.processTemplateId  // 添加工序模板ID
    }
    
    if (formData.value.id) {
      // 编辑模式
      await axios.put(`/production/tasks/${formData.value.id}`, payload)
      ElMessage.success('生产任务更新成功')
    } else {
      // 创建模式
      await axios.post('/production/tasks', payload)
      ElMessage.success('生产任务创建成功')
    }
    
    modalVisible.value = false
    await fetchTaskList()
    calculateTaskStats()
  } catch (error) {
    console.error('提交表单失败:', error)
    ElMessage.error('提交表单失败')
  }
}

const handleModalCancel = () => {
  modalVisible.value = false
  formRef.value.resetFields()
}

const handleDelete = async (row) => {
  try {
    loading.value = true
    await productionApi.deleteProductionTask(row.id)
    ElMessage.success('删除成功')
    fetchTaskList()
  } catch (error) {
    console.error('删除生产任务失败:', error)
    ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

const handleRefresh = () => {
  fetchTaskList()
}

const detailVisible = ref(false)
const taskDetail = ref({})

const showTaskDetail = (record) => {
  console.log('展示任务详情，原始数据:', record)
  
  // 处理数量字段
  const quantity = parseQuantity(record.quantity);
  console.log('处理后的数量:', quantity)
  
  taskDetail.value = {
    ...record,
    quantity: quantity,
    startDate: record.startDate ? dayjs(record.startDate).format('YYYY-MM-DD') : '-',
    expectedEndDate: record.expectedEndDate ? dayjs(record.expectedEndDate).format('YYYY-MM-DD') : '-',
    actualEndDate: record.actualEndDate ? dayjs(record.actualEndDate).format('YYYY-MM-DD') : '-',
    createdAt: record.createdAt ? dayjs(record.createdAt).format('YYYY-MM-DD HH:mm') : '-',
    updatedAt: record.updatedAt ? dayjs(record.updatedAt).format('YYYY-MM-DD HH:mm') : '-'
  }
  
  console.log('任务详情数据:', taskDetail.value)
  detailVisible.value = true
}

// 生产计划选择处理
const handlePlanChange = async (planId) => {
  if (!planId) {
    formData.value.productId = ''
    formData.value.productName = ''
    formData.value.quantity = ''
    processTemplateList.value = []
    formData.value.processTemplateId = undefined
    return
  }
  
  const selectedPlan = planList.value.find(plan => plan.id === planId)
  if (selectedPlan) {
    formData.value.productId = selectedPlan.productId
    formData.value.productName = selectedPlan.productName
    formData.value.quantity = selectedPlan.quantity
    
    // 获取该产品的工序模板
    await fetchProductProcessTemplates(selectedPlan.productId)
  }
}

// 获取产品关联的工序模板
const fetchProductProcessTemplates = async (productId) => {
  if (!productId) return
  
  try {
    processTemplateLoading.value = true
    formData.value.processTemplateId = undefined
    
    const response = await axios.get(`/baseData/products/${productId}/process-template`)
    
    if (response.data && response.data.data) {
      // 如果有默认工序模板，直接使用
      selectedTemplate.value = response.data.data
      formData.value.processTemplateId = response.data.data.id
    }
    
    // 获取所有可用的工序模板
    const allTemplatesResponse = await axios.get('/baseData/process-templates', {
      params: { 
        productId: productId,
        pageSize: 100
      }
    })
    
    if (allTemplatesResponse.data && allTemplatesResponse.data.data) {
      processTemplateList.value = allTemplatesResponse.data.data
    } else {
      processTemplateList.value = []
    }
  } catch (error) {
    console.error('获取产品工序模板失败:', error)
    ElMessage.warning('获取产品工序模板失败')
    processTemplateList.value = []
  } finally {
    processTemplateLoading.value = false
  }
}

// 处理工序模板选择变化
const handleProcessTemplateChange = (templateId) => {
  if (!templateId) {
    selectedTemplate.value = null
    return
  }
  
  selectedTemplate.value = processTemplateList.value.find(template => template.id === templateId)
}

// 重置搜索方法
const handleReset = () => {
  searchForm.value.code = '';
  searchForm.value.productName = '';
  searchForm.value.status = '';
  handleSearch();
};

// 搜索方法
const handleSearch = () => {
  currentPage.value = 1;
  // 确保总是先获取最新的计划列表，然后再获取任务列表
  fetchPlanList().then(() => {
    fetchTaskList();
  });
};

// 计算统计数据
const calculateTaskStats = () => {
  const stats = {
    total: taskList.value.length,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0
  };
  
  taskList.value.forEach(task => {
    if (task.status === 'pending') stats.pending++;
    else if (task.status === 'inProgress' || task.status === 'in_progress' || task.status === 'processing' || task.status === 'doing') stats.inProgress++;
    else if (task.status === 'completed' || task.status === 'done') stats.completed++;
    else if (task.status === 'cancelled' || task.status === 'cancel') stats.cancelled++;
  });
  
  taskStats.value = stats;
};

// 开始任务
const startTask = async (row) => {
  try {
    loading.value = true
    // 尝试使用不同的状态值
    const statusValue = 'wip'; // 尝试work in progress的缩写
    console.log(`尝试更新任务ID ${row.id} 的状态为: ${statusValue}`);
    await productionApi.updateProductionTaskStatus(row.id, { status: statusValue })
    ElMessage.success('生产任务已开始')
    fetchTaskList()
  } catch (error) {
    console.error('开始任务失败:', error)
    ElMessage.error('操作失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

// 完成任务
const completeTask = async (row) => {
  try {
    loading.value = true
    // 保持使用原始的completed状态
    console.log(`尝试更新任务ID ${row.id} 的状态为: completed`);
    await productionApi.updateProductionTaskStatus(row.id, { status: 'completed' })
    ElMessage.success('生产任务已完成')
    fetchTaskList()
  } catch (error) {
    console.error('完成任务失败:', error)
    ElMessage.error('操作失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

// 取消任务
const cancelTask = async (row) => {
  try {
    loading.value = true
    // 保持使用原始的cancelled状态
    console.log(`尝试更新任务ID ${row.id} 的状态为: cancelled`);
    await productionApi.updateProductionTaskStatus(row.id, { status: 'cancelled' })
    ElMessage.success('生产任务已取消')
    fetchTaskList()
  } catch (error) {
    console.error('取消任务失败:', error)
    ElMessage.error('操作失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

// 添加打印任务单方法
const printTaskDetail = () => {
  const printWindow = window.open('', '_blank');
  const task = taskDetail.value;
  
  // 获取关联计划编号
  const relatedPlanCode = task.plan_id 
    ? (planList.value.find(plan => plan.id === task.plan_id)?.code || `计划${task.plan_id}`) 
    : '-';
  
  console.log('打印任务单数据:', task)
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>生产任务单</title>
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
        <div class="title">生产任务单</div>
        <div>任务编号：${task.code}</div>
      </div>
      
      <table>
        <tr>
          <td class="label">任务编号</td>
          <td>${task.code}</td>
          <td class="label">产品名称</td>
          <td>${task.productName}</td>
        </tr>
        <tr>
          <td class="label">关联单据</td>
          <td>${relatedPlanCode}</td>
          <td class="label">生产数量</td>
          <td>${task.quantity !== null && task.quantity !== undefined && task.quantity !== '' || task.quantity === 0 ? formatQuantity(task.quantity) : '-'}</td>
        </tr>
        <tr>
          <td class="label">负责人</td>
          <td>${task.manager || '-'}</td>
          <td class="label">开始日期</td>
          <td>${task.startDate}</td>
          <td class="label">预计结束日期</td>
          <td>${task.expectedEndDate}</td>
        </tr>
        <tr>
          <td class="label">状态</td>
          <td colspan="3">${getStatusText(task.status)}</td>
        </tr>
        <tr>
          <td class="label">备注</td>
          <td colspan="3">${task.remarks || '-'}</td>
        </tr>
      </table>
      
      <div class="footer">
        <div>负责人签名：__________________</div>
        <div>主管签名：__________________</div>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()">打印任务单</button>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

onMounted(async () => {
  try {
    loading.value = true;
    // 先获取计划列表，再获取任务列表
    await fetchPlanList();
    await fetchTaskList();
  } catch (error) {
    console.error('初始化数据失败:', error);
    ElMessage.error('加载数据失败，请刷新页面重试');
  } finally {
    loading.value = false;
  }
})
</script>

<style scoped>
.production-task-container {
  padding: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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

.task-detail {
  padding: 20px;
}

.danger {
  color: #F56C6C;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>