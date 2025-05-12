<template>
  <div class="invoices-container">
    <div class="page-header">
      <h2>销售发票管理</h2>
      <el-button type="primary" @click="showAddDialog">新增发票</el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="发票编号">
          <el-input v-model="searchForm.invoiceNumber" placeholder="输入发票编号" clearable></el-input>
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input v-model="searchForm.customerName" placeholder="输入客户名称" clearable></el-input>
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
        <el-table-column prop="customerName" label="客户名称" width="180"></el-table-column>
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
            <el-button type="success" size="small" @click="handleRecordPayment(scope.row)">记录收款</el-button>
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
        <el-form-item label="客户" prop="customerId">
          <el-select v-model="invoiceForm.customerId" placeholder="请选择客户" filterable style="width: 100%">
            <el-option
              v-for="customer in customerOptions"
              :key="customer.id"
              :label="customer.name"
              :value="customer.id"
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
            <el-table-column label="商品/服务">
              <template #default="scope">
                <el-select v-model="scope.row.productId" placeholder="选择商品/服务" filterable style="width: 100%">
                  <el-option
                    v-for="product in productOptions"
                    :key="product.id"
                    :label="product.name"
                    :value="product.id"
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
    
    <!-- 记录收款对话框 -->
    <el-dialog
      title="记录收款"
      v-model="paymentDialogVisible"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="paymentForm" :rules="paymentRules" ref="paymentFormRef" label-width="100px">
        <el-form-item label="发票编号">
          <el-input v-model="paymentForm.invoiceNumber" disabled></el-input>
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input v-model="paymentForm.customerName" disabled></el-input>
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
        <el-form-item label="收款日期" prop="paymentDate">
          <el-date-picker
            v-model="paymentForm.paymentDate"
            type="date"
            placeholder="选择收款日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="收款金额" prop="amount">
          <el-input-number v-model="paymentForm.amount" :precision="2" :min="0" :max="paymentForm.balanceValue" style="width: 100%"></el-input-number>
        </el-form-item>
        <el-form-item label="收款方式" prop="paymentMethod">
          <el-select v-model="paymentForm.paymentMethod" placeholder="请选择收款方式" style="width: 100%">
            <el-option label="现金" value="cash"></el-option>
            <el-option label="银行转账" value="bank_transfer"></el-option>
            <el-option label="支票" value="check"></el-option>
            <el-option label="信用卡" value="credit_card"></el-option>
            <el-option label="其他" value="other"></el-option>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

// 数据加载状态
const loading = ref(false);
const saveLoading = ref(false);
const savePaymentLoading = ref(false);

// 分页相关
const total = ref(0);
const pageSize = ref(20);
const currentPage = ref(1);

// 表单相关
const dialogVisible = ref(false);
const dialogTitle = ref('新增销售发票');
const invoiceFormRef = ref(null);
const paymentDialogVisible = ref(false);
const paymentFormRef = ref(null);

// 数据列表
const invoiceList = ref([]);
const customerOptions = ref([]);
const productOptions = ref([]);

// 搜索表单
const searchForm = reactive({
  invoiceNumber: '',
  customerName: '',
  dateRange: [],
  status: ''
});

// 发票表单
const invoiceForm = reactive({
  id: null,
  invoiceNumber: '',
  customerId: null,
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  items: [],
  notes: '',
  taxRate: 0.13 // 默认税率13%
});

// 收款表单
const paymentForm = reactive({
  invoiceId: null,
  invoiceNumber: '',
  customerName: '',
  invoiceAmount: '',
  paidAmount: '',
  balance: '',
  balanceValue: 0,
  paymentDate: new Date().toISOString().slice(0, 10),
  amount: 0,
  paymentMethod: 'bank_transfer',
  notes: ''
});

