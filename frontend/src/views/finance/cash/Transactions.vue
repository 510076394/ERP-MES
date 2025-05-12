<template>
  <div class="transactions-container">
    <div class="page-header">
      <h2>现金交易管理</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="showAddDialog">新增交易</el-button>
        <el-button type="success" @click="exportTransactions">导出数据</el-button>
      </div>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="交易日期">
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
        <el-form-item label="交易类型">
          <el-select v-model="searchForm.type" placeholder="选择类型" clearable>
            <el-option label="收入" value="income"></el-option>
            <el-option label="支出" value="expense"></el-option>
            <el-option label="转账" value="transfer"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="交易账户">
          <el-select v-model="searchForm.accountId" placeholder="选择账户" clearable>
            <el-option
              v-for="item in accountOptions"
              :key="item.id"
              :label="item.accountName"
              :value="item.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="交易金额">
          <el-input-number
            v-model="searchForm.minAmount"
            :precision="2"
            :step="100"
            style="width: 120px"
            placeholder="最小金额"
          ></el-input-number>
          <span style="margin: 0 5px;">-</span>
          <el-input-number
            v-model="searchForm.maxAmount"
            :precision="2"
            :step="100"
            style="width: 120px"
            placeholder="最大金额"
          ></el-input-number>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchTransactions">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ transactionStats.totalCount }}</div>
        <div class="stat-label">交易笔数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatCurrency(transactionStats.totalIncome) }}</div>
        <div class="stat-label">总收入</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatCurrency(transactionStats.totalExpense) }}</div>
        <div class="stat-label">总支出</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatCurrency(transactionStats.netAmount) }}</div>
        <div class="stat-label">净收入</div>
      </el-card>
    </div>
    
    <!-- 数据表格 -->
    <el-card class="data-card">
      <el-table
        :data="transactionList"
        style="width: 100%"
        border
        v-loading="loading"
      >
        <el-table-column prop="transactionDate" label="交易日期" width="100">
          <template #default="scope">
            {{ formatDate(scope.row.transactionDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="accountName" label="交易账户" min-width="150"></el-table-column>
        <el-table-column label="交易类型" width="90">
          <template #default="scope">
            <el-tag 
              :type="scope.row.type === 'income' ? 'success' : (scope.row.type === 'expense' ? 'danger' : 'info')"
            >
              {{ getTransactionTypeText(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="交易金额" width="120" align="right">
          <template #default="scope">
            <span :class="[scope.row.type === 'income' ? 'positive-value' : (scope.row.type === 'expense' ? 'negative-value' : '')]">
              {{ formatCurrency(scope.row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="counterparty" label="交易对方" min-width="120"></el-table-column>
        <el-table-column prop="description" label="交易描述" min-width="180"></el-table-column>
        <el-table-column label="交易分类" width="120">
          <template #default="scope">
            {{ getCategoryDisplayText(scope.row.category) }}
          </template>
        </el-table-column>
        <el-table-column label="支付方式" width="100">
          <template #default="scope">
            {{ getPaymentMethodDisplayText(scope.row.paymentMethod) }}
          </template>
        </el-table-column>
        <el-table-column prop="referenceNumber" label="参考号" width="120"></el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
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
    
    <!-- 添加/编辑交易对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="transactionForm" :rules="transactionRules" ref="transactionFormRef" label-width="100px">
        <el-form-item label="交易类型" prop="type">
          <el-radio-group v-model="transactionForm.type" @change="handleTypeChange">
            <el-radio value="income">收入</el-radio>
            <el-radio value="expense">支出</el-radio>
            <el-radio value="transfer">转账</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="交易日期" prop="transactionDate">
          <el-date-picker
            v-model="transactionForm.transactionDate"
            type="date"
            placeholder="选择交易日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          ></el-date-picker>
        </el-form-item>
        
        <el-form-item :label="transactionForm.type === 'transfer' ? '源账户' : '交易账户'" prop="accountId">
          <el-select v-model="transactionForm.accountId" placeholder="请选择账户" style="width: 100%">
            <el-option
              v-for="item in accountOptions"
              :key="item.id"
              :label="item.accountName"
              :value="item.id"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item v-if="transactionForm.type === 'transfer'" label="目标账户" prop="targetAccountId">
          <el-select v-model="transactionForm.targetAccountId" placeholder="请选择目标账户" style="width: 100%">
            <el-option
              v-for="item in accountOptions.filter(acc => acc.id !== transactionForm.accountId)"
              :key="item.id"
              :label="item.accountName"
              :value="item.id"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="交易金额" prop="amount">
          <el-input-number 
            v-model="transactionForm.amount" 
            :precision="2" 
            :step="100"
            style="width: 100%"
          ></el-input-number>
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="交易分类" prop="category">
              <el-select v-model="transactionForm.category" placeholder="请选择分类" style="width: 100%">
                <el-option-group v-if="transactionForm.type === 'income'" label="收入类别">
                  <el-option label="销售收入" value="sales_income"></el-option>
                  <el-option label="投资收益" value="investment_income"></el-option>
                  <el-option label="利息收入" value="interest_income"></el-option>
                  <el-option label="其他收入" value="other_income"></el-option>
                </el-option-group>
                <el-option-group v-if="transactionForm.type === 'expense'" label="支出类别">
                  <el-option label="采购支出" value="purchase_expense"></el-option>
                  <el-option label="工资支出" value="salary_expense"></el-option>
                  <el-option label="租金支出" value="rent_expense"></el-option>
                  <el-option label="水电费" value="utility_expense"></el-option>
                  <el-option label="办公费用" value="office_expense"></el-option>
                  <el-option label="其他支出" value="other_expense"></el-option>
                </el-option-group>
                <el-option-group v-if="transactionForm.type === 'transfer'" label="转账类别">
                  <el-option label="内部转账" value="internal_transfer"></el-option>
                  <el-option label="资金调拨" value="fund_allocation"></el-option>
                </el-option-group>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="支付方式" prop="paymentMethod">
              <el-select v-model="transactionForm.paymentMethod" placeholder="请选择支付方式" style="width: 100%">
                <el-option label="现金" value="cash"></el-option>
                <el-option label="银行转账" value="bank_transfer"></el-option>
                <el-option label="支票" value="check"></el-option>
                <el-option label="信用卡" value="credit_card"></el-option>
                <el-option label="电子支付" value="electronic_payment"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="交易对方" prop="counterparty">
          <el-input v-model="transactionForm.counterparty" placeholder="请输入交易对方名称"></el-input>
        </el-form-item>
        
        <el-form-item label="交易描述" prop="description">
          <el-input
            v-model="transactionForm.description"
            type="textarea"
            :rows="2"
            placeholder="请输入交易描述"
          ></el-input>
        </el-form-item>
        
        <el-form-item label="参考号" prop="referenceNumber">
          <el-input v-model="transactionForm.referenceNumber" placeholder="请输入参考号/单据号"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveTransaction" :loading="saveLoading">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

// 数据加载状态
const loading = ref(false);
const saveLoading = ref(false);

// 分页相关
const total = ref(0);
const pageSize = ref(10);
const currentPage = ref(1);

// 对话框状态
const dialogVisible = ref(false);
const dialogTitle = ref('新增交易');

// 表单相关
const transactionFormRef = ref(null);

// 数据列表
const transactionList = ref([]);
const accountOptions = ref([]);

// 交易统计
const transactionStats = reactive({
  totalCount: 0,
  totalIncome: 0,
  totalExpense: 0,
  netAmount: 0
});

// 搜索表单
const searchForm = reactive({
  dateRange: null,
  type: '',
  accountId: '',
  minAmount: null,
  maxAmount: null
});

// 交易表单
const transactionForm = reactive({
  id: null,
  type: 'income',
  transactionDate: new Date().toISOString().slice(0, 10),
  accountId: null,
  targetAccountId: null,
  amount: 0,
  category: '',
  paymentMethod: 'bank_transfer',
  counterparty: '',
  description: '',
  referenceNumber: '',
  transactionNumber: ''
});

// 表单验证规则
const transactionRules = {
  type: [
    { required: true, message: '请选择交易类型', trigger: 'change' }
  ],
  transactionDate: [
    { required: true, message: '请选择交易日期', trigger: 'change' }
  ],
  accountId: [
    { required: true, message: '请选择账户', trigger: 'change' }
  ],
  targetAccountId: [
    { required: true, message: '请选择目标账户', trigger: 'change' }
  ],
  amount: [
    { required: true, message: '请输入交易金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '金额必须大于0', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择交易分类', trigger: 'change' }
  ],
  paymentMethod: [
    { required: true, message: '请选择支付方式', trigger: 'change' }
  ],
  counterparty: [
    { required: true, message: '请输入交易对方', trigger: 'blur' }
  ]
};

// 监听交易类型变化，重置相关字段
watch(() => transactionForm.type, (newType) => {
  transactionForm.category = '';
  if (newType === 'transfer') {
    transactionForm.targetAccountId = null;
  } else {
    transactionForm.targetAccountId = undefined;
  }
});

// 格式化货币
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// 获取交易类型文本
const getTransactionTypeText = (type) => {
  const typeMap = {
    income: '收入',
    expense: '支出',
    transfer: '转账'
  };
  return typeMap[type] || type;
};

// 获取分类显示文本
const getCategoryDisplayText = (category) => {
  const categoryMap = {
    'sales_income': '销售收入',
    'investment_income': '投资收益',
    'interest_income': '利息收入',
    'other_income': '其他收入',
    'purchase_expense': '采购支出',
    'salary_expense': '工资支出',
    'rent_expense': '租金支出',
    'utility_expense': '水电费',
    'office_expense': '办公费用',
    'other_expense': '其他支出',
    'internal_transfer': '内部转账',
    'fund_allocation': '资金调拨'
  };
  return categoryMap[category] || category || '';
};

// 获取支付方式显示文本
const getPaymentMethodDisplayText = (method) => {
  const methodMap = {
    'cash': '现金',
    'bank_transfer': '银行转账',
    'check': '支票',
    'credit_card': '信用卡',
    'electronic_payment': '电子支付'
  };
  return methodMap[method] || method || '';
};

// 格式化日期，只显示年月日
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  // 如果日期包含T和Z，说明是ISO格式，需要处理
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  return dateStr;
};

// 加载交易列表
const loadTransactions = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      accountId: searchForm.accountId,
      transactionType: searchForm.type,
      minAmount: searchForm.minAmount,
      maxAmount: searchForm.maxAmount
    };
    
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0];
      params.endDate = searchForm.dateRange[1];
    }
    
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/bank-transactions`, { params });
    console.log('交易列表响应数据:', response.data);
    
    // 确保数据格式正确并进行字段映射
    transactionList.value = (response.data.data || []).map(item => {
      console.log('处理交易项目原始数据:', item);
      console.log('交易描述:', item.description);
      console.log('参考号:', item.reference_number);
      
      // 格式化交易日期，去除时间部分
      let formattedDate = item.transaction_date;
      if (formattedDate && typeof formattedDate === 'string' && formattedDate.includes('T')) {
        formattedDate = formattedDate.split('T')[0];
      }
      
      // 将后端数据映射到前端格式
      const result = {
        id: item.id,
        transactionDate: formattedDate,
        accountName: item.account_name,
        accountId: item.bank_account_id,
        type: mapTransactionTypeToFrontend(item.transaction_type),
        amount: parseFloat(item.amount),
        counterparty: item.related_party || '',
        description: item.description || '',
        category: getCategoryFromDescription(item.description || ''),
        paymentMethod: getPaymentMethodFromDescription(item.description || '') || 'bank_transfer',
        referenceNumber: item.reference_number || ''
      };
      
      console.log('处理后数据:', result);
      return result;
    });
    
    total.value = response.data.total || 0;
    
    // 加载交易统计
    await loadTransactionsStats();
  } catch (error) {
    console.error('加载交易列表失败:', error);
    ElMessage.error('加载交易列表失败');
    
    // 如果加载交易失败，仍然尝试加载统计数据
    try {
      await loadTransactionsStats();
    } catch (statsError) {
      console.error('加载统计数据失败:', statsError);
      resetTransactionStats();
    }
  } finally {
    loading.value = false;
  }
};

// 加载账户选项
const loadAccountOptions = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/bank-accounts`);
    accountOptions.value = response.data.data || [];
  } catch (error) {
    console.error('加载账户列表失败:', error);
    ElMessage.error('加载账户列表失败');
  }
};

// 加载交易统计
const loadTransactionsStats = async () => {
  try {
    const params = {};
    
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0];
      params.endDate = searchForm.dateRange[1];
    }
    
    if (searchForm.accountId) {
      params.accountId = searchForm.accountId;
    }
    
    if (searchForm.type) {
      params.transactionType = searchForm.type;
    }
    
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/statistics/cash-flow`, { params });
    console.log('交易统计响应数据:', response.data);
    
    if (response.data && response.data.data) {
      const stats = response.data.data;
      
      // 使用后端返回的统计摘要数据
      if (stats.summary) {
        // 更新统计数据，确保所有值都是有效数字
        transactionStats.totalCount = stats.summary.totalCount || 0;
        transactionStats.totalIncome = typeof stats.summary.totalIncome === 'number' ? stats.summary.totalIncome : 0;
        transactionStats.totalExpense = typeof stats.summary.totalExpense === 'number' ? stats.summary.totalExpense : 0;
        transactionStats.netAmount = typeof stats.summary.netAmount === 'number' ? stats.summary.netAmount : 0;
        
        console.log('更新后的统计数据:', transactionStats);
      } else {
        // 后端未返回摘要数据，重置为0
        resetTransactionStats();
      }
    } else {
      // 请求成功但没有数据，重置统计
      resetTransactionStats();
    }
  } catch (error) {
    console.error('加载交易统计失败:', error);
    // 请求失败，重置统计
    resetTransactionStats();
  }
};

// 重置统计数据
const resetTransactionStats = () => {
  transactionStats.totalCount = 0;
  transactionStats.totalIncome = 0;
  transactionStats.totalExpense = 0;
  transactionStats.netAmount = 0;
};

// 搜索交易
const searchTransactions = () => {
  currentPage.value = 1;
  loadTransactions();
};

// 重置搜索条件
const resetSearch = () => {
  searchForm.dateRange = null;
  searchForm.type = '';
  searchForm.accountId = '';
  searchForm.minAmount = null;
  searchForm.maxAmount = null;
  searchTransactions();
};

// 新增交易
const showAddDialog = () => {
  dialogTitle.value = '新增交易';
  resetTransactionForm();
  dialogVisible.value = true;
};

// 编辑交易
const handleEdit = (row) => {
  dialogTitle.value = '编辑交易';
  resetTransactionForm();
  
  // 获取交易详情
  axios.get(`${import.meta.env.VITE_API_URL}/api/finance/bank-transactions/${row.id}`)
    .then(response => {
      if (response.data && response.data.data) {
        const transaction = response.data.data;
        console.log('获取到交易详情:', transaction);
        
        // 填充表单数据
        transactionForm.id = row.id;
        transactionForm.type = row.type;
        transactionForm.transactionDate = row.transactionDate;
        transactionForm.accountId = row.accountId;
        transactionForm.amount = row.amount;
        transactionForm.category = row.category;
        transactionForm.paymentMethod = row.paymentMethod;
        transactionForm.counterparty = row.counterparty;
        transactionForm.description = row.description;
        transactionForm.referenceNumber = row.referenceNumber;
        // 保存交易编号，用于更新操作
        transactionForm.transactionNumber = transaction.transaction_number;
        
        dialogVisible.value = true;
      } else {
        ElMessage.warning('获取交易详情失败');
      }
    })
    .catch(error => {
      console.error('获取交易详情失败:', error);
      
      // 如果API不存在，仍然使用行数据填充表单
      if (error.response && error.response.status === 404) {
        console.log('交易详情API不存在，使用行数据');
        
        // 填充表单数据
        transactionForm.id = row.id;
        transactionForm.type = row.type;
        transactionForm.transactionDate = row.transactionDate;
        transactionForm.accountId = row.accountId;
        transactionForm.amount = row.amount;
        transactionForm.category = row.category;
        transactionForm.paymentMethod = row.paymentMethod;
        transactionForm.counterparty = row.counterparty;
        transactionForm.description = row.description;
        transactionForm.referenceNumber = row.referenceNumber;
        // 生成一个假的交易编号
        transactionForm.transactionNumber = `EDIT-${Date.now()}`;
        
        dialogVisible.value = true;
      } else {
        ElMessage.error('获取交易详情失败');
      }
    });
};

// 重置交易表单
const resetTransactionForm = () => {
  transactionForm.id = null;
  transactionForm.type = 'income';
  transactionForm.transactionDate = new Date().toISOString().slice(0, 10);
  transactionForm.accountId = null;
  transactionForm.targetAccountId = null;
  transactionForm.amount = 0;
  transactionForm.category = '';
  transactionForm.paymentMethod = 'bank_transfer';
  transactionForm.counterparty = '';
  transactionForm.description = '';
  transactionForm.referenceNumber = '';
  transactionForm.transactionNumber = '';
  
  // 清除校验
  if (transactionFormRef.value) {
    transactionFormRef.value.resetFields();
  }
};

// 处理类型变化
const handleTypeChange = () => {
  // 重置与交易类型相关的字段
  transactionForm.category = '';
};

// 删除交易
const handleDelete = (row) => {
  ElMessageBox.confirm('确认要删除该交易记录吗？此操作不可恢复！', '警告', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/finance/bank-transactions/${row.id}`);
      ElMessage.success('删除成功');
      loadTransactions();
    } catch (error) {
      console.error('删除交易失败:', error);
      ElMessage.error('删除交易失败');
    }
  }).catch(() => {});
};

