<template>
  <div class="receipts-container">
    <div class="page-header">
      <h2>收款记录管理</h2>
      <el-button type="primary" @click="showAddDialog">新增收款</el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="收款编号">
          <el-input v-model="searchForm.receiptNumber" placeholder="输入收款编号" clearable></el-input>
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input v-model="searchForm.customerName" placeholder="输入客户名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="收款日期">
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
        <el-form-item label="收款方式">
          <el-select v-model="searchForm.paymentMethod" placeholder="选择收款方式" clearable style="width: 130px">
            <el-option label="现金" value="cash"></el-option>
            <el-option label="银行转账" value="bank_transfer"></el-option>
            <el-option label="支票" value="check"></el-option>
            <el-option label="信用卡" value="credit_card"></el-option>
            <el-option label="其他" value="other"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchReceipts">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 表格区域 -->
    <el-card class="data-card">
      <el-table
        :data="receiptList"
        style="width: 100%"
        border
        v-loading="loading"
      >
        <el-table-column prop="receiptNumber" label="收款编号" width="150"></el-table-column>
        <el-table-column prop="customerName" label="客户名称" width="180"></el-table-column>
        <el-table-column prop="receiptDate" label="收款日期" width="120"></el-table-column>
        <el-table-column prop="invoiceNumber" label="对应发票" width="150"></el-table-column>
        <el-table-column prop="amount" label="收款金额" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="paymentMethod" label="收款方式" width="120">
          <template #default="scope">
            {{ getPaymentMethodText(scope.row.paymentMethod) }}
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
            <el-button type="info" size="small" @click="handlePrint(scope.row)">打印</el-button>
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
      <el-form :model="receiptForm" :rules="receiptRules" ref="receiptFormRef" label-width="100px">
        <el-form-item label="收款编号" prop="receiptNumber">
          <el-input v-model="receiptForm.receiptNumber" placeholder="请输入收款编号"></el-input>
        </el-form-item>
        <el-form-item label="关联发票" prop="invoiceId">
          <el-select 
            v-model="receiptForm.invoiceId" 
            placeholder="请选择关联发票" 
            filterable 
            style="width: 100%"
            @change="handleInvoiceChange"
          >
            <el-option
              v-for="invoice in invoiceOptions"
              :key="invoice.id"
              :label="`${invoice.invoiceNumber} - ${invoice.customerName} - ${formatCurrency(invoice.balance)}`"
              :value="invoice.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="客户" prop="customerName">
          <el-input v-model="receiptForm.customerName" disabled></el-input>
        </el-form-item>
        <el-form-item label="收款日期" prop="receiptDate">
          <el-date-picker
            v-model="receiptForm.receiptDate"
            type="date"
            placeholder="选择收款日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="发票金额">
          <el-input v-model="receiptForm.invoiceAmount" disabled></el-input>
        </el-form-item>
        <el-form-item label="已付金额">
          <el-input v-model="receiptForm.paidAmount" disabled></el-input>
        </el-form-item>
        <el-form-item label="剩余金额">
          <el-input v-model="receiptForm.balance" disabled></el-input>
        </el-form-item>
        <el-form-item label="收款金额" prop="amount">
          <el-input-number v-model="receiptForm.amount" :precision="2" :min="0" :max="receiptForm.balanceValue" style="width: 100%"></el-input-number>
        </el-form-item>
        <el-form-item label="收款方式" prop="paymentMethod">
          <el-select v-model="receiptForm.paymentMethod" placeholder="请选择收款方式" style="width: 100%">
            <el-option label="现金" value="cash"></el-option>
            <el-option label="银行转账" value="bank_transfer"></el-option>
            <el-option label="支票" value="check"></el-option>
            <el-option label="信用卡" value="credit_card"></el-option>
            <el-option label="其他" value="other"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="notes">
          <el-input
            v-model="receiptForm.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveReceipt" :loading="saveLoading">确认</el-button>
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

// 分页相关
const total = ref(0);
const pageSize = ref(20);
const currentPage = ref(1);

// 表单相关
const dialogVisible = ref(false);
const dialogTitle = ref('新增收款记录');
const receiptFormRef = ref(null);

// 数据列表
const receiptList = ref([]);
const invoiceOptions = ref([]);

// 搜索表单
const searchForm = reactive({
  receiptNumber: '',
  customerName: '',
  dateRange: [],
  paymentMethod: ''
});

// 收款表单
const receiptForm = reactive({
  id: null,
  receiptNumber: '',
  invoiceId: null,
  invoiceNumber: '',
  customerName: '',
  invoiceAmount: '',
  paidAmount: '',
  balance: '',
  balanceValue: 0,
  receiptDate: new Date().toISOString().slice(0, 10),
  amount: 0,
  paymentMethod: 'bank_transfer',
  notes: ''
});

// 表单验证规则
const receiptRules = {
  receiptNumber: [
    { required: true, message: '请输入收款编号', trigger: 'blur' }
  ],
  invoiceId: [
    { required: true, message: '请选择关联发票', trigger: 'change' }
  ],
  receiptDate: [
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

// 获取收款方式文本
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

// 加载收款记录列表
const loadReceipts = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      receiptNumber: searchForm.receiptNumber,
      customerName: searchForm.customerName,
      startDate: searchForm.dateRange?.[0] || '',
      endDate: searchForm.dateRange?.[1] || '',
      paymentMethod: searchForm.paymentMethod
    };
    
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/ar/receipts`, { params });
    receiptList.value = response.data.data;
    total.value = response.data.total;
  } catch (error) {
    console.error('加载收款记录失败:', error);
    ElMessage.error('加载收款记录失败');
  } finally {
    loading.value = false;
  }
};

// 加载未付清的发票选项
const loadInvoiceOptions = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/ar/invoices/unpaid`);
    invoiceOptions.value = response.data;
  } catch (error) {
    console.error('加载发票列表失败:', error);
    ElMessage.error('加载发票列表失败');
  }
};

