/**
 * 菜单权限数据 - 基于系统的菜单结构
 * 此数据可用于初始化菜单权限
 */

export const menuPermissions = [
  // 1. 仪表盘
  {
    id: 1,
    parentId: 0,
    name: '仪表盘',
    path: '/',
    component: 'Dashboard',
    icon: 'icon-dashboard',
    type: 1, // 1-菜单
    permission: 'dashboard',
    sort: 1,
    status: 1
  },
  
  // 2. 生产管理
  {
    id: 2,
    parentId: 0,
    name: '生产管理',
    path: '/production',
    component: '',
    icon: 'icon-data-line',
    type: 0, // 0-目录
    permission: 'production',
    sort: 2,
    status: 1
  },
  {
    id: 21,
    parentId: 2,
    name: '生产计划',
    path: '/production/plan',
    component: 'production/ProductionPlan',
    icon: 'icon-calendar',
    type: 1,
    permission: 'production:plan',
    sort: 1,
    status: 1
  },
  {
    id: 22,
    parentId: 2,
    name: '生产任务',
    path: '/production/task',
    component: 'production/ProductionTask',
    icon: 'icon-tickets',
    type: 1,
    permission: 'production:task',
    sort: 2,
    status: 1
  },
  {
    id: 23,
    parentId: 2,
    name: '生产过程',
    path: '/production/process',
    component: 'production/ProductionProcess',
    icon: 'icon-set-up',
    type: 1,
    permission: 'production:process',
    sort: 3,
    status: 1
  },
  {
    id: 24,
    parentId: 2,
    name: '生产报工',
    path: '/production/report',
    component: 'production/ProductionReport',
    icon: 'icon-data-analysis',
    type: 1,
    permission: 'production:report',
    sort: 4,
    status: 1
  },
  
  // 3. 基础数据
  {
    id: 3,
    parentId: 0,
    name: '基础数据',
    path: '/baseData',
    component: '',
    icon: 'icon-base',
    type: 0,
    permission: 'baseData',
    sort: 3,
    status: 1
  },
  {
    id: 31,
    parentId: 3,
    name: '物料管理',
    path: '/baseData/materials',
    component: 'baseData/Materials',
    icon: 'icon-material',
    type: 1,
    permission: 'baseData:materials',
    sort: 1,
    status: 1
  },
  {
    id: 32,
    parentId: 3,
    name: 'BOM管理',
    path: '/baseData/boms',
    component: 'baseData/Boms',
    icon: 'icon-bom',
    type: 1,
    permission: 'baseData:boms',
    sort: 2,
    status: 1
  },
  {
    id: 33,
    parentId: 3,
    name: '客户管理',
    path: '/baseData/customers',
    component: 'baseData/Customers',
    icon: 'icon-customer',
    type: 1,
    permission: 'baseData:customers',
    sort: 3,
    status: 1
  },
  {
    id: 34,
    parentId: 3,
    name: '供应商管理',
    path: '/baseData/suppliers',
    component: 'baseData/Suppliers',
    icon: 'icon-supplier',
    type: 1,
    permission: 'baseData:suppliers',
    sort: 4,
    status: 1
  },
  {
    id: 35,
    parentId: 3,
    name: '分类管理',
    path: '/baseData/categories',
    component: 'baseData/Categories',
    icon: 'icon-category',
    type: 1,
    permission: 'baseData:categories',
    sort: 5,
    status: 1
  },
  {
    id: 36,
    parentId: 3,
    name: '单位管理',
    path: '/baseData/units',
    component: 'baseData/Units',
    icon: 'icon-unit',
    type: 1,
    permission: 'baseData:units',
    sort: 6,
    status: 1
  },
  {
    id: 37,
    parentId: 3,
    name: '库位管理',
    path: '/baseData/locations',
    component: 'baseData/Locations',
    icon: 'icon-location',
    type: 1,
    permission: 'baseData:locations',
    sort: 7,
    status: 1
  },
  {
    id: 38,
    parentId: 3,
    name: '工序模板',
    path: '/baseData/process-templates',
    component: 'baseData/ProcessTemplates',
    icon: 'icon-set-up',
    type: 1,
    permission: 'baseData:processTemplates',
    sort: 8,
    status: 1
  },
  
  // 4. 库存管理
  {
    id: 4,
    parentId: 0,
    name: '库存管理',
    path: '/inventory',
    component: '',
    icon: 'icon-inventory',
    type: 0,
    permission: 'inventory',
    sort: 4,
    status: 1
  },
  {
    id: 41,
    parentId: 4,
    name: '库存查询',
    path: '/inventory/stock',
    component: 'inventory/InventoryStock',
    icon: 'icon-stock',
    type: 1,
    permission: 'inventory:stock',
    sort: 1,
    status: 1
  },
  {
    id: 42,
    parentId: 4,
    name: '入库管理',
    path: '/inventory/inbound',
    component: 'inventory/InventoryInbound',
    icon: 'icon-plus',
    type: 1,
    permission: 'inventory:inbound',
    sort: 2,
    status: 1
  },
  {
    id: 43,
    parentId: 4,
    name: '出库管理',
    path: '/inventory/outbound',
    component: 'inventory/InventoryOutbound',
    icon: 'icon-minus',
    type: 1,
    permission: 'inventory:outbound',
    sort: 3,
    status: 1
  },
  {
    id: 44,
    parentId: 4,
    name: '库存调拨',
    path: '/inventory/transfer',
    component: 'inventory/InventoryTransfer',
    icon: 'icon-right',
    type: 1,
    permission: 'inventory:transfer',
    sort: 4,
    status: 1
  },
  {
    id: 45,
    parentId: 4,
    name: '库存盘点',
    path: '/inventory/check',
    component: 'inventory/InventoryCheck',
    icon: 'icon-check',
    type: 1,
    permission: 'inventory:check',
    sort: 5,
    status: 1
  },
  {
    id: 46,
    parentId: 4,
    name: '库存报表',
    path: '/inventory/report',
    component: 'inventory/InventoryReport',
    icon: 'icon-chart',
    type: 1,
    permission: 'inventory:report',
    sort: 6,
    status: 1
  },
  {
    id: 47,
    parentId: 4,
    name: '流水报表',
    path: '/inventory/transaction',
    component: 'inventory/InventoryTransaction',
    icon: 'icon-list',
    type: 1,
    permission: 'inventory:transaction',
    sort: 7,
    status: 1
  },
  
  // 5. 采购管理
  {
    id: 5,
    parentId: 0,
    name: '采购管理',
    path: '/purchase',
    component: '',
    icon: 'icon-shopping-bag',
    type: 0,
    permission: 'purchase',
    sort: 5,
    status: 1
  },
  {
    id: 51,
    parentId: 5,
    name: '采购申请',
    path: '/purchase/requisitions',
    component: 'purchase/PurchaseRequisitions',
    icon: 'icon-document',
    type: 1,
    permission: 'purchase:requisitions',
    sort: 1,
    status: 1
  },
  {
    id: 52,
    parentId: 5,
    name: '采购订单',
    path: '/purchase/orders',
    component: 'purchase/PurchaseOrders',
    icon: 'icon-wallet',
    type: 1,
    permission: 'purchase:orders',
    sort: 2,
    status: 1
  },
  {
    id: 53,
    parentId: 5,
    name: '采购入库',
    path: '/purchase/receipts',
    component: 'purchase/PurchaseReceipts',
    icon: 'icon-goods',
    type: 1,
    permission: 'purchase:receipts',
    sort: 3,
    status: 1
  },
  {
    id: 54,
    parentId: 5,
    name: '采购退货',
    path: '/purchase/returns',
    component: 'purchase/PurchaseReturns',
    icon: 'icon-return',
    type: 1,
    permission: 'purchase:returns',
    sort: 4,
    status: 1
  },
  {
    id: 55,
    parentId: 5,
    name: '外委加工',
    path: '/purchase/processing',
    component: 'purchase/OutsourcedProcessing',
    icon: 'icon-set-up',
    type: 1,
    permission: 'purchase:processing',
    sort: 5,
    status: 1
  },
  {
    id: 56,
    parentId: 5,
    name: '加工入库',
    path: '/purchase/processing-receipts',
    component: 'purchase/OutsourcedReceipts',
    icon: 'icon-goods',
    type: 1,
    permission: 'purchase:processing-receipts',
    sort: 6,
    status: 1
  },
  
  // 6. 销售管理
  {
    id: 6,
    parentId: 0,
    name: '销售管理',
    path: '/sales',
    component: '',
    icon: 'icon-sales',
    type: 0,
    permission: 'sales',
    sort: 6,
    status: 1
  },
  {
    id: 61,
    parentId: 6,
    name: '销售订单',
    path: '/sales/orders',
    component: 'sales/SalesOrders',
    icon: 'icon-order',
    type: 1,
    permission: 'sales:orders',
    sort: 1,
    status: 1
  },
  {
    id: 62,
    parentId: 6,
    name: '销售出库',
    path: '/sales/outbound',
    component: 'sales/SalesOutbound',
    icon: 'icon-outbound',
    type: 1,
    permission: 'sales:outbound',
    sort: 2,
    status: 1
  },
  {
    id: 63,
    parentId: 6,
    name: '销售退货',
    path: '/sales/returns',
    component: 'sales/SalesReturns',
    icon: 'icon-return',
    type: 1,
    permission: 'sales:returns',
    sort: 3,
    status: 1
  },
  {
    id: 64,
    parentId: 6,
    name: '销售换货',
    path: '/sales/exchanges',
    component: 'sales/SalesExchanges',
    icon: 'icon-exchange',
    type: 1,
    permission: 'sales:exchanges',
    sort: 4,
    status: 1
  },
  {
    id: 65,
    parentId: 6,
    name: '报价单统计',
    path: '/sales/quotations',
    component: 'sales/SalesQuotations',
    icon: 'icon-quotation',
    type: 1,
    permission: 'sales:quotations',
    sort: 5,
    status: 1
  },
  
  // 7. 财务管理
  {
    id: 7,
    parentId: 0,
    name: '财务管理',
    path: '/finance',
    component: '',
    icon: 'icon-money',
    type: 0,
    permission: 'finance',
    sort: 7,
    status: 1
  },
  // 总账管理
  {
    id: 71,
    parentId: 7,
    name: '会计科目',
    path: '/finance/gl/accounts',
    component: 'finance/gl/Accounts',
    icon: 'icon-account',
    type: 1,
    permission: 'finance:gl:accounts',
    sort: 1,
    status: 1
  },
  {
    id: 72,
    parentId: 7,
    name: '会计凭证',
    path: '/finance/gl/entries',
    component: 'finance/gl/Entries',
    icon: 'icon-document',
    type: 1,
    permission: 'finance:gl:entries',
    sort: 2,
    status: 1
  },
  {
    id: 73,
    parentId: 7,
    name: '会计期间',
    path: '/finance/gl/periods',
    component: 'finance/gl/Periods',
    icon: 'icon-calendar',
    type: 1,
    permission: 'finance:gl:periods',
    sort: 3,
    status: 1
  },
  // 应收账款
  {
    id: 74,
    parentId: 7,
    name: '应收账款',
    path: '/finance/ar/invoices',
    component: 'finance/ar/Invoices',
    icon: 'icon-tickets',
    type: 1,
    permission: 'finance:ar:invoices',
    sort: 4,
    status: 1
  },
  {
    id: 75,
    parentId: 7,
    name: '收款管理',
    path: '/finance/ar/receipts',
    component: 'finance/ar/Receipts',
    icon: 'icon-money',
    type: 1,
    permission: 'finance:ar:receipts',
    sort: 5,
    status: 1
  },
  {
    id: 76,
    parentId: 7,
    name: '账龄分析',
    path: '/finance/ar/aging',
    component: 'finance/ar/Aging',
    icon: 'icon-data-analysis',
    type: 1,
    permission: 'finance:ar:aging',
    sort: 6,
    status: 1
  },
  // 应付账款
  {
    id: 77,
    parentId: 7,
    name: '应付账款',
    path: '/finance/ap/invoices',
    component: 'finance/ap/Invoices',
    icon: 'icon-document',
    type: 1,
    permission: 'finance:ap:invoices',
    sort: 7,
    status: 1
  },
  {
    id: 78,
    parentId: 7,
    name: '付款管理',
    path: '/finance/ap/payments',
    component: 'finance/ap/Payments',
    icon: 'icon-money',
    type: 1,
    permission: 'finance:ap:payments',
    sort: 8,
    status: 1
  },
  {
    id: 79,
    parentId: 7,
    name: '账龄分析',
    path: '/finance/ap/aging',
    component: 'finance/ap/Aging',
    icon: 'icon-data-analysis',
    type: 1,
    permission: 'finance:ap:aging',
    sort: 9,
    status: 1
  },
  // 固定资产
  {
    id: 710,
    parentId: 7,
    name: '固定资产',
    path: '/finance/assets/list',
    component: 'finance/assets/AssetsList',
    icon: 'icon-goods',
    type: 1,
    permission: 'finance:assets:list',
    sort: 10,
    status: 1
  },
  {
    id: 711,
    parentId: 7,
    name: '资产类别',
    path: '/finance/assets/categories',
    component: 'finance/assets/AssetCategoryList',
    icon: 'icon-folder',
    type: 1,
    permission: 'finance:assets:categories',
    sort: 11,
    status: 1
  },
  {
    id: 712,
    parentId: 7,
    name: '折旧管理',
    path: '/finance/assets/depreciation',
    component: 'finance/assets/Depreciation',
    icon: 'icon-calendar',
    type: 1,
    permission: 'finance:assets:depreciation',
    sort: 12,
    status: 1
  },
  // 现金管理
  {
    id: 713,
    parentId: 7,
    name: '银行账户',
    path: '/finance/cash/accounts',
    component: 'finance/cash/BankAccounts',
    icon: 'icon-wallet',
    type: 1,
    permission: 'finance:cash:accounts',
    sort: 13,
    status: 1
  },
  {
    id: 714,
    parentId: 7,
    name: '交易记录',
    path: '/finance/cash/transactions',
    component: 'finance/cash/Transactions',
    icon: 'icon-right',
    type: 1,
    permission: 'finance:cash:transactions',
    sort: 14,
    status: 1
  },
  {
    id: 715,
    parentId: 7,
    name: '银行对账',
    path: '/finance/cash/reconciliation',
    component: 'finance/cash/Reconciliation',
    icon: 'icon-check',
    type: 1,
    permission: 'finance:cash:reconciliation',
    sort: 15,
    status: 1
  },
  // 财务报表
  {
    id: 716,
    parentId: 7,
    name: '资产负债表',
    path: '/finance/reports/balance-sheet',
    component: 'finance/reports/BalanceSheet',
    icon: 'icon-document',
    type: 1,
    permission: 'finance:reports:balance-sheet',
    sort: 16,
    status: 1
  },
  {
    id: 717,
    parentId: 7,
    name: '利润表',
    path: '/finance/reports/income-statement',
    component: 'finance/reports/IncomeStatement',
    icon: 'icon-data-analysis',
    type: 1,
    permission: 'finance:reports:income-statement',
    sort: 17,
    status: 1
  },
  {
    id: 718,
    parentId: 7,
    name: '现金流量表',
    path: '/finance/reports/cash-flow',
    component: 'finance/reports/CashFlow',
    icon: 'icon-wallet',
    type: 1,
    permission: 'finance:reports:cash-flow',
    sort: 18,
    status: 1
  },

  // 8. 质量管理
  {
    id: 8,
    parentId: 0,
    name: '质量管理',
    path: '/quality',
    component: '',
    icon: 'icon-quality',
    type: 0,
    permission: 'quality',
    sort: 8,
    status: 1
  },
  {
    id: 81,
    parentId: 8,
    name: '来料检验',
    path: '/quality/incoming',
    component: 'quality/IncomingInspection',
    icon: 'icon-document',
    type: 1,
    permission: 'quality:incoming',
    sort: 1,
    status: 1
  },
  {
    id: 82,
    parentId: 8,
    name: '过程检验',
    path: '/quality/process',
    component: 'quality/ProcessInspection',
    icon: 'icon-outbound',
    type: 1,
    permission: 'quality:process',
    sort: 2,
    status: 1
  },
  {
    id: 83,
    parentId: 8,
    name: '成品检验',
    path: '/quality/final',
    component: 'quality/FinalInspection',
    icon: 'icon-return',
    type: 1,
    permission: 'quality:final',
    sort: 3,
    status: 1
  },
  {
    id: 84,
    parentId: 8,
    name: '检验模板',
    path: '/quality/templates',
    component: 'quality/InspectionTemplates',
    icon: 'icon-document',
    type: 1,
    permission: 'quality:templates',
    sort: 4,
    status: 1
  },
  {
    id: 85,
    parentId: 8,
    name: '追溯管理',
    path: '/quality/traceability',
    component: 'quality/TraceabilityManagement',
    icon: 'icon-connection',
    type: 1,
    permission: 'quality:traceability',
    sort: 5,
    status: 1
  },

  // 9. 系统管理
  {
    id: 9,
    parentId: 0,
    name: '系统管理',
    path: '/system',
    component: '',
    icon: 'icon-setting',
    type: 0,
    permission: 'system',
    sort: 9,
    status: 1
  },
  {
    id: 91,
    parentId: 9,
    name: '用户管理',
    path: '/system/users',
    component: 'system/Users',
    icon: 'icon-user',
    type: 1,
    permission: 'system:users',
    sort: 1,
    status: 1
  },
  {
    id: 92,
    parentId: 9,
    name: '部门管理',
    path: '/system/departments',
    component: 'system/Departments',
    icon: 'icon-office-building',
    type: 1,
    permission: 'system:departments',
    sort: 2,
    status: 1
  },
  {
    id: 93,
    parentId: 9,
    name: '权限设置',
    path: '/system/permissions',
    component: 'system/Permissions',
    icon: 'icon-lock',
    type: 1,
    permission: 'system:permissions',
    sort: 3,
    status: 1
  }
];

/**
 * 将平铺的菜单列表转换为树形结构
 */
export function buildMenuTree(menus = menuPermissions) {
  const menuMap = {};
  menus.forEach(menu => {
    menuMap[menu.id] = { ...menu, children: [] };
  });
  
  const tree = [];
  menus.forEach(menu => {
    const id = menu.id;
    const parentId = menu.parentId;
    
    if (parentId === 0) {
      tree.push(menuMap[id]);
    } else {
      if (menuMap[parentId]) {
        menuMap[parentId].children.push(menuMap[id]);
      }
    }
  });
  
  return tree;
}

/**
 * 导出SQL格式的菜单数据，用于数据库初始化
 */
export function generateMenuSQL() {
  let sql = 'INSERT INTO menus (id, parent_id, name, path, component, icon, permission, type, visible, status, sort_order, created_at, updated_at) VALUES\n';
  
  const values = menuPermissions.map(menu => {
    return `(${menu.id}, ${menu.parentId}, '${menu.name}', '${menu.path}', '${menu.component}', '${menu.icon}', '${menu.permission}', ${menu.type}, 1, ${menu.status}, ${menu.sort}, NOW(), NOW())`;
  }).join(',\n');
  
  sql += values + ';';
  return sql;
}

export default menuPermissions; 