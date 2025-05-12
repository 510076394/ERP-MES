<template>
  <div class="user-profile tech-theme">
    <div class="profile-header">
      <h1><span class="tech-highlight">个人中心</span></h1>
    </div>
    
    <!-- 加载状态 -->
    <el-card v-if="isLoading" class="loading-card glass-card" shadow="hover">
      <div class="loading-container">
        <el-skeleton style="width: 100%" animated>
          <template #template>
            <div style="padding: 14px">
              <div style="display: flex; align-items: center;">
                <el-skeleton-item variant="circle" style="margin-right: 16px; width: 60px; height: 60px" />
                <div style="flex: 1">
                  <el-skeleton-item variant="h3" style="width: 50%" />
                  <el-skeleton-item variant="text" style="margin-top: 8px; width: 30%" />
                </div>
              </div>
              <el-skeleton-item variant="h3" style="width: 100%; margin-top: 16px" />
              <div style="display: flex; justify-content: space-between; margin-top: 16px">
                <el-skeleton-item variant="text" style="width: 30%" />
                <el-skeleton-item variant="text" style="width: 30%" />
                <el-skeleton-item variant="text" style="width: 30%" />
              </div>
        </div>
      </template>
        </el-skeleton>
      </div>
    </el-card>
    
    <!-- 每日励志语句 -->
    <el-card v-if="!isLoading" class="motivation-card glass-card" shadow="hover">
      <div class="motivation-container">
        <el-alert
          :title="`${userForm.name || '用户'}，今天是你在KACON的第${daysFromRegistration}天，今天也要加油哦！`"
          type="info"
          :description="getDailyMotivation()"
          :show-icon="false"
          :closable="false"
          class="custom-motivation-alert"
        />
      </div>
    </el-card>
    
    <el-row :gutter="20" v-if="!isLoading">
      <!-- 左侧用户信息栏 -->
      <el-col :xs="24" :sm="24" :md="8" :lg="7" :xl="6">
        <el-card class="profile-card user-info-card glass-card" shadow="hover">
          <div class="card-glow"></div>
          <div class="user-info-header">
            <div class="avatar-container">
              <el-avatar 
                :size="100" 
                :src="userForm.avatar || '/default-avatar.png'" 
                class="tech-avatar"
                @error="handleAvatarError"
              >
                {{ userForm.name ? userForm.name[0].toUpperCase() : 'U' }}
              </el-avatar>
              <div class="avatar-glow"></div>
              <el-upload
                v-if="isEditing"
                class="avatar-uploader"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="handleAvatarChange"
                :before-upload="beforeAvatarUpload"
              >
                <el-button size="small" type="primary" circle class="tech-button">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-upload>
            </div>
            <h2 class="user-name">{{ userForm.name }}</h2>
            <p class="user-role"><span class="tech-tag">{{ userForm.role }}</span></p>
          </div>
          
          <div class="user-stats">
            <div class="stat-item">
              <div class="stat-value">{{ userStats.loginCount }}</div>
              <div class="stat-label">登录次数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ userStats.daysActive }}</div>
              <div class="stat-label">活跃天数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ userStats.tasksCompleted }}</div>
              <div class="stat-label">完成任务</div>
            </div>
          </div>
          
          <div class="last-login">
            <el-icon><Timer /></el-icon>
            <span>上次登录: {{ formatDate(userStats.lastLogin) }}</span>
          </div>
        </el-card>
      </el-col>
      
      <!-- 右侧内容区 -->
      <el-col :xs="24" :sm="24" :md="16" :lg="17" :xl="18">
        <el-tabs v-model="activeTab" class="profile-tabs tech-tabs">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="basic">
            <el-card class="profile-card glass-card" shadow="hover" :class="{'editing-card': isEditing}">
              <div class="card-glow"></div>
              <template #header>
                <div class="card-header">
                  <span>个人信息</span>
                  <div v-if="isEditing" class="editing-badge">
                    <el-icon><Edit /></el-icon>
                    <span>编辑中</span>
                  </div>
                  <!-- 主编辑按钮 -->
                  <el-button 
                    class="edit-button" 
                    type="primary" 
                    size="small"
                    @click.stop.prevent="startEditing" 
                    v-if="!isEditing"
                  >
                    <el-icon class="edit-icon"><Edit /></el-icon>
                    <span>编辑资料</span>
                  </el-button>
                </div>
              </template>
              <el-form :model="userForm" :rules="rules" ref="userFormRef" label-width="100px" :disabled="!isEditing">
        <el-form-item label="用户名" prop="name">
                  <el-input v-model="userForm.name" class="tech-input" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
                  <el-input v-model="userForm.email" class="tech-input" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
                  <el-input v-model="userForm.phone" class="tech-input" />
                </el-form-item>
                <el-form-item label="所在地区">
                  <el-cascader
                    v-model="userForm.location"
                    :options="locationOptions"
                    placeholder="选择所在地区"
                    class="tech-input"
                  />
                </el-form-item>
                <el-form-item label="个人简介">
                  <el-input v-model="userForm.bio" type="textarea" :rows="3" class="tech-input" />
        </el-form-item>
        <el-form-item label="角色">
                  <el-input v-model="userForm.role" disabled class="tech-input" />
        </el-form-item>
        <el-form-item>
                  <el-button 
                    type="primary" 
                    @click="saveProfile" 
                    v-if="isEditing" 
                    class="save-button"
                  >
                    <el-icon><Check /></el-icon>
                    <span>保存资料</span>
                  </el-button>
                  <el-button 
                    @click="cancelEditing" 
                    v-if="isEditing" 
                    class="cancel-button"
                  >
                    <el-icon><Close /></el-icon>
                    <span>取消</span>
                  </el-button>
        </el-form-item>
      </el-form>
    </el-card>
          </el-tab-pane>
          
          <!-- 密码修改 -->
          <el-tab-pane label="密码修改" name="password">
            <el-card class="profile-card glass-card" shadow="hover">
              <div class="card-glow"></div>
              <template #header>
                <div class="card-header">
                  <span>修改密码</span>
                </div>
              </template>
              <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="120px">
                <el-form-item label="当前密码" prop="currentPassword">
                  <el-input v-model="passwordForm.currentPassword" type="password" show-password class="tech-input" />
                </el-form-item>
                <el-form-item label="新密码" prop="newPassword">
                  <el-input v-model="passwordForm.newPassword" type="password" show-password class="tech-input" />
                </el-form-item>
                <el-form-item label="确认新密码" prop="confirmPassword">
                  <el-input v-model="passwordForm.confirmPassword" type="password" show-password class="tech-input" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="changePassword" class="tech-button">更新密码</el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>
          
          <!-- 待办事项 -->
          <el-tab-pane label="待办事项" name="todos">
            <el-card class="profile-card glass-card" shadow="hover">
              <div class="card-glow"></div>
              <template #header>
                <div class="card-header">
                  <span>我的待办</span>
                  <el-button 
                    class="edit-button" 
                    type="primary" 
                    size="small"
                    @click="todoDialogVisible = true"
                  >
                    <el-icon class="edit-icon"><Plus /></el-icon>
                    <span>添加待办</span>
                  </el-button>
                </div>
              </template>
              
              <!-- 搜索和筛选区域 -->
              <div class="todo-filters">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                  <el-input
                    v-model="todoSearch"
                    placeholder="搜索待办事项..."
                    prefix-icon="Search"
                    clearable
                    class="tech-input"
                    style="flex: 1.5;"
                  />
                  <el-select v-model="todoFilter" placeholder="筛选状态" class="tech-input" style="width: 120px;">
                    <el-option label="全部" value="all" />
                    <el-option label="已完成" value="completed" />
                    <el-option label="未完成" value="active" />
                    <el-option label="即将到期" value="upcoming" />
                    <el-option label="已逾期" value="overdue" />
                  </el-select>
                  <el-select v-model="todoSorting" placeholder="排序方式" class="tech-input" style="width: 120px;">
                    <el-option label="截止日期" value="deadline" />
                    <el-option label="优先级" value="priority" />
                    <el-option label="创建日期" value="created" />
                  </el-select>
                  <el-button 
                    type="primary" 
                    text
                    @click="todoSortDirection = !todoSortDirection"
                    class="sort-direction-btn tech-button-text"
                  >
                    <el-icon v-if="todoSortDirection"><SortUp /></el-icon>
                    <el-icon v-else><SortDown /></el-icon>
                  </el-button>
                </div>
                
                <div class="todo-import-export">
                  <el-tooltip content="导出待办事项" placement="top">
                    <el-button 
                      type="primary" 
                      text 
                      @click="exportTodos"
                      class="tech-button-text"
                    >
                      <el-icon><Download /></el-icon> 导出
                    </el-button>
                  </el-tooltip>
                  
                  <el-tooltip content="导入待办事项" placement="top">
                    <el-button 
                      type="primary" 
                      text 
                      @click="importTodoClick"
                      class="tech-button-text"
                    >
                      <el-icon><Upload /></el-icon> 导入
                    </el-button>
                  </el-tooltip>
                  
                  <input 
                    type="file" 
                    ref="todoFileInput" 
                    accept=".json" 
                    style="display: none"
                    @change="importTodos"
                  />
                </div>
              </div>
              
              <div class="todo-list">
                <div v-if="filteredTodos.length === 0" class="empty-todos">
                  <el-empty :description="todos.length ? '没有符合条件的待办事项' : '暂无待办事项'" />
                </div>
                
                <transition-group name="todo-list" tag="div">
                  <div 
                    v-for="(todo, index) in filteredTodos" 
                    :key="todo.id" 
                    class="todo-item" 
                    :class="{ 'todo-completed': todo.completed, 'todo-overdue': isOverdue(todo) }"
                  >
                    <div class="todo-content">
                      <el-checkbox 
                        v-model="todo.completed" 
                        @change="toggleTodoStatus(todo)"
                        class="tech-checkbox"
                      />
                      <div class="todo-info">
                        <div class="todo-title" :class="{ 'completed-text': todo.completed }">
                          {{ todo.title }}
                          <el-tag 
                            v-if="isOverdue(todo)" 
                            size="small" 
                            type="danger" 
                            effect="dark"
                            class="todo-tag"
                          >已逾期</el-tag>
                          <el-tag 
                            v-else-if="isUpcoming(todo)" 
                            size="small" 
                            type="warning" 
                            effect="dark"
                            class="todo-tag"
                          >即将到期</el-tag>
                        </div>
                        <div class="todo-meta">
                          <span class="todo-date">
                            <el-icon><Calendar /></el-icon>
                            {{ formatDate(todo.deadline) }}
                            <span v-if="!todo.completed" class="todo-countdown">
                              {{ formatCountdown(todo.deadline) }}
                            </span>
                          </span>
                          <span 
                            class="todo-priority" 
                            :class="`priority-${todo.priority}`"
                          >
                            {{ getPriorityText(todo.priority) }}
                          </span>
                        </div>
                        <div v-if="todo.description" class="todo-description">
                          {{ truncateText(todo.description, 50) }}
                        </div>
                      </div>
                    </div>
                    <div class="todo-actions">
                      <el-button 
                        type="primary" 
                        text 
                        circle 
                        @click="editTodo(todo)"
                        class="tech-icon-button"
                      >
                        <el-icon><Edit /></el-icon>
                      </el-button>
                      <el-button 
                        type="danger" 
                        text 
                        circle 
                        @click="deleteTodo(index)"
                        class="tech-icon-button"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                  </div>
                </transition-group>
              </div>
            </el-card>
          </el-tab-pane>
          
          <!-- 外观设置 -->
          <el-tab-pane label="外观设置" name="appearance">
            <el-card class="profile-card glass-card" shadow="hover">
              <div class="card-glow"></div>
              <template #header>
                <div class="card-header">
                  <span>外观偏好</span>
                </div>
              </template>
              <el-form :model="appearanceForm" label-width="120px">
                <el-form-item label="主题模式">
                  <el-radio-group v-model="appearanceForm.theme" class="tech-radio">
                    <el-radio value="light">浅色主题</el-radio>
                    <el-radio value="dark">深色主题</el-radio>
                    <el-radio value="system">跟随系统</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="主色调">
                  <el-color-picker v-model="appearanceForm.primaryColor" class="tech-color-picker" />
                </el-form-item>
                <el-form-item label="字体大小">
                  <el-slider v-model="appearanceForm.fontSize" :min="12" :max="20" :step="1" show-stops class="tech-slider" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="saveAppearance" class="tech-button">保存设置</el-button>
                  <el-button @click="resetAppearance" class="tech-button-secondary">重置</el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>
          
          <!-- 通知设置 -->
          <el-tab-pane label="通知设置" name="notifications">
            <el-card class="profile-card glass-card" shadow="hover">
              <div class="card-glow"></div>
              <template #header>
                <div class="card-header">
                  <span>通知偏好</span>
                </div>
              </template>
              <el-form :model="notificationForm" label-width="120px">
                <el-form-item label="邮件通知">
                  <el-switch v-model="notificationForm.emailEnabled" class="tech-switch" />
                </el-form-item>
                <el-form-item label="系统通知">
                  <el-switch v-model="notificationForm.systemEnabled" class="tech-switch" />
                </el-form-item>
                <el-divider content-position="left">接收通知类型</el-divider>
                <el-form-item label="任务分配">
                  <el-switch v-model="notificationForm.taskAssignment" class="tech-switch" />
                </el-form-item>
                <el-form-item label="系统公告">
                  <el-switch v-model="notificationForm.systemAnnouncements" class="tech-switch" />
                </el-form-item>
                <el-form-item label="生产预警">
                  <el-switch v-model="notificationForm.productionAlerts" class="tech-switch" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="saveNotifications" class="tech-button">保存设置</el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>
          
          <!-- 活动时间线 -->
          <el-tab-pane label="近期活动" name="activity">
            <el-card class="profile-card glass-card" shadow="hover">
              <div class="card-glow"></div>
              <template #header>
                <div class="card-header">
                  <span>活动记录</span>
                </div>
              </template>
              <el-timeline class="tech-timeline">
                <el-timeline-item
                  v-for="(activity, index) in userActivities"
                  :key="index"
                  :timestamp="activity.timestamp"
                  :type="activity.type"
                  :icon="getActivityIcon(activity.category)"
                  :color="getActivityColor(activity.category)"
                >
                  {{ activity.content }}
                </el-timeline-item>
              </el-timeline>
              <div class="load-more">
                <el-button type="primary" text @click="loadMoreActivities" class="tech-button-text">加载更多</el-button>
              </div>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>
    
    <!-- 待办事项弹窗 -->
    <el-dialog
      v-model="todoDialogVisible"
      :title="editingTodoId ? '编辑待办事项' : '添加待办事项'"
      width="500px"
      class="todo-dialog"
      :append-to-body="true"
      destroy-on-close
    >
      <el-form :model="todoForm" ref="todoFormRef" :rules="todoRules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="todoForm.title" placeholder="请输入待办事项标题" class="tech-input" />
        </el-form-item>
        <el-form-item label="截止日期" prop="deadline">
          <el-date-picker
            v-model="todoForm.deadline"
            type="datetime"
            placeholder="选择截止日期时间"
            class="tech-input"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-radio-group v-model="todoForm.priority" class="tech-radio">
            <el-radio :label="3">高</el-radio>
            <el-radio :label="2">中</el-radio>
            <el-radio :label="1">低</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述">
          <el-input 
            v-model="todoForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入详细描述（可选）"
            class="tech-input"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="todoDialogVisible = false" class="tech-button-secondary">取消</el-button>
          <el-button type="primary" @click="saveTodo" class="tech-button">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { Edit, Timer, User, Document, Setting, Bell, Calendar, MessageBox, Plus, Delete, Check, Close, Search, SortUp, SortDown, Download, Upload } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { userApi, todoApi } from '../services/api'

