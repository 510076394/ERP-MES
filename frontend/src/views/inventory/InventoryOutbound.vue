<template>
  <div class="inventory-outbound-container">
    <div class="page-header">
      <h2>出库管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon> 新建出库单
      </el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="搜索">
          <el-input 
            v-model="searchKeyword" 
            placeholder="出库单号/物料" 
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="locationFilter" placeholder="仓库" clearable>
            <el-option
              v-for="item in warehouseOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="statusFilter" placeholder="状态" clearable>
            <el-option label="草稿" value="draft" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
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
    
    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ outboundStats.total || 0 }}</div>
        <div class="stat-label">出库单总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ outboundStats.draftCount || 0 }}</div>
        <div class="stat-label">草稿状态</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ outboundStats.confirmedCount || 0 }}</div>
        <div class="stat-label">已确认</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ outboundStats.completedCount || 0 }}</div>
        <div class="stat-label">已完成</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ outboundStats.cancelledCount || 0 }}</div>
        <div class="stat-label">已取消</div>
      </el-card>
    </div>
    
    <!-- 数据表格 -->
    <el-card class="data-card">
      <el-table
        :data="outboundList"
        border
        style="width: 100%"
        v-loading="loading"
        :max-height="tableHeight"
      >
        <el-table-column prop="outbound_no" label="出库单号" width="180" />
        <el-table-column prop="outbound_date" label="出库日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.outbound_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="location_name" label="仓库" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="total_amount" label="总数量" width="100" />
        <el-table-column prop="operator" label="操作人" width="120" />
        <el-table-column prop="remark" label="备注" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="scope">
            <el-button 
              link 
              type="primary" 
              size="small" 
              @click="handleView(scope.row)"
            >
              <el-icon><View /></el-icon>查看
            </el-button>
            <el-button 
              v-if="scope.row.status === 'draft'" 
              link 
              type="primary" 
              size="small" 
              @click="handleEdit(scope.row)"
            >
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button 
              v-if="scope.row.status === 'draft'" 
              link 
              type="danger" 
              size="small" 
              @click="handleDelete(scope.row)"
            >
              <el-icon><Delete /></el-icon>删除
            </el-button>
            <el-button 
              v-if="scope.row.status === 'draft'"
              link 
              type="success" 
              size="small" 
              @click="handleUpdateStatus(scope.row, 'confirmed')"
            >
              <el-icon><Check /></el-icon>确认
            </el-button>
            <el-button 
              v-if="scope.row.status === 'confirmed'"
              link 
              type="success" 
              size="small" 
              @click="handleUpdateStatus(scope.row, 'completed')"
            >
              <el-icon><Finished /></el-icon>完成
            </el-button>
            <el-button 
              v-if="scope.row.status === 'draft' || scope.row.status === 'confirmed'"
              link 
              type="warning" 
              size="small" 
              @click="handleUpdateStatus(scope.row, 'cancelled')"
            >
              <el-icon><Close /></el-icon>取消
            </el-button>
            <el-button 
              link 
              type="primary" 
              size="small" 
              @click="handlePrint(scope.row)"
            >
              <el-icon><Printer /></el-icon>打印
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
    
    <!-- 出库单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增出库单' : dialogType === 'edit' ? '编辑出库单' : '查看出库单'"
      width="60%"
      :close-on-click-modal="false"
    >
      <el-form
        ref="outboundFormRef"
        :model="outboundForm"
        :rules="outboundRules"
        label-width="120px"
        :disabled="dialogType === 'view'"
      >
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="出库单号">
              <el-input v-model="outboundForm.outbound_no" placeholder="系统自动生成" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="出库日期" prop="outbound_date">
              <el-date-picker
                v-model="outboundForm.outbound_date"
                type="date"
                placeholder="选择日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="仓库" prop="location_id">
              <el-select
                v-model="outboundForm.location_id"
                placeholder="选择仓库"
                style="width: 100%"
              >
                <el-option
                  v-for="item in warehouseOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="生产计划" prop="production_plan_id">
              <el-select
                v-model="outboundForm.production_plan_id"
                placeholder="选择生产计划"
                style="width: 100%"
                @change="handleProductionPlanChange"
                clearable
              >
                <el-option
                  v-for="item in productionPlanOptions"
                  :key="item.id"
                  :label="item.code + ' - ' + (item.name || '')"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="操作人" prop="operator">
              <el-input v-model="outboundForm.operator" placeholder="操作人" readonly />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="outboundForm.remark"
            type="textarea"
            placeholder="请输入备注"
            :rows="2"
          />
        </el-form-item>
        
        <el-divider content-position="center">出库明细</el-divider>
        
        <div class="table-operations" v-if="dialogType !== 'view'">
          <el-button type="primary" @click="handleAddItem">
            <el-icon><Plus /></el-icon>添加物料
          </el-button>
        </div>
        
        <el-table :data="outboundForm.items" border style="width: 100%">
          <el-table-column label="序号" type="index" width="50" />
          <el-table-column label="物料编码" width="120">
            <template #default="scope">
              <span>{{ scope.row.material_code || scope.row.materialCode || '未知编码' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="物料名称">
            <template #default="scope">
              <span>{{ scope.row.material_name || scope.row.materialName || '未知名称' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="规格" width="120">
            <template #default="scope">
              <span>{{ scope.row.specification || scope.row.specs || '无规格' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="单位" width="80">
            <template #default="scope">
              <span>{{ scope.row.unit_name || scope.row.unit || '无单位' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="库存数量" width="100">
            <template #default="scope">
              <span>{{ scope.row.stock_quantity || scope.row.stockQuantity || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column label="出库数量" width="150">
            <template #default="scope">
              <el-input-number
                v-if="dialogType !== 'view' && !scope.row.is_from_plan"
                v-model="scope.row.quantity"
                :min="0"
                :max="scope.row.stock_quantity || scope.row.stockQuantity || 9999"
                :precision="2"
                :step="1"
                style="width: 120px"
              />
              <el-tooltip
                v-else-if="scope.row.is_from_plan"
                :content="'生产计划数量：' + (selectedPlan?.quantity || 0) + ' ' + (selectedPlan?.unit_name || '') + '，BOM用量：' + (scope.row.bom_quantity || scope.row.bomQuantity || 0) + ' ' + (scope.row.unit_name || scope.row.unit || '')"
                placement="top"
              >
                <span>{{ scope.row.quantity }}</span>
              </el-tooltip>
              <span v-else>{{ scope.row.quantity }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" v-if="dialogType !== 'view'">
            <template #default="scope">
              <el-button
                link
                type="danger"
                size="small"
                @click="handleRemoveItem(scope.$index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            v-if="dialogType !== 'view'"
            type="primary"
            @click="handleSubmit"
            :loading="submitting"
          >
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 选择物料对话框 -->
    <el-dialog
      v-model="materialDialogVisible"
      title="选择物料"
      width="70%"
    >
      <div class="material-search">
        <el-input
          v-model="materialSearchKeyword"
          placeholder="搜索物料编码/名称"
          @keyup.enter="searchMaterials"
        >
          <template #append>
            <el-button @click="searchMaterials">
              <el-icon><Search /></el-icon>
            </el-button>
          </template>
        </el-input>
      </div>
      
      <el-table
        :data="materialList"
        border
        style="width: 100%"
        height="400px"
        @row-click="handleSelectMaterial"
        v-loading="loadingMaterials"
      >
        <el-table-column prop="code" label="物料编码" width="120" />
        <el-table-column prop="name" label="物料名称" />
        <el-table-column prop="specification" label="规格" width="120" />
        <el-table-column prop="unit_name" label="单位" width="80" />
        <el-table-column prop="stock_quantity" label="库存数量" width="100" />
      </el-table>
    </el-dialog>

    <!-- 打印预览对话框 -->
    <el-dialog
      v-model="printDialogVisible"
      title="打印预览"
      width="50%"
      append-to-body
    >
      <div class="print-preview">
        <div ref="printContent" class="print-content">
          <div class="print-header">
            <h2>出库单</h2>
            <div class="print-info">
              <div>单号: {{ printData.outbound_no }}</div>
              <div>日期: {{ formatDate(printData.outbound_date) }}</div>
            </div>
          </div>
          
          <div class="print-warehouse">
            <span>出库仓库: {{ printData.location_name }}</span>
          </div>

          <table class="print-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>物料编码</th>
                <th>物料名称</th>
                <th>规格</th>
                <th>单位</th>
                <th>数量</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in printData.items" :key="index">
                <td>{{ index + 1 }}</td>
                <td>{{ item.material_code || item.materialCode }}</td>
                <td>{{ item.material_name || item.materialName }}</td>
                <td>{{ item.specification || item.specs || '-' }}</td>
                <td>{{ item.unit_name || item.unit }}</td>
                <td>{{ item.quantity }}</td>
              </tr>
            </tbody>
          </table>

          <div class="print-footer">
            <div>
              <span>备注: {{ printData.remark || '无' }}</span>
            </div>
            <div class="print-signatures">
              <div>
                <span>操作人: {{ printData.operator }}</span>
              </div>
              <div>
                <span>签收人: ________________</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="printDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="printOutbound">确认打印</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, ArrowDown, Printer } from '@element-plus/icons-vue'
import api, { productionApi, inventoryApi, baseDataApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { generateOutboundPrintHTML } from '@/utils/printTemplates'

export default {
  name: 'InventoryOutbound',
  components: {
    Search,
    Plus,
    ArrowDown,
    Printer,
  },
  setup() {
    const authStore = useAuthStore()
    
    // 列表数据
    const outboundList = ref([])
    const loading = ref(false)
    const currentPage = ref(1)
    const pageSize = ref(20)
    const total = ref(0)
    const searchKeyword = ref('')
    const locationFilter = ref('')
    const statusFilter = ref('')
    const tableHeight = ref('calc(100vh - 280px)')
    
    // 对话框控制
    const dialogVisible = ref(false)
    const dialogType = ref('add') // 'add', 'edit', 'view'
    const outboundFormRef = ref(null)
    const submitting = ref(false)
    
    // 选择物料相关
    const materialDialogVisible = ref(false)
    const materialSearchKeyword = ref('')
    const materialList = ref([])
    const loadingMaterials = ref(false)
    const selectedLocationId = ref(null)
    
    // 打印相关
    const printDialogVisible = ref(false)
    const printContent = ref(null)
    const printData = ref({})
    
    // 下拉选项
    const warehouseOptions = ref([])
    const productionPlanOptions = ref([])
    
    // 出库单统计数据
    const outboundStats = reactive({
      total: 0,
      draftCount: 0,
      confirmedCount: 0,
      completedCount: 0,
      cancelledCount: 0
    })
    
    // 计算属性：当前选中的生产计划
    const selectedPlan = computed(() => {
      if (!outboundForm.production_plan_id) return null
      return productionPlanOptions.value.find(plan => plan.id === outboundForm.production_plan_id)
    })

    // 工具函数
    const formatDate = (dateStr) => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    const formatDateTime = (dateStr) => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return `${formatDate(dateStr)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
    }

    const getStatusType = (status) => {
      const statusMap = {
        'draft': 'info',
        'confirmed': 'warning',
        'completed': 'success',
        'cancelled': 'danger'
      }
      return statusMap[status] || 'info'
    }

    const getStatusText = (status) => {
      const statusMap = {
        'draft': '草稿',
        'confirmed': '已确认',
        'completed': '已完成',
        'cancelled': '已取消'
      }
      return statusMap[status] || status
    }

    // 加载生产计划列表
    const loadProductionPlans = async () => {
      try {
        // 获取草稿状态和配料中状态的计划
        const res = await productionApi.getProductionPlans({ status: ['draft', 'preparing'] })
        productionPlanOptions.value = res.data.items.map(plan => ({
          id: plan.id,
          name: plan.name,
          code: plan.code,
          product_id: plan.product_id,
          quantity: plan.quantity || 0, // 添加生产计划数量
          unit_name: plan.unit_name, // 添加单位信息
          status: plan.status // 添加状态信息
        }))
        console.log('生产计划列表:', productionPlanOptions.value)
      } catch (error) {
        console.error('加载生产计划失败:', error)
        ElMessage.error('加载生产计划失败')
      }
    }

    // 获取仓库列表
    const fetchLocations = async () => {
      try {
        const res = await api.get('/inventory/locations')
        warehouseOptions.value = res.data.map(l => ({
          id: l.id,
          name: l.name
        }))
      } catch (error) {
        console.error('获取仓库列表失败:', error)
        ElMessage.error('获取仓库列表失败')
      }
    }
    
    // 表单数据
    const outboundForm = reactive({
      id: null,
      outbound_no: '',
      outbound_date: new Date(),
      location_id: '',
      location_name: '',
      status: 'draft',
      operator: authStore.user?.username || 'system',  // 提供默认值
      remark: '',
      production_plan_id: null,
      items: []
    })
    
    // 表单验证规则
    const outboundRules = {
      outbound_date: [
        { required: true, message: '请选择出库日期', trigger: 'change' }
      ],
      location_id: [
        { required: true, message: '请选择仓库', trigger: 'change' }
      ],
      operator: [
        { required: true, message: '请填写操作人', trigger: 'blur' }
      ]
    }
    
    // 搜索物料
    const searchMaterials = async () => {
      if (!outboundForm.location_id) {
        ElMessage.warning('请先选择仓库')
        return
      }
      
      loadingMaterials.value = true
      try {
        const params = {
          keyword: materialSearchKeyword.value,
          location_id: outboundForm.location_id,
          include_stock: true  // 添加参数，确保返回库存信息
        }
        
        console.log('搜索物料参数:', params)
        const res = await api.get('/inventory/materials-with-stock', { params })
        console.log('搜索物料返回数据:', res.data)
        
        // 确保每个物料都有正确的库存数量和ID
        materialList.value = res.data.map(item => {
          // 使用接收到的ID或material_id
          const materialId = item.id || item.material_id
          const stockQuantity = item.stock_quantity !== undefined ? 
                             parseFloat(item.stock_quantity) : 
                             (item.quantity !== undefined ? parseFloat(item.quantity) : 0)
          
          console.log(`物料[${item.name}] ID=${materialId}, 库存=${stockQuantity}`)
          
          return {
            ...item,
            id: materialId, // 确保id字段存在
            material_id: materialId, // 同时保存material_id
            stock_quantity: stockQuantity
          }
        })
        
        console.log('处理后的物料列表:', materialList.value)
      } catch (error) {
        console.error('搜索物料失败:', error)
        ElMessage.error('搜索物料失败')
      } finally {
        loadingMaterials.value = false
      }
    }
    
    // 选择物料
    const handleSelectMaterial = async (row) => {
      // 确保使用正确的物料ID
      const materialId = row.id || row.material_id
      
      // 记录完整的行数据用于调试
      console.log('选择的物料完整数据:', row)
      console.log('使用的物料ID:', materialId)
      
      // 检查是否已经添加过该物料
      const existingIndex = outboundForm.items.findIndex(item => 
        item.material_id === materialId || item.material_id === row.id || item.material_id === row.material_id
      )
      
      if (existingIndex !== -1) {
        ElMessage.warning('该物料已添加')
        return
      }
      
      try {
        // 加载该物料在选定仓库的最新库存
        const stockRes = await inventoryApi.getMaterialStock(materialId, outboundForm.location_id)
        console.log('获取到的物料库存数据:', stockRes.data)
        
        if (!stockRes?.data) {
          throw new Error('获取库存信息失败')
        }
        
        // 获取库存数量，确保是数值类型
        const stockQuantity = (stockRes.data.quantity !== undefined && stockRes.data.quantity !== null) 
          ? parseFloat(stockRes.data.quantity) 
          : (stockRes.data.stock_quantity !== undefined && stockRes.data.stock_quantity !== null) 
            ? parseFloat(stockRes.data.stock_quantity) 
            : 0
        
        console.log(`物料[${row.name}]最终库存数量: ${stockQuantity}`)
        
        // 添加物料到出库单
        outboundForm.items.push({
          material_id: materialId,
          material_code: row.code,
          material_name: row.name,
          specification: row.specification || row.specs || '',
          unit_id: row.unit_id,
          unit_name: row.unit_name,
          stock_quantity: stockQuantity,
          quantity: Math.min(1, stockQuantity) // 默认数量为1，但不超过库存
        })
        
        ElMessage.success(`已添加物料: ${row.code} - ${row.name}`)
      } catch (error) {
        console.error('获取物料库存失败:', error)
        // 使用行数据中的库存量作为备用
        const rowStockQuantity = row.stock_quantity !== undefined 
          ? parseFloat(row.stock_quantity) 
          : (row.quantity !== undefined ? parseFloat(row.quantity) : 0)
        
        console.warn(`使用行数据中的库存量: ${rowStockQuantity}`)
        
        outboundForm.items.push({
          material_id: materialId,
          material_code: row.code,
          material_name: row.name,
          specification: row.specification || row.specs || '',
          unit_id: row.unit_id,
          unit_name: row.unit_name,
          stock_quantity: rowStockQuantity,
          quantity: Math.min(1, rowStockQuantity) // 默认数量为1，但不超过库存
        })
        
        ElMessage.success(`已添加物料: ${row.code} - ${row.name}`)
      }
      
      materialDialogVisible.value = false
    }
    
    // 处理搜索
    const handleSearch = () => {
      currentPage.value = 1
      fetchOutboundList()
    }
    
    // 处理分页大小变化
    const handleSizeChange = (val) => {
      pageSize.value = val
      fetchOutboundList()
    }
    
    // 处理当前页变化
    const handleCurrentChange = (val) => {
      currentPage.value = val
      fetchOutboundList()
    }
    
    // 获取出库单列表
    const fetchOutboundList = async () => {
      loading.value = true
      try {
        const params = {
          page: currentPage.value,
          limit: pageSize.value,
          search: searchKeyword.value,
          location_id: locationFilter.value,
          status: statusFilter.value
        }
        
        const res = await api.get('/inventory/outbound', { params })
        outboundList.value = res.data.items
        total.value = res.data.total
        
        // 更新统计数据
        updateStats()
      } catch (error) {
        console.error('获取出库单列表失败:', error)
        ElMessage.error('获取出库单列表失败')
      } finally {
        loading.value = false
      }
    }
    
    // 处理添加
    // 在打开对话框时加载生产计划
    const handleAdd = async () => {
      await loadProductionPlans() // 加载生产计划列表
      resetForm()                 // 重置表单数据
      dialogType.value = 'add'    // 设置对话框类型为新增
      dialogVisible.value = true  // 显示对话框
    }
    
    // 处理查看
    const handleView = (row) => {
      fetchOutboundDetail(row.id, 'view')
    }
    
    // 处理编辑
    const handleEdit = (row) => {
      fetchOutboundDetail(row.id, 'edit')
    }
    
    // 获取出库单详情
    const fetchOutboundDetail = async (id, type) => {
      loading.value = true
      try {
        const res = await api.get(`/inventory/outbound/${id}`)
        
        // 设置表单数据
        Object.assign(outboundForm, res.data)
        
        // 设置对话框类型
        dialogType.value = type
        dialogVisible.value = true
      } catch (error) {
        console.error('获取出库单详情失败:', error)
        ElMessage.error('获取出库单详情失败')
      } finally {
        loading.value = false
      }
    }
    
    // 处理删除
    const handleDelete = (row) => {
      ElMessageBox.confirm('确定要删除此出库单吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await api.delete(`/inventory/outbound/${row.id}`)
          ElMessage.success('删除成功')
          fetchOutboundList()
        } catch (error) {
          console.error('删除出库单失败:', error)
          ElMessage.error('删除出库单失败')
        }
      }).catch(() => {})
    }
    
    // 处理更新状态
    const handleUpdateStatus = async (row, newStatus) => {
      const statusText = {
        'confirmed': '确认',
        'completed': '完成',
        'cancelled': '取消'
      }
      
      ElMessageBox.confirm(`确定要${statusText[newStatus]}此出库单吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await api.put(`/inventory/outbound/${row.id}/status`, { newStatus })
          ElMessage.success(`${statusText[newStatus]}成功`)
          fetchOutboundList()
        } catch (error) {
          console.error('更新出库单状态失败:', error)
          ElMessage.error('更新出库单状态失败')
        }
      }).catch(() => {})
    }
    
    // 处理添加物料
    const handleAddItem = () => {
      if (!outboundForm.location_id) {
        ElMessage.warning('请先选择仓库')
        return
      }
      
      if (outboundForm.production_plan_id) {
        ElMessage.warning('已选择生产计划，无法手动添加物料')
        return
      }
      
      selectedLocationId.value = outboundForm.location_id
      materialSearchKeyword.value = ''
      materialList.value = []
      materialDialogVisible.value = true
      // 打开对话框后自动搜索物料
      searchMaterials()
    }

    // 验证物料数据
    const validateItems = () => {
      if (outboundForm.items.length === 0) {
        ElMessage.warning('请添加至少一个物料')
        return false
      }
      
      for (const item of outboundForm.items) {
        if (!item.quantity || item.quantity <= 0) {
          ElMessage.warning(`${item.material_name} 的出库数量必须大于0`)
          return false
        }
        
        if (item.quantity > item.stock_quantity) {
          ElMessage.warning(`${item.material_name} 的出库数量不能大于库存数量`)
          return false
        }
      }
      return true
    }
    
    // 移除物料项
    const handleRemoveItem = (index) => {
      outboundForm.items.splice(index, 1)
    }
    
    // 重置表单
    const resetForm = () => {
      // 重置表单数据为初始状态
      Object.assign(outboundForm, {
        id: null,
        outbound_no: '',
        outbound_date: new Date(),
        location_id: '',
        location_name: '',
        status: 'draft',
        operator: authStore.user?.username || 'system',
        remark: '',
        production_plan_id: null,
        items: []
      })
      
      // 如果表单引用存在，重置表单的验证状态
      if (outboundFormRef.value) {
        outboundFormRef.value.resetFields()
      }
    }
    
    // 提交表单
    const handleSubmit = async () => {
      if (!outboundFormRef.value) return
      
      try {
        // 表单验证
        await outboundFormRef.value.validate()
        
        // 物料验证
        if (!validateItems()) return
        
        submitting.value = true
        
        // 格式化表单数据
        const formattedOutboundForm = {
          ...outboundForm,
          outbound_date: formatDate(outboundForm.outbound_date)
        }
        
        // 提交数据
        if (dialogType.value === 'add') {
          await api.post('/inventory/outbound', formattedOutboundForm)
          ElMessage.success('创建出库单成功')
        } else {
          await api.put(`/inventory/outbound/${formattedOutboundForm.id}`, formattedOutboundForm)
          ElMessage.success('更新出库单成功')
        }
        
        dialogVisible.value = false
        fetchOutboundList()
      } catch (error) {
        if (error.name === 'ValidationError') {
          return // 表单验证错误已经由 Element Plus 处理
        }
        console.error('保存出库单失败:', error)
        ElMessage.error('保存出库单失败')
      } finally {
        submitting.value = false
      }
    }
    
    // 重置搜索
    const resetSearch = () => {
      searchKeyword.value = '';
      locationFilter.value = '';
      statusFilter.value = '';
      handleSearch();
    };

    // 更新统计数据
    const updateStats = () => {
      // 计算统计数据
      outboundStats.total = total.value || 0;
      outboundStats.draftCount = outboundList.value.filter(item => item.status === 'draft').length;
      outboundStats.confirmedCount = outboundList.value.filter(item => item.status === 'confirmed').length;
      outboundStats.completedCount = outboundList.value.filter(item => item.status === 'completed').length;
      outboundStats.cancelledCount = outboundList.value.filter(item => item.status === 'cancelled').length;
    };
    
    // 在页面加载时初始化数据
    onMounted(async () => {
      try {
        await Promise.all([
          fetchOutboundList(),  // 获取出库单列表
          fetchLocations(),     // 获取仓库列表
          loadProductionPlans() // 获取生产计划列表
        ])
      } catch (error) {
        console.error('初始化数据失败:', error)
        ElMessage.error('初始化数据失败')
      }
    })

    // 处理打印
    const handlePrint = async (row) => {
      try {
        const res = await api.get(`/inventory/outbound/${row.id}`)
        printData.value = res.data
        printDialogVisible.value = true
      } catch (error) {
        console.error('获取出库单详情失败:', error)
        ElMessage.error('获取出库单详情失败')
      }
    }
    
    // 打印出库单
    const printOutbound = () => {
      // 创建一个新的打印窗口
      const printWindow = window.open('', '_blank')
      
      // 使用模板函数生成HTML内容
      const htmlContent = generateOutboundPrintHTML(printData.value, formatDate)
      
      // 写入内容并关闭文档流
      printWindow.document.write(htmlContent)
      printWindow.document.close()
    }

    // 处理生产计划变化
    const handleProductionPlanChange = async (planId) => {
      console.log('handleProductionPlanChange called with planId:', planId)
      if (!planId) {
        outboundForm.items = []
        return
      }

      if (!outboundForm.location_id) {
        ElMessage.warning('请先选择仓库')
        outboundForm.production_plan_id = null
        return
      }

      try {
        console.log('productionPlanOptions:', productionPlanOptions.value)
        // 获取选中的生产计划
        const selectedPlan = productionPlanOptions.value?.find(plan => plan?.id === planId)
        console.log('selectedPlan:', selectedPlan)
        if (!selectedPlan) {
          ElMessage.warning('未找到选中的生产计划，请刷新页面重试')
          outboundForm.items = []
          return
        }
        
        if (!selectedPlan.quantity || selectedPlan.quantity <= 0) {
          ElMessage.warning('生产计划数量异常，请检查生产计划')
          outboundForm.items = []
          return
        }

        // 获取BOM信息
        console.log('Fetching BOM for product_id:', selectedPlan.product_id)
        // 使用正确的参数格式调用API
        const bomRes = await baseDataApi.getBoms({ 
          params: {  // 修正这里，确保参数格式正确
            product_id: selectedPlan.product_id,  // 使用product_id而不是productId
            page: 1,
            pageSize: 10
          }
        })
        console.log('BOM API请求参数:', { 
          product_id: selectedPlan.product_id, 
          page: 1,
          pageSize: 10
        })
        console.log('BOM response:', bomRes)

        // 检查BOM数据
        if (!bomRes?.data) {
          ElMessage({
            message: '获取BOM数据失败',
            type: 'warning',
            duration: 5000
          })
          outboundForm.items = []
          return
        }

        let bomData
        if (Array.isArray(bomRes.data.data)) {
          bomData = bomRes.data.data[0]
        } else if (bomRes.data.data) {
          bomData = bomRes.data.data
        } else if (Array.isArray(bomRes.data)) {
          bomData = bomRes.data[0]
        } else {
          bomData = bomRes.data
        }

        if (!bomData?.id) {
          ElMessage({
            message: '未找到对应的BOM信息，请先在BOM管理中为该产品创建BOM',
            type: 'warning',
            duration: 5000
          })
          outboundForm.items = []
          return
        }

        let details = []
        if (Array.isArray(bomData.details)) {
          details = bomData.details
        } else if (bomData.bom_details) {
          details = bomData.bom_details
        } else if (bomData.materials) {  // 增加对materials字段的检查
          details = bomData.materials
        }

        console.log('BOM data structure:', bomData)
        console.log('Details source:', bomData.details ? 'details' : (bomData.bom_details ? 'bom_details' : (bomData.materials ? 'materials' : 'none')))
        console.log('物料详情原始数据:', details)

        if (!details || !details.length) {
          // 尝试获取物料需求
          try {
            console.log('尝试使用calculateMaterials获取物料需求')
            const materialsRes = await productionApi.calculateMaterials({
              productId: selectedPlan.product_id,
              bomId: bomData.id,
              quantity: selectedPlan.quantity
            })
            
            console.log('物料需求计算结果:', materialsRes.data)
            
            if (Array.isArray(materialsRes.data) && materialsRes.data.length > 0) {
              details = materialsRes.data
              console.log('从calculateMaterials获取的物料详情:', details)
            } else {
              ElMessage({
                message: '该产品的BOM中没有物料明细',
                type: 'warning',
                duration: 5000
              })
              outboundForm.items = []
              return
            }
          } catch (error) {
            console.error('计算物料需求失败:', error)
            ElMessage({
              message: '该产品的BOM中没有物料明细，无法生成出库单',
              type: 'warning',
              duration: 5000
            })
            outboundForm.items = []
            return
          }
        }

        // 获取库存信息 - 直接从后端获取所有物料的库存
        console.log('获取库存信息...')
        
        // 创建物料ID列表
        const materialIds = details.map(detail => detail.materialId || detail.material_id)
        console.log('需要查询库存的物料ID列表:', materialIds)
        
        // 为所有物料查询库存
        const stockPromises = materialIds.map(id => {
          if (!id) return Promise.resolve({ data: { material_id: id, quantity: 0, stock_quantity: 0 } })
          return inventoryApi.getMaterialStock(id, outboundForm.location_id)
        })
        
        // 等待所有库存查询完成
        const stockResults = await Promise.all(stockPromises)
        console.log('所有物料库存查询结果:', stockResults)
        
        // 构建物料ID到库存数量的映射
        const stockMap = new Map()
        stockResults.forEach((result, index) => {
          if (!result?.data) return
          
          const materialId = result.data.material_id || materialIds[index]
          const quantity = (result.data.quantity !== undefined && result.data.quantity !== null)
            ? parseFloat(result.data.quantity)
            : (result.data.stock_quantity !== undefined && result.data.stock_quantity !== null)
              ? parseFloat(result.data.stock_quantity)
              : 0
          
          console.log(`物料ID ${materialId} 库存数量: ${quantity}`)
          stockMap.set(materialId, quantity)
        })

        // 更新出库单明细
        outboundForm.items = details.map(detail => {
          // 标准化物料ID字段，可能是materialId或material_id
          const materialId = detail.materialId || detail.material_id
          
          // 标准化物料编码字段
          const materialCode = detail.materialCode || detail.material_code || detail.code
          
          // 标准化物料名称字段
          const materialName = detail.materialName || detail.material_name || detail.name
          
          // 标准化单位字段
          const unitId = detail.unitId || detail.unit_id
          const unitName = detail.unitName || detail.unit_name || detail.unit
          
          // 标准化数量字段，尝试从不同的字段获取BOM用量
          let bomQuantity = 0
          if (typeof detail.quantity !== 'undefined') {
            bomQuantity = detail.quantity
          } else if (typeof detail.bom_quantity !== 'undefined') {
            bomQuantity = detail.bom_quantity
          } else if (typeof detail.bomQuantity !== 'undefined') {
            bomQuantity = detail.bomQuantity
          } else if (typeof detail.unitQuantity !== 'undefined') {
            bomQuantity = detail.unitQuantity
          }
          
          // 计算实际需要的数量：生产计划数量 * BOM中的单位用量
          const requiredQuantity = selectedPlan.quantity * bomQuantity
          
          // 获取该物料的库存数量
          const stockQuantity = stockMap.has(materialId) ? stockMap.get(materialId) : 0
          
          console.log(`物料[${materialName}] ID=${materialId}, 库存数量=${stockQuantity}, 需要数量=${requiredQuantity}`)
          
          // 将原始物料数据合并，确保规格等信息正确保留
          const materialData = {
            material_id: materialId,
            material_code: materialCode,
            material_name: materialName,
            // 优先使用原始数据中的规格字段，如果没有则使用specs字段
            specification: detail.specification || detail.specs || '',
            unit_id: unitId,
            unit_name: unitName,
            stock_quantity: stockQuantity,
            // 使用计算后的数量作为出库数量
            quantity: requiredQuantity,
            // 确保保存正确的BOM用量，尝试获取各种可能的字段名称
            bom_quantity: detail.quantity || detail.bomQuantity || detail.bom_quantity || 0,
            is_from_plan: true
          }
          
          return materialData
        })
        
        // 检查是否所有物料都有足够库存
        const insufficientItems = outboundForm.items.filter(item => item.quantity > item.stock_quantity)
        if (insufficientItems.length > 0) {
          // 创建警告消息
          const warningMessages = insufficientItems.map(item => 
            `${item.material_code} - ${item.material_name}: 需要 ${item.quantity}，但库存只有 ${item.stock_quantity}`
          )
          
          ElMessage({
            message: `以下物料库存不足:\n${warningMessages.join('\n')}`,
            type: 'warning',
            duration: 8000,
            showClose: true
          })
        }
        
        console.log('格式化后的出库单物料明细:', outboundForm.items)
      } catch (error) {
        console.error('获取生产计划相关信息失败:', error)
        ElMessage.error(error.message || '获取生产计划相关信息失败')
        outboundForm.items = []
      }
    }

    return {
      outboundList,
      loading,
      currentPage,
      pageSize,
      total,
      searchKeyword,
      locationFilter,
      statusFilter,
      dialogVisible,
      dialogType,
      outboundFormRef,
      outboundForm,
      outboundRules,
      submitting,
      warehouseOptions,
      productionPlanOptions,
      selectedPlan,
      materialDialogVisible,
      materialSearchKeyword,
      materialList,
      loadingMaterials,
      printDialogVisible,
      printContent,
      printData,
      handleSearch,
      handleSizeChange,
      handleCurrentChange,
      handleAdd,
      handleView,
      handleEdit,
      handleDelete,
      handleUpdateStatus,
      handleAddItem,
      handleRemoveItem,
      handleSubmit,
      handlePrint,
      printOutbound,
      searchMaterials,
      handleSelectMaterial,
      formatDate,
      formatDateTime,
      getStatusType,
      getStatusText,
      tableHeight,
      handleProductionPlanChange,
      outboundStats,
      updateStats
    }
  }
}
</script>

<style scoped>
.inventory-outbound-container {
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
  gap: 10px;
}

.statistics-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  text-align: center;
  padding: 15px;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  margin-top: 5px;
}

.data-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.table-operations {
  margin-bottom: 10px;
  display: flex;
  justify-content: flex-start;
}

.material-search {
  margin-bottom: 15px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

.print-preview {
  padding: 20px;
}

.print-content {
  max-height: 400px;
  overflow-y: auto;
}

.print-header {
  margin-bottom: 20px;
  text-align: center;
}

.print-info {
  display: flex;
  justify-content: space-between;
}

.print-warehouse {
  margin-bottom: 20px;
  text-align: center;
}

.print-table {
  width: 100%;
  border-collapse: collapse;
}

.print-table th,
.print-table td {
  padding: 8px;
  text-align: left;
}

.print-footer {
  margin-top: 20px;
  text-align: right;
}

.print-signatures {
  display: flex;
  justify-content: space-between;
}
</style>