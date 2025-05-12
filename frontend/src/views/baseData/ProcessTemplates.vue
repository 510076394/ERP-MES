<template>
  <div class="process-templates-container">
    <div class="page-header">
      <h2>工序模板管理</h2>
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon> 新增工序模板
      </el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="产品名称">
          <el-select 
            v-model="searchForm.productId" 
            placeholder="选择产品" 
            clearable
            filterable
            style="width: 280px"
            @change="handleSearch"
          >
            <el-option 
              v-for="product in productList" 
              :key="product.id" 
              :label="`${product.code} - ${product.name}`" 
              :value="product.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="工序模板名称">
          <el-input v-model="searchForm.name" placeholder="请输入模板名称" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="data-card">
      <el-table
        :data="templateList"
        border
        style="width: 100%"
        v-loading="loading"
      >
        <!-- 展开详情列 -->
        <el-table-column type="expand" width="50">
          <template #default="props">
            <div class="process-detail" style="padding: 10px 20px">
              <h4>工序列表</h4>
              <el-table :data="props.row.processes" border>
                <el-table-column prop="order_num" label="工序顺序" width="100" />
                <el-table-column prop="name" label="工序名称" width="180" />
                <el-table-column prop="description" label="工序描述" min-width="200" />
                <el-table-column prop="standard_hours" label="标准工时(小时)" width="140" />
                <el-table-column prop="department" label="执行部门" width="120" />
                <el-table-column prop="remark" label="备注" min-width="150" />
              </el-table>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="code" label="模板编号" width="140" />
        <el-table-column prop="name" label="模板名称" width="200" />
        <el-table-column prop="product_name" label="关联产品" min-width="180">
          <template #default="scope">
            {{ scope.row.product_code ? `${scope.row.product_code} - ${scope.row.product_name}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="process_count" label="工序数量" width="100">
          <template #default="scope">
            {{ scope.row.processes ? scope.row.processes.length : 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="total_hours" label="总工时(小时)" width="120">
          <template #default="scope">
            {{ calculateTotalHours(scope.row.processes) }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button 
              size="small" 
              :type="scope.row.status === 1 ? 'warning' : 'success'" 
              @click="handleToggleStatus(scope.row)"
            >
              {{ scope.row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
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

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'create' ? '新增工序模板' : '编辑工序模板'"
      width="800px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="模板名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入模板名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联产品" prop="product_id">
              <el-select 
                v-model="form.product_id" 
                placeholder="选择关联产品" 
                filterable
                clearable
                style="width: 100%"
              >
                <el-option 
                  v-for="product in productList" 
                  :key="product.id" 
                  :label="`${product.code} - ${product.name}`" 
                  :value="product.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="模板描述">
              <el-input 
                v-model="form.description" 
                type="textarea" 
                :rows="2" 
                placeholder="请输入模板描述"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-divider>工序列表</el-divider>
        
        <div class="process-table-container">
          <div class="process-table-header">
            <el-button type="primary" size="small" @click="addProcess">
              <el-icon><Plus /></el-icon> 添加工序
            </el-button>
          </div>
          
          <el-table :data="form.processes" border>
            <el-table-column label="工序顺序" width="100">
              <template #default="{ row, $index }">
                <el-input-number 
                  v-model="row.order_num" 
                  :min="1" 
                  controls-position="right" 
                  size="small"
                  style="width: 80px"
                />
              </template>
            </el-table-column>
            
            <el-table-column label="工序名称" width="180">
              <template #default="{ row }">
                <el-input v-model="row.name" placeholder="请输入工序名称" />
              </template>
            </el-table-column>
            
            <el-table-column label="工序描述" min-width="200">
              <template #default="{ row }">
                <el-input v-model="row.description" placeholder="请输入工序描述" />
              </template>
            </el-table-column>
            
            <el-table-column label="标准工时(小时)" width="150">
              <template #default="{ row }">
                <el-input-number 
                  v-model="row.standard_hours" 
                  :min="0.1" 
                  :step="0.5" 
                  :precision="1" 
                  controls-position="right"
                  style="width: 120px"
                />
              </template>
            </el-table-column>
            
            <el-table-column label="执行部门" width="150">
              <template #default="{ row }">
                <el-select v-model="row.department" placeholder="选择部门" style="width: 120px">
                  <el-option label="生产一部" value="生产一部" />
                  <el-option label="生产二部" value="生产二部" />
                  <el-option label="装配部" value="装配部" />
                  <el-option label="包装部" value="包装部" />
                  <el-option label="质检部" value="质检部" />
                </el-select>
              </template>
            </el-table-column>
            
            <el-table-column label="备注" min-width="150">
              <template #default="{ row }">
                <el-input v-model="row.remark" placeholder="请输入备注" />
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="80">
              <template #default="{ $index }">
                <el-button type="danger" size="small" @click="removeProcess($index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form>
      <template #footer>
        <span>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, Search, Refresh, Delete,
  ArrowDown, Check, Close, CaretRight 
} from '@element-plus/icons-vue'
import axios from '@/services/api'
import dayjs from 'dayjs'

// 数据加载状态
const loading = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 搜索表单
const searchForm = reactive({
  productId: '',
  name: ''
})

// 产品列表
const productList = ref([])

// 工序模板列表
const templateList = ref([])

// 对话框控制
const dialogVisible = ref(false)
const dialogType = ref('create') // create 或 edit
const formRef = ref(null)

// 表单数据
const form = reactive({
  id: null,
  code: '',
  name: '',
  product_id: '',
  description: '',
  status: 1,
  processes: []
})

// 表单验证规则
const formRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  product_id: [{ required: true, message: '请选择关联产品', trigger: 'change' }]
}

// 初始化
onMounted(async () => {
  await fetchProductList()
  await fetchTemplateList()
})

// 获取产品列表
const fetchProductList = async () => {
  try {
    const response = await axios.get('/baseData/materials', {
      params: { category: 'product' }
    })
    
    if (response.data && response.data.data) {
      productList.value = response.data.data.map(item => ({
        id: item.id,
        code: item.code || '无编码',
        name: item.name,
        specs: item.specs || ''
      }))
    }
  } catch (error) {
    console.error('获取产品列表失败:', error)
    ElMessage.error('获取产品列表失败')
  }
}

// 获取工序模板列表
const fetchTemplateList = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      ...searchForm
    }
    
    const response = await axios.get('/baseData/process-templates', { params })
    if (response.data) {
      templateList.value = response.data.data || []
      total.value = response.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取工序模板列表失败:', error)
    ElMessage.error('获取工序模板列表失败')
  } finally {
    loading.value = false
  }
}

// 计算总工时
const calculateTotalHours = (processes) => {
  if (!processes || !processes.length) return 0
  return processes.reduce((sum, process) => sum + Number(process.standard_hours || 0), 0).toFixed(1)
}

// 格式化日期时间
const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return dayjs(dateTime).format('YYYY-MM-DD HH:mm')
}

// 搜索
const handleSearch = async () => {
  currentPage.value = 1
  await fetchTemplateList()
}

// 重置搜索
const handleReset = async () => {
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = ''
  })
  currentPage.value = 1
  await fetchTemplateList()
}

// 分页大小变化
const handleSizeChange = async (size) => {
  pageSize.value = size
  await fetchTemplateList()
}

// 当前页变化
const handleCurrentChange = async (page) => {
  currentPage.value = page
  await fetchTemplateList()
}

// 显示创建对话框
const showCreateDialog = () => {
  dialogType.value = 'create'
  form.id = null
  form.code = ''
  form.name = ''
  form.product_id = ''
  form.description = ''
  form.status = 1
  form.processes = [{ order_num: 1, name: '', description: '', standard_hours: 1, department: '', remark: '' }]
  dialogVisible.value = true
}

// 添加工序
const addProcess = () => {
  const order_num = form.processes.length > 0 
    ? Math.max(...form.processes.map(p => p.order_num)) + 1 
    : 1
  form.processes.push({
    order_num,
    name: '',
    description: '',
    standard_hours: 1,
    department: '',
    remark: ''
  })
}

// 移除工序
const removeProcess = (index) => {
  form.processes.splice(index, 1)
}

// 编辑工序模板
const handleEdit = (row) => {
  dialogType.value = 'edit'
  form.id = row.id
  form.code = row.code
  form.name = row.name
  form.product_id = row.product_id
  form.description = row.description || ''
  form.status = row.status
  form.processes = row.processes && row.processes.length 
    ? JSON.parse(JSON.stringify(row.processes)) 
    : [{ order_num: 1, name: '', description: '', standard_hours: 1, department: '', remark: '' }]
  
  dialogVisible.value = true
}

// 切换状态
const handleToggleStatus = async (row) => {
  try {
    const newStatus = row.status === 1 ? 0 : 1
    await axios.put(`/baseData/process-templates/${row.id}/status`, { status: newStatus })
    ElMessage.success(`工序模板已${newStatus === 1 ? '启用' : '禁用'}`)
    await fetchTemplateList()
  } catch (error) {
    console.error('更新状态失败:', error)
    ElMessage.error('更新状态失败')
  }
}

// 删除工序模板
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该工序模板吗？此操作不可逆', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await axios.delete(`/baseData/process-templates/${row.id}`)
    ElMessage.success('工序模板已删除')
    await fetchTemplateList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    // 校验工序列表
    if (!form.processes.length) {
      ElMessage.warning('请至少添加一个工序')
      return
    }
    
    for (const process of form.processes) {
      if (!process.name) {
        ElMessage.warning('工序名称不能为空')
        return
      }
      if (!process.standard_hours) {
        ElMessage.warning('标准工时不能为空')
        return
      }
    }
    
    // 排序工序
    form.processes.sort((a, b) => a.order_num - b.order_num)
    
    loading.value = true
    if (dialogType.value === 'create') {
      await axios.post('/baseData/process-templates', form)
      ElMessage.success('工序模板创建成功')
    } else {
      await axios.put(`/baseData/process-templates/${form.id}`, form)
      ElMessage.success('工序模板更新成功')
    }
    
    dialogVisible.value = false
    await fetchTemplateList()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.process-templates-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-card {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
}

.statistics-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  text-align: center;
  padding: 15px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.data-card {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.process-table-container {
  margin-top: 10px;
}

.process-table-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}
</style> 