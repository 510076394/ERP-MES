const express = require('express');
const router = express.Router();
const todoController = require('../controllers/todoController');
const { authenticateToken } = require('../middleware/auth');

// 请求日志中间件
const logRequest = (req, res, next) => {
  console.log(`[TODO API] ${req.method} ${req.originalUrl} - User: ${req.user ? req.user.id : 'Not authenticated'}`);
  next();
};

// 先添加身份验证中间件
router.use(authenticateToken);
// 添加请求日志中间件
router.use(logRequest);

// 获取所有待办事项
router.get('/', todoController.getAllTodos);

// 按条件过滤待办事项
router.get('/filter', todoController.filterTodos);

// 获取单个待办事项
router.get('/:id', todoController.getTodoById);

// 创建待办事项
router.post('/', todoController.createTodo);

// 更新待办事项
router.put('/:id', todoController.updateTodo);

// 删除待办事项
router.delete('/:id', todoController.deleteTodo);

// 切换待办事项状态
router.patch('/:id/toggle', todoController.toggleTodoStatus);

module.exports = router; 