const router = useRouter()
const authStore = useAuthStore()
const isEditing = ref(false)
const userFormRef = ref(null)
const passwordFormRef = ref(null)
const todoFormRef = ref(null)
const todoFileInput = ref(null)
const activeTab = ref('basic')
const todoDialogVisible = ref(false)
const editingTodoId = ref(null)

// 待办事项筛选
const todoSearch = ref('')
const todoFilter = ref('all')
const todoSorting = ref('deadline')
const todoSortDirection = ref(true) // true为正序，false为倒序

const debugMode = ref(false) // 默认关闭调试模式
const isLoading = ref(true)
const hasError = ref(false)

// 辅助函数 - 显示对话框状态并强制显示对话框
const forceShowDialog = () => {
  console.log('当前对话框状态:', todoDialogVisible.value);
  console.log('正在强制设置对话框为显示状态');
  todoDialogVisible.value = true;
  console.log('设置后对话框状态:', todoDialogVisible.value);
  
  // 使用nextTick确保DOM已更新
  nextTick(() => {
    console.log('nextTick后对话框状态:', todoDialogVisible.value);
    // 检查对话框元素是否存在
    const dialog = document.querySelector('.todo-dialog .el-dialog');
    console.log('对话框元素:', dialog);
    if (dialog) {
      console.log('对话框样式:', getComputedStyle(dialog).display);
    }
  });
}

