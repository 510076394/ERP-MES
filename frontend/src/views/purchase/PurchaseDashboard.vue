<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12">
        <h1 class="text-h4">采购管理概览</h1>
      </v-col>
    </v-row>

    <!-- 统计卡片 -->
    <v-row>
      <v-col cols="12" sm="6" md="3">
        <v-card class="mx-auto" color="primary" dark>
          <v-card-text>
            <div class="text-h5 mb-2">采购申请</div>
            <div class="d-flex justify-space-between">
              <div>
                <div class="text-h3 font-weight-bold">{{ statistics.requisitions.total }}</div>
                <div>总数</div>
              </div>
              <div class="text-right">
                <div class="text-h5">{{ statistics.requisitions.pending }}</div>
                <div>待审批</div>
              </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn text to="/purchase/requisitions">
              查看详情
              <v-icon right>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm="6" md="3">
        <v-card class="mx-auto" color="success" dark>
          <v-card-text>
            <div class="text-h5 mb-2">采购订单</div>
            <div class="d-flex justify-space-between">
              <div>
                <div class="text-h3 font-weight-bold">{{ statistics.orders.total }}</div>
                <div>总数</div>
              </div>
              <div class="text-right">
                <div class="text-h5">{{ statistics.orders.pending }}</div>
                <div>待处理</div>
              </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn text to="/purchase/orders">
              查看详情
              <v-icon right>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm="6" md="3">
        <v-card class="mx-auto" color="info" dark>
          <v-card-text>
            <div class="text-h5 mb-2">采购收货</div>
            <div class="d-flex justify-space-between">
              <div>
                <div class="text-h3 font-weight-bold">{{ statistics.receipts.total }}</div>
                <div>总数</div>
              </div>
              <div class="text-right">
                <div class="text-h5">{{ statistics.receipts.pending }}</div>
                <div>待处理</div>
              </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn text to="/purchase/receipts">
              查看详情
              <v-icon right>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm="6" md="3">
        <v-card class="mx-auto" color="warning" dark>
          <v-card-text>
            <div class="text-h5 mb-2">采购退货</div>
            <div class="d-flex justify-space-between">
              <div>
                <div class="text-h3 font-weight-bold">{{ statistics.returns.total }}</div>
                <div>总数</div>
              </div>
              <div class="text-right">
                <div class="text-h5">{{ statistics.returns.pending }}</div>
                <div>待处理</div>
              </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn text to="/purchase/returns">
              查看详情
              <v-icon right>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- 图表区域 -->
    <v-row class="mt-6">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>月度采购趋势</v-card-title>
          <v-card-text>
            <canvas ref="purchaseTrendChart" height="300"></canvas>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>采购物料分类占比</v-card-title>
          <v-card-text>
            <canvas ref="categoryChart" height="300"></canvas>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- 待处理事项 -->
    <v-row class="mt-6">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <span>待处理事项</span>
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              append-icon="mdi-magnify"
              label="搜索"
              single-line
              hide-details
              dense
              outlined
              class="ml-2"
              style="max-width: 300px"
            ></v-text-field>
          </v-card-title>
          <v-data-table
            :headers="headers"
            :items="pendingItems"
            :search="search"
            :loading="loading"
            :items-per-page="5"
            item-key="id"
            class="elevation-1"
          >
            <template v-slot:item.type="{ item }">
              <v-chip :color="getTypeColor(item.type)" small>{{ getTypeText(item.type) }}</v-chip>
            </template>
            <template v-slot:item.date="{ item }">
              {{ formatDate(item.date) }}
            </template>
            <template v-slot:item.status="{ item }">
              <v-chip :color="getStatusColor(item.status)" text-color="white" small>
                {{ item.status }}
              </v-chip>
            </template>
            <template v-slot:item.actions="{ item }">
              <v-btn
                x-small
                text
                color="primary"
                :to="getItemLink(item)"
              >
                查看
              </v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { formatDate as formatDateUtil } from '@/utils/formatters';
import { purchaseApi } from '@/services/api';
import { useSnackbar } from '@/composables/useSnackbar';
import Chart from 'chart.js/auto';

const { showSnackbar } = useSnackbar();

// 图表实例引用
const purchaseTrendChart = ref(null);
const categoryChart = ref(null);
let trendChartInstance = null;
let categoryChartInstance = null;

// 统计数据
const statistics = reactive({
  requisitions: { total: 0, pending: 0 },
  orders: { total: 0, pending: 0 },
  receipts: { total: 0, pending: 0 },
  returns: { total: 0, pending: 0 }
});

