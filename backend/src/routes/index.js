const express = require('express');
const router = express.Router();

// 导入各个模块的路由
const authRoutes = require('./auth');
const userRoutes = require('./user');
const qualityRoutes = require('./quality');
const todoRoutes = require('./todoRoutes');
// ... 其他模块路由

// 注册路由
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/quality', qualityRoutes);
router.use('/todos', todoRoutes);
// ... 其他模块路由

module.exports = router; 