const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

// 导入路由
const purchaseRoutes = require('./routes/purchaseRoutes');
const qualityRoutes = require('./routes/quality');
const financeRoutes = require('./routes/financeRoutes');
const baseDataRoutes = require('./routes/baseData');
const inventoryRoutes = require('./routes/inventory');
const testRoutes = require('./routes/testRoutes');

// 导入模型
const purchaseModel = require('./models/purchase');
const financeModel = require('./models/finance');
const db = require('./models');

// 导入调试中间件
const debugMiddleware = require('./middleware/debugMiddleware');

// 中间件
app.use(debugMiddleware);
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 路由
app.use('/api/purchase', purchaseRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/baseData', baseDataRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/test', testRoutes);

// 初始化数据库表
app.use(async (req, res, next) => {
  try {
    await purchaseModel.createPurchaseTablesIfNotExist();
    await financeModel.createFinanceTablesIfNotExist();
    
    // 同步质量模块相关的表
    await db.sequelize.sync();
    
    next();
  } catch (error) {
    console.error('初始化数据库表失败:', error);
    next();
  }
});

app.get('/', (req, res) => {
  res.send('工厂管理系统API服务正在运行');
});

module.exports = app; 