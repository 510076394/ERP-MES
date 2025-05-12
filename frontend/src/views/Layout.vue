<template>
  <el-container class="layout-container tech-theme">
    <!-- 侧边栏 -->
    <el-aside width="220px" class="sidebar glass-sidebar" :class="{ 'collapsed': sidebarCollapsed }">
      <div class="logo-container">
        <img src="../assets/logo.svg" alt="Logo" class="logo">
        <h1 class="title tech-title">开控管理系统</h1>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu tech-menu"
        router
        :collapse="sidebarCollapsed"
        background-color="transparent"
        text-color="var(--el-text-color-primary)"
        active-text-color="var(--tech-primary)"
      >
        <el-menu-item index="/">
          <el-icon><icon-dashboard /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>
        
        <el-sub-menu index="/production">
          <template #title>
            <el-icon><icon-data-line /></el-icon>
            <span>生产管理</span>
          </template>
          <el-menu-item index="/production/plan">
            <el-icon><icon-calendar /></el-icon>
            <span>生产计划</span>
          </el-menu-item>
          <el-menu-item index="/production/task">
            <el-icon><icon-tickets /></el-icon>
            <span>生产任务</span>
          </el-menu-item>
          <el-menu-item index="/production/process">
            <el-icon><icon-set-up /></el-icon>
            <span>生产过程</span>
          </el-menu-item>
          <el-menu-item index="/production/report">
            <el-icon><icon-data-analysis /></el-icon>
            <span>生产报工</span>
          </el-menu-item>
        </el-sub-menu>
        
        
        <el-sub-menu index="/baseData">
          <template #title>
            <el-icon><icon-base /></el-icon>
            <span>基础数据</span>
          </template>
          <el-menu-item index="/baseData/materials">
            <el-icon><icon-material /></el-icon>
            <span>物料管理</span>
          </el-menu-item>
          <el-menu-item index="/baseData/boms">
            <el-icon><icon-bom /></el-icon>
            <span>BOM管理</span>
          </el-menu-item>
          <el-menu-item index="/baseData/customers">
            <el-icon><icon-customer /></el-icon>
            <span>客户管理</span>
          </el-menu-item>
          <el-menu-item index="/baseData/suppliers">
            <el-icon><icon-supplier /></el-icon>
            <span>供应商管理</span>
          </el-menu-item>
          <el-menu-item index="/baseData/categories">
            <el-icon><icon-category /></el-icon>
            <span>分类管理</span>
          </el-menu-item>
          <el-menu-item index="/baseData/units">
            <el-icon><icon-unit /></el-icon>
            <span>单位管理</span>
          </el-menu-item>
          <el-menu-item index="/baseData/locations">
            <el-icon><icon-location /></el-icon>
            <span>库位管理</span>
          </el-menu-item>
          <el-menu-item index="/baseData/process-templates">
            <el-icon><icon-set-up /></el-icon>
            <span>工序模板</span>
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/inventory">
          <template #title>
            <el-icon><icon-inventory /></el-icon>
            <span>库存管理</span>
          </template>
          <el-menu-item index="/inventory/stock">
            <el-icon><icon-stock /></el-icon>
            <span>库存查询</span>
          </el-menu-item>
          <el-menu-item index="/inventory/inbound">
            <el-icon><icon-plus /></el-icon>
            <span>入库管理</span>
          </el-menu-item>
          <el-menu-item index="/inventory/outbound">
            <el-icon><icon-minus /></el-icon>
            <span>出库管理</span>
          </el-menu-item>
          <el-menu-item index="/inventory/transfer">
            <el-icon><icon-right /></el-icon>
            <span>库存调拨</span>
          </el-menu-item>
          <el-menu-item index="/inventory/check">
            <el-icon><icon-check /></el-icon>
            <span>库存盘点</span>
          </el-menu-item>
          <el-menu-item index="/inventory/report">
            <el-icon><icon-data-analysis /></el-icon>
            <span>库存报表</span>
          </el-menu-item>
          <el-menu-item index="/inventory/transaction">
            <el-icon><icon-connection /></el-icon>
            <span>流水报表</span>
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/purchase">
          <template #title>
            <el-icon><icon-shopping-bag /></el-icon>
            <span>采购管理</span>
          </template>
          <el-menu-item index="/purchase/requisitions">
            <el-icon><icon-document /></el-icon>
            <span>采购申请</span>
          </el-menu-item>
          <el-menu-item index="/purchase/orders">
            <el-icon><icon-wallet /></el-icon>
            <span>采购订单</span>
          </el-menu-item>
          <el-menu-item index="/purchase/receipts">
            <el-icon><icon-goods /></el-icon>
            <span>采购入库</span>
          </el-menu-item>
          <el-menu-item index="/purchase/returns">
            <el-icon><icon-return /></el-icon>
            <span>采购退货</span>
          </el-menu-item>
          <el-menu-item index="/purchase/processing">
            <el-icon><icon-set-up /></el-icon>
            <span>外委加工</span>
          </el-menu-item>
          <el-menu-item index="/purchase/processing-receipts">
            <el-icon><icon-goods /></el-icon>
            <span>外委入库</span>
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/sales">
          <template #title>
            <el-icon><icon-sales /></el-icon>
            <span>销售管理</span>
          </template>
          <el-menu-item index="/sales/orders">
            <el-icon><icon-order /></el-icon>
            <span>销售订单</span>
          </el-menu-item>
          <el-menu-item index="/sales/outbound">
            <el-icon><icon-outbound /></el-icon>
            <span>销售出库</span>
          </el-menu-item>
          <el-menu-item index="/sales/returns">
            <el-icon><icon-return /></el-icon>
            <span>销售退货</span>
          </el-menu-item>
          <el-menu-item index="/sales/exchanges">
            <el-icon><icon-exchange /></el-icon>
            <span>销售换货</span>
          </el-menu-item>
          <el-menu-item index="/sales/quotations">
            <el-icon><icon-quotation /></el-icon>
            <span>报价单统计</span>
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/finance">
          <template #title>
            <el-icon><icon-money /></el-icon>
            <span>财务管理</span>
          </template>
          <!-- 总账管理 -->
          <el-menu-item index="/finance/gl/accounts">
            <el-icon><icon-account /></el-icon>
            <span>会计科目</span>
          </el-menu-item>
          <el-menu-item index="/finance/gl/entries">
            <el-icon><icon-document /></el-icon>
            <span>会计凭证</span>
          </el-menu-item>
          <el-menu-item index="/finance/gl/periods">
            <el-icon><icon-calendar /></el-icon>
            <span>会计期间</span>
          </el-menu-item>
          
          <!-- 应收账款 -->
          <el-menu-item index="/finance/ar/invoices">
            <el-icon><icon-tickets /></el-icon>
            <span>应收账款</span>
          </el-menu-item>
          <el-menu-item index="/finance/ar/receipts">
            <el-icon><icon-money /></el-icon>
            <span>收款管理</span>
          </el-menu-item>
          <el-menu-item index="/finance/ar/aging">
            <el-icon><icon-data-analysis /></el-icon>
            <span>账龄分析</span>
          </el-menu-item>
          
          <!-- 应付账款 -->
          <el-menu-item index="/finance/ap/invoices">
            <el-icon><icon-document /></el-icon>
            <span>应付账款</span>
          </el-menu-item>
          <el-menu-item index="/finance/ap/payments">
            <el-icon><icon-money /></el-icon>
            <span>付款管理</span>
          </el-menu-item>
          <el-menu-item index="/finance/ap/aging">
            <el-icon><icon-data-analysis /></el-icon>
            <span>账龄分析</span>
          </el-menu-item>
          
          <!-- 固定资产 -->
          <el-menu-item index="/finance/assets/list">
            <el-icon><icon-goods /></el-icon>
            <span>固定资产</span>
          </el-menu-item>
          <el-menu-item index="/finance/assets/categories">
            <el-icon><icon-folder /></el-icon>
            <span>资产类别</span>
          </el-menu-item>
          <el-menu-item index="/finance/assets/depreciation">
            <el-icon><icon-calendar /></el-icon>
            <span>折旧管理</span>
          </el-menu-item>
          
          <!-- 现金管理 -->
          <el-menu-item index="/finance/cash/accounts">
            <el-icon><icon-wallet /></el-icon>
            <span>银行账户</span>
          </el-menu-item>
          <el-menu-item index="/finance/cash/transactions">
            <el-icon><icon-right /></el-icon>
            <span>交易记录</span>
          </el-menu-item>
          <el-menu-item index="/finance/cash/reconciliation">
            <el-icon><icon-check /></el-icon>
            <span>银行对账</span>
          </el-menu-item>
          
          <!-- 财务报表 -->
          <el-menu-item index="/finance/reports/balance-sheet">
            <el-icon><icon-document /></el-icon>
            <span>资产负债表</span>
          </el-menu-item>
          <el-menu-item index="/finance/reports/income-statement">
            <el-icon><icon-data-analysis /></el-icon>
            <span>利润表</span>
          </el-menu-item>
          <el-menu-item index="/finance/reports/cash-flow">
            <el-icon><icon-wallet /></el-icon>
            <span>现金流量表</span>
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/quality">
          <template #title>
            <el-icon><icon-quality /></el-icon>
            <span>质量管理</span>
          </template>
          <el-menu-item index="/quality/incoming">
            <el-icon><icon-document /></el-icon>
            <span>来料检验</span>
          </el-menu-item>
          <el-menu-item index="/quality/process">
            <el-icon><icon-outbound /></el-icon>
            <span>过程检验</span>
          </el-menu-item>
          <el-menu-item index="/quality/final">
            <el-icon><icon-return /></el-icon>
            <span>成品检验</span>
          </el-menu-item>
          <el-menu-item index="/quality/templates">
            <el-icon><icon-document /></el-icon>
            <span>检验模板</span>
          </el-menu-item>
          <el-menu-item index="/quality/traceability">
            <el-icon><icon-connection /></el-icon>
            <span>追溯管理</span>
          </el-menu-item>
        </el-sub-menu>
        
        <el-sub-menu index="/system">
          <template #title>
            <el-icon><icon-setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/system/users">
            <el-icon><icon-user /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="/system/departments">
            <el-icon><icon-office-building /></el-icon>
            <span>部门管理</span>
          </el-menu-item>
          <el-menu-item index="/system/permissions">
            <el-icon><icon-lock /></el-icon>
            <span>权限设置</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    
    <!-- 主内容区 -->
    <el-container class="main-container">
      <!-- 头部导航 -->
      <el-header class="header glass-header">
        <div class="header-left">
          <el-icon class="toggle-sidebar" @click="toggleSidebar">
            <icon-menu />
          </el-icon>
          <breadcrumb />
        </div>
        
        <div class="header-right">
          <el-dropdown trigger="click">
            <div class="user-info">
              <el-avatar 
                :size="32" 
                :src="userAvatar" 
                class="tech-avatar"
                @error="handleAvatarError"
              >{{ userInitials }}</el-avatar>
              <span class="username">{{ userName }}</span>
            </div>
            
            <template #dropdown>
              <el-dropdown-menu class="tech-dropdown">
                <el-dropdown-item @click="handleProfile">个人信息</el-dropdown-item>
                <el-dropdown-item @click="handleSettings">设置</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <!-- 内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessageBox } from 'element-plus'