// 待处理事项表格
const headers = [
  { text: '类型', value: 'type' },
  { text: '编号', value: 'number' },
  { text: '日期', value: 'date' },
  { text: '状态', value: 'status' },
  { text: '关联方', value: 'party' },
  { text: '操作', value: 'actions', sortable: false, align: 'center' }
];

// 待处理事项数据
const pendingItems = ref([]);
const loading = ref(false);
const search = ref('');

// 生命周期钩子
onMounted(async () => {
  loading.value = true;
  try {
    await loadDashboardData();
    initCharts();
  } catch (error) {
    console.error('加载仪表盘数据失败:', error);
    showSnackbar('加载仪表盘数据失败', 'error');
  } finally {
    loading.value = false;
  }
});

// 加载仪表盘数据
async function loadDashboardData() {
  try {
    const response = await purchaseApi.getPurchaseStatistics();
    const data = response.data;
    
    // 更新统计数据
    statistics.requisitions = data.requisitions;
    statistics.orders = data.orders;
    statistics.receipts = data.receipts;
    statistics.returns = data.returns;
    
    // 更新待处理事项
    pendingItems.value = [
      ...data.pendingRequisitions.map(item => ({
        id: `requisition-${item.id}`,
        type: 'requisition',
        number: item.requisitionNumber,
        date: item.requestDate,
        status: item.status,
        party: item.department,
        link: `/purchase/requisitions`
      })),
      ...data.pendingOrders.map(item => ({
        id: `order-${item.id}`,
        type: 'order',
        number: item.orderNumber,
        date: item.orderDate,
        status: item.status,
        party: item.supplierName,
        link: `/purchase/orders`
      })),
      ...data.pendingReceipts.map(item => ({
        id: `receipt-${item.id}`,
        type: 'receipt',
        number: item.receiptNumber,
        date: item.receiptDate,
        status: item.status,
        party: item.supplierName,
        link: `/purchase/receipts`
      })),
      ...data.pendingReturns.map(item => ({
        id: `return-${item.id}`,
        type: 'return',
        number: item.returnNumber,
        date: item.returnDate,
        status: item.status,
        party: item.supplierName,
        link: `/purchase/returns`
      }))
    ];
  } catch (error) {
    console.error('获取采购统计数据失败:', error);
    throw error;
  }
}

// 初始化图表
function initCharts() {
  // 月度采购趋势图表
  if (trendChartInstance) {
    trendChartInstance.destroy();
  }
  
  if (purchaseTrendChart.value) {
    const ctx = purchaseTrendChart.value.getContext('2d');
    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
        datasets: [
          {
            label: '采购金额',
            data: [12000, 19000, 8000, 15000, 22000, 31000, 25000, 28000, 30000, 32000, 35000, 40000],
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: false
          }
        }
      }
    });
  }
  
  // 物料分类占比图表
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }
  
  if (categoryChart.value) {
    const ctx = categoryChart.value.getContext('2d');
    categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['原材料', '辅料', '包装材料', '办公用品', '设备配件', '其他'],
        datasets: [
          {
            label: '采购金额占比',
            data: [35, 25, 15, 10, 10, 5],
            backgroundColor: [
              'rgba(255, 99, 132, 0.7)',
              'rgba(54, 162, 235, 0.7)',
              'rgba(255, 206, 86, 0.7)',
              'rgba(75, 192, 192, 0.7)',
              'rgba(153, 102, 255, 0.7)',
              'rgba(255, 159, 64, 0.7)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          }
        }
      }
    });
  }
}

// 格式化日期
function formatDate(date) {
  return formatDateUtil(date);
}

// 获取类型颜色
function getTypeColor(type) {
  const typeColorMap = {
    requisition: 'primary',
    order: 'success',
    receipt: 'info',
    return: 'warning'
  };
  return typeColorMap[type] || 'grey';
}

// 获取类型文本
function getTypeText(type) {
  const typeTextMap = {
    requisition: '采购申请',
    order: '采购订单',
    receipt: '采购收货',
    return: '采购退货'
  };
  return typeTextMap[type] || type;
}

// 获取状态颜色
function getStatusColor(status) {
  const statusColorMap = {
    draft: 'grey',
    submitted: 'blue',
    approved: 'green',
    rejected: 'red',
    pending: 'orange',
    confirmed: 'teal',
    completed: 'purple',
    cancelled: 'red'
  };
  return statusColorMap[status.toLowerCase()] || 'grey';
}

// 获取项目链接
function getItemLink(item) {
  return item.link;
}
</script>

<style scoped>
.v-card {
  transition: all 0.3s ease;
}

.v-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2) !important;
}
</style> 