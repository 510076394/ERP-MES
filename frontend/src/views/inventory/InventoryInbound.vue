<template>
  <div class="inventory-inbound-container">
    <div class="page-header">
      <h2>入库管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon> 新建入库单
      </el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="入库单号">
          <el-input v-model="searchForm.inboundNo" placeholder="入库单号" clearable />
        </el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="searchForm.locationId" placeholder="仓库" clearable>
            <el-option
              v-for="item in locations"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
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
    </el-card>
    
    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ inboundStats.total || 0 }}</div>
        <div class="stat-label">入库单总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ inboundStats.draftCount || 0 }}</div>
        <div class="stat-label">草稿状态</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ inboundStats.confirmedCount || 0 }}</div>
        <div class="stat-label">已确认</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ inboundStats.completedCount || 0 }}</div>
        <div class="stat-label">已完成</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ inboundStats.cancelledCount || 0 }}</div>
        <div class="stat-label">已取消</div>
      </el-card>
    </div>
    
    <!-- 数据表格 -->
    <el-card class="data-card">
      <el-table
        :data="tableData"
        style="width: 100%"
        v-loading="loading"
        border
      >
        <el-table-column prop="inbound_no" label="入库单号" width="150" />
        <el-table-column prop="inbound_date" label="入库日期" width="120" />
        <el-table-column prop="location_name" label="仓库" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column prop="remark" label="备注" min-width="150" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row.id)">查看</el-button>
            <el-button 
              v-if="row.status === 'draft'"
              type="success" 
              link 
              @click="handleUpdateStatus(row.id, 'confirmed')"
            >
              确认
            </el-button>
            <el-button 
              v-if="row.status === 'confirmed'"
              type="success" 
              link 
              @click="handleUpdateStatus(row.id, 'completed')"
            >
              完成
            </el-button>
            <el-button 
              v-if="row.status === 'draft'"
              type="danger" 
              link 
              @click="handleUpdateStatus(row.id, 'cancelled')"
            >
              取消
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
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新建/编辑入库单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'create' ? '新建入库单' : '编辑入库单'"
      width="70%"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入库日期" prop="inbound_date">
              <el-date-picker
                v-model="form.inbound_date"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="仓库" prop="location_id">
              <el-select
                v-model="form.location_id"
                placeholder="请选择仓库"
                style="width: 100%"
                @change="handleLocationChange"
              >
                <el-option
                  v-for="item in locations"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="操作人" prop="operator">
          <el-input v-model="form.operator" placeholder="请输入操作人" />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
          />
        </el-form-item>

        <el-divider>入库明细</el-divider>

        <div class="table-toolbar">
          <el-button type="primary" @click="handleAddItem">
            <el-icon><Plus /></el-icon>添加物料
          </el-button>
        </div>

        <el-table :data="form.items" border style="width: 100%">
          <el-table-column label="物料" min-width="200">
            <template #default="{ row, $index }">
              <el-select
                v-model="row.material_id"
                placeholder="请选择物料"
                style="width: 100%"
                @change="(value) => handleMaterialChange(value, row)"
                filterable
                remote
                :remote-method="(query) => remoteSearchMaterial(query, row)"
                :loading="materialSelectLoading"
              >
                <el-option
                  v-for="item in materialOptions"
                  :key="item.id"
                  :label="`${item.code} - ${item.name}`"
                  :value="item.id"
                />
              </el-select>
              <div v-if="row.material_name" class="material-info">
                <small>{{ row.material_code }} - {{ row.material_name }}</small>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="数量" width="150">
            <template #default="{ row }">
              <el-input-number
                v-model="row.quantity"
                :min="0.01"
                :precision="2"
                :step="0.01"
                style="width: 100%"
              />
            </template>
          </el-table-column>
          <el-table-column label="单位" width="120">
            <template #default="{ row }">
              <el-select
                v-model="row.unit_id"
                placeholder="请选择单位"
                style="width: 100%"
                @change="(value) => handleUnitChange(value, row)"
              >
                <el-option
                  v-for="item in units"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="批次号" width="150">
            <template #default="{ row }">
              <el-input v-model="row.batch_number" placeholder="请输入批次号" />
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="150">
            <template #default="{ row }">
              <el-input v-model="row.remark" placeholder="请输入备注" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ $index }">
              <el-button type="danger" link @click="handleRemoveItem($index)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 查看入库单对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="入库单详情"
      width="70%"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="入库单号">{{ currentInbound.inbound_no }}</el-descriptions-item>
        <el-descriptions-item label="入库日期">{{ currentInbound.inbound_date }}</el-descriptions-item>
        <el-descriptions-item label="仓库">{{ currentInbound.location_name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentInbound.status)">
            {{ getStatusText(currentInbound.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作人">{{ currentInbound.operator }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ currentInbound.remark }}</el-descriptions-item>
      </el-descriptions>

      <el-divider>入库明细</el-divider>

      <el-table :data="currentInbound.items" border style="width: 100%">
        <el-table-column prop="material_code" label="物料编码" width="120" />
        <el-table-column prop="material_name" label="物料名称" min-width="150" />
        <el-table-column prop="quantity" label="数量" width="100" />
        <el-table-column prop="unit_name" label="单位" width="80" />
        <el-table-column prop="batch_number" label="批次号" width="120" />
        <el-table-column prop="remark" label="备注" min-width="150" />
      </el-table>
    </el-dialog>

    <!-- 物料选择对话框 -->
    <el-dialog
      v-model="materialDialogVisible"
      title="选择物料"
      width="70%"
    >
      <el-form :inline="true" :model="materialSearchForm" class="demo-form-inline">
        <el-form-item label="物料编码">
          <el-input v-model="materialSearchForm.code" placeholder="物料编码" clearable />
        </el-form-item>
        <el-form-item label="物料名称">
          <el-input v-model="materialSearchForm.name" placeholder="物料名称" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleMaterialSearch">搜索</el-button>
        </el-form-item>
      </el-form>

      <el-table
        :data="materialTableData"
        style="width: 100%"
        v-loading="materialLoading"
        @selection-change="handleMaterialSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="code" label="物料编码" width="120" />
        <el-table-column prop="name" label="物料名称" width="180" />
        <el-table-column prop="specs" label="规格" width="150" />
        <el-table-column prop="unit_name" label="单位" width="80" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleAddSingleMaterial(row)">
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="materialCurrentPage"
          v-model:page-size="materialPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="materialTotal"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleMaterialSizeChange"
          @current-change="handleMaterialCurrentChange"
        />
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="materialDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleMaterialConfirm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Search, Refresh } from '@element-plus/icons-vue'
import { inventoryApi, baseDataApi } from '@/services/api'

// 搜索表单
const searchForm = reactive({
  inboundNo: '',
  locationId: '',
  dateRange: []
})

// 表格数据
const tableData = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 对话框相关
const dialogVisible = ref(false)
const dialogType = ref('create')
const viewDialogVisible = ref(false)
const formRef = ref(null)
const form = reactive({
  inbound_date: '',
  location_id: '',
  operator: '',
  remark: '',
  status: 'draft',
  items: []
})

// 当前查看的入库单
const currentInbound = reactive({
  inbound_no: '',
  inbound_date: '',
  location_name: '',
  status: '',
  operator: '',
  remark: '',
  items: []
})

// 基础数据
const locations = ref([])
const materials = ref([])
const units = ref([])

// 物料选择对话框相关
const materialDialogVisible = ref(false)
const materialSearchForm = reactive({
  code: '',
  name: ''
})
const materialTableData = ref([])
const materialLoading = ref(false)
const materialCurrentPage = ref(1)
const materialPageSize = ref(10)
const materialTotal = ref(0)
const selectedMaterials = ref([])

// 物料选择相关
const materialOptions = ref([])
const materialSelectLoading = ref(false)

// 表单验证规则
const rules = {
  inbound_date: [
    { required: true, message: '请选择入库日期', trigger: 'change' }
  ],
  location_id: [
    { required: true, message: '请选择仓库', trigger: 'change' }
  ],
  operator: [
    { required: true, message: '请输入操作人', trigger: 'blur' }
  ]
}

// 入库单统计数据
const inboundStats = reactive({
  total: 0,
  draftCount: 0,
  confirmedCount: 0,
  completedCount: 0,
  cancelledCount: 0
});

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    'draft': '',
    'confirmed': 'warning',
    'completed': 'success',
    'cancelled': 'info'
  };
  return statusMap[status] || '';
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'draft': '草稿',
    'confirmed': '已确认',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return statusMap[status] || status;
};

// 加载仓库列表
const loadLocations = async () => {
  try {
    const response = await baseDataApi.getLocations();
    console.log('仓库API响应数据:', response); // 添加详细的日志
    
    // 处理不同的数据格式
    if (response.data && Array.isArray(response.data)) {
      locations.value = response.data;
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      locations.value = response.data.data;
    } else if (response.data && response.data.list && Array.isArray(response.data.list)) {
      locations.value = response.data.list; 
    } else if (response.data && response.data.items && Array.isArray(response.data.items)) {
      locations.value = response.data.items;
    } else {
      console.error('意外的仓库数据格式:', response.data);
      locations.value = [];
    }
    
    console.log('处理后的仓库数据:', locations.value.length, '条记录'); // 添加日志
    
    if (locations.value.length === 0) {
      ElMessage.warning('未找到可用的仓库，请先在基础数据中添加仓库');
    }
  } catch (error) {
    console.error('加载仓库数据失败:', error);
    ElMessage.error('加载仓库数据失败: ' + (error.message || '未知错误'));
    locations.value = [];
  }
};

// 加载物料列表
const loadMaterials = async () => {
  try {
    materialLoading.value = true
    const params = {
      page: materialCurrentPage.value,
      pageSize: materialPageSize.value,
      name: materialSearchForm.name,
      code: materialSearchForm.code
    }
    const response = await baseDataApi.getMaterials(params)
    
    // 确保获取到的字段正确
    if (response.data && response.data.data) {
      materialTableData.value = response.data.data
      materialTotal.value = response.data.pagination?.total || materialTableData.value.length
    } else if (response.data && response.data.list) {
      // 支持 {list, total} 格式
      materialTableData.value = response.data.list
      materialTotal.value = response.data.total || materialTableData.value.length
      console.log('从list属性中提取物料数据', materialTableData.value)
    } else if (response.data && Array.isArray(response.data)) {
      materialTableData.value = response.data
      materialTotal.value = response.data.length
    } else {
      materialTableData.value = []
      materialTotal.value = 0
      console.error('获取到的物料数据格式不正确:', response.data)
    }
    
    // 同时更新物料选项
    materialOptions.value = [...materialTableData.value]
    
    console.log('加载的物料数据:', materialTableData.value)
  } catch (error) {
    console.error('加载物料数据失败:', error)
    ElMessage.error('加载物料数据失败')
  } finally {
    materialLoading.value = false
  }
}

// 加载单位数据
const loadUnits = async () => {
  try {
    const response = await baseDataApi.getUnits();
    console.log('单位数据响应:', response);
    
    // 修复单位数据解析逻辑
    if (response.data && response.data.data) {
      units.value = response.data.data;
    } else if (response.data && response.data.list) {
      // 添加对 {list, total} 格式的支持
      units.value = response.data.list;
      console.log('从list属性中提取单位数据', units.value);
    } else if (Array.isArray(response.data)) {
      units.value = response.data;
    } else {
      units.value = [];
      console.error('获取到的单位数据格式不正确:', response.data);
    }
    
    console.log('加载的单位数据:', units.value);
    return units.value;
  } catch (error) {
    console.error('加载单位数据失败:', error);
    ElMessage.error('加载单位数据失败');
    return [];
  }
};

// 搜索
const handleSearch = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      inboundNo: searchForm.inboundNo,
      startDate: searchForm.dateRange?.[0],
      endDate: searchForm.dateRange?.[1],
      locationId: searchForm.locationId
    }
    const res = await inventoryApi.getInboundList(params)
    
    // 兼容不同的响应格式
    if (res.data && res.data.data) {
      tableData.value = res.data.data
      total.value = res.data.total
    } else if (res.data && res.data.list) {
      tableData.value = res.data.list
      total.value = res.data.total
      console.log('从list属性中提取入库单数据', tableData.value)
    } else if (res.data && res.data.items) {
      tableData.value = res.data.items
      total.value = res.data.total
    } else if (Array.isArray(res.data)) {
      tableData.value = res.data
      total.value = res.data.length
    } else {
      tableData.value = []
      total.value = 0
      console.error('获取入库单列表返回的格式不正确:', res.data)
    }
    
    console.log('入库单列表数据:', tableData.value)
    updateStats()
  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败')
  } finally {
    loading.value = false
  }
}

