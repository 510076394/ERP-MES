<template>
  <el-breadcrumb class="breadcrumb">
    <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path" :to="item.path">
      {{ item.title }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const breadcrumbs = computed(() => {
  const pathArray = route.path.split('/').filter(Boolean)
  const breadcrumbs = []
  let path = ''

  // 添加首页
  breadcrumbs.push({
    path: '/',
    title: '首页'
  })

  // 构建面包屑
  pathArray.forEach(segment => {
    path += `/${segment}`
    const title = getTitleByPath(segment)
    if (title) {
      breadcrumbs.push({
        path,
        title
      })
    }
  })

  return breadcrumbs
})

// 根据路径获取标题
const getTitleByPath = (path) => {
  const titleMap = {
    // 首页
    'dashboard': '仪表盘',
    
    // 生产管理
    'production': '生产管理',
    'plan': '生产计划',
    'task': '生产任务',
    'process': '生产过程',
    'report': '生产报工',
    
    // 基础数据
    'baseData': '基础数据',
    'materials': '物料管理',
    'boms': 'BOM管理',
    'customers': '客户管理',
    'suppliers': '供应商管理',
    'categories': '分类管理',
    'units': '单位管理',
    'locations': '库位管理',
    
    // 库存管理
    'inventory': '库存管理',
    'stock': '库存查询',
    'inbound': '入库管理',
    'outbound': '出库管理',
    'transfer': '库存调拨',
    'check': '库存盘点',
    
    // 采购管理
    'purchase': '采购管理',
    'requisitions': '采购申请',
    'orders': '采购订单',
    'receipts': '采购入库',
    'returns': '采购退货',
    
    // 销售管理
    'sales': '销售管理',
    'quotations': '报价单统计',
    'exchanges': '销售换货',
    
    // 财务管理
    'finance': '财务管理',
    'gl': '总账管理',
    'accounts': '会计科目',
    'entries': '会计凭证',
    'periods': '会计期间',
    'ar': '应收账款',
    'invoices': '应收发票',
    'receipts': '收款管理',
    'aging': '账龄分析',
    'ap': '应付账款',
    'payments': '付款管理',
    'assets': '固定资产',
    'list': '资产列表',
    'depreciation': '折旧管理',
    'cash': '现金管理',
    'transactions': '交易记录',
    'reconciliation': '银行对账',
    'reports': '财务报表',
    'balance-sheet': '资产负债表',
    'income-statement': '利润表',
    'cash-flow': '现金流量表',
    
    // 质量管理
    'quality': '质量管理',
    'incoming': '来料检验',
    'templates': '检验模板',
    'traceability': '追溯管理',
    'final': '成品检验',
    
    // 系统管理
    'system': '系统管理',
    'users': '用户管理',
    'departments': '部门管理',
    'permissions': '权限设置'
  }
  return titleMap[path] || path
}
</script>

<style scoped>
.breadcrumb {
  display: inline-block;
  line-height: 1;
}
</style>