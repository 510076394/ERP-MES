<template>
  <div class="outsourced-processing-container">
    <div class="page-header">
      <h2>外委加工管理</h2>
      <el-button type="primary" @click="handleAddProcessing">
        <el-icon><Plus /></el-icon> 新建加工单
      </el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="加工单号">
          <el-input v-model="searchForm.processingNo" placeholder="请输入加工单号" clearable></el-input>
        </el-form-item>
        <el-form-item label="供应商">
          <el-input v-model="searchForm.supplierName" placeholder="请输入供应商名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option 
              v-for="item in statusOptions" 
              :key="item.value" 
              :label="item.label" 
              :value="item.value"
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
        <div class="stat-value">{{ processingStats.total || 0 }}</div>
        <div class="stat-label">加工单总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ processingStats.pendingCount || 0 }}</div>
        <div class="stat-label">待确认</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ processingStats.confirmedCount || 0 }}</div>
        <div class="stat-label">已确认</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ processingStats.completedCount || 0 }}</div>
        <div class="stat-label">已完成</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ processingStats.cancelledCount || 0 }}</div>
        <div class="stat-label">已取消</div>
      </el-card>
    </div>

    <!-- 外委加工单列表 -->
    <el-card class="data-card">
      <el-table
        :data="processingList"
        border
        style="width: 100%"
        v-loading="loading"
        :max-height="tableHeight"
      >
        <el-table-column prop="processing_no" label="加工单号" min-width="150" />
        <el-table-column prop="processing_date" label="创建日期" min-width="120">
          <template #default="{ row }">
            {{ formatDate(row.processing_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="supplier_name" label="加工厂" min-width="180" />
        <el-table-column prop="expected_delivery_date" label="预计交期" min-width="120">
          <template #default="{ row }">
            {{ formatDate(row.expected_delivery_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="total_amount" label="加工费" min-width="120">
          <template #default="scope">
            ¥ {{ scope.row.total_amount ? parseFloat(scope.row.total_amount).toFixed(2) : '0.00' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" min-width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="200" fixed="right">
          <template #default="scope">
            <div class="table-operations">
              <div class="operation-group">
                <el-button size="small" @click="handleViewProcessing(scope.row)">查看</el-button>
                <el-button
                  v-if="scope.row.status === 'pending'"
                  size="small"
                  type="primary"
                  @click="handleEditProcessing(scope.row)"
                >
                  编辑
                </el-button>
              </div>
              
              <div class="operation-group" v-if="scope.row.status === 'pending'">
                <el-button size="small" type="success" @click="updateProcessingStatus(scope.row, 'confirmed')">
                  确认
                </el-button>
                <el-button size="small" type="danger" @click="updateProcessingStatus(scope.row, 'cancelled')">
                  取消
                </el-button>
                <el-button size="small" type="danger" @click="handleDeleteProcessing(scope.row)">
                  删除
                </el-button>
              </div>

              <div class="operation-group" v-if="scope.row.status === 'confirmed'">
                <el-button size="small" type="success" @click="handleCreateAndComplete(scope.row)">
                  创建入库单
                </el-button>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :small="false"
          :disabled="false"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 创建入库单对话框 (将在后续实现) -->
    <ReceiptDialog
      v-model:visible="receiptDialogVisible"
      :mode="receiptDialogMode"
      :processing-id="selectedProcessingId"
      :receipt-id="selectedReceiptId"
      @success="fetchProcessingList"
    />

    <!-- 外委加工单对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="processingDialogVisible"
      width="70%"
      :close-on-click-modal="false"
      :before-close="handleCloseProcessingDialog"
    >
      <el-form ref="processingFormRef" :model="processingForm" :rules="processingRules" label-width="100px" class="form-container">
        <!-- 基本信息 -->
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>基本信息</span>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="加工日期" prop="processing_date">
                <el-date-picker 
                  v-model="processingForm.processing_date" 
                  type="date" 
                  placeholder="选择日期" 
                  value-format="YYYY-MM-DD" 
                  style="width: 100%"
                  :disabled="viewOnly"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="加工厂" prop="supplier_id">
                <el-select 
                  v-model="processingForm.supplier_id" 
                  filterable 
                  placeholder="请选择加工厂" 
                  style="width: 100%"
                  :disabled="viewOnly"
                  @change="handleSupplierChange"
                >
                  <el-option
                    v-for="item in supplierOptions"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="预计交期" prop="expected_delivery_date">
                <el-date-picker 
                  v-model="processingForm.expected_delivery_date" 
                  type="date" 
                  placeholder="选择日期" 
                  value-format="YYYY-MM-DD" 
                  style="width: 100%"
                  :disabled="viewOnly"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="联系人" prop="contact_person">
                <el-input 
                  v-model="processingForm.contact_person" 
                  placeholder="请输入联系人"
                  :disabled="viewOnly"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="联系电话" prop="contact_phone">
                <el-input 
                  v-model="processingForm.contact_phone" 
                  placeholder="请输入联系电话"
                  :disabled="viewOnly"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="备注" prop="remarks">
            <el-input 
              v-model="processingForm.remarks" 
              type="textarea" 
              :rows="2" 
              placeholder="请输入备注信息"
              :disabled="viewOnly"
            />
          </el-form-item>
        </el-card>

        <!-- 发料物料 -->
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>发料物料</span>
              <el-button 
                v-if="!viewOnly" 
                type="primary" 
                size="small" 
                @click="handleAddMaterial"
              >
                添加物料
              </el-button>
            </div>
          </template>
          
          <el-table :data="processingForm.materials" border style="width: 100%">
            <el-table-column type="index" width="50" label="序号" />
            <el-table-column prop="material_code" label="物料编码" min-width="120" />
            <el-table-column prop="material_name" label="物料名称" min-width="150" />
            <el-table-column prop="specification" label="规格" min-width="120" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="quantity" label="数量" width="120">
              <template #default="scope">
                <el-input-number 
                  v-if="!viewOnly" 
                  v-model="scope.row.quantity" 
                  :min="0.01" 
                  :precision="2"
                  controls-position="right"
                  size="small"
                  style="width: 100%"
                />
                <span v-else>{{ scope.row.quantity }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="150">
              <template #default="scope">
                <el-input 
                  v-if="!viewOnly" 
                  v-model="scope.row.remark" 
                  size="small"
                />
                <span v-else>{{ scope.row.remark }}</span>
              </template>
            </el-table-column>
            <el-table-column v-if="!viewOnly" label="操作" width="80">
              <template #default="scope">
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="handleRemoveMaterial(scope.$index)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 加工成品 -->
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>加工成品</span>
              <el-button 
                v-if="!viewOnly" 
                type="primary" 
                size="small" 
                @click="handleAddProduct"
              >
                添加成品
              </el-button>
            </div>
          </template>
          
          <el-table :data="processingForm.products" border style="width: 100%">
            <el-table-column type="index" width="50" label="序号" />
            <el-table-column prop="product_code" label="成品编码" min-width="120" />
            <el-table-column prop="product_name" label="成品名称" min-width="150" />
            <el-table-column prop="specification" label="规格" min-width="120" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="quantity" label="数量" width="120">
              <template #default="scope">
                <el-input-number 
                  v-if="!viewOnly" 
                  v-model="scope.row.quantity" 
                  :min="0.01" 
                  :precision="2"
                  controls-position="right"
                  size="small"
                  style="width: 100%"
                  @change="calculateRowTotal(scope.row)"
                />
                <span v-else>{{ scope.row.quantity }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="unit_price" label="加工单价" width="120">
              <template #default="scope">
                <el-input-number 
                  v-if="!viewOnly" 
                  v-model="scope.row.unit_price" 
                  :min="0" 
                  :precision="2"
                  controls-position="right"
                  size="small"
                  style="width: 100%"
                  @change="calculateRowTotal(scope.row)"
                />
                <span v-else>{{ formatPrice(scope.row.unit_price) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="total_price" label="小计金额" width="120">
              <template #default="scope">
                <span>{{ formatPrice(scope.row.total_price) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="150">
              <template #default="scope">
                <el-input 
                  v-if="!viewOnly" 
                  v-model="scope.row.remark" 
                  size="small"
                />
                <span v-else>{{ scope.row.remark }}</span>
              </template>
            </el-table-column>
            <el-table-column v-if="!viewOnly" label="操作" width="80">
              <template #default="scope">
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="handleRemoveProduct(scope.$index)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="total-section">
            <span class="total-label">加工总金额：</span>
            <span class="total-value">{{ formatPrice(calculateTotal()) }}</span>
          </div>
        </el-card>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseProcessingDialog">取消</el-button>
          <el-button v-if="!viewOnly" type="primary" @click="handleProcessingSubmit">
            {{ processing ? '保存中...' : '保存' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 物料选择对话框 -->
    <el-dialog
      title="选择物料"
      v-model="materialDialogVisible"
      width="70%"
    >
      <div class="dialog-search">
        <el-input
          v-model="materialSearchKeyword"
          placeholder="输入关键字搜索物料"
          clearable
          style="width: 300px;"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <el-table
        :data="filteredMaterials"
        border
        style="width: 100%"
        height="400px"
        @row-click="handleSelectMaterial"
      >
        <el-table-column prop="code" label="物料编码" min-width="120" />
        <el-table-column prop="name" label="物料名称" min-width="150" />
        <el-table-column prop="specification" label="规格" min-width="120" />
        <el-table-column prop="unit_name" label="单位" width="80" />
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click.stop="handleSelectMaterial(scope.row)"
            >
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 成品选择对话框 -->
    <el-dialog
      title="选择成品"
      v-model="productDialogVisible"
      width="70%"
    >
      <div class="dialog-search">
        <el-input
          v-model="productSearchKeyword"
          placeholder="输入关键字搜索成品"
          clearable
          style="width: 300px;"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <el-table
        :data="filteredProducts"
        border
        style="width: 100%"
        height="400px"
        @row-click="handleSelectProduct"
      >
        <el-table-column prop="code" label="成品编码" min-width="120" />
        <el-table-column prop="name" label="成品名称" min-width="150" />
        <el-table-column prop="specification" label="规格" min-width="120" />
        <el-table-column prop="unit_name" label="单位" width="80" />
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click.stop="handleSelectProduct(scope.row)"
            >
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api, baseDataApi } from '@/services/api';
import { Plus, Search, Refresh, ArrowDown, Delete } from '@element-plus/icons-vue';
import ReceiptDialog from './ReceiptDialog.vue';

// 状态选项
const statusOptions = [
  { value: 'pending', label: '待确认' },
  { value: 'confirmed', label: '已确认' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
];

// 获取状态类型
const getStatusType = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'confirmed': return 'primary';
    case 'completed': return 'success';
    case 'cancelled': return 'info';
    default: return 'default';
  }
};

// 获取状态标签
const getStatusLabel = (status) => {
  const option = statusOptions.find(opt => opt.value === status);
  return option ? option.label : status;
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

// 搜索表单
const searchForm = reactive({
  processingNo: '',
  supplierName: '',
  status: '',
  dateRange: []
});

// 外委加工列表数据
const processingList = ref([]);
const loading = ref(false);
const tableHeight = 600;

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});

// 统计数据
const processingStats = reactive({
  total: 0,
  pendingCount: 0,
  confirmedCount: 0,
  completedCount: 0,
  cancelledCount: 0
});

// 对话框相关状态
const processingDialogVisible = ref(false);
const processingDialogMode = ref('create');
const selectedProcessingId = ref(null);
const receiptDialogVisible = ref(false);
const receiptDialogMode = ref('create');
const selectedReceiptId = ref(null);
// 添加对话框相关变量
const viewOnly = ref(false);
const processing = ref(false);
const processingFormRef = ref(null);

// 对话框表单数据
const processingForm = reactive({
  processing_date: new Date().toISOString().split('T')[0],
  supplier_id: '',
  supplier_name: '',
  expected_delivery_date: '',
  contact_person: '',
  contact_phone: '',
  remarks: '',
  materials: [],
  products: []
});

// 对话框表单验证规则
const processingRules = {
  processing_date: [{ required: true, message: '请选择加工日期', trigger: 'change' }],
  supplier_id: [{ required: true, message: '请选择加工厂', trigger: 'change' }],
  expected_delivery_date: [{ required: true, message: '请选择预计交期', trigger: 'change' }]
};

// 供应商数据
const supplierOptions = ref([]);
const loadSuppliers = async () => {
  try {
    console.log('开始加载供应商数据');
    
    // 使用baseDataApi中的getSuppliers方法，该方法已经包含了更健壮的错误处理
    const response = await baseDataApi.getSuppliers();
    console.log('供应商数据响应:', response);
    
    // 直接处理返回的数据
    const suppliers = Array.isArray(response.data) ? response.data : 
                     (response.data && Array.isArray(response.data.data) ? response.data.data : []);
    
    if (suppliers.length > 0) {
      supplierOptions.value = suppliers.map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        contact_phone: supplier.contact_phone || ''
      }));
      console.log('成功加载供应商数据，数量:', supplierOptions.value.length);
      console.log('最终加载的供应商数据:', supplierOptions.value);
    } else {
      console.warn('未找到供应商数据');
      ElMessage.warning('未找到供应商数据，请确认数据库中是否已导入供应商信息');
    }
  } catch (error) {
    console.error('获取供应商列表失败:', error);
    ElMessage.error('获取供应商列表失败: ' + (error.response?.data?.message || error.message));
  }
};

// 物料相关数据和方法
const materialDialogVisible = ref(false);
const materialSearchKeyword = ref('');
const allMaterials = ref([]);
const materialsData = ref([]);

const loadMaterials = async () => {
  try {
    const response = await api.get('/baseData/materials');
    allMaterials.value = response.data.data || [];
    materialsData.value = [...allMaterials.value];
  } catch (error) {
    console.error('获取物料列表失败:', error);
    ElMessage.error('获取物料列表失败');
  }
};

// 成品相关数据和方法
const productDialogVisible = ref(false);
const productSearchKeyword = ref('');
const allProducts = ref([]);
const productsData = ref([]);

const loadProducts = async () => {
  try {
    const response = await api.get('/baseData/materials');
    allProducts.value = response.data.data || [];
    productsData.value = [...allProducts.value];
  } catch (error) {
    console.error('获取物料列表失败:', error);
    ElMessage.error('获取物料列表失败');
  }
};

// 计算过滤后的物料列表
const filteredMaterials = computed(() => {
  const keyword = materialSearchKeyword.value.toLowerCase();
  if (!keyword) return materialsData.value;
  
  return materialsData.value.filter(item => 
    item.code?.toLowerCase().includes(keyword) || 
    item.name?.toLowerCase().includes(keyword) ||
    item.specification?.toLowerCase().includes(keyword)
  );
});

// 计算过滤后的成品列表
const filteredProducts = computed(() => {
  const keyword = productSearchKeyword.value.toLowerCase();
  if (!keyword) return productsData.value;
  
  return productsData.value.filter(item => 
    item.code?.toLowerCase().includes(keyword) || 
    item.name?.toLowerCase().includes(keyword) ||
    item.specification?.toLowerCase().includes(keyword)
  );
});

// 计算对话框标题
const dialogTitle = computed(() => {
  if (processingDialogMode.value === 'create') {
    return '新建外委加工单';
  } else if (processingDialogMode.value === 'edit') {
    return '编辑外委加工单';
  } else {
    return '查看外委加工单';
  }
});

// 重置处理表单
const resetProcessingForm = () => {
  processingForm.processing_date = new Date().toISOString().split('T')[0];
  processingForm.supplier_id = '';
  processingForm.supplier_name = '';
  processingForm.expected_delivery_date = '';
  processingForm.contact_person = '';
  processingForm.contact_phone = '';
  processingForm.remarks = '';
  processingForm.materials = [];
  processingForm.products = [];
  
  // 重置表单验证
  nextTick(() => {
    processingFormRef.value?.resetFields();
  });
};

// 关闭对话框
const handleCloseProcessingDialog = () => {
  processingDialogVisible.value = false;
  resetProcessingForm();
};

// 处理供应商变更
const handleSupplierChange = () => {
  console.log('供应商变更:', processingForm.supplier_id);
  console.log('可用供应商:', supplierOptions.value);
  
  // 确保ID类型匹配（转换为数字进行比较）
  const supplierId = Number(processingForm.supplier_id);
  const selectedSupplier = supplierOptions.value.find(
    item => Number(item.id) === supplierId
  );
  
  console.log('选中的供应商:', selectedSupplier);
  
  if (selectedSupplier) {
    processingForm.supplier_name = selectedSupplier.name;
    processingForm.contact_person = selectedSupplier.contact_person || '';
    processingForm.contact_phone = selectedSupplier.contact_phone || '';
    console.log('更新后的表单:', processingForm);
  } else {
    console.warn('未找到匹配的供应商');
  }
};

// 加载加工单详情
const loadProcessingDetail = async () => {
  if (!selectedProcessingId.value) return;
  
  try {
    const response = await api.get(`/purchase/outsourced-processings/${selectedProcessingId.value}`);
    const data = response.data.data;
    
    // 填充表单数据
    processingForm.processing_date = data.processing_date;
    processingForm.supplier_id = data.supplier_id;
    processingForm.supplier_name = data.supplier_name;
    processingForm.expected_delivery_date = data.expected_delivery_date;
    processingForm.contact_person = data.contact_person;
    processingForm.contact_phone = data.contact_phone;
    processingForm.remarks = data.remarks;
    processingForm.materials = data.materials || [];
    processingForm.products = data.products || [];
    
  } catch (error) {
    console.error('获取加工单详情失败:', error);
    ElMessage.error('获取加工单详情失败');
  }
};

// 处理物料相关方法
const handleAddMaterial = () => {
  materialDialogVisible.value = true;
  materialSearchKeyword.value = '';
};

const handleSelectMaterial = (row) => {
  // 检查是否已存在相同物料
  const existingIndex = processingForm.materials.findIndex(
    item => item.material_id === row.id
  );
  
  if (existingIndex >= 0) {
    ElMessage.warning('该物料已添加到发料清单中');
    materialDialogVisible.value = false;
    return;
  }
  
  // 添加物料到清单
  processingForm.materials.push({
    material_id: row.id,
    material_code: row.code,
    material_name: row.name,
    specification: row.specification,
    unit: row.unit_name,
    unit_id: row.unit_id,
    quantity: 1,
    remark: ''
  });
  
  materialDialogVisible.value = false;
};

const handleRemoveMaterial = (index) => {
  processingForm.materials.splice(index, 1);
};

// 处理成品相关方法
const handleAddProduct = () => {
  productDialogVisible.value = true;
  productSearchKeyword.value = '';
};

const handleSelectProduct = (row) => {
  // 检查是否已存在相同成品
  const existingIndex = processingForm.products.findIndex(
    item => item.product_id === row.id
  );
  
  if (existingIndex >= 0) {
    ElMessage.warning('该成品已添加到加工清单中');
    productDialogVisible.value = false;
    return;
  }
  
  // 添加成品到清单
  processingForm.products.push({
    product_id: row.id,
    product_code: row.code,
    product_name: row.name,
    specification: row.specification,
    unit: row.unit_name,
    unit_id: row.unit_id,
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    remark: ''
  });
  
  productDialogVisible.value = false;
};

const handleRemoveProduct = (index) => {
  processingForm.products.splice(index, 1);
};

const calculateRowTotal = (row) => {
  if (row.quantity && row.unit_price) {
    row.total_price = parseFloat(row.quantity) * parseFloat(row.unit_price);
  } else {
    row.total_price = 0;
  }
};

const calculateTotal = () => {
  return processingForm.products.reduce(
    (sum, product) => sum + parseFloat(product.total_price || 0),
    0
  );
};

const formatPrice = (price) => {
  return `¥ ${parseFloat(price || 0).toFixed(2)}`;
};

// 提交加工单
const handleProcessingSubmit = async () => {
  if (processing.value) return;
  
  processingFormRef.value.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('请填写完整的加工单信息');
      return;
    }
    
    if (processingForm.materials.length === 0) {
      ElMessage.error('请至少添加一种发料物料');
      return;
    }
    
    if (processingForm.products.length === 0) {
      ElMessage.error('请至少添加一种加工成品');
      return;
    }
    
    // 检查表单数据是否有undefined
    console.log('检查表单数据:', JSON.stringify(processingForm));
    
    // 检查并确保所有必要字段都有值
    const checkAndFix = (fieldName, defaultValue) => {
      if (processingForm[fieldName] === undefined) {
        console.warn(`字段 ${fieldName} 是 undefined，设置默认值:`, defaultValue);
        processingForm[fieldName] = defaultValue;
      }
    };
    
    // 检查主表字段
    checkAndFix('processing_date', new Date().toISOString().split('T')[0]);
    checkAndFix('supplier_id', '');
    checkAndFix('supplier_name', '');
    checkAndFix('expected_delivery_date', '');
    checkAndFix('contact_person', '');
    checkAndFix('contact_phone', '');
    checkAndFix('remarks', '');
    
    // 检查物料和成品
    processingForm.materials.forEach((material, index) => {
      console.log(`检查物料 ${index}:`, material);
      if (material.remark === undefined) material.remark = '';
    });
    
    processingForm.products.forEach((product, index) => {
      console.log(`检查成品 ${index}:`, product);
      if (product.remark === undefined) product.remark = '';
      if (product.total_price === undefined) {
        product.total_price = parseFloat(product.quantity) * parseFloat(product.unit_price);
        console.warn(`成品 ${index} 的 total_price 是 undefined，已重新计算:`, product.total_price);
      }
    });
    
    processing.value = true;
    
    try {
      let response;
      
      if (processingDialogMode.value === 'create') {
        console.log('发送创建请求数据:', processingForm);
        response = await api.post('/purchase/outsourced-processings', processingForm);
        ElMessage.success('创建外委加工单成功');
      } else if (processingDialogMode.value === 'edit') {
        console.log('发送更新请求数据:', processingForm);
        response = await api.put(`/purchase/outsourced-processings/${selectedProcessingId.value}`, processingForm);
        ElMessage.success('更新外委加工单成功');
      }
      
      processingDialogVisible.value = false;
      fetchProcessingList();
      
    } catch (error) {
      console.error('保存外委加工单失败:', error);
      ElMessage.error('保存外委加工单失败: ' + (error.response?.data?.message || error.message));
    } finally {
      processing.value = false;
    }
  });
};

// 获取外委加工列表
const fetchProcessingList = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
      processing_no: searchForm.processingNo,
      supplier_name: searchForm.supplierName,
      status: searchForm.status
    };

    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.start_date = searchForm.dateRange[0];
      params.end_date = searchForm.dateRange[1];
    }

    const response = await api.get('/purchase/outsourced-processings', { params });
    processingList.value = response.data.data || [];
    pagination.total = response.data.total || 0;
    
    // 更新统计数据
    updateStats();
  } catch (error) {
    console.error('获取外委加工列表失败:', error);
    ElMessage.error('获取外委加工列表失败');
  } finally {
    loading.value = false;
  }
};

// 更新统计数据
const updateStats = () => {
  // 实际应用中这应该通过API获取或从列表数据计算
  processingStats.total = pagination.total;
  processingStats.pendingCount = processingList.value.filter(item => item.status === 'pending').length;
  processingStats.confirmedCount = processingList.value.filter(item => item.status === 'confirmed').length;
  processingStats.completedCount = processingList.value.filter(item => item.status === 'completed').length;
  processingStats.cancelledCount = processingList.value.filter(item => item.status === 'cancelled').length;
};

// 搜索处理
const handleSearch = () => {
  pagination.page = 1;
  fetchProcessingList();
};

// 重置搜索
const resetSearch = () => {
  Object.keys(searchForm).forEach(key => {
    if (key === 'dateRange') {
      searchForm[key] = [];
    } else {
      searchForm[key] = '';
    }
  });
  pagination.page = 1;
  fetchProcessingList();
};

// 分页处理
const handleSizeChange = (val) => {
  pagination.pageSize = val;
  fetchProcessingList();
};

const handleCurrentChange = (val) => {
  pagination.page = val;
  fetchProcessingList();
};

// 处理下拉菜单命令
const handleCommand = async (command, row) => {
  switch (command) {
    case 'confirm':
      await updateProcessingStatus(row, 'confirmed');
      break;
    case 'cancel':
      await updateProcessingStatus(row, 'cancelled');
      break;
    case 'delete':
      handleDeleteProcessing(row);
      break;
    case 'createReceipt':
      handleCreateReceipt(row);
      break;
    default:
      break;
  }
};

// 更新外委加工单状态
const updateProcessingStatus = async (row, status) => {
  try {
    const response = await api.put(`/purchase/outsourced-processings/${row.id}/status`, { status });
    
    if (response.data.warnings && response.data.warnings.length > 0) {
      // 以警告形式显示库存不足等信息
      ElMessage({
        message: `状态已更新，但有以下警告：\n${response.data.warnings.join('\n')}`,
        type: 'warning',
        duration: 8000,
        showClose: true
      });
    } else {
      ElMessage.success(`状态更新成功`);
    }
    
    fetchProcessingList();
  } catch (error) {
    console.error('状态更新失败:', error);
    ElMessage.error('状态更新失败: ' + (error.response?.data?.message || error.message));
  }
};

// 创建入库单
const handleCreateReceipt = (row) => {
  selectedProcessingId.value = row.id;
  receiptDialogMode.value = 'create';
  receiptDialogVisible.value = true;
};

// 创建入库单并自动完成加工单
const handleCreateAndComplete = async (row) => {
  selectedProcessingId.value = row.id;
  receiptDialogMode.value = 'create';
  receiptDialogVisible.value = true;
  
  // 添加监听一次性事件，当入库单创建成功后，自动将加工单状态更新为已完成
  const onSuccess = async () => {
    try {
      await updateProcessingStatus(row, 'completed');
      // 移除监听器，避免重复执行
      window.removeEventListener('receipt-created', onSuccess);
    } catch (error) {
      console.error('自动更新加工单状态失败:', error);
    }
  };
  
  // 通过一次性事件监听器监听入库单创建成功
  window.addEventListener('receipt-created', onSuccess, { once: true });
};

// 查看外委加工单
const handleViewProcessing = (row) => {
  selectedProcessingId.value = row.id;
  processingDialogMode.value = 'view';
  viewOnly.value = true;
  processingDialogVisible.value = true;
  
  // 加载供应商数据和加工单详情
  loadSuppliers();
  loadProcessingDetail();
};

// 编辑外委加工单
const handleEditProcessing = (row) => {
  selectedProcessingId.value = row.id;
  processingDialogMode.value = 'edit';
  viewOnly.value = false;
  processingDialogVisible.value = true;
  
  // 加载供应商数据和加工单详情
  loadSuppliers();
  loadProcessingDetail();
};

// 删除外委加工单
const handleDeleteProcessing = (row) => {
  ElMessageBox.confirm(
    `确定要删除加工单 ${row.processing_no} 吗？此操作不可恢复。`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await api.delete(`/purchase/outsourced-processings/${row.id}`);
        ElMessage.success('删除成功');
        fetchProcessingList();
      } catch (error) {
        console.error('删除失败:', error);
        ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message));
      }
    })
    .catch(() => {
      ElMessage.info('已取消删除');
    });
};