// 新建入库单
const handleCreate = () => {
  dialogType.value = 'create'
  form.inbound_date = new Date().toISOString().split('T')[0]
  form.location_id = ''
  form.operator = ''
  form.remark = ''
  form.status = 'draft'
  form.items = []
  dialogVisible.value = true
}

// 查看入库单
const handleView = async (id) => {
  try {
    const res = await inventoryApi.getInboundDetail(id)
    Object.assign(currentInbound, res.data)
    viewDialogVisible.value = true
  } catch (error) {
    console.error('获取入库单详情失败:', error)
    ElMessage.error('获取入库单详情失败')
  }
}

// 更新入库单状态
const handleUpdateStatus = async (id, newStatus) => {
  try {
    console.log('准备更新入库单状态:', { id, newStatus });
    
    // 添加确认对话框
    await ElMessageBox.confirm(
      `确定要将入库单状态更改为"${getStatusText(newStatus)}"吗？`, 
      '确认操作', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 确保使用正确的参数格式
    const response = await inventoryApi.updateInboundStatus(id, { newStatus });
    console.log('状态更新成功，后端响应:', response);
    
    ElMessage.success('状态更新成功');
    handleSearch();
  } catch (error) {
    console.error('更新状态失败:', error);
    
    // 提取错误详情
    const errorDetails = {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    };
    console.error('错误详情:', errorDetails);
    
    // 显示更友好的错误消息
    let errorMessage = '更新状态失败';
    if (error.response?.data?.message) {
      errorMessage += `: ${error.response.data.message}`;
    }
    if (error.response?.data?.error) {
      errorMessage += `\n${error.response.data.error}`;
    }
    
    ElMessage.error(errorMessage);
  }
}

// 添加物料项
const handleAddItem = () => {
  materialDialogVisible.value = true
  loadMaterials()
}

// 删除物料项
const handleRemoveItem = (index) => {
  form.items.splice(index, 1)
}

// 处理物料选择变化
const handleMaterialChange = async (value, item) => {
  if (value) {
    try {
      // 获取物料详情
      const materialResponse = await baseDataApi.getMaterial(value);
      const material = materialResponse.data;
      
      console.log('选择的物料详情:', material);
      
      // 更新物料信息
      item.material_name = material.name;
      item.material_code = material.code;
      item.specification = material.specs;
      
      // 加载单位数据
      await loadUnits();
      
      // 设置默认单位
      if (material.unit_id) {
        const defaultUnit = units.value.find(u => u.id === material.unit_id);
        if (defaultUnit) {
          item.unit_id = defaultUnit.id;
          item.unit_name = defaultUnit.name;
        }
      }
    } catch (error) {
      console.error('获取物料信息失败:', error);
      ElMessage.error('获取物料信息失败');
    }
  } else {
    // 清空物料相关信息
    item.material_name = '';
    item.material_code = '';
    item.specification = '';
    item.unit_id = undefined;
    item.unit_name = '';
  }
};

// 仓库选择变化
const handleLocationChange = () => {
  form.items = []
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    if (form.items.length === 0) {
      ElMessage.warning('请至少添加一个物料项')
      return
    }
    
    // 确保所有物料项有unit_id和unit_name
    for (const item of form.items) {
      if (!item.unit_id) {
        ElMessage.warning('存在物料没有指定单位，请检查')
        return
      }
      
      // 确保有unit_name
      if (!item.unit_name && item.unit_id) {
        const unit = units.value.find(u => u.id === item.unit_id)
        if (unit) {
          item.unit_name = unit.name
        }
      }
    }
    
    console.log('提交入库单数据:', form)
    
    const res = await inventoryApi.createInbound({
      ...form,
      status: 'draft'
    })
    ElMessage.success('创建成功')
    dialogVisible.value = false
    handleSearch()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(error.response?.data?.message || '提交失败')
  }
}