// 修复localStorage访问
const getLocalStorage = (key) => {
  try {
    return localStorage.getItem(key)
  } catch (e) {
    console.error('无法访问localStorage:', e)
    return null
  }
}

// 用户基本信息表单
const userForm = reactive({
  name: '',
  email: '',
  phone: '',
  role: '',
  avatar: '',
  location: [],
  bio: '',
  created_at: null
})

// 密码修改表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 外观设置表单
const appearanceForm = reactive({
  theme: 'light',
  primaryColor: '#409EFF',
  fontSize: 14
})

// 通知设置表单
const notificationForm = reactive({
  emailEnabled: true,
  systemEnabled: true,
  taskAssignment: true,
  systemAnnouncements: true,
  productionAlerts: true
})

// 待办事项表单
const todoForm = reactive({
  title: '',
  deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 默认截止日期为明天
  priority: 2, // 默认中等优先级
  description: '',
  completed: false
})

// 待办事项列表
const todos = ref([])

// 用户统计数据
const userStats = reactive({
  loginCount: 0,
  daysActive: 0,
  tasksCompleted: 0,
  lastLogin: new Date()
})

// 用户活动数据
const userActivities = ref([])

// 地区选项数据
const locationOptions = [
  {
    value: 'beijing',
    label: '北京',
    children: [
      { value: 'haidian', label: '海淀区' },
      { value: 'chaoyang', label: '朝阳区' }
    ]
  },
  {
    value: 'shanghai',
    label: '上海',
    children: [
      { value: 'pudong', label: '浦东新区' },
      { value: 'huangpu', label: '黄浦区' }
    ]
  }
]

// 初始化数据
onMounted(async () => {
  try {
    isLoading.value = true
    // 获取最新的用户信息
    await authStore.fetchUserProfile()
    
    // 用户信息初始化
    const userData = authStore.user
    if (userData) {
      userForm.name = userData.name || ''
      userForm.email = userData.email || ''
      userForm.phone = userData.phone || ''
      userForm.role = userData.role || '普通用户'
      userForm.avatar = userData.avatar || ''
      userForm.location = userData.location || []
      userForm.bio = userData.bio || ''
      userForm.created_at = userData.created_at ? new Date(userData.created_at) : new Date()
    } else {
      ElMessage.error('获取用户信息失败')
    }
    
    // 加载待办事项
    loadTodos()
    
    // 模拟用户统计
    loadUserStats()
    
    // 模拟活动记录
    loadUserActivities()
    
  } catch (error) {
    console.error('初始化用户数据失败:', error)
    ElMessage.error('加载用户信息失败，请稍后重试')
    hasError.value = true
  } finally {
    // 在所有数据加载完毕后，将加载状态设置为完成
    isLoading.value = false
  }
})

// 修改loadTodos函数以包含更多错误处理和验证
const loadTodos = async () => {
  try {
    // 检查登录状态
    if (!authStore.isAuthenticated) {
      console.warn('用户未登录，无法加载待办事项');
      ElMessage.warning('请先登录后再查看待办事项');
      return;
    }
    
    console.log('开始加载待办事项，Authorization token:', localStorage.getItem('token'));
    const response = await todoApi.getAllTodos();
    console.log('待办事项API响应:', response);
    
    todos.value = response.data.data.map(todo => ({
      ...todo,
      deadline: new Date(todo.deadline)
    }));
  } catch (error) {
    console.error('加载待办事项失败:', error);
    
    // 如果是401错误，可能是令牌过期
    if (error.response && error.response.status === 401) {
      ElMessage.error('登录已过期，请重新登录');
      authStore.logout();
      router.push('/login');
      return;
    }
    
    ElMessage.error('加载待办事项失败: ' + (error.response?.data?.message || error.message));
    todos.value = [];
  }
}

// 加载用户统计信息
const loadUserStats = () => {
  // 模拟从本地或API获取统计数据
  userStats.loginCount = Math.floor(Math.random() * 100) + 10
  userStats.daysActive = Math.floor(Math.random() * 30) + 5
  userStats.tasksCompleted = Math.floor(Math.random() * 50)
  userStats.lastLogin = new Date(Date.now() - 86400000 * Math.floor(Math.random() * 7))
}

