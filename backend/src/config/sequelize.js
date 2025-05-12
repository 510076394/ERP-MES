require('dotenv').config();
const { Sequelize } = require('sequelize');

// 创建Sequelize实例
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD, 
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    },
    dialectOptions: {
      // 确保参数能正确传递
      decimalNumbers: true
    }
  }
);

// 测试连接并初始化
const initSequelize = async () => {
  try {
    await sequelize.authenticate();
    console.log('Sequelize连接已建立');
    
    // 在生产环境中，您可能不想自动同步模型变更到数据库
    // 在开发环境中，可以使用sync来自动更新数据库结构
    if (process.env.NODE_ENV === 'development') {
      // 注意：force: true 会删除现有表并重新创建
      // 生产环境中应设为 false 或不设置
      // await sequelize.sync({ alter: true });
      console.log('Sequelize模型已同步');
    }
  } catch (error) {
    console.error('无法连接到数据库:', error);
  }
};

initSequelize();

module.exports = sequelize; 