<template>
  <div class="reconciliation-container">
    <div class="page-header">
      <h2>银行对账管理</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="startReconciliation">开始对账</el-button>
        <el-button type="success" @click="importStatement" :disabled="!selectedAccount">导入对账单</el-button>
      </div>
    </div>
    
    <!-- 账户选择 -->
    <el-card class="select-account-card">
      <div class="card-header">
        <span>选择对账账户</span>
      </div>
      <div class="account-selection">
        <el-form :inline="true">
          <el-form-item label="选择账户">
            <el-select v-model="selectedAccount" placeholder="请选择银行账户" @change="handleAccountChange" style="width: 250px;">
              <el-option
                v-for="item in accountOptions"
                :key="item.id"
                :label="item.accountName"
                :value="item.id"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="对账期间">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              :disabled="!selectedAccount"
            ></el-date-picker>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchReconciliation" :disabled="!selectedAccount || !dateRange">查询</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
    
    <div v-if="isReconciling" class="reconciliation-content">
      <!-- 银行对账统计 -->
      <div class="statistics-row">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-value">{{ formatCurrency(reconciliationStats.bookBalance) }}</div>
          <div class="stat-label">账面余额</div>
        </el-card>
        <el-card class="stat-card" shadow="hover">
          <div class="stat-value">{{ formatCurrency(reconciliationStats.bankBalance) }}</div>
          <div class="stat-label">银行余额</div>
        </el-card>
        <el-card class="stat-card" shadow="hover">
          <div class="stat-value">{{ formatCurrency(reconciliationStats.difference) }}</div>
          <div class="stat-label">差异金额</div>
        </el-card>
        <el-card class="stat-card" shadow="hover">
          <div class="stat-value">{{ reconciliationStats.unreconciledItems }}</div>
          <div class="stat-label">未对账项目</div>
        </el-card>
      </div>
      
      <!-- 对账状态 -->
      <el-card class="status-card" v-if="reconciliationStats.difference !== 0">
        <el-alert
          title="账目不平衡"
          type="warning"
          description="存在未核对明细，请检查以下数据。"
          show-icon
        ></el-alert>
      </el-card>
      
      <el-card class="status-card" v-else>
        <el-alert
          title="账目已平衡"
          type="success"
          description="所有交易记录已核对完毕。"
          show-icon
        ></el-alert>
      </el-card>
      
      <!-- 标签页 -->
      <el-tabs v-model="activeTab" class="reconciliation-tabs">
        <el-tab-pane label="账面未达账项" name="unreconciled">
          <el-table :data="unreconciledItems" border style="width: 100%" v-loading="loading">
            <el-table-column type="selection" width="55"></el-table-column>
            <el-table-column prop="transactionDate" label="交易日期" width="120"></el-table-column>
            <el-table-column label="交易类型" width="100">
              <template #default="scope">
                <el-tag 
                  :type="scope.row.type === 'income' ? 'success' : (scope.row.type === 'expense' ? 'danger' : 'info')"
                >
                  {{ getTransactionTypeText(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120" align="right">
              <template #default="scope">
                <span :class="[scope.row.type === 'income' ? 'positive-value' : 'negative-value']">
                  {{ formatCurrency(scope.row.amount) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="counterparty" label="交易对方" min-width="150"></el-table-column>
            <el-table-column prop="description" label="交易描述" min-width="200"></el-table-column>
            <el-table-column prop="referenceNumber" label="参考号" width="120"></el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="scope">
                <el-button type="primary" size="small" @click="markAsReconciled(scope.row)">标记已对账</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="银行对账单" name="bank_statement">
          <div v-if="importedStatement.length === 0" class="empty-statement">
            <el-empty description="尚未导入银行对账单"></el-empty>
            <el-upload
              class="upload-area"
              action="#"
              :auto-upload="false"
              :on-change="handleFileChange"
              :limit="1"
              :file-list="fileList"
            >
              <template #trigger>
                <el-button type="primary">选择文件</el-button>
              </template>
              <el-button style="margin-left: 10px;" type="success" @click="uploadFile" :loading="uploading">上传</el-button>
              <template #tip>
                <div class="el-upload__tip">支持.xlsx, .csv格式，请选择符合模板的银行对账单文件</div>
              </template>
            </el-upload>
          </div>
          
          <el-table v-else :data="importedStatement" border style="width: 100%">
            <el-table-column type="selection" width="55"></el-table-column>
            <el-table-column prop="transactionDate" label="交易日期" width="120"></el-table-column>
            <el-table-column label="交易类型" width="100">
              <template #default="scope">
                <el-tag 
                  :type="scope.row.type === 'income' ? 'success' : 'danger'"
                >
                  {{ getTransactionTypeText(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120" align="right">
              <template #default="scope">
                <span :class="[scope.row.type === 'income' ? 'positive-value' : 'negative-value']">
                  {{ formatCurrency(scope.row.amount) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="summary" label="摘要" min-width="200"></el-table-column>
            <el-table-column prop="balance" label="余额" width="120" align="right">
              <template #default="scope">
                {{ formatCurrency(scope.row.balance) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'matched' ? 'success' : 'info'">
                  {{ scope.row.status === 'matched' ? '已匹配' : '未匹配' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="scope">
                <el-button 
                  :type="scope.row.status === 'matched' ? 'info' : 'primary'" 
                  size="small" 
                  @click="matchTransaction(scope.row)"
                >
                  {{ scope.row.status === 'matched' ? '查看匹配' : '手动匹配' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="已对账项目" name="reconciled">
          <el-table :data="reconciledItems" border style="width: 100%" v-loading="loading">
            <el-table-column prop="transactionDate" label="交易日期" width="120"></el-table-column>
            <el-table-column label="交易类型" width="100">
              <template #default="scope">
                <el-tag 
                  :type="scope.row.type === 'income' ? 'success' : (scope.row.type === 'expense' ? 'danger' : 'info')"
                >
                  {{ getTransactionTypeText(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120" align="right">
              <template #default="scope">
                <span :class="[scope.row.type === 'income' ? 'positive-value' : 'negative-value']">
                  {{ formatCurrency(scope.row.amount) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="counterparty" label="交易对方" min-width="150"></el-table-column>
            <el-table-column prop="description" label="交易描述" min-width="200"></el-table-column>
            <el-table-column prop="reconciliationDate" label="对账日期" width="120"></el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="scope">
                <el-button type="warning" size="small" @click="cancelReconciliation(scope.row)">取消对账</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>
    
    <div v-if="!isReconciling && !loading" class="start-guide">
      <el-empty description="请选择账户和日期范围，然后点击查询开始对账"></el-empty>
    </div>
    
    <!-- 匹配交易对话框 -->
    <el-dialog
      title="匹配交易记录"
      v-model="matchDialogVisible"
      width="800px"
    >
      <div class="match-dialog-content">
        <div class="bank-transaction-info">
          <h4>银行交易信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="交易日期">{{ selectedBankTransaction.transactionDate }}</el-descriptions-item>
            <el-descriptions-item label="交易类型">{{ getTransactionTypeText(selectedBankTransaction.type) }}</el-descriptions-item>
            <el-descriptions-item label="金额">{{ formatCurrency(selectedBankTransaction.amount) }}</el-descriptions-item>
            <el-descriptions-item label="摘要">{{ selectedBankTransaction.summary }}</el-descriptions-item>
          </el-descriptions>
        </div>
        
        <div class="matching-transactions">
          <h4>可匹配的账面交易</h4>
          <el-table :data="matchingTransactions" border style="width: 100%" @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="55"></el-table-column>
            <el-table-column prop="transactionDate" label="交易日期" width="120"></el-table-column>
            <el-table-column label="交易类型" width="100">
              <template #default="scope">
                <el-tag 
                  :type="scope.row.type === 'income' ? 'success' : 'danger'"
                >
                  {{ getTransactionTypeText(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120" align="right">
              <template #default="scope">
                <span :class="[scope.row.type === 'income' ? 'positive-value' : 'negative-value']">
                  {{ formatCurrency(scope.row.amount) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="counterparty" label="交易对方" min-width="150"></el-table-column>
            <el-table-column prop="description" label="交易描述" min-width="200"></el-table-column>
          </el-table>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="matchDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmMatch" :disabled="selectedTransactions.length === 0">确认匹配</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

// 账户选择
const selectedAccount = ref(null);
const accountOptions = ref([]);
const dateRange = ref(null);

// 对账状态
const isReconciling = ref(false);
const loading = ref(false);
const uploading = ref(false);
const activeTab = ref('unreconciled');

// 导入对账单
const fileList = ref([]);
const importedStatement = ref([]);

// 对账数据
const unreconciledItems = ref([]);
const reconciledItems = ref([]);
const reconciliationStats = reactive({
  bookBalance: 0,
  bankBalance: 0,
  difference: 0,
  unreconciledItems: 0
});

// 匹配交易
const matchDialogVisible = ref(false);
const selectedBankTransaction = ref({});
const matchingTransactions = ref([]);
const selectedTransactions = ref([]);

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

// 加载账户选项
const loadAccountOptions = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/bank-accounts`, {
      params: { status: 'active' }
    });
    accountOptions.value = response.data.data || [];
  } catch (error) {
    console.error('加载账户列表失败:', error);
    ElMessage.error('加载账户列表失败');
  }
};

// 处理账户变更
const handleAccountChange = () => {
  // 账户变更时重置对账状态
  isReconciling.value = false;
  importedStatement.value = [];
  unreconciledItems.value = [];
  reconciledItems.value = [];
};

// 搜索对账
const searchReconciliation = async () => {
  if (!selectedAccount.value || !dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning('请选择账户和日期范围');
    return;
  }
  
  loading.value = true;
  try {
    const params = {
      accountId: selectedAccount.value,
      startDate: dateRange.value[0],
      endDate: dateRange.value[1]
    };
    
    // 加载未对账项目
    const unreconciledResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/cash/reconciliation/unreconciled`, { params });
    unreconciledItems.value = unreconciledResponse.data || [];
    
    // 加载已对账项目
    const reconciledResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/cash/reconciliation/reconciled`, { params });
    reconciledItems.value = reconciledResponse.data || [];
    
    // 加载对账统计
    const statsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/cash/reconciliation/stats`, { params });
    Object.assign(reconciliationStats, statsResponse.data);
    
    isReconciling.value = true;
    activeTab.value = 'unreconciled';
  } catch (error) {
    console.error('加载对账数据失败:', error);
    ElMessage.error('加载对账数据失败');
  } finally {
    loading.value = false;
  }
};

// 开始对账
const startReconciliation = () => {
  if (!selectedAccount.value) {
    ElMessage.warning('请先选择账户');
    return;
  }
  
  // 默认设置日期范围为当前月
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  dateRange.value = [
    firstDay.toISOString().slice(0, 10),
    lastDay.toISOString().slice(0, 10)
  ];
  
  searchReconciliation();
};

// 导入对账单
const importStatement = () => {
  activeTab.value = 'bank_statement';
};

// 处理文件选择
const handleFileChange = (file) => {
  fileList.value = [file];
};

// 上传文件
const uploadFile = async () => {
  if (fileList.value.length === 0) {
    ElMessage.warning('请选择要上传的文件');
    return;
  }
  
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', fileList.value[0].raw);
    formData.append('accountId', selectedAccount.value);
    formData.append('startDate', dateRange.value[0]);
    formData.append('endDate', dateRange.value[1]);
    
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/cash/reconciliation/import-statement`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    importedStatement.value = response.data || [];
    ElMessage.success('对账单导入成功');
    
    // 更新对账统计
    const statsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/cash/reconciliation/stats`, {
      params: {
        accountId: selectedAccount.value,
        startDate: dateRange.value[0],
        endDate: dateRange.value[1]
      }
    });
    Object.assign(reconciliationStats, statsResponse.data);
  } catch (error) {
    console.error('导入对账单失败:', error);
    ElMessage.error('导入对账单失败');
  } finally {
    uploading.value = false;
  }
};

// 标记为已对账
const markAsReconciled = async (transaction) => {
  try {
    await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/cash/reconciliation/mark-reconciled`, {
      transactionId: transaction.id,
      accountId: selectedAccount.value
    });
    
    ElMessage.success('已标记为对账');
    
    // 刷新对账数据
    searchReconciliation();
  } catch (error) {
    console.error('标记对账失败:', error);
    ElMessage.error('标记对账失败');
  }
};

// 取消对账
const cancelReconciliation = async (transaction) => {
  try {
    await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/cash/reconciliation/cancel-reconciled`, {
      transactionId: transaction.id,
      accountId: selectedAccount.value
    });
    
    ElMessage.success('已取消对账标记');
    
    // 刷新对账数据
    searchReconciliation();
  } catch (error) {
    console.error('取消对账失败:', error);
    ElMessage.error('取消对账失败');
  }
};

// 匹配交易
const matchTransaction = async (bankTransaction) => {
  selectedBankTransaction.value = bankTransaction;
  
  if (bankTransaction.status === 'matched') {
    // 查看已匹配的交易
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/cash/reconciliation/matched-transaction`, {
        params: {
          bankTransactionId: bankTransaction.id
        }
      });
      
      matchingTransactions.value = response.data || [];
      selectedTransactions.value = [...matchingTransactions.value];
    } catch (error) {
      console.error('获取匹配交易失败:', error);
      ElMessage.error('获取匹配交易失败');
    }
  } else {
    // 查找可能匹配的交易
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/cash/reconciliation/possible-matches`, {
        params: {
          bankTransactionId: bankTransaction.id,
          accountId: selectedAccount.value
        }
      });
      
      matchingTransactions.value = response.data || [];
      selectedTransactions.value = [];
    } catch (error) {
      console.error('获取可能匹配的交易失败:', error);
      ElMessage.error('获取可能匹配的交易失败');
    }
  }
  
  matchDialogVisible.value = true;
};

// 处理选择变更
const handleSelectionChange = (selection) => {
  selectedTransactions.value = selection;
};

// 确认匹配
const confirmMatch = async () => {
  if (selectedTransactions.value.length === 0) {
    ElMessage.warning('请选择要匹配的交易');
    return;
  }
  
  try {
    await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/cash/reconciliation/confirm-match`, {
      bankTransactionId: selectedBankTransaction.value.id,
      transactionIds: selectedTransactions.value.map(t => t.id),
      accountId: selectedAccount.value
    });
    
    ElMessage.success('交易匹配成功');
    matchDialogVisible.value = false;
    
    // 刷新对账数据
    searchReconciliation();
  } catch (error) {
    console.error('确认匹配失败:', error);
    ElMessage.error('确认匹配失败');
  }
};

// 页面加载时执行
onMounted(() => {
  loadAccountOptions();
});
</script>

<style scoped>
.reconciliation-container {
  padding: 10px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.select-account-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: bold;
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

.status-card {
  margin-bottom: 20px;
}

.reconciliation-tabs {
  margin-bottom: 20px;
}

.start-guide {
  margin: 100px 0;
}

.empty-statement {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
}

.upload-area {
  margin-top: 20px;
}

.match-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
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