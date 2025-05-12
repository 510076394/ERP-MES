<template>
  <div class="inspection-container">
    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">{{ inspectionStats.total }}</div>
        <div class="stat-label">全部检验单</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ inspectionStats.pending }}</div>
        <div class="stat-label">待检验</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ inspectionStats.passed }}</div>
        <div class="stat-label">合格</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ inspectionStats.failed }}</div>
        <div class="stat-label">不合格</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ inspectionStats.review }}</div>
        <div class="stat-label">复检</div>
      </div>
    </div>

    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>成品检验管理</span>
        </div>
      </template>
      
      <!-- 搜索表单 -->
      <div class="search-container">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input
              v-model="searchKeyword"
              placeholder="请输入检验单号/工单号/产品名称"
              @keyup.enter="handleSearch"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          
          <el-col :span="4">
            <el-select v-model="statusFilter" placeholder="检验状态" clearable @change="handleSearch" style="width: 100%">
              <el-option label="待检验" value="pending" />
              <el-option label="合格" value="passed" />
              <el-option label="不合格" value="failed" />
              <el-option label="复检" value="review" />
            </el-select>
          </el-col>
          
          <el-col :span="8">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              @change="handleSearch"
              style="width: 100%"
            />
          </el-col>
          
          <el-col :span="6">
            <div class="search-buttons">
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon>查询
              </el-button>
              <el-button @click="handleRefresh">
                <el-icon><Refresh /></el-icon>重置
              </el-button>
              <el-button type="primary" @click="handleCreate">
                <el-icon><Plus /></el-icon>新增
              </el-button>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 检验单列表 -->
      <el-table
        :data="inspectionList"
        border
        style="width: 100%; margin-top: 16px;"
        v-loading="loading"
        :max-height="tableHeight"
      >
        <el-table-column prop="inspection_no" label="检验单号" min-width="150" />
        <el-table-column prop="item_name" label="产品名称" min-width="180" />
        <el-table-column prop="item_code" label="产品型号" min-width="150" />
        <el-table-column prop="reference_no" label="工单号" min-width="150" />
        <el-table-column prop="batch_no" label="批次号" min-width="120" />
        <el-table-column prop="quantity" label="检验数量" min-width="100">
          <template #default="scope">
            {{ scope.row.quantity }} {{ scope.row.unit }}
          </template>
        </el-table-column>
        <el-table-column prop="inspection_date" label="检验日期" min-width="120">
          <template #default="scope">
            {{ formatDate(scope.row.inspection_date || scope.row.planned_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="inspector" label="检验员" min-width="120" />
        <el-table-column prop="status" label="检验状态" min-width="100">
          <template #default="scope">
            <el-tag
              :type="getStatusType(scope.row.status)"
            >
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="scope">
            <el-button link type="primary" size="small" @click="handleView(scope.row)">
              <el-icon><View /></el-icon>查看
            </el-button>
            <el-button
              v-if="scope.row.status === 'pending'"
              link
              type="primary"
              size="small"
              @click="handleInspect(scope.row)"
            >
              <el-icon><Check /></el-icon>检验
            </el-button>
            <el-dropdown v-if="scope.row.status !== 'pending'" @command="command => handleDropdownCommand(command, scope.row)">
              <el-button link type="success" size="small" style="vertical-align: middle; padding: 2px 4px; margin: 0;">
                <el-icon style="vertical-align: middle;"><arrow-down /></el-icon>更多
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="report">查看报告</el-dropdown-item>
                  <el-dropdown-item v-if="scope.row.status === 'failed'" command="review">复检</el-dropdown-item>
                  <el-dropdown-item command="certificate">合格证书</el-dropdown-item>
                  <el-dropdown-item command="print">打印报告</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 新建检验单弹窗 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建成品检验单"
      width="650px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="工单号" prop="productionOrderNo">
          <el-select 
            v-model="form.productionOrderNo" 
            @change="handleOrderChange"
            placeholder="选择工单号"
            filterable
          >
            <el-option 
              v-for="order in productionOrderOptions" 
              :key="order.id" 
              :label="order.orderNo" 
              :value="order.orderNo" 
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="产品名称" prop="productName">
          <el-input v-model="form.productName" disabled />
        </el-form-item>
        
        <el-form-item label="产品型号" prop="productCode">
          <el-input v-model="form.productCode" disabled />
        </el-form-item>
        
        <el-form-item label="批次号" prop="batchNo">
          <el-input v-model="form.batchNo" placeholder="请输入批次号" />
        </el-form-item>
        
        <el-form-item label="检验数量" prop="quantity">
          <el-input-number v-model="form.quantity" :min="1" />
          <span class="unit-text">{{ form.unit }}</span>
        </el-form-item>
        
        <el-form-item label="标准类型" prop="standardType">
          <el-select v-model="form.standardType" placeholder="选择标准类型">
            <el-option label="出厂标准" value="factory" />
            <el-option label="客户标准" value="customer" />
            <el-option label="行业标准" value="industry" />
            <el-option label="国家标准" value="national" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="标准编号" prop="standardNo">
          <el-input v-model="form.standardNo" placeholder="请输入标准编号" />
        </el-form-item>
        
        <el-form-item label="计划检验日期" prop="plannedDate">
          <el-date-picker 
            v-model="form.plannedDate"
            type="date"
            placeholder="选择计划检验日期"
          />
        </el-form-item>
        
        <el-form-item label="备注" prop="note">
          <el-input
            v-model="form.note"
            type="textarea"
            placeholder="请输入备注信息"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 检验弹窗 -->
    <el-dialog
      v-model="inspectDialogVisible"
      title="成品检验"
      width="800px"
      destroy-on-close
    >
      <el-form ref="inspectFormRef" :model="inspectForm" :rules="inspectRules" label-width="100px">
        <el-form-item label="检验员" prop="inspector">
          <el-input v-model="inspectForm.inspector" />
        </el-form-item>
        
        <el-form-item label="检验日期" prop="inspectionDate">
          <el-date-picker
            v-model="inspectForm.inspectionDate"
            type="date"
            placeholder="选择检验日期"
          />
        </el-form-item>
        
        <el-form-item label="检验项目" prop="items">
          <el-table
            :data="inspectForm.items"
            border
            style="width: 100%; margin-top: 16px;"
          >
            <el-table-column prop="item_name" label="项目名称" min-width="180" />
            <el-table-column prop="standard" label="标准" min-width="180" />
            <el-table-column prop="type" label="类型" min-width="100">
              <template #default="scope">
                {{ getTypeText(scope.row.type) }}
              </template>
            </el-table-column>
            <el-table-column prop="actual_value" label="实际值" min-width="100">
              <template #default="scope">
                <el-input v-model="scope.row.actual_value" />
              </template>
            </el-table-column>
            <el-table-column prop="result" label="结果" min-width="100">
              <template #default="scope">
                <el-select v-model="scope.row.result" placeholder="选择结果">
                  <el-option label="合格" value="passed" />
                  <el-option label="不合格" value="failed" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column prop="remarks" label="备注" min-width="180">
              <template #default="scope">
                <el-input v-model="scope.row.remarks" />
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
        
        <el-form-item label="备注" prop="note">
          <el-input
            v-model="inspectForm.note"
            type="textarea"
            placeholder="请输入备注信息"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="inspectDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitInspection">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 查看检验单弹窗 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="检验单详情"
      width="800px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="检验单号">{{ currentInspection.inspection_no }}</el-descriptions-item>
        <el-descriptions-item label="产品名称">{{ currentInspection.item_name }}</el-descriptions-item>
        <el-descriptions-item label="工单号">{{ currentInspection.reference_no }}</el-descriptions-item>
        <el-descriptions-item label="批次号">{{ currentInspection.batch_no }}</el-descriptions-item>
        <el-descriptions-item label="检验数量">{{ currentInspection.quantity }} {{ currentInspection.unit }}</el-descriptions-item>
        <el-descriptions-item label="检验日期">{{ formatDate(currentInspection.inspection_date) }}</el-descriptions-item>
        <el-descriptions-item label="检验员">{{ currentInspection.inspector }}</el-descriptions-item>
        <el-descriptions-item label="检验状态">
          <el-tag :type="getStatusType(currentInspection.status)">
            {{ getStatusText(currentInspection.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="标准类型">{{ currentInspection.standard_type }}</el-descriptions-item>
        <el-descriptions-item label="标准编号">{{ currentInspection.standard_no }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ currentInspection.note }}</el-descriptions-item>
      </el-descriptions>

      <div class="inspection-items" style="margin-top: 20px;">
        <h4>检验项目</h4>
        <el-table :data="currentInspection.items" border style="width: 100%">
          <el-table-column prop="item_name" label="项目名称" min-width="180" />
          <el-table-column prop="standard" label="标准" min-width="180" />
          <el-table-column prop="type" label="类型" min-width="100">
            <template #default="scope">
              {{ getTypeText(scope.row.type) }}
            </template>
          </el-table-column>
          <el-table-column prop="actual_value" label="实际值" min-width="100" />
          <el-table-column prop="result" label="结果" min-width="100">
            <template #default="scope">
              <el-tag :type="scope.row.result === 'passed' ? 'success' : 'danger'">
                {{ scope.row.result === 'passed' ? '合格' : '不合格' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remarks" label="备注" min-width="180" />
        </el-table>
      </div>
    </el-dialog>
    
    <!-- 检验报告弹窗 -->
    <el-dialog
      v-model="reportDialogVisible"
      title="检验报告"
      width="800px"
    >
      <div class="report-container">
        <div class="report-header">
          <h2 class="text-center">成品检验报告</h2>
          <p class="text-center">FINAL QUALITY INSPECTION REPORT</p>
        </div>
        
        <el-divider />
        
        <div class="report-info">
          <div class="info-row">
            <span class="info-label">检验单号：</span>
            <span class="info-value">{{ currentInspection.inspection_no }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">产品名称：</span>
            <span class="info-value">{{ currentInspection.item_name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">产品型号：</span>
            <span class="info-value">{{ currentInspection.item_code }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">工单号：</span>
            <span class="info-value">{{ currentInspection.reference_no }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">批次号：</span>
            <span class="info-value">{{ currentInspection.batch_no }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">检验数量：</span>
            <span class="info-value">{{ currentInspection.quantity }} {{ currentInspection.unit }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">检验日期：</span>
            <span class="info-value">{{ formatDate(currentInspection.actual_date) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">检验员：</span>
            <span class="info-value">{{ currentInspection.inspector_name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">检验结果：</span>
            <span class="info-value">
              <el-tag :type="getStatusType(currentInspection.status)">
                {{ getStatusText(currentInspection.status) }}
              </el-tag>
            </span>
          </div>
        </div>
        
        <div class="report-items">
          <h3>检验项目：</h3>
          <el-table :data="currentInspection.items" border style="width: 100%">
            <el-table-column type="index" width="50" label="序号" />
            <el-table-column prop="item_name" label="检验项目" width="150" />
            <el-table-column prop="standard" label="检验标准" min-width="180" />
            <el-table-column prop="type" label="检验类型" width="100">
              <template #default="scope">
                {{ getTypeText(scope.row.type) }}
              </template>
            </el-table-column>
            <el-table-column prop="actual_value" label="实际值" width="120" />
            <el-table-column prop="result" label="检验结果" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.result === 'passed' ? 'success' : 'danger'">
                  {{ scope.row.result === 'passed' ? '合格' : '不合格' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remarks" label="备注" min-width="150" />
          </el-table>
        </div>
        
        <div class="report-note" v-if="currentInspection.note">
          <h3>检验备注：</h3>
          <p>{{ currentInspection.note }}</p>
        </div>
        
        <div class="report-signatures">
          <div class="signature-item">
            <p>检验员签名：___________________</p>
            <p>日期：{{ formatDate(new Date()) }}</p>
          </div>
          <div class="signature-item">
            <p>质检主管签名：___________________</p>
            <p>日期：{{ formatDate(new Date()) }}</p>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handlePrintReport">打印报告</el-button>
          <el-button @click="reportDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 合格证书弹窗 -->
    <el-dialog
      v-model="certificateDialogVisible"
      title="合格证书"
      width="800px"
    >
      <div class="certificate-container">
        <div class="certificate-header">
          <h2 class="text-center">产品合格证书</h2>
          <p class="text-center">CERTIFICATE OF CONFORMITY</p>
        </div>
        
        <el-divider />
        
        <div class="certificate-content">
          <p>兹证明，以下产品经过质量检验，符合相关标准要求，特发此证。</p>
          
          <div class="info-row">
            <span class="info-label">产品名称：</span>
            <span class="info-value">{{ currentInspection.item_name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">产品型号：</span>
            <span class="info-value">{{ currentInspection.item_code }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">批次号：</span>
            <span class="info-value">{{ currentInspection.batch_no }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">生产日期：</span>
            <span class="info-value">{{ formatDate(currentInspection.planned_date) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">检验日期：</span>
            <span class="info-value">{{ formatDate(currentInspection.actual_date) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">检验标准：</span>
            <span class="info-value">{{ currentInspection.standard_type === 'factory' ? '工厂标准' : 
                                   currentInspection.standard_type === 'customer' ? '客户标准' :
                                   currentInspection.standard_type === 'industry' ? '行业标准' :
                                   currentInspection.standard_type === 'national' ? '国家标准' : '未知' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">标准编号：</span>
            <span class="info-value">{{ currentInspection.standard_no }}</span>
          </div>
          
          <div class="certificate-declaration">
            <p>本产品的质量符合相关质量标准，特此证明。</p>
          </div>
        </div>
        
        <div class="certificate-seal">
          <div class="seal-item">
            <p>检验员：{{ currentInspection.inspector_name }}</p>
            <p>日期：{{ formatDate(currentInspection.actual_date) }}</p>
          </div>
          <div class="seal-item text-center">
            <div class="company-seal">
              <p>（公司盖章）</p>
            </div>
            <p>生效日期：{{ formatDate(new Date()) }}</p>
          </div>
          <div class="seal-item">
            <p>质量负责人：_________________</p>
            <p>日期：{{ formatDate(new Date()) }}</p>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handlePrintCertificate">打印证书</el-button>
          <el-button @click="certificateDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, View, Check, Plus, Refresh, ArrowDown } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { qualityApi, inventoryApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

// API基础路径配置，可以根据环境变量设置
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

// 搜索相关
const searchKeyword = ref('')
const statusFilter = ref('')
const dateRange = ref([])

// 表格数据相关
const loading = ref(false)
const inspectionList = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 创建检验单相关
const createDialogVisible = ref(false)
const formRef = ref(null)
const form = reactive({
  productionOrderNo: '',
  productId: null,
  productName: '',
  productCode: '',
  batchNo: '',
  quantity: 1,
  unit: '',
  standardType: 'factory',
  standardNo: '',
  plannedDate: new Date(),
  note: ''
})

// 表单验证规则
const rules = {
  productionOrderNo: [{ required: true, message: '请选择工单号', trigger: 'change' }],
  batchNo: [{ required: true, message: '请输入批次号', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入检验数量', trigger: 'blur' }],
  standardType: [{ required: true, message: '请选择标准类型', trigger: 'change' }],
  standardNo: [{ required: true, message: '请输入标准编号', trigger: 'blur' }],
  plannedDate: [{ required: true, message: '请选择计划检验日期', trigger: 'change' }]
}

// 工单选项
const productionOrderOptions = ref([])

// 添加表格高度自适应
const tableHeight = ref('calc(100vh - 280px)')

// 添加检验单统计数据
const inspectionStats = ref({
  total: 0,
  pending: 0,
  passed: 0,
  failed: 0,
  review: 0
})

// 添加检验模板相关数据
const inspectionTemplates = ref([])
const currentTemplateItems = ref([])

// 在script setup部分添加
const viewDialogVisible = ref(false)
const currentInspection = ref({})

// 添加报告和证书对话框的ref
const reportDialogVisible = ref(false)
const certificateDialogVisible = ref(false)

const router = useRouter()
const authStore = useAuthStore()

// 获取工单选项
const fetchProductionOrders = async () => {
  try {
    // 获取认证令牌
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('未找到认证令牌');
      ElMessage.warning('请先登录系统');
      return;
    }
    
    console.log('开始请求生产任务数据...');
    
    // 从API获取生产工单数据
    const response = await fetch(`${apiBaseUrl}/production/tasks?status=completed&pageSize=1000`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      ElMessage.error('认证已过期，请重新登录');
      return;
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '无错误详情');
      console.error('获取生产工单HTTP错误:', response.status, errorText);
      ElMessage.warning(`获取生产工单失败: ${response.status} ${response.statusText}`);
      
      // 设置一些默认数据用于测试，这样即使API失败也能继续
      productionOrderOptions.value = [
        { id: 1, orderNo: 'TASK-001', productName: '测试产品1', productCode: 'TEST-001', unit: '个' },
        { id: 2, orderNo: 'TASK-002', productName: '测试产品2', productCode: 'TEST-002', unit: '个' }
      ];
      console.log('使用默认测试数据:', productionOrderOptions.value);
      return;
    }
    
    // 检查响应是否为空
    const text = await response.text();
    if (!text) {
      console.error('服务器返回空响应');
      ElMessage.warning('获取生产工单数据失败: 服务器返回空响应');
      
      // 使用默认数据
      productionOrderOptions.value = [
        { id: 1, orderNo: 'TASK-001', productName: '测试产品1', productCode: 'TEST-001', unit: '个' }
      ];
      return;
    }
    
    // 解析JSON
    try {
      const result = JSON.parse(text);
      console.log('获取到的生产工单数据:', result);
      
      if (!result) {
        console.error('API返回空结果');
        ElMessage.warning('获取生产工单数据失败: API返回空结果');
        return;
      }
      
      // 处理API返回的不同数据结构
      if (result.items && Array.isArray(result.items)) {
        // 使用items字段作为任务列表
        productionOrderOptions.value = result.items
          .filter(task => task.status === 'completed') // 只显示已完成的任务
          .map(task => ({
            id: task.id,
            orderNo: task.code,
            productName: task.productName || task.product_name || '未知产品',
            productCode: task.specs || task.productCode || task.product_code || '未知型号',
            unit: task.unit || '个'
          }));
        console.log('处理后的工单选项:', productionOrderOptions.value);
      } else if (result.data && Array.isArray(result.data)) {
        // 使用data字段作为任务列表
        productionOrderOptions.value = result.data
          .filter(task => task.status === 'completed') // 只显示已完成的任务
          .map(task => ({
            id: task.id,
            orderNo: task.task_no || task.code,
            productName: task.product_name || task.productName || '未知产品',
            productCode: task.specs || task.product_specs || task.productCode || '未知型号',
            unit: task.unit || '个'
          }));
        console.log('处理后的工单选项:', productionOrderOptions.value);
      } else {
        console.error('API返回数据结构不符合预期:', result);
        ElMessage.warning('获取生产工单数据格式不正确');
        
        // 仍然设置默认数据以便测试
        productionOrderOptions.value = [
          { id: 999, orderNo: 'DEFAULT-001', productName: '默认产品', productCode: 'DEFAULT', unit: '个' }
        ];
      }
    } catch (jsonError) {
      console.error('JSON解析错误:', jsonError, '原始响应:', text);
      ElMessage.error('解析服务器响应失败');
      
      // 使用默认数据
      productionOrderOptions.value = [
        { id: 888, orderNo: 'ERROR-001', productName: '错误恢复数据', productCode: 'ERROR', unit: '个' }
      ];
    }
  } catch (error) {
    console.error('获取生产工单失败:', error);
    ElMessage.warning(`获取生产工单数据失败: ${error.message || '未知错误'}`);
    
    // 使用默认数据
    productionOrderOptions.value = [
      { id: 777, orderNo: 'EXCEPTION-001', productName: '异常恢复数据', productCode: 'EXCEPTION', unit: '个' }
    ];
  }
}

// 在创建检验单时，添加获取检验模板的方法
const fetchInspectionTemplate = async (productId) => {
  loading.value = true
  try {
    // 获取认证令牌
    const token = localStorage.getItem('token');
    
    // 从API获取模板
    const response = await fetch(`${apiBaseUrl}/quality/templates?product_id=${productId}&type=final`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      ElMessage.error('认证已过期，请重新登录');
      loading.value = false;
      return;
    }
    
    const result = await response.json();
    console.log('获取到的模板列表:', result);
    
    if (result.success && result.data && result.data.length > 0) {
      // 获取第一个匹配的模板
      const templateId = result.data[0].id;
      console.log('获取到模板ID:', templateId);
      
      // 获取模板详情
      const templateResponse = await fetch(`${apiBaseUrl}/quality/templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const templateResult = await templateResponse.json();
      console.log('获取到的模板详情:', templateResult);
      
      if (templateResult.success && templateResult.data) {
        const template = templateResult.data;
        
        // 处理模板项目，先检查items字段
        if (template.items && template.items.length > 0) {
          console.log('使用模板中的items字段:', template.items);
          currentTemplateItems.value = template.items.map(item => ({
            id: item.id,
            item_name: item.item_name,
            standard: item.standard,
            type: item.type_name || item.type // 优先使用type_name，如果没有则使用type
          }));
        } 
        // 再检查InspectionItems字段，这是标准字段
        else if (template.InspectionItems && template.InspectionItems.length > 0) {
          console.log('使用模板中的InspectionItems字段:', template.InspectionItems);
          currentTemplateItems.value = template.InspectionItems.map(item => ({
            id: item.id,
            item_name: item.item_name,
            standard: item.standard,
            type: item.type_name || item.type // 优先使用type_name，如果没有则使用type
          }));
        } else {
          // 没有找到任何检验项目，使用默认检验项
          console.log('未找到模板检验项，使用默认项目');
          currentTemplateItems.value = [
            { id: 1, item_name: '外观检查', standard: '无划痕、无变形', type: 'visual' },
            { id: 2, item_name: '尺寸检查', standard: '符合图纸要求', type: 'dimension' },
            { id: 3, item_name: '功能测试', standard: '功能正常', type: 'function' }
          ];
        }
      } else {
        // 未获取到模板详情，使用默认检验项
        console.log('获取模板详情失败，使用默认检验项');
        currentTemplateItems.value = [
          { id: 1, item_name: '外观检查', standard: '无划痕、无变形', type: 'visual' },
          { id: 2, item_name: '尺寸检查', standard: '符合图纸要求', type: 'dimension' },
          { id: 3, item_name: '功能测试', standard: '功能正常', type: 'function' }
        ];
      }
    } else {
      // 未找到模板，使用默认检验项
      console.log('未找到匹配的检验模板，使用默认检验项');
      currentTemplateItems.value = [
        { id: 1, item_name: '外观检查', standard: '无划痕、无变形', type: 'visual' },
        { id: 2, item_name: '尺寸检查', standard: '符合图纸要求', type: 'dimension' },
        { id: 3, item_name: '功能测试', standard: '功能正常', type: 'function' }
      ];
    }
    
    console.log('最终使用的检验模板项目:', currentTemplateItems.value);
  } catch (error) {
    console.error('获取检验模板失败:', error);
    ElMessage.error('获取检验模板失败');
    
    // 出错时使用默认检验项
    currentTemplateItems.value = [
      { id: 1, item_name: '外观检查', standard: '无划痕、无变形', type: 'visual' },
      { id: 2, item_name: '尺寸检查', standard: '符合图纸要求', type: 'dimension' },
      { id: 3, item_name: '功能测试', standard: '功能正常', type: 'function' }
    ];
  } finally {
    loading.value = false;
  }
}

// 计算统计数据的方法
const calculateInspectionStats = () => {
  const stats = {
    total: inspectionList.value.length,
    pending: 0,
    passed: 0,
    failed: 0,
    review: 0
  }
  
  inspectionList.value.forEach(inspection => {
    if (inspection.status === 'pending') stats.pending++
    else if (inspection.status === 'passed') stats.passed++
    else if (inspection.status === 'failed') stats.failed++
    else if (inspection.status === 'review') stats.review++
  })
  
  inspectionStats.value = stats
}

// 添加统一的日期格式化方法
const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

// 修改工单选择方法，添加获取检验模板的调用
const handleOrderChange = (orderNo) => {
  console.log('选择了工单:', orderNo);
  const order = productionOrderOptions.value.find(item => item.orderNo === orderNo)
  console.log('找到的工单信息:', order);
  
  if (order) {
    // 保存产品ID和产品信息
    form.productId = order.id;
    form.productName = order.productName
    form.productCode = order.productCode
    form.unit = order.unit
    
    console.log('填充后的表单数据:', {
      productId: form.productId,
      productName: form.productName,
      productCode: form.productCode,
      unit: form.unit
    });
    
    // 获取对应产品的检验模板
    fetchInspectionTemplate(order.id)
    
    // 生成标准编号
    form.standardNo = orderNo.replace('PD', 'STD') + '-FQC'
  }
}

// 初始化
onMounted(() => {
  fetchData()
  fetchProductionOrders()
})

// 获取检验单列表
const fetchData = async () => {
  loading.value = true;
  
  try {
    // 构建查询参数
    const params = new URLSearchParams();
    params.append('page', currentPage.value);
    params.append('limit', pageSize.value);
    
    if (searchKeyword.value) {
      params.append('keyword', searchKeyword.value);
    }
    
    if (statusFilter.value) {
      params.append('status', statusFilter.value);
    }
    
    if (dateRange.value && dateRange.value.length === 2) {
      const startDate = formatDate(dateRange.value[0]);
      const endDate = formatDate(dateRange.value[1]);
      params.append('startDate', startDate);
      params.append('endDate', endDate);
    }
    
    // 获取认证令牌
    const token = localStorage.getItem('token');
    if (!token) {
      ElMessage.error('未找到认证令牌，请先登录');
      return;
    }
    
    console.log('开始请求成品检验列表，参数:', params.toString());
    
    // 从API获取数据
    const response = await fetch(`${apiBaseUrl}/quality/inspections/final?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      ElMessage.error('认证已过期，请重新登录');
      return;
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '无错误详情');
      console.error('获取检验单列表HTTP错误:', response.status, errorText);
      ElMessage.error(`获取检验单列表失败: ${response.status} ${response.statusText}`);
      return;
    }
    
    // 检查响应是否为空
    const text = await response.text();
    if (!text) {
      console.error('服务器返回空响应');
      ElMessage.error('服务器返回空响应');
      return;
    }
    
    // 解析JSON
    try {
      const result = JSON.parse(text);
      
      if (result.success) {
        console.log('成功获取检验单列表:', result);
        inspectionList.value = result.data || [];
        total.value = result.total || 0;
        calculateInspectionStats();
      } else {
        console.error('API返回错误:', result);
        ElMessage.error(result.message || '获取检验单列表失败');
      }
    } catch (jsonError) {
      console.error('JSON解析错误:', jsonError, '原始响应:', text);
      ElMessage.error('解析服务器响应失败');
    }
  } catch (error) {
    console.error('获取检验单列表失败:', error);
    ElMessage.error(`获取检验单列表失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
}

// 获取状态类型（用于tag颜色）
const getStatusType = (status) => {
  const statusMap = {
    'pending': 'info',
    'passed': 'success',
    'failed': 'danger',
    'review': 'warning'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'pending': '待检验',
    'passed': '合格',
    'failed': '不合格',
    'review': '复检'
  }
  return statusMap[status] || '未知'
}

// 添加获取检验类型的中文文本函数
const getTypeText = (type) => {
  const typeMap = {
    'visual': '外观',
    'dimension': '尺寸',
    'function': '功能',
    'performance': '性能',
    'safety': '安全',
    'other': '其他'
  }
  return typeMap[type] || type
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  fetchData()
}

// 刷新
const handleRefresh = () => {
  searchKeyword.value = ''
  statusFilter.value = ''
  dateRange.value = []
  currentPage.value = 1
  pageSize.value = 20
  fetchData()
}

// 分页相关
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchData()
}

// 新建检验单
const handleCreate = () => {
  // 重置表单
  Object.keys(form).forEach(key => {
    if (key === 'quantity') {
      form[key] = 1
    } else if (key === 'plannedDate') {
      form[key] = new Date()
    } else if (key === 'standardType') {
      form[key] = 'factory'
    } else {
      form[key] = ''
    }
  })
  
  createDialogVisible.value = true
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    // 获取选中的工单信息
    const selectedOrder = productionOrderOptions.value.find(
      order => order.orderNo === form.productionOrderNo
    );

    // 准备数据
    const formData = {
      inspection_type: 'final',
      reference_id: form.productId,  // 使用productId作为reference_id
      reference_no: form.productionOrderNo,
      product_id: form.productId,
      product_name: form.productName,
      product_code: form.productCode,
      batch_no: form.batchNo,
      quantity: form.quantity,
      unit: form.unit,
      standard_type: form.standardType,
      standard_no: form.standardNo,
      planned_date: formatDate(form.plannedDate),
      note: form.note,
      status: 'pending'
    }
    
    loading.value = true
    
    // 获取认证令牌
    const token = localStorage.getItem('token');
    
    // 调用API创建检验单
    const response = await fetch(`${apiBaseUrl}/quality/inspections/final`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    })
    
    if (response.status === 401) {
      ElMessage.error('认证已过期，请重新登录');
      loading.value = false;
      return;
    }
    
    const result = await response.json()
    
    if (result.success) {
      ElMessage.success('检验单创建成功')
      createDialogVisible.value = false
      fetchData()
    } else {
      ElMessage.error(result.message || '创建检验单失败')
    }
  } catch (error) {
    console.error('表单验证或提交失败:', error)
    ElMessage.error('创建检验单失败')
  } finally {
    loading.value = false
  }
}

// 查看详情
const handleView = async (row) => {
  try {
    // 获取认证令牌
    const token = localStorage.getItem('token');
    if (!token) {
      ElMessage.error('未找到认证令牌，请重新登录');
      return;
    }
    
    // 从API获取检验单详情
    const response = await fetch(`${apiBaseUrl}/quality/inspections/${row.id}?with_details=true`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      ElMessage.error('认证已过期，请重新登录');
      return;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP错误: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '获取检验单详情失败');
    }
    
    // 调试信息
    console.log('成品检验单详情API返回:', result);
    console.log('检验项目数据:', result.data.items);
    
    // 确保currentInspection中包含items属性
    currentInspection.value = {
      ...result.data,
      items: result.data.items || []
    };
    
    // 如果没有items数据，尝试从数据库重新获取
    if (!currentInspection.value.items || currentInspection.value.items.length === 0) {
      console.log('检验单无检验项，尝试获取检验项...');
      const itemsResponse = await fetch(`${apiBaseUrl}/quality/inspections/${row.id}/items`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(err => {
        console.error('获取检验项失败:', err);
        return null;
      });
      
      if (itemsResponse && itemsResponse.ok) {
        const itemsResult = await itemsResponse.json();
        if (itemsResult.success && itemsResult.data) {
          console.log('成功获取检验项:', itemsResult.data);
          currentInspection.value.items = itemsResult.data;
        }
      }
      
      // 如果仍然没有检验项，使用默认项
      if (!currentInspection.value.items || currentInspection.value.items.length === 0) {
        console.log('未找到检验项，使用默认检验项');
        currentInspection.value.items = [
          { item_name: '外观检查', standard: '无明显缺陷', type: 'visual', result: '-' },
          { item_name: '尺寸检查', standard: '符合图纸要求', type: 'dimension', result: '-' },
          { item_name: '功能测试', standard: '功能正常', type: 'function', result: '-' }
        ];
      }
    }
    
    console.log('显示的检验单详情:', currentInspection.value);
    viewDialogVisible.value = true;
  } catch (error) {
    console.error('获取检验单详情失败:', error);
    ElMessage.error('获取检验单详情失败: ' + error.message);
  }
}

// 修改检验弹窗相关功能
const inspectDialogVisible = ref(false)
const inspectFormRef = ref(null)
const inspectForm = reactive({
  id: '',
  inspection_no: '',
  items: [],
  inspector: '',
  inspectionDate: new Date(),
  note: ''
})

// 检验表单验证规则
const inspectRules = {
  inspector: [
    { required: true, message: '请输入检验员姓名', trigger: 'blur' }
  ],
  inspectionDate: [
    { required: true, message: '请选择检验日期', trigger: 'change' }
  ],
  items: [
    {
      validator: (rule, value, callback) => {
        if (value.some(item => !item.actual_value)) {
          callback(new Error('请填写所有检验项的实际值'))
        } else if (value.some(item => !item.result)) {
          callback(new Error('请选择所有检验项的结果'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 进行检验
const handleInspect = async (row) => {
  try {
    console.log('开始检验，检验单ID:', row.id);
    
    // 获取认证令牌
    const token = localStorage.getItem('token');
    if (!token) {
      ElMessage.error('未找到认证令牌，请重新登录');
      return;
    }
    
    // 从API获取检验单详情
    const response = await fetch(`${apiBaseUrl}/quality/inspections/${row.id}?with_details=true`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      ElMessage.error('认证已过期，请重新登录');
      return;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP错误: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('获取到的检验单详情:', result);
    
    if (!result.success) {
      throw new Error(result.message || '获取检验单详情失败');
    }
    
    const inspection = result.data;
    console.log('检验单数据:', inspection);
    
    // 初始化表单数据
    inspectForm.id = inspection.id;
    inspectForm.inspection_no = inspection.inspection_no;
    
    // 确保检验项目数据
    // 这部分逻辑与handleView保持一致，确保两种方式获取的检验项目一致
    let inspectionItems = inspection.items || [];
    
    // 如果没有items数据，尝试从数据库重新获取
    if (inspectionItems.length === 0) {
      console.log('检验单无检验项，尝试从API获取检验项...');
      const itemsResponse = await fetch(`${apiBaseUrl}/quality/inspections/${row.id}/items`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(err => {
        console.error('获取检验项失败:', err);
        return null;
      });
      
      if (itemsResponse && itemsResponse.ok) {
        const itemsResult = await itemsResponse.json();
        if (itemsResult.success && itemsResult.data) {
          console.log('成功从API获取检验项:', itemsResult.data);
          inspectionItems = itemsResult.data;
        }
      }
    }
    
    // 如果从API获取到了检验项目，使用这些项目
    if (inspectionItems.length > 0) {
      console.log('使用API返回的检验项目');
      inspectForm.items = inspectionItems.map(item => ({
        ...item,
        // 优先使用type_name，如果没有则使用原始type，或者通过getTypeText转换
        type: item.type_name || (typeof item.type === 'string' ? item.type : getTypeText(item.type)),
        actual_value: item.actual_value || '',
        result: item.result || '',
        remarks: item.remarks || ''
      }));
    } else {
      // 尝试获取检验模板
      try {
        // 确保有product_id
        const productId = inspection.product_id;
        console.log('检验单关联的产品ID:', productId);
        
        if (!productId) {
          console.warn('检验单没有关联产品ID，将使用默认检验项');
          throw new Error('缺少产品ID');
        }
        
        // 获取检验模板
        await fetchInspectionTemplate(productId);
        console.log('获取到的检验模板项目:', currentTemplateItems.value);
        
        if (currentTemplateItems.value && currentTemplateItems.value.length > 0) {
          console.log('使用检验模板中的检验项目');
          inspectForm.items = currentTemplateItems.value.map(item => ({
            id: item.id,
            item_name: item.item_name,
            standard: item.standard,
            type: item.type,
            actual_value: '',
            result: '',
            remarks: ''
          }));
        } else {
          throw new Error('检验模板中没有检验项目');
        }
      } catch (templateError) {
        console.error('获取或处理检验模板失败:', templateError);
        // 使用默认检验项
        console.log('使用默认检验项');
        inspectForm.items = [
          { item_name: '外观检查', standard: '无划痕、无变形', type: 'visual', actual_value: '', result: '', remarks: '' },
          { item_name: '尺寸检查', standard: '符合图纸要求', type: 'dimension', actual_value: '', result: '', remarks: '' },
          { item_name: '功能测试', standard: '功能正常', type: 'function', actual_value: '', result: '', remarks: '' }
        ];
      }
    }
    
    // 打印最终要使用的检验项目
    console.log('最终使用的检验项目:', inspectForm.items);
    
    inspectForm.inspector = '';
    inspectForm.inspectionDate = new Date();
    inspectForm.note = inspection.note || '';
    
    inspectDialogVisible.value = true;
  } catch (error) {
    console.error('获取检验单详情失败:', error);
    ElMessage.error('获取检验单详情失败: ' + error.message);
  }
}

// 提交检验结果
const submitInspection = async () => {
  if (!inspectFormRef.value) return
  
  try {
    await inspectFormRef.value.validate()
    
    // 计算检验结果状态
    const allPassed = inspectForm.items.every(item => item.result === 'passed')
    const status = allPassed ? 'passed' : 'failed'
    
    // 准备提交的数据
    const submitData = {
      id: inspectForm.id,
      inspection_no: inspectForm.inspection_no,
      items: inspectForm.items,
      inspector_name: inspectForm.inspector,
      actual_date: formatDate(inspectForm.inspectionDate),
      note: inspectForm.note,
      status: status
    }
    
    console.log('提交检验结果:', submitData)
    
    // 提交检验结果
    const response = await qualityApi.updateFinalInspection(submitData)
    
    if (response.data.success) {
      ElMessage.success('检验结果提交成功')
      inspectDialogVisible.value = false // 关闭检验对话框
      
      // 如果质检合格，自动创建入库单
      if (status === 'passed') {
        try {
          // 获取合适的仓库ID
          let locationId = 2; // 默认产品仓库ID
          
          // 尝试从检验单中获取仓库ID
          if (inspectForm.location_id) {
            locationId = inspectForm.location_id;
          } else {
            try {
              // 尝试获取默认产品仓库
              const locationsResponse = await inventoryApi.getLocations({
                type: 'product',
                status: 'active'
              });
              
              if (locationsResponse.data && Array.isArray(locationsResponse.data) && locationsResponse.data.length > 0) {
                // 使用第一个产品仓库
                locationId = locationsResponse.data[0].id;
                console.log('使用产品仓库:', locationId);
              } else if (locationsResponse.data && locationsResponse.data.items && 
                       Array.isArray(locationsResponse.data.items) && locationsResponse.data.items.length > 0) {
                // 另一种响应结构
                locationId = locationsResponse.data.items[0].id;
                console.log('使用产品仓库 (items):', locationId);
              }
            } catch (warehouseError) {
              console.error('获取仓库列表失败，使用默认仓库ID:', warehouseError);
            }
          }
          
          // 准备创建入库单的数据
          const inboundData = {
            inbound_date: formatDate(new Date()), // 使用当前日期作为入库日期
            location_id: locationId, // 使用动态获取的产品仓库ID
            operator: authStore.user?.username || authStore.user?.name || localStorage.getItem('username') || '系统',
            remark: `从质检单 ${inspectForm.inspection_no} 自动生成入库单`,
            inspection_id: inspectForm.id,
            inspection_no: inspectForm.inspection_no,
            items: inspectForm.items
              .filter(item => {
                // 只使用有效的检验项
                const isValid = item && 
                  (item.material_id || item.item_id) && 
                  (item.quantity > 0 || inspectForm.quantity > 0);
                
                if (!isValid) {
                  console.warn('跳过无效的物料项:', item);
                }
                return isValid;
              })
              .map(item => {
                // 获取商品ID
                const materialId = item.material_id || item.item_id;
                // 获取单位ID
                const unitId = item.unit_id || 1; // 默认使用1作为单位ID
                // 获取数量
                const quantity = Number(item.quantity || inspectForm.quantity || 1);
                
                return {
                  material_id: materialId,
                  quantity: quantity,
                  unit_id: unitId,
                  batch_no: item.batch_no || null,
                  remark: item.remarks || item.remark || null
                };
              })
          }

          // 如果物料项为空，则使用检验单的产品作为入库项
          if (!inboundData.items.length) {
            console.warn('检验项目中没有有效的物料项，使用检验单产品作为入库项');
            inboundData.items = [{
              material_id: inspectForm.product_id || 1, // 假设产品ID
              quantity: inspectForm.quantity || 1,
              unit_id: inspectForm.unit_id || 1,
            }];
          }
          
          console.log('创建入库单数据:', inboundData)
          
          // 调用创建入库单的API
          const inboundResponse = await inventoryApi.createInboundFromQuality(inboundData)
          
          if (inboundResponse.data.success) {
            ElMessage.success(`质检合格，自动创建入库单成功：${inboundResponse.data.data.inbound_no}`)
          } else {
            ElMessage.warning(`质检合格，但自动创建入库单失败：${inboundResponse.data.message}`)
          }
        } catch (inboundError) {
          console.error('自动创建入库单失败:', inboundError)
          ElMessage.error(`自动创建入库单失败: ${inboundError.message || '未知错误'}`)
        }
      }
      
      // 重新加载列表
      fetchData()
    } else {
      ElMessage.error(response.data.message || '提交检验结果失败')
    }
  } catch (error) {
    console.error('提交检验结果出错:', error)
    ElMessage.error('提交检验结果失败: ' + (error.message || '未知错误'))
  }
}

// 从质检单创建入库单
const createInboundFromQualityInspection = async (inspectionId) => {
  try {
    // 获取完整的检验单详情，确保有所有需要的数据
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未找到认证令牌，请先登录');
    }
    
    // 从API获取检验单详情
    const response = await fetch(`${apiBaseUrl}/quality/inspections/${inspectionId}?with_details=true`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      throw new Error('认证已过期，请重新登录');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP错误: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '获取检验单详情失败');
    }
    
    const inspectionData = result.data;
    console.log('获取到的检验单完整数据:', inspectionData);
    
    // 检查是否有关联的工单和产品信息
    if (!inspectionData.reference_id || !inspectionData.product_id) {
      throw new Error('检验单缺少关联工单或产品信息，无法自动创建入库单');
    }
    
    // 获取可用仓库
    const warehouseResponse = await fetch(`${apiBaseUrl}/inventory/locations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!warehouseResponse.ok) {
      throw new Error('获取仓库信息失败');
    }
    
    const warehouseResult = await warehouseResponse.json();
    let warehouseData = warehouseResult.data || warehouseResult;
    if (!Array.isArray(warehouseData) && warehouseData.items) {
      warehouseData = warehouseData.items;
    }
    
    if (!warehouseData || warehouseData.length === 0) {
      throw new Error('没有可用的仓库，无法创建入库单');
    }
    
    // 使用第一个可用仓库
    const warehouseId = Number(warehouseData[0].id);
    console.log('使用仓库ID:', warehouseId);
    
    // 准备入库产品数据
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // 准备入库单数据
    const inboundData = {
      inbound_date: formattedDate,
      location_id: warehouseId,
      status: 'draft',
      operator: inspectForm.inspector || '系统自动',
      remark: `由成品质检单${inspectionData.inspection_no}自动生成，检验合格的产品`,
      items: [{
        material_id: inspectionData.product_id,
        material_code: inspectionData.product_code || '',
        material_name: inspectionData.product_name || inspectionData.item_name,
        specification: inspectionData.specification || '',
        quantity: Number(inspectionData.quantity) || 0,
        unit_id: inspectionData.unit_id || 1,
        unit_name: inspectionData.unit || '个',
        batch_no: inspectionData.batch_no || '',
        production_date: formattedDate,
        remarks: `来自质检单${inspectionData.inspection_no}的合格产品`
      }],
      // 额外信息
      from_inspection: true,
      inspection_id: inspectionData.id,
      inspection_no: inspectionData.inspection_no,
      reference_id: inspectionData.reference_id,
      reference_no: inspectionData.reference_no
    };
    
    console.log('提交入库单数据:', inboundData);
    
    // 调用API创建入库单
    const inboundResponse = await fetch(`${apiBaseUrl}/inventory/inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(inboundData)
    });
    
    if (!inboundResponse.ok) {
      const errorText = await inboundResponse.text();
      throw new Error(`创建入库单失败: ${inboundResponse.status} ${errorText}`);
    }
    
    const inboundResult = await inboundResponse.json();
    
    if (inboundResult.success) {
      const inboundNo = inboundResult.data?.inbound_no || '未知单号';
      ElMessage.success(`检验合格！已自动创建入库单：${inboundNo}`);
      // 打开入库单页面
      window.open(`/inventory/inbound?inbound_no=${inboundNo}`, '_blank');
    } else {
      throw new Error(inboundResult.message || '创建入库单失败');
    }
  } catch (error) {
    console.error('创建入库单失败:', error);
    throw error;
  }
}

// 处理下拉菜单命令
const handleDropdownCommand = (command, row) => {
  if (command === 'report') {
    handleReport(row)
  } else if (command === 'review') {
    handleReview(row)
  } else if (command === 'certificate') {
    handleGenerateCertificate(row)
  } else if (command === 'print') {
    handlePrint(row)
  }
}

// 查看报告
const handleReport = (row) => {
  // 先获取检验单详情，确保数据完整
  handleGetInspectionDetail(row.id).then(() => {
    reportDialogVisible.value = true;
  }).catch(error => {
    ElMessage.error('获取检验报告数据失败: ' + error.message);
  });
}

// 复检
const handleReview = (row) => {
  ElMessageBox.confirm('确定要对该检验单进行复检吗?', '复检确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 先获取检验单详情
    handleGetInspectionDetail(row.id).then(() => {
      // 复制当前检验单信息作为新的检验，状态改为review
      inspectForm.id = currentInspection.value.id;
      inspectForm.inspection_no = currentInspection.value.inspection_no;
      inspectForm.items = currentInspection.value.items.map(item => ({
        ...item,
        actual_value: item.actual_value || '',
        result: '',
        remarks: ''
      }));
      inspectForm.inspector = '';
      inspectForm.inspectionDate = new Date();
      inspectForm.note = currentInspection.value.note + ' (复检)';
      
      inspectDialogVisible.value = true;
    }).catch(error => {
      ElMessage.error('准备复检失败: ' + error.message);
    });
  }).catch(() => {
    // 用户取消操作
  });
}

// 获取检验单详情的通用方法
const handleGetInspectionDetail = async (id) => {
  try {
    // 获取认证令牌
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未找到认证令牌，请先登录');
    }
    
    // 从API获取检验单详情
    const response = await fetch(`${apiBaseUrl}/quality/inspections/${id}?with_details=true`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      throw new Error('认证已过期，请重新登录');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP错误: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '获取检验单详情失败');
    }
    
    // 确保currentInspection中包含items属性
    currentInspection.value = {
      ...result.data,
      items: result.data.items || []
    };
    
    // 如果没有items数据，尝试从数据库重新获取
    if (!currentInspection.value.items || currentInspection.value.items.length === 0) {
      const itemsResponse = await fetch(`${apiBaseUrl}/quality/inspections/${id}/items`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (itemsResponse.ok) {
        const itemsResult = await itemsResponse.json();
        if (itemsResult.success && itemsResult.data) {
          currentInspection.value.items = itemsResult.data;
        }
      }
      
      // 如果仍然没有检验项，使用默认项
      if (!currentInspection.value.items || currentInspection.value.items.length === 0) {
        currentInspection.value.items = [
          { item_name: '外观检查', standard: '无明显缺陷', type: 'visual', result: '-' },
          { item_name: '尺寸检查', standard: '符合图纸要求', type: 'dimension', result: '-' },
          { item_name: '功能测试', standard: '功能正常', type: 'function', result: '-' }
        ];
      }
    }
    
    return currentInspection.value;
  } catch (error) {
    console.error('获取检验单详情失败:', error);
    throw error;
  }
}

// 生成合格证
const handleGenerateCertificate = (row) => {
  // 检查检验单是否合格
  if (row.status !== 'passed') {
    ElMessage.warning('只能为合格的检验单生成合格证书');
    return;
  }
  
  // 获取检验单详情并显示合格证书
  handleGetInspectionDetail(row.id).then(() => {
    certificateDialogVisible.value = true;
  }).catch(error => {
    ElMessage.error('获取合格证书数据失败: ' + error.message);
  });
}

// 打印报告
const handlePrint = (row) => {
  // 获取检验单详情并显示打印预览
  handleGetInspectionDetail(row.id).then(() => {
    reportDialogVisible.value = true;
    // 延迟一下再执行打印，确保内容已经渲染
    setTimeout(() => {
      handlePrintReport();
    }, 500);
  }).catch(error => {
    ElMessage.error('获取打印数据失败: ' + error.message);
  });
}

// 打印报告实现
const handlePrintReport = () => {
  // 获取报告内容
  const reportContent = document.querySelector('.report-container');
  if (!reportContent) {
    ElMessage.error('无法获取报告内容');
    return;
  }
  
  // 创建打印窗口
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    ElMessage.error('无法创建打印窗口，请检查浏览器是否阻止了弹出窗口');
    return;
  }
  
  // 添加样式
  const style = printWindow.document.createElement('style');
  style.textContent = `
    body { font-family: Arial, sans-serif; margin: 20px; }
    .text-center { text-align: center; }
    .report-header { margin-bottom: 20px; }
    .info-row { margin: 8px 0; }
    .info-label { font-weight: bold; display: inline-block; width: 120px; }
    .report-items { margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .report-signatures { margin-top: 50px; display: flex; justify-content: space-between; }
    .signature-item { width: 45%; }
    @media print { button { display: none; } }
  `;
  
  // 设置标题
  printWindow.document.title = `检验报告 - ${currentInspection.value.inspection_no}`;
  
  // 添加内容
  printWindow.document.body.innerHTML = reportContent.innerHTML;
  printWindow.document.head.appendChild(style);
  
  // 添加打印脚本
  const script = printWindow.document.createElement('script');
  script.textContent = 'window.onload = function() { window.print(); }';
  printWindow.document.body.appendChild(script);
}

// 打印合格证书
const handlePrintCertificate = () => {
  // 获取证书内容
  const certificateContent = document.querySelector('.certificate-container');
  if (!certificateContent) {
    ElMessage.error('无法获取证书内容');
    return;
  }
  
  // 创建打印窗口
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    ElMessage.error('无法创建打印窗口，请检查浏览器是否阻止了弹出窗口');
    return;
  }
  
  // 添加样式
  const style = printWindow.document.createElement('style');
  style.textContent = `
    body { font-family: Arial, sans-serif; margin: 20px; }
    .text-center { text-align: center; }
    .certificate-header { margin-bottom: 20px; }
    .info-row { margin: 12px 0; }
    .info-label { font-weight: bold; display: inline-block; width: 120px; }
    .certificate-declaration { margin: 30px 0; }
    .certificate-seal { margin-top: 80px; display: flex; justify-content: space-between; }
    .seal-item { width: 30%; }
    .company-seal { margin: 20px 0; height: 100px; border: 2px dashed #999; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    @media print { button { display: none; } }
  `;
  
  // 设置标题
  printWindow.document.title = `合格证书 - ${currentInspection.value.inspection_no}`;
  
  // 添加内容
  printWindow.document.body.innerHTML = certificateContent.innerHTML;
  printWindow.document.head.appendChild(style);
  
  // 添加打印脚本
  const script = printWindow.document.createElement('script');
  script.textContent = 'window.onload = function() { window.print(); }';
  printWindow.document.body.appendChild(script);
}

// 创建入库单
const createInventoryInbound = async () => {
  try {
    // 准备入库单数据
    const inboundData = {
      inbound_date: formatDate(new Date()),
      location_id: defaultLocationId.value,
      operator: authStore.user?.username || authStore.user?.name || localStorage.getItem('username') || '系统',
      remark: `由质检单 ${inspectForm.inspection_no} 自动生成`,
      inspection_id: inspectForm.id,
      inspection_no: inspectForm.inspection_no,
      items: inspectForm.items.map(item => ({
        material_id: item.material_id,
        quantity: item.quantity,
        unit_id: item.unit_id,
        remark: item.note
      }))
    }
    
    console.log('准备创建入库单数据:', inboundData)
    
    // 调用API创建入库单
    const response = await inventoryApi.createInboundFromQuality(inboundData)
    
    if (response && response.data && response.data.success) {
      ElMessage.success('质检合格，入库单已自动创建')
      // 刷新数据
      fetchData()
    } else {
      ElMessage.warning('入库单创建失败，请手动创建入库单')
      console.error('创建入库单失败:', response)
    }
  } catch (error) {
    console.error('创建入库单异常:', error)
    ElMessage.error('创建入库单时发生错误')
  }
}
</script>

<style scoped>
.inspection-container {
  padding: 16px;
}

.search-container {
  margin-bottom: 16px;
}

.search-buttons {
  display: flex;
  gap: 8px;
}

.stat-cards {
  display: flex;
  margin-bottom: 16px;
  gap: 16px;
}

.stat-card {
  background-color: #fff;
  border-radius: 4px;
  padding: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  flex: 1;
  text-align: center;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.unit-text {
  margin-left: 8px;
}

.inspection-criteria {
  margin-top: 16px;
}

.criteria-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.criteria-item {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #eee;
}

.criteria-item:last-child {
  border-bottom: none;
}

.certificate-container {
  padding: 20px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #f7f7f7;
}

.certificate-header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 2px solid #409EFF;
}

.certificate-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 10px;
}

/* 添加表格操作按钮的统一样式 */
:deep(.el-table .el-button) {
  vertical-align: middle !important;
}

:deep(.el-table .el-dropdown .el-button) {
  vertical-align: middle !important;
  padding: 2px 4px !important;
  line-height: 1.5 !important;
  height: 24px !important;
}

/* 确保所有按钮图标垂直对齐 */
:deep(.el-button .el-icon) {
  vertical-align: middle !important;
}
</style> 