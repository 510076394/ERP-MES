<template>
  <div class="template-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>检验模板管理</span>
          <div class="header-buttons">
            <el-button type="primary" @click="refreshData">
              <el-icon><Refresh /></el-icon>刷新数据
            </el-button>
            <el-button type="primary" @click="handleCreate">
              <el-icon><Plus /></el-icon>新建模板
            </el-button>
          </div>
        </div>
      </template>
      
      <!-- 搜索表单 -->
      <div class="search-container">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input
              v-model="searchKeyword"
              placeholder="请输入模板名称/编号"
              @keyup.enter="handleSearch"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          
          <el-col :span="4">
            <el-select v-model="typeFilter" placeholder="检验类型" clearable @change="handleSearch" style="width: 100%">
              <el-option label="来料检验" value="incoming" />
              <el-option label="过程检验" value="process" />
              <el-option label="成品检验" value="final" />
            </el-select>
          </el-col>
          
          <el-col :span="4">
            <el-select v-model="statusFilter" placeholder="状态" clearable @change="handleSearch" style="width: 100%">
              <el-option label="启用" value="active" />
              <el-option label="停用" value="inactive" />
              <el-option label="草稿" value="draft" />
            </el-select>
          </el-col>
          
          <el-col :span="6">
            <div class="search-buttons">
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon>查询
              </el-button>
              <el-button @click="handleRefresh">
                <el-icon><Refresh /></el-icon>重置
              </el-button>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 模板列表 -->
      <el-table
        :data="templateList"
        border
        style="width: 100%; margin-top: 16px;"
        v-loading="loading"
      >
        <el-table-column prop="template_code" label="模板编号" min-width="120" />
        <el-table-column prop="template_name" label="模板名称" min-width="150" />
        <el-table-column prop="inspection_type" label="检验类型" min-width="100">
          <template #default="scope">
            {{ getInspectionTypeText(scope.row.inspection_type) }}
          </template>
        </el-table-column>
        <el-table-column prop="material_type" label="适用物料类型" min-width="120">
          <template #default="scope">
            {{ getMaterialCodeById(scope.row.material_type) }}
          </template>
        </el-table-column>
        <el-table-column prop="items_count" label="检验项数量" min-width="100" />
        <el-table-column prop="version" label="版本" min-width="80" />
        <el-table-column prop="status" label="状态" min-width="80">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_by" label="创建人" min-width="100" />
        <el-table-column prop="created_at" label="创建时间" min-width="120">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="scope">
            <el-button v-if="scope.row.status !== 'active'" link type="primary" size="small" @click="handleEdit(scope.row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button link type="primary" size="small" @click="handleView(scope.row)">
              <el-icon><View /></el-icon>查看
            </el-button>
            <el-button v-if="scope.row.status === 'inactive' || scope.row.status === 'draft'" link type="success" size="small" @click="handleActivate(scope.row)">
              <el-icon><Check /></el-icon>启用
            </el-button>
            <el-dropdown @command="command => handleDropdownCommand(command, scope.row)">
              <el-button link type="primary" size="small">
                更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="scope.row.status === 'active'" command="deactivate">停用</el-dropdown-item>
                  <el-dropdown-item command="copy">复制</el-dropdown-item>
                  <el-dropdown-item command="delete">删除</el-dropdown-item>
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

    <!-- 创建/编辑模板对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑检验模板' : '新建检验模板'"
      width="900px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="模板名称" prop="template_name">
          <el-input v-model="form.template_name" placeholder="请输入模板名称" />
        </el-form-item>
        
        <el-form-item label="检验类型" prop="inspection_type">
          <el-select v-model="form.inspection_type" placeholder="请选择检验类型" style="width: 100%">
            <el-option label="来料检验" value="incoming" />
            <el-option label="过程检验" value="process" />
            <el-option label="成品检验" value="final" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="适用物料" prop="material_types">
          <el-select
            v-model="form.material_types"
            placeholder="请选择物料"
            filterable
            remote
            multiple
            collapse-tags
            collapse-tags-tooltip
            :remote-method="fetchMaterialsList"
            :loading="loadingMaterials"
            @change="handleMaterialChange"
            style="width: 100%"
          >
            <el-option
              v-for="item in materialsList"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="版本" prop="version">
          <el-input v-model="form.version" placeholder="请输入版本号" />
        </el-form-item>
        
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入模板描述"
          />
        </el-form-item>
        
        <el-form-item label="检验项目" prop="items">
          <div class="items-container">
            <div class="items-header">
              <h3>检验项目列表</h3>
              <el-button type="primary" @click="addItem">
                <el-icon><Plus /></el-icon>添加检验项
              </el-button>
            </div>
            
            <el-table :data="form.items" border style="width: 100%">
              <el-table-column type="index" width="50" label="序号" fixed />
              <el-table-column prop="item_name" label="检验项目" width="200" fixed>
                <template #default="scope">
                  <el-input v-model="scope.row.item_name" placeholder="请输入检验项目名称" />
                </template>
              </el-table-column>
              <el-table-column prop="standard" label="检验标准" min-width="300">
                <template #default="scope">
                  <div class="standard-input-group">
                    <el-input v-model="scope.row.standard" placeholder="请输入检验标准" />
                    <el-button type="primary" size="small" @click="openStandardSelector(scope.$index)">
                      <el-icon><Search /></el-icon>选择标准
                    </el-button>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="type" label="检验类型" width="120">
                <template #default="scope">
                  <el-select v-model="scope.row.type" placeholder="选择类型" style="width: 100%">
                    <el-option label="外观" value="visual" />
                    <el-option label="尺寸" value="dimension" />
                    <el-option label="功能" value="function" />
                    <el-option label="性能" value="performance" />
                    <el-option label="安全" value="safety" />
                    <el-option label="其他" value="other" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="is_critical" label="关键项" width="80">
                <template #default="scope">
                  <el-checkbox v-model="scope.row.is_critical" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80" fixed="right">
                <template #default="scope">
                  <el-button link type="danger" @click="removeItem(scope.$index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 查看模板详情对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="检验模板详情"
      width="800px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="模板编号">{{ currentTemplate?.template_code }}</el-descriptions-item>
        <el-descriptions-item label="模板名称">{{ currentTemplate?.template_name }}</el-descriptions-item>
        <el-descriptions-item label="检验类型">{{ getInspectionTypeText(currentTemplate?.inspection_type) }}</el-descriptions-item>
        <el-descriptions-item label="适用物料">
          {{ getMultipleMaterialCodes(currentTemplate?.material_types || [currentTemplate?.material_type]) }}
        </el-descriptions-item>
        <el-descriptions-item label="版本">{{ currentTemplate?.version }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentTemplate?.status)">
            {{ getStatusText(currentTemplate?.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建人">{{ currentTemplate?.created_by }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(currentTemplate?.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ currentTemplate?.description || '-' }}</el-descriptions-item>
      </el-descriptions>
      
      <div class="template-items" v-if="currentTemplate?.items?.length">
        <h3>检验项目列表</h3>
        <el-table :data="currentTemplate.items" border>
          <el-table-column type="index" width="50" label="序号" />
          <el-table-column prop="item_name" label="检验项目" min-width="150" />
          <el-table-column prop="standard" label="检验标准" min-width="200" />
          <el-table-column prop="type" label="检验类型" min-width="120">
            <template #default="scope">
              {{ getItemTypeText(scope.row.type) }}
            </template>
          </el-table-column>
          <el-table-column prop="is_critical" label="关键项" width="80">
            <template #default="scope">
              <el-tag size="small" :type="scope.row.is_critical ? 'danger' : 'info'">
                {{ scope.row.is_critical ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 检验标准选择对话框 -->
    <el-dialog
      v-model="standardSelectorVisible"
      title="选择检验标准"
      width="900px"
      destroy-on-close
    >
      <div class="standard-search-form">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-input 
              v-model="standardSearch.keyword" 
              placeholder="输入项目名称或标准" 
              clearable 
              @keyup.enter="searchStandards"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          <el-col :span="6">
            <el-select v-model="standardSearch.type" placeholder="检验类型" clearable>
              <el-option label="外观" value="visual" />
              <el-option label="尺寸" value="dimension" />
              <el-option label="功能" value="function" />
              <el-option label="性能" value="performance" />
              <el-option label="安全" value="safety" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-button type="primary" @click="searchStandards">
              <el-icon><Search /></el-icon>查询
            </el-button>
            <el-button @click="resetStandardSearch">
              <el-icon><Refresh /></el-icon>重置
            </el-button>
          </el-col>
        </el-row>
      </div>

      <el-table
        :data="reusableStandards"
        border
        style="width: 100%; margin-top: 16px"
        height="400px"
        v-loading="loadingStandards"
        @row-dblclick="selectStandard"
      >
        <el-table-column type="index" width="50" label="序号" />
        <el-table-column prop="item_name" label="检验项目" min-width="150" />
        <el-table-column prop="standard" label="检验标准" min-width="300" />
        <el-table-column prop="type" label="检验类型" width="120">
          <template #default="scope">
            {{ getItemTypeText(scope.row.type) }}
          </template>
        </el-table-column>
        <el-table-column prop="is_critical" label="关键项" width="80">
          <template #default="scope">
            <el-tag size="small" :type="scope.row.is_critical ? 'danger' : 'info'">
              {{ scope.row.is_critical ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button link type="primary" @click="selectStandard(scope.row)">选择</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, Refresh, Plus, ArrowDown, View, Edit, Delete, Check } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import dayjs from 'dayjs'
import { baseDataApi } from '@/services/api'
import { qualityApi } from '@/services/api'

// 搜索相关
const searchKeyword = ref('')
const typeFilter = ref('')
const statusFilter = ref('')

// 表格数据相关
const loading = ref(false)
const templateList = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 物料列表数据
const materialsList = ref([])
const loadingMaterials = ref(false)
const materialsMap = ref({}) // 新增：材料ID到代码的映射

// 对话框相关
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const isEdit = ref(false)
const currentTemplate = ref(null)
const formRef = ref(null)

// 表单数据
const form = reactive({
  template_name: '',
  inspection_type: '',
  material_types: [],
  material_name: '',
  version: '',
  description: '',
  items: []
})

// 表单验证规则
const rules = {
  template_name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  inspection_type: [{ required: true, message: '请选择检验类型', trigger: 'change' }],
  material_types: [{ required: true, message: '请选择适用物料', trigger: 'change' }],
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  items: [
    {
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请至少添加一个检验项目'))
        } else if (value.some(item => !item.item_name || !item.standard || !item.type)) {
          callback(new Error('请完整填写检验项目信息'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 检验标准选择相关
const standardSelectorVisible = ref(false)
const currentEditingIndex = ref(-1)
const reusableStandards = ref([])
const loadingStandards = ref(false)
const standardSearch = reactive({
  keyword: '',
  type: ''
})

// 初始化
onMounted(() => {
  console.log('组件挂载，开始获取数据...')
  // 强制刷新数据
  fetchData()
  fetchMaterialsList(true) // 传递true以获取所有物料
})

// 获取模板列表
const fetchData = async () => {
  loading.value = true
  try {
    debug('开始获取模板列表...', {
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value,
      inspection_type: typeFilter.value,
      status: statusFilter.value
    })
    
    const response = await qualityApi.getTemplates({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value,
      inspection_type: typeFilter.value,
      status: statusFilter.value
    })
    
    debug('模板列表API响应', response)
    
    if (response.data) {
      // 检查不同的数据结构格式并相应处理
      if (response.data.success && Array.isArray(response.data.data) && response.data.total !== undefined) {
        // 格式为 { success: true, data: Array, total: number }
        debug('检测到格式: { success: true, data: Array, total: number }', response.data)
        templateList.value = response.data.data
        total.value = response.data.total
      } else if (response.data.count !== undefined && Array.isArray(response.data.rows)) {
        // 格式为 { count: number, rows: array }
        debug('检测到格式: { count: number, rows: array }', response.data)
        templateList.value = response.data.rows
        total.value = response.data.count
      } else if (response.data.data && response.data.data.rows) {
        // 格式为 { data: { rows: array, count: number } }
        debug('检测到格式: { data: { rows: array, count: number } }', response.data)
        templateList.value = response.data.data.rows
        total.value = response.data.data.count
      } else if (Array.isArray(response.data)) {
        // 格式为 array
        debug('检测到格式: array', response.data)
        templateList.value = response.data
        total.value = response.data.length
      } else {
        // 其他未知格式，尝试处理
        const dataObj = response.data
        if (Array.isArray(dataObj)) {
          debug('检测到未知数组格式', dataObj)
          templateList.value = dataObj
          total.value = dataObj.length
        } else {
          console.error('无法识别的响应数据格式:', dataObj)
          templateList.value = []
          total.value = 0
        }
      }
      
      debug('数据映射后的模板列表', templateList.value)
      debug('总数', total.value)
      
      if (templateList.value.length === 0 && total.value > 0) {
        console.warn('警告: 总数不为0但模板列表为空，可能存在数据映射问题')
      }
    } else {
      console.error('模板列表API返回格式错误:', response)
      ElMessage.error('获取模板列表失败')
      templateList.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('获取模板列表失败:', error)
    console.error('错误详情:', {
      message: error.message,
      response: error.response,
      status: error.response?.status,
      data: error.response?.data
    })
    ElMessage.error(`获取模板列表失败: ${error.message}`)
    templateList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 获取物料列表
const fetchMaterialsList = async (fetchAll = false, search = '') => {
  loadingMaterials.value = true
  try {
    const params = fetchAll ? { page: 1, pageSize: 1000 } : { search }
    const response = await baseDataApi.getMaterials(params)
    
    if (response.data && response.data.data) {
      // 保存物料列表供选择使用
      materialsList.value = response.data.data.map(item => ({
        value: item.id,
        label: `${item.code} - ${item.name}`,
        name: item.name,
        code: item.code,
        specs: item.specs
      }))
      
      // 创建物料ID到信息的映射
      materialsMap.value = {}
      response.data.data.forEach(item => {
        materialsMap.value[item.id] = {
          name: item.name,
          code: item.code,
          specs: item.specs
        }
      })
    } else {
      materialsList.value = []
      console.warn('物料数据格式不正确:', response.data)
    }
  } catch (error) {
    console.error('获取物料列表失败:', error)
    ElMessage.error(`获取物料列表失败: ${error.message}`)
  } finally {
    loadingMaterials.value = false
  }
}

// 根据ID获取物料编码
const getMaterialCodeById = (id) => {
  if (!id) return '未指定'
  
  // 从映射中查找物料信息
  const material = materialsMap.value[id]
  if (material) {
    return `${material.code} - ${material.name}${material.specs ? ` (${material.specs})` : ''}`
  }
  
  // 如果映射中没有，但列表中有
  const materialInList = materialsList.value.find(item => item.value === id)
  if (materialInList) {
    return `${materialInList.code} - ${materialInList.name}${materialInList.specs ? ` (${materialInList.specs})` : ''}`
  }
  
  // 都没找到，显示ID并尝试重新获取物料列表
  if (Object.keys(materialsMap.value).length === 0) {
    fetchMaterialsList(true)
  }
  return `ID: ${id}`
}

// 根据多个ID获取物料编码
const getMultipleMaterialCodes = (ids) => {
  if (!ids || ids.length === 0) return '未指定'
  
  // 确保ids是数组
  const materialIds = Array.isArray(ids) ? ids : [ids]
  
  // 获取每个ID对应的物料信息并拼接
  const codes = materialIds.map(id => getMaterialCodeById(id))
  return codes.join('、')
}

// 物料选择改变时的处理
const handleMaterialChange = (values) => {
  // 处理多选值，确保都是数组
  if (!Array.isArray(values)) {
    values = [values].filter(Boolean)
  }
  
  // 设置单个material_type为第一个值（兼容旧代码）
  form.material_type = values.length > 0 ? values[0] : ''
  
  // 获取第一个物料的名称（兼容旧代码）
  if (values.length > 0) {
    const firstMaterial = materialsList.value.find(item => item.value === values[0])
    if (firstMaterial) {
      form.material_name = firstMaterial.name
    }
  } else {
    form.material_name = ''
  }
}

// 获取检验类型文本
const getInspectionTypeText = (type) => {
  const typeMap = {
    incoming: '来料检验',
    process: '过程检验',
    final: '成品检验'
  }
  return typeMap[type] || type
}

// 获取检验项类型文本
const getItemTypeText = (type) => {
  const typeMap = {
    visual: '外观',
    dimension: '尺寸',
    function: '功能',
    performance: '性能',
    safety: '安全',
    other: '其他'
  }
  return typeMap[type] || type
}

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    active: 'success',
    inactive: 'info',
    draft: 'warning'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    active: '启用',
    inactive: '停用',
    draft: '草稿'
  }
  return statusMap[status] || status
}

// 日期格式化
const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 打印调试信息
const debug = (message, data) => {
  const timestamp = new Date().toISOString().substr(11, 12)
  console.log(`[${timestamp}] ${message}`, data)
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  fetchData()
}

// 重置
const handleRefresh = () => {
  searchKeyword.value = ''
  typeFilter.value = ''
  statusFilter.value = ''
  currentPage.value = 1
  console.log('正在重置并刷新数据...')
  fetchData()
}

// 手动刷新数据（不重置过滤条件）
const refreshData = () => {
  console.log('手动刷新数据...')
  fetchData()
}

// 分页
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchData()
}

// 新建模板
const handleCreate = () => {
  isEdit.value = false
  form.template_name = ''
  form.inspection_type = ''
  form.material_types = []
  form.version = ''
  form.description = ''
  form.items = []
  dialogVisible.value = true
}

// 编辑模板
const handleEdit = async (row) => {
  isEdit.value = true
  try {
    console.log('获取模板详情，ID:', row.id)
    // 先获取完整的模板数据，包含检验项目
    const response = await qualityApi.getTemplate(row.id)
    
    if (response.data && response.data.data) {
      console.log('获取到的模板详情:', response.data.data)
      // 将模板数据填充到表单
      const templateData = response.data.data
      
      form.id = templateData.id
      form.template_name = templateData.template_name
      form.inspection_type = templateData.inspection_type
      
      // 处理material_type和material_types
      form.material_type = templateData.material_type || ''
      
      // 设置material_types，支持字符串或数组格式
      if (templateData.material_types && Array.isArray(templateData.material_types)) {
        form.material_types = templateData.material_types
      } else if (templateData.material_type) {
        form.material_types = [templateData.material_type]
      } else {
        form.material_types = []
      }
      
      form.material_name = templateData.material_name
      form.version = templateData.version
      form.description = templateData.description
      form.status = templateData.status
      
      // 确保检验项目数据完整
      form.items = templateData.InspectionItems ? 
        templateData.InspectionItems.map(item => ({
          item_name: item.item_name,
          standard: item.standard,
          type: item.type,
          is_critical: item.is_critical === true || item.is_critical === 1
        })) : []
      
      console.log('表单数据填充完成，检验项目数量:', form.items.length)
      dialogVisible.value = true
    } else {
      ElMessage.error('获取模板详情失败')
    }
  } catch (error) {
    console.error('获取模板详情失败:', error)
    ElMessage.error(`获取模板详情失败: ${error.message}`)
  }
}

// 查看模板
const handleView = async (row) => {
  try {
    console.log('获取模板详情，ID:', row.id)
    const response = await qualityApi.getTemplate(row.id)
    
    if (response.data && response.data.data) {
      const templateData = response.data.data
      console.log('获取到的模板详情:', templateData)
      
      // 确保模板数据正确
      currentTemplate.value = {
        ...templateData,
        items: templateData.InspectionItems || [] // 使用InspectionItems作为items
      }
      
      console.log('设置当前模板数据:', currentTemplate.value)
      console.log('检验项目数量:', currentTemplate.value.items.length)
      
      viewDialogVisible.value = true
    } else {
      ElMessage.error('获取模板详情失败')
    }
  } catch (error) {
    console.error('获取模板详情失败:', error)
    ElMessage.error(`获取模板详情失败: ${error.message}`)
  }
}

// 添加检验项
const addItem = () => {
  form.items.push({
    item_name: '',
    standard: '',
    type: '',
    is_critical: false
  })
}

// 移除检验项
const removeItem = (index) => {
  form.items.splice(index, 1)
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    // 整理提交数据
    const submitData = {
      ...form,
      material_type: form.material_types && form.material_types.length > 0 ? form.material_types[0] : null,
      material_types: form.material_types || []
    }
    
    console.log('提交模板表单，数据:', JSON.stringify({
      ...submitData,
      items: submitData.items.length + '个检验项'
    }, null, 2))
    
    // 确保每个检验项都有完整的数据
    if (form.items.some(item => !item.item_name || !item.standard || !item.type)) {
      ElMessage.warning('请完整填写所有检验项信息')
      return
    }
    
    // 根据模式选择不同的API
    const response = isEdit.value 
      ? await qualityApi.updateTemplate(form.id, submitData)
      : await qualityApi.createTemplate(submitData)
    
    console.log('提交响应:', response)
    
    if (response.data && response.data.success) {
      ElMessage.success(isEdit.value ? '模板更新成功' : '模板创建成功')
      dialogVisible.value = false
      fetchData() // 刷新列表
    } else {
      ElMessage.error(response.data?.message || (isEdit.value ? '更新失败' : '创建失败'))
    }
  } catch (error) {
    console.error(isEdit.value ? '更新模板失败:' : '创建模板失败:', error)
    console.error('错误详情:', {
      message: error.message,
      response: error.response,
      status: error.response?.status,
      data: error.response?.data
    })
    ElMessage.error(`${isEdit.value ? '更新' : '创建'}失败: ${error.message}`)
  }
}

// 处理更多操作
const handleDropdownCommand = async (command, row) => {
  try {
    if (command === 'activate' || command === 'deactivate') {
      const status = command === 'activate' ? 'active' : 'inactive'
      const response = await qualityApi.updateTemplateStatus(row.id, status)
      
      if (response.data) {
        ElMessage.success(`模板${status === 'active' ? '启用' : '停用'}成功`)
        fetchData()
      } else {
        ElMessage.error('操作失败')
      }
    } else if (command === 'copy') {
      const response = await qualityApi.copyTemplate(row.id)
      
      if (response.data) {
        ElMessage.success('模板复制成功')
        fetchData()
      } else {
        ElMessage.error('复制失败')
      }
    } else if (command === 'delete') {
      ElMessageBox.confirm('确定要删除该模板吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        const response = await qualityApi.deleteTemplate(row.id)
        
        if (response.data) {
          ElMessage.success('模板删除成功')
          fetchData()
        } else {
          ElMessage.error('删除失败')
        }
      }).catch(() => {})
    }
  } catch (error) {
    console.error('操作失败:', error)
    ElMessage.error(`操作失败: ${error.message}`)
  }
}

// 打开检验标准选择器
const openStandardSelector = (index) => {
  currentEditingIndex.value = index
  standardSelectorVisible.value = true
  searchStandards()
}

// 查询可复用的检验标准
const searchStandards = async () => {
  loadingStandards.value = true
  try {
    const params = {
      keyword: standardSearch.keyword,
      type: standardSearch.type
    }
    
    const response = await qualityApi.getReusableItems(params)
    
    if (response.data && response.data.success && response.data.data) {
      reusableStandards.value = response.data.data
    } else {
      reusableStandards.value = []
      console.warn('获取检验标准数据格式不正确:', response.data)
    }
  } catch (error) {
    console.error('获取检验标准失败:', error)
    ElMessage.error(`获取检验标准失败: ${error.message}`)
    reusableStandards.value = []
  } finally {
    loadingStandards.value = false
  }
}

// 重置检验标准搜索
const resetStandardSearch = () => {
  standardSearch.keyword = ''
  standardSearch.type = ''
  searchStandards()
}

// 选择检验标准
const selectStandard = (row) => {
  if (currentEditingIndex.value >= 0 && currentEditingIndex.value < form.items.length) {
    // 复制选中的标准到当前编辑的项目
    form.items[currentEditingIndex.value].item_name = row.item_name
    form.items[currentEditingIndex.value].standard = row.standard
    form.items[currentEditingIndex.value].type = row.type
    form.items[currentEditingIndex.value].is_critical = row.is_critical
    form.items[currentEditingIndex.value].reuse_item_id = row.id // 设置复用项目ID
    
    ElMessage.success('已选择标准')
    standardSelectorVisible.value = false
  }
}

// 添加直接启用模板的方法
const handleActivate = async (row) => {
  try {
    const response = await qualityApi.updateTemplateStatus(row.id, 'active')
    
    if (response.data) {
      ElMessage.success('模板启用成功')
      fetchData()
    } else {
      ElMessage.error('操作失败')
    }
  } catch (error) {
    console.error('启用模板失败:', error)
    ElMessage.error(`启用失败: ${error.message}`)
  }
}
</script>

<style scoped>
.template-container {
  padding: 16px;
}

.search-container {
  margin-bottom: 16px;
}

.search-buttons {
  display: flex;
  gap: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-buttons {
  display: flex;
  gap: 8px;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.items-container {
  border: 1px solid #EBEEF5;
  border-radius: 4px;
  padding: 16px;
  overflow-x: auto;
}

.items-container .el-table {
  min-width: 800px;
}

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.items-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.template-items {
  margin-top: 20px;
}

.template-items h3 {
  margin-bottom: 16px;
  font-size: 16px;
  color: #303133;
}

.standard-input-group {
  display: flex;
  align-items: center;
}

.standard-input-group .el-input {
  flex: 1;
  margin-right: 8px;
}

.standard-search-form {
  margin-bottom: 16px;
}
</style> 