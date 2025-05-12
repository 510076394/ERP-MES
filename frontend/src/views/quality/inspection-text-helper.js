/**
 * 获取检验类型文本
 * @param {string} type 检验类型
 * @returns {string} 检验类型的中文文本
 */
export const getInspectionTypeText = (type) => {
  // 类型显示文本
  const typeDisplayMap = {
    'visual': '外观检查',
    'dimension': '尺寸检查',
    'quantity': '数量检查',
    'function': '功能检查',
    'weight': '重量检查',
    'performance': '性能检查',
    'safety': '安全检查',
    'electrical': '电气检查',
    'other': '其他检查'
  }
  
  // 返回对应的显示文本
  return typeDisplayMap[type] || '其他检查'
}

/**
 * 获取检验状态类型（用于tag颜色）
 * @param {string} status 检验状态
 * @returns {string} 状态类型
 */
export const getStatusType = (status) => {
  const statusMap = {
    pending: 'info',
    passed: 'success',
    failed: 'danger',
    partial: 'warning'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取检验状态文本
 * @param {string} status 检验状态
 * @returns {string} 状态文本
 */
export const getStatusText = (status) => {
  const statusMap = {
    pending: '待检验',
    passed: '合格',
    failed: '不合格',
    partial: '部分合格'
  }
  return statusMap[status] || '未知'
} 