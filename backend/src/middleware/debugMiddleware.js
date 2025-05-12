/**
 * 调试中间件，用于监控和记录API请求和响应
 */
const debugMiddleware = (req, res, next) => {
  // 保存原始响应方法
  const originalJson = res.json;
  
  // 记录请求信息
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('请求参数:', req.query);
  
  // 重写json方法以拦截响应
  res.json = function(data) {
    // 记录响应信息
    console.log(`[${new Date().toISOString()}] 响应 ${req.method} ${req.url}`);
    
    // 格式化输出统计信息
    if (data && (req.url.includes('/inventory/transaction') || req.url.includes('/inventory/stock'))) {
      console.log('响应统计信息:', {
        total: data.total,
        pageCount: data.items ? data.items.length : 0
      });
      
      // 如果没有数据但应该有，记录详细信息
      if (data.total > 0 && (!data.items || data.items.length === 0)) {
        console.log('警告: 总记录数大于0但返回的数据为空');
      }
    }
    
    // 调用原始json方法
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = debugMiddleware; 