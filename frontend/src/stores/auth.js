import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  
  const isAuthenticated = computed(() => !!token.value)
  
  // 设置请求头中的token
  const setAuthHeader = () => {
    if (token.value) {
      localStorage.setItem('token', token.value)
    } else {
      localStorage.removeItem('token')
    }
  }
  
  // 初始化设置
  setAuthHeader()
  
  // 登录
  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials)
      token.value = response.data.token
      user.value = response.data.user
      
      localStorage.setItem('token', token.value)
      localStorage.setItem('user', JSON.stringify(user.value))
      
      setAuthHeader()
      
      // 登录成功后立即获取完整的用户信息
      await fetchUserProfile()
      
      return true
    } catch (error) {
      console.error('Login failed:', error)
      if (error.response && error.response.status === 401) {
        console.error('Unauthorized: Please check your credentials.')
      } else if (error.response && error.response.status === 404) {
        console.error('API endpoint not found. Please check if the backend server is running and the API path is correct.')
      }
      return false
    }
  }
  
  // 登出
  const logout = () => {
    token.value = ''
    user.value = null
    
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
  
  // 更新用户信息
  const updateUser = async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData)
      user.value = response.data
      localStorage.setItem('user', JSON.stringify(user.value))
      return true
    } catch (error) {
      console.error('Update user failed:', error)
      throw error
    }
  }
  
  // 获取用户信息
  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile')
      user.value = response.data
      localStorage.setItem('user', JSON.stringify(user.value))
      return true
    } catch (error) {
      console.error('Fetch user profile failed:', error)
      throw error
    }
  }
  
  return {
    token,
    user,
    isAuthenticated,
    login,
    logout,
    updateUser,
    fetchUserProfile,
    setAuthHeader
  }
})