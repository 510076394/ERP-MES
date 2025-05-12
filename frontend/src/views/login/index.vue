<template>
  <div class="login-container">
    <!-- 动态背景 -->
    <div class="background">
      <div class="shape"></div>
      <div class="shape"></div>
    </div>
    
    <!-- 登录表单 -->
    <form class="login-form" @submit.prevent="handleLogin">
      <h3>欢迎登录</h3>
      
      <div class="form-group">
        <label for="username">用户名</label>
        <input 
          id="username" 
          v-model="loginForm.username" 
          type="text" 
          placeholder="请输入用户名"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="password">密码</label>
        <input 
          id="password" 
          v-model="loginForm.password" 
          type="password" 
          placeholder="请输入密码"
          required
        />
      </div>
      
      <button type="submit" class="login-btn">登录</button>
      
      <div class="social">
        <div class="go">
          <i class="fab fa-google"></i> Google
        </div>
        <div class="fb">
          <i class="fab fa-facebook"></i> Facebook
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loginForm = ref({
  username: '',
  password: ''
})

const handleLogin = async () => {
  try {
    // 这里添加登录逻辑
    ElMessage.success('登录成功')
    router.push('/')
  } catch (error) {
    ElMessage.error(error.message || '登录失败')
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, 
    #667eea 0%,
    #764ba2 25%,
    #6b8dd6 50%,
    #4facfe 75%,
    #00f2fe 100%
  );
  background-size: 400% 400%;
  animation: gradientBG 15s ease infinite;
  position: relative;
  overflow: hidden;
}

@keyframes gradientBG {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.background {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
  background: 
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(45deg, 
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.05)
  );
  backdrop-filter: blur(5px);
  animation: move 25s infinite;
}

.shape:nth-child(1) {
  width: 500px;
  height: 500px;
  top: -50px;
  left: -50px;
  animation-delay: 0s;
}

.shape:nth-child(2) {
  width: 300px;
  height: 300px;
  bottom: -50px;
  right: -50px;
  animation-delay: -10s;
}

@keyframes move {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  50% {
    transform: translate(100px, 100px) rotate(180deg);
  }
  100% {
    transform: translate(0, 0) rotate(360deg);
  }
}

.login-form {
  width: 400px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  z-index: 2;
  transition: transform 0.3s ease;
}

.login-form:hover {
  transform: translateY(-5px);
}

.login-form h3 {
  color: #fff;
  text-align: center;
  margin-bottom: 30px;
  font-size: 28px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  color: #fff;
  margin-bottom: 8px;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px 15px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.3s ease;
}

.form-group input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.2);
}

.form-group input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: #fff;
  border: none;
  border-radius: 8px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.login-btn:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
}

.social {
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
}

.social div {
  width: 48%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.social div:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.social i {
  margin-right: 8px;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-form {
    width: 90%;
    padding: 30px;
  }
  
  .shape:nth-child(1) {
    width: 300px;
    height: 300px;
  }
  
  .shape:nth-child(2) {
    width: 200px;
    height: 200px;
  }
}
</style> 