<template>
  <div class="purchase-returns-container">
    <div class="page-header">
      <h2>采购退货管理</h2>
      <el-button type="primary" @click="showAddDialog">
        <el-icon><Plus /></el-icon> 新建退货单
      </el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="退货单号">
          <el-input v-model="searchForm.returnNo" placeholder="请输入退货单号" clearable></el-input>
        </el-form-item>
        <el-form-item label="收货单号">
          <el-input v-model="searchForm.receiptNo" placeholder="请输入收货单号" clearable></el-input>
        </el-form-item>
        <el-form-item label="退货日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          ></el-date-picker>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchReturns">
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
        <div class="stat-value">{{ returnStats.total || 0 }}</div>
        <div class="stat-label">退货单总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ returnStats.draftCount || 0 }}</div>
        <div class="stat-label">草稿状态</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ returnStats.confirmedCount || 0 }}</div>
        <div class="stat-label">已确认退货</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ returnStats.completedCount || 0 }}</div>
        <div class="stat-label">已完成退货</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatCurrency(returnStats.totalAmount || 0) }}</div>
        <div class="stat-label">退货总金额</div>
      </el-card>
    </div>
    
    <!-- 退货单列表 -->
    <el-card class="data-card">
      <el-table
        v-loading="loading"
        :data="returnList"
        border
        style="width: 100%"
      >
        <el-table-column prop="returnNumber" label="退货单号" min-width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="returnDate" label="退货日期" min-width="110">
          <template #default="scope">
            {{ formatDate(scope.row.returnDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="receiptNumber" label="关联收货单" min-width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="supplierName" label="供应商" min-width="150" show-overflow-tooltip></el-table-column>
        <el-table-column prop="handler" label="经办人" min-width="100"></el-table-column>
        <el-table-column prop="warehouseName" label="出库仓库" min-width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="status" label="状态" min-width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="180" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="viewReturn(scope.row)">查看</el-button>
            <el-button 
              size="small" 
              type="primary" 
              @click="editReturn(scope.row)"
              v-if="scope.row.status === 'draft'"
            >编辑</el-button>
            <el-dropdown v-if="canUpdateStatus(scope.row.status)" trigger="click" placement="bottom">
              <el-button size="small" type="success">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="scope.row.status === 'draft'" @click="openUpdateStatusDialog(scope.row)">确认退货</el-dropdown-item>
                  <el-dropdown-item v-if="scope.row.status === 'confirmed'" @click="openUpdateStatusDialog(scope.row)">完成退货</el-dropdown-item>
                  <el-dropdown-item v-if="['draft', 'confirmed'].includes(scope.row.status)" @click="openUpdateStatusDialog(scope.row)">取消退货</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        ></el-pagination>
      </div>
    </el-card>
    
    <!-- 查看退货单详情对话框 -->
    <el-dialog
      title="退货单详情"
      v-model="viewDialog.show"
      width="800px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-loading="detailLoading">
        <el-descriptions border :column="2">
          <el-descriptions-item label="退货单号">{{ viewDialog.return.returnNumber }}</el-descriptions-item>
          <el-descriptions-item label="退货日期">{{ formatDate(viewDialog.return.returnDate) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(viewDialog.return.status)">{{ getStatusText(viewDialog.return.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="关联收货单">{{ viewDialog.return.receiptNumber }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ viewDialog.return.supplierName }}</el-descriptions-item>
          <el-descriptions-item label="经办人">{{ viewDialog.return.handler }}</el-descriptions-item>
          <el-descriptions-item label="出库仓库">{{ viewDialog.return.warehouseName }}</el-descriptions-item>
          <el-descriptions-item label="退货原因" :span="2">{{ viewDialog.return.reason }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider content-position="center">退货物料</el-divider>
        <el-table :data="viewDialog.return.items || []" border style="width: 100%">
          <el-table-column type="index" label="序号" width="60" align="center"></el-table-column>
          <el-table-column label="物料名称" prop="materialName" min-width="150"></el-table-column>
          <el-table-column label="规格" prop="specification" min-width="150"></el-table-column>
          <el-table-column label="单位" prop="unitName" min-width="80"></el-table-column>
          <el-table-column label="收货数量" prop="receivedQuantity" min-width="100" align="center"></el-table-column>
          <el-table-column label="退货数量" prop="returnQuantity" min-width="100" align="center"></el-table-column>
          <el-table-column label="单价" min-width="100" align="center">
            <template #default="scope">
              ¥{{ parseFloat(scope.row.price || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="金额" min-width="100" align="center">
            <template #default="scope">
              ¥{{ (scope.row.returnQuantity * scope.row.price).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="退货原因" prop="returnReason" min-width="150"></el-table-column>
        </el-table>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="viewDialog.show = false">关闭</el-button>
          <el-button type="primary" @click="printReturn" v-if="viewDialog.return.id">打印</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 新建/编辑退货单对话框 -->
    <el-dialog
      :title="returnDialog.isEdit ? '编辑退货单' : '新建退货单'"
      v-model="returnDialog.show"
      width="900px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form ref="returnForm" :model="returnDialog.form" :rules="returnRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="关联收货单" prop="receiptId">
              <el-select
                v-model="returnDialog.form.receiptId"
                placeholder="请选择收货单"
                filterable
                style="width: 100%"
                @change="handleReceiptChange"
              >
                <el-option
                  v-for="item in receipts"
                  :key="item.id"
                  :label="item.receiptNumber"
                  :value="item.id"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="退货日期" prop="returnDate">
              <el-date-picker
                v-model="returnDialog.form.returnDate"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              ></el-date-picker>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经办人" prop="handler">
              <el-input v-model="returnDialog.form.handler" placeholder="请输入经办人"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出库仓库" prop="warehouseId">
              <el-select
                v-model="returnDialog.form.warehouseId"
                placeholder="请选择仓库"
                filterable
                style="width: 100%"
              >
                <el-option
                  v-for="item in warehouses"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="退货原因" prop="reason">
              <el-input
                v-model="returnDialog.form.reason"
                type="textarea"
                :rows="2"
                placeholder="请输入退货原因"
              ></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <div class="mt-4">
          <div class="mb-2 font-weight-bold">物料清单</div>
          <el-table :data="returnDialog.form.items" border style="width: 100%">
            <el-table-column type="index" label="序号" width="50" align="center"></el-table-column>
            <el-table-column label="物料名称" prop="materialName" min-width="150"></el-table-column>
            <el-table-column label="规格" prop="specification" min-width="120"></el-table-column>
            <el-table-column label="单位" prop="unitName" min-width="80"></el-table-column>
            <el-table-column label="收货数量" min-width="100" align="center">
              <template #default="scope">
                {{ scope.row.receivedQuantity }}
              </template>
            </el-table-column>
            <el-table-column label="退货数量" min-width="120" align="center">
              <template #default="scope">
                <el-input-number
                  v-model="scope.row.returnQuantity"
                  :min="0"
                  :max="scope.row.receivedQuantity"
                  :precision="2"
                  :step="1"
                  controls-position="right"
                  size="small"
                  style="width: 120px"
                ></el-input-number>
              </template>
            </el-table-column>
            <el-table-column label="退货原因" min-width="180">
              <template #default="scope">
                <el-select 
                  v-model="scope.row.returnReason" 
                  placeholder="请选择" 
                  size="small"
                  style="width: 100%"
                  :disabled="!scope.row.returnQuantity"
                >
                  <el-option label="质量问题" value="质量问题"></el-option>
                  <el-option label="数量错误" value="数量错误"></el-option>
                  <el-option label="物料错误" value="物料错误"></el-option>
                  <el-option label="其他原因" value="其他原因"></el-option>
                </el-select>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeReturnDialog">取 消</el-button>
          <el-button type="primary" @click="submitReturn" :loading="submitLoading">确 定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 更新状态对话框 -->
    <el-dialog
      title="更新退货单状态"
      v-model="statusDialog.show"
      width="500px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form :model="statusDialog" label-width="100px">
        <el-form-item label="当前状态">
          <el-tag :type="getStatusType(statusDialog.currentStatus)">{{ getStatusText(statusDialog.currentStatus) }}</el-tag>
        </el-form-item>
        <el-form-item label="新状态" prop="status">
          <el-select v-model="statusDialog.status" placeholder="请选择新状态" style="width: 100%">
            <el-option
              v-for="item in getAvailableStatusOptions(statusDialog.currentStatus)"
              :key="item.value"
              :label="item.text"
              :value="item.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remarks">
          <el-input
            v-model="statusDialog.remarks"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="statusDialog.show = false">取 消</el-button>
          <el-button type="primary" @click="updateReturnStatus" :loading="updateStatusLoading">确 定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useSnackbar } from '@/composables/useSnackbar';
import { purchaseApi } from '@/services/api';
import { baseDataApi } from '@/services/api';
import { formatDate as formatDateUtil } from '@/utils/formatters';

const { showSnackbar } = useSnackbar();

// 表格列定义
const headers = [
  { text: '退货单号', value: 'returnNumber', sortable: true },
  { text: '退货日期', value: 'returnDate', sortable: true },
  { text: '关联收货单', value: 'receiptNumber', sortable: true },
  { text: '供应商', value: 'supplierName', sortable: true },
  { text: '经办人', value: 'handler', sortable: true },
  { text: '出库仓库', value: 'warehouseName', sortable: true },
  { text: '状态', value: 'status', sortable: true },
  { text: '操作', value: 'actions', sortable: false, align: 'center' }
];

const itemHeaders = [
  { text: '物料名称', value: 'materialName' },
  { text: '规格', value: 'specification' },
  { text: '单位', value: 'unitName' },
  { text: '收货数量', value: 'receivedQuantity', align: 'center' },
  { text: '退货数量', value: 'returnQuantity', align: 'center' },
  { text: '退货原因', value: 'reason' }
];

const viewItemHeaders = [
  { text: '物料名称', value: 'materialName' },
  { text: '规格', value: 'specification' },
  { text: '单位', value: 'unitName' },
  { text: '收货数量', value: 'receivedQuantity', align: 'center' },
  { text: '退货数量', value: 'returnQuantity', align: 'center' },
  { text: '退货原因', value: 'returnReason' }
];

// 状态选项
const statusOptions = [
  { text: '草稿', value: 'draft' },
  { text: '已确认', value: 'confirmed' },
  { text: '已完成', value: 'completed' },
  { text: '已取消', value: 'cancelled' }
];

// 退货原因选项
const returnReasons = [
  '质量问题',
  '物料损坏',
  '规格错误',
  '数量不符',
  '交期延迟',
  '其他原因'
];

// 状态颜色映射
const statusColorMap = {
  draft: 'grey',
  confirmed: 'blue',
  completed: 'green',
  cancelled: 'red'
};

// 退货单数据
const returnList = ref([]);
const loading = ref(false);
const pagination = ref({ current: 1, size: 10, total: 0 });

// 供应商、收货单和仓库
const suppliers = ref([]);
const receipts = ref([]);
const warehouses = ref([]);

// 搜索表单
const searchForm = reactive({
  returnNo: '',
  receiptNo: '',
  dateRange: []
});

// 新建/编辑退货单对话框
const returnDialog = reactive({
  show: false,
  isEdit: false,
  valid: false,
  dateMenu: false,
  form: {
    id: null,
    receiptId: null,
    returnDate: new Date().toISOString().substr(0, 10),
    handler: '',
    warehouseId: null,
    reason: '',
    items: []
  }
});

// 查看退货单详情对话框
const viewDialog = reactive({
  show: false,
  return: {}
});

// 更新状态对话框
const statusDialog = reactive({
  show: false,
  returnId: null,
  currentStatus: '',
  status: '',
  remarks: ''
});

// 计算是否有需要退货的物料
const hasReturnItems = computed(() => {
  return returnDialog.form.items.some(item => item.returnQuantity > 0);
});

// 退货单统计数据
const returnStats = ref({
  total: 0,
  draftCount: 0,
  confirmedCount: 0,
  completedCount: 0,
  totalAmount: 0
});

// 格式化货币金额
const formatCurrency = (value) => {
  if (!value) return '¥0.00';
  return '¥' + parseFloat(value).toFixed(2);
};

// 加载退货单统计数据
const loadReturnStats = async () => {
  try {
    const response = await purchaseApi.getReturnStats();
    returnStats.value = response.data;
  } catch (error) {
    console.error('获取退货单统计信息失败:', error);
  }
};

// 生命周期钩子
onMounted(async () => {
  await Promise.all([
    loadReturns(),
    loadSuppliers(),
    loadCompletedReceipts(),
    loadWarehouses(),
    loadReturnStats()
  ]);
});

// 方法：加载退货单列表
async function loadReturns() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.current,
      limit: pagination.value.size,
      returnNumber: searchForm.returnNo || undefined,
      receiptNumber: searchForm.receiptNo || undefined,
      startDate: searchForm.dateRange[0] || undefined,
      endDate: searchForm.dateRange[1] || undefined
    };
    
    const response = await purchaseApi.getReturns(params);
    returnList.value = response.data;
    pagination.value.total = response.total;
  } catch (error) {
    console.error('加载退货单失败:', error);
    showSnackbar('加载退货单失败: ' + (error.message || '未知错误'), 'error');
  } finally {
    loading.value = false;
  }
  
  await loadReturnStats();
}

// 方法：加载供应商列表
async function loadSuppliers() {
  try {
    const response = await baseDataApi.getSuppliers();
    suppliers.value = response.data;
  } catch (error) {
    console.error('加载供应商失败:', error);
    showSnackbar('加载供应商失败', 'error');
  }
}

// 方法：加载已完成的收货单
async function loadCompletedReceipts() {
  try {
    const response = await purchaseApi.getReceipts({
      status: 'completed',
      limit: 100
    });
    receipts.value = response.data;
  } catch (error) {
    console.error('加载收货单失败:', error);
    showSnackbar('加载收货单失败', 'error');
  }
}

// 方法：加载仓库列表
async function loadWarehouses() {
  try {
    const response = await baseDataApi.getWarehouses();
    warehouses.value = response.data;
  } catch (error) {
    console.error('加载仓库失败:', error);
    showSnackbar('加载仓库失败', 'error');
  }
}

// 方法：重置搜索条件
function resetSearch() {
  searchForm.returnNo = '';
  searchForm.receiptNo = '';
  searchForm.dateRange = [];
  pagination.value.current = 1;
  loadReturns();
}

// 方法：获取状态文本
function getStatusText(status) {
  const option = statusOptions.find(opt => opt.value === status);
  return option ? option.text : status;
}

// 方法：获取状态颜色
function getStatusColor(status) {
  return statusColorMap[status] || 'grey';
}

// 方法：格式化日期
function formatDate(date) {
  if (!date) return '';
  return formatDateUtil(date);
}

// 方法：打开创建退货单对话框
function showAddDialog() {
  returnDialog.isEdit = false;
  returnDialog.form = {
    id: null,
    receiptId: null,
    returnDate: new Date().toISOString().substr(0, 10),
    handler: '',
    warehouseId: null,
    reason: '',
    items: []
  };
  returnDialog.show = true;
}

// 方法：关闭退货单对话框
function closeReturnDialog() {
  returnDialog.show = false;
}

// 方法：查看退货单详情
function viewReturn(returnItem) {
  viewDialog.return = { ...returnItem };
  viewDialog.show = true;
}

// 方法：编辑退货单
function editReturn(returnItem) {
  returnDialog.isEdit = true;
  returnDialog.form = {
    id: returnItem.id,
    receiptId: returnItem.receiptId,
    returnDate: returnItem.returnDate,
    handler: returnItem.handler,
    warehouseId: returnItem.warehouseId,
    reason: returnItem.reason,
    items: [...(returnItem.items || [])].map(item => ({
      ...item,
      returnQuantity: Number(item.returnQuantity)
    }))
  };
  returnDialog.show = true;
}

// 方法：处理收货单选择变更
async function handleReceiptChange(receiptId) {
  if (!receiptId) {
    returnDialog.form.items = [];
    return;
  }

  try {
    // 获取收货单详情以获取物料信息
    const response = await purchaseApi.getReceipt(receiptId);
    const receiptData = response.data;
    
    // 清空现有物料并添加收货单中的物料
    returnDialog.form.items = receiptData.items.map(item => ({
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      specification: item.specification,
      unitId: item.unitId,
      unitName: item.unitName,
      receivedQuantity: Number(item.receivedQuantity),
      returnQuantity: 0, // 默认退货数量为0
      price: Number(item.price),
      returnReason: ''
    }));

    // 设置仓库
    returnDialog.form.warehouseId = receiptData.warehouseId;
  } catch (error) {
    console.error('获取收货单详情失败:', error);
    showSnackbar('获取收货单详情失败', 'error');
  }
}

// 方法：提交退货单
async function submitReturn() {
  // 检查是否有退货物料
  if (!hasReturnItems.value) {
    showSnackbar('请至少选择一种物料进行退货', 'warning');
    return;
  }

  // 验证退货数量
  for (const item of returnDialog.form.items) {
    if (item.returnQuantity < 0 || item.returnQuantity > item.receivedQuantity) {
      showSnackbar(`物料 ${item.materialName} 的退货数量必须在0至收货数量之间`, 'warning');
      return;
    }
    
    if (item.returnQuantity > 0 && !item.returnReason) {
      showSnackbar(`请为退货物料 ${item.materialName} 选择退货原因`, 'warning');
      return;
    }
  }

  try {
    // 筛选出退货数量大于0的物料
    const returnItems = returnDialog.form.items
      .filter(item => item.returnQuantity > 0)
      .map(item => ({
        materialId: item.materialId,
        unitId: item.unitId,
        receivedQuantity: Number(item.receivedQuantity),
        returnQuantity: Number(item.returnQuantity),
        price: Number(item.price),
        returnReason: item.returnReason
      }));

    const returnData = {
      ...returnDialog.form,
      status: 'draft',
      items: returnItems
    };

    if (returnDialog.isEdit) {
      await purchaseApi.updateReturn(returnDialog.form.id, returnData);
      showSnackbar('退货单更新成功', 'success');
    } else {
      await purchaseApi.createReturn(returnData);
      showSnackbar('退货单创建成功', 'success');
    }

    returnDialog.show = false;
    loadReturns();
  } catch (error) {
    console.error('提交退货单失败:', error);
    showSnackbar('提交退货单失败: ' + (error.message || '未知错误'), 'error');
  }
}

// 方法：打开更新状态对话框
function openUpdateStatusDialog(returnItem) {
  statusDialog.returnId = returnItem.id;
  statusDialog.currentStatus = returnItem.status;
  statusDialog.status = '';
  statusDialog.remarks = '';
  statusDialog.show = true;
}

// 方法：获取可用的状态选项
function getAvailableStatusOptions(currentStatus) {
  // 根据当前状态返回可选的下一状态
  const statusFlow = {
    draft: [
      { text: '确认', value: 'confirmed' },
      { text: '取消', value: 'cancelled' }
    ],
    confirmed: [
      { text: '完成', value: 'completed' },
      { text: '取消', value: 'cancelled' }
    ]
  };

  return statusFlow[currentStatus] || [];
}

// 方法：判断是否可以更新状态
function canUpdateStatus(status) {
  return ['draft', 'confirmed'].includes(status);
}

// 方法：更新退货单状态
async function updateReturnStatus() {
  if (!statusDialog.status) {
    showSnackbar('请选择一个状态', 'warning');
    return;
  }

  try {
    await purchaseApi.updateReturnStatus(statusDialog.returnId, {
      status: statusDialog.status,
      remarks: statusDialog.remarks
    });
    
    showSnackbar('退货单状态已更新', 'success');
    statusDialog.show = false;
    loadReturns();
  } catch (error) {
    console.error('更新退货单状态失败:', error);
    showSnackbar('更新退货单状态失败: ' + (error.message || '未知错误'), 'error');
  }
}
</script>

<style scoped>
.purchase-returns-container {
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
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.data-card {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.mt-4 {
  margin-top: 16px;
}

.mb-2 {
  margin-bottom: 8px;
}

.font-weight-bold {
  font-weight: bold;
}
</style> 