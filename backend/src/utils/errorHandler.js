/**
 * 从错误对象中提取友好的错误信息
 * @param {Error} error - 错误对象
 * @returns {string} 友好的错误信息
 */
const getErrorMessage = (error) => {
  if (error.response) {
    // 如果错误来自HTTP响应
    return error.response.data?.message || error.response.data || error.message;
  } else if (error.message) {
    // 如果是标准的Error对象
    return error.message;
  } else if (typeof error === 'string') {
    // 如果错误是字符串
    return error;
  } else if (error.sql) {
    // 如果是数据库错误
    return '数据库操作失败: ' + (error.detail || error.message || '未知错误');
  } else {
    // 默认情况
    return '发生未知错误';
  }
};

module.exports = {
  getErrorMessage,
}; 