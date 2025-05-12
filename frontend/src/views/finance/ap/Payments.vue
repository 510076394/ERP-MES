<template>
  <div class="payments-container">
    <div class="page-header">
      <h2>付款记录管理</h2>
      <el-button type="primary" @click="showAddDialog">新增付款</el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <div class="search-form-container">
          <div class="search-form-inputs">
            <el-form-item label="付款编号">
              <el-input v-model="searchForm.paymentNumber" placeholder="输入付款编号" clearable size="default"></el-input>
            </el-form-item>
            <el-form-item label="供应商">
              <el-input v-model="searchForm.supplierName" placeholder="输入供应商名称" clearable size="default"></el-input>
            </el-form-item>
            <el-form-item label="付款日期">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                size="default"
              ></el-date-picker>
            </el-form-item>
            <el-form-item label="付款方式">
              <el-select v-model="searchForm.paymentMethod" placeholder="选择付款方式" clearable style="width: 130px" size="default">
                <el-option label="现金" value="cash"></el-option>
                <el-option label="银行转账" value="bank_transfer"></el-option>
                <el-option label="支票" value="check"></el-option>
                <el-option label="信用卡" value="credit_card"></el-option>
                <el-option label="其他" value="other"></el-option>
              </el-select>
            </el-form-item>
          </div>
          <div class="search-form-buttons">
            <el-form-item>
              <el-button type="primary" @click="searchPayments">查询</el-button>
              <el-button @click="resetSearch">重置</el-button>
            </el-form-item>
          </div>
        </div>
      </el-form>
    </el-card>
    
    <!-- 表格区域 -->
    <el-card class="data-card">
      <el-table
        :data="paymentList"
        style="width: 100%"
        border
        v-loading="loading"
      >
        <el-table-column prop="paymentNumber" label="付款编号" width="160"></el-table-column>
        <el-table-column prop="supplierName" label="供应商" width="250"></el-table-column>
        <el-table-column prop="paymentDate" label="付款日期" width="100"></el-table-column>
        <el-table-column prop="invoiceNumber" label="发票编号" width="130"></el-table-column>
        <el-table-column prop="amount" label="金额" width="200" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="paymentMethod" label="付款方式" width="90">
          <template #default="scope">
            {{ getPaymentMethodText(scope.row.paymentMethod) }}
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="120" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <div class="operation-buttons">
              <el-tooltip content="编辑" placement="top">
                <el-button type="primary" size="small" circle @click="handleEdit(scope.row)" :icon="Edit"></el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button type="danger" size="small" circle @click="handleDelete(scope.row)" :icon="Delete"></el-button>
              </el-tooltip>
              <el-tooltip content="打印" placement="top">
                <el-button type="info" size="small" circle @click="handlePrint(scope.row)" :icon="Printer"></el-button>
              </el-tooltip>
            </div>
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
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="paymentForm" :rules="paymentRules" ref="paymentFormRef" label-width="100px">
        <el-form-item label="付款编号" prop="paymentNumber">
          <el-input v-model="paymentForm.paymentNumber" placeholder="请输入付款编号"></el-input>
        </el-form-item>
        <el-form-item label="关联发票" prop="invoiceId">
          <el-select 
            v-model="paymentForm.invoiceId" 
            placeholder="请选择关联发票" 
            filterable 
            style="width: 100%"
            @change="handleInvoiceChange"
          >
            <el-option
              v-for="invoice in invoiceOptions"
              :key="invoice.id"
              :label="`${invoice.invoiceNumber} - ${invoice.supplierName} - ${formatCurrency(invoice.balance)}`"
              :value="invoice.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="供应商" prop="supplierName">
          <el-input v-model="paymentForm.supplierName" disabled></el-input>
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
        <el-form-item label="发票金额">
          <el-input v-model="paymentForm.invoiceAmount" disabled></el-input>
        </el-form-item>
        <el-form-item label="已付金额">
          <el-input v-model="paymentForm.paidAmount" disabled></el-input>
        </el-form-item>
        <el-form-item label="剩余金额">
          <el-input v-model="paymentForm.balance" disabled></el-input>
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
        <el-form-item label="备注" prop="notes">
          <el-input
            v-model="paymentForm.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          ></el-input>
        </el-form-item>
        
        <!-- 自动生成会计凭证选项 -->
        <el-form-item label="会计凭证">
          <el-switch
            v-model="paymentForm.createLedgerEntry"
            inline-prompt
            active-text="自动生成"
            inactive-text="不生成"
            :active-value="true"
            :inactive-value="false"
          ></el-switch>
          <div class="tip-text" v-if="paymentForm.createLedgerEntry">
            将自动生成应付账款付款会计凭证
          </div>
        </el-form-item>
        
        <!-- 银行账户选择，当付款方式为银行转账时显示 -->
        <el-form-item label="银行账户" prop="bankAccountId" v-if="paymentForm.paymentMethod === 'bank_transfer'">
          <el-select 
            v-model="paymentForm.bankAccountId" 
            placeholder="请选择付款银行账户" 
            filterable 
            style="width: 100%"
          >
            <el-option
              v-for="account in bankAccountOptions"
              :key="account.id"
              :label="`${account.bankName} - ${account.accountName} (${formatCurrency(account.balance)})`"
              :value="account.id"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="参考号" prop="referenceNumber" v-if="paymentForm.paymentMethod !== 'cash'">
          <el-input v-model="paymentForm.referenceNumber" placeholder="请输入付款参考号/交易号"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="savePayment" :loading="saveLoading">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Edit, Delete, Printer } from '@element-plus/icons-vue';
