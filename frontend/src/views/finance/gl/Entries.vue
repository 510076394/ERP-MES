<template>
  <div class="entries-container">
    <div class="page-header">
      <h2>会计凭证管理</h2>
      <el-button type="primary" @click="createEntry">新增凭证</el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="凭证编号">
          <el-input v-model="searchForm.entryNumber" placeholder="输入凭证编号" clearable></el-input>
        </el-form-item>
        <el-form-item label="记账日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="单据类型">
          <el-select v-model="searchForm.documentType" placeholder="选择单据类型" clearable style="width: 180px">
            <el-option label="收据" value="收据"></el-option>
            <el-option label="发票" value="发票"></el-option>
            <el-option label="付款单" value="付款单"></el-option>
            <el-option label="收款单" value="收款单"></el-option>
            <el-option label="转账单" value="转账单"></el-option>
            <el-option label="调整单" value="调整单"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.isPosted" placeholder="选择状态" clearable style="width: 180px">
            <el-option label="已过账" :value="true"></el-option>
            <el-option label="未过账" :value="false"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchEntries">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 表格区域 -->
    <el-card class="data-card">
      <el-table
        :data="entriesList"
        style="width: 100%"
        row-key="id"
        border
        v-loading="loading"
        @expand-change="handleExpandChange"
      >
        <el-table-column type="expand">
          <template #default="props">
            <div class="expanded-row">
              <div class="expanded-row-header">
                <h4>凭证明细</h4>
                <span class="expanded-row-description">{{ props.row.description }}</span>
              </div>
              <el-table :data="props.row.items || []" border style="width: 100%;" class="inner-table">
                <el-table-column prop="accountCode" label="科目编码" width="120"></el-table-column>
                <el-table-column prop="accountName" label="科目名称" width="180"></el-table-column>
                <el-table-column prop="debitAmount" label="借方金额" width="150">
                  <template #default="scope">
                    <span style="color: #67C23A;" v-if="scope.row.debitAmount > 0">{{ scope.row.debitAmount.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }}</span>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <el-table-column prop="creditAmount" label="贷方金额" width="150">
                  <template #default="scope">
                    <span style="color: #F56C6C;" v-if="scope.row.creditAmount > 0">{{ scope.row.creditAmount.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }}</span>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <el-table-column prop="description" label="描述" show-overflow-tooltip></el-table-column>
              </el-table>
              <div class="expanded-row-footer">
                <div class="total-item">
                  <span class="label">借方合计：</span>
                  <span class="value debit">{{ (props.row.expandedTotalDebit || props.row.totalDebit || 0).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }}</span>
                </div>
                <div class="total-item">
                  <span class="label">贷方合计：</span>
                  <span class="value credit">{{ (props.row.expandedTotalCredit || props.row.totalCredit || 0).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }}</span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="entryNumber" label="凭证编号" width="160"></el-table-column>
        <el-table-column prop="entryDate" label="记账日期" width="120"></el-table-column>
        <el-table-column prop="postingDate" label="过账日期" width="120"></el-table-column>
        <el-table-column prop="documentType" label="单据类型" width="120"></el-table-column>
        <el-table-column prop="documentNumber" label="单据编号" width="160"></el-table-column>
        <el-table-column prop="periodName" label="会计期间" width="120"></el-table-column>
        <el-table-column label="借方合计" width="150" align="right">
          <template #default="scope">
            <span class="debit" v-if="scope.row.totalDebit">{{ scope.row.totalDebit.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="贷方合计" width="150" align="right">
          <template #default="scope">
            <span class="credit" v-if="scope.row.totalCredit">{{ scope.row.totalCredit.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.isPosted ? 'success' : 'info'">
              {{ scope.row.isPosted ? '已过账' : '未过账' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="冲销状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.isReversed ? 'warning' : ''" v-if="scope.row.isReversed">
              已冲销
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="创建人" width="120"></el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="scope">
            <div class="operation-buttons">
              <el-button 
                type="primary" 
                size="small" 
                @click="viewEntry(scope.row)"
                icon="View"
              >查看</el-button>
              <el-button 
                type="success" 
                size="small" 
                @click="postEntry(scope.row)" 
                :disabled="scope.row.isPosted || scope.row.isReversed"
              >过账</el-button>
              <el-button 
                type="warning" 
                size="small" 
                @click="reverseEntry(scope.row)" 
                :disabled="!scope.row.isPosted || scope.row.isReversed"
              >冲销</el-button>
              <el-button 
                type="danger" 
                size="small" 
                @click="deleteEntry(scope.row)" 
                :disabled="scope.row.isPosted"
              >删除</el-button>
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
    
    <!-- 查看凭证明细对话框 -->
    <el-dialog
      title="凭证明细"
      v-model="detailDialogVisible"
      width="900px"
    >
      <div class="entry-detail-header">
        <div class="detail-item">
          <span class="label">凭证编号：</span>
          <span class="value">{{ currentEntry.entryNumber }}</span>
        </div>
        <div class="detail-item">
          <span class="label">记账日期：</span>
          <span class="value">{{ currentEntry.entryDate }}</span>
        </div>
        <div class="detail-item">
          <span class="label">单据类型：</span>
          <span class="value">{{ currentEntry.documentType }}</span>
        </div>
        <div class="detail-item">
          <span class="label">状态：</span>
          <el-tag :type="currentEntry.isPosted ? 'success' : 'info'" size="small">
            {{ currentEntry.isPosted ? '已过账' : '未过账' }}
          </el-tag>
        </div>
      </div>
      
      <div class="entry-description">
        <span class="label">描述：</span>
        <span class="value">{{ currentEntry.description }}</span>
      </div>
      
      <el-table :data="currentEntryItems" border style="width: 100%; margin-top: 20px;">
        <el-table-column prop="accountCode" label="科目编码" width="120"></el-table-column>
        <el-table-column prop="accountName" label="科目名称" width="180"></el-table-column>
        <el-table-column prop="debitAmount" label="借方金额" width="150">
          <template #default="scope">
            <span style="color: #67C23A;" v-if="scope.row.debitAmount > 0">{{ scope.row.debitAmount.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="creditAmount" label="贷方金额" width="150">
          <template #default="scope">
            <span style="color: #F56C6C;" v-if="scope.row.creditAmount > 0">{{ scope.row.creditAmount.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip></el-table-column>
      </el-table>
      
      <div class="entry-totals">
        <div class="total-item">
          <span class="label">借方合计：</span>
          <span class="value debit">{{ totalDebit.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }}</span>
        </div>
        <div class="total-item">
          <span class="label">贷方合计：</span>
          <span class="value credit">{{ totalCredit.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

const router = useRouter();

// 数据加载状态
const loading = ref(false);

// 分页相关
const total = ref(0);
const pageSize = ref(20);
const currentPage = ref(1);

// 凭证列表
const entriesList = ref([]);

// 详情对话框相关
const detailDialogVisible = ref(false);
const currentEntry = ref({});
const currentEntryItems = ref([]);

// 计算借贷方合计
const totalDebit = computed(() => {
  return currentEntryItems.value.reduce((sum, item) => sum + (item.debitAmount || 0), 0);
});

const totalCredit = computed(() => {
  return currentEntryItems.value.reduce((sum, item) => sum + (item.creditAmount || 0), 0);
});

// 搜索表单
const searchForm = reactive({
  entryNumber: '',
  dateRange: [],
  documentType: '',
  isPosted: ''
});

// 加载凭证列表
const loadEntries = async () => {
  loading.value = true;
  try {
    const params = {
      filters: {},
      page: currentPage.value,
      pageSize: pageSize.value
    };
    
    // 添加筛选条件
    if (searchForm.entryNumber) {
      params.filters.entry_number = searchForm.entryNumber;
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.filters.start_date = searchForm.dateRange[0];
      params.filters.end_date = searchForm.dateRange[1];
    }
    if (searchForm.documentType) {
      params.filters.document_type = searchForm.documentType;
    }
    if (searchForm.isPosted !== '') {
      params.filters.is_posted = searchForm.isPosted;
    }
    
    console.log('获取会计分录列表，参数:', params);
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/entries`, { params });
    console.log('后端返回数据:', response.data);
    
    // 根据后端返回的实际数据结构调整
    if (response.data.entries && Array.isArray(response.data.entries)) {
      // 提取基本数据
      entriesList.value = response.data.entries.map(entry => ({
        id: entry.id,
        entryNumber: entry.entry_number,
        entryDate: formatDate(entry.entry_date),
        postingDate: formatDate(entry.posting_date),
        documentType: entry.document_type,
        documentNumber: entry.document_number,
        periodId: entry.period_id,
        periodName: `期间 ${entry.period_id}`, // 实际开发中可能需要从期间列表中获取名称
        isPosted: entry.is_posted,
        isReversed: entry.is_reversed,
        createdBy: entry.created_by,
        description: entry.description || '-',
        totalDebit: entry.total_debit || 0,  // 如果后端返回了借方合计就使用，否则默认为0
        totalCredit: entry.total_credit || 0 // 如果后端返回了贷方合计就使用，否则默认为0
      }));
      
      // 设置分页信息
      if (response.data.pagination) {
        total.value = response.data.pagination.total;
      } else {
        total.value = entriesList.value.length;
      }
      
      // 如果后端没有返回借贷方合计，则启动异步获取过程
      if (!response.data.entries[0]?.total_debit) {
        loadEntriesAmounts();
      }
    } else {
      ElMessage.warning('返回的数据格式不正确');
      entriesList.value = [];
      total.value = 0;
    }
  } catch (error) {
    console.error('加载凭证列表失败:', error);
    ElMessage.error('加载凭证列表失败');
    entriesList.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

// 异步加载凭证金额信息
const loadEntriesAmounts = async () => {
  // 创建凭证ID到数组索引的映射，方便更新
  const entryMap = {};
  entriesList.value.forEach((entry, index) => {
    entryMap[entry.id] = index;
  });
  
  // 异步获取每个凭证的借贷方合计
  const promises = entriesList.value.map(async (entry) => {
    try {
      const itemsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/entries/${entry.id}/items`);
      if (Array.isArray(itemsResponse.data)) {
        const totalDebit = itemsResponse.data.reduce((sum, item) => sum + (item.debitAmount || 0), 0);
        const totalCredit = itemsResponse.data.reduce((sum, item) => sum + (item.creditAmount || 0), 0);
        
        // 更新对应凭证的借贷方合计
        const index = entryMap[entry.id];
        if (index !== undefined) {
          entriesList.value[index].totalDebit = totalDebit;
          entriesList.value[index].totalCredit = totalCredit;
        }
      }
    } catch (error) {
      console.error(`获取凭证${entry.id}明细失败:`, error);
    }
  });
  
  // 等待所有请求完成，但不阻塞UI
  Promise.all(promises).catch(error => {
    console.error('加载凭证金额信息失败:', error);
  });
};

// 添加日期格式化函数
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

// 搜索凭证
const searchEntries = () => {
  currentPage.value = 1;
  loadEntries();
};

// 重置搜索条件
const resetSearch = () => {
  searchForm.entryNumber = '';
  searchForm.dateRange = [];
  searchForm.documentType = '';
  searchForm.isPosted = '';
  searchEntries();
};

// 查看凭证详情
const viewEntry = async (row) => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/entries/${row.id}/items`);
    currentEntry.value = row;
    // 确保获取到的数据能正确映射到前端需要的属性
    if (Array.isArray(response.data)) {
      currentEntryItems.value = response.data;
    } else {
      console.error('获取到的凭证明细数据格式不正确:', response.data);
      currentEntryItems.value = [];
      ElMessage.warning('获取到的凭证明细数据格式不正确');
    }
    detailDialogVisible.value = true;
  } catch (error) {
    console.error('加载凭证明细失败:', error);
    ElMessage.error('加载凭证明细失败');
  }
};

// 新增凭证
const createEntry = () => {
  router.push('/finance/gl/entries/create');
};

// 过账凭证
const postEntry = (row) => {
  ElMessageBox.confirm('确认要过账该凭证吗？过账后将无法修改或删除。', '确认过账', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/finance/entries/${row.id}/post`);
      ElMessage.success('过账成功');
      loadEntries();
    } catch (error) {
      console.error('过账凭证失败:', error);
      ElMessage.error('过账凭证失败');
    }
  }).catch(() => {});
};

// 冲销凭证
const reverseEntry = (row) => {
  // 首先准备冲销凭证所需数据
  const currentDate = new Date().toISOString().split('T')[0];
  const reversalForm = reactive({
    entry_number: `R-${row.entryNumber}`, // 冲销凭证编号前缀R
    entry_date: currentDate,
    posting_date: currentDate,
    period_id: row.periodId,
    description: `冲销凭证：${row.entryNumber}`,
    created_by: 'admin' // 实际应用中应该从用户信息中获取
  });

  ElMessageBox.confirm('确认要冲销该凭证吗？将会创建一个与之相反的冲销凭证。', '确认冲销', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/finance/entries/${row.id}/reverse`,
        reversalForm
      );
      ElMessage.success('冲销成功');
      loadEntries();
    } catch (error) {
      console.error('冲销凭证失败:', error);
      ElMessage.error('冲销凭证失败');
    }
  }).catch(() => {});
};

// 删除凭证
const deleteEntry = (row) => {
  ElMessageBox.confirm('确认要删除该凭证吗？此操作不可逆。', '警告', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/finance/entries/${row.id}`);
      ElMessage.success('删除成功');
      loadEntries();
    } catch (error) {
      console.error('删除凭证失败:', error);
      ElMessage.error('删除凭证失败');
    }
  }).catch(() => {});
};

// 处理展开行事件，加载凭证明细
const handleExpandChange = async (row, expandedRows) => {
  // 如果行被展开，且还没有加载过明细数据
  if (expandedRows.includes(row) && !row.items) {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/entries/${row.id}/items`);
      if (Array.isArray(response.data)) {
        // 为当前行添加明细数据
        row.items = response.data;
        
        // 计算并添加展开行的借贷方合计
        row.expandedTotalDebit = response.data.reduce((sum, item) => sum + (item.debitAmount || 0), 0);
        row.expandedTotalCredit = response.data.reduce((sum, item) => sum + (item.creditAmount || 0), 0);
      } else {
        console.error('获取到的凭证明细数据格式不正确:', response.data);
        row.items = [];
        ElMessage.warning('获取到的凭证明细数据格式不正确');
      }
    } catch (error) {
      console.error(`加载凭证${row.id}明细失败:`, error);
      row.items = [];
      ElMessage.error(`加载凭证明细失败: ${error.message}`);
    }
  }
};

// 分页相关方法
const handleSizeChange = (size) => {
  pageSize.value = size;
  loadEntries();
};

const handleCurrentChange = (page) => {
  currentPage.value = page;
  loadEntries();
};

// 页面加载时执行
onMounted(() => {
  loadEntries();
});
</script>

<style scoped>
.entries-container {
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

.entry-detail-header {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.detail-item {
  margin-right: 30px;
  margin-bottom: 10px;
}

.entry-description {
  margin-bottom: 20px;
}

.entry-totals {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.total-item {
  margin-left: 30px;
}

.debit {
  color: #67C23A;
  font-weight: bold;
}

.credit {
  color: #F56C6C;
  font-weight: bold;
}

.label {
  font-weight: bold;
  margin-right: 8px;
}

.operation-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

/* 展开行样式 */
.expanded-row {
  padding: 20px;
  background-color: #f9f9f9;
}

.expanded-row-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.expanded-row-header h4 {
  margin: 0;
  margin-right: 20px;
  color: #409EFF;
}

.expanded-row-description {
  color: #606266;
  font-style: italic;
}

.inner-table {
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.expanded-row-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 15px;
  border-top: 1px dashed #dcdfe6;
}

.expanded-row-footer .total-item {
  margin-left: 30px;
}

.expanded-row-footer .total-item .label {
  font-size: 14px;
}

.expanded-row-footer .total-item .value {
  font-size: 16px;
}
</style> 