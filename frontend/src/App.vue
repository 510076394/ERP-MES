<template>
  <el-config-provider>
    <router-view />
  </el-config-provider>
</template>

<script setup>
// App.vue - 根组件
import { useSnackbar } from '@/composables/useSnackbar';

// 初始化snackbar服务，以便在整个应用中可用
useSnackbar();
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
}

#app {
  height: 100vh;
}
</style>