/**
 * 日期工具函数
 */

/**
 * 获取当前日期，格式为 YYYY-MM-DD
 * @returns {string} 当前日期字符串
 */
export function getCurrentDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // 检查日期是否有效
  if (isNaN(dateObj.getTime())) return '';
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:MM:SS
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} 格式化后的日期时间字符串
 */
export function formatDateTime(date) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // 检查日期是否有效
  if (isNaN(dateObj.getTime())) return '';
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取日期范围
 * @param {number} days - 天数
 * @returns {Array} 包含开始日期和结束日期的数组
 */
export function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  
  return [formatDate(start), formatDate(end)];
}

/**
 * 比较两个日期
 * @param {Date|string} dateA - 第一个日期
 * @param {Date|string} dateB - 第二个日期
 * @returns {number} 如果dateA早于dateB，返回-1；如果dateA晚于dateB，返回1；如果相等，返回0
 */
export function compareDate(dateA, dateB) {
  const dateObjA = typeof dateA === 'string' ? new Date(dateA) : dateA;
  const dateObjB = typeof dateB === 'string' ? new Date(dateB) : dateB;
  
  // 检查日期是否有效
  if (isNaN(dateObjA.getTime()) || isNaN(dateObjB.getTime())) return 0;
  
  if (dateObjA < dateObjB) return -1;
  if (dateObjA > dateObjB) return 1;
  return 0;
}

/**
 * 获取两个日期之间的天数
 * @param {Date|string} dateA - 第一个日期
 * @param {Date|string} dateB - 第二个日期
 * @returns {number} 两个日期之间的天数
 */
export function getDaysBetween(dateA, dateB) {
  const dateObjA = typeof dateA === 'string' ? new Date(dateA) : dateA;
  const dateObjB = typeof dateB === 'string' ? new Date(dateB) : dateB;
  
  // 检查日期是否有效
  if (isNaN(dateObjA.getTime()) || isNaN(dateObjB.getTime())) return 0;
  
  // 计算两个日期之间的毫秒数差异
  const diffTime = Math.abs(dateObjB - dateObjA);
  // 转换为天数
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
} 