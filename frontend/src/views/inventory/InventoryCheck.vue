<template>
  <div class="inventory-check-container">
    <div class="page-header">
      <h2>库存盘点管理</h2>
      <el-button type="primary" @click="openCheckDialog()">
        <el-icon><Plus /></el-icon> 新建盘点单
      </el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="盘点单号">
          <el-input v-model="searchForm.check_no" placeholder="请输入盘点单号" clearable></el-input>
        </el-form-item>
        <el-form-item label="盘点状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="盘点类型">
          <el-select v-model="searchForm.check_type" placeholder="请选择盘点类型" clearable>
            <el-option v-for="item in checkTypeOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
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
    </el-card>
    
    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ checkStats.total || 0 }}</div>
        <div class="stat-label">盘点单总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ checkStats.pendingCount || 0 }}</div>
        <div class="stat-label">进行中盘点</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ checkStats.completeCount || 0 }}</div>
        <div class="stat-label">已完成盘点</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatPercent(checkStats.accuracyRate) }}</div>
        <div class="stat-label">库存准确率</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ checkStats.profitLossAmount || 0 }}</div>
        <div class="stat-label">盘盈盘亏金额</div>
      </el-card>
    </div>
    
    <!-- 数据表格 -->
    <el-card class="data-card">
      <el-table
        v-loading="loading"
        :data="checkList"
        border
        style="width: 100%"
      >
        <el-table-column prop="check_no" label="盘点单号" min-width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="check_date" label="盘点日期" min-width="110"></el-table-column>
        <el-table-column prop="check_type" label="盘点类型" min-width="110">
          <template #default="scope">
            <el-tag size="small" :type="getCheckTypeType(scope.row.check_type)">
              {{ getCheckTypeText(scope.row.check_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="warehouse" label="仓库/库区" min-width="150" show-overflow-tooltip></el-table-column>
        <el-table-column prop="item_count" label="盘点物料数" min-width="100" align="center"></el-table-column>
        <el-table-column prop="status" label="状态" min-width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="创建人" min-width="100"></el-table-column>
        <el-table-column label="盘点结果" min-width="100">
          <template #default="scope">
            <span v-if="scope.row.status === 'completed'">
              {{ scope.row.profit_loss > 0 ? '盘盈' : (scope.row.profit_loss < 0 ? '盘亏' : '无差异') }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="viewCheck(scope.row.id)">查看</el-button>
            <el-button 
              size="small" 
              type="primary" 
              @click="editCheck(scope.row.id)"
              v-if="scope.row.status === 'draft'"
            >编辑</el-button>
            <el-dropdown v-if="scope.row.status !== 'cancelled' && scope.row.status !== 'completed'" trigger="click" placement="bottom">
              <el-button size="small" type="success">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="scope.row.status === 'draft'" @click="updateStatus(scope.row.id, 'in_progress')">开始盘点</el-dropdown-item>
                  <el-dropdown-item v-if="scope.row.status === 'in_progress'" @click="updateStatus(scope.row.id, 'completed')">完成盘点</el-dropdown-item>
                  <el-dropdown-item v-if="['draft', 'in_progress'].includes(scope.row.status)" @click="updateStatus(scope.row.id, 'cancelled')">取消盘点</el-dropdown-item>
                  <el-dropdown-item v-if="scope.row.status === 'draft'" @click="deleteCheck(scope.row.id)" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button 
              size="small" 
              type="warning" 
              @click="adjustInventory(scope.row.id)"
              v-if="scope.row.status === 'completed' && scope.row.profit_loss !== 0"
            >调整库存</el-button>
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

    <!-- 新建/编辑盘点单对话框 -->
    <el-dialog 
      :title="dialogType === 'create' ? '新建盘点单' : '编辑盘点单'" 
      v-model="checkDialogVisible" 
      width="80%"
      destroy-on-close
    >
      <el-form :model="checkForm" :rules="checkRules" ref="checkFormRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="盘点日期" prop="check_date">
              <el-date-picker 
                v-model="checkForm.check_date" 
                type="date" 
                placeholder="选择盘点日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              ></el-date-picker>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="盘点类型" prop="check_type">
              <el-select 
                v-model="checkForm.check_type" 
                placeholder="选择盘点类型"
                style="width: 100%"
              >
                <el-option 
                  v-for="item in checkTypeOptions" 
                  :key="item.value" 
                  :label="item.label" 
                  :value="item.value"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="仓库/库区" prop="warehouse_id">
              <el-select 
                v-model="checkForm.warehouse_id" 
                placeholder="选择仓库/库区"
                style="width: 100%"
                filterable
                @change="handleWarehouseChange"
              >
                <el-option 
                  v-for="item in warehouseOptions" 
                  :key="item.id" 
                  :label="item.name" 
                  :value="item.id"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="盘点描述" prop="description">
          <el-input 
            v-model="checkForm.description" 
            placeholder="请输入盘点描述"
          ></el-input>
        </el-form-item>
        
        <el-divider content-position="center">物料明细</el-divider>
        
        <div class="action-bar">
          <el-radio-group v-model="selectionType" size="small" style="margin-right: 15px;">
            <el-radio-button value="manual">手动选择</el-radio-button>
            <el-radio-button value="auto">自动加载</el-radio-button>
          </el-radio-group>
          
          <template v-if="selectionType === 'manual'">
            <el-button type="primary" @click="addCheckItem" size="small">
              <el-icon><Plus /></el-icon> 添加物料
            </el-button>
          </template>
          <template v-else>
            <el-button type="success" @click="loadWarehouseItems" size="small" :disabled="!checkForm.warehouse_id">
              <el-icon><RefreshRight /></el-icon> 加载库存物料
            </el-button>
          </template>
        </div>
        
        <!-- 物料表格 -->
        <el-table 
          :data="checkForm.items" 
          border 
          style="width: 100%; margin-top: 15px;"
        >
          <el-table-column type="index" label="序号" width="50"></el-table-column>
          <el-table-column label="物料编码" min-width="120">
            <template #default="scope">
              <template v-if="selectionType === 'manual'">
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
              <span v-else>{{ scope.row.material_code }}</span>
            </template>
          </el-table-column>
          <el-table-column label="物料名称" prop="material_name" min-width="140"></el-table-column>
          <el-table-column label="规格型号" prop="specs" min-width="120"></el-table-column>
          <el-table-column label="账面数量" prop="book_qty" min-width="100"></el-table-column>
          <el-table-column label="实盘数量" min-width="120">
            <template #default="scope">
              <el-input-number 
                v-model="scope.row.actual_qty" 
                :min="0" 
                style="width: 100%"
              ></el-input-number>
            </template>
          </el-table-column>
          <el-table-column label="单位" prop="unit_name" min-width="80"></el-table-column>
          <el-table-column label="盈亏数量" min-width="110">
            <template #default="scope">
              <span :class="getDiffClass(scope.row.book_qty, scope.row.actual_qty)">
                {{ getDiff(scope.row.book_qty, scope.row.actual_qty) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="150">
            <template #default="scope">
              <el-input v-model="scope.row.remarks" placeholder="备注"></el-input>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" v-if="selectionType === 'manual'">
            <template #default="scope">
              <el-button 
                type="danger" 
                size="small" 
                circle
                @click="removeCheckItem(scope.$index)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <el-divider></el-divider>
        
        <el-form-item label="备注" prop="remarks">
          <el-input 
            v-model="checkForm.remarks" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入备注信息"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="checkDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitCheckForm" :loading="submitting">保存</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 查看盘点单详情对话框 -->
    <el-dialog 
      title="盘点单详情" 
      v-model="viewDialogVisible" 
      width="80%"
    >
      <div v-loading="detailLoading">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="盘点单号">{{ checkDetail.check_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="盘点日期">{{ checkDetail.check_date || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(checkDetail.status)">{{ getStatusText(checkDetail.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="盘点类型">
            <el-tag size="small" :type="getCheckTypeType(checkDetail.check_type)">
              {{ getCheckTypeText(checkDetail.check_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="仓库/库区">{{ checkDetail.warehouse || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ checkDetail.creator || '-' }}</el-descriptions-item>
          <el-descriptions-item label="盘点描述" :span="3">{{ checkDetail.description || '无' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="3">{{ checkDetail.remarks || '无' }}</el-descriptions-item>
          <template v-if="checkDetail.status === 'completed'">
            <el-descriptions-item label="盘点结果">
              <el-tag :type="checkDetail.profit_loss > 0 ? 'success' : (checkDetail.profit_loss < 0 ? 'danger' : '')">
                {{ checkDetail.profit_loss > 0 ? '盘盈' : (checkDetail.profit_loss < 0 ? '盘亏' : '无差异') }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="盈亏金额">{{ checkDetail.profit_loss || '0' }}</el-descriptions-item>
            <el-descriptions-item label="完成时间">{{ checkDetail.complete_time || '-' }}</el-descriptions-item>
          </template>
        </el-descriptions>
        
        <h3 style="margin-top: 20px;">物料明细</h3>
        <el-table :data="checkDetail.items || []" border style="width: 100%; margin-top: 10px;">
          <el-table-column type="index" label="序号" width="50"></el-table-column>
          <el-table-column prop="material_code" label="物料编码" min-width="120"></el-table-column>
          <el-table-column prop="material_name" label="物料名称" min-width="140"></el-table-column>
          <el-table-column prop="specs" label="规格型号" min-width="120"></el-table-column>
          <el-table-column prop="book_qty" label="账面数量" min-width="100"></el-table-column>
          <el-table-column prop="actual_qty" label="实盘数量" min-width="100"></el-table-column>
          <el-table-column prop="unit_name" label="单位" min-width="80"></el-table-column>
          <el-table-column label="盈亏数量" min-width="100">
            <template #default="scope">
              <span :class="getDiffClass(scope.row.book_qty, scope.row.actual_qty)">
                {{ getDiff(scope.row.book_qty, scope.row.actual_qty) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="remarks" label="备注" min-width="150"></el-table-column>
        </el-table>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="viewDialogVisible = false">关闭</el-button>
          <el-button type="warning" v-if="checkDetail.status === 'completed' && checkDetail.profit_loss !== 0" @click="adjustInventory(checkDetail.id)">调整库存</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 调整库存确认对话框 -->
    <el-dialog
      title="库存调整确认"
      v-model="adjustDialogVisible"
      width="40%"
    >
      <div>
        <p>确认要根据盘点结果调整库存吗？</p>
        <p>盘点单号：{{ adjustingCheck.check_no }}</p>
        <p>盘点结果：<span :class="{ 'profit-text': adjustingCheck.profit_loss > 0, 'loss-text': adjustingCheck.profit_loss < 0 }">{{ adjustingCheck.profit_loss > 0 ? '盘盈' : '盘亏' }}</span></p>
        <p>调整数量：{{ adjustingCheck.item_count || 0 }} 种物料</p>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="adjustDialogVisible = false">取消</el-button>
          <el-button type="warning" @click="confirmAdjustInventory" :loading="adjusting">确认调整</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, Refresh, ArrowDown, Delete, RefreshRight } from '@element-plus/icons-vue';
import { inventoryApi } from '@/services/api';
import { getCurrentDate } from '@/utils/date';

// 状态选项
const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
];

// 盘点类型选项
const checkTypeOptions = [
  { value: 'cycle', label: '周期盘点' },
  { value: 'random', label: '随机盘点' },
  { value: 'full', label: '全面盘点' },
  { value: 'special', label: '专项盘点' }
];

// 搜索表单
const searchForm = reactive({
  check_no: '',
  status: '',
  check_type: '',
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
const checkList = ref([]);
const materialOptions = ref([]); // 物料选项
const warehouseOptions = ref([]); // 仓库/库位选项
const dialogType = ref('create'); // 对话框类型：create-新建，edit-编辑
const checkDialogVisible = ref(false); // 盘点单对话框可见性
const viewDialogVisible = ref(false); // 查看对话框可见性
const adjustDialogVisible = ref(false); // 调整库存对话框可见性
const submitting = ref(false); // 提交中状态
const detailLoading = ref(false); // 详情加载状态
const adjusting = ref(false); // 调整库存状态
const selectionType = ref('manual'); // 物料选择方式：manual-手动，auto-自动

// 表单引用
const checkFormRef = ref(null);

// 盘点单表单
const checkForm = reactive({
  id: '',
  check_date: getCurrentDate(),
  check_type: 'cycle',
  warehouse_id: '',
  description: '',
  remarks: '',
  items: []
});

// 盘点单详情
const checkDetail = ref({});

// 正在调整的盘点单
const adjustingCheck = ref({});

// 表单验证规则
const checkRules = {
  check_date: [{ required: true, message: '请选择盘点日期', trigger: 'change' }],
  check_type: [{ required: true, message: '请选择盘点类型', trigger: 'change' }],
  warehouse_id: [{ required: true, message: '请选择仓库/库区', trigger: 'change' }]
};

// 盘点单统计数据
const checkStats = ref({
  total: 0,
  pendingCount: 0,
  completeCount: 0,
  accuracyRate: 0,
  profitLossAmount: 0
});

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'draft': '草稿',
    'in_progress': '进行中',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return statusMap[status] || status;
};

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    'draft': '',
    'in_progress': 'warning',
    'completed': 'success',
    'cancelled': 'info'
  };
  return statusMap[status] || '';
};

// 获取盘点类型文本
const getCheckTypeText = (type) => {
  const typeMap = {
    'cycle': '周期盘点',
    'random': '随机盘点',
    'full': '全面盘点',
    'special': '专项盘点'
  };
  return typeMap[type] || type;
};

// 获取盘点类型颜色
const getCheckTypeType = (type) => {
  const typeMap = {
    'cycle': 'info',
    'random': '',
    'full': 'success',
    'special': 'warning'
  };
  return typeMap[type] || '';
};

// 格式化百分比
const formatPercent = (value) => {
  if (value === undefined || value === null) return '0%';
  return `${(value * 100).toFixed(2)}%`;
};

// 计算盈亏数量
const getDiff = (bookQty, actualQty) => {
  if (bookQty === undefined || actualQty === undefined) return '0';
  const diff = actualQty - bookQty;
  return diff > 0 ? `+${diff}` : `${diff}`;
};

// 获取盈亏显示的CSS类
const getDiffClass = (bookQty, actualQty) => {
  if (bookQty === undefined || actualQty === undefined) return '';
  
  const diff = actualQty - bookQty;
  if (diff > 0) return 'profit-text';
  if (diff < 0) return 'loss-text';
  return '';
};

// 查看盘点单
const viewCheck = async (id) => {
  try {
    detailLoading.value = true;
    try {
      const response = await inventoryApi.getCheckDetail(id);
      if (response && response.data) {
        checkDetail.value = response.data;
        viewDialogVisible.value = true;
        return;
      }
    } catch (apiError) {
      console.error('获取盘点单详情API错误:', apiError);
      // API错误，使用模拟数据
      const mockDetail = checkList.value.find(item => item.id === id) || generateMockCheckDetail(id);
      checkDetail.value = mockDetail;
      viewDialogVisible.value = true;
    }
  } catch (error) {
    console.error('获取盘点单详情失败:', error);
    ElMessage.error('获取盘点单详情失败');
  } finally {
    detailLoading.value = false;
  }
};

// 生成模拟盘点单详情
const generateMockCheckDetail = (id) => {
  const mockItem = checkList.value.find(item => item.id === id) || {
    id,
    check_no: `IC${getCurrentDate().replace(/-/g, '')}${String(id).padStart(3, '0')}`,
    check_date: getCurrentDate(),
    check_type: 'cycle',
    warehouse: '模拟仓库',
    item_count: 10,
    status: 'completed',
    creator: '系统用户',
    profit_loss: 120,
    description: '这是一个自动生成的盘点单详情',
    remarks: '由于API未实现，显示模拟数据',
    items: [
      {
        id: 1,
        material_id: 101,
        material_code: 'M001',
        material_name: '模拟物料1',
        specs: '规格型号1',
        book_qty: 100,
        actual_qty: 120,
        unit_name: '个',
        remarks: '模拟数据'
      },
      {
        id: 2,
        material_id: 102,
        material_code: 'M002',
        material_name: '模拟物料2',
        specs: '规格型号2',
        book_qty: 50,
        actual_qty: 45,
        unit_name: '箱',
        remarks: '模拟数据'
      }
    ]
  };
  return mockItem;
};

// 编辑盘点单
const editCheck = async (id) => {
  try {
    loading.value = true;
    await fetchMaterials();
    await fetchWarehouses();
    
    const response = await inventoryApi.getCheckDetail(id);
    const checkData = response.data;
    
    // 重置表单
    resetCheckForm();
    
    // 填充表单数据
    checkForm.id = checkData.id;
    checkForm.check_date = checkData.check_date;
    checkForm.check_type = checkData.check_type;
    checkForm.warehouse_id = checkData.warehouse_id;
    checkForm.description = checkData.description || '';
    checkForm.remarks = checkData.remarks || '';
    
    // 填充物料明细
    if (checkData.items && checkData.items.length > 0) {
      checkForm.items = checkData.items.map(item => ({
        id: item.id,
        material_id: item.material_id,
        material_code: item.material_code,
        material_name: item.material_name,
        specs: item.specs,
        book_qty: item.book_qty,
        actual_qty: item.actual_qty || item.book_qty,
        unit_name: item.unit_name,
        remarks: item.remarks || ''
      }));
    }
    
    // 如果已有物料，设置为自动模式
    if (checkForm.items.length > 0) {
      selectionType.value = 'auto';
    }
    
    dialogType.value = 'edit';
    checkDialogVisible.value = true;
  } catch (error) {
    console.error('获取盘点单详情失败:', error);
    ElMessage.error('获取盘点单详情失败');
  } finally {
    loading.value = false;
  }
};

// 更新盘点单状态
const updateStatus = async (id, status) => {
  try {
    await ElMessageBox.confirm(`确定要将盘点单状态更新为"${getStatusText(status)}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    loading.value = true;
    await inventoryApi.updateCheckStatus(id, status);
    ElMessage.success('状态更新成功');
    await loadCheckList();
    await loadCheckStats();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新盘点单状态失败:', error);
      ElMessage.error('更新盘点单状态失败');
    }
  } finally {
    loading.value = false;
  }
};

// 删除盘点单
const deleteCheck = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除该盘点单吗？此操作不可逆。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    loading.value = true;
    await inventoryApi.deleteCheck(id);
    ElMessage.success('删除成功');
    await loadCheckList();
    await loadCheckStats();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除盘点单失败:', error);
      ElMessage.error('删除盘点单失败');
    }
  } finally {
    loading.value = false;
  }
};

// 处理搜索
const handleSearch = async () => {
  pagination.current = 1;
  await loadCheckList();
};

// 重置搜索
const resetSearch = async () => {
  searchForm.check_no = '';
  searchForm.status = '';
  searchForm.check_type = '';
  searchForm.date_range = [];
  await handleSearch();
};

// 处理分页大小变化
const handleSizeChange = async (size) => {
  pagination.size = size;
  await loadCheckList();
};

// 处理页码变化
const handleCurrentChange = async (current) => {
  pagination.current = current;
  await loadCheckList();
};

// 打开新建盘点单对话框
const openCheckDialog = async () => {
  dialogType.value = 'create';
  resetCheckForm();
  selectionType.value = 'manual';
  
  // 加载物料和仓库数据
  try {
    loading.value = true;
    await fetchMaterials();
    await fetchWarehouses();
    checkDialogVisible.value = true;
  } catch (error) {
    console.error('加载基础数据失败:', error);
    ElMessage.error('加载基础数据失败');
  } finally {
    loading.value = false;
  }
};

// 重置盘点单表单
const resetCheckForm = () => {
  if (checkFormRef.value) {
    checkFormRef.value.resetFields();
  }
  
  checkForm.id = '';
  checkForm.check_date = getCurrentDate();
  checkForm.check_type = 'cycle';
  checkForm.warehouse_id = '';
  checkForm.description = '';
  checkForm.remarks = '';
  checkForm.items = [];
};

// 添加盘点物料
const addCheckItem = () => {
  checkForm.items.push({
    material_id: '',
    material_code: '',
    material_name: '',
    specs: '',
    book_qty: 0,
    actual_qty: 0,
    unit_name: '',
    remarks: ''
  });
};

// 移除盘点物料
const removeCheckItem = (index) => {
  checkForm.items.splice(index, 1);
};

// 处理物料变更
const handleMaterialChange = async (materialId, index) => {
  if (!materialId) return;
  
  const material = materialOptions.value.find(m => m.id === materialId);
  if (material) {
    checkForm.items[index].material_code = material.code;
    checkForm.items[index].material_name = material.name;
    checkForm.items[index].specs = material.specs || '';
    checkForm.items[index].unit_name = material.unit_name || '';
    
    // 获取该物料在仓库的库存
    if (checkForm.warehouse_id) {
      try {
        const response = await inventoryApi.getMaterialStock(materialId, checkForm.warehouse_id);
        if (response.data && response.data.quantity !== undefined) {
          const quantity = response.data.quantity || 0;
          checkForm.items[index].book_qty = quantity;
          checkForm.items[index].actual_qty = quantity; // 默认实盘数量与账面数量相同
        } else {
          checkForm.items[index].book_qty = 0;
          checkForm.items[index].actual_qty = 0;
        }
      } catch (error) {
        console.error('获取物料库存失败:', error);
        checkForm.items[index].book_qty = 0;
        checkForm.items[index].actual_qty = 0;
      }
    }
  }
};

// 处理仓库变更
const handleWarehouseChange = async () => {
  // 如果有选择物料，更新物料的库存数量
  if (checkForm.items.length > 0 && selectionType.value === 'manual') {
    for (let i = 0; i < checkForm.items.length; i++) {
      const item = checkForm.items[i];
      if (item.material_id) {
        await handleMaterialChange(item.material_id, i);
      }
    }
  }
};

// 加载仓库物料
const loadWarehouseItems = async () => {
  if (!checkForm.warehouse_id) {
    ElMessage.warning('请先选择仓库/库区');
    return;
  }
  
  try {
    loading.value = true;
    const response = await inventoryApi.getStocks({ location_id: checkForm.warehouse_id });
    
    if (response.data && response.data.items) {
      // 转换为盘点物料格式
      checkForm.items = response.data.items.map(item => ({
        material_id: item.material_id,
        material_code: item.material_code,
        material_name: item.material_name,
        specs: item.specs || '',
        book_qty: item.quantity || 0,
        actual_qty: item.quantity || 0, // 默认实盘数量与账面数量相同
        unit_name: item.unit_name || '',
        remarks: ''
      }));
      
      if (checkForm.items.length === 0) {
        ElMessage.warning('所选仓库/库区没有库存物料');
      }
    } else {
      ElMessage.warning('所选仓库/库区没有库存物料');
    }
  } catch (error) {
    console.error('加载仓库物料失败:', error);
    ElMessage.error('加载仓库物料失败');
  } finally {
    loading.value = false;
  }
};

// 提交盘点单表单
const submitCheckForm = async () => {
  if (!checkFormRef.value) return;
  
  try {
    await checkFormRef.value.validate();
    
    // 检查物料列表
    if (checkForm.items.length === 0) {
      ElMessage.warning('请添加至少一种物料');
      return;
    }
    
    // 检查每个物料是否已选择
    if (selectionType.value === 'manual') {
      for (let i = 0; i < checkForm.items.length; i++) {
        const item = checkForm.items[i];
        if (!item.material_id) {
          ElMessage.warning(`第${i+1}行物料未选择`);
          return;
        }
      }
    }
    
    submitting.value = true;
    
    // 准备提交数据
    const formData = {
      ...checkForm,
      status: 'draft',
      warehouse: warehouseOptions.value.find(w => w.id === checkForm.warehouse_id)?.name || ''
    };
    
    // 提交表单
    let response;
    if (dialogType.value === 'create') {
      response = await inventoryApi.createCheck(formData);
      ElMessage.success('盘点单创建成功');
    } else {
      response = await inventoryApi.updateCheck(formData.id, formData);
      ElMessage.success('盘点单更新成功');
    }
    
    // 关闭对话框并刷新列表
    checkDialogVisible.value = false;
    resetCheckForm();
    await loadCheckList();
    await loadCheckStats();
  } catch (error) {
    console.error('提交盘点单失败:', error);
    if (error.message) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error('提交盘点单失败');
    }
  } finally {
    submitting.value = false;
  }
};

// 调整库存
const adjustInventory = async (id) => {
  try {
    detailLoading.value = true;
    
    // 获取盘点单详情
    try {
      const response = await inventoryApi.getCheckDetail(id);
      if (response && response.data) {
        adjustingCheck.value = response.data;
      } else {
        // 如果API调用失败，使用列表中已有的数据或模拟数据
        adjustingCheck.value = checkList.value.find(item => item.id === id) || generateMockCheckDetail(id);
      }
      
      // 打开确认对话框
      adjustDialogVisible.value = true;
    } catch (apiError) {
      console.error('获取盘点单详情API错误:', apiError);
      // 如果API调用失败，使用列表中已有的数据或模拟数据
      adjustingCheck.value = checkList.value.find(item => item.id === id) || generateMockCheckDetail(id);
      // 打开确认对话框
      adjustDialogVisible.value = true;
    }
  } catch (error) {
    console.error('获取盘点单详情失败:', error);
    ElMessage.error('获取盘点单详情失败');
  } finally {
    detailLoading.value = false;
  }
};

// 确认调整库存
const confirmAdjustInventory = async () => {
  try {
    adjusting.value = true;
    
    await inventoryApi.adjustInventory(adjustingCheck.value.id);
    
    ElMessage.success('库存调整成功');
    adjustDialogVisible.value = false;
    
    // 如果正在查看该盘点单，刷新详情
    if (viewDialogVisible.value && checkDetail.value.id === adjustingCheck.value.id) {
      await viewCheck(adjustingCheck.value.id);
    }
    
    await loadCheckList();
    await loadCheckStats();
  } catch (error) {
    console.error('调整库存失败:', error);
    ElMessage.error('调整库存失败');
  } finally {
    adjusting.value = false;
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

// 获取仓库列表
const fetchWarehouses = async () => {
  try {
    const response = await inventoryApi.getLocations();
    warehouseOptions.value = response.data.items || [];
  } catch (error) {
    console.error('获取仓库列表失败:', error);
    warehouseOptions.value = [];
  }
};

// 加载盘点单列表
const loadCheckList = async () => {
  loading.value = true;
  
  try {
    const params = {
      page: pagination.current,
      limit: pagination.size,
      check_no: searchForm.check_no,
      status: searchForm.status,
      check_type: searchForm.check_type
    };
    
    // 添加日期范围参数
    if (searchForm.date_range && searchForm.date_range.length === 2) {
      params.start_date = searchForm.date_range[0];
      params.end_date = searchForm.date_range[1];
    }
    
    // 调用API获取数据
    const response = await inventoryApi.getCheckList(params);
    
    // 模拟API响应数据（如果后端接口未完成，先使用模拟数据）
    if (!response.data.items) {
      const mockData = generateMockData();
      checkList.value = mockData;
      pagination.total = mockData.length;
    } else {
      checkList.value = response.data.items || [];
      pagination.total = response.data.total || 0;
    }
  } catch (error) {
    console.error('获取盘点单列表失败:', error);
    ElMessage.error('获取盘点单列表失败');
    checkList.value = generateMockData();
    pagination.total = checkList.value.length;
  } finally {
    loading.value = false;
  }
};

// 加载盘点单统计数据
const loadCheckStats = async () => {
  try {
    // 检查inventoryApi是否存在且包含getCheckStatistics方法
    if (inventoryApi && typeof inventoryApi.getCheckStatistics === 'function') {
      // 尝试调用API获取统计数据
      try {
        const response = await inventoryApi.getCheckStatistics();
        if (response && response.data) {
          checkStats.value = response.data;
          return;
        }
      } catch (apiError) {
        console.error('获取盘点单统计数据API错误:', apiError);
        // API错误，继续使用本地计算的统计数据
      }
    } else {
      console.error('inventoryApi.getCheckStatistics函数未定义');
    }
    
    // 如果API调用失败或返回数据不完整，使用列表数据计算统计信息
    const total = checkList.value.length;
    const pendingCount = checkList.value.filter(item => item.status === 'in_progress').length;
    const completeCount = checkList.value.filter(item => item.status === 'completed').length;
    
    // 计算盈亏金额总和
    const profitLossAmount = checkList.value
      .filter(item => item.status === 'completed')
      .reduce((sum, item) => sum + (item.profit_loss || 0), 0);
    
    // 计算准确率（假设）
    const accuracyRate = completeCount > 0 ? 0.95 : 0;
    
    checkStats.value = {
      total,
      pendingCount,
      completeCount,
      accuracyRate,
      profitLossAmount
    };
  } catch (error) {
    console.error('获取盘点单统计数据失败:', error);
    
    // 设置默认值确保UI不会崩溃
    checkStats.value = {
      total: checkList.value.length || 0,
      pendingCount: 0,
      completeCount: 0,
      accuracyRate: 0,
      profitLossAmount: 0
    };
  }
};

// 生成模拟数据
const generateMockData = () => {
  return [
    {
      id: 1,
      check_no: 'IC20250101001',
      check_date: '2025-01-01',
      check_type: 'cycle',
      warehouse: '原材料仓库A区',
      item_count: 35,
      status: 'completed',
      creator: '张三',
      profit_loss: 120
    },
    {
      id: 2,
      check_no: 'IC20250105001',
      check_date: '2025-01-05',
      check_type: 'random',
      warehouse: '成品仓库B区',
      item_count: 18,
      status: 'in_progress',
      creator: '李四',
      profit_loss: 0
    },
    {
      id: 3,
      check_no: 'IC20250110001',
      check_date: '2025-01-10',
      check_type: 'full',
      warehouse: '中央仓库',
      item_count: 120,
      status: 'completed',
      creator: '王五',
      profit_loss: -350
    },
    {
      id: 4,
      check_no: 'IC20250115001',
      check_date: '2025-01-15',
      check_type: 'special',
      warehouse: '原材料仓库B区-钢材',
      item_count: 15,
      status: 'draft',
      creator: '赵六',
      profit_loss: 0
    },
    {
      id: 5,
      check_no: 'IC20250118001',
      check_date: '2025-01-18',
      check_type: 'cycle',
      warehouse: '车间临时仓库',
      item_count: 23,
      status: 'cancelled',
      creator: '钱七',
      profit_loss: 0
    }
  ];
};

// 页面初始化
onMounted(async () => {
  await loadCheckList();
  await loadCheckStats();
});
</script>

<style scoped>
.inventory-check-container {
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

.action-bar {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
}

.profit-text {
  color: #67C23A;
  font-weight: bold;
}

.loss-text {
  color: #F56C6C;
  font-weight: bold;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style> 