<template>
  <div class="boms-container">
    <div class="page-header">
      <h2>BOM管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon> 新增BOM
      </el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="产品">
          <el-select v-model="searchForm.productId" placeholder="请选择产品" clearable filterable>
            <el-option 
              v-for="item in materialOptions" 
              :key="item.id" 
              :label="`${item.code} - ${item.name}`" 
              :value="item.id">
              <span style="float: left">{{ item.code }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">{{ item.name }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="版本">
          <el-input v-model="searchForm.version" placeholder="请输入版本" clearable></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
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
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.total || 0 }}</div>
        <div class="stat-label">BOM总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.active || 0 }}</div>
        <div class="stat-label">启用状态</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.inactive || 0 }}</div>
        <div class="stat-label">禁用状态</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ stats.detailsCount || 0 }}</div>
        <div class="stat-label">物料明细</div>
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
        <el-table-column label="产品编码" width="120">
          <template #default="scope">
            {{ scope.row.product_code || '未知' }}
          </template>
        </el-table-column>
        <el-table-column label="产品名称" width="150">
          <template #default="scope">
            {{ scope.row.product_name || '未知' }}
          </template>
        </el-table-column>
        <el-table-column label="规格型号" width="120">
          <template #default="scope">
            {{ scope.row.product_specs || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="version" label="BOM版本" width="120"></el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="scope">
            <el-tag :type="Number(scope.row.status) === 1 ? 'success' : 'danger'">
              {{ Number(scope.row.status) === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注"></el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180"></el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="handleView(scope.row)">
              <el-icon><View /></el-icon> 查看
            </el-button>
            <el-button size="small" type="primary" @click="handleEdit(scope.row)">
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
          background
          layout="total, sizes, prev, pager, next, jumper"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="900px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="产品" prop="product_id">
          <el-select v-model="form.product_id" placeholder="请选择产品" style="width: 100%" filterable @change="handleProductChange">
            <el-option 
              v-for="item in materialOptions" 
              :key="item.id" 
              :label="`${item.code} - ${item.name}`" 
              :value="item.id">
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span style="font-weight: bold">{{ item.code }}</span>
                <span style="color: #8492a6; margin-left: 10px">{{ item.name }}</span>
                <span style="color: #909399; font-size: 12px" v-if="item.specs">{{ item.specs }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="BOM版本" prop="version">
          <el-input v-model="form.version" placeholder="请输入BOM版本"></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注"></el-input>
        </el-form-item>
        
        <!-- BOM明细 -->
        <el-divider content-position="left">BOM明细</el-divider>
        
        <div class="bom-details">
          <el-button type="primary" @click="addDetail" style="margin-bottom: 15px">添加明细</el-button>
          
          <el-table :data="form.details" border>
            <el-table-column label="序号" type="index" width="60"></el-table-column>
            <el-table-column label="物料" width="250">
              <template #default="scope">
                <el-select 
                  v-model="scope.row.material_id" 
                  placeholder="请选择物料"
                  style="width: 100%"
                  filterable
                  @change="handleMaterialChange($event, scope.$index)"
                  :filter-method="filterMaterial"
                  remote
                  :remote-method="filterMaterial"
                >
                  <el-option 
                    v-for="item in materialOptions" 
                    :key="item.id" 
                    :label="`${item.code} - ${item.name}`" 
                    :value="item.id">
                    <div style="display: flex; justify-content: space-between; align-items: center">
                      <span style="font-weight: bold">{{ item.code }}</span>
                      <span style="color: #8492a6; margin-left: 10px">{{ item.name }}</span>
                    </div>
                  </el-option>
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="规格型号" width="120">
              <template #default="scope">
                <div>{{ scope.row.material_specs || '-' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="用量" width="150">
              <template #default="scope">
                <el-input-number 
                  v-model="scope.row.quantity" 
                  :min="0.01" 
                  :precision="2" 
                  :step="0.01" 
                  style="width: 100%">
                </el-input-number>
              </template>
            </el-table-column>
            <el-table-column label="单位" width="100">
              <template #default="scope">
                <el-select v-model="scope.row.unit_id" placeholder="请选择单位" style="width: 100%">
                  <el-option 
                    v-for="item in unitOptions" 
                    :key="item.id" 
                    :label="item.name" 
                    :value="item.id">
                  </el-option>
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="备注">
              <template #default="scope">
                <el-input v-model="scope.row.remark" placeholder="备注"></el-input>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="scope">
                <el-button 
                  type="text" 
                  class="delete-text-btn"
                  @click="removeDetail(scope.$index)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 查看BOM对话框 -->
    <el-dialog
      title="查看BOM详情"
      v-model="viewDialogVisible"
      width="900px"
    >
      <div v-if="currentBom">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="产品编码">{{ currentBom.product_code }}</el-descriptions-item>
          <el-descriptions-item label="产品名称">{{ currentBom.product_name }}</el-descriptions-item>
          <el-descriptions-item label="规格型号">{{ currentBom.product_specs || '-' }}</el-descriptions-item>
          <el-descriptions-item label="BOM版本">{{ currentBom.version }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="Number(currentBom.status) === 1 ? 'success' : 'danger'">
              {{ Number(currentBom.status) === 1 ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentBom.remark }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider content-position="left">BOM明细</el-divider>
        
        <el-table :data="currentBom.details" border>
          <el-table-column label="序号" type="index" width="50"></el-table-column>
          <el-table-column prop="material_code" label="物料编码" width="120"></el-table-column>
          <el-table-column prop="material_name" label="物料名称" width="200"></el-table-column>
          <el-table-column prop="material_specs" label="规格型号" width="220"></el-table-column>
          <el-table-column prop="quantity" label="用量" width="100"></el-table-column>
          <el-table-column prop="unit_name" label="单位" width="80"></el-table-column>
          <el-table-column prop="remark" label="备注"></el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { baseDataApi } from '@/services/api';
import { Plus, Edit, Delete, Search, Refresh, View, Download } from '@element-plus/icons-vue';

// 数据加载状态
const loading = ref(false);

// 表格高度
const tableHeight = ref('calc(100vh - 350px)');

// 表格数据
const tableData = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

// 统计数据
const stats = reactive({
  total: 0,
  active: 0,
  inactive: 0,
  detailsCount: 0
});

// 搜索表单
const searchForm = reactive({
  productId: '',
  version: '',
  status: ''
});

// 新增/编辑表单
const formRef = ref(null);
const form = reactive({
  id: '',
  product_id: '',
  version: '',
  status: 1,
  remark: '',
  details: []
});

// 表单校验规则
const rules = {
  product_id: [{ required: true, message: '请选择产品', trigger: 'change' }],
  version: [{ required: true, message: '请输入BOM版本', trigger: 'blur' }]
};

// 对话框控制
const dialogVisible = ref(false);
const dialogTitle = ref('新增BOM');
const isEdit = ref(false);

// 查看BOM对话框
const viewDialogVisible = ref(false);
const currentBom = ref(null);

// 下拉选项
const materialOptions = ref([]);
const unitOptions = ref([]);

// 初始化
onMounted(async () => {
  await fetchMaterials(); // 先获取物料数据
  await fetchUnits(); // 再获取单位数据
  fetchData(); // 最后获取BOM数据
});

// 获取BOM列表
const fetchData = async () => {
  loading.value = true;
  try {
    // 确保物料数据已加载
    if (materialOptions.value.length === 0) {
      await fetchMaterials();
    }
    
    // 转换搜索参数以匹配后端API期望的格式
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      productId: searchForm.productId, // 确保与后端过滤参数名称一致
      version: searchForm.version,
      status: searchForm.status !== '' ? Number(searchForm.status) : undefined
    };
    
    // 移除空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });
    
    console.log('发送到后端的参数:', params);
    const response = await baseDataApi.getBoms(params);
    console.log('后端返回的原始响应:', response);
    
    // 处理后端返回的数据格式
    let bomList = [];
    if (response.data && response.data.data) {
      bomList = response.data.data;
      total.value = response.data.pagination?.total || 0;
    } else if (response.data && response.data.list) {
      bomList = response.data.list;
      total.value = response.data.total || 0;
    } else if (Array.isArray(response.data)) {
      bomList = response.data;
      total.value = response.data.length;
    }

    console.log('处理后的BOM列表数据:', bomList);
    console.log('可用的物料选项:', materialOptions.value);
    
    // 使用物料选项来补充产品信息
    tableData.value = bomList.map(bom => {
      // 检查product_id字段是否存在，也可能是productId
      const productId = bom.product_id || bom.productId;
      const product = materialOptions.value.find(m => m.id === productId);
      
      const status = bom.status !== undefined && bom.status !== null ? Number(bom.status) : 1;
      console.log(`BOM项 ${bom.id}:`, { 
        原始product_id: productId, 
        匹配到的物料: product ? `${product.code} - ${product.name}` : '未找到匹配',
        物料规格: product?.specs || '无规格',
        原始状态: bom.status,
        处理后状态: status,
        状态类型: typeof status
      });
      
      return {
        ...bom,
        product_id: productId,
        product_code: product?.code || bom.product_code || '未知',
        product_name: product?.name || bom.product_name || '未知',
        product_specs: product?.specs || bom.product_specs || '',
        created_at: bom.created_at ? new Date(bom.created_at).toLocaleString() : '',
        status: status
      };
    });

    console.log('最终渲染的tableData:', tableData.value);

    if (bomList.length === 0) {
      tableData.value = [];
      total.value = 0;
      console.error('获取BOM数据格式异常:', response.data);
    }
    
    // 计算统计数据
    calculateStats();
  } catch (error) {
    console.error('获取BOM列表失败:', error);
    ElMessage.error('获取BOM列表失败');
  } finally {
    loading.value = false;
  }
};

// 获取物料列表
const fetchMaterials = async () => {
  try {
    const response = await baseDataApi.getMaterials({ pageSize: 1000 });
    // 处理后端返回的数据格式
    let materials = [];
    if (response.data && response.data.data) {
      materials = response.data.data;
    } else if (response.data && response.data.list) {
      materials = response.data.list;
    } else if (Array.isArray(response.data)) {
      materials = response.data;
    }
    
    // 过滤并格式化物料选项
    materialOptions.value = materials.map(item => ({
      id: item.id,
      code: item.code || '',
      name: item.name || '',
      unit_id: item.unit_id,
      specs: item.specs || ''
    })).filter(item => item.code && item.name); // 只保留有效的物料选项
  } catch (error) {
    console.error('获取物料列表失败:', error);
    ElMessage.error('获取物料列表失败');
  }
};

// 获取单位列表
const fetchUnits = async () => {
  try {
    const response = await baseDataApi.getUnits();
    // 处理后端返回的数据格式
    if (response.data && response.data.list) {
      unitOptions.value = response.data.list;
    } else if (response.data && response.data.data) {
      unitOptions.value = response.data.data;
    } else if (Array.isArray(response.data)) {
      unitOptions.value = response.data;
    } else {
      unitOptions.value = [];
      console.error('获取单位数据格式异常:', response.data);
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
  searchForm.productId = '';
  searchForm.version = '';
  searchForm.status = '';
  currentPage.value = 1;
  fetchData();
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

// 新增BOM
const handleAdd = () => {
  dialogTitle.value = '新增BOM';
  isEdit.value = false;
  resetForm();
  dialogVisible.value = true;
};

// 编辑BOM
const handleEdit = async (row) => {
  dialogTitle.value = '编辑BOM';
  isEdit.value = true;
  resetForm();
  
  try {
    // 确保物料数据已加载
    if (materialOptions.value.length === 0) {
      await fetchMaterials();
    }
    
    const response = await baseDataApi.getBom(row.id);
    console.log('获取到的BOM数据:', response.data);
    
    // 确保从响应中获取正确的数据结构
    const bomData = response.data.data;
    
    if (!bomData) {
      throw new Error('获取的BOM数据格式不正确');
    }

    nextTick(() => {
      // 设置主表信息
      form.id = bomData.id;
      form.product_id = bomData.product_id;
      form.version = bomData.version;
      form.status = Number(bomData.status);
      form.remark = bomData.remark || '';

      // 设置明细信息
      if (Array.isArray(bomData.details)) {
        form.details = bomData.details.map(detail => {
          // 找到对应的物料信息
          const material = materialOptions.value.find(m => m.id === detail.material_id);
          
          return {
            id: detail.id,
            material_id: detail.material_id,
            quantity: Number(detail.quantity),
            unit_id: detail.unit_id,
            remark: detail.remark || '',
            // 保存额外信息以便显示
            material_code: detail.material_code || material?.code || '',
            material_name: detail.material_name || material?.name || '',
            material_specs: detail.material_specs || material?.specs || '',
            unit_name: detail.unit_name
          };
        });
      } else {
        form.details = [];
        console.warn('BOM明细数据不是数组格式');
      }

      console.log('表单数据设置完成:', JSON.stringify(form, null, 2));
    });
    
    dialogVisible.value = true;
  } catch (error) {
    console.error('获取BOM详情失败:', error);
    ElMessage.error(error.message || '获取BOM详情失败');
  }
};

// 查看BOM
const handleView = async (row) => {
  try {
    const response = await baseDataApi.getBom(row.id);
    if (response.data && response.data.data) {
      // 获取产品信息以补充产品规格型号
      const productId = response.data.data.product_id;
      const product = materialOptions.value.find(m => m.id === productId);
      
      // 处理明细数据，添加规格型号信息
      const bomData = response.data.data;
      if (bomData.details && Array.isArray(bomData.details)) {
        bomData.details = bomData.details.map(detail => {
          // 找到对应的物料信息
          const material = materialOptions.value.find(m => m.id === detail.material_id);
          return {
            ...detail,
            material_specs: material?.specs || '-'
          };
        });
      }
      
      currentBom.value = {
        ...bomData,
        status: Number(bomData.status),
        product_specs: product?.specs || row.product_specs || '-'
      };
    } else {
      throw new Error('无效的BOM数据');
    }
    console.log('查看BOM详情:', currentBom.value);
    viewDialogVisible.value = true;
  } catch (error) {
    console.error('获取BOM详情失败:', error);
    ElMessage.error(`获取BOM详情失败: ${error.message}`);
  }
};

// 删除BOM
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该BOM吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await baseDataApi.deleteBom(row.id);
      ElMessage.success('删除成功');
      fetchData();
    } catch (error) {
      console.error('删除BOM失败:', error);
      ElMessage.error('删除BOM失败');
    }
  }).catch(() => {});
};

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  
  form.id = '';
  form.product_id = '';
  form.version = '';
  form.status = 1;
  form.remark = '';
  form.details = [];
};

// 添加BOM明细
const addDetail = () => {
  form.details.push({
    material_id: '',
    quantity: 1,
    unit_id: '',
    remark: '',
    material_code: '',
    material_name: '',
    material_specs: ''
  });
};

// 删除BOM明细
const removeDetail = (index) => {
  form.details.splice(index, 1);
};

// 物料选择变更时，自动设置对应的单位
const handleMaterialChange = (materialId, index) => {
  const material = materialOptions.value.find(item => item.id === materialId);
  if (material) {
    // 设置单位
    if (material.unit_id) {
      form.details[index].unit_id = material.unit_id;
    }
    // 保存物料编码、名称和规格型号，方便后续显示
    form.details[index].material_code = material.code;
    form.details[index].material_name = material.name;
    form.details[index].material_specs = material.specs || '';
  }
};

// 过滤物料选项
const filterMaterial = (query) => {
  if (query !== '') {
    return materialOptions.value.filter(item => {
      return item.code.toLowerCase().includes(query.toLowerCase()) || 
             item.name.toLowerCase().includes(query.toLowerCase()) ||
             (item.specs && item.specs.toLowerCase().includes(query.toLowerCase()));
    });
  }
  return materialOptions.value;
};

// 提交表单
const submitForm = () => {
  // 检查是否有BOM明细
  if (form.details.length === 0) {
    ElMessage.warning('请添加至少一条BOM明细');
    return;
  }
  
  // 检查明细数据是否完整
  const invalidDetail = form.details.find(detail => !detail.material_id || !detail.quantity || !detail.unit_id);
  if (invalidDetail) {
    ElMessage.warning('请完善BOM明细信息');
    return;
  }
  
  formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const submitData = {
          bomData: {
            product_id: form.product_id,
            version: form.version,
            status: Number(form.status), // 确保状态是数字
            remark: form.remark
          },
          details: form.details.map(detail => ({
            ...detail,
            quantity: Number(detail.quantity), // 确保数量是数字
            unit_id: Number(detail.unit_id) // 确保单位ID是数字
          }))
        };
        
        console.log('提交的BOM数据:', JSON.stringify(submitData, null, 2));
        
        let response;
        if (isEdit.value) {
          // 编辑
          response = await baseDataApi.updateBom(form.id, submitData);
          console.log('编辑BOM响应:', response);
          ElMessage.success('编辑成功');
        } else {
          // 新增
          response = await baseDataApi.createBom(submitData);
          console.log('新增BOM响应:', response);
          ElMessage.success('新增成功');
        }
        dialogVisible.value = false;
        fetchData();
      } catch (error) {
        console.error('保存BOM失败:', error);
        if (error.response) {
          console.error('错误响应:', error.response.data);
          ElMessage.error(`保存BOM失败: ${error.response.data.message || '未知错误'}`);
        } else {
          ElMessage.error('保存BOM失败: 网络错误');
        }
      }
    }
  });
};

// 导出数据
const handleExport = async () => {
  try {
    const response = await baseDataApi.exportBoms({
      productId: searchForm.productId,
      version: searchForm.version,
      status: searchForm.status
    });
    // 处理文件下载
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'BOM列表.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  }
};

// 计算统计数据
const calculateStats = () => {
  stats.total = tableData.value.length;
  stats.active = tableData.value.filter(item => Number(item.status) === 1).length;
  stats.inactive = tableData.value.filter(item => Number(item.status) === 0).length;
  
  // 计算所有BOM的明细总数
  let detailsCount = 0;
  tableData.value.forEach(bom => {
    if (bom.details && Array.isArray(bom.details)) {
      detailsCount += bom.details.length;
    }
  });
  stats.detailsCount = detailsCount;
};

// 产品选择变更
const handleProductChange = (productId) => {
  const product = materialOptions.value.find(item => item.id === productId);
  if (product) {
    console.log(`已选择产品 ${product.code} - ${product.name}，规格: ${product.specs || '无'}`);
  }
};
</script>

<style scoped>
.boms-container {
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

.bom-details {
  margin-top: 15px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.delete-text-btn {
  color: #F56C6C;
  padding: 0 4px;
}

.delete-text-btn:hover {
  color: #f78989;
}
</style>