// 分页大小变化
const handleSizeChange = (val) => {
  pageSize.value = val
  handleSearch()
}

// 页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val
  handleSearch()
}

// 物料搜索
const handleMaterialSearch = () => {
  materialCurrentPage.value = 1
  loadMaterials()
}

// 物料选择变化
const handleMaterialSelectionChange = (selection) => {
  selectedMaterials.value = selection
}

// 确认选择物料
const handleMaterialConfirm = async () => {
  if (selectedMaterials.value.length === 0) {
    ElMessage.warning('请选择至少一个物料')
    return
  }
  
  // 确保已加载单位数据
  if (units.value.length === 0) {
    await loadUnits();
    console.log('加载单位数据后的units:', units.value);
  }
  
  console.log('准备添加物料到表单，已选择的物料:', selectedMaterials.value);
  console.log('当前单位数据:', units.value);
  
  // 添加选中的物料到表单
  for (const material of selectedMaterials.value) {
    // 获取物料详细信息
    try {
      const materialDetail = await baseDataApi.getMaterial(material.id);
      const detailedMaterial = materialDetail.data;
      
      // 确保每个物料都有unit_id
      const unitId = detailedMaterial.unit_id || (units.value.length > 0 ? units.value[0].id : null);
      let unitName = '';
      
      // 查找单位名称
      if (unitId) {
        const unit = units.value.find(u => u.id === unitId);
        if (unit) {
          unitName = unit.name;
        }
      }
      
      form.items.push({
        material_id: detailedMaterial.id,
        material_code: detailedMaterial.code,
        material_name: detailedMaterial.name,
        specification: detailedMaterial.specs,
        quantity: 0,
        unit_id: unitId,
        unit_name: unitName,
        batch_number: '',
        remark: ''
      });
    } catch (error) {
      console.error(`获取物料${material.id}详情失败:`, error);
      
      // 使用列表中的简略信息
      const unitId = material.unit_id || (units.value.length > 0 ? units.value[0].id : null);
      let unitName = material.unit_name || '';
      
      // 查找单位名称
      if (unitId && !unitName) {
        const unit = units.value.find(u => u.id === unitId);
        if (unit) {
          unitName = unit.name;
        }
      }
      
      form.items.push({
        material_id: material.id,
        material_code: material.code,
        material_name: material.name,
        specification: material.specs,
        quantity: 0,
        unit_id: unitId,
        unit_name: unitName,
        batch_number: '',
        remark: ''
      });
    }
  }
  
  console.log('添加的物料项:', form.items);
  
  materialDialogVisible.value = false;
  selectedMaterials.value = [];
}

