<template>
  <div class="assets-container">
    <div class="page-header">
      <h2>固定资产管理</h2>
      <el-button type="primary" @click="showAddDialog">新增资产</el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="资产编号">
          <el-input v-model="searchForm.assetCode" placeholder="输入资产编号" clearable></el-input>
        </el-form-item>
        <el-form-item label="资产名称">
          <el-input v-model="searchForm.assetName" placeholder="输入资产名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="类别">
          <el-select v-model="searchForm.categoryId" placeholder="选择类别" clearable>
            <el-option
              v-for="item in categoryOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="选择状态" clearable>
            <el-option label="在用" value="in_use"></el-option>
            <el-option label="闲置" value="idle"></el-option>
            <el-option label="维修" value="under_repair"></el-option>
            <el-option label="报废" value="disposed"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchAssets">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ assetStats.total }}</div>
        <div class="stat-label">资产总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatCurrency(assetStats.totalValue) }}</div>
        <div class="stat-label">资产总值</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ assetStats.inUseCount }}</div>
        <div class="stat-label">在用资产</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ assetStats.idleCount }}</div>
        <div class="stat-label">闲置资产</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ assetStats.underRepairCount }}</div>
        <div class="stat-label">维修中</div>
      </el-card>
    </div>
    
    <!-- 表格区域 -->
    <el-card class="data-card">
      <el-table
        :data="assetList"
        style="width: 100%"
        border
        v-loading="loading"
      >
        <el-table-column prop="assetCode" label="资产编号" width="120"></el-table-column>
        <el-table-column prop="assetName" label="资产名称" width="150"></el-table-column>
        <el-table-column prop="categoryName" label="类别" width="120"></el-table-column>
        <el-table-column prop="purchaseDate" label="购入日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.purchaseDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="originalValue" label="原值" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.originalValue) }}
          </template>
        </el-table-column>
        <el-table-column prop="netValue" label="净值" width="120" align="right">
          <template #default="scope">
            {{ formatCurrency(scope.row.netValue) }}
          </template>
        </el-table-column>
        <el-table-column prop="location" label="存放地点" width="150"></el-table-column>
        <el-table-column prop="department" label="使用部门" width="120"></el-table-column>
        <el-table-column prop="responsible" label="责任人" width="120"></el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="315" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="success" size="small" @click="handleDepreciation(scope.row)">计提折旧</el-button>
            <el-button type="warning" size="small" @click="handleTransfer(scope.row)">资产调拨</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        >
        </el-pagination>
      </div>
    </el-card>
    
    <!-- 添加/编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="650px"
      :close-on-click-modal="false"
    >
      <el-form :model="assetForm" :rules="assetRules" ref="assetFormRef" label-width="100px">
        <el-form-item label="资产编号" prop="assetCode">
          <el-input v-model="assetForm.assetCode" placeholder="请输入资产编号"></el-input>
        </el-form-item>
        <el-form-item label="资产名称" prop="assetName">
          <el-input v-model="assetForm.assetName" placeholder="请输入资产名称"></el-input>
        </el-form-item>
        <el-form-item label="资产类别" prop="categoryId">
          <el-select v-model="assetForm.categoryId" placeholder="请选择资产类别" style="width: 100%">
            <el-option
              v-for="item in categoryOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="购入日期" prop="purchaseDate">
              <el-date-picker
                v-model="assetForm.purchaseDate"
                type="date"
                placeholder="选择购入日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              ></el-date-picker>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="原值" prop="originalValue">
              <el-input-number v-model="assetForm.originalValue" :precision="2" :min="0" style="width: 100%"></el-input-number>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="预计使用年限" prop="usefulLife">
              <el-input-number v-model="assetForm.usefulLife" :min="1" :max="50" style="width: 100%"></el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="残值率" prop="salvageRate">
              <el-input-number 
                v-model="assetForm.salvageRate" 
                :precision="2" 
                :min="0" 
                :max="30"
                :step="0.5"
                style="width: 100%"
              ></el-input-number>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="折旧方法" prop="depreciationMethod">
          <el-radio-group v-model="assetForm.depreciationMethod">
            <el-radio value="straight_line">直线法</el-radio>
            <el-radio value="double_declining">双倍余额递减法</el-radio>
            <el-radio value="sum_of_years">年数总和法</el-radio>
            <el-radio value="no_depreciation">不计提折旧</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="存放地点" prop="location">
              <el-input v-model="assetForm.location" placeholder="请输入存放地点"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="使用部门" prop="department">
              <el-select v-model="assetForm.department" placeholder="请选择部门" style="width: 100%">
                <el-option
                  v-for="item in departmentOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.name"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="责任人" prop="responsible">
              <el-input v-model="assetForm.responsible" placeholder="请输入责任人"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="assetForm.status" placeholder="请选择状态" style="width: 100%">
                <el-option label="在用" value="in_use"></el-option>
                <el-option label="闲置" value="idle"></el-option>
                <el-option label="维修" value="under_repair"></el-option>
                <el-option label="报废" value="disposed"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="备注" prop="notes">
          <el-input
            v-model="assetForm.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveAsset" :loading="saveLoading">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 资产调拨对话框 -->
    <el-dialog
      :title="transferDialogTitle"
      v-model="transferDialogVisible"
      width="650px"
      :close-on-click-modal="false"
    >
      <el-form :model="transferForm" :rules="transferRules" ref="transferFormRef" label-width="100px">
        <el-form-item label="资产编号" prop="assetCode">
          <el-input v-model="transferForm.assetCode" placeholder="请输入资产编号" readonly></el-input>
        </el-form-item>
        <el-form-item label="资产名称" prop="assetName">
          <el-input v-model="transferForm.assetName" placeholder="请输入资产名称" readonly></el-input>
        </el-form-item>
        <el-form-item label="原部门" prop="originalDepartment">
          <el-input v-model="transferForm.originalDepartment" placeholder="请输入原部门" readonly></el-input>
        </el-form-item>
        <el-form-item label="原责任人" prop="originalResponsible">
          <el-input v-model="transferForm.originalResponsible" placeholder="请输入原责任人" readonly></el-input>
        </el-form-item>
        <el-form-item label="原存放地点" prop="originalLocation">
          <el-input v-model="transferForm.originalLocation" placeholder="请输入原存放地点" readonly></el-input>
        </el-form-item>
        <el-form-item label="新部门" prop="newDepartment">
          <el-select v-model="transferForm.newDepartment" placeholder="请选择新部门" style="width: 100%">
            <el-option
              v-for="item in departmentOptions"
              :key="item.id"
              :label="item.name"
              :value="item.name"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="新责任人" prop="newResponsible">
          <el-input v-model="transferForm.newResponsible" placeholder="请输入新责任人"></el-input>
        </el-form-item>
        <el-form-item label="新存放地点" prop="newLocation">
          <el-input v-model="transferForm.newLocation" placeholder="请输入新存放地点"></el-input>
        </el-form-item>
        <el-form-item label="调拨日期" prop="transferDate">
          <el-date-picker
            v-model="transferForm.transferDate"
            type="date"
            placeholder="选择调拨日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="调拨原因" prop="transferReason">
          <el-input v-model="transferForm.transferReason" placeholder="请输入调拨原因"></el-input>
        </el-form-item>
        <el-form-item label="备注" prop="notes">
          <el-input
            v-model="transferForm.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="transferDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitTransfer" :loading="transferLoading">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { formatDate, formatCurrency as formatCurrencyUtil } from '@/utils/formatters';