import axios from 'axios';

// 数据加载状态
const loading = ref(false);
const saveLoading = ref(false);

// 分页相关
const total = ref(0);
const pageSize = ref(20);
const currentPage = ref(1);

// 表单相关
const dialogVisible = ref(false);
const dialogTitle = ref('新增付款记录');
const paymentFormRef = ref(null);

// 数据列表
const paymentList = ref([]);
const invoiceOptions = ref([]);
const bankAccountOptions = ref([]);

// 搜索表单
const searchForm = reactive({
  paymentNumber: '',
  supplierName: '',
  dateRange: [],
  paymentMethod: ''
});

// 付款表单
const paymentForm = reactive({
  id: null,
  paymentNumber: '',
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
  notes: '',
  createLedgerEntry: false,
  bankAccountId: null,
  referenceNumber: ''
});

// 表单验证规则
const paymentRules = {
  paymentNumber: [
    { required: true, message: '请输入付款编号', trigger: 'blur' }
  ],
  invoiceId: [
    { required: true, message: '请选择关联发票', trigger: 'change' }
  ],
  paymentDate: [
    { required: true, message: '请选择付款日期', trigger: 'change' }
  ],
  amount: [
    { required: true, message: '请输入付款金额', trigger: 'blur' }
  ],
  paymentMethod: [
    { required: true, message: '请选择付款方式', trigger: 'change' }
  ]
};

// 格式化货币
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// 获取付款方式文本
const getPaymentMethodText = (method) => {
  const methodMap = {
    cash: '现金',
    bank_transfer: '银行转账',
    check: '支票',
    credit_card: '信用卡',
    other: '其他'
  };
  return methodMap[method] || method;
};

// 加载付款记录列表
const loadPayments = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      paymentNumber: searchForm.paymentNumber,
      supplierName: searchForm.supplierName,
      startDate: searchForm.dateRange?.[0] || '',
      endDate: searchForm.dateRange?.[1] || '',
      paymentMethod: searchForm.paymentMethod
    };
    
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/ap/payments`, { params });
    
    // 确保处理分页信息
    if (response.data && response.data.data) {
      paymentList.value = response.data.data;
      total.value = response.data.total || 0;
      
      // 如果付款记录缺少发票信息，尝试获取
      for (const payment of paymentList.value) {
        if (payment.invoiceId && !payment.invoiceNumber) {
          try {
            const invoiceResponse = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/finance/ap/invoices/${payment.invoiceId}`
            );
            if (invoiceResponse.data) {
              payment.invoiceNumber = invoiceResponse.data.invoiceNumber;
            }
          } catch (error) {
            console.error(`获取发票 ${payment.invoiceId} 详情失败:`, error);
          }
        }
      }
    } else {
      // 如果响应格式不符合预期，则设置为空数组
      paymentList.value = [];
      total.value = 0;
      console.error('返回的数据格式不正确:', response.data);
    }
  } catch (error) {
    console.error('加载付款记录失败:', error);
    ElMessage.error(`加载付款记录失败: ${error.message || '未知错误'}`);
    paymentList.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

// 加载未付清的发票选项
const loadInvoiceOptions = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/ap/invoices/unpaid`);
    invoiceOptions.value = response.data;
  } catch (error) {
    console.error('加载发票列表失败:', error);
    ElMessage.error('加载发票列表失败');
  }
};

// 加载银行账户选项
const loadBankAccountOptions = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/bank-accounts`);
    bankAccountOptions.value = response.data.data || [];
  } catch (error) {
    console.error('加载银行账户列表失败:', error);
    ElMessage.error('加载银行账户列表失败');
  }
};

