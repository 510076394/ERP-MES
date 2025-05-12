<template>
  <div class="materials-container">
    <div class="page-header">
      <h2>物料管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon> 新增物料
      </el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键字搜索">
          <el-input v-model="searchForm.keyword" placeholder="物料编码/名称/规格型号" clearable></el-input>
        </el-form-item>
        <el-form-item label="物料分类">
          <el-select v-model="searchForm.categoryId" placeholder="请选择物料分类" clearable style="width: 120px;">
            <el-option 
              v-for="item in categoryOptions" 
              :key="item.id" 
              :label="item.name" 
              :value="item.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 80px;">
            <el-option :value="1" label="启用"></el-option>
            <el-option :value="0" label="禁用"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><Refresh /></el-icon> 重置
          </el-button>
          <el-button type="success" @click="handleExport">
            <el-icon><Download /></el-icon> 导出
          </el-button>
          <el-button type="success" @click="handleImport">
            <el-icon><Upload /></el-icon> 导入
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.total || 0 }}</div>
        <div class="stat-label">物料总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.active || 0 }}</div>
        <div class="stat-label">启用物料</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.inactive || 0 }}</div>
        <div class="stat-label">禁用物料</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.lowStock || 0 }}</div>
        <div class="stat-label">低库存预警</div>
      </el-card>
    </div>

    <!-- 表格区域 -->
    <el-card class="data-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        style="width: 100%"
        :max-height="tableHeight"
      >
        <el-table-column prop="code" label="物料编码" width="120"></el-table-column>
        <el-table-column prop="name" label="物料名称" width="200"></el-table-column>
        <el-table-column prop="category_name" label="物料分类" width="120"></el-table-column>
        <el-table-column prop="specs" label="规格型号" width="240"></el-table-column>
        <el-table-column prop="unit_name" label="单位" width="60"></el-table-column>
        <el-table-column prop="location_name" label="默认库位" width="120"></el-table-column>
        <el-table-column prop="price" label="参考价格" width="100"></el-table-column>
        <el-table-column prop="min_stock" label="最小库存" width="100"></el-table-column>
        <el-table-column prop="max_stock" label="最大库存" width="100"></el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注"></el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="handleEdit(scope.row)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :small="false"
          :disabled="false"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="600px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="物料编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入物料编码"></el-input>
        </el-form-item>
        <el-form-item label="物料名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入物料名称"></el-input>
        </el-form-item>
        <el-form-item label="物料分类" prop="category_id">
          <el-select v-model="form.category_id" placeholder="请选择物料分类" style="width: 100%">
            <el-option 
              v-for="item in categoryOptions" 
              :key="item.id" 
              :label="item.name" 
              :value="item.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="单位" prop="unit_id">
          <el-select v-model="form.unit_id" placeholder="请选择单位" style="width: 100%">
            <el-option 
              v-for="item in unitOptions" 
              :key="item.id" 
              :label="item.name" 
              :value="item.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="默认库位" prop="location_id">
          <el-select 
            v-model="form.location_id" 
            placeholder="请选择库位"
            style="width: 100%"
            @change="handleLocationChange">
            <el-option 
              v-for="item in locationOptions" 
              :key="item.id" 
              :label="item.name" 
              :value="item.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="规格型号">
          <el-input v-model="form.specs" placeholder="请输入规格型号"></el-input>
        </el-form-item>
        <el-form-item label="参考价格">
          <el-input-number v-model="form.price" :precision="2" :step="0.01" :min="0"></el-input-number>
        </el-form-item>
        <el-form-item label="最小库存">
          <el-input-number v-model="form.min_stock" :min="0" :precision="0"></el-input-number>
        </el-form-item>
        <el-form-item label="最大库存">
          <el-input-number v-model="form.max_stock" :min="0" :precision="0"></el-input-number>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入物料"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="导入方式">
          <el-radio-group v-model="importMethod">
            <el-radio label="template">使用模板</el-radio>
            <el-radio label="manual">手动输入</el-radio>
          </el-radio-group>
        </el-form-item>

        <div v-if="importMethod === 'template'">
          <el-form-item label="模板">
            <div>
              <el-button type="primary" @click="downloadTemplate">
                <el-icon><Download /></el-icon> 下载模板
              </el-button>
            </div>
            <div class="import-tips">
              <p>请按照模板格式填写数据，必须包含物料编码、物料名称</p>
              <p>物料分类和单位需要提前在系统中创建</p>
            </div>
          </el-form-item>

          <el-form-item label="文件">
            <el-upload
              ref="uploadRef"
              action=""
              :auto-upload="false"
              :on-change="handleFileChange"
              :limit="1"
              accept=".xlsx,.xls"
            >
              <el-button type="primary">
                <el-icon><Upload /></el-icon> 选择文件
              </el-button>
            </el-upload>
          </el-form-item>
        </div>

        <div v-else>
          <el-form-item label="数据">
            <el-input
              v-model="importJsonData"
              type="textarea"
              rows="10"
              placeholder="请输入JSON格式的物料数据"
            ></el-input>
            <div class="import-tips">
              <p>格式示例：[{"code":"WL001","name":"物料1","category_name":"原材料","unit_name":"个","specs":"规格1"}]</p>
            </div>
          </el-form-item>
        </div>

        <el-form-item>
          <el-button type="primary" @click="submitImport" :loading="importing">
            <el-icon><Upload /></el-icon> 导入
          </el-button>
          <el-button @click="importDialogVisible = false">取消</el-button>
        </el-form-item>
      </el-form>

      <!-- 导入结果 -->
      <div v-if="importResult" class="import-result">
        <h3>导入结果</h3>
        <p>总数: {{ importResult.total }}，成功: {{ importResult.success }}，失败: {{ importResult.failed }}</p>
        
        <template v-if="importResult.failed > 0">
          <h4>失败记录:</h4>
          <el-table :data="importResult.data.errors" border size="small" max-height="200">
            <el-table-column label="物料编码" width="120">
              <template #default="scope">
                {{ scope.row.data.code }}
              </template>
            </el-table-column>
            <el-table-column label="物料名称" width="150">
              <template #default="scope">
                {{ scope.row.data.name }}
              </template>
            </el-table-column>
            <el-table-column label="失败原因">
              <template #default="scope">
                {{ scope.row.error }}
              </template>
            </el-table-column>
          </el-table>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, onBeforeUnmount, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { baseDataApi } from '@/services/api';