// 数据加载状态
const loading = ref(false);
const saveLoading = ref(false);
const transferLoading = ref(false);

// 分页相关
const total = ref(0);
const pageSize = ref(20);
const currentPage = ref(1);

// 表单相关
const dialogVisible = ref(false);
const dialogTitle = ref('新增固定资产');
const assetFormRef = ref(null);

// 调拨对话框
const transferDialogVisible = ref(false);
const transferDialogTitle = ref('资产调拨');
const transferFormRef = ref(null);
const transferForm = reactive({
  assetId: null,
  assetCode: '',
  assetName: '',
  originalDepartment: '',
  originalResponsible: '',
  originalLocation: '',
  newDepartment: '',
  newResponsible: '',
  newLocation: '',
  transferDate: formatDate(new Date()),
  transferReason: '',
  notes: ''
});

// 调拨表单验证规则
const transferRules = {
  newDepartment: [{ required: true, message: '请选择调拨部门', trigger: 'change' }],
  newResponsible: [{ required: true, message: '请输入新责任人', trigger: 'blur' }],
  newLocation: [{ required: true, message: '请输入新存放地点', trigger: 'blur' }],
  transferDate: [{ required: true, message: '请选择调拨日期', trigger: 'change' }]
};

// 数据列表
const assetList = ref([]);
const categoryOptions = ref([]);
const departmentOptions = ref([]);

// 资产统计信息
const assetStats = reactive({
  total: 0,
  totalValue: 0,
  inUseCount: 0,
  idleCount: 0,
  underRepairCount: 0
});

// 搜索表单
const searchForm = reactive({
  assetCode: '',
  assetName: '',
  categoryId: '',
  status: ''
});

// 资产表单
const assetForm = reactive({
  id: null,
  assetCode: '',
  assetName: '',
  categoryId: null,
  purchaseDate: formatDate(new Date()),
  originalValue: 0,
  netValue: 0,
  usefulLife: 5,
  salvageRate: 5.0,
  depreciationMethod: 'straight_line',
  location: '',
  department: '',
  responsible: '',
  status: 'in_use',
  notes: ''
});

