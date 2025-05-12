// 这是一个辅助脚本，用来修复IncomingInspection.vue中的导入问题
// 原始导入:
// import { api, purchaseApi } from '@/services/api'
// import dayjs from 'dayjs'
// import qualityApi from '@/api/quality'
// import { getInspectionTypeText, getStatusType, getStatusText } from './inspection-text-helper'
// 
// 正确导入应该是:
// import { api, qualityApi, purchaseApi } from '@/services/api'  
// import dayjs from 'dayjs'
// import { getInspectionTypeText, getStatusType, getStatusText } from './inspection-text-helper' 