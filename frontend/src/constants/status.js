// 生产状态映射
export const PRODUCTION_STATUS_MAP = {
  draft: { type: '', text: '未开始', color: '#909399' },
  preparing: { type: '', text: '配料中', color: '#8B37FF' },
  materials_issued: { type: '', text: '已发料', color: '#FF9900' },
  in_progress: { type: '', text: '生产中', color: '#409EFF' },
  completed: { type: '', text: '已完成', color: '#67C23A' },
  inspection: { type: '', text: '检验中', color: '#00AFFF' },
  warehousing: { type: '', text: '入库中', color: '#54b87f' },
  cancelled: { type: '', text: '已取消', color: '#F56C6C' }
}

// 实际状态映射（用于显示实际生产状态）
export const PRODUCTION_ACTUAL_STATUS_MAP = {
  draft: { text: '未开始', color: '#909399' },
  preparing: { text: '配料中', color: '#8B37FF' },
  materials_issued: { text: '已发料', color: '#FF9900' },
  in_progress: { text: '生产中', color: '#409EFF' },
  completed: { text: '已完成', color: '#67C23A' },
  inspection: { text: '检验中', color: '#00AFFF' },
  warehousing: { text: '入库中', color: '#54b87f' }
}

// 获取生产状态样式
export const getProductionStatusColor = (status, actualStatus) => {
  if (actualStatus && PRODUCTION_ACTUAL_STATUS_MAP[actualStatus]) {
    return PRODUCTION_ACTUAL_STATUS_MAP[actualStatus].color
  }
  return PRODUCTION_STATUS_MAP[status]?.color || '#909399'
}

// 获取生产状态文本
export const getProductionStatusText = (status, actualStatus) => {
  if (actualStatus && PRODUCTION_ACTUAL_STATUS_MAP[actualStatus]) {
    return PRODUCTION_ACTUAL_STATUS_MAP[actualStatus].text
  }
  return PRODUCTION_STATUS_MAP[status]?.text || status
}

// 销售状态映射
export const SALES_STATUS_MAP = {
  draft: { type: '', text: '草稿', color: '#909399' },
  pending: { type: '', text: '待处理', color: '#FF9900' },
  confirmed: { type: '', text: '已确认', color: '#E6A23C' },
  processing: { type: '', text: '处理中', color: '#409EFF' },
  in_production: { type: '', text: '生产中', color: '#8B37FF' },
  ready_to_ship: { type: '', text: '可发货', color: '#409eff' },
  shipped: { type: '', text: '已发货', color: '#67C23A' },
  delivered: { type: '', text: '已交付', color: '#67C23A' },
  completed: { type: '', text: '已完成', color: '#67C23A' },
  cancelled: { type: '', text: '已取消', color: '#F56C6C' }
}

// 获取销售状态样式
export const getSalesStatusColor = (status) => {
  return SALES_STATUS_MAP[status]?.color || '#909399'
}

// 获取销售状态文本
export const getSalesStatusText = (status) => {
  return SALES_STATUS_MAP[status]?.text || status
}

// 库存状态映射
export const INVENTORY_STATUS_MAP = {
  draft: { type: '', text: '草稿', color: '#909399' },
  pending: { type: '', text: '待处理', color: '#FF9900' },
  processing: { type: '', text: '处理中', color: '#409EFF' },
  completed: { type: '', text: '已完成', color: '#67C23A' },
  cancelled: { type: '', text: '已取消', color: '#F56C6C' }
}

// 获取库存状态样式
export const getInventoryStatusColor = (status) => {
  return INVENTORY_STATUS_MAP[status]?.color || '#909399'
}

// 获取库存状态文本
export const getInventoryStatusText = (status) => {
  return INVENTORY_STATUS_MAP[status]?.text || status
}