// 表单验证规则
const assetRules = {
  assetCode: [
    { required: true, message: '请输入资产编号', trigger: 'blur' }
  ],
  assetName: [
    { required: true, message: '请输入资产名称', trigger: 'blur' }
  ],
  categoryId: [
    { required: true, message: '请选择资产类别', trigger: 'change' }
  ],
  purchaseDate: [
    { required: true, message: '请选择购入日期', trigger: 'change' }
  ],
  originalValue: [
    { required: true, message: '请输入资产原值', trigger: 'blur' }
  ],
  usefulLife: [
    { required: true, message: '请输入预计使用年限', trigger: 'blur' }
  ],
  depreciationMethod: [
    { required: true, message: '请选择折旧方法', trigger: 'change' }
  ],
  location: [
    { required: true, message: '请输入存放地点', trigger: 'blur' }
  ],
  department: [
    { required: true, message: '请选择使用部门', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择资产状态', trigger: 'change' }
  ]
};

// 格式化货币
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '¥0.00';
  return formatCurrencyUtil(amount);
};

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    in_use: 'success',
    idle: 'info',
    under_repair: 'warning',
    disposed: 'danger'
  };
  return statusMap[status] || 'info';
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    in_use: '在用',
    idle: '闲置',
    under_repair: '维修',
    disposed: '报废'
  };
  return statusMap[status] || status;
};

// 加载资产列表
const loadAssets = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      assetCode: searchForm.assetCode,
      assetName: searchForm.assetName,
      categoryId: searchForm.categoryId,
      status: searchForm.status
    };
    
    console.log('发送请求参数:', params);
    
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/assets`, { params });
    console.log('获取到资产列表:', response.data);
    
    // 处理返回的日期格式
    if (response.data && response.data.data) {
      response.data.data.forEach(asset => {
        if (asset.purchaseDate) {
          asset.purchaseDate = formatDate(asset.purchaseDate);
        }
      });
    }
    
    assetList.value = response.data.data;
    total.value = response.data.total;
    
    // 加载资产统计信息
    loadAssetStats();
  } catch (error) {
    console.error('加载资产列表失败:', error);
    ElMessage.error('加载资产列表失败');
  } finally {
    loading.value = false;
  }
};

// 加载资产类别选项
const loadCategoryOptions = async () => {
  try {
    console.log('正在获取资产类别数据...');
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/assets/categories`);
    console.log('资产类别响应:', response.data);
    
    // 处理不同的响应格式
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      categoryOptions.value = response.data.data;
    } else if (Array.isArray(response.data)) {
      categoryOptions.value = response.data;
    } else {
      console.error('资产类别数据格式不正确:', response.data);
      categoryOptions.value = [];
    }
  } catch (error) {
    console.error('加载资产类别列表失败:', error);
    ElMessage.error('加载资产类别列表失败，将使用空列表');
    categoryOptions.value = [];
    
    // 提供备用选项以允许应用继续运行
    categoryOptions.value = [
      { id: 1, name: '电子设备', code: 'ELE' },
      { id: 2, name: '办公家具', code: 'FUR' },
      { id: 3, name: '机器设备', code: 'MAC' },
      { id: 4, name: '运输设备', code: 'VEH' },
      { id: 5, name: '房屋建筑', code: 'BLD' }
    ];
  }
};

// 加载部门选项
const loadDepartmentOptions = async () => {
  try {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/system/departments/list`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    departmentOptions.value = response.data;
  } catch (error) {
    console.error('加载部门列表失败:', error);
    ElMessage.error('加载部门列表失败');
  }
};

// 加载资产统计信息
const loadAssetStats = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/assets/stats`);
    Object.assign(assetStats, response.data);
  } catch (error) {
    console.error('加载资产统计信息失败:', error);
  }
};

// 搜索资产
const searchAssets = () => {
  currentPage.value = 1;
  loadAssets();
};

// 重置搜索条件
const resetSearch = () => {
  searchForm.assetCode = '';
  searchForm.assetName = '';
  searchForm.categoryId = '';
  searchForm.status = '';
  searchAssets();
};

// 新增资产
const showAddDialog = () => {
  dialogTitle.value = '新增固定资产';
  resetAssetForm();
  dialogVisible.value = true;
};

