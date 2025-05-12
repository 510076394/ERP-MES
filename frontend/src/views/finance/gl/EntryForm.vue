<template>
  <div class="entry-form-container">
    <div class="page-header">
      <h2>新增会计凭证</h2>
      <div class="header-buttons">
        <el-button @click="goBack">返回</el-button>
        <el-button type="primary" @click="saveEntry" :loading="saving" :disabled="!isBalanced || itemsCount === 0">保存</el-button>
      </div>
    </div>
    
    <el-card class="entry-form-card">
      <el-form :model="entryForm" :rules="entryRules" ref="entryFormRef" label-width="100px" class="entry-form">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="单据类型" prop="documentType">
              <el-select v-model="entryForm.documentType" placeholder="请选择单据类型" style="width: 100%">
                <el-option label="收据" value="收据"></el-option>
                <el-option label="发票" value="发票"></el-option>
                <el-option label="付款单" value="付款单"></el-option>
                <el-option label="收款单" value="收款单"></el-option>
                <el-option label="转账单" value="转账单"></el-option>
                <el-option label="调整单" value="调整单"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单据编号" prop="documentNumber">
              <el-input v-model="entryForm.documentNumber" placeholder="请输入单据编号"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="分录编号" prop="entryNumber">
              <el-input v-model="entryForm.entryNumber" placeholder="请输入分录编号"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="记账日期" prop="entryDate">
              <el-date-picker 
                v-model="entryForm.entryDate" 
                type="date" 
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              ></el-date-picker>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="过账日期" prop="postingDate">
              <el-date-picker 
                v-model="entryForm.postingDate" 
                type="date" 
                placeholder="选择过账日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              ></el-date-picker>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="会计期间" prop="periodId">
              <el-select v-model="entryForm.periodId" placeholder="请选择会计期间" style="width: 100%">
                <el-option 
                  v-for="period in periods" 
                  :key="period.id" 
                  :label="`${formatDate(period.start_date)} 至 ${formatDate(period.end_date)}`" 
                  :value="period.id"
                  :disabled="period.is_closed"
                >
                  <span>{{ formatDate(period.start_date) }} 至 {{ formatDate(period.end_date) }}</span>
                  <span v-if="period.is_closed" style="float: right; color: #F56C6C; font-size: 12px;">已关闭</span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="描述" prop="description">
              <el-input v-model="entryForm.description" placeholder="请输入凭证描述"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      
      <div class="entry-items-section">
        <div class="section-header">
          <h3>分录明细</h3>
          <el-button type="primary" @click="addEntryItem" icon="Plus" plain>添加明细</el-button>
        </div>
        
        <el-table :data="entryForm.items" border style="width: 100%">
          <el-table-column type="index" label="#" width="50"></el-table-column>
          <el-table-column label="科目" width="280">
            <template #default="scope">
              <el-select 
                v-model="scope.row.accountId" 
                filterable 
                placeholder="请选择科目"
                @change="handleAccountChange(scope.row)"
                style="width: 100%"
              >
                <el-option
                  v-for="account in accounts"
                  :key="account.id"
                  :label="`${account.account_code || ''} - ${account.account_name || ''}`"
                  :value="account.id"
                >
                  <span>{{ account.account_code || '' }} - {{ account.account_name || '' }}</span>
                </el-option>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="借方金额" width="180">
            <template #default="scope">
              <el-input-number 
                v-model="scope.row.debitAmount" 
                :precision="2" 
                :min="0" 
                controls-position="right"
                placeholder="借方金额"
                style="width: 100%"
                @change="(val) => handleDebitChange(scope.row, val)"
              ></el-input-number>
            </template>
          </el-table-column>
          <el-table-column label="贷方金额" width="180">
            <template #default="scope">
              <el-input-number 
                v-model="scope.row.creditAmount" 
                :precision="2" 
                :min="0" 
                controls-position="right"
                placeholder="贷方金额"
                style="width: 100%"
                @change="(val) => handleCreditChange(scope.row, val)"
              ></el-input-number>
            </template>
          </el-table-column>
          <el-table-column label="描述">
            <template #default="scope">
              <el-input v-model="scope.row.description" placeholder="请输入描述"></el-input>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="scope">
              <el-button 
                type="danger" 
                icon="Delete" 
                circle 
                size="small"
                @click="removeEntryItem(scope.$index)"
              ></el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="entry-summary">
          <div class="entry-totals">
            <div class="total-item">
              <span class="label">借方合计：</span>
              <span class="value debit">{{ totalDebit.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }}</span>
            </div>
            <div class="total-item">
              <span class="label">贷方合计：</span>
              <span class="value credit">{{ totalCredit.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }}</span>
            </div>
            <div class="total-item">
              <span class="label">差额：</span>
              <span class="value" :class="{ 'balanced': isBalanced, 'unbalanced': !isBalanced }">
                {{ Math.abs(totalDebit - totalCredit).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }}
                <el-tag v-if="isBalanced" type="success" size="small">平衡</el-tag>
                <el-tag v-else type="danger" size="small">不平衡</el-tag>
              </span>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const router = useRouter();
const entryFormRef = ref(null);
const saving = ref(false);

// 会计科目和期间
const accounts = ref([]);
const periods = ref([]);

// 凭证表单
const entryForm = reactive({
  documentType: '',
  documentNumber: '',
  entryDate: new Date().toISOString().slice(0, 10),
  postingDate: new Date().toISOString().slice(0, 10),
  entryNumber: '',
  createdBy: 'current_user',
  periodId: null,
  description: '',
  items: []
});

