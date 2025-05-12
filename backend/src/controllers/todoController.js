const models = require('../models');
const { Op } = require('sequelize');

// 获取当前用户的所有待办事项
exports.getAllTodos = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('查询用户的待办事项, userId:', userId);
    
    // 打印调试信息
    console.log('Todo模型定义:', Object.keys(models.Todo.rawAttributes));
    
    const todos = await models.Todo.findAll({
      where: { userId }, // 使用驼峰形式
      order: [['deadline', 'ASC']]
    });
    
    console.log('查询成功，待办事项数量:', todos.length);
    
    return res.status(200).json({
      success: true,
      data: todos
    });
  } catch (error) {
    console.error('获取待办事项失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取待办事项失败',
      error: error.message
    });
  }
};

// 获取单个待办事项
exports.getTodoById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const todo = await models.Todo.findOne({
      where: {
        id,
        userId
      }
    });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '待办事项不存在'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: todo
    });
  } catch (error) {
    console.error('获取待办事项详情失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取待办事项详情失败',
      error: error.message
    });
  }
};

// 创建待办事项
exports.createTodo = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, deadline, priority } = req.body;
    
    // 验证必填字段
    if (!title) {
      return res.status(400).json({
        success: false,
        message: '标题不能为空'
      });
    }
    
    const todo = await models.Todo.create({
      userId,
      title,
      description,
      deadline: deadline ? new Date(deadline) : null,
      priority: priority || 2,
      completed: false
    });
    
    return res.status(201).json({
      success: true,
      message: '待办事项创建成功',
      data: todo
    });
  } catch (error) {
    console.error('创建待办事项失败:', error);
    return res.status(500).json({
      success: false,
      message: '创建待办事项失败',
      error: error.message
    });
  }
};

// 更新待办事项
exports.updateTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, deadline, priority, completed } = req.body;
    
    // 查找待办事项
    const todo = await models.Todo.findOne({
      where: {
        id,
        userId
      }
    });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '待办事项不存在'
      });
    }
    
    // 更新待办事项
    const updatedTodo = await todo.update({
      title: title || todo.title,
      description: description !== undefined ? description : todo.description,
      deadline: deadline ? new Date(deadline) : todo.deadline,
      priority: priority !== undefined ? priority : todo.priority,
      completed: completed !== undefined ? completed : todo.completed
    });
    
    return res.status(200).json({
      success: true,
      message: '待办事项更新成功',
      data: updatedTodo
    });
  } catch (error) {
    console.error('更新待办事项失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新待办事项失败',
      error: error.message
    });
  }
};

// 删除待办事项
exports.deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // 查找待办事项
    const todo = await models.Todo.findOne({
      where: {
        id,
        userId
      }
    });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '待办事项不存在'
      });
    }
    
    // 删除待办事项
    await todo.destroy();
    
    return res.status(200).json({
      success: true,
      message: '待办事项删除成功'
    });
  } catch (error) {
    console.error('删除待办事项失败:', error);
    return res.status(500).json({
      success: false,
      message: '删除待办事项失败',
      error: error.message
    });
  }
};

// 切换待办事项完成状态
exports.toggleTodoStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // 查找待办事项
    const todo = await models.Todo.findOne({
      where: {
        id,
        userId
      }
    });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '待办事项不存在'
      });
    }
    
    // 切换完成状态
    const updatedTodo = await todo.update({
      completed: !todo.completed
    });
    
    return res.status(200).json({
      success: true,
      message: `待办事项已标记为${updatedTodo.completed ? '已完成' : '未完成'}`,
      data: updatedTodo
    });
  } catch (error) {
    console.error('更新待办事项状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新待办事项状态失败',
      error: error.message
    });
  }
};

// 根据条件过滤待办事项
exports.filterTodos = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, priority, search, fromDate, toDate } = req.query;
    
    const whereClause = { userId };
    
    // 根据状态过滤
    if (status) {
      if (status === 'completed') {
        whereClause.completed = true;
      } else if (status === 'active') {
        whereClause.completed = false;
      } else if (status === 'overdue') {
        whereClause.completed = false;
        whereClause.deadline = {
          [Op.lt]: new Date()
        };
      } else if (status === 'upcoming') {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        whereClause.completed = false;
        whereClause.deadline = {
          [Op.gte]: now,
          [Op.lt]: tomorrow
        };
      }
    }
    
    // 根据优先级过滤
    if (priority) {
      whereClause.priority = priority;
    }
    
    // 根据标题搜索
    if (search) {
      whereClause.title = {
        [Op.like]: `%${search}%`
      };
    }
    
    // 根据日期范围搜索
    if (fromDate || toDate) {
      whereClause.deadline = {};
      
      if (fromDate) {
        whereClause.deadline[Op.gte] = new Date(fromDate);
      }
      
      if (toDate) {
        whereClause.deadline[Op.lte] = new Date(toDate);
      }
    }
    
    const todos = await models.Todo.findAll({
      where: whereClause,
      order: [['deadline', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      count: todos.length,
      data: todos
    });
  } catch (error) {
    console.error('过滤待办事项失败:', error);
    return res.status(500).json({
      success: false,
      message: '过滤待办事项失败',
      error: error.message
    });
  }
}; 