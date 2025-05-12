/**
 * 数量相关的工具函数
 */

/**
 * 解析数量值，将各种格式的数量统一转换为数字类型
 * @param {*} value - 要解析的数量值，可以是数字、字符串或null/undefined
 * @returns {number|null} - 解析后的数字或null(如果无法解析)
 */
export const parseQuantity = (value) => {
  // 处理空值
  if (value === undefined || value === null || value === '') {
    return null;
  }
  
  // 处理0值
  if (value === 0 || value === '0') {
    return 0;
  }
  
  // 处理数字类型
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  // 处理字符串类型
  if (typeof value === 'string') {
    // 如果已经包含单位"件"
    if (value.includes('件')) {
      const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
      return isNaN(parsed) ? null : parsed;
    } else {
      // 处理可能包含千分位逗号的字符串
      const parsed = parseFloat(value.replace(/,/g, ''));
      return isNaN(parsed) ? null : parsed;
    }
  }
  
  return null;
};

/**
 * 格式化数量，将数字转换为带千分位和单位的字符串
 * @param {*} value - 要格式化的数量值，可以是数字、字符串或null/undefined
 * @returns {string} - 格式化后的字符串，例如"1,000.00 件"或空字符串
 */
export const formatQuantity = (value) => {
  // 处理空值
  if (value === undefined || value === null || value === '') {
    return '';
  }
  
  // 解析数量
  const num = parseQuantity(value);
  if (num === null) {
    return '';
  }
  
  // 格式化数字
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num) + ' 件';
};

/**
 * 从数组中根据ID查找相关项并获取其数量
 * @param {Array} items - 要搜索的数组
 * @param {number|string} id - 要查找的ID
 * @param {string} idField - ID字段名，默认为'id'
 * @param {string} quantityField - 数量字段名，默认为'quantity'
 * @returns {number|null} - 解析后的数量值或null
 */
export const getQuantityFromRelatedItem = (items, id, idField = 'id', quantityField = 'quantity') => {
  if (!id || !items || !Array.isArray(items) || items.length === 0) {
    return null;
  }
  
  const relatedItem = items.find(item => item[idField] === id);
  if (!relatedItem) {
    return null;
  }
  
  return parseQuantity(relatedItem[quantityField]);
}; 