// 处理发票选择变化
const handleInvoiceChange = async () => {
  if (!receiptForm.invoiceId) {
    receiptForm.customerName = '';
    receiptForm.invoiceAmount = '';
    receiptForm.paidAmount = '';
    receiptForm.balance = '';
    receiptForm.balanceValue = 0;
    receiptForm.amount = 0;
    return;
  }
  
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/ar/invoices/${receiptForm.invoiceId}`);
    const invoice = response.data;
    
    const balance = invoice.amount - invoice.paidAmount;
    
    receiptForm.invoiceNumber = invoice.invoiceNumber;
    receiptForm.customerName = invoice.customerName;
    receiptForm.invoiceAmount = formatCurrency(invoice.amount);
    receiptForm.paidAmount = formatCurrency(invoice.paidAmount);
    receiptForm.balance = formatCurrency(balance);
    receiptForm.balanceValue = balance;
    receiptForm.amount = balance; // 默认填充剩余金额
  } catch (error) {
    console.error('获取发票详情失败:', error);
    ElMessage.error('获取发票详情失败');
  }
};

// 搜索收款记录
const searchReceipts = () => {
  currentPage.value = 1;
  loadReceipts();
};

// 重置搜索条件
const resetSearch = () => {
  searchForm.receiptNumber = '';
  searchForm.customerName = '';
  searchForm.dateRange = [];
  searchForm.paymentMethod = '';
  searchReceipts();
};

// 新增收款记录
const showAddDialog = () => {
  dialogTitle.value = '新增收款记录';
  resetReceiptForm();
  loadInvoiceOptions();
  dialogVisible.value = true;
};

// 编辑收款记录
const handleEdit = async (row) => {
  dialogTitle.value = '编辑收款记录';
  
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/ar/receipts/${row.id}`);
    const receipt = response.data;
    
    resetReceiptForm();
    await loadInvoiceOptions();
    
    // 填充表单数据
    receiptForm.id = receipt.id;
    receiptForm.receiptNumber = receipt.receiptNumber;
    receiptForm.invoiceId = receipt.invoiceId;
    receiptForm.receiptDate = receipt.receiptDate;
    receiptForm.amount = receipt.amount;
    receiptForm.paymentMethod = receipt.paymentMethod;
    receiptForm.notes = receipt.notes;
    
    // 加载发票信息
    await handleInvoiceChange();
    
    dialogVisible.value = true;
  } catch (error) {
    console.error('获取收款记录详情失败:', error);
    ElMessage.error('获取收款记录详情失败');
  }
};

// 删除收款记录
const handleDelete = (row) => {
  ElMessageBox.confirm('确认要删除该收款记录吗？此操作将影响关联发票的收款状态。', '警告', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/finance/ar/receipts/${row.id}`);
      ElMessage.success('删除成功');
      loadReceipts();
    } catch (error) {
      console.error('删除收款记录失败:', error);
      ElMessage.error('删除收款记录失败');
    }
  }).catch(() => {});
};

// 打印收款记录
const handlePrint = (row) => {
  ElMessage.info('打印收款凭证功能待实现');
};

// 保存收款记录
const saveReceipt = async () => {
  if (!receiptFormRef.value) return;
  
  await receiptFormRef.value.validate(async (valid) => {
    if (valid) {
      saveLoading.value = true;
      try {
        // 准备提交的数据
        const data = {
          id: receiptForm.id,
          receiptNumber: receiptForm.receiptNumber,
          invoiceId: receiptForm.invoiceId,
          receiptDate: receiptForm.receiptDate,
          amount: receiptForm.amount,
          paymentMethod: receiptForm.paymentMethod,
          notes: receiptForm.notes
        };
        
        if (receiptForm.id) {
          // 更新
          await axios.put(`${import.meta.env.VITE_API_URL}/api/finance/ar/receipts/${receiptForm.id}`, data);
          ElMessage.success('更新成功');
        } else {
          // 新增
          await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/ar/receipts`, data);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        loadReceipts();
      } catch (error) {
        console.error('保存收款记录失败:', error);
        ElMessage.error('保存收款记录失败');
      } finally {
        saveLoading.value = false;
      }
    }
  });
};

// 重置收款表单
const resetReceiptForm = () => {
  receiptForm.id = null;
  receiptForm.receiptNumber = '';
  receiptForm.invoiceId = null;
  receiptForm.invoiceNumber = '';
  receiptForm.customerName = '';
  receiptForm.invoiceAmount = '';
  receiptForm.paidAmount = '';
  receiptForm.balance = '';
  receiptForm.balanceValue = 0;
  receiptForm.receiptDate = new Date().toISOString().slice(0, 10);
  receiptForm.amount = 0;
  receiptForm.paymentMethod = 'bank_transfer';
  receiptForm.notes = '';
  
  // 清除校验
  if (receiptFormRef.value) {
    receiptFormRef.value.resetFields();
  }
};

// 分页相关方法
const handleSizeChange = (size) => {
  pageSize.value = size;
  loadReceipts();
};

const handleCurrentChange = (page) => {
  currentPage.value = page;
  loadReceipts();
};

// 页面加载时执行
onMounted(() => {
  loadReceipts();
});
</script>

<style scoped>
.receipts-container {
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style> 