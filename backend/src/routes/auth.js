const express = require('express');
const router = express.Router();
const multer = require('multer');
const { login, getUserProfile, updateUserProfile, uploadAvatar } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// 配置multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 限制2MB
});

// 登录路由
router.post('/login', login);

// 获取用户信息
router.get('/profile', authenticateToken, getUserProfile);

// 更新用户信息
router.put('/profile', authenticateToken, updateUserProfile);

// 上传用户头像
router.post('/users/avatar', authenticateToken, upload.single('avatar'), uploadAvatar);

module.exports = router;