import Breadcrumb from '../components/Breadcrumb.vue'

// 图标组件
import {
  Menu as IconMenu,
  DataLine as IconDataLine,
  Odometer as IconDashboard,
  Setting as IconSetting,
  Collection as IconBase,
  Box as IconInventory,
  Tickets as IconStock,
  Plus as IconPlus,
  Minus as IconMinus,
  Right as IconRight,
  Check as IconCheck,
  List as IconBom,
  Avatar as IconCustomer,
  Goods as IconMaterial,
  Files as IconCategory,
  Coin as IconUnit,
  Location as IconLocation,
  Wallet as IconWallet,
  ShoppingCart as IconSales,
  Sell as IconSell,
  Document as IconDocument,
  RefreshLeft as IconReturn,
  Connection as IconConnection,
  ShoppingBag as IconShoppingBag,
  DocumentCopy as IconOrder,
  Briefcase as IconOutbound,
  ArrowDown as IconArrowDown,
  Calendar as IconCalendar,
  SetUp as IconSetUp,
  DataAnalysis as IconDataAnalysis,
  CircleCheck as IconQuality,
  Money as IconMoney,
  CreditCard as IconAccount,
  Printer as IconFinal,
  Finished as IconProcess,
  Sort as IconExchange,
  Box as IconIncoming,
  User as IconUser,
  OfficeBuilding as IconOfficeBuilding,
  Lock as IconLock,
  Folder as IconFolder
} from '@element-plus/icons-vue'

