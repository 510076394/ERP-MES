<template>
  <div class="purchase-receipts-container">
    <div class="page-header">
      <h2>采购收货管理</h2>
      <el-button type="primary" @click="showAddDialog">
        <el-icon><Plus /></el-icon> 新建收货单
      </el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="收货单号">
          <el-input v-model="searchForm.receiptNo" placeholder="请输入收货单号" clearable></el-input>
        </el-form-item>
        <el-form-item label="订单编号">
          <el-input v-model="searchForm.orderNo" placeholder="请输入订单编号" clearable></el-input>
        </el-form-item>
        <el-form-item label="收货日期">
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
          <el-button type="primary" @click="searchReceipts">
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
        <div class="stat-value">{{ receiptStats.total || 0 }}</div>
        <div class="stat-label">收货单总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ receiptStats.draftCount || 0 }}</div>
        <div class="stat-label">草稿状态</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ receiptStats.confirmedCount || 0 }}</div>
        <div class="stat-label">已确认收货</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ receiptStats.completedCount || 0 }}</div>
        <div class="stat-label">已完成入库</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ qualifiedInspections.length || 0 }}</div>
        <div class="stat-label">检验合格</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatCurrency(receiptStats.totalAmount || 0) }}</div>
        <div class="stat-label">收货总金额</div>
      </el-card>
    </div>
    
    <!-- 收货单列表 -->
    <el-card class="data-card">
      <el-table
        v-loading="loading"
        :data="receipts"
        border
        style="width: 100%"
      >
        <el-table-column prop="receipt_no" label="收货单号" min-width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="receipt_date" label="收货日期" min-width="110">
          <template #default="scope">
            {{ formatDate(scope.row.receipt_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="order_no" label="关联订单" min-width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="supplier_name" label="供应商" min-width="150" show-overflow-tooltip></el-table-column>
        <el-table-column prop="operator" label="收货人" min-width="100"></el-table-column>
        <el-table-column prop="warehouse_name" label="入库仓库" min-width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="status" label="状态" min-width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
            <el-tag v-if="scope.row.inspectionId" type="success" size="small" style="margin-left: 5px;">已检验</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="180" fixed="right">
          <template #default="scope">
            <div class="table-operations">
              <div class="operation-group">
                <el-button size="small" @click="viewReceipt(scope.row)">查看</el-button>
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="editReceipt(scope.row)"
                  v-if="scope.row.status === 'draft'"
                >编辑</el-button>
                <el-button
                  size="small"
                  type="success"
                  @click="confirmReceipt(scope.row)"
                  v-if="scope.row.status === 'confirmed'"
                >确定</el-button>
              </div>
              
              <div class="operation-group" v-if="canUpdateStatus(scope.row.status)">
                <el-dropdown trigger="click" placement="bottom">
                  <el-button size="small" type="success">
                    更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item v-if="scope.row.status === 'draft'" @click="directConfirmReceipt(scope.row)">确认入库</el-dropdown-item>
                      <el-dropdown-item v-if="scope.row.status === 'confirmed'" @click="openUpdateStatusDialog(scope.row)">完成入库</el-dropdown-item>
                      <el-dropdown-item v-if="['draft', 'confirmed'].includes(scope.row.status)" @click="openUpdateStatusDialog(scope.row)">取消入库</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
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
    
    <!-- 查看收货单详情对话框 -->
    <el-dialog
      title="收货单详情"
      v-model="viewDialog.show"
      width="800px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-loading="detailLoading">
        <el-descriptions border :column="2">
          <el-descriptions-item label="收货单号">{{ viewDialog.receipt.receipt_no }}</el-descriptions-item>
          <el-descriptions-item label="收货日期">{{ formatDate(viewDialog.receipt.receipt_date) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(viewDialog.receipt.status)">{{ getStatusText(viewDialog.receipt.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="关联订单">{{ viewDialog.receipt.order_no }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ viewDialog.receipt.supplier_name }}</el-descriptions-item>
          <el-descriptions-item label="收货人">{{ viewDialog.receipt.operator }}</el-descriptions-item>
          <el-descriptions-item label="入库仓库">{{ viewDialog.receipt.warehouse_name }}</el-descriptions-item>
          <el-descriptions-item v-if="viewDialog.receipt.inspectionId" label="检验状态" :span="2">
            <el-tag type="success">已通过来料检验</el-tag>
            <span v-if="viewDialog.receipt.inspectionNo" style="margin-left: 10px">检验单号: {{ viewDialog.receipt.inspectionNo }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ viewDialog.receipt.remarks }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider content-position="center">收货物料</el-divider>
        <template v-if="!viewDialog.receipt.items || viewDialog.receipt.items.length === 0">
          <div class="no-data-info">
            <el-empty description="暂无物料数据"></el-empty>
          </div>
        </template>
        <el-table v-else :data="viewDialog.receipt.items || []" border style="width: 100%">
          <el-table-column type="index" label="序号" width="60" align="center"></el-table-column>
          <el-table-column label="物料名称" prop="material_name" min-width="150">
            <template #default="scope">
              {{ scope.row.material_name || scope.row.materialName || '未知物料' }}
            </template>
          </el-table-column>
          <el-table-column label="编码" min-width="120">
            <template #default="scope">
              {{ scope.row.code || scope.row.material_code || '' }}
            </template>
          </el-table-column>
          <el-table-column label="规格型号" prop="specification" min-width="150">
            <template #default="scope">
              {{ scope.row.specification || scope.row.specs || scope.row.standard || scope.row.model || scope.row.spec || '未提供' }}
            </template>
          </el-table-column>
          <el-table-column label="单位" prop="unit_name" min-width="80">
            <template #default="scope">
              {{ scope.row.unit_name || scope.row.unit || '个' }}
            </template>
          </el-table-column>
          <el-table-column label="订单数量" prop="ordered_quantity" min-width="100" align="center">
            <template #default="scope">
              {{ Number(scope.row.ordered_quantity || scope.row.quantity || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="实收数量" prop="received_quantity" min-width="100" align="center">
            <template #default="scope">
              {{ Number(scope.row.received_quantity || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="合格数量" prop="qualified_quantity" min-width="100" align="center">
            <template #default="scope">
              {{ Number(scope.row.qualified_quantity || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="质检状态" min-width="100" align="center">
            <template #default="scope">
              <el-tag type="success" v-if="Number(scope.row.qualified_quantity || 0) >= Number(scope.row.received_quantity || 0)">合格</el-tag>
              <el-tag type="warning" v-else-if="Number(scope.row.qualified_quantity || 0) > 0">部分合格</el-tag>
              <el-tag type="danger" v-else>不合格</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="备注" prop="remarks" min-width="150">
            <template #default="scope">
              {{ scope.row.remarks || '-' }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="viewDialog.show = false">关闭</el-button>
          <el-button type="primary" @click="printReceipt" v-if="viewDialog.receipt.id">打印</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 新建/编辑收货单对话框 -->
    <el-dialog
      :title="receiptDialog.isEdit ? '编辑收货单' : '新建收货单'"
      v-model="receiptDialog.show"
      width="900px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form ref="receiptForm" :model="receiptDialog.form" :rules="receiptRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="关联订单" prop="orderId">
              <el-select
                v-model="receiptDialog.form.orderId"
                placeholder="请选择订单"
                filterable
                style="width: 100%"
                @change="handleOrderChange"
              >
                <el-option
                  v-for="item in orders"
                  :key="item.id"
                  :label="item.orderNumber"
                  :value="item.id"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收货日期" prop="receiptDate">
              <el-date-picker
                v-model="receiptDialog.form.receiptDate"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              ></el-date-picker>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplierId">
              <div v-if="selectedSupplierName" style="display: flex; align-items: center; margin-bottom: 10px;">
                <el-tag type="success" size="large" style="margin-right: 10px;">
                  <strong>{{ selectedSupplierName }}</strong>
                </el-tag>
                <el-button type="text" @click="selectedSupplierName = null">
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
              <el-select
                v-model="receiptDialog.form.supplierId"
                placeholder="请选择供应商"
                filterable
                style="width: 100%"
                value-key="id"
                v-if="!selectedSupplierName"
              >
                <el-option
                  v-for="item in suppliers"
                  :key="item.id || item.supplier_id"
                  :label="item.name || item.supplier_name"
                  :value="Number(item.id || item.supplier_id)"
                >
                  <div style="display: flex; flex-direction: column;">
                    <span>{{ item.name || item.supplier_name }}</span>
                    <small style="color: #999">
                      {{ item.address || item.supplier_address || '' }}
                    </small>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收货人" prop="receiver">
              <el-input v-model="receiptDialog.form.receiver" placeholder="请输入收货人"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="入库仓库" prop="warehouseId">
              <el-select
                v-model="receiptDialog.form.warehouseId"
                placeholder="请选择仓库"
                filterable
                style="width: 100%"
                @change="(val) => { 
                  // 确保ID是数字类型
                  if (val) {
                    receiptDialog.form.warehouseId = Number(val);
                    // 验证所选仓库是否有效
                    if (!validateWarehouseId(receiptDialog.form.warehouseId)) {
                      showSnackbar('警告：所选仓库ID不在系统中，请重新选择', 'warning');
                      receiptDialog.form.warehouseId = null;
                    }
                  }
                }"
              >
                <el-option
                  v-for="item in warehouses"
                  :key="item.id"
                  :label="`${item.name}${item.code ? ` (${item.code})` : ''}`"
                  :value="Number(item.id)"
                >
                  <div style="display: flex; flex-direction: column;">
                    <span>{{ item.name }}</span>
                    <small style="color: #999">
                      ID: {{ Number(item.id) }} | 代码: {{ item.code || '无' }} | 类型: {{ item.type || '标准' }}
                    </small>
                  </div>
                </el-option>
              </el-select>
              <div v-if="warehouses.length === 0" style="color: #F56C6C; font-size: 12px; margin-top: 5px;">
                警告：系统中未找到有效的仓库，请先创建仓库
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="来料检验单" prop="inspectionId">
              <el-select
                v-model="receiptDialog.form.inspectionId"
                placeholder="选择已检验合格的来料单"
                filterable
                clearable
                style="width: 100%"
                @change="handleInspectionChange"
              >
                <el-option
                  v-for="item in qualifiedInspections"
                  :key="item.id"
                  :label="`${item.inspection_no} - ${item.item_name}`"
                  :value="item.id"
                >
                  <div style="display: flex; justify-content: space-between; align-items: center">
                    <span>{{ item.inspection_no }}</span>
                    <el-tag size="small" type="success">已检验合格</el-tag>
                  </div>
                  <div style="font-size: 12px; color: #999">
                    {{ item.item_name }} - {{ item.supplier_name ? (item.supplier_name.includes('(') ? item.supplier_name.split('(')[0].trim() : item.supplier_name) : '' }} - 批次: {{ item.batch_no }}
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remarks">
              <el-input
                v-model="receiptDialog.form.remarks"
                type="textarea"
                :rows="2"
                placeholder="请输入备注信息"
              ></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <div class="mt-4">
          <div class="mb-2 font-weight-bold">物料清单</div>
          <el-table :data="receiptDialog.form.items" border style="width: 100%">
            <el-table-column type="index" label="序号" width="50" align="center"></el-table-column>
            <el-table-column label="物料名称" prop="materialName" min-width="150"></el-table-column>
            <el-table-column label="规格" prop="specification" min-width="120"></el-table-column>
            <el-table-column label="单位" prop="unitName" min-width="80"></el-table-column>
            <el-table-column label="订单数量" min-width="100" align="center">
              <template #default="scope">
                {{ scope.row.orderedQuantity }}
              </template>
            </el-table-column>
            <el-table-column label="实收数量" min-width="120" align="center">
              <template #default="scope">
                <el-input-number
                  v-model="scope.row.receivedQuantity"
                  :min="0"
                  :precision="2"
                  :step="1"
                  controls-position="right"
                  size="small"
                  style="width: 120px"
                ></el-input-number>
              </template>
            </el-table-column>
            <el-table-column label="合格数量" min-width="120" align="center">
              <template #default="scope">
                <el-input-number
                  v-model="scope.row.qualifiedQuantity"
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
            <el-table-column label="备注" min-width="150">
              <template #default="scope">
                <el-input v-model="scope.row.remarks" placeholder="备注" size="small"></el-input>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeReceiptDialog">取 消</el-button>
          <el-button type="primary" @click="submitReceipt" :loading="submitLoading">确 定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 更新状态对话框 -->
    <el-dialog
      title="更新收货单状态"
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
          <el-button type="primary" @click="updateReceiptStatus" :loading="updateStatusLoading">确 定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useSnackbar } from '@/composables/useSnackbar';
import { purchaseApi, qualityApi, baseDataApi } from '@/services/api';
import api from '@/services/api';
import { formatDate as formatDateUtil } from '@/utils/formatters';
import { ElMessageBox, ElMessage } from 'element-plus';
import axios from 'axios';
import { useRoute } from 'vue-router';

const { showSnackbar } = useSnackbar();

const API_URL = import.meta.env.VITE_API_URL || '';

// 添加表单引用
const receiptForm = ref(null);

// 供应商选择状态
const selectedSupplierName = ref(null);

// 表单验证规则
const receiptRules = {
  orderId: [
    { required: true, message: '请选择关联订单', trigger: 'change' }
  ],
  receiptDate: [
    { required: true, message: '请选择收货日期', trigger: 'change' }
  ],
  supplierId: [
    { required: true, message: '请选择供应商', trigger: 'change' }
  ],
  receiver: [
    { required: true, message: '请输入收货人', trigger: 'blur' }
  ],
  warehouseId: [
    { required: true, message: '请选择入库仓库', trigger: 'change' }
  ],
  inspectionId: [
    { required: true, message: '请选择来料检验单', trigger: 'change' }
  ]
};

// 收货单数据
const receipts = ref([]);
const loading = ref(false);
const submitLoading = ref(false);
const updateStatusLoading = ref(false);
const detailLoading = ref(false);
const totalReceipts = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

// 分页对象
const pagination = ref({
  current: 1,
  size: 10,
  total: 0
});

// 供应商、订单和仓库
const suppliers = ref([]);
const orders = ref([]);
const warehouses = ref([]);

// 来料检验合格的订单
const qualifiedInspections = ref([]);
const loadingQualifiedInspections = ref(false);

// 表格列定义
const headers = [
  { text: '收货单号', value: 'receiptNumber', sortable: true },
  { text: '收货日期', value: 'receiptDate', sortable: true },
  { text: '关联订单', value: 'orderNumber', sortable: true },
  { text: '供应商', value: 'supplierName', sortable: true },
  { text: '收货人', value: 'receiver', sortable: true },
  { text: '入库仓库', value: 'warehouseName', sortable: true },
  { text: '状态', value: 'status', sortable: true },
  { text: '操作', value: 'actions', sortable: false, align: 'center' }
];

const itemHeaders = [
  { text: '物料名称', value: 'materialName' },
  { text: '规格', value: 'specification' },
  { text: '单位', value: 'unitName' },
  { text: '订单数量', value: 'orderedQuantity', align: 'center' },
  { text: '实收数量', value: 'receivedQuantity', align: 'center' },
  { text: '合格数量', value: 'qualifiedQuantity', align: 'center' },
  { text: '备注', value: 'remarks' }
];

const viewItemHeaders = [
  { text: '物料名称', value: 'materialName' },
  { text: '规格', value: 'specification' },
  { text: '单位', value: 'unitName' },
  { text: '订单数量', value: 'orderedQuantity', align: 'center' },
  { text: '实收数量', value: 'receivedQuantity', align: 'center' },
  { text: '合格数量', value: 'qualifiedQuantity', align: 'center' },
  { text: '质检状态', value: 'qualityStatus', align: 'center' },
  { text: '备注', value: 'remarks' }
];

// 状态选项
const statusOptions = [
  { text: '草稿', value: 'draft' },
  { text: '已确认', value: 'confirmed' },
  { text: '已完成', value: 'completed' },
  { text: '已取消', value: 'cancelled' }
];

// 状态颜色映射
const statusColorMap = {
  draft: 'grey',
  confirmed: 'blue',
  completed: 'green',
  cancelled: 'red'
};

// 搜索表单
const searchForm = reactive({
  receiptNo: '',
  orderNo: '',
  dateRange: [],
  startDate: '',
  endDate: ''
});

// 新建/编辑收货单对话框
const receiptDialog = reactive({
  show: false,
  isEdit: false,
  valid: false,
  dateMenu: false,
  form: {
    id: null,
    orderId: null,
    supplierId: null,
    receiptDate: new Date().toISOString().substr(0, 10),
    receiver: '',
    warehouseId: null,
    inspectionId: null,
    remarks: '',
    items: []
  }
});

// 查看收货单详情对话框
const viewDialog = reactive({
  show: false,
  receipt: {}
});

// 更新状态对话框
const statusDialog = reactive({
  show: false,
  receiptId: null,
  currentStatus: '',
  status: '',
  remarks: ''
});

// 收货单统计数据
const receiptStats = ref({
  total: 0,
  draftCount: 0,
  confirmedCount: 0,
  completedCount: 0,
  totalAmount: 0
});

// 生命周期钩子
onMounted(async () => {
  await Promise.all([
    loadReceipts(),
    loadSuppliers(),
    loadApprovedOrders(),
    loadWarehouses(),
    loadReceiptStats(),
    loadQualifiedInspections()
  ]);
  
  // 检查URL中是否有检验单ID参数
  const route = useRoute();
  const inspectionId = route.query.inspectionId;
  
  if (inspectionId) {
    console.log('检测到URL参数中有检验单ID:', inspectionId);
    // 等待数据加载完成
    await nextTick();
    // 打开新建收货单对话框
    createReceiptDialog();
    // 选择检验单
    receiptDialog.form.inspectionId = Number(inspectionId);
    await handleInspectionChange(Number(inspectionId));
  }
});

// 方法：加载已检验合格的订单
const loadQualifiedInspections = async () => {
  loadingQualifiedInspections.value = true;
  try {
    console.log('开始加载合格来料检验单');
    const response = await qualityApi.getIncomingInspections({
      status: 'passed', // 只获取状态为合格的检验单
      page: 1,
      size: 100 // 获取较多数据以确保能找到需要的检验单
    });
    
    console.log('获取到的来料检验单响应:', response);
    
    if (response && response.data) {
      // 处理不同的响应数据结构
      let inspectionData = [];
      if (Array.isArray(response.data)) {
        inspectionData = response.data;
      } else if (response.data.items && Array.isArray(response.data.items)) {
        inspectionData = response.data.items;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        inspectionData = response.data.data;
      }
      
      console.log('处理后的来料检验单数据:', inspectionData);
      
      qualifiedInspections.value = inspectionData.map(item => ({
        id: item.id,
        inspection_no: item.inspection_no || item.inspectionNo,
        item_name: item.item_name || item.itemName,
        supplier_name: item.supplier_name || item.supplierName,
        batch_no: item.batch_no || item.batchNo,
        status: item.status
      }));
      
      console.log('最终设置的合格来料检验单:', qualifiedInspections.value);
    } else {
      console.warn('未获取到来料检验单数据');
      qualifiedInspections.value = [];
    }
  } catch (error) {
    console.error('加载合格来料检验单失败:', error);
    showSnackbar('加载合格来料检验单失败', 'error');
    qualifiedInspections.value = [];
  } finally {
    loadingQualifiedInspections.value = false;
  }
};

// 方法：加载收货单列表
async function loadReceipts() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.current,
      limit: pagination.value.size,
      receiptNumber: searchForm.receiptNo || undefined,
      orderNumber: searchForm.orderNo || undefined,
      startDate: searchForm.startDate || undefined,
      endDate: searchForm.endDate || undefined
    };
    
    const response = await purchaseApi.getReceipts(params);
    console.log('收到的收货单数据:', response); 
    
    // 根据接口返回的实际结构处理数据
    let receiptData = [];
    if (response.data && response.data.items) {
      // 如果response.data有items字段，说明是对象结构
      receiptData = response.data.items;
      pagination.value.total = response.data.total;
      totalReceipts.value = response.data.total;
    } else {
      // 否则假定是数组结构
      receiptData = Array.isArray(response.data) ? response.data : [];
      pagination.value.total = response.total || 0;
      totalReceipts.value = response.total || 0;
    }
    
    // 详细记录收货单数据结构
    console.log('收货单原始数据结构:', receiptData.length > 0 ? Object.keys(receiptData[0]) : '无数据');
    if (receiptData.length > 0) {
      console.log('第一条收货单完整数据:', JSON.stringify(receiptData[0]));
      
      // 检查可能包含订单和供应商信息的字段
      const firstItem = receiptData[0];
      console.log('订单相关字段:', {
        order_id: firstItem.order_id,
        orderId: firstItem.orderId,
        order_no: firstItem.order_no,
        orderNo: firstItem.orderNo,
        order_number: firstItem.order_number,
        orderNumber: firstItem.orderNumber
      });
      
      console.log('供应商相关字段:', {
        supplier_id: firstItem.supplier_id,
        supplierId: firstItem.supplierId,
        supplier_name: firstItem.supplier_name,
        supplierName: firstItem.supplierName
      });
    }
    
    // 获取每个收货单的详细信息
    // 这与viewReceipt方法使用相同的API，确保数据一致性
    try {
      // 为每个收货单ID获取详细信息
      const detailedReceipts = await Promise.all(
        receiptData.map(async (receipt) => {
          try {
            // 使用与详情视图相同的API获取完整数据
            const { data } = await purchaseApi.getReceipt(receipt.id);
            console.log(`获取收货单${receipt.id}详情成功:`, data);
            return data; // 返回完整的详情数据
          } catch (error) {
            console.error(`获取收货单${receipt.id}详情失败:`, error);
            return receipt; // 如果获取失败，返回原始数据
          }
        })
      );
      
      // 使用详细信息替换收货单数据
      receipts.value = detailedReceipts;
      console.log('处理后的收货单数据:', receipts.value);
    } catch (detailError) {
      console.error('获取收货单详情过程中出错:', detailError);
      // 如果批量获取失败，使用原始数据
      receipts.value = receiptData;
    }
    
    await loadReceiptStats();
  } catch (error) {
    console.error('加载收货单失败:', error);
    showSnackbar('加载收货单失败: ' + (error.message || '未知错误'), 'error');
    receipts.value = []; // 确保在出错时receipts是一个数组
  } finally {
    loading.value = false;
  }
}

// 方法：加载供应商列表
const loadSuppliers = async () => {
  try {
    console.log('开始加载供应商列表');
    const params = { limit: 1000 };
    const response = await baseDataApi.getSuppliers(params);
    console.log('供应商API响应:', response);

    if (!response || !response.data) {
      console.error('供应商API返回无效数据:', response);
      suppliers.value = [];
      return;
    }

    let supplierList = [];
    if (Array.isArray(response.data)) {
      supplierList = response.data;
    } else if (response.data.items && Array.isArray(response.data.items)) {
      supplierList = response.data.items;
    } else if (response.data.list && Array.isArray(response.data.list)) {
      supplierList = response.data.list;
    } else if (response.data.data && Array.isArray(response.data.data)) {
      supplierList = response.data.data;
    }

    // 标准化供应商数据
    suppliers.value = supplierList.map(supplier => ({
      id: supplier.id || supplier.supplier_id,
      code: supplier.code || supplier.supplier_code,
      name: supplier.name || supplier.supplier_name || supplier.company_name,
      contactPerson: supplier.contact_person || supplier.contactPerson,
      contactPhone: supplier.contact_phone || supplier.contactPhone,
      status: supplier.status || 1
    }));

    console.log('成功加载供应商列表，数量:', suppliers.value.length);
    console.log('供应商列表:', suppliers.value);
    
    // 特别检查ID为11的供应商
    const supplier11 = suppliers.value.find(s => Number(s.id) === 11);
    if (supplier11) {
      console.log('ID为11的供应商:', supplier11);
    } else {
      console.warn('未找到ID为11的供应商，尝试手动添加');
      // 手动添加ID为11的供应商作为临时解决方案
      suppliers.value.push({
        id: 11,
        supplier_id: 11,
        name: '供应商11',  // 临时名称，后续会被实际名称覆盖
        code: 'S11'
      });
    }
  } catch (error) {
    console.error('加载供应商列表失败:', error);
    showSnackbar('加载供应商列表失败', 'error');
    suppliers.value = [];
  }
};

// 方法：标准化订单号格式（去除空格、全部大写）
function normalizeOrderNumber(orderNo) {
  if (!orderNo) return '';
  return orderNo.toString().trim().toUpperCase();
}

// 方法：加载已批准的订单
async function loadApprovedOrders() {
  try {
    // 加载所有订单而不添加状态过滤
    const response = await purchaseApi.getOrders({
      limit: 1000 // 进一步增加查询数量限制
    });
    
    console.log('加载订单响应:', response);
    
    // 打印第一个订单的完整结构以便调试
    if (response.data && response.data.items && response.data.items.length > 0) {
      console.log('第一个订单的完整结构:', JSON.stringify(response.data.items[0], null, 2));
    } else if (Array.isArray(response.data) && response.data.length > 0) {
      console.log('第一个订单的完整结构:', JSON.stringify(response.data[0], null, 2));
    }
    
    // 确保orders.value是数组
    if (response.data && response.data.items) {
      // 如果response.data是带有items属性的对象
      orders.value = response.data.items;
    } else if (Array.isArray(response.data)) {
      // 如果response.data本身是数组
      orders.value = response.data;
    } else {
      // 其他情况设置为空数组
      console.warn('获取订单数据格式异常:', response.data);
      orders.value = [];
    }
    
    // 标准化所有订单号，统一大小写和格式，同时检查并纠正订单字段名
    if (Array.isArray(orders.value)) {
      orders.value.forEach(order => {
        // 检查多种可能的字段名称
        let orderNumber = 
          order.orderNumber || 
          order.order_number || 
          order.orderNo || 
          order.order_no || 
          order.number || 
          order.no || 
          '未知订单号';
        
        // 保存原始订单号
        order.originalOrderNumber = orderNumber;
        
        // 标准化订单号
        order.orderNumber = normalizeOrderNumber(orderNumber);
        
        // 确保所有可能的订单号字段都有值
        order.order_number = order.orderNumber;
        order.orderNo = order.orderNumber;
        order.order_no = order.orderNumber;
      });
    }
    
    console.log('已加载订单数量:', orders.value.length);
    console.log('订单编号列表:', orders.value.map(o => o.orderNumber || '未知订单号'));
    
    // 如果仍然所有订单都是未知订单号，尝试打印完整订单对象结构
    if (orders.value.length > 0 && orders.value.every(o => !o.orderNumber || o.orderNumber === '未知订单号')) {
      console.warn('警告：所有订单都没有有效的订单号');
      console.log('订单对象的所有键:', orders.value.length > 0 ? Object.keys(orders.value[0]) : []);
      console.log('第一个订单的完整内容:', orders.value.length > 0 ? orders.value[0] : null);
    }
  } catch (error) {
    console.error('加载订单失败:', error);
    showSnackbar('加载订单失败', 'error');
    orders.value = []; // 确保在出错时orders是一个数组
  }
}

// 方法：加载仓库列表
async function loadWarehouses() {
  try {
    console.log('开始加载仓库列表');
    let hasData = false;
    
    // 第一种方法：从/inventory/locations接口获取数据
    try {
      const directResponse = await api.get('/inventory/locations', {
        params: {
          limit: 1000,
          active: true // 只获取活跃的仓库
        }
      });
      
      console.log('inventory/locations API响应:', directResponse);
      
      if (directResponse && directResponse.data) {
        // 处理响应数据可能的不同格式
        let warehouseData = [];
        
        if (Array.isArray(directResponse.data)) {
          warehouseData = directResponse.data;
        } else if (directResponse.data.items && Array.isArray(directResponse.data.items)) {
          warehouseData = directResponse.data.items;
        } else if (typeof directResponse.data === 'object') {
          // 可能是单个仓库对象
          warehouseData = [directResponse.data];
        }
        
        if (warehouseData.length > 0) {
          console.log('从inventory/locations获取到数据:', warehouseData);
          
          // 规范化仓库数据
          warehouses.value = warehouseData.map(warehouse => ({
            id: Number(warehouse.id),
            name: warehouse.name || '未命名仓库',
            code: warehouse.code || '',
            type: warehouse.type || '标准',
            location_id: Number(warehouse.id),
            originalData: { ...warehouse }
          }));
          
          hasData = true;
        }
      }
    } catch (error) {
      console.warn('从inventory/locations获取数据失败:', error);
    }
    
    // 第二种方法：如果第一种方法失败，尝试从/baseData/locations获取数据
    if (!hasData) {
      try {
        console.log('尝试从baseData/locations获取数据');
        const locationsResponse = await api.get('/baseData/locations', { 
          params: { limit: 1000 } 
        });
        
        if (locationsResponse && locationsResponse.data) {
          let locationsData = [];
          
          if (Array.isArray(locationsResponse.data)) {
            locationsData = locationsResponse.data;
          } else if (locationsResponse.data.items && Array.isArray(locationsResponse.data.items)) {
            locationsData = locationsResponse.data.items;
          }
          
          if (locationsData.length > 0) {
            console.log('从baseData/locations获取到数据:', locationsData);
            
            warehouses.value = locationsData.map(location => ({
              id: Number(location.id),
              name: location.name || '未命名仓库',
              code: location.code || '',
              type: location.type || '标准',
              location_id: Number(location.id),
              originalData: { ...location }
            }));
            
            hasData = true;
          }
        }
      } catch (locError) {
        console.error('从baseData/locations获取数据失败:', locError);
      }
    }
    
    // 第三种方法：直接查询数据库中的locations表
    if (!hasData) {
      try {
        console.log('尝试直接查询数据库中的locations表');
        const dbResponse = await api.get('/api/baseData/locations', { 
          params: { limit: 1000 } 
        });
        
        if (dbResponse && dbResponse.data) {
          let dbData = [];
          
          if (Array.isArray(dbResponse.data)) {
            dbData = dbResponse.data;
          } else if (dbResponse.data.items && Array.isArray(dbResponse.data.items)) {
            dbData = dbResponse.data.items;
          }
          
          if (dbData.length > 0) {
            console.log('直接从数据库获取到仓库数据:', dbData);
            
            warehouses.value = dbData.map(location => ({
              id: Number(location.id),
              name: location.name || '未命名仓库',
              code: location.code || '',
              type: location.type || '标准',
              location_id: Number(location.id),
              originalData: { ...location }
            }));
            
            hasData = true;
          }
        }
      } catch (dbError) {
        console.error('直接查询数据库失败:', dbError);
      }
    }
    
    // 如果仍然没有找到仓库，显示警告
    if (warehouses.value.length === 0) {
      // 最后尝试：硬编码几个关键仓库ID
      const fallbackLocations = [
        { id: 1, name: '主仓库', code: 'MAIN', type: 'warehouse' },
        { id: 2, name: '零部件仓库', code: 'SP-STORE', type: 'warehouse' },
        { id: 3, name: '成品仓库', code: 'FG-STORE', type: 'warehouse' }
      ];
      
      console.warn('未能获取仓库数据，使用备用仓库列表:', fallbackLocations);
      warehouses.value = fallbackLocations;
      
      showSnackbar('未找到任何仓库数据，使用备用仓库列表', 'warning');
    }
    
    console.log('最终仓库列表:', warehouses.value);
    console.log('仓库ID及其类型:', warehouses.value.map(w => ({ id: w.id, type: typeof w.id, name: w.name })));
    
    // 如果当前已选择了仓库ID，验证它是否存在于加载的仓库列表中
    if (receiptDialog.form && receiptDialog.form.warehouseId) {
      const currentWarehouseId = Number(receiptDialog.form.warehouseId);
      const exists = warehouses.value.some(w => Number(w.id) === currentWarehouseId);
      
      if (!exists) {
        console.warn(`当前选择的仓库ID ${currentWarehouseId} 不在可用的仓库列表中`);
        const availableIds = warehouses.value.map(w => `${w.id} (${w.name})`).join(', ');
        console.warn(`可用的仓库: ${availableIds}`);
        
        // 清除无效的仓库选择
        receiptDialog.form.warehouseId = null;
        showSnackbar(`之前选择的仓库ID ${currentWarehouseId} 不在可用列表中，已重置。请重新选择仓库。`, 'warning');
      }
    }
  } catch (error) {
    console.error('加载仓库失败:', error);
    showSnackbar('加载仓库失败: ' + (error.message || '未知错误'), 'error');
    warehouses.value = []; // 确保在出错时warehouses是一个数组
  }
}

// 方法：重置搜索条件
function resetSearch() {
  searchForm.receiptNo = '';
  searchForm.orderNo = '';
  searchForm.dateRange = [];
  searchForm.startDate = '';
  searchForm.endDate = '';
  pagination.value.current = 1;
  loadReceipts();
}

// 方法：处理页码变更
function handlePageChange(page) {
  pagination.value.current = page;
  loadReceipts();
}

// 方法：处理每页显示数量变更
function handleSizeChange(size) {
  pagination.value.size = size;
  pagination.value.current = 1;
  loadReceipts();
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

// 方法：获取状态类型
function getStatusType(status) {
  const typeMap = {
    'draft': 'info',
    'pending': 'warning',
    'confirmed': 'warning',
    'completed': 'success',
    'cancelled': 'danger'
  };
  return typeMap[status] || 'info';
}

// 方法：格式化日期
function formatDate(date) {
  if (!date) return '';
  return formatDateUtil(date);
}

// 方法：打开创建收货单对话框
function showAddDialog() {
  receiptDialog.isEdit = false;
  receiptDialog.form = {
    id: null,
    orderId: null,
    supplierId: null,
    receiptDate: new Date().toISOString().substr(0, 10),
    receiver: '',
    warehouseId: null,
    inspectionId: null,
    remarks: '',
    items: []
  };
  receiptDialog.show = true;
}

// 方法：关闭收货单对话框
function closeReceiptDialog() {
  receiptDialog.show = false;
}

// 方法：查看收货单详情
async function viewReceipt(receipt) {
  detailLoading.value = true;
  
  try {
    // 从服务器获取详细的收货单数据
    console.log('查看收货单详情:', receipt.id);
    const { data } = await purchaseApi.getReceipt(receipt.id);
    if (!data) {
      throw new Error('未能获取收货单详情');
    }
    console.log('收到的收货单详情:', data);
    
    // 过滤掉状态变更记录
    if (data.remarks) {
      // 使用正则表达式匹配状态变更的记录
      // 匹配形如 | [2025-04-23T07:15:34.913Z] 状态变更为 confirmed: 用户直接确认入库 的内容
      data.remarks = data.remarks.replace(/\s*\|\s*\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]\s*状态变更为\s+[^|]+/g, '');
      // 清理可能残留的前后分隔符和空白
      data.remarks = data.remarks.replace(/^\s*\|\s*/, '').replace(/\s*\|\s*$/, '').trim();
    }
    
    // 确保items数组存在
    if (!data.items) {
      data.items = [];
      console.warn('收货单详情中items字段为空，初始化为空数组');
    } else {
      // 记录第一个物料项的所有字段，以便调试
      if (data.items.length > 0) {
        const firstItem = data.items[0];
        console.log('物料项完整数据:', firstItem);
        console.log('规格字段所有可能的值:', {
          specification: firstItem.specification,
          specs: firstItem.specs,
          standard: firstItem.standard,
          model: firstItem.model,
          spec: firstItem.spec
        });
        
        // 如果规格字段为空，尝试从物料主数据获取
        if (!firstItem.specification && firstItem.material_id) {
          try {
            const materialResponse = await baseDataApi.getMaterial(firstItem.material_id);
            console.log('从物料主数据获取的规格信息:', materialResponse.data);
            if (materialResponse.data) {
              firstItem.specification = materialResponse.data.specs || 
                                     materialResponse.data.specification || 
                                     materialResponse.data.standard;
            }
          } catch (materialError) {
            console.warn('获取物料主数据失败:', materialError);
          }
        }
      }
    }
    
    // 如果收货单items为空但收货单存在，尝试从订单获取物料项
    if (data.items.length === 0 && data.order_id) {
      console.log('尝试从订单获取物料项数据');
      try {
        const orderResponse = await purchaseApi.getOrder(data.order_id);
        console.log('从订单获取的数据:', orderResponse);
        
        if (orderResponse && orderResponse.data) {
          if (Array.isArray(orderResponse.data.items) && orderResponse.data.items.length > 0) {
            console.log('从订单中获取到物料项:', orderResponse.data.items);
            
            // 转换订单物料项到收货单物料项
            data.items = orderResponse.data.items.map(item => ({
              material_id: item.material_id,
              material_name: item.material_name,
              material_code: item.material_code || item.code,
              specification: item.specs || item.specification || item.standard || item.model || item.spec,
              unit: item.unit,
              unit_name: item.unit_name,
              ordered_quantity: Number(item.quantity || 0),
              received_quantity: Number(item.received_quantity || 0),
              qualified_quantity: Number(item.qualified_quantity || 0),
              remarks: item.remarks || ''
            }));
          }
        }
      } catch (extraError) {
        console.warn('尝试额外获取物料项数据失败:', extraError);
      }
    }
    
    viewDialog.receipt = data;
    viewDialog.show = true;
  } catch (error) {
    console.error('获取收货单详情失败:', error);
    showSnackbar('获取收货单详情失败: ' + (error.message || '未知错误'), 'error');
  } finally {
    detailLoading.value = false;
  }
}

// 方法：编辑收货单
function editReceipt(receipt) {
  receiptDialog.isEdit = true;
  receiptDialog.form = {
    id: receipt.id,
    orderId: receipt.order_id,
    receiptDate: receipt.receipt_date,
    receiver: receipt.operator,
    warehouseId: receipt.warehouse_id,
    inspectionId: receipt.inspection_id,
    remarks: receipt.remarks,
    items: [...(receipt.items || [])].map(item => ({
      ...item,
      materialId: item.material_id,
      materialName: item.material_name,
      unitId: item.unit_id,
      unitName: item.unit_name,
      receivedQuantity: Number(item.received_quantity),
      qualifiedQuantity: Number(item.qualified_quantity),
      orderedQuantity: Number(item.ordered_quantity)
    }))
  };
  receiptDialog.show = true;
}

// 方法：处理订单选择变更
async function handleOrderChange(orderId) {
  if (!orderId) {
    receiptDialog.form.items = [];
    return;
  }
  
  try {
    const { data } = await purchaseApi.getOrder(orderId);
    if (!data) {
      showSnackbar('获取订单详情失败', 'error');
      return;
    }
    
    console.log('选择的订单数据:', data);
    
    // 获取订单中的供应商ID
    // 兼容处理不同的字段命名方式
    const supplierId = data.supplierId || data.supplier_id;
    if (supplierId) {
      receiptDialog.form.supplierId = supplierId;
      console.log('设置供应商ID:', supplierId);
    }
    
    // 提取订单中每个物料项的仓库ID（如果存在）
    const uniqueWarehouseIds = new Set();
    
    // 处理订单物料项 - 兼容不同的数据结构
    const orderItems = Array.isArray(data.items) ? data.items : [];
    console.log('订单物料项数量:', orderItems.length);
    
    if (orderItems.length === 0) {
      console.warn('订单中没有物料项');
      showSnackbar('订单中无物料项，请手动添加', 'warning');
    }
    
    receiptDialog.form.items = orderItems.map(item => {
      // 规范化物料项字段，兼容不同命名方式
      const materialId = item.materialId || item.material_id;
      const materialCode = item.materialCode || item.material_code;
      const materialName = item.materialName || item.material_name;
      const specification = item.specification || item.specs;
      const unitId = item.unitId || item.unit_id;
      const unitName = item.unitName || item.unit_name;
      const quantity = item.quantity || item.ordered_quantity || 0;
      const price = item.price || item.unit_price || 0;
      // 获取仓库ID并直接转换为数字类型
      const originalWarehouseId = item.warehouseId || item.warehouse_id || null;
      const warehouseId = originalWarehouseId !== null ? Number(originalWarehouseId) : null;
      
      // 记录转换信息
      console.log(`物料项: ${materialName}, ID: ${materialId}, 数量: ${quantity}, 
                 原始仓库ID: ${originalWarehouseId}, 原始类型: ${typeof originalWarehouseId},
                 转换后仓库ID: ${warehouseId}, 转换后类型: ${typeof warehouseId}`);
      
      // 如果物料有仓库ID，添加到集合中 (使用转换后的数字类型)
      if (warehouseId !== null) {
        uniqueWarehouseIds.add(warehouseId);
      }
      
      return {
        materialId,
        materialCode,
        materialName,
        specification,
        unitId,
        unitName,
        orderedQuantity: Number(quantity),
        receivedQuantity: 0,
        qualifiedQuantity: 0,
        price: Number(price),
        warehouseId, // 使用转换后的数字类型ID
        warehouse_id: warehouseId, // 添加备用字段名
        location_id: warehouseId, // 添加与后端匹配的字段名
        remarks: ''
      };
    });
    
    console.log('处理后的物料项:', receiptDialog.form.items);
    console.log('从订单中提取的仓库IDs:', Array.from(uniqueWarehouseIds));
    
    // 根据物料项中的仓库ID设置收货单表单级的仓库ID
    if (uniqueWarehouseIds.size === 1) {
      // 如果所有物料都使用同一个仓库，则设置表单级的仓库ID
      const warehouseId = Array.from(uniqueWarehouseIds)[0];
      const numericWarehouseId = Number(warehouseId);
      console.log('所有物料使用同一仓库，设置表单级仓库ID:', warehouseId, 
                 '类型:', typeof warehouseId, 
                 '转换后ID:', numericWarehouseId,
                 '转换后类型: number');
      receiptDialog.form.warehouseId = numericWarehouseId; // 使用转换后的数字类型
    } else if (uniqueWarehouseIds.size > 1) {
      // 如果物料使用不同仓库，清空表单级的仓库ID，将使用物料级的仓库ID
      console.log('物料使用不同仓库，将使用物料级仓库ID');
      receiptDialog.form.warehouseId = null;
    } else {
      // 如果没有在物料中找到仓库ID，则确保订单本身有仓库ID
      const orderWarehouseId = data.warehouseId || data.warehouse_id;
      if (orderWarehouseId) {
        const numericWarehouseId = Number(orderWarehouseId);
        console.log('使用订单级的仓库ID:', orderWarehouseId, 
                   '类型:', typeof orderWarehouseId, 
                   '转换后ID:', numericWarehouseId,
                   '转换后类型: number');
        receiptDialog.form.warehouseId = numericWarehouseId; // 使用转换后的数字类型
        
        // 设置所有物料项的仓库ID
        receiptDialog.form.items.forEach(item => {
          item.warehouseId = numericWarehouseId;
        });
      } else {
        // 如果订单本身也没有仓库ID，则保留表单级仓库ID为空，需要用户手动选择
        console.log('订单中未找到仓库ID，需要手动选择');
        receiptDialog.form.warehouseId = null;
      }
    }
    
    // 设置订单编号，便于用户参考
    // 不影响实际提交的数据，只作为显示用
    receiptDialog.orderNumber = data.order_number || data.orderNumber || data.order_no || '';
  } catch (error) {
    console.error('获取订单详情失败:', error);
    showSnackbar('获取订单详情失败', 'error');
  }
}

// 方法：验证仓库ID是否存在于可用仓库列表中
function validateWarehouseId(warehouseId) {
  if (!warehouseId) return false;
  
  // 转换为数字类型进行比较
  const numericId = Number(warehouseId);
  if (isNaN(numericId)) {
    console.error(`无效的仓库ID格式: "${warehouseId}"，无法转换为数字`);
    return false;
  }
  
  // 检查ID是否在可用仓库列表中
  const found = warehouses.value.some(warehouse => Number(warehouse.id) === numericId);
  if (!found) {
    console.warn(`仓库ID ${numericId} 不在可用的仓库列表中`);
    const availableIds = warehouses.value.map(w => `${w.id} (${w.name})`).join(', ');
    console.warn(`可用的仓库: ${availableIds}`);
  }
  return found;
}

// 方法：提交收货单
const submitReceipt = async () => {
  if (!receiptDialog.form.inspectionId) {
    showSnackbar('请选择合格的来料检验单', 'warning');
    return;
  }

  try {
    await receiptForm.value.validate();
    
    // 验证必要字段
    if (!receiptDialog.form.orderId) {
      showSnackbar('请选择关联订单', 'warning');
      return;
    }
    
    // 验证物料数量
    const invalidItems = receiptDialog.form.items.filter(item => 
      !item.receivedQuantity || item.receivedQuantity <= 0 || 
      !item.qualifiedQuantity || item.qualifiedQuantity <= 0 ||
      item.qualifiedQuantity > item.receivedQuantity
    );
    
    if (invalidItems.length > 0) {
      showSnackbar('请检查物料数量，确保实收数量和合格数量大于0，且合格数量不超过实收数量', 'warning');
      return;
    }

    submitLoading.value = true;
    
    // 准备提交数据
    const submitData = {
      order_id: receiptDialog.form.orderId, // 添加必要的orderId字段
      orderId: receiptDialog.form.orderId, // 添加驼峰命名格式
      inspection_id: receiptDialog.form.inspectionId,
      inspectionId: receiptDialog.form.inspectionId, // 添加驼峰命名格式
      receipt_date: receiptDialog.form.receiptDate,
      receiptDate: receiptDialog.form.receiptDate, // 添加驼峰命名格式
      supplier_id: receiptDialog.form.supplierId,
      supplierId: receiptDialog.form.supplierId, // 添加驼峰命名格式
      receiver: receiptDialog.form.receiver,
      warehouse_id: receiptDialog.form.warehouseId,
      warehouseId: receiptDialog.form.warehouseId, // 添加驼峰命名格式
      remarks: receiptDialog.form.remarks,
      items: receiptDialog.form.items.map(item => ({
        material_id: item.materialId,
        materialId: item.materialId, // 添加驼峰命名格式
        received_quantity: item.receivedQuantity,
        receivedQuantity: item.receivedQuantity, // 添加驼峰命名格式
        qualified_quantity: item.qualifiedQuantity,
        qualifiedQuantity: item.qualifiedQuantity, // 添加驼峰命名格式
        remarks: item.remarks
      }))
    };

    console.log('准备提交的收货单数据:', submitData);
    
    // 提交数据
    const response = await purchaseApi.createReceipt(submitData);
    
    if (response.data) {
      showSnackbar('收货单创建成功', 'success');
      closeReceiptDialog();
      loadReceipts(); // 修改为调用loadReceipts方法而不是fetchData
    }
  } catch (error) {
    console.error('提交收货单失败:', error);
    showSnackbar('提交收货单失败: ' + (error.response?.data?.message || error.message), 'error');
  } finally {
    submitLoading.value = false;
  }
};

// 方法：打开更新状态对话框
function openUpdateStatusDialog(receipt) {
  statusDialog.receiptId = receipt.id;
  statusDialog.currentStatus = receipt.status;
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

// 方法：更新收货单状态
async function updateReceiptStatus() {
  if (!statusDialog.status) {
    showSnackbar('请选择一个状态', 'warning');
    return;
  }

  updateStatusLoading.value = true;
  
  try {
    console.log('准备更新收货单状态:', {
      receiptId: statusDialog.receiptId,
      status: statusDialog.status,
      remarks: statusDialog.remarks
    });
    
    await purchaseApi.updateReceiptStatus(statusDialog.receiptId, {
      status: statusDialog.status,
      remarks: statusDialog.remarks
    });
    
    showSnackbar('收货单状态已更新', 'success');
    statusDialog.show = false;
    loadReceipts();
  } catch (error) {
    console.error('更新收货单状态失败:', error);
    let errorMessage = '更新收货单状态失败';
    
    if (error.response && error.response.data) {
      if (typeof error.response.data === 'string') {
        errorMessage += ': ' + error.response.data;
      } else if (error.response.data.message) {
        errorMessage += ': ' + error.response.data.message;
      } else if (error.response.data.error) {
        errorMessage += ': ' + error.response.data.error;
      } else {
        errorMessage += ': ' + (error.message || '未知错误');
      }
      console.error('错误响应数据:', error.response.data);
    } else {
      errorMessage += ': ' + (error.message || '未知错误');
    }
    
    showSnackbar(errorMessage, 'error');
  } finally {
    updateStatusLoading.value = false;
  }
}

// 格式化货币金额
const formatCurrency = (value) => {
  if (!value) return '¥0.00';
  return '¥' + parseFloat(value).toFixed(2);
};

// 加载收货单统计数据
const loadReceiptStats = async () => {
  console.log('调用loadReceiptStats，purchaseApi类型:', typeof purchaseApi);
  console.log('purchaseApi内容:', JSON.stringify(Object.keys(purchaseApi || {})));
  
  try {
    // 检查purchaseApi是否存在且getReceiptStats是一个函数
    if (!purchaseApi) {
      console.error('purchaseApi对象未定义!');
      // 设置默认值
      receiptStats.value = {
        total: 0,
        draftCount: 0,
        confirmedCount: 0,
        completedCount: 0,
        totalAmount: 0
      };
      return;
    }
    
    if (typeof purchaseApi.getReceiptStats !== 'function') {
      console.error('purchaseApi.getReceiptStats不是一个函数！可用方法：', 
                   JSON.stringify(Object.keys(purchaseApi)));
      
      // 尝试重新构建一个getReceiptStats函数
      const tempGetStats = async () => {
        try {
          const response = await axios.get(API_URL + '/api/purchase/receipts-statistics');
          return response;
        } catch (error) {
          console.error('手动调用收货单统计API失败:', error);
          return {
            data: {
              total: 0,
              draftCount: 0,
              confirmedCount: 0,
              completedCount: 0,
              totalAmount: 0
            }
          };
        }
      };
      
      // 使用临时函数获取数据
      const response = await tempGetStats();
      if (response && response.data) {
        receiptStats.value = response.data;
      } else {
        // 设置默认值
        receiptStats.value = {
          total: 0,
          draftCount: 0,
          confirmedCount: 0,
          completedCount: 0,
          totalAmount: 0
        };
      }
      return;
    }
    
    console.log('调用purchaseApi.getReceiptStats()...');
    const response = await purchaseApi.getReceiptStats();
    console.log('getReceiptStats响应:', response);
    
    if (response && response.data) {
      receiptStats.value = response.data;
    } else {
      console.error('获取收货单统计数据失败: 响应格式不正确', response);
      // 设置默认值
      receiptStats.value = {
        total: 0,
        draftCount: 0,
        confirmedCount: 0,
        completedCount: 0,
        totalAmount: 0
      };
    }
  } catch (error) {
    console.error('获取收货单统计数据失败:', error);
    // 设置默认值
    receiptStats.value = {
      total: 0,
      draftCount: 0,
      confirmedCount: 0,
      completedCount: 0,
      totalAmount: 0
    };
  }
};

// 方法：处理来料检验单选择变更
const handleInspectionChange = async (inspectionId) => {
  if (!inspectionId) {
    receiptDialog.form.items = [];
    return;
  }

  try {
    console.log('开始获取来料检验单详情，ID:', inspectionId);
    
    // 获取来料检验单详情
    const response = await qualityApi.getIncomingInspection(inspectionId);
    console.log('来料检验单API响应:', response);

    if (!response) {
      throw new Error('API响应为空');
    }

    if (!response.data) {
      throw new Error('API响应中没有data字段');
    }

    // 检查响应格式
    if (response.data.success === false) {
      throw new Error(response.data.message || '获取来料检验单详情失败');
    }

    // 获取检验单数据
    const inspection = response.data.data || response.data;
    console.log('解析后的检验单数据:', inspection);

    if (!inspection) {
      throw new Error('无法获取检验单数据');
    }

    // 打印检验单的所有字段，帮助调试
    console.log('检验单所有字段:', Object.keys(inspection));
    
    // 变量定义
    let supplierId = null;
    let supplierName = null;
    let isSupplierFound = false;
    
    // 1. 首先尝试从检验单直接获取供应商信息
    supplierId = inspection.supplier_id || inspection.supplierId || inspection.supplier?.id;
    supplierName = inspection.supplier_name || inspection.supplierName || 
                  inspection.supplier?.name || inspection.supplier?.company_name;
    
    if (supplierId) {
      receiptDialog.form.supplierId = supplierId;
      console.log('从检验单中直接获取供应商ID:', supplierId);
      isSupplierFound = true;
      
      // 如果没有供应商名称，从供应商列表中查找
      if (!supplierName) {
        const supplier = suppliers.value.find(s => Number(s.id) === Number(supplierId) || Number(s.supplier_id) === Number(supplierId));
        if (supplier) {
          supplierName = supplier.name || supplier.supplier_name;
          console.log('根据ID查找到供应商名称:', supplierName);
        }
      }
    } else if (supplierName) {
      console.log('从检验单中找到供应商名称:', supplierName);
      
      // 在供应商列表中查找匹配的供应商
      const matchedSupplier = suppliers.value.find(s => 
        s.name === supplierName || 
        s.supplier_name === supplierName || 
        s.companyName === supplierName
      );
      
      if (matchedSupplier) {
        console.log('根据名称找到匹配的供应商:', matchedSupplier);
        receiptDialog.form.supplierId = matchedSupplier.id || matchedSupplier.supplier_id;
        console.log('根据供应商名称设置供应商ID:', receiptDialog.form.supplierId);
        isSupplierFound = true;
      }
    }
    
    // 2. 如果从检验单中未找到供应商信息，尝试通过reference_id(采购订单ID)获取
    if (!isSupplierFound && inspection.reference_id) {
      console.log('从参考订单获取供应商信息, 参考订单ID:', inspection.reference_id);
      try {
        // 尝试获取订单详情
        const orderResponse = await purchaseApi.getOrder(inspection.reference_id);
        if (orderResponse && orderResponse.data) {
          const orderData = orderResponse.data;
          console.log('获取到的订单数据:', orderData);
          
          // 从订单中提取供应商ID和名称
          const orderSupplierId = orderData.supplier_id || orderData.supplierId;
          const orderSupplierName = orderData.supplier_name || orderData.supplierName;
          
          if (orderSupplierId) {
            receiptDialog.form.supplierId = Number(orderSupplierId);
            console.log('从订单中设置供应商ID:', receiptDialog.form.supplierId);
            isSupplierFound = true;
            
            // 记录供应商名称
            if (orderSupplierName) {
              supplierName = orderSupplierName;
              console.log('从订单中获取供应商名称:', supplierName);
            }
          }
        }
      } catch (orderError) {
        console.error('获取参考订单详情失败:', orderError);
      }
    }
    
    // 3. 如果通过reference_no(采购单号)查找
    if (!isSupplierFound && inspection.reference_no) {
      console.log('通过订单号查找供应商, 订单号:', inspection.reference_no);
      try {
        // 在已加载的订单列表中查找匹配的订单
        const matchedOrder = orders.value.find(order => 
          order.orderNumber === inspection.reference_no || 
          order.order_number === inspection.reference_no ||
          order.no === inspection.reference_no
        );
        
        if (matchedOrder) {
          console.log('在订单列表中找到匹配订单:', matchedOrder);
          const orderSupplierId = matchedOrder.supplier_id || matchedOrder.supplierId;
          const orderSupplierName = matchedOrder.supplier_name || matchedOrder.supplierName;
          
          if (orderSupplierId) {
            receiptDialog.form.supplierId = Number(orderSupplierId);
            console.log('从匹配订单设置供应商ID:', receiptDialog.form.supplierId);
            isSupplierFound = true;
            
            // 记录供应商名称
            if (orderSupplierName) {
              supplierName = orderSupplierName;
              console.log('从匹配订单获取供应商名称:', supplierName);
            }
          }
        } else {
          console.log('未在本地订单列表中找到匹配订单，尝试从API获取');
          // 如果本地没有匹配的订单，尝试从API获取
          const ordersResponse = await purchaseApi.getOrders({
            orderNumber: inspection.reference_no,
            limit: 1
          });
          
          if (ordersResponse && ordersResponse.data) {
            let orderData;
            if (Array.isArray(ordersResponse.data) && ordersResponse.data.length > 0) {
              orderData = ordersResponse.data[0];
            } else if (ordersResponse.data.items && ordersResponse.data.items.length > 0) {
              orderData = ordersResponse.data.items[0];
            }
            
            if (orderData) {
              console.log('API返回的匹配订单:', orderData);
              const orderSupplierId = orderData.supplier_id || orderData.supplierId;
              const orderSupplierName = orderData.supplier_name || orderData.supplierName;
              
              if (orderSupplierId) {
                receiptDialog.form.supplierId = Number(orderSupplierId);
                console.log('从API获取的订单中设置供应商ID:', receiptDialog.form.supplierId);
                isSupplierFound = true;
                
                // 记录供应商名称
                if (orderSupplierName) {
                  supplierName = orderSupplierName;
                  console.log('从API获取的订单中获取供应商名称:', supplierName);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('通过订单号查找供应商失败:', error);
      }
    }
    
    // 4. 根据获取到的供应商ID查找供应商对象
    if (isSupplierFound && receiptDialog.form.supplierId && !supplierName) {
      // 在供应商列表中查找匹配的供应商，以获取更多信息
      const supplier = suppliers.value.find(s => 
        Number(s.id) === Number(receiptDialog.form.supplierId) || 
        Number(s.supplier_id) === Number(receiptDialog.form.supplierId)
      );
      
      if (supplier) {
        supplierName = supplier.name || supplier.supplier_name;
        console.log('通过ID找到供应商对象:', supplier);
        console.log('设置供应商名称:', supplierName);
      } else {
        console.warn('在供应商列表中未找到ID为', receiptDialog.form.supplierId, '的供应商');
        
        // 尝试从API获取供应商详情
        try {
          const supplierResponse = await baseDataApi.getSupplier(receiptDialog.form.supplierId);
          if (supplierResponse && supplierResponse.data) {
            const supplierData = supplierResponse.data;
            supplierName = supplierData.name || supplierData.supplier_name || supplierData.company_name;
            console.log('从API获取供应商详情:', supplierData);
            console.log('设置供应商名称:', supplierName);
            
            // 关键修改：将获取到的供应商添加到供应商列表中，确保下拉框能正确显示
            if (!suppliers.value.some(s => Number(s.id) === Number(receiptDialog.form.supplierId))) {
              suppliers.value.push({
                id: receiptDialog.form.supplierId,
                supplier_id: receiptDialog.form.supplierId,
                name: supplierName,
                supplier_name: supplierName
              });
              console.log('将供应商添加到列表中以确保正确显示:', supplierName);
            }
          }
        } catch (suppError) {
          console.error('获取供应商详情失败:', suppError);
        }
      }
    }
    
    // 5. 如果仍未找到供应商，提示用户手动选择
    if (!isSupplierFound) {
      console.warn('无法自动确定供应商，需要手动选择');
      showSnackbar('未能自动识别供应商，请手动选择', 'warning');
    } else {
      // 显示找到的供应商名称
      if (supplierName) {
        // 保存找到的供应商名称到响应式变量
        selectedSupplierName.value = supplierName;
        console.log('保存供应商名称:', supplierName);
        
        // 强制更新表单，确保UI显示正确
        setTimeout(() => {
          // 这个小技巧可以强制刷新el-select的显示
          const tempId = receiptDialog.form.supplierId;
          receiptDialog.form.supplierId = null;
          setTimeout(() => {
            receiptDialog.form.supplierId = tempId;
          }, 10);
        }, 100);
      }
    }

    // 检查物料信息 - 从检验单根级别获取
    console.log('检验单物料信息:', {
      material_id: inspection.material_id,
      item_name: inspection.item_name,
      quantity: inspection.quantity,
      unit: inspection.unit
    });

    // 尝试从检验单获取关联订单信息
    if (inspection.reference_id) {
      // 如果检验单中包含reference_id（订单ID）
      const orderId = inspection.reference_id;
      console.log('从检验单获取到关联订单ID:', orderId);
      receiptDialog.form.orderId = Number(orderId);
      
      // 在订单列表中查找匹配的订单
      const matchedOrder = orders.value.find(order => Number(order.id) === Number(orderId));
      if (matchedOrder) {
        console.log('找到匹配的订单:', matchedOrder);
      } else {
        console.log('未找到匹配的订单，可能需要从服务器重新获取');
      }
    } else if (inspection.reference_no) {
      // 如果检验单中包含reference_no（订单编号）
      const orderNo = inspection.reference_no;
      console.log('从检验单获取到关联订单编号:', orderNo);
      
      // 在订单列表中查找匹配的订单
      const matchedOrder = orders.value.find(order => 
        order.orderNumber === orderNo || 
        order.order_number === orderNo ||
        order.order_no === orderNo ||
        order.no === orderNo
      );
      
      if (matchedOrder) {
        console.log('根据订单号找到匹配的订单:', matchedOrder);
        receiptDialog.form.orderId = Number(matchedOrder.id);
      } else {
        console.log('未找到匹配的订单，尝试从服务器获取');
        // 尝试从服务器获取订单信息
        try {
          const ordersResponse = await purchaseApi.getOrders({
            orderNumber: orderNo,
            limit: 1
          });
          
          if (ordersResponse && ordersResponse.data) {
            let orderData;
            if (Array.isArray(ordersResponse.data) && ordersResponse.data.length > 0) {
              orderData = ordersResponse.data[0];
            } else if (ordersResponse.data.items && ordersResponse.data.items.length > 0) {
              orderData = ordersResponse.data.items[0];
            }
            
            if (orderData) {
              console.log('从服务器获取到匹配的订单:', orderData);
              receiptDialog.form.orderId = Number(orderData.id);
            }
          }
        } catch (orderError) {
          console.error('获取订单信息失败:', orderError);
        }
      }
    }

    // 创建单个物料项
    const materialItem = {
      materialId: inspection.material_id || '',
      materialCode: inspection.material_code || '',
      materialName: inspection.item_name || inspection.material_name || '未知物料',
      specification: inspection.specification || inspection.standard || '',
      unitName: inspection.unit || '个',
      orderedQuantity: Number(inspection.quantity) || 0,
      receivedQuantity: Number(inspection.quantity) || 0, // 默认实收数量等于检验数量
      qualifiedQuantity: Number(inspection.quantity) || 0, // 默认合格数量等于检验数量
      remarks: inspection.note || ''
    };

    console.log('创建的物料项:', materialItem);

    // 设置物料信息
    receiptDialog.form.items = [materialItem];
    
    console.log('设置后的物料项:', receiptDialog.form.items);
    
    // 强制更新视图
    receiptDialog.form = { ...receiptDialog.form };
    
    // 显示成功消息
    showSnackbar(`成功加载物料信息`, 'success');
  } catch (error) {
    console.error('获取来料检验单详情失败:', error);
    showSnackbar(`获取来料检验单详情失败: ${error.message || '未知错误'}`, 'error');
    receiptDialog.form.items = [];
  }
};

// 方法：搜索收货单
function searchReceipts() {
  // 处理日期范围
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    searchForm.startDate = searchForm.dateRange[0];
    searchForm.endDate = searchForm.dateRange[1];
  } else {
    searchForm.startDate = '';
    searchForm.endDate = '';
  }
  
  // 重置页码
  pagination.value.current = 1;
  
  // 加载数据
  loadReceipts();
}

// 方法：处理当前页面变更
function handleCurrentChange(page) {
  pagination.value.current = page;
  loadReceipts();
}

// 打印收货单
function printReceipt() {
  if (!viewDialog.receipt || !viewDialog.receipt.id) {
    showSnackbar('收货单数据不完整，无法打印', 'warning');
    return;
  }
  
  // 获取收货单数据
  const receipt = { ...viewDialog.receipt };
  
  // 过滤掉状态变更记录
  if (receipt.remarks) {
    // 使用与viewReceipt函数相同的正则过滤逻辑
    receipt.remarks = receipt.remarks.replace(/\s*\|\s*\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]\s*状态变更为\s+[^|]+/g, '');
    receipt.remarks = receipt.remarks.replace(/^\s*\|\s*/, '').replace(/\s*\|\s*$/, '').trim();
  }
  
  // 创建样式
  const styles = `
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1 { text-align: center; }
      .receipt-info { margin-bottom: 20px; }
      .receipt-info div { margin-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
      th { background-color: #f2f2f2; }
      .right { text-align: right; }
      .footer { margin-top: 30px; display: flex; justify-content: space-between; }
      .signature { width: 45%; }
      .signature div { margin-top: 50px; border-top: 1px solid #000; padding-top: 5px; }
    </style>
  `;
  
  // 创建HTML内容
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>收货单 #${receipt.receipt_no}</title>
      ${styles}
    </head>
    <body>
      <h1>采购收货单</h1>
      <div class="receipt-info">
        <div><strong>收货单号:</strong> ${receipt.receipt_no}</div>
        <div><strong>收货日期:</strong> ${formatDate(receipt.receipt_date)}</div>
        <div><strong>关联订单:</strong> ${receipt.order_no || '-'}</div>
        <div><strong>供应商:</strong> ${receipt.supplier_name || '-'}</div>
        <div><strong>收货人:</strong> ${receipt.operator || '-'}</div>
        <div><strong>入库仓库:</strong> ${receipt.warehouse_name || '-'}</div>
        <div><strong>状态:</strong> ${getStatusText(receipt.status)}</div>
        <div><strong>备注:</strong> ${receipt.remarks || '-'}</div>
      </div>
      
      <h2>物料清单</h2>
      <table>
        <thead>
          <tr>
            <th>序号</th>
            <th>物料名称</th>
            <th>规格</th>
            <th>单位</th>
            <th>订单数量</th>
            <th>实收数量</th>
            <th>合格数量</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          ${(receipt.items || []).map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.material_name || '-'}</td>
              <td>${item.specification || '-'}</td>
              <td>${item.unit_name || '-'}</td>
              <td class="right">${item.ordered_quantity || 0}</td>
              <td class="right">${item.received_quantity || 0}</td>
              <td class="right">${item.qualified_quantity || 0}</td>
              <td>${item.remarks || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <div class="signature">
          <div>收货人签字</div>
        </div>
        <div class="signature">
          <div>供应商签字</div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // 创建打印窗口
  const printWindow = window.open('', '_blank');
  printWindow.document.write(content);
  printWindow.document.close();
  
  // 等待页面加载完成后打印
  printWindow.onload = function() {
    printWindow.print();
    // 打印完成后关闭窗口
    // printWindow.close();
  };
}

// 方法：获取当前选择的供应商名称
function getSelectedSupplierName(supplierId) {
  if (!supplierId) return '未选择供应商';
  
  // 如果已经有选定的供应商名称，直接返回
  if (selectedSupplierName.value) {
    return selectedSupplierName.value;
  }
  
  // 确保转换为数字类型进行比较
  const numericId = Number(supplierId);
  
  console.log('正在查找供应商，ID:', numericId);
  console.log('当前供应商列表:', suppliers.value);
  
  // 在供应商列表中查找
  const supplier = suppliers.value.find(s => {
    const sid = Number(s.id || s.supplier_id);
    const match = sid === numericId;
    console.log(`比较供应商: ${s.name || s.supplier_name} (ID: ${sid}) 与 ${numericId}, 匹配: ${match}`);
    return match;
  });
  
  if (supplier) {
    console.log('找到匹配供应商:', supplier);
    return supplier.name || supplier.supplier_name;
  } else {
    // 手动遍历供应商列表查找最接近的匹配
    console.log('未找到精确匹配，尝试手动查找');
    
    // 返回ID信息
    return `供应商(ID: ${numericId})`;
  }
}

// 方法：获取对象中所有的字符串字段
function getAllStringFields(item) {
  if (!item) return {};
  
  const result = {};
  for (const [key, value] of Object.entries(item)) {
    if (typeof value === 'string' && value.trim() !== '') {
      result[key] = value;
    }
  }
  return result;
}

// 添加在合适的位置，例如在updateReceiptStatus函数后面
// 方法：直接确定收货单（将状态更新为已完成）
async function confirmReceipt(receipt) {
  updateStatusLoading.value = true;
  
  try {
    await purchaseApi.updateReceiptStatus(receipt.id, {
      status: 'completed',
      remarks: '用户通过确定按钮完成入库'
    });
    
    showSnackbar('收货单已确定完成', 'success');
    loadReceipts();
  } catch (error) {
    console.error('确定收货单失败:', error);
    let errorMessage = '确定收货单失败';
    
    if (error.response && error.response.data) {
      if (typeof error.response.data === 'string') {
        errorMessage += ': ' + error.response.data;
      } else if (error.response.data.message) {
        errorMessage += ': ' + error.response.data.message;
      } else if (error.response.data.error) {
        errorMessage += ': ' + error.response.data.error;
      } else {
        errorMessage += ': ' + (error.message || '未知错误');
      }
    } else {
      errorMessage += ': ' + (error.message || '未知错误');
    }
    
    showSnackbar(errorMessage, 'error');
  } finally {
    updateStatusLoading.value = false;
  }
}

// 在合适的位置添加直接确认入库的函数
// 方法：直接确认入库（将状态更新为confirmed）
async function directConfirmReceipt(receipt) {
  updateStatusLoading.value = true;
  
  try {
    await purchaseApi.updateReceiptStatus(receipt.id, {
      status: 'confirmed',
      remarks: '用户直接确认入库'
    });
    
    showSnackbar('入库单已确认', 'success');
    loadReceipts();
  } catch (error) {
    console.error('确认入库失败:', error);
    let errorMessage = '确认入库失败';
    
    if (error.response && error.response.data) {
      if (typeof error.response.data === 'string') {
        errorMessage += ': ' + error.response.data;
      } else if (error.response.data.message) {
        errorMessage += ': ' + error.response.data.message;
      } else if (error.response.data.error) {
        errorMessage += ': ' + error.response.data.error;
      } else {
        errorMessage += ': ' + (error.message || '未知错误');
      }
    } else {
      errorMessage += ': ' + (error.message || '未知错误');
    }
    
    showSnackbar(errorMessage, 'error');
  } finally {
    updateStatusLoading.value = false;
  }
}
</script>

<style scoped>
.purchase-receipts-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.search-card {
  margin-bottom: 16px;
}

.statistics-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 140px;
  text-align: center;
  cursor: default;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #409EFF;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.data-card {
  margin-bottom: 16px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

.no-data-info {
  padding: 20px 0;
}

/* 操作按钮样式 */
.table-operations {
  display: flex;
  gap: 8px;
  align-items: center;
}

.operation-group {
  display: flex;
  gap: 4px;
}

.operation-group:not(:last-child) {
  border-right: 1px solid #ebeef5;
  padding-right: 8px;
}
</style> 
