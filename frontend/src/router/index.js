import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: () => import('../views/Layout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('../views/Dashboard.vue')
        },
        {
          path: 'baseData',
          name: 'baseData',
          component: () => import('../views/baseData/BaseData.vue'),
          children: [
            {
              path: 'materials',
              name: 'materials',
              component: () => import('../views/baseData/Materials.vue')
            },
            {
              path: 'boms',
              name: 'boms',
              component: () => import('../views/baseData/Boms.vue')
            },
            {
              path: 'customers',
              name: 'customers',
              component: () => import('../views/baseData/Customers.vue')
            },
            {
              path: 'suppliers',
              name: 'suppliers',
              component: () => import('../views/baseData/Suppliers.vue')
            },
            {
              path: 'categories',
              name: 'categories',
              component: () => import('../views/baseData/Categories.vue')
            },
            {
              path: 'units',
              name: 'units',
              component: () => import('../views/baseData/Units.vue')
            },
            {
              path: 'locations',
              name: 'locations',
              component: () => import('../views/baseData/Locations.vue')
            },
            {
              path: 'process-templates',
              name: 'processTemplates',
              component: () => import('../views/baseData/ProcessTemplates.vue')
            }
          ]
        },
        {
          path: 'inventory',
          name: 'inventory',
          component: () => import('../views/inventory/InventoryManagement.vue'),
          children: [
            {
              path: '',
              name: 'inventory-dashboard',
              redirect: '/inventory/stock'
            },
            {
              path: 'stock',
              name: 'inventory-stock',
              component: () => import('../views/inventory/InventoryStock.vue')
            },
            {
              path: 'inbound',
              name: 'inventory-inbound',
              component: () => import('../views/inventory/InventoryInbound.vue')
            },
            {
              path: 'outbound',
              name: 'inventory-outbound',
              component: () => import('../views/inventory/InventoryOutbound.vue')
            },
            {
              path: 'transfer',
              name: 'inventory-transfer',
              component: () => import('../views/inventory/InventoryTransfer.vue')
            },
            {
              path: 'check',
              name: 'inventory-check',
              component: () => import('../views/inventory/InventoryCheck.vue')
            },
            {
              path: 'report',
              name: 'inventory-report',
              component: () => import('../views/inventory/InventoryReport.vue')
            },
            {
              path: 'transaction',
              name: 'inventory-transaction',
              component: () => import('../views/inventory/InventoryTransaction.vue')
            }
          ]
        },
        {
          path: 'finance',
          name: 'finance',
          component: () => import('../views/Finance.vue'),
          children: [
            {
              path: '',
              name: 'finance-dashboard',
              redirect: '/finance/gl/accounts'
            },
            // 总账模块路由
            {
              path: 'gl/accounts',
              name: 'gl-accounts',
              component: () => import('../views/finance/gl/Accounts.vue')
            },
            {
              path: 'gl/entries',
              name: 'gl-entries',
              component: () => import('../views/finance/gl/Entries.vue')
            },
            {
              path: 'gl/entries/create',
              name: 'gl-entries-create',
              component: () => import('../views/finance/gl/EntryForm.vue')
            },
            {
              path: 'gl/periods',
              name: 'gl-periods',
              component: () => import('../views/finance/gl/Periods.vue')
            },
            // 应收账款模块路由
            {
              path: 'ar/invoices',
              name: 'ar-invoices',
              component: () => import('../views/finance/ar/Invoices.vue')
            },
            {
              path: 'ar/receipts',
              name: 'ar-receipts',
              component: () => import('../views/finance/ar/Receipts.vue')
            },
            {
              path: 'ar/aging',
              name: 'ar-aging',
              component: () => import('../views/finance/ar/Aging.vue')
            },
            // 应付账款模块路由
            {
              path: 'ap/invoices',
              name: 'ap-invoices',
              component: () => import('../views/finance/ap/Invoices.vue')
            },
            {
              path: 'ap/payments',
              name: 'ap-payments',
              component: () => import('../views/finance/ap/Payments.vue')
            },
            {
              path: 'ap/aging',
              name: 'ap-aging',
              component: () => import('../views/finance/ap/Aging.vue')
            },
            // 固定资产模块路由
            {
              path: 'assets/list',
              name: 'assets-list',
              component: () => import('../views/finance/assets/AssetsList.vue')
            },
            {
              path: 'assets/categories',
              name: 'assets-categories',
              component: () => import('../views/finance/assets/AssetCategoryList.vue')
            },
            {
              path: 'assets/depreciation',
              name: 'assets-depreciation',
              component: () => import('../views/finance/assets/Depreciation.vue')
            },
            // 现金管理模块路由
            {
              path: 'cash/accounts',
              name: 'cash-accounts',
              component: () => import('../views/finance/cash/BankAccounts.vue')
            },
            {
              path: 'cash/transactions',
              name: 'cash-transactions',
              component: () => import('../views/finance/cash/Transactions.vue')
            },
            {
              path: 'cash/reconciliation',
              name: 'cash-reconciliation',
              component: () => import('../views/finance/cash/Reconciliation.vue')
            },
            // 财务报表模块路由
            {
              path: 'reports/balance-sheet',
              name: 'balance-sheet',
              component: () => import('../views/finance/reports/BalanceSheet.vue')
            },
            {
              path: 'reports/income-statement',
              name: 'income-statement',
              component: () => import('../views/finance/reports/IncomeStatement.vue')
            },
            {
              path: 'reports/cash-flow',
              name: 'cash-flow',
              component: () => import('../views/finance/reports/CashFlow.vue')
            }
          ]
        },
        {
          path: 'sales',
          name: 'sales',
          component: () => import('../views/Sales.vue'),
          children: [
            {
              path: 'orders',
              name: 'salesOrders',
              component: () => import('../views/sales/SalesOrders.vue')
            },
            {
              path: 'outbound',
              name: 'salesOutbound',
              component: () => import('../views/sales/SalesOutbound.vue')
            },
            {
              path: 'returns',
              name: 'salesReturns',
              component: () => import('../views/sales/SalesReturns.vue')
            },
            {
              path: 'exchanges',
              name: 'salesExchanges',
              component: () => import('../views/sales/SalesExchanges.vue')
            },
            {
              path: 'quotations',
              name: 'salesQuotations',
              component: () => import('../views/sales/SalesQuotations.vue')
            }
          ]
        },
        {
          path: 'purchase',
          name: 'purchase',
          component: () => import('../views/Purchase.vue'),
          children: [
            {
              path: '',
              name: 'purchase-dashboard',
              redirect: '/purchase/requisitions'
            },
            {
              path: 'requisitions',
              name: 'purchase-requisitions',
              component: () => import('../views/purchase/PurchaseRequisitions.vue')
            },
            {
              path: 'orders',
              name: 'purchase-orders',
              component: () => import('../views/purchase/PurchaseOrders.vue')
            },
            {
              path: 'receipts',
              name: 'purchase-receipts',
              component: () => import('../views/purchase/PurchaseReceipts.vue')
            },
            {
              path: 'returns',
              name: 'purchase-returns',
              component: () => import('../views/purchase/PurchaseReturns.vue')
            },
            {
              path: 'processing',
              name: 'outsourced-processing',
              component: () => import('../views/purchase/OutsourcedProcessing.vue')
            },
            {
              path: 'processing-receipts',
              name: 'outsourced-processing-receipts',
              component: () => import('../views/purchase/OutsourcedReceipts.vue')
            }
          ]
        },
        {
          path: 'production',
          name: 'production',
          component: () => import('../views/production/ProductionManagement.vue')
        },
        {
          path: 'production/plan',
          name: 'productionPlan',
          component: () => import('../views/production/ProductionPlan.vue')
        },
        {
          path: 'production/task',
          name: 'productionTask',
          component: () => import('../views/production/ProductionTask.vue')
        },
        {
          path: 'production/process',
          name: 'productionProcess',
          component: () => import('../views/production/ProductionProcess.vue')
        },
        {
          path: 'production/report',
          name: 'productionReport',
          component: () => import('../views/production/ProductionReport.vue')
        },
        {
          path: 'quality',
          name: 'quality',
          component: () => import('../views/quality/QualityManagement.vue'),
          children: [
            {
              path: '',
              name: 'quality-dashboard',
              redirect: '/quality/incoming'
            },
            {
              path: 'incoming',
              name: 'quality-incoming',
              component: () => import('../views/quality/IncomingInspection.vue')
            },
            {
              path: 'process',
              name: 'quality-process',
              component: () => import('../views/quality/ProcessInspection.vue')
            },
            {
              path: 'templates',
              name: 'InspectionTemplates',
              component: () => import('../views/quality/InspectionTemplates.vue'),
              meta: { title: '检验模板', icon: 'el-icon-document' }
            },
            {
              path: 'final',
              name: 'quality-final',
              component: () => import('../views/quality/FinalInspection.vue'),
              alias: 'final-inspection'
            },
            {
              path: 'traceability',
              name: 'quality-traceability',
              component: () => import('../views/quality/TraceabilityManagement.vue')
            }
          ]
        },
        {
          path: 'profile',
          name: 'userProfile',
          component: () => import('../views/UserProfile.vue'),
          meta: { 
            requiresAuth: true,
            title: '个人中心'
          },
          beforeEnter: async (to, from, next) => {
            const authStore = useAuthStore()
            try {
              if (!authStore.user) {
                await authStore.fetchUserProfile()
              }
              next()
            } catch (error) {
              console.error('加载用户信息失败:', error)
              ElMessage.error('加载用户信息失败，请重新登录')
              next('/login')
            }
          }
        },
        {
          path: 'system',
          name: 'system',
          component: () => import('../views/System.vue'),
          children: [
            {
              path: '',
              name: 'system-dashboard',
              redirect: '/system/users'
            },
            {
              path: 'users',
              name: 'system-users',
              component: () => import('../views/system/Users.vue')
            },
            {
              path: 'departments',
              name: 'system-departments',
              component: () => import('../views/system/Departments.vue')
            },
            {
              path: 'permissions',
              name: 'system-permissions',
              component: () => import('../views/system/Permissions.vue')
            }
          ]
        }
      ]
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

export default router