// 采购管理图标重命名，避免命名冲突
const IconQuotation = IconDocument
const IconGoods = IconMaterial
const IconSupplier = IconShoppingBag
const IconTickets = IconStock

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const sidebarCollapsed = ref(false)

// 当前激活的菜单项
const activeMenu = computed(() => {
  return route.path
})

// 用户信息
const userName = computed(() => {
  return authStore.user?.name || '用户'
})

const userAvatar = computed(() => {
  return authStore.user?.avatar || ''
})

const userInitials = computed(() => {
  const name = userName.value
  return name ? name.charAt(0).toUpperCase() : 'U'
})

// 处理头像加载失败
const handleAvatarError = () => {
  console.log('头像加载失败，使用默认显示')
}

// 切换侧边栏
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 用户操作
const handleProfile = () => {
  router.push('/profile')
}

const handleSettings = () => {
  // 实现设置功能
  console.log('打开设置')
}

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    authStore.logout()
    router.push('/login')
  }).catch(() => {})
}
</script>

<style scoped>
/* 科技主题样式 */
.tech-theme {
  --tech-primary: #00c3ff;
  --tech-secondary: #1e88e5;
  --tech-accent: #64ffda;
  --tech-glow: rgba(0, 195, 255, 0.5);
  --tech-dark: #1a1a2e;
  --tech-light: #e9f4ff;
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-shadow: rgba(0, 0, 0, 0.1);
  
  /* 恢复圆角和浮空效果变量 */
  --border-radius-sm: 8px;
  --border-radius-md: 12px;
  --border-radius-lg: 16px;
  --float-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  --float-shadow-hover: 0 15px 30px -5px rgba(0, 0, 0, 0.15);
}

