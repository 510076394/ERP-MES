import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import axios from 'axios'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faGoogle, faFacebook } from '@fortawesome/free-brands-svg-icons'

import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.use(Antd)

// 配置 axios 默认值
axios.defaults.baseURL = (import.meta.env.VITE_API_URL || '') + '/api'

// 初始化认证状态
const authStore = useAuthStore(pinia)
authStore.setAuthHeader()

library.add(faGoogle, faFacebook)

app.component('font-awesome-icon', FontAwesomeIcon)

app.mount('#app')