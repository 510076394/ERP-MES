<template>
  <div class="dashboard-container">
    <div class="page-header">
      <h2>总账管理</h2>
    </div>
    
    <el-row :gutter="20">
      <!-- 科目管理卡片 -->
      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="module-card" shadow="hover" @click="navigateTo('/finance/gl/accounts')">
          <div class="card-content">
            <el-icon class="card-icon"><Document /></el-icon>
            <div class="card-title">科目管理</div>
            <div class="card-desc">管理会计科目树，设置科目属性</div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 凭证管理卡片 -->
      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="module-card" shadow="hover" @click="navigateTo('/finance/gl/entries')">
          <div class="card-content">
            <el-icon class="card-icon"><Tickets /></el-icon>
            <div class="card-title">凭证管理</div>
            <div class="card-desc">创建、查询和管理会计凭证</div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 期间管理卡片 -->
      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="module-card" shadow="hover" @click="navigateTo('/finance/gl/periods')">
          <div class="card-content">
            <el-icon class="card-icon"><Calendar /></el-icon>
            <div class="card-title">期间管理</div>
            <div class="card-desc">设置和关闭会计期间</div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 账簿查询卡片 -->
      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="module-card" shadow="hover" @click="navigateTo('/finance/gl/ledger')">
          <div class="card-content">
            <el-icon class="card-icon"><Search /></el-icon>
            <div class="card-title">账簿查询</div>
            <div class="card-desc">查询总账、明细账和科目余额</div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 财务报表卡片 -->
      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="module-card" shadow="hover" @click="navigateTo('/finance/gl/reports')">
          <div class="card-content">
            <el-icon class="card-icon"><PieChart /></el-icon>
            <div class="card-title">财务报表</div>
            <div class="card-desc">生成资产负债表和利润表</div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 初始化卡片 -->
      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="module-card" shadow="hover" @click="showInitConfirm">
          <div class="card-content">
            <el-icon class="card-icon"><Setting /></el-icon>
            <div class="card-title">系统初始化</div>
            <div class="card-desc">创建基础会计科目和期间</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 财务概览 -->
    <div class="overview-section">
      <h3>财务概览</h3>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8">
          <el-card class="stat-card">
            <template #header>
              <div class="stat-header">
                <span>总资产</span>
                <el-icon><Money /></el-icon>
              </div>
            </template>
            <div class="stat-value">{{ formatCurrency(statistics.totalAssets) }}</div>
            <div class="stat-footer">
              <span :class="statistics.assetsChangeRate >= 0 ? 'positive-change' : 'negative-change'">
                {{ statistics.assetsChangeRate >= 0 ? '+' : '' }}{{ statistics.assetsChangeRate }}%
              </span>
              <span class="stat-period">较上月</span>
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :sm="12" :md="8">
          <el-card class="stat-card">
            <template #header>
              <div class="stat-header">
                <span>本月收入</span>
                <el-icon><TrendCharts /></el-icon>
              </div>
            </template>
            <div class="stat-value">{{ formatCurrency(statistics.monthlyRevenue) }}</div>
            <div class="stat-footer">
              <span :class="statistics.revenueChangeRate >= 0 ? 'positive-change' : 'negative-change'">
                {{ statistics.revenueChangeRate >= 0 ? '+' : '' }}{{ statistics.revenueChangeRate }}%
              </span>
              <span class="stat-period">较上月</span>
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :sm="12" :md="8">
          <el-card class="stat-card">
            <template #header>
              <div class="stat-header">
                <span>本月利润</span>
                <el-icon><DataLine /></el-icon>
              </div>
            </template>
            <div class="stat-value">{{ formatCurrency(statistics.monthlyProfit) }}</div>
            <div class="stat-footer">
              <span :class="statistics.profitChangeRate >= 0 ? 'positive-change' : 'negative-change'">
                {{ statistics.profitChangeRate >= 0 ? '+' : '' }}{{ statistics.profitChangeRate }}%
              </span>
              <span class="stat-period">较上月</span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    
    <!-- 最近凭证 -->
    <div class="recent-section">
      <div class="section-header">
        <h3>最近凭证</h3>
        <el-button type="primary" link @click="navigateTo('/finance/gl/entries')">
          查看全部
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
      
      <el-table :data="recentEntries" style="width: 100%" border v-loading="loading">
        <el-table-column prop="entryNumber" label="凭证编号" width="120"></el-table-column>
        <el-table-column prop="entryDate" label="记账日期" width="100"></el-table-column>
        <el-table-column prop="documentType" label="单据类型" width="100"></el-table-column>
        <el-table-column prop="description" label="描述"></el-table-column>
        <el-table-column prop="amount" label="金额" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.amount) }}
          </template>
        </el-table-column>
        <el-table-column width="80">
          <template #default="scope">
            <el-button type="primary" link @click="viewEntry(scope.row)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Document, Tickets, Calendar, Search, PieChart, Setting, Money, TrendCharts, DataLine, ArrowRight } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

const router = useRouter();
const loading = ref(false);

// 统计数据
const statistics = reactive({
  totalAssets: 12568900.25,
  assetsChangeRate: 5.8,
  monthlyRevenue: 987650.75,
  revenueChangeRate: 12.5,
  monthlyProfit: 356780.45,
  profitChangeRate: -3.2,
});

// 最近凭证
const recentEntries = ref([]);

// 页面导航
const navigateTo = (path) => {
  router.push(path);
};

// 系统初始化确认
const showInitConfirm = () => {
  ElMessageBox.confirm(
    '系统初始化将创建基础的会计科目和会计期间。是否继续？',
    '确认初始化',
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      initializeSystem();
    })
    .catch(() => {
      // 用户取消操作
    });
};

// 执行系统初始化
const initializeSystem = async () => {
  try {
    loading.value = true;
    await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/init`);
    ElMessage.success('系统初始化成功');
    // 重新加载数据
    loadRecentEntries();
  } catch (error) {
    console.error('系统初始化失败:', error);
    ElMessage.error('系统初始化失败');
  } finally {
    loading.value = false;
  }
};

// 加载最近凭证
const loadRecentEntries = async () => {
  try {
    loading.value = true;
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/entries`, {
      params: {
        page: 1,
        pageSize: 5,
      },
    });
    
    if (response.data && response.data.entries) {
      recentEntries.value = response.data.entries.map(entry => ({
        id: entry.id,
        entryNumber: entry.entry_number,
        entryDate: formatDate(entry.entry_date),
        documentType: entry.document_type,
        description: entry.description || '-',
        amount: entry.total_debit || 0
      }));
    }
  } catch (error) {
    console.error('加载最近凭证失败:', error);
    ElMessage.error('加载最近凭证失败');
  } finally {
    loading.value = false;
  }
};

// 查看凭证详情
const viewEntry = (entry) => {
  router.push(`/finance/gl/entries/${entry.id}`);
};

// 货币格式化
const formatCurrency = (value) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(value);
};

// 日期格式化
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

// 页面加载时执行
onMounted(() => {
  loadRecentEntries();
});
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.module-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.module-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
}

.card-icon {
  font-size: 32px;
  color: #409EFF;
  margin-bottom: 10px;
}

.card-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 5px;
}

.card-desc {
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.overview-section {
  margin-top: 30px;
  margin-bottom: 30px;
}

.stat-card {
  margin-bottom: 20px;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin: 10px 0;
}

.stat-footer {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.stat-period {
  margin-left: 5px;
  color: #909399;
}

.positive-change {
  color: #67C23A;
}

.negative-change {
  color: #F56C6C;
}

.recent-section {
  margin-top: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
</style> 