.dark .tech-theme {
  --glass-bg: rgba(26, 26, 46, 0.7);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-shadow: rgba(0, 0, 0, 0.3);
}

.layout-container {
  height: 100vh;
  background-color: var(--el-bg-color);
  background-image: 
    radial-gradient(circle at 10% 20%, rgba(0, 195, 255, 0.05) 0%, transparent 20%),
    radial-gradient(circle at 90% 80%, rgba(30, 136, 229, 0.05) 0%, transparent 20%);
}

.sidebar {
  transition: all 0.3s ease;
  overflow-x: hidden;
  overflow-y: auto;
  height: 100%;
  position: relative;
  z-index: 1;
  border-radius: 0 var(--border-radius-lg) var(--border-radius-lg) 0;
  margin: 10px 0 10px 0;
  height: calc(100% - 20px);
  transform: translateZ(0);
}

.glass-sidebar {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  border-right: 1px solid var(--glass-border) !important;
  box-shadow: var(--float-shadow), 0 8px 32px 0 var(--glass-shadow) !important;
}

.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  padding-left: 16px;
  background-color: transparent;
  border-bottom: 1px solid var(--glass-border);
  position: relative;
  border-radius: var(--border-radius-md) var(--border-radius-md) 0 0;
}

.logo {
  width: 32px;
  height: 32px;
  filter: drop-shadow(0 0 5px var(--tech-glow));
  animation: logoGlow 4s infinite alternate;
}

@keyframes logoGlow {
  0% { filter: drop-shadow(0 0 3px var(--tech-glow)); }
  100% { filter: drop-shadow(0 0 8px var(--tech-glow)); }
}

