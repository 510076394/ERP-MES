<template>
  <div class="outsourced-receipts-container">
    <div class="page-header">
      <h2>外委加工入库管理</h2>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="入库单号">
          <el-input v-model="searchForm.receiptNo" placeholder="请输入入库单号" clearable></el-input>
        </el-form-item>
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
        <div class="stat-value">{{ receiptStats.total || 0 }}</div>
        <div class="stat-label">入库单总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ receiptStats.pendingCount || 0 }}</div>
        <div class="stat-label">待确认</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ receiptStats.confirmedCount || 0 }}</div>
        <div class="stat-label">已确认</div>
      </el-card>
    </div>

    <!-- 外委加工入库单列表 -->
    <el-card class="data-card">
      <el-table
        :data="receiptList"
        border
        style="width: 100%"
        v-loading="loading"
        :max-height="tableHeight"
      >
        <el-table-column prop="receipt_no" label="入库单号" min-width="150" />
        <el-table-column prop="processing_no" label="加工单号" min-width="150" />
        <el-table-column prop="receipt_date" label="入库日期" min-width="120">
          <template #default="{ row }">
            {{ formatDate(row.receipt_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="supplier_name" label="加工厂" min-width="180" />
        <el-table-column prop="warehouse_name" label="入库仓库" min-width="120" />
        <el-table-column prop="operator" label="操作员" min-width="100" />
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
                <el-button size="small" @click="handleViewReceipt(scope.row)">查看</el-button>
                <el-button
                  v-if="scope.row.status === 'pending'"
                  size="small"
                  type="primary"
                  @click="handleEditReceipt(scope.row)"
                >
                  编辑
                </el-button>
              </div>
              
              <div class="operation-group" v-if="scope.row.status === 'pending'">
                <el-button size="small" type="success" @click="updateReceiptStatus(scope.row, 'confirmed')">
                  确认入库
                </el-button>
                <el-button size="small" type="danger" @click="updateReceiptStatus(scope.row, 'cancelled')">
                  取消
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

    <!-- 入库单对话框 -->
    <ReceiptDialog
      v-model:visible="receiptDialogVisible"
      :mode="receiptDialogMode"
      :receipt-id="selectedReceiptId"
      @success="fetchReceiptList"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '@/services/api';
import { Search, Refresh, ArrowDown } from '@element-plus/icons-vue';
import ReceiptDialog from './ReceiptDialog.vue';

// 状态选项
const statusOptions = [
  { value: 'pending', label: '待确认' },
  { value: 'confirmed', label: '已确认' },
  { value: 'cancelled', label: '已取消' }
];

// 获取状态类型
const getStatusType = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'confirmed': return 'success';
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
  receiptNo: '',
  processingNo: '',
  supplierName: '',
  status: '',
  dateRange: []
});

// 入库单列表数据
const receiptList = ref([]);
const loading = ref(false);
const tableHeight = 600;

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});

// 统计数据
const receiptStats = reactive({
  total: 0,
  pendingCount: 0,
  confirmedCount: 0,
  cancelledCount: 0
});

// 对话框相关状态
const receiptDialogVisible = ref(false);
const receiptDialogMode = ref('view');
const selectedReceiptId = ref(null);

// 获取入库单列表
const fetchReceiptList = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
      receipt_no: searchForm.receiptNo,
      processing_no: searchForm.processingNo,
      supplier_name: searchForm.supplierName,
      status: searchForm.status
    };

    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.start_date = searchForm.dateRange[0];
      params.end_date = searchForm.dateRange[1];
    }

    const response = await api.get('/purchase/outsourced-receipts', { params });
    receiptList.value = response.data.data || [];
    pagination.total = response.data.total || 0;
    
    // 更新统计数据
    updateStats();
  } catch (error) {
    console.error('获取外委加工入库单列表失败:', error);
    ElMessage.error('获取外委加工入库单列表失败');
  } finally {
    loading.value = false;
  }
};

// 更新统计数据
const updateStats = () => {
  // 实际应用中这应该通过API获取或从列表数据计算
  receiptStats.total = pagination.total;
  receiptStats.pendingCount = receiptList.value.filter(item => item.status === 'pending').length;
  receiptStats.confirmedCount = receiptList.value.filter(item => item.status === 'confirmed').length;
  receiptStats.cancelledCount = receiptList.value.filter(item => item.status === 'cancelled').length;
};

// 搜索处理
const handleSearch = () => {
  pagination.page = 1;
  fetchReceiptList();
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
  fetchReceiptList();
};

// 分页处理
const handleSizeChange = (val) => {
  pagination.pageSize = val;
  fetchReceiptList();
};

const handleCurrentChange = (val) => {
  pagination.page = val;
  fetchReceiptList();
};

// 更新入库单状态
const updateReceiptStatus = async (row, status) => {
  try {
    await api.put(`/purchase/outsourced-receipts/${row.id}/status`, { status });
    ElMessage.success(`状态更新成功`);
    fetchReceiptList();
  } catch (error) {
    console.error('状态更新失败:', error);
    ElMessage.error('状态更新失败: ' + (error.response?.data?.message || error.message));
  }
};

// 查看入库单
const handleViewReceipt = (row) => {
  selectedReceiptId.value = row.id;
  receiptDialogMode.value = 'view';
  receiptDialogVisible.value = true;
};

// 编辑入库单
const handleEditReceipt = (row) => {
  selectedReceiptId.value = row.id;
  receiptDialogMode.value = 'edit';
  receiptDialogVisible.value = true;
};

// 页面加载时获取数据
onMounted(() => {
  fetchReceiptList();
});
</script>

<style scoped>
.outsourced-receipts-container {
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