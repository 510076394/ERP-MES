<template>
  <div class="invoices-container">
    <div class="page-header">
      <h2>采购发票管理</h2>
      <el-button type="primary" @click="showAddDialog">新增发票</el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="发票编号">
          <el-input v-model="searchForm.invoiceNumber" placeholder="输入发票编号" clearable></el-input>
        </el-form-item>
        <el-form-item label="供应商名称">
          <el-input v-model="searchForm.supplierName" placeholder="输入供应商名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="开票日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="选择状态" clearable style="width: 120px">
            <el-option label="未付款" value="unpaid"></el-option>
            <el-option label="部分付款" value="partial"></el-option>
            <el-option label="已付款" value="paid"></el-option>
            <el-option label="已逾期" value="overdue"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchInvoices">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 表格区域 -->
    <el-card class="data-card">
      <el-table
        :data="invoiceList"
        style="width: 100%"
        border
        v-loading="loading"
      >
        <el-table-column prop="invoiceNumber" label="发票编号" width="150"></el-table-column>
        <el-table-column prop="supplierName" label="供应商名称" width="220"></el-table-column>
        <el-table-column prop="invoiceDate" label="开票日期" width="120"></el-table-column>
        <el-table-column prop="dueDate" label="到期日期" width="120"></el-table-column>
        <el-table-column prop="amount" label="金额" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="paidAmount" label="已付金额" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.paidAmount) }}
          </template>
        </el-table-column>
        <el-table-column prop="balance" label="剩余金额" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.amount - scope.row.paidAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row)">
              {{ getStatusText(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="success" size="small" @click="handleRecordPayment(scope.row)">记录付款</el-button>
            <el-button type="info" size="small" @click="handleViewDetails(scope.row)">查看明细</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        >
        </el-pagination>
      </div>
    </el-card>
    
    <!-- 添加/编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="invoiceForm" :rules="invoiceRules" ref="invoiceFormRef" label-width="100px">
        <el-form-item label="发票编号" prop="invoiceNumber">
          <el-input v-model="invoiceForm.invoiceNumber" placeholder="请输入发票编号"></el-input>
        </el-form-item>
        <el-form-item label="供应商" prop="supplierId">
          <el-select v-model="invoiceForm.supplierId" placeholder="请选择供应商" filterable style="width: 100%">
            <el-option
              v-for="supplier in supplierOptions"
              :key="supplier.id"
              :label="supplier.name"
              :value="supplier.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="开票日期" prop="invoiceDate">
          <el-date-picker
            v-model="invoiceForm.invoiceDate"
            type="date"
            placeholder="选择开票日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="到期日期" prop="dueDate">
          <el-date-picker
            v-model="invoiceForm.dueDate"
            type="date"
            placeholder="选择到期日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          ></el-date-picker>
        </el-form-item>
        
        <!-- 发票明细项 -->
        <div class="invoice-items">
          <h3>发票明细</h3>
          <el-table :data="invoiceForm.items" border style="width: 100%">
            <el-table-column label="物料/服务">
              <template #default="scope">
                <el-select v-model="scope.row.materialId" placeholder="选择物料/服务" filterable style="width: 100%">
                  <el-option
                    v-for="material in materialOptions"
                    :key="material.id"
                    :label="material.name"
                    :value="material.id"
                  ></el-option>
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="描述" width="150">
              <template #default="scope">
                <el-input v-model="scope.row.description" placeholder="描述"></el-input>
              </template>
            </el-table-column>
            <el-table-column label="数量" width="100">
              <template #default="scope">
                <el-input-number v-model="scope.row.quantity" :min="1" @change="calculateItemAmount(scope.row)"></el-input-number>
              </template>
            </el-table-column>
            <el-table-column label="单价" width="120">
              <template #default="scope">
                <el-input-number v-model="scope.row.unitPrice" :precision="2" @change="calculateItemAmount(scope.row)"></el-input-number>
              </template>
            </el-table-column>
            <el-table-column label="金额" width="120" align="right">
              <template #default="scope">
                {{ formatCurrency(scope.row.amount) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="scope">
                <el-button type="danger" icon="Delete" circle size="small" @click="removeInvoiceItem(scope.$index)"></el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="add-item">
            <el-button type="primary" @click="addInvoiceItem">添加明细项</el-button>
          </div>
        </div>
        
        <div class="invoice-total">
          <el-row>
            <el-col :span="12" :offset="12">
              <div class="total-line">
                <span>小计：</span>
                <span>{{ formatCurrency(calculateSubtotal()) }}</span>
              </div>
              <div class="total-line">
                <span>税额：</span>
                <span>{{ formatCurrency(calculateTax()) }}</span>
              </div>
              <div class="total-line total-amount">
                <span>总计：</span>
                <span>{{ formatCurrency(calculateTotal()) }}</span>
              </div>
            </el-col>
          </el-row>
        </div>
        
        <el-form-item label="备注" prop="notes">
          <el-input
            v-model="invoiceForm.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveInvoice" :loading="saveLoading">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 记录付款对话框 -->
    <el-dialog
      title="记录付款"
      v-model="paymentDialogVisible"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="paymentForm" :rules="paymentRules" ref="paymentFormRef" label-width="100px">
        <el-form-item label="发票编号">
          <el-input v-model="paymentForm.invoiceNumber" disabled></el-input>
        </el-form-item>
        <el-form-item label="供应商名称">
          <el-input v-model="paymentForm.supplierName" disabled></el-input>
        </el-form-item>
        <el-form-item label="发票金额">
          <el-input v-model="paymentForm.invoiceAmount" disabled></el-input>
        </el-form-item>
        <el-form-item label="已付金额">
          <el-input v-model="paymentForm.paidAmount" disabled></el-input>
        </el-form-item>
        <el-form-item label="剩余金额">
          <el-input v-model="paymentForm.balance" disabled></el-input>
        </el-form-item>
        <el-form-item label="付款日期" prop="paymentDate">
          <el-date-picker
            v-model="paymentForm.paymentDate"
            type="date"
            placeholder="选择付款日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="付款金额" prop="amount">
          <el-input-number v-model="paymentForm.amount" :precision="2" :min="0" :max="paymentForm.balanceValue" style="width: 100%"></el-input-number>
        </el-form-item>
        <el-form-item label="付款方式" prop="paymentMethod">
          <el-select v-model="paymentForm.paymentMethod" placeholder="请选择付款方式" style="width: 100%">
            <el-option label="现金" value="cash"></el-option>
            <el-option label="银行转账" value="bank_transfer"></el-option>
            <el-option label="支票" value="check"></el-option>
            <el-option label="信用卡" value="credit_card"></el-option>
            <el-option label="其他" value="other"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="银行账户" prop="bankAccountId" v-if="paymentForm.paymentMethod === 'bank_transfer'">
          <el-select 
            v-model="paymentForm.bankAccountId" 
            placeholder="请选择银行账户" 
            style="width: 100%" 
            filterable
            :loading="bankAccountsLoading"
          >
            <el-option 
              v-for="account in bankAccounts" 
              :key="account.id" 
              :label="`${account.bankName} - ${account.accountName}`" 
              :value="account.id"
            >
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span>{{ account.bankName }} - {{ account.accountName }}</span>
                <span style="color: #8492a6; font-size: 13px">{{ formatCurrency(account.balance) }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="notes">
          <el-input
            v-model="paymentForm.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="paymentDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="savePayment" :loading="savePaymentLoading">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 发票明细查看对话框 -->
    <el-dialog
      title="发票详情查看"
      v-model="detailsDialogVisible"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-loading="detailsLoading">
        <!-- 基本信息 -->
        <el-descriptions :column="2" border>
          <el-descriptions-item label="发票编号">{{ invoiceDetail.invoiceNumber }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ invoiceDetail.supplierName }}</el-descriptions-item>
          <el-descriptions-item label="开票日期">{{ invoiceDetail.invoiceDate }}</el-descriptions-item>
          <el-descriptions-item label="到期日期">{{ invoiceDetail.dueDate }}</el-descriptions-item>
          <el-descriptions-item label="总金额">{{ formatCurrency(invoiceDetail.amount) }}</el-descriptions-item>
          <el-descriptions-item label="已付金额">{{ formatCurrency(invoiceDetail.paidAmount) }}</el-descriptions-item>
          <el-descriptions-item label="剩余金额">{{ formatCurrency(invoiceDetail.balance) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(invoiceDetail)">{{ getStatusText(invoiceDetail) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ invoiceDetail.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ invoiceDetail.notes || '无' }}</el-descriptions-item>
        </el-descriptions>
        
        <!-- 明细项 -->
        <div class="detail-title">
          <h3>发票明细项</h3>
        </div>
        <el-table :data="invoiceDetail.items || []" border style="width: 100%">
          <el-table-column prop="materialName" label="物料/服务" min-width="150"></el-table-column>
          <el-table-column prop="description" label="描述" min-width="200"></el-table-column>
          <el-table-column prop="quantity" label="数量" width="100" align="right"></el-table-column>
          <el-table-column prop="unitPrice" label="单价" width="120" align="right">
            <template #default="scope">
              {{ formatCurrency(scope.row.unitPrice) }}
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="120" align="right">
            <template #default="scope">
              {{ formatCurrency(scope.row.amount) }}
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 付款记录（如果有） -->
        <div class="detail-title">
          <h3>付款记录</h3>
        </div>
        <div v-if="invoiceDetail.paymentRecords && invoiceDetail.paymentRecords.length > 0">
          <el-table :data="invoiceDetail.paymentRecords" border style="width: 100%">
            <el-table-column prop="paymentNumber" label="付款编号" width="150"></el-table-column>
            <el-table-column prop="paymentDate" label="付款日期" width="120"></el-table-column>
            <el-table-column prop="amount" label="付款金额" width="120" align="right">
              <template #default="scope">
                {{ formatCurrency(scope.row.amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="paymentMethod" label="付款方式" width="120"></el-table-column>
            <el-table-column prop="notes" label="备注" min-width="150"></el-table-column>
          </el-table>
        </div>
        <div v-else class="empty-data">
          <el-empty description="暂无付款记录" :image-size="80"></el-empty>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailsDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="handleRecordPayment(invoiceDetail)" v-if="invoiceDetail.balance > 0">记录付款</el-button>
          <el-button type="primary" @click="printInvoiceDetail">打印</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/services/api';

// 数据加载状态
const loading = ref(false);
const saveLoading = ref(false);
const savePaymentLoading = ref(false);
const detailsLoading = ref(false);
const bankAccountsLoading = ref(false);

// 分页相关
const total = ref(0);
const pageSize = ref(20);
const currentPage = ref(1);

// 表单相关
const dialogVisible = ref(false);
const dialogTitle = ref('新增采购发票');
const invoiceFormRef = ref(null);
const paymentDialogVisible = ref(false);
const paymentFormRef = ref(null);
const detailsDialogVisible = ref(false);

// 数据列表
const invoiceList = ref([]);
const supplierOptions = ref([]);
const materialOptions = ref([]);
const bankAccounts = ref([]);
const invoiceDetail = ref({});

// 搜索表单
const searchForm = reactive({
  invoiceNumber: '',
  supplierName: '',
  dateRange: [],
  status: ''
});

// 发票表单
const invoiceForm = reactive({
  id: null,
  invoiceNumber: '',
  supplierId: null,
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  items: [],
  notes: '',
  taxRate: 0.13 // 默认税率13%
});

// 付款表单
const paymentForm = reactive({
  invoiceId: null,
  invoiceNumber: '',
  supplierName: '',
  invoiceAmount: '',
  paidAmount: '',
  balance: '',
  balanceValue: 0,
  paymentDate: new Date().toISOString().slice(0, 10),
  amount: 0,
  paymentMethod: 'bank_transfer',
  bankAccountId: null,
  notes: ''
});

// 表单验证规则
const invoiceRules = {
  invoiceNumber: [
    { required: true, message: '请输入发票编号', trigger: 'blur' }
  ],
  supplierId: [
    { required: true, message: '请选择供应商', trigger: 'change' }
  ],
  invoiceDate: [
    { required: true, message: '请选择开票日期', trigger: 'change' }
  ],
  dueDate: [
    { required: true, message: '请选择到期日期', trigger: 'change' }
  ]
};

const paymentRules = {
  paymentDate: [
    { required: true, message: '请选择付款日期', trigger: 'change' }
  ],
  amount: [
    { required: true, message: '请输入付款金额', trigger: 'blur' }
  ],
  paymentMethod: [
    { required: true, message: '请选择付款方式', trigger: 'change' }
  ],
  bankAccountId: [
    { 
      required: true, 
      message: '请选择银行账户', 
      trigger: 'change',
      validator: (rule, value, callback) => {
        if (paymentForm.paymentMethod === 'bank_transfer' && !value) {
          callback(new Error('请选择银行账户'));
        } else {
          callback();
        }
      }
    }
  ]
};

// 格式化货币
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// 获取状态类型
const getStatusType = (invoice) => {
  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  
  if (invoice.amount <= invoice.paidAmount) {
    return 'success';
  } else if (invoice.paidAmount > 0) {
    return 'warning';
  } else if (dueDate < now) {
    return 'danger';
  } else {
    return 'info';
  }
};

// 获取状态文本
const getStatusText = (invoice) => {
  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  
  if (invoice.amount <= invoice.paidAmount) {
    return '已付款';
  } else if (invoice.paidAmount > 0) {
    return '部分付款';
  } else if (dueDate < now) {
    return '已逾期';
  } else {
    return '未付款';
  }
};

// 计算单项金额
const calculateItemAmount = (item) => {
  item.amount = (item.quantity || 0) * (item.unitPrice || 0);
};

// 计算小计
const calculateSubtotal = () => {
  return invoiceForm.items.reduce((sum, item) => sum + (item.amount || 0), 0);
};

// 计算税额
const calculateTax = () => {
  return calculateSubtotal() * invoiceForm.taxRate;
};

// 计算总计
const calculateTotal = () => {
  return calculateSubtotal() + calculateTax();
};

// 添加发票明细项
const addInvoiceItem = () => {
  invoiceForm.items.push({
    materialId: null,
    description: '',
    quantity: 1,
    unitPrice: 0,
    amount: 0
  });
};

// 移除发票明细项
const removeInvoiceItem = (index) => {
  invoiceForm.items.splice(index, 1);
};

// 加载发票列表
const loadInvoices = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      invoiceNumber: searchForm.invoiceNumber,
      supplierName: searchForm.supplierName,
      startDate: searchForm.dateRange?.[0] || '',
      endDate: searchForm.dateRange?.[1] || '',
      status: searchForm.status
    };
    
    console.log('发送查询参数:', params);
    
    const response = await api.get('/finance/ap/invoices', { params });
    console.log('获取发票列表响应:', response.data);
    
    // 处理响应数据
    if (response.data && response.data.data) {
      // 使用API返回的数据
      invoiceList.value = response.data.data;
      total.value = response.data.total;
      
      // 确保数据为空时不会报错
      if (!invoiceList.value || !Array.isArray(invoiceList.value)) {
        invoiceList.value = [];
      }
      
      console.log('处理后的发票列表:', invoiceList.value);
    } else {
      // 响应格式不符合预期，使用空数据
      invoiceList.value = [];
      total.value = 0;
      console.warn('API响应数据格式不符合预期');
    }
  } catch (error) {
    console.error('加载发票列表失败:', error);
    ElMessage.error('加载发票列表失败');
    
    // 出错时使用空数据
    invoiceList.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

// 加载供应商选项
const loadSupplierOptions = async () => {
  try {
    // 使用已经配置好的api实例，它会自动处理认证头和基础URL
    const response = await api.get('/baseData/suppliers');
    console.log('供应商API响应:', response);
    
    // 准备一个临时数组来保存处理后的供应商数据
    let suppliers = [];
    
    // 假设后端返回的是一个包含供应商列表的对象
    if (response.data && typeof response.data === 'object') {
      // 如果是直接的数组
      if (Array.isArray(response.data)) {
        suppliers = response.data;
      } 
      // 如果是嵌套在data属性中的数组
      else if (response.data.data && Array.isArray(response.data.data)) {
        suppliers = response.data.data;
      }
      // 如果是其他结构，尝试提取有用的对象
      else if (response.data.list && Array.isArray(response.data.list)) {
        suppliers = response.data.list;
      }
    }
    
    // 如果我们获取到了供应商数据
    if (suppliers.length > 0) {
      supplierOptions.value = suppliers.map(supplier => ({
        id: supplier.id,
        name: supplier.name || supplier.supplierName || supplier.supplier_name || '未命名供应商'
      }));
    } else {
      // 提供一些默认数据
      supplierOptions.value = [
        { id: 1, name: '供应商A' },
        { id: 2, name: '供应商B' },
        { id: 3, name: '供应商C' }
      ];
    }
    
    console.log('最终供应商选项:', supplierOptions.value);
  } catch (error) {
    console.error('加载供应商列表失败:', error);
    
    // 提供一些默认数据
    supplierOptions.value = [
      { id: 1, name: '供应商A' },
      { id: 2, name: '供应商B' },
      { id: 3, name: '供应商C' }
    ];
  }
};

// 加载物料选项
const loadMaterialOptions = async () => {
  try {
    // 使用已经配置好的api实例，它会自动处理认证头和基础URL
    const response = await api.get('/baseData/materials');
    console.log('物料API响应:', response);
    
    // 准备一个临时数组来保存处理后的物料数据
    let materials = [];
    
    // 假设后端返回的是一个包含物料列表的对象
    if (response.data && typeof response.data === 'object') {
      // 如果是直接的数组
      if (Array.isArray(response.data)) {
        materials = response.data;
      } 
      // 如果是嵌套在data属性中的数组
      else if (response.data.data && Array.isArray(response.data.data)) {
        materials = response.data.data;
      }
      // 如果是其他结构，尝试提取有用的对象
      else if (response.data.list && Array.isArray(response.data.list)) {
        materials = response.data.list;
      }
    }
    
    // 如果我们获取到了物料数据
    if (materials.length > 0) {
      materialOptions.value = materials.map(material => ({
        id: material.id,
        name: material.name || material.materialName || material.material_name || '未命名物料'
      }));
    } else {
      // 提供一些默认数据
      materialOptions.value = [
        { id: 1, name: '物料A' },
        { id: 2, name: '物料B' },
        { id: 3, name: '物料C' }
      ];
    }
    
    console.log('最终物料选项:', materialOptions.value);
  } catch (error) {
    console.error('加载物料列表失败:', error);
    
    // 提供一些默认数据
    materialOptions.value = [
      { id: 1, name: '物料A' },
      { id: 2, name: '物料B' },
      { id: 3, name: '物料C' }
    ];
  }
};

// 加载银行账户选项
const loadBankAccounts = async () => {
  bankAccountsLoading.value = true;
  try {
    const response = await api.get('/finance/baseData/bankAccounts');
    console.log('银行账户API响应:', response);
    
    // 转换后端数据格式为前端需要的格式
    if (response.data && response.data.data) {
      bankAccounts.value = response.data.data.map(account => ({
        id: account.id,
        accountName: account.accountName || account.account_name,
        accountNumber: account.accountNumber || account.account_number,
        bankName: account.bankName || account.bank_name,
        balance: parseFloat(account.balance || account.current_balance || 0)
      }));
    } else {
      bankAccounts.value = [];
    }
  } catch (error) {
    console.error('加载银行账户列表失败:', error);
    bankAccounts.value = [];
  } finally {
    bankAccountsLoading.value = false;
  }
};

// 搜索发票
const searchInvoices = () => {
  currentPage.value = 1;
  loadInvoices();
};

// 重置搜索条件
const resetSearch = () => {
  searchForm.invoiceNumber = '';
  searchForm.supplierName = '';
  searchForm.dateRange = [];
  searchForm.status = '';
  searchInvoices();
};

// 新增发票
const showAddDialog = () => {
  dialogTitle.value = '新增采购发票';
  resetInvoiceForm();
  // 添加默认一个明细项
  addInvoiceItem();
  dialogVisible.value = true;
};

// 编辑发票
const handleEdit = async (row) => {
  dialogTitle.value = '编辑采购发票';
  
  try {
    const response = await api.get(`/finance/ap/invoices/${row.id}`);
    const invoice = response.data;
    
    resetInvoiceForm();
    
    // 填充表单数据
    invoiceForm.id = invoice.id;
    invoiceForm.invoiceNumber = invoice.invoiceNumber;
    invoiceForm.supplierId = invoice.supplierId;
    invoiceForm.invoiceDate = invoice.invoiceDate;
    invoiceForm.dueDate = invoice.dueDate;
    invoiceForm.notes = invoice.notes;
    invoiceForm.taxRate = invoice.taxRate || 0.13;
    
    // 填充明细项
    invoiceForm.items = invoice.items || [];
    
    dialogVisible.value = true;
  } catch (error) {
    console.error('获取发票详情失败:', error);
    ElMessage.error('获取发票详情失败');
  }
};

// 查看明细
const handleViewDetails = async (row) => {
  detailsLoading.value = true;
  try {
    const response = await api.get(`/finance/ap/invoices/${row.id}`);
    const invoice = response.data;
    
    invoiceDetail.value = invoice;
    
    // 加载相关付款记录
    try {
      const paymentsResponse = await api.get(`/finance/ap/invoices/${row.id}/payments`);
      invoiceDetail.value.paymentRecords = paymentsResponse.data.data || [];
      console.log('获取到的付款记录:', invoiceDetail.value.paymentRecords);
    } catch (error) {
      console.error('获取付款记录失败:', error);
      invoiceDetail.value.paymentRecords = [];
    }
    
    detailsDialogVisible.value = true;
  } catch (error) {
    console.error('获取发票详情失败:', error);
    ElMessage.error('获取发票详情失败');
  } finally {
    detailsLoading.value = false;
  }
};

// 打印发票详情
const printInvoiceDetail = () => {
  // 创建打印内容
  const printContent = document.createElement('div');
  printContent.innerHTML = `
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
      }
      .print-header {
        text-align: center;
        margin-bottom: 20px;
      }
      .print-header h1 {
        margin: 0;
      }
      .print-info {
        margin-bottom: 20px;
      }
      .print-info-row {
        display: flex;
        margin-bottom: 5px;
      }
      .print-label {
        font-weight: bold;
        width: 120px;
      }
      .print-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      .print-table th, .print-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      .print-table th {
        background-color: #f2f2f2;
      }
      .print-summary {
        margin-top: 20px;
        display: flex;
        justify-content: flex-end;
      }
      .print-summary-item {
        margin-left: 20px;
      }
      .print-footer {
        margin-top: 40px;
        display: flex;
        justify-content: space-between;
      }
      .text-right {
        text-align: right;
      }
      @media print {
        button {
          display: none;
        }
      }
    </style>
    <div class="print-header">
      <h1>采购发票</h1>
      <p>发票编号: ${invoiceDetail.value.invoiceNumber}</p>
    </div>
    
    <div class="print-info">
      <div class="print-info-row">
        <div class="print-label">供应商:</div>
        <div>${invoiceDetail.value.supplierName}</div>
      </div>
      <div class="print-info-row">
        <div class="print-label">开票日期:</div>
        <div>${invoiceDetail.value.invoiceDate}</div>
      </div>
      <div class="print-info-row">
        <div class="print-label">到期日期:</div>
        <div>${invoiceDetail.value.dueDate}</div>
      </div>
      <div class="print-info-row">
        <div class="print-label">状态:</div>
        <div>${getStatusText(invoiceDetail.value)}</div>
      </div>
    </div>
    
    <h3>发票明细</h3>
    <table class="print-table">
      <thead>
        <tr>
          <th>物料/服务</th>
          <th>描述</th>
          <th>数量</th>
          <th>单价</th>
          <th>金额</th>
        </tr>
      </thead>
      <tbody>
        ${(invoiceDetail.value.items || []).map(item => `
          <tr>
            <td>${item.materialName || ''}</td>
            <td>${item.description || ''}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.unitPrice)}</td>
            <td class="text-right">${formatCurrency(item.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="print-summary">
      <div class="print-summary-item">
        <div><strong>总金额:</strong> ${formatCurrency(invoiceDetail.value.amount)}</div>
        <div><strong>已付金额:</strong> ${formatCurrency(invoiceDetail.value.paidAmount)}</div>
        <div><strong>剩余金额:</strong> ${formatCurrency(invoiceDetail.value.balance)}</div>
      </div>
    </div>
    
    <div class="print-footer">
      <div>
        <p>备注: ${invoiceDetail.value.notes || '无'}</p>
      </div>
      <div>
        <p>打印日期: ${new Date().toLocaleDateString()}</p>
      </div>
    </div>
  `;
  
  // 创建一个新窗口用于打印
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent.innerHTML);
  printWindow.document.close();
  
  // 等待样式加载完成后打印
  printWindow.onload = function() {
    printWindow.print();
    // printWindow.close();
  };
};

// 记录付款
const handleRecordPayment = (row) => {
  // 计算剩余金额
  const balance = row.amount - row.paidAmount;
  
  // 填充付款表单
  paymentForm.invoiceId = row.id;
  paymentForm.invoiceNumber = row.invoiceNumber;
  paymentForm.supplierName = row.supplierName;
  paymentForm.invoiceAmount = formatCurrency(row.amount);
  paymentForm.paidAmount = formatCurrency(row.paidAmount);
  paymentForm.balance = formatCurrency(balance);
  paymentForm.balanceValue = balance;
  paymentForm.amount = balance; // 默认填充剩余金额
  paymentForm.paymentMethod = 'bank_transfer'; // 默认为银行转账
  paymentForm.bankAccountId = null; // 清空银行账户选择
  
  // 确保有银行账户选项可选
  if (bankAccounts.value.length === 0) {
    loadBankAccounts();
  }
  
  paymentDialogVisible.value = true;
};

// 保存发票
const saveInvoice = async () => {
  if (!invoiceFormRef.value) return;
  
  // 至少有一个明细项
  if (invoiceForm.items.length === 0) {
    ElMessage.warning('请至少添加一个发票明细项');
    return;
  }
  
  // 每个明细项都需要填写完整
  for (const item of invoiceForm.items) {
    if (!item.materialId || item.quantity <= 0 || item.unitPrice <= 0) {
      ElMessage.warning('请确保所有明细项的物料、数量和单价都已填写完整');
      return;
    }
  }
  
  await invoiceFormRef.value.validate(async (valid) => {
    if (valid) {
      saveLoading.value = true;
      try {
        // 准备提交的数据
        const data = {
          ...invoiceForm,
          amount: calculateTotal() // 设置总金额
        };
        
        // 添加调试日志
        console.log('准备提交的发票数据:', JSON.stringify(data, null, 2));
        
        let response;
        if (invoiceForm.id) {
          // 更新
          response = await api.put(`/finance/ap/invoices/${invoiceForm.id}`, data);
          console.log('更新发票响应:', response);
          ElMessage.success('更新成功');
        } else {
          // 新增
          response = await api.post('/finance/ap/invoices', data);
          console.log('新增发票响应:', response);
          ElMessage.success('添加成功');
        }
        
        dialogVisible.value = false;
        loadInvoices();
      } catch (error) {
        console.error('保存发票失败:', error);
        ElMessage.error('保存发票失败: ' + (error.response?.data?.details || error.message));
      } finally {
        saveLoading.value = false;
      }
    }
  });
};

// 保存付款记录
const savePayment = async () => {
  if (!paymentFormRef.value) return;
  
  // 如果选择了银行转账但没有选择银行账户，添加临时验证规则
  if (paymentForm.paymentMethod === 'bank_transfer' && !paymentForm.bankAccountId) {
    ElMessage.warning('请选择银行账户');
    return;
  }
  
  await paymentFormRef.value.validate(async (valid) => {
    if (valid) {
      savePaymentLoading.value = true;
      try {
        // 准备提交的数据
        const data = {
          invoiceId: paymentForm.invoiceId,
          paymentDate: paymentForm.paymentDate,
          amount: paymentForm.amount,
          paymentMethod: paymentForm.paymentMethod,
          bankAccountId: paymentForm.bankAccountId,
          notes: paymentForm.notes
        };
        
        const response = await api.post('/finance/ap/payments', data);
        ElMessage.success('付款记录已保存');
        
        // 显示更多详细信息
        if (response.data && response.data.details) {
          ElMessage({
            message: `付款单号: ${response.data.details.paymentNumber}, 金额: ${formatCurrency(response.data.details.amount)}`,
            type: 'success',
            duration: 3000
          });
        }
        
        paymentDialogVisible.value = false;
        loadInvoices();
        
        // 如果是从详情对话框发起的付款，刷新详情
        if (detailsDialogVisible.value && invoiceDetail.value.id === paymentForm.invoiceId) {
          handleViewDetails({ id: invoiceDetail.value.id });
        }
      } catch (error) {
        console.error('保存付款记录失败:', error);
        ElMessage.error('保存付款记录失败: ' + (error.response?.data?.error || error.message));
      } finally {
        savePaymentLoading.value = false;
      }
    }
  });
};

// 重置发票表单
const resetInvoiceForm = () => {
  invoiceForm.id = null;
  invoiceForm.invoiceNumber = '';
  invoiceForm.supplierId = null;
  invoiceForm.invoiceDate = new Date().toISOString().slice(0, 10);
  invoiceForm.dueDate = '';
  invoiceForm.items = [];
  invoiceForm.notes = '';
  invoiceForm.taxRate = 0.13;
  
  // 清除校验
  if (invoiceFormRef.value) {
    invoiceFormRef.value.resetFields();
  }
};

// 分页相关方法
const handleSizeChange = (size) => {
  pageSize.value = size;
  loadInvoices();
};

const handleCurrentChange = (page) => {
  currentPage.value = page;
  loadInvoices();
};

// 页面加载时执行
onMounted(() => {
  loadInvoices();
  loadSupplierOptions();
  loadMaterialOptions();
  loadBankAccounts();
});
</script>

<style scoped>
.invoices-container {
  padding: 10px;
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

.data-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.invoice-items {
  margin-bottom: 20px;
}

.invoice-items h3 {
  margin-bottom: 10px;
}

.add-item {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.invoice-total {
  margin: 20px 0;
}

.total-line {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  padding: 5px 20px;
}

.total-amount {
  font-weight: bold;
  font-size: 16px;
  border-top: 1px solid #ebeef5;
  padding-top: 10px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

.detail-title {
  margin-top: 20px;
  margin-bottom: 10px;
}

.detail-title h3 {
  font-size: 16px;
  font-weight: bold;
  color: #409EFF;
  position: relative;
  padding-left: 12px;
}

.detail-title h3:before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  background-color: #409EFF;
  border-radius: 2px;
}

:deep(.el-descriptions) {
  margin-bottom: 20px;
}

:deep(.el-descriptions__label) {
  font-weight: bold;
}

.empty-data {
  text-align: center;
  padding: 30px 0;
  color: #909399;
}
</style> 