// 处理发票选择变化
const handleInvoiceChange = async () => {
  if (!paymentForm.invoiceId) {
    paymentForm.supplierName = '';
    paymentForm.invoiceAmount = '';
    paymentForm.paidAmount = '';
    paymentForm.balance = '';
    paymentForm.balanceValue = 0;
    paymentForm.amount = 0;
    return;
  }
  
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/ap/invoices/${paymentForm.invoiceId}`);
    const invoice = response.data;
    
    const balance = invoice.amount - invoice.paidAmount;
    
    paymentForm.invoiceNumber = invoice.invoiceNumber;
    paymentForm.supplierName = invoice.supplierName;
    paymentForm.invoiceAmount = formatCurrency(invoice.amount);
    paymentForm.paidAmount = formatCurrency(invoice.paidAmount);
    paymentForm.balance = formatCurrency(balance);
    paymentForm.balanceValue = balance;
    paymentForm.amount = balance; // 默认填充剩余金额
  } catch (error) {
    console.error('获取发票详情失败:', error);
    ElMessage.error('获取发票详情失败');
  }
};

// 搜索付款记录
const searchPayments = () => {
  currentPage.value = 1;
  loadPayments();
};

// 重置搜索条件
const resetSearch = () => {
  searchForm.paymentNumber = '';
  searchForm.supplierName = '';
  searchForm.dateRange = [];
  searchForm.paymentMethod = '';
  searchPayments();
};

// 新增付款记录
const showAddDialog = () => {
  dialogTitle.value = '新增付款记录';
  resetPaymentForm();
  loadInvoiceOptions();
  loadBankAccountOptions();
  dialogVisible.value = true;
};

// 编辑付款记录
const handleEdit = async (row) => {
  dialogTitle.value = '编辑付款记录';
  
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/ap/payments/${row.id}`);
    const payment = response.data;
    
    resetPaymentForm();
    await loadInvoiceOptions();
    await loadBankAccountOptions();
    
    // 填充表单数据
    paymentForm.id = payment.id;
    paymentForm.paymentNumber = payment.paymentNumber;
    paymentForm.invoiceId = payment.invoiceId;
    paymentForm.paymentDate = payment.paymentDate;
    paymentForm.amount = payment.amount;
    paymentForm.paymentMethod = payment.paymentMethod;
    paymentForm.notes = payment.notes;
    
    // 加载发票信息
    await handleInvoiceChange();
    
    dialogVisible.value = true;
  } catch (error) {
    console.error('获取付款记录详情失败:', error);
    ElMessage.error('获取付款记录详情失败');
  }
};

// 删除付款记录
const handleDelete = (row) => {
  ElMessageBox.confirm('确认要删除该付款记录吗？此操作将影响关联发票的付款状态。', '警告', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/finance/ap/payments/${row.id}`);
      ElMessage.success('删除成功');
      loadPayments();
    } catch (error) {
      console.error('删除付款记录失败:', error);
      ElMessage.error('删除付款记录失败');
    }
  }).catch(() => {});
};

// 打印付款记录
const handlePrint = (row) => {
  ElMessage.info('打印付款凭证功能待实现');
};

// 保存付款记录
const savePayment = async () => {
  if (!paymentFormRef.value) return;
  
  await paymentFormRef.value.validate(async (valid) => {
    if (valid) {
      saveLoading.value = true;
      try {
        // 准备提交的数据
        const data = {
          id: paymentForm.id,
          paymentNumber: paymentForm.paymentNumber,
          invoiceId: paymentForm.invoiceId,
          paymentDate: paymentForm.paymentDate,
          amount: paymentForm.amount,
          paymentMethod: paymentForm.paymentMethod,
          notes: paymentForm.notes,
          createLedgerEntry: paymentForm.createLedgerEntry,
          bankAccountId: paymentForm.bankAccountId,
          referenceNumber: paymentForm.referenceNumber
        };
        
        if (paymentForm.id) {
          // 更新
          await axios.put(`${import.meta.env.VITE_API_URL}/api/finance/ap/payments/${paymentForm.id}`, data);
          ElMessage.success('更新成功');
        } else {
          // 新增
          await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/ap/payments`, data);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        loadPayments();
      } catch (error) {
        console.error('保存付款记录失败:', error);
        ElMessage.error('保存付款记录失败');
      } finally {
        saveLoading.value = false;
      }
    }
  });
};

// 重置付款表单
const resetPaymentForm = () => {
  paymentForm.id = null;
  paymentForm.paymentNumber = '';
  paymentForm.invoiceId = null;
  paymentForm.invoiceNumber = '';
  paymentForm.supplierName = '';
  paymentForm.invoiceAmount = '';
  paymentForm.paidAmount = '';
  paymentForm.balance = '';
  paymentForm.balanceValue = 0;
  paymentForm.paymentDate = new Date().toISOString().slice(0, 10);
  paymentForm.amount = 0;
  paymentForm.paymentMethod = 'bank_transfer';
  paymentForm.notes = '';
  paymentForm.createLedgerEntry = false;
  paymentForm.bankAccountId = null;
  paymentForm.referenceNumber = '';
  
  // 清除校验
  if (paymentFormRef.value) {
    paymentFormRef.value.resetFields();
  }
};

// 分页相关方法
const handleSizeChange = (size) => {
  pageSize.value = size;
  loadPayments();
};

const handleCurrentChange = (page) => {
  currentPage.value = page;
  loadPayments();
};

// 页面加载时执行
onMounted(() => {
  loadPayments();
});
</script>

<style scoped>
.payments-container {
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

.search-form-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.search-form-inputs {
  display: flex;
  flex-wrap: wrap;
  flex: 1;
}

.search-form-buttons {
  display: flex;
  align-items: flex-end;
}

.data-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.operation-buttons {
  display: flex;
  gap: 5px;
}

.tip-text {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.2;
  padding-left: 5px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .search-form-container {
    flex-direction: column;
  }
  
  .search-form-buttons {
    align-self: flex-end;
  }
}
</style> 