import { Search, Refresh, Plus, Download, Edit, Delete, Upload } from '@element-plus/icons-vue';
import * as XLSX from 'xlsx';

// 数据加载状态
const loading = ref(false);

// 表格数据
const tableData = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const tableHeight = ref('calc(100vh - 350px)');

// 统计数据
const stats = reactive({
  total: 0,
  active: 0,
  inactive: 0,
  lowStock: 0
});

// 搜索表单
const searchForm = reactive({
  keyword: '',
  categoryId: '',
  status: ''
});

// 新增/编辑表单
const formRef = ref(null);
const form = reactive({
  id: '',
  code: '',
  name: '',
  category_id: '',
  unit_id: '',
  location_id: '', // 新增库位ID字段
  location_name: '', // 新增库位名称字段
  specs: '',
  price: 0,
  min_stock: 0,
  max_stock: 0,
  status: 1,
  remark: ''
});

// 表单校验规则
const rules = {
  code: [{ required: true, message: '请输入物料编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择物料分类', trigger: 'change' }],
  unit_id: [{ required: true, message: '请选择单位', trigger: 'change' }]
};

// 对话框控制
const dialogVisible = ref(false);
const dialogTitle = ref('新增物料');
const isEdit = ref(false);

// 下拉选项
const categoryOptions = ref([]);
const unitOptions = ref([]);
const locationOptions = ref([]);

// 轮询定时器
let pollingTimer = null;

// 导入对话框控制
const importDialogVisible = ref(false);
const importMethod = ref('template');
const uploadRef = ref(null);
const importJsonData = ref('');
const importing = ref(false);
const importResult = ref(null);

// 文件对象
let importFile = null;

// 初始化
onMounted(() => {
  fetchData();
  fetchCategories();
  fetchUnits();
  fetchLocations();
  
  // 设置轮询，每30秒检查一次库位更新
  pollingTimer = setInterval(fetchLocations, 30000);
});

// 组件销毁前清理
onBeforeUnmount(() => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
  }
});

// 获取物料列表
const fetchData = async () => {
  loading.value = true;
  try {
    // 构建查询参数，将前端参数名映射到后端参数名
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      category_id: searchForm.categoryId,  // 分类ID保持不变
      status: searchForm.status            // 状态保持不变
    };
    
    // 如果有关键字搜索，同时用于物料编码、名称和规格型号搜索
    if (searchForm.keyword) {
      params.code = searchForm.keyword;
      params.name = searchForm.keyword;
      params.specs = searchForm.keyword;
    }
    
    // 移除空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });
    
    const response = await baseDataApi.getMaterials(params);
    // 处理后端返回的数据格式
    if (response.data.list) {
      // 处理 { list: [...], total: number } 格式
      tableData.value = response.data.list;
      total.value = response.data.total;
    } else if (response.data.data) {
      // 处理 { data: [...], pagination: { total: number } } 格式
      tableData.value = response.data.data;
      total.value = response.data.pagination.total;
    } else if (Array.isArray(response.data)) {
      // 处理直接返回数组的情况
      tableData.value = response.data;
      total.value = response.data.length;
    } else {
      tableData.value = [];
      total.value = 0;
    }
    
    // 更新统计数据
    calculateStats();
  } catch (error) {
    console.error('获取物料列表失败:', error);
    ElMessage.error('获取物料列表失败');
  } finally {
    loading.value = false;
  }
};