// 加载用户活动记录
const loadUserActivities = () => {
  // 模拟活动记录
  const activities = []
  const activityTypes = ['success', 'warning', 'info', 'danger']
  const activityCategories = ['login', 'system', 'profile', 'task']
  
  for (let i = 0; i < 10; i++) {
    const days = Math.floor(Math.random() * 30)
    activities.push({
      timestamp: new Date(Date.now() - 86400000 * days).toLocaleString(),
      content: `模拟活动记录 ${i + 1}`,
      type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
      category: activityCategories[Math.floor(Math.random() * activityCategories.length)]
    })
  }
  
  userActivities.value = activities.sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  )
}

// 计算用户注册天数
const daysFromRegistration = computed(() => {
  if (!userForm.created_at) return 1
  const now = new Date()
  const created = new Date(userForm.created_at)
  const diffTime = Math.abs(now - created)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays || 1
})

// 过滤和排序后的待办事项
const filteredTodos = computed(() => {
  // 先进行搜索过滤
  let result = todos.value.filter(todo => {
    // 搜索过滤
    if (todoSearch.value && !todo.title.toLowerCase().includes(todoSearch.value.toLowerCase())) {
      return false
    }
    
    // 状态过滤
    if (todoFilter.value === 'completed' && !todo.completed) return false
    if (todoFilter.value === 'active' && todo.completed) return false
    if (todoFilter.value === 'upcoming' && !isUpcoming(todo)) return false
    if (todoFilter.value === 'overdue' && !isOverdue(todo)) return false
    
    return true
  })
  
  // 排序
  result.sort((a, b) => {
    let comparison = 0
    
    switch (todoSorting.value) {
      case 'deadline':
        comparison = new Date(a.deadline) - new Date(b.deadline)
        break
      case 'priority':
        comparison = b.priority - a.priority // 高优先级在前
        break
      case 'created':
        comparison = new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        break
      default:
        comparison = 0
    }
    
    // 根据排序方向调整
    return todoSortDirection.value ? comparison : -comparison
  })
  
  return result
})

// 获取每日励志语句
const getDailyMotivation = () => {
  const motivations = [
    "今天又是充满可能性的一天，相信自己，你能做到！",
    "每一个挑战都是成长的机会，勇敢面对。",
    "小进步也是进步，坚持就会看到惊人的结果。",
    "态度决定高度，保持积极的心态迎接每一天。",
    "今天的努力是明天的资本，加油！"
  ]
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24)
  return motivations[dayOfYear % motivations.length]
}

// 获取活动图标
const getActivityIcon = (category) => {
  const iconMap = {
    login: 'User',
    system: 'Setting',
    profile: 'Edit',
    task: 'Document'
  }
  return iconMap[category] || 'MessageBox'
}

// 获取活动颜色
const getActivityColor = (category) => {
  const colorMap = {
    login: '#2db7f5',
    system: '#ff9900',
    profile: '#87d068',
    task: '#108ee9'
  }
  return colorMap[category] || '#909399'
}

// 获取优先级文本
const getPriorityText = (priority) => {
  const priorityMap = {
    1: '低优先级',
    2: '中优先级',
    3: '高优先级'
  }
  return priorityMap[priority] || '未设置'
}

// 判断是否过期
const isOverdue = (todo) => {
  if (!todo.deadline || todo.completed) return false
  const now = new Date()
  return new Date(todo.deadline) < now
}

// 判断是否即将到期（24小时内）
const isUpcoming = (todo) => {
  if (!todo.deadline || todo.completed) return false
  const now = new Date()
  const deadline = new Date(todo.deadline)
  const diff = deadline - now
  return diff > 0 && diff < 24 * 60 * 60 * 1000
}

// 加载更多活动
const loadMoreActivities = () => {
  // 模拟加载更多活动记录
  const activityTypes = ['success', 'warning', 'info', 'danger']
  const activityCategories = ['login', 'system', 'profile', 'task']
  const newActivities = []
  
  for (let i = 0; i < 5; i++) {
    const days = Math.floor(Math.random() * 60 + 30) // 更早的记录
    newActivities.push({
      timestamp: new Date(Date.now() - 86400000 * days).toLocaleString(),
      content: `历史活动记录 ${userActivities.value.length + i + 1}`,
      type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
      category: activityCategories[Math.floor(Math.random() * activityCategories.length)]
    })
  }
  
  userActivities.value = [...userActivities.value, ...newActivities].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  )
  
  ElMessage.success('已加载更多活动记录')
}

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

// 密码表单验证规则
const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, message: '密码长度不能少于8个字符', trigger: 'blur' },
    { 
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 
      message: '密码必须包含大小写字母、数字和特殊字符', 
      trigger: 'blur' 
    }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ]
}