// 编辑资产
const handleEdit = async (row) => {
  dialogTitle.value = '编辑固定资产';
  
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/finance/assets/${row.id}`);
    const asset = response.data;
    
    console.log('获取到的资产详情:', asset);
    console.log('编辑前的表单数据:', { ...assetForm });
    
    resetAssetForm();
    
    // 处理日期格式
    if (asset.purchaseDate) {
      asset.purchaseDate = formatDate(asset.purchaseDate);
    }
    
    // 确保数值字段为数字类型
    if (asset.originalValue) asset.originalValue = parseFloat(asset.originalValue);
    if (asset.netValue) asset.netValue = parseFloat(asset.netValue);
    if (asset.usefulLife) asset.usefulLife = parseInt(asset.usefulLife);
    if (asset.salvageRate) asset.salvageRate = parseFloat(asset.salvageRate);
    
    // 填充表单数据
    Object.assign(assetForm, asset);
    
    console.log('编辑后的表单数据:', { ...assetForm });
    
    dialogVisible.value = true;
  } catch (error) {
    console.error('获取资产详情失败:', error);
    ElMessage.error('获取资产详情失败');
  }
};

// 处理计提折旧
const handleDepreciation = (row) => {
  ElMessageBox.confirm('确认要为该资产计提当月折旧吗？', '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/assets/${row.id}/depreciation`);
      ElMessage.success('折旧计提成功');
      loadAssets();
    } catch (error) {
      console.error('计提折旧失败:', error);
      ElMessage.error('计提折旧失败');
    }
  }).catch(() => {});
};

// 处理资产调拨
const handleTransfer = (row) => {
  // 填充调拨表单数据
  transferForm.assetId = row.id;
  transferForm.assetCode = row.assetCode;
  transferForm.assetName = row.assetName;
  transferForm.originalDepartment = row.department;
  transferForm.originalResponsible = row.responsible;
  transferForm.originalLocation = row.location;
  transferForm.newDepartment = '';
  transferForm.newResponsible = '';
  transferForm.newLocation = '';
  transferForm.transferDate = formatDate(new Date());
  transferForm.transferReason = '';
  transferForm.notes = '';
  
  // 显示调拨对话框
  transferDialogVisible.value = true;
};

// 提交资产调拨
const submitTransfer = async () => {
  if (!transferFormRef.value) return;
  
  await transferFormRef.value.validate(async (valid) => {
    if (valid) {
      transferLoading.value = true;
      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/assets/${transferForm.assetId}/transfer`, transferForm);
        ElMessage.success('资产调拨成功');
        transferDialogVisible.value = false;
        loadAssets(); // 重新加载资产列表
      } catch (error) {
        console.error('资产调拨失败:', error);
        ElMessage.error('资产调拨失败');
      } finally {
        transferLoading.value = false;
      }
    }
  });
};

// 保存资产
const saveAsset = async () => {
  if (!assetFormRef.value) return;
  
  await assetFormRef.value.validate(async (valid) => {
    if (valid) {
      saveLoading.value = true;
      try {
        // 如果是新增，设置初始净值等于原值
        if (!assetForm.id) {
          assetForm.netValue = assetForm.originalValue;
        }
        
        // 准备提交的数据
        const data = { ...assetForm };
        
        if (assetForm.id) {
          // 更新
          await axios.put(`${import.meta.env.VITE_API_URL}/api/finance/assets/${assetForm.id}`, data);
          ElMessage.success('更新成功');
        } else {
          // 新增
          await axios.post(`${import.meta.env.VITE_API_URL}/api/finance/assets`, data);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        loadAssets();
      } catch (error) {
        console.error('保存资产失败:', error);
        ElMessage.error('保存资产失败');
      } finally {
        saveLoading.value = false;
      }
    }
  });
};

// 重置资产表单
const resetAssetForm = () => {
  assetForm.id = null;
  assetForm.assetCode = '';
  assetForm.assetName = '';
  assetForm.categoryId = null;
  assetForm.purchaseDate = formatDate(new Date());
  assetForm.originalValue = 0;
  assetForm.netValue = 0;
  assetForm.usefulLife = 5;
  assetForm.salvageRate = 5.0;
  assetForm.depreciationMethod = 'straight_line';
  assetForm.location = '';
  assetForm.department = '';
  assetForm.responsible = '';
  assetForm.status = 'in_use';
  assetForm.notes = '';
  
  // 清除校验
  if (assetFormRef.value) {
    assetFormRef.value.resetFields();
  }
};

// 分页相关方法
const handleSizeChange = (size) => {
  pageSize.value = size;
  loadAssets();
};

const handleCurrentChange = (page) => {
  currentPage.value = page;
  loadAssets();
};

// 页面加载时执行
onMounted(() => {
  loadAssets();
  loadCategoryOptions();
  loadDepartmentOptions();
});
</script>

<style scoped>
.assets-container {
  padding: 10px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-card {
  margin-bottom: 20px;
}

.statistics-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 150px;
  margin-right: 15px;
  text-align: center;
  margin-bottom: 15px;
}

.stat-card:last-child {
  margin-right: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.data-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style> 