// 加工单对话框相关方法
const handleAddProcessing = () => {
  processingDialogMode.value = 'create';
  viewOnly.value = false;
  resetProcessingForm();
  processingDialogVisible.value = true;
  selectedProcessingId.value = null;
  
  // 加载供应商和物料数据
  loadSuppliers();
  loadMaterials();
  loadProducts();
};

// 监听对话框可见性变化
watch(processingDialogVisible, (visible) => {
  if (visible) {
    // 每次打开对话框时都加载供应商数据
    loadSuppliers();
    // 如果是查看或编辑模式，加载详情
    if (processingDialogMode.value !== 'create' && selectedProcessingId.value) {
      loadProcessingDetail();
    }
  }
});

// 页面加载时获取数据
onMounted(() => {
  fetchProcessingList();
  // 预加载基础数据，提高用户体验
  loadSuppliers();
  loadMaterials();
  loadProducts();
});
</script>

<style scoped>
.outsourced-processing-container {
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
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  padding: 10px 0;
}

/* 统计卡片 */
.statistics-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 180px;
  margin: 0 10px 10px 0;
  text-align: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
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
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.table-operations {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
}

.operation-group {
  display: flex;
  margin-bottom: 5px;
}

.operation-group .el-button {
  margin-right: 5px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

/* 处理对话框相关样式 */
.form-container {
  padding: 10px;
}

.box-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-search {
  margin-bottom: 15px;
}

.total-section {
  margin-top: 15px;
  text-align: right;
  padding-right: 20px;
}

.total-label {
  font-size: 14px;
  font-weight: bold;
}

.total-value {
  font-size: 18px;
  color: #f56c6c;
  font-weight: bold;
  margin-left: 10px;
}

@media (max-width: 768px) {
  .statistics-row {
    flex-direction: column;
  }
  
  .stat-card {
    margin-bottom: 10px;
    width: 100%;
  }
}
</style> 