// 待办事项表单验证规则
const todoRules = {
  title: [
    { required: true, message: '请输入待办事项标题', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在1到100个字符之间', trigger: 'blur' }
  ],
  deadline: [
    { required: true, message: '请选择截止日期', trigger: 'change' }
  ],
  priority: [
    { required: true, message: '请选择优先级', trigger: 'change' }
  ]
}

// 日期格式化
const formatDate = (date) => {
  if (!date) return '--'
  if (typeof date === 'string') date = new Date(date)
  if (!(date instanceof Date)) return '--'
  
  const now = new Date()
  const diff = date - now // 正值表示未来，负值表示过去
  
  // 如果是今天，显示时间
  if (Math.abs(diff) < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  // 其他情况显示日期
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 倒计时格式化
const formatCountdown = (date) => {
  if (!date) return '';
  if (typeof date === 'string') date = new Date(date);
  if (!(date instanceof Date)) return '';
  
  const now = new Date();
  const diff = date - now; // 毫秒数
  
  // 已过期
  if (diff < 0) {
    const pastDays = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
    if (pastDays === 0) {
      return '今天已过期';
    }
    return `已过期${pastDays}天`;
  }
  
  // 剩余时间
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  // 根据不同的剩余时间返回不同的格式
  if (days > 0) {
    return `剩余${days}天`;
  } else if (hours > 0) {
    return `剩余${hours}小时`;
  } else {
    return `剩余${minutes}分钟`;
  }
}

// 文本截断
const truncateText = (text, maxLength = 30) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// 导出待办事项
const exportTodos = async () => {
  try {
    // 从API获取最新数据
    const response = await todoApi.getAllTodos()
    const exportData = response.data.data
    
    // 创建Blob对象
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    
    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `todo-list-${new Date().toISOString().split('T')[0]}.json`
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    
    // 清理
    URL.revokeObjectURL(url)
    document.body.removeChild(link)
    
    ElMessage.success('待办事项导出成功')
  } catch (error) {
    console.error('导出待办事项失败:', error)
    ElMessage.error('导出失败: ' + error.message)
  }
}

const importTodoClick = () => {
  // 触发文件输入
  todoFileInput.value.click()
}

const importTodos = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // 检查文件类型
  if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
    ElMessage.error('请选择JSON格式的文件导入')
    return
  }
  
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      // 解析JSON数据
      const importedTodos = JSON.parse(e.target.result)
      
      if (!Array.isArray(importedTodos)) {
        throw new Error('导入的数据格式不正确，应为待办事项数组')
      }
      
      // 处理和验证导入的数据
      const validTodos = importedTodos.filter(todo => {
        // 验证必要字段
        return todo && todo.title
      }).map(todo => {
        // 准备导入数据
        return {
          title: todo.title,
          description: todo.description || '',
          deadline: todo.deadline ? new Date(todo.deadline) : new Date(),
          priority: todo.priority || 2,
          completed: !!todo.completed
        }
      })
      
      if (validTodos.length === 0) {
        throw new Error('没有找到有效的待办事项数据')
      }
      
      // 添加到数据库
      const mergeOption = await ElMessageBox.confirm(
        '如何处理导入的待办事项？',
        '导入选项',
        {
          confirmButtonText: '合并',
          cancelButtonText: '替换现有',
          distinguishCancelAndClose: true,
          type: 'info',
        }
      ).catch(action => action)
      
      if (mergeOption === 'confirm') {
        // 合并：添加新的待办事项
        let successCount = 0
        
        for (const todo of validTodos) {
          try {
            await todoApi.createTodo(todo)
            successCount++
          } catch (error) {
            console.error('导入单个待办事项失败:', error)
          }
        }
        
        // 重新加载所有待办事项
        await loadTodos()
        ElMessage.success(`成功导入 ${successCount} 个待办事项`)
      } else if (mergeOption === 'cancel') {
        // 替换：删除所有现有待办事项，然后添加新的
        try {
          // 获取所有现有待办事项
          const currentTodos = await todoApi.getAllTodos()
          
          // 删除所有现有待办事项
          for (const todo of currentTodos.data.data) {
            await todoApi.deleteTodo(todo.id)
          }
          
          // 添加新的待办事项
          let successCount = 0
          for (const todo of validTodos) {
            try {
              await todoApi.createTodo(todo)
              successCount++
            } catch (error) {
              console.error('导入单个待办事项失败:', error)
            }
          }
          
          // 重新加载所有待办事项
          await loadTodos()
          ElMessage.success(`已替换为导入的 ${successCount} 个待办事项`)
        } catch (error) {
          console.error('替换待办事项失败:', error)
          ElMessage.error('替换失败: ' + error.message)
        }
      }
      
      // 重置文件输入
      event.target.value = ''
    } catch (error) {
      console.error('导入待办事项失败:', error)
      ElMessage.error('导入失败: ' + error.message)
    }
  }
  
  reader.onerror = () => {
    ElMessage.error('读取文件失败')
  }
  
  reader.readAsText(file)
}

// 保存待办事项到本地存储
const saveTodosToStorage = async () => {
  // 这个方法已不再需要，因为每个操作都会直接与API交互
  // 保留方法名以避免修改其他地方的调用
}

// 处理编辑头像
const handleAvatarChange = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    userForm.avatar = e.target.result
  }
  reader.readAsDataURL(file.raw)
}

// 开始编辑个人资料
const startEditing = () => {
  isEditing.value = true
}

// 保存个人资料
const saveProfile = async () => {
  try {
    await userFormRef.value.validate()
    
    // 在实际应用中，这里应该调用API保存用户信息
    // await authStore.updateUser(userForm)
    
    ElMessage.success('个人资料保存成功！')
    isEditing.value = false
  } catch (error) {
    console.error('保存个人资料失败:', error)
    ElMessage.error('保存失败，请检查表单')
  }
}

// 取消编辑
const cancelEditing = () => {
  // 重置表单数据
  const userData = authStore.user
  if (userData) {
    userForm.name = userData.name || ''
    userForm.email = userData.email || ''
    userForm.phone = userData.phone || ''
    userForm.location = userData.location || []
    userForm.bio = userData.bio || ''
  }
  isEditing.value = false
}

// 修改密码
const changePassword = async () => {
  try {
    await passwordFormRef.value.validate()
    
    // 在实际应用中，这里应该调用API修改密码
    // await userApi.changePassword({
    //   currentPassword: passwordForm.currentPassword,
    //   newPassword: passwordForm.newPassword
    // })
    
    ElMessage.success('密码修改成功！')
    
    // 重置表单
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    console.error('修改密码失败:', error)
    ElMessage.error('修改密码失败，请检查输入')
  }
}

// 显示添加待办事项对话框
const showAddTodo = () => {
  try {
    console.log('显示添加待办事项对话框'); // 添加日志以排查问题
    // 重置表单
    todoForm.title = '';
    todoForm.deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
    todoForm.priority = 2;
    todoForm.description = '';
    todoForm.completed = false;
    
    editingTodoId.value = null;
    todoDialogVisible.value = true;
    
    // 确保弹窗显示后再聚焦
    nextTick(() => {
      // 这里可以添加表单首个输入框的聚焦逻辑
      const firstInput = document.querySelector('.todo-dialog .el-input__inner');
      if (firstInput) {
        firstInput.focus();
      }
    });
  } catch (error) {
    console.error('显示添加待办事项对话框失败:', error);
    // 尝试强制设置对话框可见状态
    todoDialogVisible.value = true;
  }
}

// 编辑待办事项
const editTodo = (todo) => {
  // 填充表单
  todoForm.title = todo.title
  todoForm.deadline = new Date(todo.deadline)
  todoForm.priority = todo.priority
  todoForm.description = todo.description || ''
  todoForm.completed = todo.completed
  
  editingTodoId.value = todo.id
  todoDialogVisible.value = true
}

// 删除待办事项
const deleteTodo = (index) => {
  const todoId = todos.value[index].id
  
  ElMessageBox.confirm(
    '确定要删除这个待办事项吗？此操作不可撤销。',
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await todoApi.deleteTodo(todoId)
      todos.value.splice(index, 1)
      ElMessage.success('待办事项已删除')
    } catch (error) {
      console.error('删除待办事项失败:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {
    // 用户取消删除
  })
}

// 切换待办事项状态
const toggleTodoStatus = async (todo) => {
  try {
    const response = await todoApi.toggleTodoStatus(todo.id)
    
    // 更新本地待办事项状态
    const index = todos.value.findIndex(item => item.id === todo.id)
    if (index !== -1) {
      todos.value[index].completed = response.data.data.completed
    }
    
    ElMessage.success(response.data.message || '状态已更新')
  } catch (error) {
    console.error('更新待办事项状态失败:', error)
    ElMessage.error('更新状态失败')
    
    // 恢复原状态
    todo.completed = !todo.completed
  }
}

