<template>
  <div class="inventory-stock-add">
    <el-dialog
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      title="库存调整"
      width="600px"
      :close-on-click-modal="false"
      @close="handleClose"
    >
      
      <!-- 表单 -->
      <el-form 
        :model="form" 
        :rules="rules" 
        ref="formRef" 
        label-width="120px"
        label-position="right"
        class="stock-form"
      >
        <el-form-item label="物料" prop="materialId">
          <el-autocomplete
            v-model="materialQuery"
            :fetch-suggestions="queryMaterials"
            placeholder="输入物料编码或名称搜索"
            :trigger-on-focus="false"
            value-key="name"
            @select="handleMaterialSelect"
            style="width: 100%"
          >
            <template #default="{ item }">
              <div class="material-item">
                <div class="material-code">{{ item.code }}</div>
                <div class="material-name">{{ item.name }}</div>
                <div class="material-spec">{{ item.specification || '-' }}</div>
              </div>
            </template>
          </el-autocomplete>
        </el-form-item>
        
        <el-form-item label="物料信息" v-if="selectedMaterial.code">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="物料编码">{{ selectedMaterial.code }}</el-descriptions-item>
            <el-descriptions-item label="物料名称">{{ selectedMaterial.name }}</el-descriptions-item>
            <el-descriptions-item label="规格">{{ selectedMaterial.specification || '-' }}</el-descriptions-item>
            <el-descriptions-item label="类别">{{ selectedMaterial.category_name }}</el-descriptions-item>
            <el-descriptions-item label="单位">{{ selectedMaterial.unit_name }}</el-descriptions-item>
          </el-descriptions>
        </el-form-item>
        
        <el-form-item label="仓库" v-if="selectedMaterial.location_name">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="默认仓库">{{ selectedMaterial.location_name }}</el-descriptions-item>
          </el-descriptions>
        </el-form-item>
        
        <el-form-item label="调整类型" prop="type">
          <el-select v-model="form.type" placeholder="选择调整类型" style="width: 100%">
            <el-option label="入库" value="in" />
            <el-option label="出库" value="out" />
            <el-option label="盘点调整" value="adjust" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="调整数量" prop="quantity">
          <el-input-number 
            v-model="form.quantity" 
            :precision="2" 
            :step="1" 
            :min="form.type === 'out' ? 0.01 : 0.01" 
            style="width: 100%"
          />
          <div class="quantity-note" v-if="form.type === 'out'">
            出库时请输入正数，系统会自动减少库存
          </div>
        </el-form-item>
        
        <el-form-item label="备注" prop="remark">
          <el-input 
            v-model="form.remark" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入备注信息"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="submitting">提交</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { inventoryApi } from '@/services/api'

const router = useRouter()
const formRef = ref(null)
const materialQuery = ref('')
const selectedMaterial = ref({})
const submitting = ref(false)

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

// 关闭对话框
const handleClose = () => {
  resetForm()
  emit('update:modelValue', false)
}

// 表单数据
const form = reactive({
  materialId: '',
  type: 'in',
  quantity: 1,
  remark: ''
})

// 表单验证规则
const rules = {
  materialId: [
    { required: true, message: '请选择物料', trigger: 'change' }
  ],
  type: [
    { required: true, message: '请选择调整类型', trigger: 'change' }
  ],
  quantity: [
    { required: true, message: '请输入数量', trigger: 'blur' },
    { type: 'number', message: '数量必须为数字', trigger: 'blur' }
  ]
}

// 查询物料
const queryMaterials = async (query, cb) => {
  if (query.length < 2) {
    cb([])
    return
  }
  
  try {
    const response = await inventoryApi.getAllMaterials({ search: query })
    
    // 处理后端返回的数据结构
    let materials = []
    if (response.data) {
      // 如果是分页数据格式
      if (response.data.data && Array.isArray(response.data.data)) {
        materials = response.data.data
      } 
      // 如果直接返回数组
      else if (Array.isArray(response.data)) {
        materials = response.data
      }
      // 如果返回items数组
      else if (response.data.items && Array.isArray(response.data.items)) {
        materials = response.data.items
      }
    }
    
    cb(materials)
  } catch (error) {
    console.error('搜索物料失败:', error)
    cb([])
  }
}

// 选择物料
const handleMaterialSelect = (item) => {
  selectedMaterial.value = item
  form.materialId = item.id
  materialQuery.value = item.name
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        // 如果是出库，确保数量是负数
        let quantity = form.quantity
        if (form.type === 'out') {
          quantity = -Math.abs(quantity)
        }
        
        const data = {
          materialId: form.materialId,
          locationId: selectedMaterial.value.location_id,
          quantity: quantity,
          type: form.type,
          remark: form.remark
        }
        
        await inventoryApi.adjustStock(data)
        
        emit('success')
        emit('update:modelValue', false)
        resetForm()
      } catch (error) {
        ElMessage.error(error.message || '提交失败')
        console.error(error)
      } finally {
        submitting.value = false
      }
    }
  })
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  selectedMaterial.value = {}
  materialQuery.value = ''
}

// 移除了 fetchBaseData() 调用，因为我们不再需要获取仓库列表
</script>

<style scoped>
.inventory-stock-add {
  :deep(.el-dialog__body) {
    padding: 30px;
  }
  
  :deep(.el-form-item) {
    margin-bottom: 22px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stock-form {
  max-width: 800px;
  margin: 0 auto;
}

.material-item {
  display: flex;
  align-items: center;
}

.material-code {
  width: 100px;
  color: #606266;
}

.material-name {
  flex: 1;
  font-weight: bold;
}

.material-spec {
  width: 150px;
  color: #909399;
  font-size: 0.9em;
}

.quantity-note {
  color: #E6A23C;
  font-size: 12px;
  margin-top: 5px;
}
</style>