// 分页大小变化
const handleMaterialSizeChange = (val) => {
  materialPageSize.value = val
  loadMaterials()
}

// 页码变化
const handleMaterialCurrentChange = (val) => {
  materialCurrentPage.value = val
  loadMaterials()
}

// 处理单位选择变化
const handleUnitChange = (unitId, item) => {
  console.log('单位选择变更:', { unitId, currentUnits: units.value });
  
  if (!unitId) {
    item.unit_name = '';
    return;
  }
  
  // 确保units.value是有效的数组
  if (!Array.isArray(units.value) || units.value.length === 0) {
    console.warn('单位数据无效，无法设置单位名称');
    // 尝试重新加载单位数据
    loadUnits().then(loadedUnits => {
      if (loadedUnits.length > 0) {
        const selectedUnit = loadedUnits.find(u => u.id === unitId);
        if (selectedUnit) {
          item.unit_name = selectedUnit.name;
          console.log(`延迟设置物料单位: ${selectedUnit.name} (ID: ${unitId})`);
        }
      }
    });
    return;
  }
  
  const selectedUnit = units.value.find(u => u.id === unitId);
  if (selectedUnit) {
    item.unit_name = selectedUnit.name;
    console.log(`为物料设置单位: ${selectedUnit.name} (ID: ${unitId})`);
  } else {
    console.warn(`找不到ID为${unitId}的单位`);
    item.unit_name = `单位(ID:${unitId})`;
  }
};