// 保存待办事项
const saveTodo = async () => {
  try {
    console.log('保存待办事项', todoForm); // 添加日志以排查问题
    
    if (!todoFormRef.value) {
      console.error('todoFormRef为空');
      return;
    }
    
    await todoFormRef.value.validate();
    
    if (editingTodoId.value) {
      // 编辑模式
      console.log('更新待办事项', editingTodoId.value, todoForm);
      const response = await todoApi.updateTodo(editingTodoId.value, {
        title: todoForm.title,
        description: todoForm.description,
        deadline: todoForm.deadline,
        priority: todoForm.priority,
        completed: todoForm.completed
      });
      
      // 更新本地数据
      const index = todos.value.findIndex(item => item.id === editingTodoId.value);
      if (index !== -1) {
        todos.value[index] = {
          ...todos.value[index],
          ...response.data.data,
          deadline: new Date(response.data.data.deadline)
        };
      }
      
      ElMessage.success('待办事项已更新');
    } else {
      // 新增模式
      console.log('创建新待办事项', todoForm);
      try {
        const response = await todoApi.createTodo({
          title: todoForm.title,
          description: todoForm.description,
          deadline: todoForm.deadline,
          priority: todoForm.priority
        });
        
        console.log('创建待办事项响应:', response);
        
        // 添加到本地数据
        todos.value.push({
          ...response.data.data,
          deadline: new Date(response.data.data.deadline)
        });
        
        ElMessage.success('待办事项已添加');
      } catch (error) {
        console.error('API调用失败:', error);
        if (error.response) {
          console.error('错误状态码:', error.response.status);
          console.error('错误响应:', error.response.data);
        }
        throw error;
      }
    }
    
    todoDialogVisible.value = false;
  } catch (error) {
    console.error('保存待办事项失败:', error);
    ElMessage.error('保存失败，' + (error.response?.data?.message || '请检查表单'));
  }
}

// 保存外观设置
const saveAppearance = () => {
  // 在实际应用中，这里应该调用API保存设置或保存到本地存储
  try {
    localStorage.setItem('appearance', JSON.stringify(appearanceForm))
    ElMessage.success('外观设置已保存')
    
    // 应用外观设置
    // 实际应用中需要在此处应用主题变更等
  } catch (e) {
    console.error('保存外观设置失败:', e)
    ElMessage.error('保存设置失败')
  }
}

// 重置外观设置
const resetAppearance = () => {
  appearanceForm.theme = 'light'
  appearanceForm.primaryColor = '#409EFF'
  appearanceForm.fontSize = 14
  ElMessage.info('外观设置已重置')
}

// 保存通知设置
const saveNotifications = () => {
  // 在实际应用中，这里应该调用API保存设置或保存到本地存储
  try {
    localStorage.setItem('notifications', JSON.stringify(notificationForm))
    ElMessage.success('通知设置已保存')
  } catch (e) {
    console.error('保存通知设置失败:', e)
    ElMessage.error('保存设置失败')
  }
}

// 在script部分添加以下方法
const handleAvatarError = () => {
  // 头像加载失败时显示用户名首字母
  console.log('头像加载失败，使用默认显示')
}

const beforeAvatarUpload = (file) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    ElMessage.error('头像只能是 JPG 或 PNG 格式!')
  }
  if (!isLt2M) {
    ElMessage.error('头像大小不能超过 2MB!')
  }
  return isJPG && isLt2M
}
</script>

<style>
:root {
  --tech-primary: #3498db;
  --tech-secondary: #9b59b6;
  --tech-glow: rgba(52, 152, 219, 0.5);
  --tech-background: #1a1a2e;
  --tech-card: rgba(30, 39, 46, 0.6);
  --tech-text: #ecf0f1;
  --tech-border: rgba(52, 152, 219, 0.3);
}

.user-profile {
  padding: 20px;
  position: relative;
  background-color: var(--el-bg-color);
}

/* 科技主题样式 */
.tech-theme {
  --tech-primary: #00c3ff;
  --tech-secondary: #1e88e5;
  --tech-accent: #64ffda;
  --tech-glow: rgba(0, 195, 255, 0.5);
  --tech-dark: #1a1a2e;
  --tech-light: #e9f4ff;
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-shadow: rgba(0, 0, 0, 0.1);
  --error-color: #f56c6c;
  --warning-color: #e6a23c;
}

.dark .tech-theme {
  --glass-bg: rgba(26, 26, 46, 0.7);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-shadow: rgba(0, 0, 0, 0.3);
}

/* 玻璃卡片样式 */
.glass-card {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(10px) !important;
  border: 1px solid var(--glass-border) !important;
  box-shadow: 0 8px 32px 0 var(--glass-shadow) !important;
  border-radius: 12px !important;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.glass-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px 0 var(--glass-shadow) !important;
  border-color: var(--tech-primary) !important;
}

.card-glow {
  position: absolute;
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, var(--tech-glow) 0%, rgba(0, 0, 0, 0) 70%);
  border-radius: 50%;
  opacity: 0.4;
  top: -50px;
  right: -50px;
  z-index: 0;
  animation: cardGlowFloat 10s infinite alternate ease-in-out;
  transition: all 0.5s ease;
}

.glass-card:hover .card-glow {
  opacity: 0.8;
  width: 180px;
  height: 180px;
  filter: blur(15px);
}

@keyframes cardGlowFloat {
  0% { transform: translate(0, 0) scale(1); opacity: 0.4; }
  50% { transform: translate(-20px, 20px) scale(1.2); opacity: 0.6; }
  100% { transform: translate(20px, -20px) scale(1); opacity: 0.4; }
}

/* 调试信息卡片样式 */
.debug-card {
  margin-bottom: 20px;
  border: 1px dashed var(--tech-primary) !important;
}