.tech-title {
  background: linear-gradient(90deg, var(--tech-primary), var(--tech-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.title {
  margin-left: 12px;
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
}

.sidebar-menu {
  border-right: none;
  padding: 5px;
}

.tech-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(0, 195, 255, 0.1), transparent);
  border-left: 3px solid var(--tech-primary);
  border-radius: var(--border-radius-sm);
}

.tech-menu :deep(.el-menu-item), .tech-menu :deep(.el-sub-menu__title) {
  border-radius: var(--border-radius-sm);
  margin-bottom: 2px;
  transform: translateY(0);
  box-shadow: none;
  transition: all 0.3s ease;
  will-change: transform, box-shadow;
}

.tech-menu :deep(.el-menu-item:hover), .tech-menu :deep(.el-sub-menu__title:hover) {
  background-color: rgba(255, 255, 255, 0.05) !important;
  transform: translateY(-2px);
  box-shadow: var(--float-shadow-hover);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 60px;
  position: relative;
  z-index: 1;
  margin: 10px 10px 0 10px;
  border-radius: var(--border-radius-lg);
}

.glass-header {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  border: 1px solid var(--glass-border) !important;
  box-shadow: var(--float-shadow), 0 4px 16px -2px var(--glass-shadow) !important;
}

.header-left {
  display: flex;
  align-items: center;
}

.toggle-sidebar {
  font-size: 20px;
  cursor: pointer;
  margin-right: 16px;
  color: var(--el-text-color-primary);
  transition: transform 0.3s;
}

.toggle-sidebar:hover {
  color: var(--tech-primary);
  transform: rotate(90deg);
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 40px;
  transition: all 0.3s ease;
}

.user-info:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: var(--float-shadow-hover);
}

.tech-avatar {
  border: 2px solid transparent;
  background: linear-gradient(white, white) padding-box,
              linear-gradient(90deg, var(--tech-primary), var(--tech-secondary)) border-box;
  box-shadow: 0 0 10px var(--tech-glow);
}

.username {
  margin-left: 8px;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.tech-dropdown {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  border: 1px solid var(--glass-border) !important;
  box-shadow: var(--float-shadow), 0 8px 24px 0 var(--glass-shadow) !important;
  border-radius: var(--border-radius-md) !important;
  overflow: hidden;
}

.tech-dropdown :deep(.el-dropdown-menu__item) {
  border-radius: var(--border-radius-sm);
  margin: 2px 5px;
  transition: all 0.3s ease;
}

.tech-dropdown :deep(.el-dropdown-menu__item:not(.is-disabled):hover) {
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--tech-primary);
  transform: translateY(-1px);
  box-shadow: var(--float-shadow-hover);
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  padding: 20px;
  background-color: transparent;
  overflow-y: auto;
  position: relative;
  z-index: 1;
  margin: 0 10px 10px 10px;
}

/* 只移除表格的浮空效果，保留卡片的浮空效果 */
.main-content :deep(.el-card) {
  border-radius: var(--border-radius-md);
  transition: all 0.3s ease;
  box-shadow: var(--float-shadow);
  overflow: hidden;
  border: 1px solid var(--glass-border);
}

.main-content :deep(.el-card:hover) {
  transform: translateY(-3px);
  box-shadow: var(--float-shadow-hover);
}

.main-content :deep(.el-table) {
  border-radius: 0;
  transition: none;
  box-shadow: none;
  overflow: hidden;
  border: 1px solid var(--glass-border);
}

.main-content :deep(.el-table:hover) {
  transform: none;
  box-shadow: none;
}

/* 恢复卡片发光效果 */
.card-glow {
  display: block;
  position: absolute;
  top: -50px;
  left: -50px;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, var(--tech-glow) 0%, rgba(0, 0, 0, 0) 70%);
  opacity: 0.5;
  z-index: -1;
  animation: glowPulse 10s infinite alternate;
}

@keyframes glowPulse {
  0% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(241, 241, 241, 0.1);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: rgba(193, 193, 193, 0.3);
  border-radius: 10px;
  height: 50px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 168, 168, 0.5);
}

/* 针对侧边栏滚动条的特殊样式 */
.sidebar::-webkit-scrollbar {
  width: 4px;
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgba(224, 224, 224, 0.2);
}

/* 响应式调整 */
.sidebar.collapsed {
  width: 64px !important;
  border-radius: var(--border-radius-md);
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    z-index: 1000;
    top: 0;
    left: 0;
    height: 100vh;
    margin: 0;
    border-radius: 0;
  }
  
  .sidebar.collapsed {
    transform: translateX(-100%);
  }
  
  .header, .main-content {
    margin: 5px;
  }
}
</style>