// 直接添加单个物料
const handleAddSingleMaterial = async (material) => {
  try {
    // 获取物料详情
    const materialDetail = await baseDataApi.getMaterial(material.id);
    const detailedMaterial = materialDetail.data;
    
    // 确保已加载单位数据
    if (units.value.length === 0) {
      await loadUnits();
    }
    
    // 设置单位
    const unitId = detailedMaterial.unit_id || (units.value.length > 0 ? units.value[0].id : null);
    let unitName = '';
    
    if (unitId) {
      const unit = units.value.find(u => u.id === unitId);
      if (unit) {
        unitName = unit.name;
      }
    }
    
    // 添加到物料列表
    form.items.push({
      material_id: detailedMaterial.id,
      material_code: detailedMaterial.code,
      material_name: detailedMaterial.name,
      specification: detailedMaterial.specs,
      quantity: 0,
      unit_id: unitId,
      unit_name: unitName,
      batch_number: '',
      remark: ''
    });
    
    materialDialogVisible.value = false;
    ElMessage.success(`已添加物料: ${detailedMaterial.code} - ${detailedMaterial.name}`);
  } catch (error) {
    console.error('添加单个物料失败:', error);
    ElMessage.error('添加物料失败');
  }
}

// 远程搜索物料
const remoteSearchMaterial = async (query, row) => {
  if (query.length < 1) return
  
  materialSelectLoading.value = true
  try {
    const params = {
      page: 1,
      pageSize: 20,
      search: query
    }
    const response = await baseDataApi.getMaterials(params)
    
    if (response.data && response.data.data) {
      materialOptions.value = response.data.data
    } else if (response.data && response.data.list) {
      materialOptions.value = response.data.list
    } else if (response.data && Array.isArray(response.data)) {
      materialOptions.value = response.data
    } else {
      materialOptions.value = []
      console.error('远程搜索物料返回的数据格式不正确:', response.data)
    }
  } catch (error) {
    console.error('搜索物料失败:', error)
    materialOptions.value = []
  } finally {
    materialSelectLoading.value = false
  }
}