// 计算统计数据
const calculateStats = () => {
  const activeCount = tableData.value.filter(item => item.status === 1).length;
  const inactiveCount = tableData.value.filter(item => item.status === 0).length;
  const lowStockCount = tableData.value.filter(item => {
    return item.min_stock > 0 && (item.stock_quantity || 0) < item.min_stock;
  }).length;
  
  stats.total = tableData.value.length;
  stats.active = activeCount;
  stats.inactive = inactiveCount;
  stats.lowStock = lowStockCount;
};

// 获取分类列表
const fetchCategories = async () => {
  try {
    const response = await baseDataApi.getCategories();
    // 处理后端返回的数据格式
    if (response.data.list) {
      categoryOptions.value = response.data.list;
    } else if (response.data.data) {
      categoryOptions.value = response.data.data;
    } else if (Array.isArray(response.data)) {
      categoryOptions.value = response.data;
    } else {
      categoryOptions.value = [];
    }
  } catch (error) {
    console.error('获取分类列表失败:', error);
    ElMessage.error('获取分类列表失败');
  }
};

// 获取库位列表
const fetchLocations = async () => {
  try {
    const response = await baseDataApi.getLocations();
    // 处理后端返回的数据格式
    if (response.data.data) {
      locationOptions.value = response.data.data;
    } else if (Array.isArray(response.data)) {
      locationOptions.value = response.data;
    } else {
      locationOptions.value = [];
    }
    // 获取最新的库位数据后，重新加载物料列表以获取最新的库位名称
    await fetchData();
  } catch (error) {
    console.error('获取库位列表失败:', error);
    ElMessage.error('获取库位列表失败');
  }
};

// 处理库位选择变化
const handleLocationChange = (locationId) => {
  const selectedLocation = locationOptions.value.find(loc => loc.id === locationId);
  if (selectedLocation) {
    form.location_name = selectedLocation.name;
  }
};

// 获取单位列表
const fetchUnits = async () => {
  try {
    const response = await baseDataApi.getUnits();
    // 处理后端返回的数据格式
    if (response.data.list) {
      unitOptions.value = response.data.list;
    } else if (response.data.data) {
      unitOptions.value = response.data.data;
    } else if (Array.isArray(response.data)) {
      unitOptions.value = response.data;
    } else {
      unitOptions.value = [];
    }
  } catch (error) {
    console.error('获取单位列表失败:', error);
    ElMessage.error('获取单位列表失败');
  }
};

// 搜索
const handleSearch = () => {
  currentPage.value = 1;
  fetchData();
};

// 重置搜索
const resetSearch = () => {
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = '';
  });
  currentPage.value = 1;
  fetchData();
};

// 导出数据
const handleExport = async () => {
  try {
    // 构建与搜索相同的过滤参数
    const exportParams = {
      category_id: searchForm.categoryId,
      status: searchForm.status
    };
    
    // 如果有关键字搜索，同时用于物料编码、名称和规格型号搜索
    if (searchForm.keyword) {
      exportParams.code = searchForm.keyword;
      exportParams.name = searchForm.keyword;
      exportParams.specs = searchForm.keyword;
    }
    
    const response = await baseDataApi.exportMaterials(exportParams);
    // 处理文件下载
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '物料列表.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  }
};

// 分页相关
const handleSizeChange = (val) => {
  pageSize.value = val;
  fetchData();
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  fetchData();
};

// 新增物料
const handleAdd = () => {
  dialogTitle.value = '新增物料';
  isEdit.value = false;
  resetForm();
  dialogVisible.value = true;
};

// 编辑物料
const handleEdit = (row) => {
  dialogTitle.value = '编辑物料';
  isEdit.value = true;
  resetForm();
  
  nextTick(() => {
    Object.keys(form).forEach(key => {
      if (key in row) {
        form[key] = row[key];
      }
    });
    form.id = row.id;
    // 确保location_id和location_name正确设置
    if (row.location_id) {
      form.location_id = row.location_id;
      form.location_name = row.location_name;
    }
  });
  
  dialogVisible.value = true;
};

// 删除物料
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该物料吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await baseDataApi.deleteMaterial(row.id);
      ElMessage.success('删除成功');
      fetchData();
    } catch (error) {
      console.error('删除物料失败:', error);
      ElMessage.error('删除物料失败');
    }
  }).catch(() => {});
};

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  
  Object.keys(form).forEach(key => {
    if (key === 'status') {
      form[key] = 1;
    } else if (key === 'price' || key === 'min_stock' || key === 'max_stock') {
      form[key] = 0;
    } else {
      form[key] = '';
    }
  });
};

