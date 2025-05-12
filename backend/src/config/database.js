// 数据库配置信息
module.exports = {
  DB_HOST: process.env.DB_HOST || '0.0.0.0',
  DB_PORT: process.env.DB_PORT || 3306,
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || 'mysql',
  DB_NAME: process.env.DB_NAME || 'mes'
}; 