// 表单验证规则
const entryRules = {
  documentType: [
    { required: true, message: '请选择单据类型', trigger: 'change' }
  ],
  documentNumber: [
    { required: true, message: '请输入单据编号', trigger: 'blur' }
  ],
  entryDate: [
    { required: true, message: '请选择记账日期', trigger: 'change' }
  ],
  postingDate: [
    { required: true, message: '请选择过账日期', trigger: 'change' }
  ],
  entryNumber: [
    { required: true, message: '请输入分录编号', trigger: 'blur' }
  ],
  periodId: [
    { required: true, message: '请选择会计期间', trigger: 'change' }
  ]
};

// 计算借贷方合计
const totalDebit = computed(() => {
  return entryForm.items.reduce((sum, item) => sum + (item.debitAmount || 0), 0);
});

const totalCredit = computed(() => {
  return entryForm.items.reduce((sum, item) => sum + (item.creditAmount || 0), 0);
});

// 计算是否借贷平衡
const isBalanced = computed(() => {
  return Math.abs(totalDebit.value - totalCredit.value) < 0.01;
});

// 计算明细条数
const itemsCount = computed(() => {
  return entryForm.items.length;
});

// 加载会计科目
const loadAccounts = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/accounts`);
    accounts.value = response.data.accounts || [];
  } catch (error) {
    console.error('加载会计科目失败:', error);
    ElMessage.error('加载会计科目失败');
  }
};

// 加载会计期间
const loadPeriods = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/periods`);
    periods.value = Array.isArray(response.data) ? response.data : response.data.periods || [];
    
    // 设置默认会计期间（当前日期所在期间）
    const currentDate = new Date();
    const currentPeriod = periods.value.find(period => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      return currentDate >= startDate && currentDate <= endDate && !period.isClosed;
    });
    
    if (currentPeriod) {
      entryForm.periodId = currentPeriod.id;
    }
  } catch (error) {
    console.error('加载会计期间失败:', error);
    ElMessage.error('加载会计期间失败');
  }
};

// 添加明细
const addEntryItem = () => {
  entryForm.items.push({
    accountId: null,
    debitAmount: 0,
    creditAmount: 0,
    description: ''
  });
};

// 移除明细
const removeEntryItem = (index) => {
  entryForm.items.splice(index, 1);
};

// 处理科目变更
const handleAccountChange = (row) => {
  // 可以在这里添加科目切换时的相关逻辑
};

// 处理借方金额变更
const handleDebitChange = (row, val) => {
  if (val > 0) {
    row.creditAmount = 0;
  }
};

// 处理贷方金额变更
const handleCreditChange = (row, val) => {
  if (val > 0) {
    row.debitAmount = 0;
  }
};

// 保存凭证
const saveEntry = async () => {
  if (!entryFormRef.value) return;
  
  await entryFormRef.value.validate(async (valid) => {
    if (valid) {
      if (entryForm.items.length === 0) {
        ElMessage.warning('请至少添加一项明细');
        return;
      }
      
      if (!isBalanced.value) {
        ElMessage.warning('借贷不平衡，请检查');
        return;
      }
      
      saving.value = true;
      try {
        // 过滤掉金额为0的明细
        const validItems = entryForm.items.filter(item => 
          (item.debitAmount > 0 || item.creditAmount > 0) && item.accountId
        );
        
        if (validItems.length === 0) {
          ElMessage.warning('没有有效的明细项，请检查');
          saving.value = false;
          return;
        }
        
        // 将驼峰命名转换为下划线命名，适应后端API
        const entryData = {
          document_type: entryForm.documentType,
          document_number: entryForm.documentNumber,
          entry_date: entryForm.entryDate,
          posting_date: entryForm.postingDate,
          entry_number: entryForm.entryNumber,
          created_by: entryForm.createdBy,
          period_id: entryForm.periodId,
          description: entryForm.description,
          items: validItems.map(item => ({
            account_id: item.accountId,
            debit_amount: item.debitAmount,
            credit_amount: item.creditAmount,
            description: item.description
          }))
        };
        
        console.log('请求参数:', entryData);
        
        await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/entries`, entryData);
        ElMessage.success('凭证保存成功');
        goBack();
      } catch (error) {
        console.error('保存凭证失败:', error);
        console.error('错误详情:', error.response?.data);
        ElMessage.error(`保存凭证失败: ${error.response?.data?.message || error.response?.data?.error || error.message}`);
      } finally {
        saving.value = false;
      }
    }
  });
};

// 返回列表页
const goBack = () => {
  router.push('/finance/gl/entries');
};

// 页面加载时执行
onMounted(() => {
  loadAccounts();
  loadPeriods();
  addEntryItem();
  addEntryItem();
});

// 在 script setup 部分添加 formatDate 函数
const formatDate = (dateString) => {
  if (!dateString) return '';
  return dateString.split('T')[0];
};
</script>

<style scoped>
.entry-form-container {
  padding: 10px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.entry-form-card {
  margin-bottom: 20px;
}

.entry-form {
  margin-bottom: 30px;
}

.entry-items-section {
  margin-top: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.entry-summary {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.entry-totals {
  display: flex;
  gap: 20px;
}

.total-item {
  min-width: 180px;
  text-align: right;
}

.label {
  font-weight: bold;
  margin-right: 5px;
}

.debit {
  color: #67C23A;
  font-weight: bold;
}

.credit {
  color: #F56C6C;
  font-weight: bold;
}

.balanced {
  color: #67C23A;
}

.unbalanced {
  color: #F56C6C;
}
</style> 