// 重置搜索
const resetSearch = () => {
  searchForm.inboundNo = '';
  searchForm.locationId = '';
  searchForm.dateRange = null;
  handleSearch();
};

// 更新统计数据
const updateStats = () => {
  // 实际应用中，可能需要调用API获取统计数据
  // 这里简单计算一下
  inboundStats.total = tableData.value.length;
  inboundStats.draftCount = tableData.value.filter(item => item.status === 'draft').length;
  inboundStats.confirmedCount = tableData.value.filter(item => item.status === 'confirmed').length;
  inboundStats.completedCount = tableData.value.filter(item => item.status === 'completed').length;
  inboundStats.cancelledCount = tableData.value.filter(item => item.status === 'cancelled').length;
};

onMounted(() => {
  loadLocations()
  loadMaterials()
  loadUnits()
  handleSearch()
  
  // 初始化物料选项
  initMaterialOptions()
})

// 初始化物料选项
const initMaterialOptions = async () => {
  try {
    const params = {
      page: 1,
      pageSize: 20
    }
    const response = await baseDataApi.getMaterials(params)
    
    if (response.data && response.data.data) {
      materialOptions.value = response.data.data
    } else if (response.data && response.data.list) {
      materialOptions.value = response.data.list
    } else if (response.data && Array.isArray(response.data)) {
      materialOptions.value = response.data
    } else {
      materialOptions.value = []
      console.error('初始化物料选项返回的数据格式不正确:', response.data)
    }
    
    console.log('初始物料选项:', materialOptions.value)
  } catch (error) {
    console.error('初始化物料选项失败:', error)
  }
}
</script>

<style scoped>
.inventory-inbound-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #303133;
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
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 150px;
  margin-right: 15px;
  text-align: center;
  margin-bottom: 15px;
}

.stat-card:last-child {
  margin-right: 0;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 5px;
  color: #409EFF;
}

.stat-label {
  font-size: 0.9rem;
  color: #606266;
}

.data-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.table-toolbar {
  margin-bottom: 10px;
}

.material-info {
  margin-top: 4px;
  color: #606266;
  font-size: 12px;
}
</style>