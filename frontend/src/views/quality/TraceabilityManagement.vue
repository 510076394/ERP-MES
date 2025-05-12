<template>
  <div class="traceability-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>产品追溯管理</span>
          <div>
            <el-button type="primary" @click="handleFullTraceability">
              <el-icon><Connection /></el-icon> 全链路追溯
            </el-button>
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon> 新增追溯记录
            </el-button>
          </div>
        </div>
      </template>
      
      <!-- 搜索表单 -->
      <el-form :model="searchForm" :inline="true" class="demo-form-inline">
        <el-form-item label="产品编码">
          <el-input v-model="searchForm.productCode" placeholder="请输入产品编码" clearable />
        </el-form-item>
        <el-form-item label="批次号">
          <el-input v-model="searchForm.batchNumber" placeholder="请输入批次号" clearable />
        </el-form-item>
        <el-form-item label="生产日期">
          <el-date-picker
            v-model="searchForm.productionDate"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
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
      
      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="productCode" label="产品编码" width="120" />
        <el-table-column prop="productName" label="产品名称" width="150" />
        <el-table-column prop="batchNumber" label="批次号" width="120" />
        <el-table-column prop="productionDate" label="生产日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.productionDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="supplier" label="供应商" width="150" />
        <el-table-column prop="processList" label="工序记录" width="150">
          <template #default="scope">
            <el-button type="success" size="small" @click="viewProcessDetails(scope.row)">
              查看工序 ({{ scope.row.processCount || 0 }})
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="materialList" label="物料记录" width="150">
          <template #default="scope">
            <el-button type="primary" size="small" @click="viewMaterialDetails(scope.row)">
              查看物料 ({{ scope.row.materialCount || 0 }})
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="qualityList" label="质检记录" width="150">
          <template #default="scope">
            <el-button type="warning" size="small" @click="viewQualityDetails(scope.row)">
              查看质检 ({{ scope.row.qualityCount || 0 }})
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="305">
          <template #default="scope">
            <el-button size="small" @click="handleView(scope.row)">查看</el-button>
            <el-button size="small" type="primary" @click="handleEdit(scope.row)">编辑</el-button>
            <el-dropdown @command="command => handleCommand(command, scope.row)">
              <el-button size="small" type="success">
                更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="traceChart">追溯图</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
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
    
    <!-- 追溯记录表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增追溯记录' : '编辑追溯记录'"
      width="650px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        style="max-height: 500px; overflow-y: auto;"
      >
        <el-form-item label="产品编码" prop="productCode">
          <el-input v-model="form.productCode" placeholder="请输入产品编码" />
        </el-form-item>
        <el-form-item label="产品名称" prop="productName">
          <el-input v-model="form.productName" placeholder="请输入产品名称" />
        </el-form-item>
        <el-form-item label="批次号" prop="batchNumber">
          <el-input v-model="form.batchNumber" placeholder="请输入批次号" />
        </el-form-item>
        <el-form-item label="生产日期" prop="productionDate">
          <el-date-picker
            v-model="form.productionDate"
            type="date"
            placeholder="选择生产日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="供应商" prop="supplier">
          <el-select v-model="form.supplier" placeholder="请选择供应商" style="width: 100%">
            <el-option
              v-for="item in supplierOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="在产" value="in_production" />
            <el-option label="完成" value="completed" />
            <el-option label="已出库" value="shipped" />
            <el-option label="已售出" value="sold" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remarks">
          <el-input
            v-model="form.remarks"
            type="textarea"
            placeholder="请输入备注信息"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 工序详情对话框 -->
    <el-dialog
      v-model="processDialogVisible"
      title="工序记录详情"
      width="800px"
    >
      <el-table :data="processDetails" border>
        <el-table-column prop="processName" label="工序名称" />
        <el-table-column prop="operator" label="操作员" />
        <el-table-column prop="startTime" label="开始时间">
          <template #default="scope">
            {{ formatDateTime(scope.row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="endTime" label="结束时间">
          <template #default="scope">
            {{ formatDateTime(scope.row.endTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="耗时(分钟)" />
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-tag :type="getProcessStatusType(scope.row.status)">
              {{ getProcessStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remarks" label="备注" />
      </el-table>
    </el-dialog>
    
    <!-- 物料详情对话框 -->
    <el-dialog
      v-model="materialDialogVisible"
      title="物料记录详情"
      width="800px"
    >
      <el-table :data="materialDetails" border>
        <el-table-column prop="materialCode" label="物料编码" />
        <el-table-column prop="materialName" label="物料名称" />
        <el-table-column prop="batchNumber" label="批次号" />
        <el-table-column prop="quantity" label="数量" />
        <el-table-column prop="unit" label="单位" />
        <el-table-column prop="supplierName" label="供应商" />
        <el-table-column prop="usageTime" label="使用时间">
          <template #default="scope">
            {{ formatDateTime(scope.row.usageTime) }}
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
    
    <!-- 质检详情对话框 -->
    <el-dialog
      v-model="qualityDialogVisible"
      title="质检记录详情"
      width="800px"
    >
      <el-table :data="qualityDetails" border>
        <el-table-column prop="checkPoint" label="检验点" />
        <el-table-column prop="inspector" label="检验员" />
        <el-table-column prop="checkTime" label="检验时间">
          <template #default="scope">
            {{ formatDateTime(scope.row.checkTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="result" label="检验结果">
          <template #default="scope">
            <el-tag :type="scope.row.result === 'pass' ? 'success' : 'danger'">
              {{ scope.row.result === 'pass' ? '通过' : '不通过' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remarks" label="备注" />
      </el-table>
    </el-dialog>
    
    <!-- 追溯图对话框 -->
    <el-dialog
      v-model="traceChartVisible"
      title="产品追溯图"
      width="900px"
    >
      <div class="trace-chart-container" ref="traceChartRef">
        <!-- 追溯图表将在这里渲染 -->
        <div v-if="chartLoading" class="chart-loading-tip">
          <el-icon class="is-loading"><Loading /></el-icon>
          <p>正在加载追溯图数据...</p>
        </div>
        <div v-if="!chartLoading" class="chart-tip">
          <p><i class="el-icon-mouse"></i> 提示: 鼠标滚轮可缩放, 拖拽可平移</p>
          <p>点击节点可查看详细信息</p>
        </div>
      </div>
    </el-dialog>
    
    <!-- 全链路追溯对话框 -->
    <el-dialog
      v-model="fullTraceDialogVisible"
      title="全链路追溯"
      width="1000px"
    >
      <div class="full-trace-container">
        <!-- 追溯查询表单 -->
        <el-form :model="traceForm" :inline="true" class="trace-form">
          <el-form-item label="追溯类型">
            <el-radio-group v-model="traceForm.type">
              <el-radio label="forward">正向追溯（从原料到成品）</el-radio>
              <el-radio label="backward">反向追溯（从成品到原料）</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item :label="traceForm.type === 'forward' ? '物料编码' : '产品编码'">
            <el-input v-model="traceForm.code" :placeholder="traceForm.type === 'forward' ? '请输入物料编码' : '请输入产品编码'" />
          </el-form-item>
          <el-form-item label="批次号">
            <el-input v-model="traceForm.batchNumber" placeholder="请输入批次号" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchFullTraceability" :loading="traceLoading">
              <el-icon><Search /></el-icon> 查询
            </el-button>
            <el-button @click="resetTraceForm">
              <el-icon><Refresh /></el-icon> 重置
            </el-button>
          </el-form-item>
        </el-form>
        
        <!-- 追溯结果 -->
        <div v-if="traceResult">
          <!-- 追溯图表 -->
          <div class="full-trace-chart-container" ref="fullTraceChartRef">
            <div v-if="traceLoading" class="chart-loading-tip">
              <el-icon class="is-loading"><Loading /></el-icon>
              <p>正在加载追溯图数据...</p>
            </div>
          </div>
          
          <!-- 追溯详情 -->
          <el-tabs v-model="activeTraceTab" class="trace-tabs">
            <el-tab-pane :label="traceForm.type === 'forward' ? '物料信息' : '产品信息'" name="item">
              <el-descriptions :column="2" border v-if="traceResult.success">
                <el-descriptions-item :label="traceForm.type === 'forward' ? '物料编码' : '产品编码'">
                  {{ traceForm.type === 'forward' ? traceResult.traceability.material.code : traceResult.traceability.product.code }}
                </el-descriptions-item>
                <el-descriptions-item label="批次号">
                  {{ traceForm.type === 'forward' ? traceResult.traceability.material.batch : traceResult.traceability.product.batch }}
                </el-descriptions-item>
                <el-descriptions-item label="名称" v-if="traceForm.type === 'backward'">
                  {{ traceResult.traceability.product.name }}
                </el-descriptions-item>
              </el-descriptions>
              <el-empty v-else description="未找到数据" />
            </el-tab-pane>
            
            <el-tab-pane label="采购入库" name="purchase">
              <el-table :data="traceForm.type === 'forward' ? traceResult.traceability?.purchase || [] : traceResult.traceability?.purchase || []" border>
                <el-table-column prop="receipt_no" label="入库单号" width="150" />
                <el-table-column prop="receipt_date" label="入库日期" width="120" />
                <el-table-column prop="material_code" label="物料编码" width="120" />
                <el-table-column prop="material_name" label="物料名称" width="150" />
                <el-table-column prop="batch_number" label="批次号" width="120" />
                <el-table-column prop="quantity" label="数量" width="80" />
                <el-table-column prop="supplier_name" label="供应商" width="150" />
                <el-table-column prop="created_at" label="创建时间" width="180" />
              </el-table>
            </el-tab-pane>
            
            <el-tab-pane label="生产记录" name="production">
              <el-table :data="traceResult.traceability?.production || []" border>
                <el-table-column prop="task_no" label="任务单号" width="150" />
                <el-table-column prop="plan_no" label="计划单号" width="150" />
                <el-table-column prop="product_code" label="产品编码" width="120" />
                <el-table-column prop="product_name" label="产品名称" width="150" />
                <el-table-column prop="product_batch" label="产品批次" width="120" />
                <el-table-column prop="planned_quantity" label="计划数量" width="90" />
                <el-table-column prop="completed_quantity" label="完成数量" width="90" />
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="scope">
                    <el-tag :type="getProductionStatusType(scope.row.status)">
                      {{ getProductionStatusText(scope.row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="start_time" label="开始时间" width="150" />
                <el-table-column prop="end_time" label="结束时间" width="150" />
              </el-table>
            </el-tab-pane>
            
            <el-tab-pane v-if="traceForm.type === 'backward'" label="生产物料" name="materials">
              <el-table :data="traceResult.traceability?.materials || []" border>
                <el-table-column prop="material_code" label="物料编码" width="120" />
                <el-table-column prop="material_name" label="物料名称" width="150" />
                <el-table-column prop="batch_number" label="批次号" width="120" />
                <el-table-column prop="planned_quantity" label="计划数量" width="90" />
                <el-table-column prop="actual_quantity" label="实际数量" width="90" />
                <el-table-column prop="created_at" label="创建时间" width="180" />
              </el-table>
            </el-tab-pane>
            
            <el-tab-pane label="质检记录" name="quality">
              <el-table :data="traceResult.traceability?.quality || []" border>
                <el-table-column prop="inspection_no" label="检验单号" width="150" />
                <el-table-column prop="inspection_type" label="检验类型" width="120">
                  <template #default="scope">
                    {{ getInspectionTypeText(scope.row.inspection_type) }}
                  </template>
                </el-table-column>
                <el-table-column prop="inspector" label="检验员" width="100" />
                <el-table-column prop="inspection_date" label="检验日期" width="120" />
                <el-table-column prop="result" label="检验结果" width="100">
                  <template #default="scope">
                    <el-tag :type="scope.row.result === 'pass' ? 'success' : 'danger'">
                      {{ scope.row.result === 'pass' ? '合格' : '不合格' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="scope">
                    <el-tag :type="getInspectionStatusType(scope.row.status)">
                      {{ getInspectionStatusText(scope.row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="created_at" label="创建时间" width="180" />
              </el-table>
            </el-tab-pane>
            
            <el-tab-pane label="成品出库" name="outbound">
              <el-table :data="traceResult.traceability?.outbound || []" border>
                <el-table-column prop="outbound_no" label="出库单号" width="150" />
                <el-table-column prop="outbound_date" label="出库日期" width="120" />
                <el-table-column prop="material_code" label="物料编码" width="120" />
                <el-table-column prop="material_name" label="物料名称" width="150" />
                <el-table-column prop="batch_number" label="批次号" width="120" />
                <el-table-column prop="quantity" label="数量" width="80" />
                <el-table-column prop="created_at" label="创建时间" width="180" />
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </div>
        
        <el-empty v-if="showTraceEmpty" description="请输入查询条件并点击查询按钮" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, onBeforeUnmount, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import dayjs from 'dayjs'
import { Plus, Search, Refresh, ArrowDown, Loading, Connection } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { api } from '@/services/api'

// 加载状态
const loading = ref(false)

// 表格数据
const tableData = ref([])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 搜索表单
const searchForm = reactive({
  productCode: '',
  batchNumber: '',
  productionDate: []
})

// 对话框相关
const dialogVisible = ref(false)
const dialogType = ref('add') // add或edit
const formRef = ref(null)

// 工序详情对话框
const processDialogVisible = ref(false)
const processDetails = ref([])

// 物料详情对话框
const materialDialogVisible = ref(false)
const materialDetails = ref([])

// 质检详情对话框
const qualityDialogVisible = ref(false)
const qualityDetails = ref([])

// 追溯图对话框
const traceChartVisible = ref(false)
const traceChartRef = ref(null)
let traceChart = null
const chartLoading = ref(false)

// 全链路追溯对话框
const fullTraceDialogVisible = ref(false)
const traceForm = ref({
  type: 'forward',
  code: '',
  batchNumber: ''
})
const traceResult = ref(null)
const traceLoading = ref(false)
const activeTraceTab = ref('item')
const showTraceEmpty = ref(false)

// 全链路追溯结果图表
let fullTraceChart = null;
const fullTraceChartRef = ref(null);

// 表单数据
const form = reactive({
  id: undefined,
  productCode: '',
  productName: '',
  batchNumber: '',
  productionDate: '',
  supplier: '',
  status: 'in_production',
  remarks: ''
})

// 表单验证规则
const rules = {
  productCode: [
    { required: true, message: '请输入产品编码', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  productName: [
    { required: true, message: '请输入产品名称', trigger: 'blur' }
  ],
  batchNumber: [
    { required: true, message: '请输入批次号', trigger: 'blur' }
  ],
  productionDate: [
    { required: true, message: '请选择生产日期', trigger: 'change' }
  ],
  supplier: [
    { required: true, message: '请选择供应商', trigger: 'change' }
  ]
}

// 供应商选项（实际应用中应该从API获取）
const supplierOptions = ref([
  { value: 'supplier_1', label: '供应商A' },
  { value: 'supplier_2', label: '供应商B' },
  { value: 'supplier_3', label: '供应商C' }
])

// 生命周期钩子
onMounted(() => {
  // Debug logging for API URL
  console.log('API URL:', import.meta.env.VITE_API_URL)
  console.log('Suppliers endpoint:', `${import.meta.env.VITE_API_URL}/api/baseData/suppliers`)
  console.log('Traceability endpoint:', `${import.meta.env.VITE_API_URL}/api/quality/traceability`)
  
  fetchData()
  fetchSuppliers()
})

// 获取供应商列表
const fetchSuppliers = async () => {
  try {
    // 使用api对象进行请求，确保认证令牌被添加
    const response = await api.get('/baseData/suppliers')
    
    // Handle different response formats
    if (response.data && response.data.list) {
      supplierOptions.value = response.data.list.map(item => ({
        value: item.id,
        label: item.name
      }))
    } else if (Array.isArray(response.data)) {
      supplierOptions.value = response.data.map(item => ({
        value: item.id,
        label: item.name
      }))
    } else {
      console.error('Unexpected supplier data format:', response.data)
      supplierOptions.value = []
    }
  } catch (error) {
    console.error('获取供应商列表失败:', error)
    ElMessage.error('获取供应商列表失败: ' + (error.response?.data?.message || error.message))
    supplierOptions.value = [
      { value: 'supplier_1', label: '供应商A' },
      { value: 'supplier_2', label: '供应商B' },
      { value: 'supplier_3', label: '供应商C' }
    ] // Use default suppliers as fallback
  }
}

// 获取表格数据
const fetchData = async () => {
  loading.value = true
  try {
    // 构建查询参数
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      productCode: searchForm.productCode,
      batchNumber: searchForm.batchNumber
    }
    
    if (searchForm.productionDate && searchForm.productionDate.length === 2) {
      params.startDate = formatDate(searchForm.productionDate[0])
      params.endDate = formatDate(searchForm.productionDate[1])
    }
    
    // Log request params for debugging
    console.log('Traceability request params:', params)
    
    try {
      const response = await api.get('/quality/traceability', { params })
      
      if (response.data && response.data.records) {
        tableData.value = response.data.records
        total.value = response.data.total
      } else if (response.data && Array.isArray(response.data)) {
        // Handle case where API returns array directly
        tableData.value = response.data
        total.value = response.data.length
      } else {
        console.warn('Unexpected data format:', response.data)
        useDefaultData()
      }
    } catch (error) {
      console.error('获取追溯记录API错误:', error)
      if (error.response) {
        console.error('错误状态码:', error.response.status)
        console.error('错误响应数据:', error.response.data)
      }
      ElMessage.error('获取追溯记录失败: ' + (error.response?.data?.message || error.message))
      useDefaultData()
    }
  } catch (error) {
    console.error('获取追溯记录主函数错误:', error)
    ElMessage.error('获取追溯记录失败: ' + error.message)
    useDefaultData()
  } finally {
    loading.value = false
  }
}

// 使用默认数据（临时方案，直到API正常工作）
const useDefaultData = () => {
  tableData.value = [
    {
      id: 1,
      productCode: 'P001',
      productName: '测试产品1',
      batchNumber: 'B20230601',
      productionDate: '2023-06-01',
      supplier: '供应商A',
      status: 'completed',
      processCount: 3,
      materialCount: 5,
      qualityCount: 2
    },
    {
      id: 2,
      productCode: 'P002',
      productName: '测试产品2',
      batchNumber: 'B20230615',
      productionDate: '2023-06-15',
      supplier: '供应商B',
      status: 'in_production',
      processCount: 2,
      materialCount: 4,
      qualityCount: 1
    }
  ]
  total.value = tableData.value.length
}

// 分页处理函数
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchData()
}

// 搜索和重置
const handleSearch = () => {
  currentPage.value = 1
  fetchData()
}

const resetSearch = () => {
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = ''
  })
  searchForm.productionDate = []
  handleSearch()
}

// 新增记录
const handleAdd = () => {
  dialogType.value = 'add'
  Object.keys(form).forEach(key => {
    form[key] = key === 'status' ? 'in_production' : ''
  })
  form.id = undefined
  dialogVisible.value = true
  
  nextTick(() => {
    formRef.value?.resetFields()
  })
}

// 编辑记录
const handleEdit = (row) => {
  dialogType.value = 'edit'
  Object.keys(form).forEach(key => {
    form[key] = row[key]
  })
  dialogVisible.value = true
}

// 查看详情
const handleView = (row) => {
  ElMessage.info(`查看产品 ${row.productName} (${row.productCode}) 的详情`)
  // 这里可以实现查看详情的逻辑，例如跳转到详情页面
}

// 删除记录
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除产品 ${row.productName} (${row.productCode}) 的追溯记录吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await api.delete(`/quality/traceability/${row.id}`)
      ElMessage.success('删除成功')
      fetchData()
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const isEdit = dialogType.value === 'edit'
        const url = isEdit 
          ? `/quality/traceability/${form.id}` 
          : `/quality/traceability`
        const method = isEdit ? 'put' : 'post'
        
        const response = await api[method](url, form)
        
        ElMessage.success(isEdit ? '更新成功' : '添加成功')
        dialogVisible.value = false
        fetchData()
      } catch (error) {
        console.error(isEdit ? '更新失败:' : '添加失败:', error)
        ElMessage.error(isEdit ? '更新失败' : '添加失败')
      }
    } else {
      ElMessage.warning('请填写完整表单')
      return false
    }
  })
}

// 查看工序详情
const viewProcessDetails = async (row) => {
  try {
    const response = await api.get(`/quality/traceability/${row.id}/process`)
    processDetails.value = response.data
    processDialogVisible.value = true
  } catch (error) {
    console.error('获取工序详情失败:', error)
    ElMessage.error('获取工序详情失败: ' + (error.response?.data?.message || error.message))
  }
}

// 查看物料详情
const viewMaterialDetails = async (row) => {
  try {
    const response = await api.get(`/quality/traceability/${row.id}/materials`)
    materialDetails.value = response.data
    materialDialogVisible.value = true
  } catch (error) {
    console.error('获取物料详情失败:', error)
    ElMessage.error('获取物料详情失败: ' + (error.response?.data?.message || error.message))
  }
}

// 查看质检详情
const viewQualityDetails = async (row) => {
  try {
    const response = await api.get(`/quality/traceability/${row.id}/quality`)
    qualityDetails.value = response.data
    qualityDialogVisible.value = true
  } catch (error) {
    console.error('获取质检详情失败:', error)
    ElMessage.error('获取质检详情失败: ' + (error.response?.data?.message || error.message))
  }
}

// 查看追溯图
const handleTraceChart = async (row) => {
  try {
    traceChartVisible.value = true
    chartLoading.value = true
    
    // 等待对话框DOM渲染完成
    await nextTick()
    
    try {
      // 获取追溯图数据
      const response = await api.get(`/quality/traceability/${row.id}/chart`)
      
      // 初始化图表
      if (!traceChart && traceChartRef.value) {
        traceChart = echarts.init(traceChartRef.value)
      } else if (traceChart) {
        traceChart.dispose()
        traceChart = echarts.init(traceChartRef.value)
      }
      
      // 处理数据
      const chartData = response.data
      
      // 图表配置
      const option = {
        title: {
          text: `${row.productName} (${row.batchNumber})追溯图`,
          subtext: '生产与质量追溯',
          top: 'top',
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            const { data } = params
            if (data.category === 'product') {
              return `<div style="font-weight:bold">产品信息</div>
                      <div>产品名称: ${data.name}</div>
                      <div>批次: ${row.batchNumber}</div>
                      <div>生产日期: ${formatDate(row.productionDate)}</div>`
            } else if (data.category === 'process') {
              const process = chartData.processes.find(p => `process_${p.id}` === data.id)
              return `<div style="font-weight:bold">工序: ${data.name}</div>
                      ${process?.operator ? `<div>操作员: ${process.operator}</div>` : ''}
                      ${process?.startTime ? `<div>开始时间: ${formatDateTime(process.startTime)}</div>` : ''}
                      ${process?.endTime ? `<div>结束时间: ${formatDateTime(process.endTime)}</div>` : ''}
                      ${process?.duration ? `<div>耗时: ${process.duration}分钟</div>` : ''}`
            } else if (data.category === 'material') {
              const material = chartData.materials.find(m => `material_${m.id}` === data.id)
              return `<div style="font-weight:bold">物料: ${data.name}</div>
                      ${material?.quantity ? `<div>使用数量: ${material.quantity}${material.unit || ''}</div>` : ''}
                      ${material?.batchNumber ? `<div>批次号: ${material.batchNumber}</div>` : ''}
                      ${material?.supplierName ? `<div>供应商: ${material.supplierName}</div>` : ''}
                      ${material?.usageTime ? `<div>使用时间: ${formatDateTime(material.usageTime)}</div>` : ''}`
            } else if (data.category === 'quality') {
              const quality = chartData.quality.find(q => `quality_${q.id}` === data.id)
              return `<div style="font-weight:bold">质检: ${data.name}</div>
                      ${quality?.inspector ? `<div>检验员: ${quality.inspector}</div>` : ''}
                      ${quality?.checkTime ? `<div>检验时间: ${formatDateTime(quality.checkTime)}</div>` : ''}
                      ${quality?.result ? `<div>结果: ${quality.result === 'pass' ? '通过' : '不通过'}</div>` : ''}`
            }
            return params.name
          }
        },
        legend: {
          data: ['产品', '工序', '物料', '质检'],
          bottom: 0
        },
        toolbox: {
          feature: {
            saveAsImage: { title: '保存图片' },
            restore: { title: '重置' },
            dataZoom: { title: '缩放' },
          },
          right: 20,
          top: 20
        },
        animation: true,
        animationDuration: 1500,
        animationEasingUpdate: 'quinticInOut',
        series: [
          {
            name: '追溯关系',
            type: 'graph',
            layout: 'force',
            force: {
              repulsion: 300,
              edgeLength: 150,
              gravity: 0.1
            },
            roam: true,
            lineStyle: {
              color: 'source',
              curveness: 0.3
            },
            label: {
              show: true,
              position: 'right',
              formatter: '{b}',
              fontSize: 12,
              fontWeight: 'normal'
            },
            // 节点分类
            categories: [
              { name: '产品' },
              { name: '工序' },
              { name: '物料' },
              { name: '质检' }
            ],
            // 节点数据
            data: chartData.nodes.map(node => ({
              id: node.id,
              name: node.name,
              symbolSize: node.category === 'product' ? 60 : 40,
              category: node.category === 'product' ? 0 : 
                       node.category === 'process' ? 1 : 
                       node.category === 'material' ? 2 : 3,
              itemStyle: {
                color: node.category === 'product' ? '#5470c6' : 
                       node.category === 'process' ? '#91cc75' : 
                       node.category === 'material' ? '#fac858' : '#ee6666'
              },
              category: node.category // 保存原始类别用于tooltip
            })),
            // 连接关系
            links: chartData.links.map(link => ({
              source: link.source,
              target: link.target
            })),
            // 高亮效果
            emphasis: {
              focus: 'adjacency',
              lineStyle: {
                width: 3
              },
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.3)'
              }
            }
          }
        ]
      }
      
      // 设置并渲染图表
      traceChart.setOption(option)
      chartLoading.value = false
      
      // 处理窗口大小变化
      const handleResize = () => {
        traceChart && traceChart.resize()
      }
      
      window.addEventListener('resize', handleResize)
      
      // 对话框关闭时移除事件监听
      const removeResizeListener = () => {
        window.removeEventListener('resize', handleResize)
      }
      
      // 对话框关闭时的清理
      const clearChart = () => {
        removeResizeListener()
        if (traceChart) {
          traceChart.dispose()
          traceChart = null
        }
      }
      
      // 监听对话框关闭
      const unwatch = traceChartVisible.watch((newValue) => {
        if (!newValue) {
          clearChart()
          unwatch() // 取消监听
        }
      })
      
    } catch (error) {
      console.error('获取或渲染追溯图数据失败:', error)
      if (error.response) {
        console.error('错误详情:', error.response.data)
      }
      ElMessage.error('无法加载追溯图: ' + (error.response?.data?.message || error.message))
      
      // 如果API失败，使用模拟数据渲染示例图
      renderDemoChart(row)
    } finally {
      chartLoading.value = false
    }
  } catch (error) {
    console.error('追溯图绘制过程中出错:', error)
    ElMessage.error('追溯图显示失败')
    chartLoading.value = false
  }
}

// 模拟数据渲染示例图
const renderDemoChart = (row) => {
  if (!traceChartRef.value) return
  
  if (!traceChart) {
    traceChart = echarts.init(traceChartRef.value)
  } else {
    traceChart.dispose()
    traceChart = echarts.init(traceChartRef.value)
  }
  
  // 示例数据
  const demoData = {
    nodes: [
      { id: 'product', name: row.productName, category: 'product' },
      { id: 'process_1', name: '材料准备', category: 'process' },
      { id: 'process_2', name: '零件加工', category: 'process' },
      { id: 'process_3', name: '组装', category: 'process' },
      { id: 'process_4', name: '测试', category: 'process' },
      { id: 'material_1', name: '钢材', category: 'material' },
      { id: 'material_2', name: '铜材', category: 'material' },
      { id: 'material_3', name: '电子元件', category: 'material' },
      { id: 'quality_1', name: '原材料检验', category: 'quality' },
      { id: 'quality_2', name: '半成品检验', category: 'quality' },
      { id: 'quality_3', name: '成品检验', category: 'quality' }
    ],
    links: [
      { source: 'process_1', target: 'process_2' },
      { source: 'process_2', target: 'process_3' },
      { source: 'process_3', target: 'process_4' },
      { source: 'process_4', target: 'product' },
      { source: 'material_1', target: 'process_1' },
      { source: 'material_2', target: 'process_2' },
      { source: 'material_3', target: 'process_3' },
      { source: 'quality_1', target: 'process_1' },
      { source: 'quality_2', target: 'process_3' },
      { source: 'quality_3', target: 'product' }
    ]
  }
  
  // 与真实API相同的渲染逻辑
  const option = {
    title: {
      text: `${row.productName} (${row.batchNumber})追溯图 - 演示数据`,
      subtext: '生产与质量追溯',
      top: 'top',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const { data } = params
        if (data.category === 'product') {
          return `<div style="font-weight:bold">产品信息</div>
                  <div>产品名称: ${data.name}</div>
                  <div>批次: ${row.batchNumber}</div>
                  <div>生产日期: ${formatDate(row.productionDate || new Date())}</div>`
        } else if (data.category === 'process') {
          return `<div style="font-weight:bold">工序: ${data.name}</div>
                  <div>示例工序信息</div>`
        } else if (data.category === 'material') {
          return `<div style="font-weight:bold">物料: ${data.name}</div>
                  <div>示例物料信息</div>`
        } else if (data.category === 'quality') {
          return `<div style="font-weight:bold">质检: ${data.name}</div>
                  <div>示例质检信息</div>`
        }
        return params.name
      }
    },
    legend: {
      data: ['产品', '工序', '物料', '质检'],
      bottom: 0
    },
    toolbox: {
      feature: {
        saveAsImage: { title: '保存图片' },
        restore: { title: '重置' },
        dataZoom: { title: '缩放' },
      },
      right: 20,
      top: 20
    },
    animation: true,
    animationDuration: 1500,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        name: '追溯关系',
        type: 'graph',
        layout: 'force',
        force: {
          repulsion: 300,
          edgeLength: 150,
          gravity: 0.1
        },
        roam: true,
        lineStyle: {
          color: 'source',
          curveness: 0.3
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{b}',
          fontSize: 12,
          fontWeight: 'normal'
        },
        // 节点分类
        categories: [
          { name: '产品' },
          { name: '工序' },
          { name: '物料' },
          { name: '质检' }
        ],
        // 节点数据
        data: demoData.nodes.map(node => ({
          id: node.id,
          name: node.name,
          symbolSize: node.category === 'product' ? 60 : 40,
          category: node.category === 'product' ? 0 : 
                   node.category === 'process' ? 1 : 
                   node.category === 'material' ? 2 : 3,
          itemStyle: {
            color: node.category === 'product' ? '#5470c6' : 
                   node.category === 'process' ? '#91cc75' : 
                   node.category === 'material' ? '#fac858' : '#ee6666'
          },
          category: node.category // 保存原始类别用于tooltip
        })),
        // 连接关系
        links: demoData.links.map(link => ({
          source: link.source,
          target: link.target
        })),
        // 高亮效果
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 3
          },
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }
    ]
  }
  
  // 设置并渲染图表
  traceChart.setOption(option)
  
  // 处理窗口大小变化
  const handleResize = () => {
    traceChart && traceChart.resize()
  }
  
  window.addEventListener('resize', handleResize)
  
  // 监听对话框关闭
  const unwatch = traceChartVisible.watch((newValue) => {
    if (!newValue) {
      window.removeEventListener('resize', handleResize)
      if (traceChart) {
        traceChart.dispose()
        traceChart = null
      }
      unwatch() // 取消监听
    }
  })
}

// 清理资源
onBeforeUnmount(() => {
  if (traceChart) {
    traceChart.dispose()
    traceChart = null
  }
})

// 工具函数
const formatDate = (date) => {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD')
}

const formatDateTime = (datetime) => {
  if (!datetime) return ''
  return dayjs(datetime).format('YYYY-MM-DD HH:mm:ss')
}

// 状态相关函数
const getStatusType = (status) => {
  const map = {
    'in_production': 'primary',
    'completed': 'success',
    'shipped': 'warning',
    'sold': 'info'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    'in_production': '在产',
    'completed': '完成',
    'shipped': '已出库',
    'sold': '已售出'
  }
  return map[status] || '未知'
}

const getProcessStatusType = (status) => {
  const map = {
    'pending': 'info',
    'in_progress': 'primary',
    'completed': 'success',
    'failed': 'danger'
  }
  return map[status] || 'info'
}

const getProcessStatusText = (status) => {
  const map = {
    'pending': '待处理',
    'in_progress': '进行中',
    'completed': '已完成',
    'failed': '失败'
  }
  return map[status] || '未知'
}

// 处理下拉菜单命令
const handleCommand = (command, row) => {
  if (command === 'traceChart') {
    handleTraceChart(row)
  } else if (command === 'delete') {
    handleDelete(row)
  }
}

// 全链路追溯功能
const searchFullTraceability = async () => {
  traceLoading.value = true
  try {
    const response = await api.post('/quality/traceability/full', traceForm.value)
    traceResult.value = response.data
    showTraceEmpty.value = false
  } catch (error) {
    console.error('获取全链路追溯失败:', error)
    ElMessage.error('获取全链路追溯失败: ' + (error.response?.data?.message || error.message))
    traceResult.value = null
    showTraceEmpty.value = true
  } finally {
    traceLoading.value = false
  }
}

const resetTraceForm = () => {
  traceForm.value = {
    type: 'forward',
    code: '',
    batchNumber: ''
  }
  showTraceEmpty.value = true
}

// 全链路追溯结果处理
const getInspectionTypeText = (type) => {
  const map = {
    'raw_material': '原材料检验',
    'semi_finished': '半成品检验',
    'finished': '成品检验'
  }
  return map[type] || '未知'
}

const getInspectionStatusType = (status) => {
  const map = {
    'pending': 'info',
    'in_progress': 'primary',
    'completed': 'success',
    'failed': 'danger'
  }
  return map[status] || 'info'
}

const getInspectionStatusText = (status) => {
  const map = {
    'pending': '待处理',
    'in_progress': '进行中',
    'completed': '已完成',
    'failed': '失败'
  }
  return map[status] || '未知'
}

const getProductionStatusType = (status) => {
  const map = {
    'pending': 'info',
    'in_progress': 'primary',
    'completed': 'success',
    'failed': 'danger'
  }
  return map[status] || 'info'
}

const getProductionStatusText = (status) => {
  const map = {
    'pending': '待处理',
    'in_progress': '进行中',
    'completed': '已完成',
    'failed': '失败'
  }
  return map[status] || '未知'
}

// 全链路追溯功能
const handleFullTraceability = () => {
  fullTraceDialogVisible.value = true
}

// 监听全链路追溯结果变化，渲染图表
watch(() => traceResult.value, (newVal) => {
  if (newVal && newVal.success) {
    nextTick(() => {
      renderFullTraceChart();
    });
  }
});

// 监听对话框打开状态，重置图表
watch(() => fullTraceDialogVisible.value, (newVal) => {
  if (newVal) {
    // 对话框打开，重置状态
    showTraceEmpty.value = true;
    traceResult.value = null;
    if (fullTraceChart) {
      fullTraceChart.dispose();
      fullTraceChart = null;
    }
  }
});

// 渲染全链路追溯图表
const renderFullTraceChart = () => {
  if (!fullTraceChartRef.value) return;
  
  // 销毁旧图表
  if (fullTraceChart) {
    fullTraceChart.dispose();
  }
  
  // 创建新图表
  fullTraceChart = echarts.init(fullTraceChartRef.value);
  
  // 处理节点数据
  const nodes = traceResult.value.traceability.nodes;
  const links = traceResult.value.traceability.links;
  
  // 配置图表选项
  const option = {
    title: {
      text: traceForm.value.type === 'forward' ? '正向追溯图 (从原料到成品)' : '反向追溯图 (从成品到原料)'
    },
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        if (params.dataType === 'node') {
          return `<div style="font-weight:bold;">${params.name}</div>`;
        } else {
          return `${params.data.source} -> ${params.data.target}`;
        }
      }
    },
    legend: {
      data: ['原料', '采购入库', '生产', '产品', '质检', '出库']
    },
    animationDurationUpdate: 1500,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        type: 'graph',
        layout: 'force',
        force: {
          repulsion: 500,
          edgeLength: 100
        },
        roam: true,
        draggable: true,
        label: {
          show: true,
          position: 'right',
          formatter: '{b}'
        },
        data: nodes.map(node => ({
          id: node.id,
          name: node.name,
          category: node.category,
          symbolSize: 40,
          itemStyle: node.itemStyle
        })),
        links: links.map(link => ({
          source: link.source,
          target: link.target
        })),
        categories: [
          { name: '原料' },
          { name: '采购入库' },
          { name: '生产' },
          { name: '产品' },
          { name: '质检' },
          { name: '出库' }
        ],
        lineStyle: {
          color: '#ccc',
          width: 2,
          curveness: 0
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 5
          }
        }
      }
    ]
  };
  
  fullTraceChart.setOption(option);
  
  // 添加窗口大小变化事件
  window.addEventListener('resize', () => {
    fullTraceChart && fullTraceChart.resize();
  });
};

// 销毁图表
onBeforeUnmount(() => {
  if (fullTraceChart) {
    fullTraceChart.dispose();
    fullTraceChart = null;
  }
});
</script>

<style scoped>
.traceability-container {
  height: 100%;
}

.box-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.demo-form-inline {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

.dialog-footer button {
  margin-left: 10px;
}

/* 标签样式 */
.el-tag {
  margin-right: 5px;
}

/* 表单项样式 */
.unit-text {
  margin-left: 5px;
}

/* 表格内部按钮间距 */
.el-button + .el-button,
.el-button + .el-dropdown {
  margin-left: 8px;
}

/* 对话框中的表格 */
.el-dialog .el-table {
  margin-bottom: 20px;
}

.trace-chart-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #f9f9f9;
  transition: all 0.3s;
}

/* 添加图表加载提示样式 */
.chart-loading-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #909399;
}

/* 提供图表操作提示 */
.chart-tip {
  position: absolute;
  right: 20px;
  top: 60px;
  padding: 8px 12px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: #606266;
  z-index: 10;
}

.full-trace-container {
  padding: 20px;
}

.trace-form {
  margin-bottom: 20px;
}

.trace-tabs {
  margin-top: 20px;
}

.full-trace-chart-container {
  height: 300px;
  margin-bottom: 20px;
}
</style> 