// 提交表单
const submitForm = () => {
  formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 创建提交数据对象，移除不需要的字段
        const submitData = { ...form };
        delete submitData.created_at;
        delete submitData.updated_at;
        delete submitData.category_name;  // 移除分类名称，只保留ID
        delete submitData.unit_name;      // 移除单位名称，只保留ID
        // 保留location_name字段，让触发器能正确工作

        if (isEdit.value) {
          // 编辑
          await baseDataApi.updateMaterial(submitData.id, submitData);
          ElMessage.success('更新物料成功');
        } else {
          // 新增
          await baseDataApi.createMaterial(submitData);
          ElMessage.success('创建物料成功');
        }
        dialogVisible.value = false;
        fetchData();
      } catch (error) {
        console.error('保存物料失败:', error);
        ElMessage.error(error.response?.data?.message || '保存物料失败');
      }
    }
  });
};

// 导入相关逻辑
const handleImport = () => {
  importDialogVisible.value = true;
  importMethod.value = 'template';
  importJsonData.value = '';
  importResult.value = null;
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
};

const downloadTemplate = () => {
  // 准备模板数据
  const templateData = [
    {
      '物料编码': 'WL001',
      '物料名称': '示例物料',
      '物料分类': '',
      '规格型号': '',
      '单位': '',
      '参考价格': 0,
      '最小库存': 0,
      '最大库存': 0,
      '默认库位': '',
      '状态': '1',
      '备注': ''
    }
  ];

  // 创建工作簿
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // 添加工作表
  XLSX.utils.book_append_sheet(workbook, worksheet, '物料导入模板');

  // 下载文件
  XLSX.writeFile(workbook, '物料导入模板.xlsx');
};

const handleFileChange = (file) => {
  // 保存上传的文件
  importFile = file.raw;
};

const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 转换字段名为后端需要的格式
        const mappedData = jsonData.map(item => ({
          code: item['物料编码'],
          name: item['物料名称'],
          category_name: item['物料分类'] || null,
          specs: item['规格型号'] || '',
          unit_name: item['单位'] || null,
          price: item['参考价格'] ? Number(item['参考价格']) : 0,
          min_stock: item['最小库存'] ? Number(item['最小库存']) : 0,
          max_stock: item['最大库存'] ? Number(item['最大库存']) : 0,
          location_name: item['默认库位'] || '',
          status: item['状态'] === '0' ? 0 : 1,
          remark: item['备注'] || ''
        }));

        resolve(mappedData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

const submitImport = async () => {
  try {
    importing.value = true;
    importResult.value = null;
    
    let materialsData = [];
    
    if (importMethod.value === 'template') {
      // 检查是否选择了文件
      if (!importFile) {
        ElMessage.warning('请先选择Excel文件');
        importing.value = false;
        return;
      }
      
      // 解析Excel文件
      materialsData = await parseExcelFile(importFile);
    } else {
      // 解析手动输入的JSON数据
      try {
        materialsData = JSON.parse(importJsonData.value);
        if (!Array.isArray(materialsData)) {
          ElMessage.warning('输入的JSON格式不正确，应该是数组格式');
          importing.value = false;
          return;
        }
      } catch (error) {
        ElMessage.error('JSON格式错误: ' + error.message);
        importing.value = false;
        return;
      }
    }
    
    // 检查数据有效性
    if (materialsData.length === 0) {
      ElMessage.warning('没有可导入的数据');
      importing.value = false;
      return;
    }
    
    // 发送导入请求
    const response = await baseDataApi.importMaterials(materialsData);
    
    // 展示导入结果
    importResult.value = response.data;
    
    // 刷新数据
    fetchData();
    
    // 显示导入结果提示
    if (response.data.success > 0) {
      ElMessage.success(`成功导入 ${response.data.success} 条物料数据`);
    }
    if (response.data.failed > 0) {
      ElMessage.warning(`${response.data.failed} 条物料数据导入失败，请查看详情`);
    }
  } catch (error) {
    console.error('导入物料失败:', error);
    ElMessage.error('导入物料失败: ' + (error.message || '未知错误'));
  } finally {
    importing.value = false;
  }
};
</script>

<style scoped>
.materials-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #303133;
}

.search-card {
  margin-bottom: 16px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
}

.statistics-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 15px;
}

.stat-card {
  flex: 1;
  min-width: 150px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.data-card {
  margin-bottom: 20px;
  border-radius: 4px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.import-tips {
  margin-top: 10px;
  margin-bottom: 10px;
  font-size: 12px;
  color: #909399;
}

.import-result {
  margin-top: 20px;
  padding: 10px;
  background-color: #fff;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.import-result h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.import-result p {
  margin: 0;
  font-size: 14px;
  color: #606266;
}
</style>