.debug-content {
  font-family: monospace;
  max-height: 300px;
  overflow-y: auto;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.debug-content p {
  margin: 5px 0;
  line-height: 1.5;
}

.debug-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* 加载和错误状态样式 */
.loading-card, .motivation-card {
  margin-bottom: 20px;
}

.motivation-card {
  border-left: 4px solid var(--tech-primary) !important;
}

.loading-container {
  padding: 10px 0;
}

.error-container {
  padding: 10px 0;
}

.profile-header {
  margin-bottom: 20px;
}

.profile-header h1 {
  font-size: 28px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  position: relative;
  display: inline-block;
}

.tech-highlight {
  position: relative;
  z-index: 1;
}

.tech-highlight::after {
  content: '';
  position: absolute;
  left: -10px;
  right: -10px;
  bottom: 0;
  height: 10px;
  background: linear-gradient(90deg, var(--tech-accent), transparent);
  z-index: -1;
  opacity: 0.5;
  border-radius: 10px;
}

.profile-card {
  margin-bottom: 20px;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info-card {
  text-align: center;
  height: 100%;
}

.user-info-header {
  padding-bottom: 20px;
}

.avatar-container {
  position: relative;
  display: inline-block;
  margin-bottom: 15px;
  transition: transform 0.5s ease;
}

.avatar-container:hover {
  transform: scale(1.1);
}

.tech-avatar {
  border: 3px solid transparent !important;
  background: linear-gradient(white, white) padding-box,
              linear-gradient(90deg, var(--tech-primary), var(--tech-secondary)) border-box !important;
  box-shadow: 0 0 15px var(--tech-glow) !important;
  transition: all 0.4s ease;
}

.avatar-container:hover .tech-avatar {
  box-shadow: 0 0 25px var(--tech-primary) !important;
}

.avatar-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  border-radius: 50%;
  background: radial-gradient(circle, var(--tech-glow) 0%, rgba(0, 0, 0, 0) 70%);
  z-index: -1;
  animation: avatarGlow 4s infinite alternate;
  transition: all 0.4s ease;
}

.avatar-container:hover .avatar-glow {
  animation: avatarGlowHover 1.5s infinite alternate;
}

@keyframes avatarGlow {
  0% { opacity: 0.3; }
  100% { opacity: 0.7; }
}

@keyframes avatarGlowHover {
  0% { opacity: 0.5; transform: scale(1); }
  100% { opacity: 0.9; transform: scale(1.2); }
}

.avatar-uploader {
  position: absolute;
  bottom: 0;
  right: 0;
}

.user-name {
  font-size: 20px;
  font-weight: 500;
  margin: 10px 0 5px;
  background: linear-gradient(90deg, var(--tech-primary), var(--tech-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.user-role {
  font-size: 14px;
}

.tech-tag {
  background: linear-gradient(90deg, var(--tech-primary), var(--tech-secondary));
  padding: 2px 10px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.user-stats {
  display: flex;
  justify-content: space-around;
  padding: 15px 0;
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
  margin: 15px 0;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 500;
  background: linear-gradient(90deg, var(--tech-primary), var(--tech-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 5px;
}

.last-login {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  gap: 5px;
}

.profile-tabs {
  width: 100%;
}

/* 待办事项样式 */
.todo-list {
  margin-top: 10px;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  background-color: var(--el-fill-color-light);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  overflow: hidden;
  border-left: 4px solid transparent;
}

.todo-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(to bottom, var(--tech-primary), var(--tech-secondary));
  border-radius: 4px 0 0 4px;
  transition: all 0.3s ease;
}

.todo-item:hover {
  transform: translateX(5px);
  background-color: rgba(var(--el-color-primary-rgb), 0.1);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.todo-item:hover::before {
  width: 8px;
}

.todo-item.todo-completed {
  opacity: 0.7;
  background-color: var(--el-fill-color);
}

.todo-item.todo-completed::before {
  background: var(--el-color-success);
}

.todo-item.todo-overdue {
  border-left: 4px solid var(--el-color-danger);
}

.todo-item.todo-overdue::before {
  background: var(--el-color-danger);
}

.todo-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.todo-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-title {
  font-weight: 500;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.completed-text {
  text-decoration: line-through;
  color: var(--el-text-color-secondary);
}

.todo-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.todo-date {
  display: flex;
  align-items: center;
  gap: 4px;
}

.todo-priority {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.priority-1 {
  background-color: var(--el-color-info-light-9);
  color: var(--el-color-info);
}

.priority-2 {
  background-color: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
}

.priority-3 {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.todo-actions {
  display: flex;
  gap: 8px;
}

.empty-todos {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px 0;
}

/* 过渡动画 */
.todo-list-enter-active,
.todo-list-leave-active {
  transition: all 0.3s ease;
}

.todo-list-enter-from,
.todo-list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

/* 自定义组件样式 */
.tech-button {
  background: linear-gradient(90deg, var(--tech-primary), var(--tech-secondary)) !important;
  border: none !important;
  position: relative;
  overflow: hidden;
  z-index: 1;
  transition: all 0.3s ease, transform 0.2s ease;
}

.tech-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.7s;
  z-index: -1;
}

.tech-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 7px 14px rgba(0, 0, 0, 0.2), 0 0 10px var(--tech-glow);
}

.tech-button:active {
  transform: translateY(0);
}

.tech-button:hover::before {
  left: 100%;
}

.tech-button-secondary {
  background: rgba(var(--el-color-primary-rgb), 0.1) !important;
  color: var(--tech-primary) !important;
  border: 1px solid var(--tech-primary) !important;
}

.tech-button-text {
  color: var(--tech-primary) !important;
  position: relative;
  transition: all 0.3s ease;
}

.tech-button-text:hover {
  color: var(--tech-secondary) !important;
  transform: translateY(-2px);
}

.tech-button-text::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  width: 0;
  height: 1px;
  background: var(--tech-primary);
  transition: all 0.3s ease;
}

.tech-button-text:hover::after {
  width: 100%;
  left: 0;
}

.tech-input :deep(.el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.07) !important;
  box-shadow: 0 0 0 1px var(--glass-border) inset !important;
  backdrop-filter: blur(5px);
  transition: all 0.3s ease;
}

.tech-input :deep(.el-input__wrapper):hover {
  box-shadow: 0 0 0 1px var(--tech-primary) inset !important;
  transform: translateY(-2px);
}

.tech-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px var(--tech-primary) inset !important;
  transform: translateY(-2px);
}

.tech-checkbox :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: var(--tech-primary) !important;
  border-color: var(--tech-primary) !important;
}

.tech-radio :deep(.el-radio__input.is-checked .el-radio__inner) {
  background-color: var(--tech-primary) !important;
  border-color: var(--tech-primary) !important;
}

.tech-switch :deep(.el-switch.is-checked .el-switch__core) {
  background-color: var(--tech-primary) !important;
  border-color: var(--tech-primary) !important;
}

.tech-slider :deep(.el-slider__runway .el-slider__bar) {
  background-color: var(--tech-primary) !important;
}

.tech-slider :deep(.el-slider__button) {
  border-color: var(--tech-primary) !important;
}

.tech-color-picker :deep(.el-color-picker__trigger) {
  border-color: var(--glass-border) !important;
}

.tech-tabs :deep(.el-tabs__active-bar) {
  background-color: var(--tech-primary) !important;
  transition: all 0.5s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.tech-tabs :deep(.el-tabs__item) {
  transition: all 0.3s ease;
}

.tech-tabs :deep(.el-tabs__item:hover) {
  color: var(--tech-primary) !important;
  transform: translateY(-2px);
}

.tech-tabs :deep(.el-tabs__item.is-active) {
  color: var(--tech-primary) !important;
  font-weight: bold;
  transform: translateY(-2px);
}

.tech-timeline :deep(.el-timeline-item__node) {
  background-color: var(--tech-primary) !important;
  box-shadow: 0 0 10px var(--tech-glow) !important;
  transition: all 0.3s ease;
}

.tech-timeline :deep(.el-timeline-item):hover .el-timeline-item__node {
  transform: scale(1.3);
  box-shadow: 0 0 20px var(--tech-glow) !important;
}

.tech-timeline :deep(.el-timeline-item__content) {
  transition: all 0.3s ease;
}

.tech-timeline :deep(.el-timeline-item):hover .el-timeline-item__content {
  transform: translateX(10px);
}

.tech-icon-button {
  border-radius: 50% !important;
  width: 32px !important;
  height: 32px !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  padding: 0 !important;
  transition: all 0.3s ease !important;
}

.tech-icon-button:hover {
  transform: rotate(15deg) scale(1.2);
  background-color: rgba(var(--el-color-primary-rgb), 0.1) !important;
}

.tech-dialog :deep(.el-dialog) {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid var(--glass-border) !important;
  box-shadow: 0 25px 50px -12px var(--glass-shadow) !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  transform: scale(0.9);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tech-dialog :deep(.el-overlay-dialog) {
  overflow: hidden;
}

.tech-dialog:deep(.el-overlay-dialog:not(.is-initial)) .el-dialog {
  transform: scale(1);
  opacity: 1;
}

.tech-dialog :deep(.el-dialog__header) {
  margin: 0 !important;
  padding: 20px 20px 10px !important;
  border-bottom: 1px solid var(--glass-border) !important;
}

.tech-dialog :deep(.el-dialog__title) {
  font-weight: 500 !important;
  background: linear-gradient(90deg, var(--tech-primary), var(--tech-secondary)) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}

.load-more {
  text-align: center;
  margin-top: 15px;
}

/* 响应式调整 */
@media (max-width: 767px) {
  .user-profile {
    padding: 10px;
  }
  
  .profile-card {
    margin-bottom: 15px;
  }
  
  .user-info-card {
    margin-bottom: 20px;
  }
}

/* 元素过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.interactive-card {
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.interactive-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  transition: 0.5s;
  z-index: 1;
}

.interactive-card:hover::before {
  left: 100%;
}

.interactive-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
}

.pulse-effect {
  animation: pulse 2s infinite;
  position: relative;
}

.pulse-effect:hover {
  animation: pulseHover 1s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 var(--tech-glow);
  }
  70% {
    box-shadow: 0 0 0 15px rgba(52, 152, 219, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(52, 152, 219, 0);
  }
}

@keyframes pulseHover {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--el-color-primary-rgb), 0.7);
  }
  70% {
    box-shadow: 0 0 0 20px rgba(var(--el-color-primary-rgb), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--el-color-primary-rgb), 0);
  }
}

/* 3D悬浮效果 */
.hover-3d {
  transition: transform 0.5s ease;
  transform-style: preserve-3d;
  perspective: 1000px;
}

.hover-3d:hover {
  transform: rotateX(5deg) rotateY(5deg);
}

.hover-scale {
  transition: transform 0.3s ease;
}

.hover-scale:hover {
  transform: scale(1.05);
}

.tech-link {
  color: var(--tech-primary);
  position: relative;
  text-decoration: none;
  padding-bottom: 2px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.tech-link::after {
  content: '';
  position: absolute;
  width: 0;
  height: 2px;
  bottom: 0;
  left: 0;
  background: linear-gradient(90deg, var(--tech-primary), var(--tech-secondary));
  transition: width 0.3s ease;
}

.tech-link:hover {
  color: var(--tech-secondary);
  transform: translateY(-2px);
}

.tech-link:hover::after {
  width: 100%;
  height: 3px;
}

/* 背景纹理效果 */
.user-profile {
  position: relative;
}

.user-profile::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(circle at 25px 25px, var(--glass-bg) 2%, transparent 0%),
                    radial-gradient(circle at 75px 75px, var(--glass-bg) 2%, transparent 0%);
  background-size: 100px 100px;
  opacity: 0.3;
  pointer-events: none;
  z-index: -1;
}

/* 自定义励志提示样式 */
.custom-motivation-alert {
  background-color: transparent !important;
  padding: 16px 0 !important;
  border: none !important;
  box-shadow: none !important;
}

.custom-motivation-alert:deep(.el-alert__content) {
  padding: 0 !important;
}

.custom-motivation-alert:deep(.el-alert__title) {
  font-size: 18px;
  font-weight: 700;
  color: #000000 !important;
  margin-bottom: 10px;
  -webkit-text-fill-color: initial;
  background: none;
}

.custom-motivation-alert:deep(.el-alert__description) {
  font-size: 15px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  font-style: italic;
  margin-top: 5px;
}

/* 编辑按钮样式 */
.edit-button {
  background: linear-gradient(90deg, var(--tech-primary), var(--tech-secondary)) !important;
  border: none !important;
  padding: 8px 16px !important;
  border-radius: 20px !important;
  color: white !important;
  box-shadow: 0 4px 10px rgba(0, 195, 255, 0.3) !important;
  transition: all 0.3s ease !important;
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  cursor: pointer !important;
  position: relative !important;
  z-index: 10 !important;
}

.edit-button:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 6px 15px rgba(0, 195, 255, 0.5) !important;
}

.edit-button:active {
  transform: translateY(0) !important;
  box-shadow: 0 2px 5px rgba(0, 195, 255, 0.3) !important;
}

.edit-icon {
  font-size: 16px;
  animation: pulse-light 2s infinite;
}

@keyframes pulse-light {
  0% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.7;
  }
}

/* 保存和取消按钮样式 */
.save-button {
  background: linear-gradient(90deg, #00b09b, #96c93d) !important;
  border: none !important;
  padding: 10px 20px !important;
  border-radius: 20px !important;
  color: white !important;
  box-shadow: 0 4px 10px rgba(0, 176, 155, 0.3) !important;
  transition: all 0.3s ease !important;
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  margin-right: 15px !important;
}

.save-button:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 6px 15px rgba(0, 176, 155, 0.5) !important;
}

.save-button:active {
  transform: translateY(0) !important;
  box-shadow: 0 2px 5px rgba(0, 176, 155, 0.3) !important;
}

.cancel-button {
  background: linear-gradient(90deg, #e0e0e0, #b0b0b0) !important;
  border: none !important;
  padding: 10px 20px !important;
  border-radius: 20px !important;
  color: #505050 !important;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease !important;
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
}

.cancel-button:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15) !important;
}

.cancel-button:active {
  transform: translateY(0) !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1) !important;
}

/* 编辑状态样式 */
.editing-card {
  border: 2px dashed var(--tech-primary) !important;
  background: linear-gradient(135deg, rgba(0, 195, 255, 0.05), rgba(30, 136, 229, 0.05)) !important;
}

.editing-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: rgba(0, 195, 255, 0.1);
  border-radius: 4px;
  color: var(--tech-primary);
  font-size: 14px;
  animation: pulse-edit 2s infinite;
}

@keyframes pulse-edit {
  0% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.7;
  }
}

/* 编辑模式下的输入框样式增强 */
.editing-card :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--tech-primary) inset !important;
  background-color: rgba(255, 255, 255, 0.9) !important;
}

.editing-card :deep(.el-input__wrapper:hover),
.editing-card :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px var(--tech-primary) inset !important;
  transform: translateY(-2px) !important;
}

.editing-card :deep(.el-textarea__inner) {
  border-color: var(--tech-primary) !important;
  background-color: rgba(255, 255, 255, 0.9) !important;
}

.editing-card :deep(.el-form-item__label) {
  color: var(--tech-primary) !important;
  font-weight: 500 !important;
}

/* 备用编辑按钮 */
.backup-edit-button-container {
  text-align: center;
  margin-bottom: 20px;
}

.backup-edit-button {
  width: 100%;
  max-width: 300px;
  font-weight: bold !important;
  background-color: var(--tech-primary) !important;
  border: none !important;
  height: 45px !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  z-index: 10 !important;
}

.backup-edit-button:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 15px rgba(0, 195, 255, 0.3) !important;
}

.sort-direction-btn {
  margin-left: 10px;
}

.todo-search {
  margin-bottom: 10px;
}

.filter-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.todo-import-export {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}
</style>