<template>
  <div class="inventory-transfer-container">
    <div class="page-header">
      <h2>库存调拨管理</h2>
      <el-button type="primary" @click="openTransferDialog()">
        <el-icon><Plus /></el-icon> 新建调拨单
      </el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="调拨单号">
          <el-input v-model="searchForm.transfer_no" placeholder="请输入调拨单号" clearable></el-input>
        </el-form-item>
        <el-form-item label="调拨状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="searchForm.date_range"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          ></el-date-picker>
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
      
      <!-- 批量操作按钮 -->
      <div class="batch-actions">
        <el-dropdown @command="handleBatchCommand">
          <el-button type="primary">
            批量操作<el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="export">
                <el-icon><Download /></el-icon> 导出调拨单
              </el-dropdown-item>
              <el-dropdown-item command="print">
                <el-icon><Printer /></el-icon> 批量打印
              </el-dropdown-item>
              <el-dropdown-item command="delete" divided>
                <el-icon><Delete /></el-icon> 批量删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-card>
    
    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ transferStats.total || 0 }}</div>
        <div class="stat-label">调拨单总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ transferStats.draft || 0 }}</div>
        <div class="stat-label">草稿调拨单</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ transferStats.pendingCount || 0 }}</div>
        <div class="stat-label">待审批调拨单</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ transferStats.approvedCount || 0 }}</div>
        <div class="stat-label">已批准调拨单</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ transferStats.completedCount || 0 }}</div>
        <div class="stat-label">已完成调拨单</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ transferStats.cancelledCount || 0 }}</div>
        <div class="stat-label">已取消调拨单</div>
      </el-card>
    </div>
    
    <!-- 数据表格 -->
    <el-card class="data-card">
      <el-table
        v-loading="loading"
        :data="transferList"
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55"></el-table-column>
        <el-table-column prop="transfer_no" label="调拨单号" min-width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="transfer_date" label="调拨日期" min-width="110"></el-table-column>
        <el-table-column prop="from_location" label="源库位" min-width="150" show-overflow-tooltip></el-table-column>
        <el-table-column prop="to_location" label="目标库位" min-width="150" show-overflow-tooltip></el-table-column>
        <el-table-column prop="item_count" label="物料种类" min-width="100" align="center"></el-table-column>
        <el-table-column prop="status" label="状态" min-width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="创建人" min-width="100"></el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <div class="operation-btns">
              <el-dropdown 
                v-if="scope.row.status !== 'cancelled' && scope.row.status !== 'completed'" 
                trigger="click" 
                placement="bottom-end"
                class="operation-dropdown"
              >
                <el-button size="small" type="primary">
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="scope.row.status === 'draft'" @click="updateStatus(scope.row.id, 'pending')">
                      <el-icon><Check /></el-icon>提交调拨单
                    </el-dropdown-item>
                    <el-dropdown-item v-if="scope.row.status === 'pending'" @click="updateStatus(scope.row.id, 'approved')">
                      <el-icon><Select /></el-icon>批准调拨单
                    </el-dropdown-item>
                    <el-dropdown-item v-if="scope.row.status === 'approved'" @click="updateStatus(scope.row.id, 'completed')">
                      <el-icon><Finished /></el-icon>完成调拨
                    </el-dropdown-item>
                    <el-dropdown-item v-if="['draft', 'pending', 'approved'].includes(scope.row.status)" @click="updateStatus(scope.row.id, 'cancelled')">
                      <el-icon><Close /></el-icon>取消调拨
                    </el-dropdown-item>
                    <el-dropdown-item v-if="scope.row.status === 'draft'" @click="deleteTransfer(scope.row.id)" divided>
                      <el-icon><Delete /></el-icon>删除调拨单
                    </el-dropdown-item>
                    <el-dropdown-item v-if="scope.row.status === 'draft'" @click="duplicateTransfer(scope.row.id)">
                      <el-icon><CopyDocument /></el-icon>复制调拨单
                    </el-dropdown-item>
                    <el-dropdown-item @click="printTransfer(scope.row.id)">
                      <el-icon><Printer /></el-icon>打印调拨单
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              
              <el-button size="small" @click="viewTransfer(scope.row.id)">
                查看
              </el-button>
              
              <el-button 
                size="small" 
                type="primary" 
                @click="editTransfer(scope.row.id)"
                v-if="scope.row.status === 'draft'"
              >
                编辑
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="pagination.current"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pagination.size"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
        >
        </el-pagination>
      </div>
    </el-card>

    <!-- 新建/编辑调拨单对话框 -->
    <el-dialog 
      :title="dialogType === 'create' ? '新建调拨单' : '编辑调拨单'" 
      v-model="transferDialogVisible" 
      width="80%"
      destroy-on-close
    >
      <el-form :model="transferForm" :rules="transferRules" ref="transferFormRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="调拨日期" prop="transfer_date">
              <el-date-picker 
                v-model="transferForm.transfer_date" 
                type="date" 
                placeholder="选择调拨日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              ></el-date-picker>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="源库位" prop="from_location_id">
              <el-select 
                v-model="transferForm.from_location_id" 
                placeholder="选择源库位"
                style="width: 100%"
                filterable
                @change="handleFromLocationChange"
              >
                <el-option 
                  v-for="item in locationOptions" 
                  :key="item.id" 
                  :label="item.name" 
                  :value="item.id"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="目标库位" prop="to_location_id">
              <el-select 
                v-model="transferForm.to_location_id" 
                placeholder="选择目标库位"
                style="width: 100%"
                filterable
              >
                <el-option 
                  v-for="item in locationOptions.filter(loc => loc.id !== transferForm.from_location_id)" 
                  :key="item.id" 
                  :label="item.name" 
                  :value="item.id"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-divider content-position="center">物料明细</el-divider>
        
        <!-- 添加物料按钮 -->
        <div class="material-search">
          <el-button type="primary" @click="addTransferItem">
            <el-icon><Plus /></el-icon> 添加物料
          </el-button>
        </div>
        
        <!-- 物料表格 -->
        <el-table 
          :data="transferForm.items" 
          border 
          style="width: 100%"
        >
          <el-table-column type="index" label="序号" width="50"></el-table-column>
          <el-table-column label="物料编码" min-width="120">
            <template #default="scope">
              <el-select 
                v-model="scope.row.material_id" 
                placeholder="选择物料"
                style="width: 100%"
                filterable
                @change="(val) => handleMaterialChange(val, scope.$index)"
              >
                <el-option 
                  v-for="item in materialOptions" 
                  :key="item.id" 
                  :label="`${item.code} - ${item.name}`" 
                  :value="item.id"
                ></el-option>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="物料名称" prop="material_name" min-width="140"></el-table-column>
          <el-table-column label="规格型号" prop="specs" min-width="120"></el-table-column>
          <el-table-column label="调拨数量" min-width="120">
            <template #default="scope">
              <el-input-number 
                v-model="scope.row.quantity" 
                :min="1" 
                :max="scope.row.available_stock || 999999" 
                style="width: 100%"
              ></el-input-number>
            </template>
          </el-table-column>
          <el-table-column label="单位" prop="unit_name" min-width="80"></el-table-column>
          <el-table-column label="库存数量" prop="available_stock" min-width="100"></el-table-column>
          <el-table-column label="备注" min-width="150">
            <template #default="scope">
              <el-input v-model="scope.row.remarks" placeholder="备注"></el-input>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="scope">
              <el-button 
                type="danger" 
                size="small" 
                circle
                @click="removeTransferItem(scope.$index)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <el-divider></el-divider>
        
        <el-form-item label="备注" prop="remarks">
          <el-input 
            v-model="transferForm.remarks" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入备注信息"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="transferDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitTransferForm" :loading="submitting">保存</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 查看调拨单详情对话框 -->
    <el-dialog 
      title="调拨单详情" 
      v-model="viewDialogVisible" 
      width="80%"
    >
      <div v-loading="detailLoading" id="print-section">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="调拨单号">{{ transferDetail.transfer_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="调拨日期">{{ transferDetail.transfer_date || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(transferDetail.status)">{{ getStatusText(transferDetail.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="源库位">{{ transferDetail.from_location || '-' }}</el-descriptions-item>
          <el-descriptions-item label="目标库位">{{ transferDetail.to_location || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ transferDetail.creator || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="3">{{ transferDetail.remarks || '无' }}</el-descriptions-item>
        </el-descriptions>
        
        <h3 style="margin-top: 20px;">物料明细</h3>
        <el-table :data="transferDetail.items || []" border style="width: 100%; margin-top: 10px;">
          <el-table-column type="index" label="序号" width="50"></el-table-column>
          <el-table-column prop="material_code" label="物料编码" min-width="120"></el-table-column>
          <el-table-column prop="material_name" label="物料名称" min-width="140"></el-table-column>
          <el-table-column prop="specs" label="规格型号" min-width="120"></el-table-column>
          <el-table-column prop="quantity" label="调拨数量" min-width="100"></el-table-column>
          <el-table-column prop="unit_name" label="单位" min-width="80"></el-table-column>
          <el-table-column prop="remarks" label="备注" min-width="150"></el-table-column>
        </el-table>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="viewDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, Refresh, ArrowDown, Delete, View, Edit, MoreFilled, Check, Select, Finished, Close, CopyDocument, Printer, Download } from '@element-plus/icons-vue';
import { inventoryApi } from '@/services/api';
import { getCurrentDate } from '@/utils/date';

// 状态选项
const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待处理' },
  { value: 'approved', label: '已批准' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
];

// 搜索表单
const searchForm = reactive({
  transfer_no: '',
  status: '',
  date_range: []
});

// 分页配置
const pagination = reactive({
  current: 1,
  size: 10,
  total: 0
});

// 其他状态变量
const loading = ref(false);
const transferList = ref([]);
const materialOptions = ref([]); // 物料选项
const locationOptions = ref([]); // 库位选项
const dialogType = ref('create'); // 对话框类型：create-新建，edit-编辑
const transferDialogVisible = ref(false); // 调拨单对话框可见性
const viewDialogVisible = ref(false); // 查看对话框可见性
const submitting = ref(false); // 提交中状态
const detailLoading = ref(false); // 详情加载状态

// 表单引用
const transferFormRef = ref(null);

// 调拨单表单
const transferForm = reactive({
  id: '',
  transfer_date: getCurrentDate(),
  from_location_id: '',
  to_location_id: '',
  remarks: '',
  items: []
});

// 调拨单详情
const transferDetail = ref({});

// 表单验证规则
const transferRules = {
  transfer_date: [{ required: true, message: '请选择调拨日期', trigger: 'change' }],
  from_location_id: [{ required: true, message: '请选择源库位', trigger: 'change' }],
  to_location_id: [{ required: true, message: '请选择目标库位', trigger: 'change' }]
};

// 调拨单统计数据
const transferStats = ref({
  total: 0,
  draft: 0,
  pendingCount: 0,
  approvedCount: 0,
  completedCount: 0,
  cancelledCount: 0
});

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'draft': '草稿',
    'pending': '待处理',
    'approved': '已批准',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return statusMap[status] || status;
};

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    'draft': '',
    'pending': 'warning',
    'approved': 'success',
    'completed': 'success',
    'cancelled': 'info'
  };
  return statusMap[status] || '';
};

// 查看调拨单
const viewTransfer = async (id) => {
  try {
    detailLoading.value = true;
    const response = await inventoryApi.getTransferDetail(id);
    transferDetail.value = response.data;
    viewDialogVisible.value = true;
  } catch (error) {
    console.error('获取调拨单详情失败:', error);
    ElMessage.error('获取调拨单详情失败');
  } finally {
    detailLoading.value = false;
  }
};

// 编辑调拨单
const editTransfer = async (id) => {
  try {
    loading.value = true;
    await fetchMaterials();
    await fetchLocations();
    
    const response = await inventoryApi.getTransferDetail(id);
    const transferData = response.data;
    
    // 重置表单
    resetTransferForm();
    
    // 填充表单数据
    transferForm.id = transferData.id;
    transferForm.transfer_date = transferData.transfer_date;
    transferForm.from_location_id = transferData.from_location_id;
    transferForm.to_location_id = transferData.to_location_id;
    transferForm.remarks = transferData.remarks || '';
    
    // 填充物料明细
    if (transferData.items && transferData.items.length > 0) {
      transferForm.items = transferData.items.map(item => ({
        id: item.id,
        material_id: item.material_id,
        material_name: item.material_name,
        material_code: item.material_code,
        specs: item.specs,
        quantity: item.quantity,
        unit_name: item.unit_name,
        available_stock: item.available_stock || 0,
        remarks: item.remarks || ''
      }));
    }
    
    dialogType.value = 'edit';
    transferDialogVisible.value = true;
  } catch (error) {
    console.error('获取调拨单详情失败:', error);
    ElMessage.error('获取调拨单详情失败');
  } finally {
    loading.value = false;
  }
};

// 更新调拨单状态
const updateStatus = async (id, status) => {
  try {
    await ElMessageBox.confirm(`确定要将调拨单状态更新为"${getStatusText(status)}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    loading.value = true;
    await inventoryApi.updateTransferStatus(id, status);
    ElMessage.success('状态更新成功');
    await loadTransferList();
    loadTransferStats();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新调拨单状态失败:', error);
      ElMessage.error('更新调拨单状态失败');
    }
  } finally {
    loading.value = false;
  }
};

// 删除调拨单
const deleteTransfer = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除该调拨单吗？此操作不可逆。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    loading.value = true;
    await inventoryApi.deleteTransfer(id);
    ElMessage.success('删除成功');
    await loadTransferList();
    loadTransferStats();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除调拨单失败:', error);
      ElMessage.error('删除调拨单失败');
    }
  } finally {
    loading.value = false;
  }
};

// 处理搜索
const handleSearch = async () => {
  pagination.current = 1;
  await loadTransferList();
  loadTransferStats(); // 重新计算统计数据
};

// 重置搜索
const resetSearch = async () => {
  searchForm.transfer_no = '';
  searchForm.status = '';
  searchForm.date_range = [];
  await handleSearch();
};

// 处理分页大小变化
const handleSizeChange = async (size) => {
  pagination.size = size;
  await loadTransferList();
  loadTransferStats(); // 重新计算统计数据
};

// 处理页码变化
const handleCurrentChange = async (current) => {
  pagination.current = current;
  await loadTransferList();
  loadTransferStats(); // 重新计算统计数据
};

// 打开新建调拨单对话框
const openTransferDialog = async () => {
  dialogType.value = 'create';
  resetTransferForm();
  
  // 加载物料和库位数据
  try {
    loading.value = true;
    await fetchMaterials();
    await fetchLocations();
    transferDialogVisible.value = true;
  } catch (error) {
    console.error('加载基础数据失败:', error);
    ElMessage.error('加载基础数据失败');
  } finally {
    loading.value = false;
  }
};

// 重置调拨单表单
const resetTransferForm = () => {
  if (transferFormRef.value) {
    transferFormRef.value.resetFields();
  }
  
  transferForm.id = '';
  transferForm.transfer_date = getCurrentDate();
  transferForm.from_location_id = '';
  transferForm.to_location_id = '';
  transferForm.remarks = '';
  transferForm.items = [];
};

// 添加调拨物料
const addTransferItem = () => {
  transferForm.items.push({
    material_id: '',
    material_name: '',
    material_code: '',
    specs: '',
    quantity: 1,
    unit_name: '',
    available_stock: 0,
    remarks: ''
  });
};

// 移除调拨物料
const removeTransferItem = (index) => {
  transferForm.items.splice(index, 1);
};

// 处理物料变更
const handleMaterialChange = async (materialId, index) => {
  if (!materialId) return;
  
  const material = materialOptions.value.find(m => m.id === materialId);
  if (material) {
    transferForm.items[index].material_name = material.name;
    transferForm.items[index].material_code = material.code;
    transferForm.items[index].specs = material.specs || '';
    transferForm.items[index].unit_name = material.unit_name || '';
    
    // 获取该物料在源库位的库存
    if (transferForm.from_location_id) {
      try {
        const response = await inventoryApi.getMaterialStock(materialId, transferForm.from_location_id);
        if (response.data && response.data.quantity) {
          transferForm.items[index].available_stock = response.data.quantity;
        } else {
          transferForm.items[index].available_stock = 0;
          ElMessage.warning(`所选库位没有该物料库存`);
        }
      } catch (error) {
        console.error('获取物料库存失败:', error);
        transferForm.items[index].available_stock = 0;
      }
    }
  }
};

// 处理源库位变更
const handleFromLocationChange = async () => {
  // 清空目标库位
  if (transferForm.to_location_id === transferForm.from_location_id) {
    transferForm.to_location_id = '';
  }
  
  // 更新已选物料的库存数量
  if (transferForm.items.length > 0 && transferForm.from_location_id) {
    for (let i = 0; i < transferForm.items.length; i++) {
      const item = transferForm.items[i];
      if (item.material_id) {
        try {
          const response = await inventoryApi.getMaterialStock(item.material_id, transferForm.from_location_id);
          if (response.data && response.data.quantity) {
            transferForm.items[i].available_stock = response.data.quantity;
          } else {
            transferForm.items[i].available_stock = 0;
          }
        } catch (error) {
          console.error('获取物料库存失败:', error);
          transferForm.items[i].available_stock = 0;
        }
      }
    }
  }
};

// 提交调拨单表单
const submitTransferForm = async () => {
  if (!transferFormRef.value) return;
  
  try {
    await transferFormRef.value.validate();
    
    // 检查物料列表
    if (transferForm.items.length === 0) {
      ElMessage.warning('请添加至少一种物料');
      return;
    }
    
    // 检查每个物料是否已选择
    for (let i = 0; i < transferForm.items.length; i++) {
      const item = transferForm.items[i];
      if (!item.material_id) {
        ElMessage.warning(`第${i+1}行物料未选择`);
        return;
      }
      
      // 检查调拨数量是否超过库存
      if (item.quantity > item.available_stock) {
        ElMessage.warning(`${item.material_name}的调拨数量超过可用库存`);
        return;
      }
    }
    
    // 检查源库位和目标库位是否相同
    if (transferForm.from_location_id === transferForm.to_location_id) {
      ElMessage.warning('源库位和目标库位不能相同');
      return;
    }
    
    submitting.value = true;
    
    // 准备提交数据
    const formData = {
      ...transferForm,
      status: 'draft',
      from_location: locationOptions.value.find(loc => loc.id === transferForm.from_location_id)?.name || '',
      to_location: locationOptions.value.find(loc => loc.id === transferForm.to_location_id)?.name || ''
    };
    
    // 提交表单
    let response;
    if (dialogType.value === 'create') {
      response = await inventoryApi.createTransfer(formData);
      ElMessage.success('调拨单创建成功');
    } else {
      response = await inventoryApi.updateTransfer(formData.id, formData);
      ElMessage.success('调拨单更新成功');
    }
    
    // 关闭对话框并刷新列表
    transferDialogVisible.value = false;
    resetTransferForm();
    await loadTransferList();
    loadTransferStats();
  } catch (error) {
    console.error('提交调拨单失败:', error);
    if (error.message) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error('提交调拨单失败');
    }
  } finally {
    submitting.value = false;
  }
};

// 获取物料列表
const fetchMaterials = async () => {
  try {
    const response = await inventoryApi.getAllMaterials();
    materialOptions.value = response.data.items || [];
  } catch (error) {
    console.error('获取物料列表失败:', error);
    materialOptions.value = [];
  }
};

// 获取库位列表
const fetchLocations = async () => {
  try {
    const response = await inventoryApi.getLocations();
    locationOptions.value = response.data.items || [];
  } catch (error) {
    console.error('获取库位列表失败:', error);
    locationOptions.value = [];
  }
};

// 加载调拨单统计数据
const loadTransferStats = async () => {
  try {
    // 从当前列表数据计算统计信息
    const total = transferList.value.length;
    const draftCount = transferList.value.filter(item => item.status === 'draft').length;
    const pendingCount = transferList.value.filter(item => item.status === 'pending').length;
    const approvedCount = transferList.value.filter(item => item.status === 'approved').length;
    const completedCount = transferList.value.filter(item => item.status === 'completed').length;
    const cancelledCount = transferList.value.filter(item => item.status === 'cancelled').length;
    
    // 更新统计数据
    transferStats.value = {
      total,
      draft: draftCount,
      pendingCount,
      approvedCount,
      completedCount,
      cancelledCount
    };
  } catch (error) {
    console.error('计算调拨单统计数据失败:', error);
    // 保持当前统计数据不变
  }
};

// 加载调拨单列表数据
const loadTransferList = async () => {
  loading.value = true;
  try {
    // 构建查询参数
    const params = {
      page: pagination.current,
      limit: pagination.size,
      transfer_no: searchForm.transfer_no,
      status: searchForm.status
    };
    
    // 添加日期范围参数
    if (searchForm.date_range && searchForm.date_range.length === 2) {
      params.start_date = searchForm.date_range[0];
      params.end_date = searchForm.date_range[1];
    }
    
    // 调用API获取数据
    const response = await inventoryApi.getTransferList(params);
    
    // 使用API返回的数据
    transferList.value = response.data.items || [];
    pagination.total = response.data.total || 0;
  } catch (error) {
    console.error('获取调拨单列表失败:', error);
    ElMessage.error('获取调拨单列表失败');
  } finally {
    loading.value = false;
  }
};

// 复制调拨单
const duplicateTransfer = async (id) => {
  try {
    loading.value = true;
    await fetchMaterials();
    await fetchLocations();
    
    const response = await inventoryApi.getTransferDetail(id);
    const transferData = response.data;
    
    // 重置表单
    resetTransferForm();
    
    // 填充表单数据，但不设置id，因为是新建
    transferForm.transfer_date = getCurrentDate(); // 使用当前日期
    transferForm.from_location_id = transferData.from_location_id;
    transferForm.to_location_id = transferData.to_location_id;
    transferForm.remarks = (transferData.remarks || '') + ' (复制)';
    
    // 填充物料明细
    if (transferData.items && transferData.items.length > 0) {
      transferForm.items = transferData.items.map(item => ({
        material_id: item.material_id,
        material_name: item.material_name,
        material_code: item.material_code,
        specs: item.specs,
        quantity: item.quantity,
        unit_name: item.unit_name,
        available_stock: item.available_stock || 0,
        remarks: item.remarks || ''
      }));
    }
    
    dialogType.value = 'create';
    transferDialogVisible.value = true;
    ElMessage.success('已创建调拨单副本，请检查并保存');
  } catch (error) {
    console.error('复制调拨单失败:', error);
    ElMessage.error('复制调拨单失败');
  } finally {
    loading.value = false;
  }
};

// 打印调拨单
const printTransfer = async (id) => {
  try {
    // 先获取调拨单详情
    detailLoading.value = true;
    const response = await inventoryApi.getTransferDetail(id);
    transferDetail.value = response.data;
    
    // 等待DOM更新
    await nextTick();
    
    // 创建打印样式
    const printStyle = document.createElement('style');
    printStyle.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        
        #print-section, #print-section * {
          visibility: visible;
        }
        
        #print-section {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        
        .el-button, .dialog-footer {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(printStyle);
    
    // 打开详情对话框，但不显示
    viewDialogVisible.value = true;
    
    // 等待对话框内容加载完成
    setTimeout(() => {
      // 执行打印
      window.print();
      
      // 打印完成后移除样式并关闭对话框
      setTimeout(() => {
        document.head.removeChild(printStyle);
        viewDialogVisible.value = false;
        detailLoading.value = false;
      }, 500);
    }, 500);
  } catch (error) {
    detailLoading.value = false;
    console.error('打印调拨单失败:', error);
    ElMessage.error('打印调拨单失败');
  }
};

// 页面初始化
onMounted(async () => {
  await loadTransferList();
  // 在列表数据加载完成后计算统计数据
  loadTransferStats();
});

// 处理选择变化
const selectedTransfers = ref([]);
const handleSelectionChange = (selected) => {
  selectedTransfers.value = selected;
};

// 批量操作处理
const handleBatchCommand = async (command) => {
  if (selectedTransfers.value.length === 0) {
    ElMessage.warning('请先选择要操作的调拨单');
    return;
  }

  if (command === 'export') {
    // 导出选中的调拨单
    exportSelectedTransfers();
  } else if (command === 'print') {
    // 批量打印选中的调拨单
    batchPrintTransfers();
  } else if (command === 'delete') {
    // 批量删除选中的调拨单
    batchDeleteTransfers();
  }
};

// 导出选中的调拨单
const exportSelectedTransfers = () => {
  try {
    const ids = selectedTransfers.value.map(item => item.id);
    const transferNos = selectedTransfers.value.map(item => item.transfer_no).join(', ');
    
    ElMessage.success(`正在导出 ${selectedTransfers.value.length} 个调拨单: ${transferNos}`);
    
    // TODO: 实际调用导出API
    // const response = await inventoryApi.exportTransfers(ids);
    // 处理二进制文件下载
  } catch (error) {
    console.error('导出调拨单失败:', error);
    ElMessage.error('导出调拨单失败');
  }
};

// 批量打印调拨单
const batchPrintTransfers = async () => {
  if (selectedTransfers.value.length > 5) {
    ElMessage.warning('一次最多只能打印5个调拨单');
    return;
  }
  
  try {
    ElMessage.info('正在准备打印...');
    
    // 创建打印内容
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      ElMessage.error('无法打开打印窗口，请检查是否被浏览器拦截');
      return;
    }
    
    printWindow.document.write('<html><head><title>调拨单批量打印</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: Arial, sans-serif; }
      .print-item { page-break-after: always; margin: 20px; padding: 20px; border: 1px solid #eee; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      table, th, td { border: 1px solid #ddd; }
      th, td { padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
      h2 { text-align: center; }
      .header { display: flex; justify-content: space-between; }
      .footer { margin-top: 30px; display: flex; justify-content: space-between; }
    `);
    printWindow.document.write('</style></head><body>');
    
    // 为每个选中的调拨单获取详情并添加到打印内容
    for (const transfer of selectedTransfers.value) {
      const response = await inventoryApi.getTransferDetail(transfer.id);
      const detail = response.data;
      
      printWindow.document.write(`
        <div class="print-item">
          <h2>库存调拨单</h2>
          <div class="header">
            <div>调拨单号: ${detail.transfer_no || '-'}</div>
            <div>日期: ${detail.transfer_date || '-'}</div>
          </div>
          <div>
            <p>源库位: ${detail.from_location || '-'}</p>
            <p>目标库位: ${detail.to_location || '-'}</p>
            <p>状态: ${getStatusText(detail.status) || '-'}</p>
            <p>创建人: ${detail.creator || '-'}</p>
            <p>备注: ${detail.remarks || '无'}</p>
          </div>
          
          <h3>物料明细</h3>
          <table>
            <thead>
              <tr>
                <th>序号</th>
                <th>物料编码</th>
                <th>物料名称</th>
                <th>规格型号</th>
                <th>调拨数量</th>
                <th>单位</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
      `);
      
      if (detail.items && detail.items.length > 0) {
        detail.items.forEach((item, index) => {
          printWindow.document.write(`
            <tr>
              <td>${index + 1}</td>
              <td>${item.material_code || '-'}</td>
              <td>${item.material_name || '-'}</td>
              <td>${item.specs || '-'}</td>
              <td>${item.quantity || '-'}</td>
              <td>${item.unit_name || '-'}</td>
              <td>${item.remarks || '-'}</td>
            </tr>
          `);
        });
      } else {
        printWindow.document.write('<tr><td colspan="7" style="text-align: center;">暂无物料数据</td></tr>');
      }
      
      printWindow.document.write(`
            </tbody>
          </table>
          
          <div class="footer">
            <div>调拨人: ________________</div>
            <div>接收人: ________________</div>
            <div>日期: ________________</div>
          </div>
        </div>
      `);
    }
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    // 等待内容加载完成后打印
    printWindow.onload = function() {
      printWindow.print();
      printWindow.close();
    };
  } catch (error) {
    console.error('批量打印调拨单失败:', error);
    ElMessage.error('批量打印调拨单失败');
  }
};

// 批量删除调拨单
const batchDeleteTransfers = async () => {
  // 筛选出可以删除的调拨单（草稿状态）
  const deletableTransfers = selectedTransfers.value.filter(item => item.status === 'draft');
  
  if (deletableTransfers.length === 0) {
    ElMessage.warning('选中的调拨单中没有可删除的项（只能删除草稿状态的调拨单）');
    return;
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${deletableTransfers.length} 个草稿调拨单吗？此操作不可逆。`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    loading.value = true;
    const ids = deletableTransfers.map(item => item.id);
    
    // TODO: 实际调用批量删除API
    // const response = await inventoryApi.batchDeleteTransfers(ids);
    
    // 模拟批量删除
    for (const id of ids) {
      try {
        await inventoryApi.deleteTransfer(id);
      } catch (error) {
        console.error(`删除调拨单 ${id} 失败:`, error);
      }
    }
    
    ElMessage.success(`成功删除 ${deletableTransfers.length} 个调拨单`);
    await loadTransferList();
    loadTransferStats();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除调拨单失败:', error);
      ElMessage.error('批量删除调拨单失败');
    }
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.inventory-transfer-container {
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
  position: relative;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  width: calc(100% - 120px);
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

/* 主区域管理样式删除 */

.data-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.operation-btns {
  display: flex;
  gap: 5px;
  align-items: center;
}

.operation-dropdown {
  margin-right: 0;
}

.batch-actions {
  position: absolute;
  right: 20px;
  top: 20px;
}
</style> 