// 保存交易
const saveTransaction = async () => {
  if (!transactionFormRef.value) return;
  
  await transactionFormRef.value.validate(async (valid) => {
    if (valid) {
      saveLoading.value = true;
      try {
        // 生成交易编号（仅用于新交易）
        let transactionNumber = '';
        if (!transactionForm.id) {
          const now = new Date();
          transactionNumber = `TX${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        }
        
        // 获取分类和支付方式的显示文本
        const categoryText = getCategoryDisplayText(transactionForm.category);
        const paymentMethodText = getPaymentMethodDisplayText(transactionForm.paymentMethod);
        
        // 在描述中包含分类和支付方式信息，便于后续解析
        let enhancedDescription = transactionForm.description || '';
        if (categoryText && !enhancedDescription.includes(categoryText)) {
          enhancedDescription = `${categoryText} - ${enhancedDescription}`;
        }
        if (paymentMethodText && !enhancedDescription.includes(paymentMethodText)) {
          enhancedDescription = `${enhancedDescription} (${paymentMethodText})`;
        }
        
        // 确保日期格式正确 (YYYY-MM-DD)
        let formattedDate = transactionForm.transactionDate;
        if (typeof formattedDate === 'object' && formattedDate instanceof Date) {
          formattedDate = formattedDate.toISOString().split('T')[0];
        } else if (typeof formattedDate === 'string' && formattedDate.includes('T')) {
          formattedDate = formattedDate.split('T')[0];
        }
        
        // 准备提交的数据
        const data = {
          bank_account_id: transactionForm.accountId,
          transaction_date: formattedDate,
          transaction_type: mapTransactionType(transactionForm.type),
          amount: parseFloat(transactionForm.amount),
          description: enhancedDescription.trim(),
          reference_number: transactionForm.referenceNumber || '',
          related_party: transactionForm.counterparty || '',
          is_reconciled: false,  // 新增交易默认未对账
          reconciliation_date: null,
          // 添加额外的分类和支付方式，虽然后端API可能不直接使用，但可能对以后的扩展有用
          category: transactionForm.category,
          payment_method: transactionForm.paymentMethod
        };
        
        // 对于编辑操作，保留原交易编号
        if (transactionForm.id) {
          // 对于更新操作，我们需要保留原始的交易编号
          console.log('更新交易，ID:', transactionForm.id);
          
          try {
            console.log('发送的日期数据:', data.transaction_date);
            
            const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/finance/bank-transactions/${transactionForm.id}`, {
              ...data,
              transaction_number: transactionForm.transactionNumber || `UPDATE-${Date.now()}`
            });
            console.log('更新交易响应:', response.data);
            ElMessage.success('更新成功');
            dialogVisible.value = false;
            loadTransactions();
          } catch (updateError) {
            console.error('更新交易失败:', updateError);
            
            // 如果是404错误（API不存在），提供更友好的错误提示
            if (updateError.response && updateError.response.status === 404) {
              ElMessage.error({
                message: '更新交易失败：后台API尚未实现，请联系开发人员',
                duration: 5000
              });
              // 提示用户可以删除并重新创建
              ElMessageBox.confirm(
                '更新交易API尚未实现。您可以删除此交易并创建新交易来替代它。要继续吗？',
                '操作提示',
                {
                  confirmButtonText: '删除并重新创建',
                  cancelButtonText: '取消',
                  type: 'warning'
                }
              ).then(() => {
                // 用户确认，执行删除后创建新交易
                handleDeleteAndRecreate(transactionForm);
              }).catch(() => {
                // 用户取消，不做任何操作
              });
            } else {
              // 其他错误
              ElMessage.error(`更新交易失败: ${updateError.response?.data?.message || updateError.message}`);
            }
          }
        } else {
          // 新增交易
          try {
            // 确保日期格式正确 (YYYY-MM-DD)
            const formattedDate = transactionForm.transactionDate;
            if (typeof formattedDate === 'object' && formattedDate instanceof Date) {
              data.transaction_date = formattedDate.toISOString().split('T')[0];
            } else if (typeof formattedDate === 'string' && formattedDate.includes('T')) {
              data.transaction_date = formattedDate.split('T')[0];
            }
            
            console.log('发送的日期数据:', data.transaction_date);
            
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/bank-transactions`, {
              ...data,
              transaction_number: transactionNumber
            });
            console.log('创建交易响应:', response.data);
            
            // 显示成功信息，包括新的余额
            if (response.data && response.data.data && response.data.data.newBalance !== undefined) {
              const accountName = accountOptions.value.find(acc => acc.id === transactionForm.accountId)?.accountName || '';
              ElMessage.success(`添加成功！${accountName}账户新余额: ${formatCurrency(response.data.data.newBalance)}`);
            } else {
              ElMessage.success('添加成功');
            }
            dialogVisible.value = false;
            loadTransactions();
          } catch (createError) {
            console.error('创建交易失败:', createError);
            ElMessage.error(`创建交易失败: ${createError.response?.data?.message || createError.message}`);
          }
        }
      } catch (error) {
        console.error('保存交易失败:', error);
        console.error('错误详情:', error.response?.data || error.message);
        ElMessage.error(`保存交易失败: ${error.response?.data?.message || error.message}`);
      } finally {
        saveLoading.value = false;
      }
    }
  });
};

// 删除并重新创建交易
const handleDeleteAndRecreate = async (transaction) => {
  try {
    // 删除交易
    await axios.delete(`${import.meta.env.VITE_API_URL}/api/finance/bank-transactions/${transaction.id}`);
    
    // 生成新交易编号
    const now = new Date();
    const transactionNumber = `TX${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    // 获取分类和支付方式的显示文本
    const categoryText = getCategoryDisplayText(transaction.category);
    const paymentMethodText = getPaymentMethodDisplayText(transaction.paymentMethod);
    
    // 在描述中包含分类和支付方式信息
    let enhancedDescription = transaction.description || '';
    if (categoryText && !enhancedDescription.includes(categoryText)) {
      enhancedDescription = `${categoryText} - ${enhancedDescription}`;
    }
    if (paymentMethodText && !enhancedDescription.includes(paymentMethodText)) {
      enhancedDescription = `${enhancedDescription} (${paymentMethodText})`;
    }
    
    // 确保日期格式正确 (YYYY-MM-DD)
    let formattedDate = transaction.transactionDate;
    if (typeof formattedDate === 'object' && formattedDate instanceof Date) {
      formattedDate = formattedDate.toISOString().split('T')[0];
    } else if (typeof formattedDate === 'string' && formattedDate.includes('T')) {
      formattedDate = formattedDate.split('T')[0];
    }
    
    // 创建新交易
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/bank-transactions`, {
      bank_account_id: transaction.accountId,
      transaction_date: formattedDate,
      transaction_type: mapTransactionType(transaction.type),
      amount: parseFloat(transaction.amount),
      description: enhancedDescription.trim(),
      reference_number: transaction.referenceNumber || '',
      related_party: transaction.counterparty || '',
      transaction_number: transactionNumber,
      is_reconciled: false,
      reconciliation_date: null,
      category: transaction.category,
      payment_method: transaction.paymentMethod
    });
    
    ElMessage.success('交易已重新创建');
    dialogVisible.value = false;
    loadTransactions();
  } catch (error) {
    console.error('删除并重新创建交易失败:', error);
    ElMessage.error(`操作失败: ${error.response?.data?.message || error.message}`);
  }
};

// 映射交易类型到后端支持的类型
const mapTransactionType = (type) => {
  const typeMap = {
    'income': '存款',
    'expense': '取款',
    'transfer': '转账'
  };
  return typeMap[type] || type;
};

// 映射后端交易类型到前端类型
const mapTransactionTypeToFrontend = (backendType) => {
  const typeMap = {
    // 中文类型映射
    '存款': 'income',
    '转入': 'income',
    '利息': 'income',
    '收入': 'income',
    '取款': 'expense',
    '转出': 'expense',
    '费用': 'expense',
    '支出': 'expense',
    // 英文类型保持不变
    'income': 'income',
    'expense': 'expense',
    'transfer': 'transfer',
    'transfer_in': 'income',
    'transfer_out': 'expense',
    'deposit': 'income',
    'withdrawal': 'expense',
    'interest': 'income',
    'fee': 'expense'
  };
  
  return typeMap[backendType] || 'income'; // 默认为收入类型
};

// 从描述中提取交易分类
const getCategoryFromDescription = (description) => {
  // 分类映射
  const categoryPatterns = [
    { pattern: /(销售收入|sales income)/i, category: 'sales_income' },
    { pattern: /(投资收益|investment income)/i, category: 'investment_income' },
    { pattern: /(利息收入|interest income)/i, category: 'interest_income' },
    { pattern: /(其他收入|other income)/i, category: 'other_income' },
    { pattern: /(采购支出|purchase expense)/i, category: 'purchase_expense' },
    { pattern: /(工资支出|salary expense)/i, category: 'salary_expense' },
    { pattern: /(租金支出|rent expense)/i, category: 'rent_expense' },
    { pattern: /(水电费|utility expense)/i, category: 'utility_expense' },
    { pattern: /(办公费用|office expense)/i, category: 'office_expense' },
    { pattern: /(其他支出|other expense)/i, category: 'other_expense' },
    { pattern: /(内部转账|internal transfer)/i, category: 'internal_transfer' },
    { pattern: /(资金调拨|fund allocation)/i, category: 'fund_allocation' }
  ];
  
  // 查找匹配的分类
  for (const { pattern, category } of categoryPatterns) {
    if (pattern.test(description)) {
      return category;
    }
  }
  
  // 根据描述的其他特征猜测分类
  if (/工资|薪资|salary|wage/i.test(description)) {
    return 'salary_expense';
  } else if (/销售|sales/i.test(description)) {
    return 'sales_income';
  } else if (/采购|purchase/i.test(description)) {
    return 'purchase_expense';
  } else if (/租金|rent/i.test(description)) {
    return 'rent_expense';
  } else if (/利息|interest/i.test(description)) {
    return 'interest_income';
  } else if (/办公|office/i.test(description)) {
    return 'office_expense';
  }
  
  // 默认分类
  return '';
};

// 从描述中提取支付方式
const getPaymentMethodFromDescription = (description) => {
  // 支付方式映射
  const methodPatterns = [
    { pattern: /(现金|cash)/i, method: 'cash' },
    { pattern: /(银行转账|bank transfer)/i, method: 'bank_transfer' },
    { pattern: /(支票|check)/i, method: 'check' },
    { pattern: /(信用卡|credit card)/i, method: 'credit_card' },
    { pattern: /(电子支付|electronic payment|支付宝|微信|alipay|wechat)/i, method: 'electronic_payment' }
  ];
  
  // 查找匹配的支付方式
  for (const { pattern, method } of methodPatterns) {
    if (pattern.test(description)) {
      return method;
    }
  }
  
  // 默认为银行转账
  return 'bank_transfer';
};

// 导出交易数据
const exportTransactions = () => {
  let url = `${import.meta.env.VITE_API_URL}/api/finance/bank-transactions/export`;
  
  const params = [];
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    params.push(`startDate=${searchForm.dateRange[0]}`);
    params.push(`endDate=${searchForm.dateRange[1]}`);
  }
  
  if (searchForm.accountId) {
    params.push(`accountId=${searchForm.accountId}`);
  }
  
  if (searchForm.type) {
    params.push(`transactionType=${searchForm.type}`);
  }
  
  if (searchForm.minAmount) {
    params.push(`minAmount=${searchForm.minAmount}`);
  }
  
  if (searchForm.maxAmount) {
    params.push(`maxAmount=${searchForm.maxAmount}`);
  }
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  window.open(url);
};

// 分页相关方法
const handleSizeChange = (size) => {
  pageSize.value = size;
  loadTransactions();
};

const handleCurrentChange = (page) => {
  currentPage.value = page;
  loadTransactions();
};

// 页面加载时执行
onMounted(() => {
  loadAccountOptions();
  loadTransactions();
});
</script>

<style scoped>
.transactions-container {
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

.statistics-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 180px;
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
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.negative-value {
  color: #F56C6C;
}

.positive-value {
  color: #67C23A;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>