const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/jwt');
const db = require('../config/db');

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // 使用新的数据库函数获取用户
    const user = await db.getUser(username);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 获取用户信息
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await db.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 不返回密码
    const { password, ...userProfile } = user;
    
    res.json(userProfile);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 更新用户信息
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, avatar } = req.body;
    
    // 更新用户信息
    const updatedUser = await db.updateUser(userId, {
      name,
      email,
      phone,
      avatar
    });
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // 不返回密码
    const { password, ...userProfile } = updatedUser;
    
    res.json(userProfile);
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 上传用户头像
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`处理用户 ${userId} 的头像上传请求，body:`, req.body);
    console.log('上传的文件信息:', req.file);
    
    // 检查请求中是否有文件
    if (!req.file) {
      return res.status(400).json({ message: 'No avatar file provided' });
    }
    
    // 获取文件内容并转换为Base64
    const avatarBuffer = req.file.buffer;
    const avatarBase64 = `data:${req.file.mimetype};base64,${avatarBuffer.toString('base64')}`;
    
    console.log(`头像Base64数据长度: ${avatarBase64.length} 字符`);
    
    // 更新用户信息，添加头像数据
    const updatedUser = await db.updateUser(userId, {
      avatar: avatarBase64
    });
    
    if (!updatedUser) {
      console.log('用户未找到, userId:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // 确保avatar字段返回给客户端
    console.log('更新后的用户头像已保存，头像数据长度:', updatedUser.avatar ? updatedUser.avatar.length : 0);
    
    // 返回结果，包含完整的头像URL
    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl: avatarBase64
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ message: 'Server error during avatar upload: ' + error.message });
  }
};

module.exports = {
  login,
  getUserProfile,
  updateUserProfile,
  uploadAvatar
};