// 表单验证规则
const invoiceRules = {
  invoiceNumber: [
    { required: true, message: '请输入发票编号', trigger: 'blur' }
  ],
  customerId: [
    { required: true, message: '请选择客户', trigger: 'change' }
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
    { required: true, message: '请选择收款日期', trigger: 'change' }
  ],
  amount: [
    { required: true, message: '请输入收款金额', trigger: 'blur' }
  ],
  paymentMethod: [
    { required: true, message: '请选择收款方式', trigger: 'change' }
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
    productId: null,
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
      customerName: searchForm.customerName,
      startDate: searchForm.dateRange?.[0] || '',
      endDate: searchForm.dateRange?.[1] || '',
      status: searchForm.status
    };
    
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/ar/invoices`, { params });
    invoiceList.value = response.data.data;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载发票列表失败:', error);
    ElMessage.error('加载发票列表失败');
  } finally {
    loading.value = false;
  }
};

// 加载客户选项
const loadCustomerOptions = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/sales/customers-list`);
    customerOptions.value = response.data;
  } catch (error) {
    console.error('加载客户列表失败:', error);
    ElMessage.error('加载客户列表失败');
  }
};

// 加载产品选项
const loadProductOptions = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/sales/products-list`);
    productOptions.value = response.data;
  } catch (error) {
    console.error('加载产品列表失败:', error);
    ElMessage.error('加载产品列表失败');
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
  searchForm.customerName = '';
  searchForm.dateRange = [];
  searchForm.status = '';
  searchInvoices();
};

// 新增发票
const showAddDialog = () => {
  dialogTitle.value = '新增销售发票';
  resetInvoiceForm();
  // 添加默认一个明细项
  addInvoiceItem();
  dialogVisible.value = true;
};

// 编辑发票
const handleEdit = async (row) => {
  dialogTitle.value = '编辑销售发票';
  
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/ar/invoices/${row.id}`);
    const invoice = response.data;
    
    resetInvoiceForm();
    
    // 填充表单数据
    invoiceForm.id = invoice.id;
    invoiceForm.invoiceNumber = invoice.invoiceNumber;
    invoiceForm.customerId = invoice.customerId;
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
const handleViewDetails = (row) => {
  // 可以跳转到详情页面，或者打开一个更详细的对话框
  ElMessage.info('查看发票详情功能待实现');
};

// 记录收款
const handleRecordPayment = (row) => {
  // 计算剩余金额
  const balance = row.amount - row.paidAmount;
  
  // 填充收款表单
  paymentForm.invoiceId = row.id;
  paymentForm.invoiceNumber = row.invoiceNumber;
  paymentForm.customerName = row.customerName;
  paymentForm.invoiceAmount = formatCurrency(row.amount);
  paymentForm.paidAmount = formatCurrency(row.paidAmount);
  paymentForm.balance = formatCurrency(balance);
  paymentForm.balanceValue = balance;
  paymentForm.amount = balance; // 默认填充剩余金额
  
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
    if (!item.productId || item.quantity <= 0 || item.unitPrice <= 0) {
      ElMessage.warning('请确保所有明细项的产品、数量和单价都已填写完整');
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
        
        if (invoiceForm.id) {
          // 更新
          await axios.put(`${import.meta.env.VITE_API_URL}/api/finance/ar/invoices/${invoiceForm.id}`, data);
          ElMessage.success('更新成功');
        } else {
          // 新增
          await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/ar/invoices`, data);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        loadInvoices();
      } catch (error) {
        console.error('保存发票失败:', error);
        ElMessage.error('保存发票失败');
      } finally {
        saveLoading.value = false;
      }
    }
  });
};

// 保存收款记录
const savePayment = async () => {
  if (!paymentFormRef.value) return;
  
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
          notes: paymentForm.notes
        };
        
        await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/ar/payments`, data);
        ElMessage.success('收款记录已保存');
        
        paymentDialogVisible.value = false;
        loadInvoices();
      } catch (error) {
        console.error('保存收款记录失败:', error);
        ElMessage.error('保存收款记录失败');
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
  invoiceForm.customerId = null;
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
  loadCustomerOptions();
  loadProductOptions();
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
</style> 