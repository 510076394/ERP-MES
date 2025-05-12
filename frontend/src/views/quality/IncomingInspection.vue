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
        <div class="stat-value">{{ inspectionStats.partial }}</div>
        <div class="stat-label">部分合格</div>
      </div>
    </div>

    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>来料检验管理</span>
        </div>
      </template>
      
      <!-- 搜索表单 -->
      <div class="search-container">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input
              v-model="searchKeyword"
              placeholder="请输入检验单号/物料名称/供应商"
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
              <el-option label="部分合格" value="partial" />
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
        <el-table-column prop="inspectionNo" label="检验单号" min-width="120" />
        <el-table-column prop="purchaseOrderNo" label="采购单号" min-width="150" />
        <el-table-column prop="product_name" label="物料名称" min-width="180">
          <template #default="{ row }">
            {{ row.product_name || extractMaterialName(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="product_code" label="产品型号" min-width="120">
          <template #default="{ row }">
            {{ row.product_code || row.specs || row.item_specs || row.material?.specs || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="supplierName" label="供应商" min-width="220" />
        <el-table-column prop="batchNo" label="批次号" min-width="120" />
        <el-table-column prop="quantity" label="数量" min-width="100">
          <template #default="scope">
            {{ scope.row.quantity }} {{ scope.row.unit }}
          </template>
        </el-table-column>
        <el-table-column prop="inspectionDate" label="检验日期" min-width="120">
          <template #default="scope">
            {{ formatDate(scope.row.inspectionDate) }}
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
              <el-button link type="success" size="small">
                <el-icon><arrow-down /></el-icon>更多
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="report">查看报告</el-dropdown-item>
                  <el-dropdown-item v-if="scope.row.status === 'failed'" command="review">复检</el-dropdown-item>
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
      title="新建来料检验单"
      width="650px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="采购单号" prop="purchaseOrderNo">
          <el-select 
            v-model="form.purchaseOrderNo" 
            placeholder="选择采购单号"
            filterable
            @change="handlePurchaseOrderChange"
            :loading="loading"
            @focus="fetchPurchaseOrders"
          >
            <el-option 
              v-for="order in purchaseOrderOptions" 
              :key="order.id" 
              :label="order.orderNo" 
              :value="order.orderNo"
            >
              <span>{{ order.orderNo }} - {{ order.supplierName }}</span>
            </el-option>
            <template #empty>
              <div v-if="loading">加载中...</div>
              <div v-else>暂无数据</div>
            </template>
          </el-select>
        </el-form-item>
        
        <el-form-item label="供应商" prop="supplierName">
          <el-input v-model="form.supplierName" disabled />
        </el-form-item>
        
        <el-form-item label="物料" prop="materialId">
          <el-select 
            v-model="form.materialId" 
            placeholder="选择物料"
            filterable
            @change="handleMaterialChange"
          >
            <el-option 
              v-for="material in materialOptions" 
              :key="material.id" 
              :label="material.name" 
              :value="material.id" 
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="物料型号" prop="specs">
          <el-input v-model="form.specs" placeholder="物料型号" disabled />
        </el-form-item>
        
        <el-form-item label="批次号" prop="batchNo">
          <el-input v-model="form.batchNo" placeholder="请输入批次号" />
        </el-form-item>
        
        <el-form-item label="检验数量" prop="quantity">
          <el-input-number v-model="form.quantity" :min="1" />
          <span class="unit-text">{{ form.unit }}</span>
        </el-form-item>
        
        <el-form-item label="到货日期" prop="arrivalDate">
          <el-date-picker 
            v-model="form.arrivalDate"
            type="date"
            placeholder="选择到货日期"
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
    
    <!-- 检验单详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`检验单详情 - ${currentInspection?.inspectionNo}`"
      width="800px"
      destroy-on-close
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="检验单号">{{ currentInspection?.inspectionNo }}</el-descriptions-item>
        <el-descriptions-item label="采购单号">{{ currentInspection?.purchaseOrderNo }}</el-descriptions-item>
        <el-descriptions-item label="物料名称">{{ currentInspection?.product_name || currentInspection?.materialName }}</el-descriptions-item>
        <el-descriptions-item label="产品型号">{{ currentInspection?.product_code || currentInspection?.specs || currentInspection?.item_specs || extractMaterialSpecs(currentInspection) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ currentInspection?.supplierName }}</el-descriptions-item>
        <el-descriptions-item label="批次号">{{ currentInspection?.batchNo }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ currentInspection?.quantity }} {{ currentInspection?.unit }}</el-descriptions-item>
        <el-descriptions-item label="检验日期">{{ currentInspection?.inspectionDate }}</el-descriptions-item>
        <el-descriptions-item label="检验状态">
          <el-tag :type="getStatusType(currentInspection?.status)">
            {{ getStatusText(currentInspection?.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="检验员">{{ currentInspection?.inspector || '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="currentInspection?.is_review" label="复检信息" :span="2">
          <div class="review-info">
            <el-tag type="warning">已复检</el-tag>
            <span class="review-date">复检日期: {{ formatDate(currentInspection?.review_date) }}</span>
            <span class="review-reason">原因: {{ getReviewReasonText(currentInspection?.review_reason) }}</span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ currentInspection?.note || '-' }}</el-descriptions-item>
      </el-descriptions>
      
      <!-- 检验项列表 -->
      <div class="inspection-items" v-if="currentInspection?.items?.length">
        <h3>检验项</h3>
        <el-table :data="currentInspection.items" border>
          <el-table-column prop="item_name" label="检验项目" min-width="150" />
          <el-table-column prop="standard" label="检验标准" min-width="150" />
          <el-table-column prop="actual_value" label="实际值" min-width="120" />
          <el-table-column prop="result" label="结果" min-width="100">
            <template #default="scope">
              <el-tag :type="scope.row.result === 'passed' ? 'success' : 'danger'">
                {{ scope.row.result === 'passed' ? '合格' : '不合格' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remarks" label="备注" min-width="150" />
        </el-table>
      </div>
    </el-dialog>
    
    <!-- 检验操作弹窗 -->
    <el-dialog
      v-model="inspectDialogVisible"
      :title="`检验操作 - ${currentInspection?.inspectionNo}`"
      width="800px"
      destroy-on-close
    >
      <el-form ref="inspectFormRef" :model="inspectForm" :rules="inspectRules" label-width="100px">
        <el-form-item label="检验项目" prop="items">
          <div class="inspection-items">
            <el-table :data="inspectForm.items" border>
              <el-table-column prop="item_name" label="检验项目" min-width="150" />
              <el-table-column prop="standard" label="检验标准" min-width="150" />
              <el-table-column prop="actual_value" label="实际值" min-width="120">
                <template #default="scope">
                  <el-input v-model="scope.row.actual_value" placeholder="请输入实际值" />
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
              <el-table-column prop="remarks" label="备注" min-width="150">
                <template #default="scope">
                  <el-input v-model="scope.row.remarks" placeholder="请输入备注" />
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form-item>
        
        <el-form-item label="检验员" prop="inspector_name">
          <el-input v-model="inspectForm.inspector_name" placeholder="请输入检验员姓名" />
        </el-form-item>
        
        <el-form-item label="检验日期" prop="inspectionDate">
          <el-date-picker
            v-model="inspectForm.inspectionDate"
            type="date"
            placeholder="选择检验日期"
          />
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
          <el-button type="primary" @click="submitInspection">提交检验</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 添加模板选择对话框 -->
    <el-dialog
      v-model="selectTemplateDialogVisible"
      title="选择检验模板"
      width="600px"
    >
      <div class="template-selection">
        <p class="tip">该物料有多个检验模板，请选择一个:</p>
        <el-radio-group v-model="inspectionTemplateId">
          <div v-for="template in inspectionTemplates" :key="template.id" class="template-option">
            <el-radio :label="template.id">
              <div class="template-info">
                <span class="template-name">{{ template.template_name }}</span>
                <span class="template-desc">{{ template.description }}</span>
                <span class="template-items">检验项: {{ template.items?.length || 0 }}项</span>
                <el-tag v-if="template.is_default" type="success" size="small" style="margin-left: 8px;">默认</el-tag>
              </div>
            </el-radio>
          </div>
        </el-radio-group>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="selectTemplateDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="selectTemplate(inspectionTemplateId)">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 检验报告对话框 -->
    <el-dialog
      v-model="reportDialogVisible"
      :title="`检验报告 - ${currentInspection?.inspectionNo}`"
      width="800px"
      destroy-on-close
    >
      <div ref="reportRef" class="inspection-report">
        <div class="report-header">
          <div class="report-title">来料检验报告</div>
          <div class="report-no">No. {{currentInspection?.inspectionNo}}</div>
        </div>
        
        <div class="report-info">
          <div class="report-info-item">
            <span class="report-info-label">物料名称:</span>
            <span>{{currentInspection?.product_name || currentInspection?.materialName}}</span>
          </div>
          <div class="report-info-item">
            <span class="report-info-label">产品型号:</span>
            <span>{{currentInspection?.product_code || currentInspection?.specs || currentInspection?.item_specs || extractMaterialSpecs(currentInspection) || '-'}}</span>
          </div>
          <div class="report-info-item">
            <span class="report-info-label">供应商:</span>
            <span>{{currentInspection?.supplierName}}</span>
          </div>
          <div class="report-info-item">
            <span class="report-info-label">采购单号:</span>
            <span>{{currentInspection?.purchaseOrderNo}}</span>
          </div>
          <div class="report-info-item">
            <span class="report-info-label">批次号:</span>
            <span>{{currentInspection?.batchNo}}</span>
          </div>
          <div class="report-info-item">
            <span class="report-info-label">检验数量:</span>
            <span>{{currentInspection?.quantity}} {{currentInspection?.unit}}</span>
          </div>
          <div class="report-info-item">
            <span class="report-info-label">检验日期:</span>
            <span>{{formatDate(currentInspection?.inspectionDate)}}</span>
          </div>
          <div class="report-info-item">
            <span class="report-info-label">检验员:</span>
            <span>{{currentInspection?.inspector}}</span>
          </div>
          <div class="report-info-item">
            <span class="report-info-label">检验结果:</span>
            <span>
              <el-tag :type="getStatusType(currentInspection?.status)">
                {{getStatusText(currentInspection?.status)}}
              </el-tag>
            </span>
          </div>
        </div>
        
        <div class="report-standards">
          <h3>检验项目</h3>
          <el-table :data="currentInspection?.items" border>
            <el-table-column prop="item_name" label="检验项目" min-width="150" />
            <el-table-column prop="standard" label="检验标准" min-width="150" />
            <el-table-column prop="type" label="检验类型" min-width="100">
              <template #default="scope">
                {{getInspectionTypeText(scope.row.type)}}
              </template>
            </el-table-column>
            <el-table-column prop="is_critical" label="关键项" width="80">
              <template #default="scope">
                <el-tag size="small" :type="scope.row.is_critical ? 'danger' : 'info'">
                  {{scope.row.is_critical ? '是' : '否'}}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="actual_value" label="实际值" min-width="120" />
            <el-table-column prop="result" label="结果" min-width="100">
              <template #default="scope">
                <el-tag :type="scope.row.result === 'passed' ? 'success' : 'danger'">
                  {{scope.row.result === 'passed' ? '合格' : '不合格'}}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remarks" label="备注" min-width="150" />
          </el-table>
        </div>
        
        <div class="report-result">
          <div class="report-conclusion">
            <h3>检验结论</h3>
            <p>根据检验结果，本批次物料
              <el-tag :type="getStatusType(currentInspection?.status)">
                {{getStatusText(currentInspection?.status)}}
              </el-tag>
            </p>
            <p v-if="currentInspection?.note">备注: {{currentInspection?.note}}</p>
          </div>
        </div>
        
        <div class="report-signature">
          <div class="signature-item">
            <p>检验员: {{currentInspection?.inspector}}</p>
            <p>日期: {{formatDate(currentInspection?.inspectionDate)}}</p>
          </div>
          <div class="signature-item">
            <p>审核人: ____________</p>
            <p>日期: ____________</p>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reportDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="printReport">打印报告</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 复检对话框 -->
    <el-dialog
      v-model="reviewDialogVisible"
      :title="`复检操作 - ${currentInspection?.inspectionNo}`"
      width="800px"
      destroy-on-close
    >
      <el-alert
        type="warning"
        :closable="false"
        show-icon
      >
        <p>您正在对不合格检验单进行复检操作，复检后的结果将覆盖原检验结果。</p>
      </el-alert>
      
      <el-form ref="reviewFormRef" :model="reviewForm" :rules="reviewRules" label-width="100px" style="margin-top: 20px;">
        <el-form-item label="检验项目" prop="items">
          <div class="inspection-items">
            <el-table :data="reviewForm.items" border>
              <el-table-column prop="item_name" label="检验项目" min-width="150" />
              <el-table-column prop="standard" label="检验标准" min-width="150" />
              <el-table-column prop="result" label="原结果" width="120">
                <template #default="scope">
                  <el-tag :type="scope.row.original_result === 'passed' ? 'success' : 'danger'">
                    {{ scope.row.original_result === 'passed' ? '合格' : '不合格' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="actual_value" label="实际值" min-width="120">
                <template #default="scope">
                  <el-input v-model="scope.row.actual_value" placeholder="请输入实际值" />
                </template>
              </el-table-column>
              <el-table-column prop="result" label="复检结果" min-width="100">
                <template #default="scope">
                  <el-select v-model="scope.row.result" placeholder="选择结果">
                    <el-option label="合格" value="passed" />
                    <el-option label="不合格" value="failed" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="remarks" label="备注" min-width="150">
                <template #default="scope">
                  <el-input v-model="scope.row.remarks" placeholder="请输入备注" />
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form-item>
        
        <el-form-item label="复检人员" prop="inspector_name">
          <el-input v-model="reviewForm.inspector_name" placeholder="请输入复检人员姓名" />
        </el-form-item>
        
        <el-form-item label="复检日期" prop="inspectionDate">
          <el-date-picker
            v-model="reviewForm.inspectionDate"
            type="date"
            placeholder="选择复检日期"
          />
        </el-form-item>
        
        <el-form-item label="复检原因" prop="reviewReason">
          <el-select v-model="reviewForm.reviewReason" placeholder="选择复检原因" style="width: 100%">
            <el-option label="初检仪器校准有误" value="instrument_error" />
            <el-option label="初检方法不当" value="method_error" />
            <el-option label="供应商申请复检" value="supplier_request" />
            <el-option label="新批次替代" value="new_batch" />
            <el-option label="其他原因" value="other" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="备注" prop="note">
          <el-input
            v-model="reviewForm.note"
            type="textarea"
            placeholder="请输入备注信息"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reviewDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitReview">提交复检</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, Refresh, Plus, ArrowDown, View, Check } from '@element-plus/icons-vue'
import { 
  ElTable, 
  ElTableColumn, 
  ElForm, 
  ElFormItem, 
  ElInput, 
  ElButton, 
  ElSelect, 
  ElOption, 
  ElPagination, 
  ElCard, 
  ElDatePicker, 
  ElDialog, 
  ElInputNumber, 
  ElTag, 
  ElDescriptions, 
  ElDescriptionsItem, 
  ElMessage,
  ElMessageBox
} from 'element-plus'
import axios from 'axios'
import { api, qualityApi, purchaseApi, baseDataApi } from '@/services/api'
import dayjs from 'dayjs'
import { getInspectionTypeText, getStatusType, getStatusText } from './inspection-text-helper'
import { useRouter } from 'vue-router'

const router = useRouter()

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
  purchaseOrderNo: '',
  purchaseOrderId: '',
  supplierName: '',
  supplierId: '',
  materialId: '',
  materialName: '',
  materialCode: '',
  specs: '',
  batchNo: '',
  quantity: 1,
  unit: '',
  arrivalDate: new Date(),
  note: ''
})

// 表单验证规则
const rules = {
  purchaseOrderNo: [{ required: true, message: '请选择采购单号', trigger: 'change' }],
  materialId: [{ required: true, message: '请选择物料', trigger: 'change' }],
  materialName: [{ required: true, message: '物料名称不能为空', trigger: 'change' }],
  batchNo: [{ required: true, message: '请输入批次号', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入检验数量', trigger: 'blur' }],
  arrivalDate: [{ required: true, message: '请选择到货日期', trigger: 'change' }]
}

// 采购单选项和物料选项
const purchaseOrderOptions = ref([])
const materialOptions = ref([])

// 详情弹窗相关
const detailDialogVisible = ref(false)
const currentInspection = ref(null)

// 检验弹窗相关
const inspectDialogVisible = ref(false)
const inspectFormRef = ref(null)
const inspectForm = reactive({
  items: [],
  inspector_name: '',
  inspectionDate: new Date(),
  note: ''
})

// 检验表单验证规则
const inspectRules = {
  inspector_name: [{ required: true, message: '请输入检验员姓名', trigger: 'blur' }],
  inspectionDate: [{ required: true, message: '请选择检验日期', trigger: 'change' }],
  items: [
    {
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请填写检验项'))
        } else if (value.some(item => !item.actual_value || !item.result)) {
          callback(new Error('请填写所有检验项的实际值和结果'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 添加表格高度自适应
const tableHeight = ref('calc(100vh - 280px)')

// 添加检验单统计数据
const inspectionStats = ref({
  total: 0,
  pending: 0,
  passed: 0,
  failed: 0,
  partial: 0
})

// 添加检验模板相关数据
const inspectionTemplateId = ref(null)
const inspectionTemplates = ref([])
const currentTemplateItems = ref([])
const selectTemplateDialogVisible = ref(false)

// 报告对话框相关
const reportDialogVisible = ref(false)
const reportRef = ref(null)

// 复检对话框相关
const reviewDialogVisible = ref(false)
const reviewFormRef = ref(null)
const reviewForm = reactive({
  items: [],
  inspector_name: '',
  inspectionDate: new Date(),
  reviewReason: '',
  note: ''
})

// 复检表单验证规则
const reviewRules = {
  inspector_name: [{ required: true, message: '请输入复检人员姓名', trigger: 'blur' }],
  inspectionDate: [{ required: true, message: '请选择复检日期', trigger: 'change' }],
  reviewReason: [{ required: true, message: '请选择复检原因', trigger: 'change' }],
  items: [
    {
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请填写检验项'))
        } else if (value.some(item => !item.actual_value || !item.result)) {
          callback(new Error('请填写所有检验项的实际值和结果'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 计算统计数据的方法
const calculateInspectionStats = () => {
  const stats = {
    total: inspectionList.value.length,
    pending: 0,
    passed: 0,
    failed: 0,
    partial: 0
  }
  
  inspectionList.value.forEach(inspection => {
    if (inspection.status === 'pending') stats.pending++
    else if (inspection.status === 'passed') stats.passed++
    else if (inspection.status === 'failed') stats.failed++
    else if (inspection.status === 'partial') stats.partial++
  })
  
  inspectionStats.value = stats
}

// 添加复检原因文本转换方法
const getReviewReasonText = (reason) => {
  const reasonMap = {
    'instrument_error': '初检仪器校准有误',
    'method_error': '初检方法不当',
    'supplier_request': '供应商申请复检',
    'new_batch': '新批次替代',
    'other': '其他原因'
  }
  return reasonMap[reason] || '未知原因'
}

// 添加统一的日期格式化方法
const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

// 初始化
onMounted(() => {
  fetchData()
  fetchPurchaseOrders()
})

// 获取API请求参数的辅助函数
const getApiParams = (baseParams = {}) => {
  return { 
    params: {
      ...baseParams,
      include_supplier: true, // 请求包含供应商详细信息
      include_reference: true, // 请求包含关联的参考数据
      with_details: true, // 请求包含详细信息
      include_material: true // 添加请求包含物料信息的参数
    }
  };
};

// 获取检验单列表
const fetchData = async () => {
  try {
    loading.value = true;
    
    // 构造过滤参数
    const filters = {
      keyword: searchKeyword.value,
      status: statusFilter.value,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
      include_supplier: true,
      include_reference: true,
      with_details: true,
      include_material: true // 添加请求包含物料信息的参数
    };
    
    const response = await qualityApi.getIncomingInspections(getApiParams(filters).params);
    
    if (response.data && response.data.success) {
      inspectionList.value = response.data.data.map(item => {
        // 映射数据结构更简洁明了
        const mappedItem = {
          ...item,
          inspectionNo: item.inspection_no,
          purchaseOrderNo: item.reference_no,
          materialName: extractMaterialName(item),
          specs: item.specs || item.item_specs || (item.material && item.material.specs) || extractMaterialSpecs(item),
          supplierName: extractSupplierName(item),
          batchNo: item.batch_no,
          inspectionDate: item.actual_date || item.planned_date,
          inspector: item.inspector_name || '-'
        }
        return mappedItem;
      });
      total.value = response.data.total;
      
      // 异步加载缺失的物料名称和型号信息
      setTimeout(async () => {
        // 筛选出需要加载物料信息的记录
        const itemsNeedMaterialInfo = inspectionList.value.filter(item => 
          item.material_id && 
          (!item.materialName || 
           item.materialName === '-' ||
           item.materialName.startsWith('物料 ') || 
           item.materialName.includes('采购单') ||
           item.materialName.includes('PO') ||
           !item.specs)
        );
        
        if (itemsNeedMaterialInfo.length > 0) {
          // 创建物料ID到检验单的映射
          const materialMap = new Map();
          itemsNeedMaterialInfo.forEach(item => {
            if (item.material_id) {
              materialMap.set(item.material_id, item);
            }
          });
          
          // 获取唯一的物料ID列表
          const materialIds = [...materialMap.keys()];
          
          // 异步加载每个物料的信息
          for (const materialId of materialIds) {
            try {
              const materialInfo = await getMaterialInfo(materialId);
              if (materialInfo) {
                // 更新所有使用此物料ID的记录
                inspectionList.value.forEach(item => {
                  if (item.material_id === materialId) {
                    if (materialInfo.name) {
                      item.materialName = materialInfo.name;
                    }
                    
                    if (materialInfo.specs && (!item.specs || item.specs === '-')) {
                      item.specs = materialInfo.specs;
                    }
                  }
                });
              }
            } catch (error) {
              console.error(`加载物料ID ${materialId} 信息失败:`, error);
            }
          }
        }
      }, 100);
    } else {
      console.error('检验单列表API返回格式错误:', response.data);
      ElMessage.error(response.data.message || '获取检验单列表失败');
    }

    // 在数据加载完成后计算统计数据
    calculateInspectionStats();
  } catch (error) {
    console.error('获取检验单列表失败:', error);
    ElMessage.error(`获取检验单列表失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 物料信息获取函数
const getMaterialInfo = async (materialId) => {
  if (!materialId) return null;
  
  try {
    // 检查缓存中是否存在
    if (materialCache.value[materialId]) {
      return materialCache.value[materialId];
    }
    
    const response = await baseDataApi.getMaterial(materialId);
    
    if (response && response.data) {
      const materialData = response.data;
      // 确保name字段存在
      if (!materialData.name && materialData.material_name) {
        materialData.name = materialData.material_name;
      }
      // 更新缓存
      materialCache.value[materialId] = materialData;
      return materialData;
    }
    return null;
  } catch (error) {
    console.error(`获取物料ID ${materialId} 信息失败:`, error);
    return null;
  }
};

// 物料缓存
const materialCache = ref({});

// 物料名称提取函数
const extractMaterialName = (item) => {
  // 优先使用product_name字段
  if (item.product_name && item.product_name !== '-') {
    return item.product_name;
  }
  
  // 优先检查materials表中的name字段
  if (item.material && item.material.name) {
    return item.material.name;
  }
  
  // 检查直接属性
  if (item.materialName && item.materialName !== '-') {
    return item.materialName;
  }
  
  // 检查material_name属性
  if (item.material_name && item.material_name !== '-') {
    return item.material_name;
  }
  
  if (item.item_name && item.item_name !== '-' && !item.item_name.includes('来自采购单')) {
    return item.item_name;
  }
  
  // 从reference_data中提取物料信息(采购单物料信息)
  if (item.reference_data) {
    if (item.reference_data.items && item.reference_data.items.length > 0) {
      // 采购单物料项，获取第一个物料信息
      const firstItem = item.reference_data.items[0];
      if (firstItem.material_name) return firstItem.material_name;
      if (firstItem.material_code) return firstItem.material_code;
    }
    
    // 直接从reference_data获取
    if (item.reference_data.material_name) return item.reference_data.material_name;
    if (item.reference_data.material_code) return item.reference_data.material_code;
  }
  
  // 优先使用物料编码
  if (item.material_code && item.material_code !== '-') {
    return item.material_code;
  }
  
  // 如果有materialId或material_id，但没有名称，尝试从API获取
  const materialId = item.materialId || item.material_id;
  if (materialId) {
    // 检查缓存
    if (materialCache.value[materialId]) {
      const cachedData = materialCache.value[materialId];
      // 优先使用name字段
      const cachedName = cachedData.name;
      return cachedName;
    }
    
    // 异步加载物料信息
    setTimeout(async () => {
      try {
        const materialInfo = await getMaterialInfo(materialId);
        if (materialInfo) {
          // 优先使用name字段，materials表的主要字段
          const materialName = materialInfo.name;
          // 更新数据，但不立即返回（异步操作）
          if (Array.isArray(inspectionList.value)) {
            inspectionList.value.forEach(inspection => {
              if ((inspection.materialId === materialId || inspection.material_id === materialId) &&
                  (inspection.materialName === '-' || !inspection.materialName || 
                   inspection.item_name === '-' || !inspection.item_name || 
                   inspection.item_name.includes('来自采购单') ||
                   inspection.item_name.includes('物料(PO'))) {
                inspection.materialName = materialName;
                inspection.item_name = materialName;
              }
            });
          }
        }
      } catch (error) {
        console.error(`获取物料ID ${materialId} 信息失败:`, error);
      }
    }, 50);
  }
  
  // 最后的后备选项
  return item.item_code || '未知物料';
};

// 供应商名称提取函数
const extractSupplierName = (data) => {
  // 定义一个简单的获取嵌套属性的函数
  const getNestedProperty = (obj, path) => {
    if (!obj) return undefined;
    const props = path.split('.');
    return props.reduce((acc, prop) => acc && acc[prop], obj);
  };

  // 按优先级顺序检查所有可能的供应商字段位置
  const supplierSources = [
    // 1. 直接字段 - 最高优先级
    data.supplier_name,
    data.supplierName,
    
    // 2. 嵌套在supplier对象中
    getNestedProperty(data, 'supplier.name'),
    getNestedProperty(data, 'supplier.supplier_name'),
    
    // 3. 嵌套在参考数据中
    getNestedProperty(data, 'reference_data.supplier_name'),
    getNestedProperty(data, 'reference_data.supplier.name'),
    
    // 4. 其他可能位置
    getNestedProperty(data, 'po_data.supplier_name'),
    getNestedProperty(data, 'po_data.supplier.name')
  ];
  
  // 返回第一个非空值，或默认值
  const supplierName = supplierSources.find(val => val && val.trim !== '');
  return supplierName || '-';
};

// 处理搜索按钮点击
const handleSearch = () => {
  currentPage.value = 1;
  fetchData();
};

// 处理刷新按钮点击
const handleRefresh = () => {
  searchKeyword.value = '';
  statusFilter.value = '';
  dateRange.value = [];
  currentPage.value = 1;
  fetchData();
};

// 处理页码改变
const handleSizeChange = (val) => {
  pageSize.value = val;
  fetchData();
};

// 处理页码改变
const handleCurrentChange = (val) => {
  currentPage.value = val;
  fetchData();
};

// 获取采购单数据的函数
const fetchPurchaseOrders = async () => {
  try {
    loading.value = true;
    const response = await purchaseApi.getOrders({
      status: 'approved', // 只获取已审批的采购单
      pageSize: 100 // 获取足够多的记录以供选择
    });
    
    if (response.data && response.data.items) {
      purchaseOrderOptions.value = response.data.items.map(item => ({
        id: item.id,
        orderNo: item.order_no,
        supplierName: item.supplier?.name || item.supplier_name || '-',
        supplierId: item.supplier_id
      }));
    } else {
      purchaseOrderOptions.value = [];
    }
  } catch (error) {
    console.error('获取采购单列表失败:', error);
    ElMessage.error(`获取采购单失败: ${error.message}`);
    purchaseOrderOptions.value = [];
  } finally {
    loading.value = false;
  }
};

// 处理采购单号选择变更事件
const handlePurchaseOrderChange = (value) => {
  // 查找选中的采购单
  const selectedOrder = purchaseOrderOptions.value.find(item => item.orderNo === value);
  
  if (selectedOrder) {
    // 设置供应商信息
    form.supplierName = selectedOrder.supplierName || '';
    form.supplierId = selectedOrder.supplierId || '';
    form.purchaseOrderId = selectedOrder.id || ''; // 保存采购单ID
    
    console.log('选择的采购单信息:', {
      id: selectedOrder.id,
      orderNo: selectedOrder.orderNo,
      supplierName: selectedOrder.supplierName,
      supplierId: selectedOrder.supplierId
    });
    
    // 获取该采购单的物料列表
    fetchOrderMaterials(value);
  } else {
    console.warn(`找不到匹配的采购单: ${value}`);
    form.supplierName = '';
    form.supplierId = '';
    form.purchaseOrderId = '';
    materialOptions.value = [];
  }
};

// 获取采购单物料
const fetchOrderMaterials = async (orderNo) => {
  if (!orderNo) return;
  
  try {
    loading.value = true;
    const response = await purchaseApi.getOrder(orderNo);
    
    if (response.data && response.data.items) {
      materialOptions.value = response.data.items.map(item => ({
        id: item.material_id,
        name: item.material_name || `${item.material_code} (无名称)`,
        code: item.material_code,
        specs: item.specs,
        unit: item.unit_name || item.unit,
        quantity: item.quantity,
        purchaseQuantity: item.purchase_quantity || item.quantity
      }));
    } else {
      materialOptions.value = [];
    }
  } catch (error) {
    console.error('获取采购单物料失败:', error);
    ElMessage.error(`获取物料列表失败: ${error.message}`);
    materialOptions.value = [];
  } finally {
    loading.value = false;
  }
};

// 处理物料选择变更事件
const handleMaterialChange = (value) => {
  // 查找选中的物料
  const selectedMaterial = materialOptions.value.find(item => item.id === value);
  
  if (selectedMaterial) {
    // 设置物料相关信息
    form.materialName = selectedMaterial.name;
    form.materialCode = selectedMaterial.code;
    form.specs = selectedMaterial.specs || '';
    form.unit = selectedMaterial.unit;
    form.quantity = selectedMaterial.purchaseQuantity || 1;
    
    console.log('选择的物料信息:', {
      id: selectedMaterial.id,
      name: selectedMaterial.name,
      code: selectedMaterial.code,
      specs: selectedMaterial.specs,
      unit: selectedMaterial.unit
    });
    
    // 检查是否需要自动获取检验模板
    fetchInspectionTemplates(value);
  } else {
    form.materialName = '';
    form.materialCode = '';
    form.specs = '';
    form.unit = '';
  }
};

// 获取检验模板
const fetchInspectionTemplates = async (materialId) => {
  if (!materialId) return;
  
  try {
    const response = await qualityApi.getTemplates({
      material_type: materialId,
      inspection_type: 'incoming',
      status: 'active',
      pageSize: 100, // 增大页面大小，确保获取所有模板
      page: 1 // 确保从第一页开始
    });
    
    // 检查数据结构，适应不同的API返回格式
    let templatesData = [];
    if (response.data) {
      if (response.data.data && Array.isArray(response.data.data)) {
        // 格式: { success: true, data: [...] }
        templatesData = response.data.data;
      } else if (response.data.rows && Array.isArray(response.data.rows)) {
        // 格式: { count: number, rows: [...] }
        templatesData = response.data.rows;
      } else if (Array.isArray(response.data)) {
        // 直接数组格式
        templatesData = response.data;
      }
    }
    
    inspectionTemplates.value = templatesData;
    
    // 如果没有找到目标模板，按原来的逻辑处理
    if (inspectionTemplates.value.length === 1) {
      // 如果只有一个模板，自动选择
      inspectionTemplateId.value = inspectionTemplates.value[0].id;
      currentTemplateItems.value = inspectionTemplates.value[0].items || inspectionTemplates.value[0].InspectionItems || [];
    } else if (inspectionTemplates.value.length > 1) {
      // 如果有多个模板，显示选择对话框
      selectTemplateDialogVisible.value = true;
    }
  } catch (error) {
    console.error('获取检验模板失败:', error);
  }
};

// 处理检验模板选择
const selectTemplate = (templateId) => {
  if (!templateId) {
    ElMessage.warning('请选择检验模板')
    return
  }
  
  // 更新选中的模板ID
  inspectionTemplateId.value = templateId
  
  // 获取选中模板中的检验项目
  const selectedTemplate = inspectionTemplates.value.find(t => t.id === templateId)
  if (selectedTemplate) {
    // 兼容不同的API返回格式
    const templateItems = selectedTemplate.items || selectedTemplate.InspectionItems || [];
    
    currentTemplateItems.value = templateItems;
    
    // 更新当前检验表单中的检验项目
    inspectForm.items = templateItems.map(item => ({
      ...item,
      actual_value: '',
      result: '',
      remarks: ''
    }));
  } else {
    console.error('选中的模板不存在');
  }
  
  selectTemplateDialogVisible.value = false
  ElMessage.success('检验模板应用成功')
}

// 处理检验单操作函数
const handleCreate = () => {
  form.purchaseOrderNo = '';
  form.supplierName = '';
  form.supplierId = '';
  form.materialId = '';
  form.materialName = '';
  form.materialCode = '';
  form.specs = '';
  form.batchNo = '';
  form.quantity = 1;
  form.unit = '';
  form.arrivalDate = new Date();
  form.note = '';
  
  createDialogVisible.value = true;
};

const handleView = (row) => {
  currentInspection.value = row;
  detailDialogVisible.value = true;
};

const handleInspect = async (row) => {
  try {
    // 获取详细信息，包括检验项
    loading.value = true;
    currentInspection.value = row;
    
    // 获取检验单详情
    const response = await qualityApi.getIncomingInspection(row.id);
    if (response.data) {
      const inspectionData = response.data.data || response.data;
      
      // 如果没有物料型号信息，尝试从API获取
      if (!inspectionData.specs && inspectionData.material_id) {
        const materialInfo = await getMaterialInfo(inspectionData.material_id);
        if (materialInfo && materialInfo.specs) {
          inspectionData.specs = materialInfo.specs;
        }
      }
      
      // 设置检验表单数据
      inspectForm.id = inspectionData.id;
      inspectForm.inspection_no = inspectionData.inspection_no;
      inspectForm.inspector_name = '';
      inspectForm.inspectionDate = new Date();
      inspectForm.note = inspectionData.note || '';
      
      // 检查是否已有检验项
      const hasExistingItems = inspectionData.items && inspectionData.items.length > 0;
      
      // 设置检验项，如果已有则使用已有的，否则从模板或API获取
      if (hasExistingItems) {
        inspectForm.items = inspectionData.items.map(item => ({
          ...item,
          actual_value: '',
          result: '',
          remarks: ''
        }));
      } else {
        // 尝试获取该物料的检验模板
        await fetchInspectionTemplates(inspectionData.material_id);
        
        // 如果没有可用模板，默认添加几个基本检验项
        if (!currentTemplateItems.value || currentTemplateItems.value.length === 0) {
          inspectForm.items = [
            { item_name: '外观检查', standard: '无明显缺陷', type: 'visual', is_critical: true, actual_value: '', result: '', remarks: '' },
            { item_name: '数量检查', standard: '与订单一致', type: 'quantity', is_critical: true, actual_value: '', result: '', remarks: '' },
            { item_name: '包装检查', standard: '完好无损', type: 'visual', is_critical: false, actual_value: '', result: '', remarks: '' }
          ];
        } else {
          // 使用模板中的检验项
          inspectForm.items = currentTemplateItems.value.map(item => ({
            ...item,
            actual_value: '',
            result: '',
            remarks: ''
          }));
        }
      }
      
      inspectDialogVisible.value = true;
    } else {
      ElMessage.error('获取检验单详情失败');
    }
  } catch (error) {
    console.error('获取检验单详情失败:', error);
    ElMessage.error(`获取检验单详情失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 添加物料型号提取函数
const extractMaterialSpecs = (item) => {
  // 优先检查product_code字段
  if (item.product_code) return item.product_code;
  
  // 检查直接可用的属性
  if (item.specs) return item.specs;
  if (item.item_specs) return item.item_specs;
  if (item.material && item.material.specs) return item.material.specs;
  
  // 尝试从引用数据中获取
  if (item.reference_data) {
    if (item.reference_data.items && item.reference_data.items.length > 0) {
      const firstItem = item.reference_data.items[0];
      if (firstItem.specs) return firstItem.specs;
    }
    if (item.reference_data.specs) return item.reference_data.specs;
  }
  
  // 从材料缓存中获取
  const materialId = item.materialId || item.material_id;
  if (materialId && materialCache.value[materialId]) {
    return materialCache.value[materialId].specs || '-';
  }
  
  return '-';
}

// 表单提交函数
const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    // 准备提交数据
    const formData = {
      inspection_type: 'incoming',  // 指定为来料检验
      reference_no: form.purchaseOrderNo,
      reference_id: form.purchaseOrderId,
      material_id: form.materialId,
      // 添加product相关字段
      product_id: form.materialId,
      product_name: form.materialName,
      product_code: form.specs,
      batch_no: form.batchNo,
      quantity: form.quantity,
      unit: form.unit,
      planned_date: form.arrivalDate,
      note: form.note,
      supplier_id: form.supplierId, // 确保包含供应商ID
      supplier_name: form.supplierName, // 添加供应商名称
      status: 'pending'
    }
    
    console.log('提交检验单数据:', JSON.stringify(formData, null, 2));
    console.log('关键字段验证:',{
      'inspection_type': formData.inspection_type,
      'reference_no': formData.reference_no,
      'reference_id': formData.reference_id,
      'material_id': formData.material_id,
      'product_id': formData.product_id,
      'product_name': formData.product_name,
      'product_code': formData.product_code,
      'supplier_id': formData.supplier_id,
      'supplier_name': formData.supplier_name
    });
    
    // 发送请求
    const response = await qualityApi.createIncomingInspection(formData);
    console.log('API响应:', response);

    if (response.data && response.data.success) {
      ElMessage.success('检验单创建成功');
      // 重置表单
      form.purchaseOrderNo = '';
      form.supplierName = '';
      form.supplierId = '';
      form.purchaseOrderId = '';
      form.materialId = '';
      form.materialName = '';
      form.materialCode = '';
      form.specs = '';
      form.batchNo = '';
      form.quantity = 1;
      form.unit = '';
      form.arrivalDate = new Date();
      form.note = '';
      createDialogVisible.value = false;
      
      // 刷新列表
      fetchData();
    } else {
      ElMessage.error(response.data?.message || '检验单创建失败');
    }
  } catch (error) {
    console.error('检验单创建失败:', error);
    console.error('详细错误:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    ElMessage.error(`检验单创建失败: ${error.message}`);
  }
}

// 提交检验函数
const submitInspection = async () => {
  if (!inspectFormRef.value) return;
  
  try {
    // 表单验证
    await inspectFormRef.value.validate();
    
    // 计算检验结果状态
    const allPassed = inspectForm.items.every(item => item.result === 'passed');
    const anyFailed = inspectForm.items.some(item => item.result === 'failed');
    const criticalItemFailed = inspectForm.items.some(item => item.is_critical && item.result === 'failed');
    
    // 确定状态：
    // 1. 如果所有项目都合格，则状态为passed
    // 2. 如果任何关键项目不合格，则状态为failed
    // 3. 如果有非关键项目不合格，但所有关键项目合格，则状态为partial
    let status = 'passed';
    if (criticalItemFailed) {
      status = 'failed';
    } else if (anyFailed) {
      status = 'partial';
    }
    
    // 准备提交数据
    const submitData = {
      id: inspectForm.id,
      inspection_no: inspectForm.inspection_no,
      items: inspectForm.items,
      inspector_name: inspectForm.inspector_name,
      actual_date: dayjs(inspectForm.inspectionDate).format('YYYY-MM-DD'),
      note: inspectForm.note,
      status: status
    };
    
    // 发送更新请求
    const response = await qualityApi.updateIncomingInspection(submitData.id, submitData);
    
    if (response.data && response.data.success) {
      ElMessage.success('检验提交成功');
      
      // 如果检验结果为合格，询问是否自动创建入库单
      if (status === 'passed' || status === 'partial') {
        ElMessageBox.confirm(
          '检验已完成，是否自动创建采购入库单？',
          '提示',
          {
            confirmButtonText: '创建入库单',
            cancelButtonText: '暂不创建',
            type: 'success',
          }
        )
          .then(async () => {
            try {
              // 获取完整的检验单信息
              const inspectionDetail = await qualityApi.getIncomingInspection(submitData.id);
              const inspection = inspectionDetail.data.data || inspectionDetail.data;
              
              console.log('获取到的检验单详情:', inspection);
              
              // 诊断供应商信息
              console.log('检验单供应商详情：', {
                id: inspection.id,
                inspection_no: inspection.inspection_no,
                supplier_id: inspection.supplier_id, 
                supplier_name: inspection.supplier_name,
                reference_id: inspection.reference_id,
                reference_no: inspection.reference_no
              });
              
              // 如果supplier_id不存在，从reference_id(采购订单ID)获取
              if (!inspection.supplier_id && inspection.reference_id) {
                try {
                  // 尝试通过reference_id获取采购订单信息
                  const orderResponse = await purchaseApi.getOrder(inspection.reference_id);
                  if (orderResponse.data) {
                    const orderData = orderResponse.data;
                    console.log('采购订单详情：', {
                      id: orderData.id,
                      order_no: orderData.order_no,
                      supplier_id: orderData.supplier_id,
                      supplier_name: orderData.supplier_name
                    });
                    
                    if (orderData.supplier_id) {
                      // 使用采购订单的supplier_id
                      inspection.supplier_id = Number(orderData.supplier_id);
                      inspection.supplier_name = orderData.supplier_name || inspection.supplier_name;
                      
                      console.log('从采购订单获取到供应商ID:', inspection.supplier_id);
                    }
                  }
                } catch (err) {
                  console.error('获取采购订单详情失败:', err);
                }
              }
              
              // 仍然没有supplier_id，检查reference_no(采购订单号)
              if (!inspection.supplier_id && inspection.reference_no) {
                try {
                  // 尝试通过reference_no获取采购订单信息
                  const ordersResponse = await purchaseApi.getOrders({
                    orderNo: inspection.reference_no,
                    pageSize: 1
                  });
                  
                  if (ordersResponse.data && ordersResponse.data.items && ordersResponse.data.items.length > 0) {
                    const order = ordersResponse.data.items[0];
                    console.log('通过订单号找到的采购订单：', {
                      id: order.id,
                      order_no: order.order_no,
                      supplier_id: order.supplier_id
                    });
                    
                    if (order.supplier_id) {
                      // 使用找到的采购订单的supplier_id
                      inspection.supplier_id = Number(order.supplier_id);
                      inspection.supplier_name = order.supplier_name || inspection.supplier_name;
                      
                      console.log('从采购订单号获取到供应商ID:', inspection.supplier_id);
                    }
                  }
                } catch (err) {
                  console.error('通过订单号查询采购订单失败:', err);
                }
              }
              
              // 最后一步检查，如果仍然没有供应商ID，可以设置一个默认值或报错
              if (!inspection.supplier_id) {
                console.error('无法获取检验单供应商ID，使用默认供应商');
                // 设置默认供应商ID为1，仅用于临时解决问题
                inspection.supplier_id = 1;
                inspection.supplier_name = inspection.supplier_name || '默认供应商';
              }
              
              // 确保有供应商ID，这是必须的
              if (!inspection.supplier_id) {
                ElMessage.error('检验单缺少供应商信息，无法创建入库单');
                return;
              }
              
              // 获取物料的默认库位ID
              let warehouseId = 2; // 默认使用零部件仓库ID
              let warehouseName = '零部件仓库'; // 默认名称
              
              // 尝试从物料信息中获取默认库位
              if (inspection.material_id) {
                try {
                  // 获取物料信息
                  const materialResponse = await baseDataApi.getMaterial(inspection.material_id);
                  if (materialResponse.data && materialResponse.data.location_id) {
                    warehouseId = Number(materialResponse.data.location_id);
                    warehouseName = materialResponse.data.location_name || '零部件仓库';
                    console.log(`使用物料默认库位: ${warehouseName} (ID: ${warehouseId})`);
                  } else {
                    console.log('物料无默认库位，使用零部件仓库');
                  }
                } catch (error) {
                  console.error('获取物料库位信息失败:', error);
                }
              }
              
              // 创建入库单所需的数据 - 确保所有字段名称与后端一致，使用驼峰格式
              const receiptData = {
                // 订单信息
                orderId: Number(inspection.reference_id || 0),
                // 供应商信息
                supplierId: Number(inspection.supplier_id),
                supplierName: inspection.supplier_name,
                // 仓库信息 - 使用物料默认库位或零部件仓库
                warehouseId: warehouseId,
                warehouseName: warehouseName,
                // 日期和备注
                receiptDate: dayjs().format('YYYY-MM-DD'),
                note: `来自检验单 ${inspection.inspection_no} 的自动入库`,
                // 状态信息
                status: 'draft',
                // 来源信息
                fromInspection: true,
                inspectionId: Number(inspection.id),
                // 操作人
                operator: localStorage.getItem('username') || '系统',
                receiver: localStorage.getItem('username') || '系统',
                // 物料明细，按后端要求格式化
                items: [{
                  materialId: Number(inspection.material_id || 0),
                  materialCode: inspection.product_code || inspection.material_code || '',
                  materialName: inspection.product_name || inspection.material_name || '',
                  specification: inspection.specification || inspection.specs || '',
                  unitId: Number(inspection.unit_id || 1),
                  unit: inspection.unit || '',
                  orderedQuantity: parseFloat(inspection.quantity || 0),
                  quantity: parseFloat(inspection.quantity || 0),
                  receivedQuantity: parseFloat(inspection.quantity || 0),
                  qualifiedQuantity: parseFloat(inspection.quantity || 0),
                  price: parseFloat(inspection.price || 0),
                  remarks: `自动入库：${inspection.note || ''}`,
                  locationId: warehouseId, // 使用物料默认库位或零部件仓库
                  warehouseId: warehouseId, // 确保item级别也有正确的库位ID
                  batchNo: inspection.batch_no || '',
                  fromInspection: true
                }]
              };
              
              console.log('创建入库单数据:', receiptData);
              
              // 调用采购入库API
              const receiptResponse = await purchaseApi.createReceipt(receiptData);
              if (receiptResponse.data && receiptResponse.data.success) {
                ElMessage.success('采购入库单创建成功');
              } else {
                ElMessage.warning('采购入库单创建失败: ' + (receiptResponse.data?.message || '未知错误'));
                console.error('入库单创建失败响应:', receiptResponse);
              }
            } catch (error) {
              console.error('创建入库单失败:', error);
              ElMessage.error(`创建入库单失败: ${error.message}`);
            }
          })
          .catch(() => {
            ElMessage.info('已取消创建入库单');
          });
      }
      
      // 关闭对话框并刷新数据
      inspectDialogVisible.value = false;
      fetchData();
    } else {
      ElMessage.error(response.data?.message || '检验提交失败');
    }
  } catch (error) {
    console.error('检验提交失败:', error);
    ElMessage.error(`检验提交失败: ${error.message}`);
  }
};

// 提交复检函数
const submitReview = async () => {
  if (!reviewFormRef.value) return;
  
  try {
    // 表单验证
    await reviewFormRef.value.validate();
    
    // 计算检验结果状态
    const allPassed = reviewForm.items.every(item => item.result === 'passed');
    const anyFailed = reviewForm.items.some(item => item.result === 'failed');
    const criticalItemFailed = reviewForm.items.some(item => item.is_critical && item.result === 'failed');
    
    // 确定状态：
    // 1. 如果所有项目都合格，则状态为passed
    // 2. 如果任何关键项目不合格，则状态为failed
    // 3. 如果有非关键项目不合格，但所有关键项目合格，则状态为partial
    let status = 'passed';
    if (criticalItemFailed) {
      status = 'failed';
    } else if (anyFailed) {
      status = 'partial';
    }
    
    // 准备提交数据
    const submitData = {
      id: currentInspection.value.id,
      inspection_no: currentInspection.value.inspectionNo || currentInspection.value.inspection_no,
      items: reviewForm.items,
      inspector_name: reviewForm.inspector_name,
      actual_date: dayjs(reviewForm.inspectionDate).format('YYYY-MM-DD'),
      note: reviewForm.note,
      status: status,
      is_review: true,
      review_date: dayjs(reviewForm.inspectionDate).format('YYYY-MM-DD'),
      review_reason: reviewForm.reviewReason
    };
    
    // 发送更新请求
    const response = await qualityApi.updateIncomingInspection(submitData.id, submitData);
    
    if (response.data && response.data.success) {
      ElMessage.success('复检提交成功');
      
      // 如果复检结果为合格，询问是否自动创建入库单
      if (status === 'passed' || status === 'partial') {
        ElMessageBox.confirm(
          '复检已完成，是否自动创建采购入库单？',
          '提示',
          {
            confirmButtonText: '创建入库单',
            cancelButtonText: '暂不创建',
            type: 'success',
          }
        )
          .then(async () => {
            try {
              // 获取完整的检验单信息
              const inspectionDetail = await qualityApi.getIncomingInspection(submitData.id);
              const inspection = inspectionDetail.data.data || inspectionDetail.data;
              
              console.log('获取到的复检单详情:', inspection);
              
              // 诊断供应商信息
              console.log('复检单供应商详情：', {
                id: inspection.id,
                inspection_no: inspection.inspection_no,
                supplier_id: inspection.supplier_id, 
                supplier_name: inspection.supplier_name,
                reference_id: inspection.reference_id,
                reference_no: inspection.reference_no
              });
              
              // 如果supplier_id不存在，从reference_id(采购订单ID)获取
              if (!inspection.supplier_id && inspection.reference_id) {
                try {
                  // 尝试通过reference_id获取采购订单信息
                  const orderResponse = await purchaseApi.getOrder(inspection.reference_id);
                  if (orderResponse.data) {
                    const orderData = orderResponse.data;
                    console.log('采购订单详情：', {
                      id: orderData.id,
                      order_no: orderData.order_no,
                      supplier_id: orderData.supplier_id,
                      supplier_name: orderData.supplier_name
                    });
                    
                    if (orderData.supplier_id) {
                      // 使用采购订单的supplier_id
                      inspection.supplier_id = Number(orderData.supplier_id);
                      inspection.supplier_name = orderData.supplier_name || inspection.supplier_name;
                      
                      console.log('从采购订单获取到供应商ID:', inspection.supplier_id);
                    }
                  }
                } catch (err) {
                  console.error('获取采购订单详情失败:', err);
                }
              }
              
              // 最后一步检查，如果仍然没有供应商ID，可以设置一个默认值或报错
              if (!inspection.supplier_id) {
                console.error('无法获取复检单供应商ID，使用默认供应商');
                // 设置默认供应商ID为1，仅用于临时解决问题
                inspection.supplier_id = 1;
                inspection.supplier_name = inspection.supplier_name || '默认供应商';
              }
              
              // 确保有供应商ID，这是必须的
              if (!inspection.supplier_id) {
                ElMessage.error('检验单缺少供应商信息，无法创建入库单');
                return;
              }
              
              // 获取物料的默认库位ID
              let warehouseId = 2; // 默认使用零部件仓库ID
              let warehouseName = '零部件仓库'; // 默认名称
              
              // 尝试从物料信息中获取默认库位
              if (inspection.material_id) {
                try {
                  // 获取物料信息
                  const materialResponse = await baseDataApi.getMaterial(inspection.material_id);
                  if (materialResponse.data && materialResponse.data.location_id) {
                    warehouseId = Number(materialResponse.data.location_id);
                    warehouseName = materialResponse.data.location_name || '零部件仓库';
                    console.log(`使用物料默认库位: ${warehouseName} (ID: ${warehouseId})`);
                  } else {
                    console.log('物料无默认库位，使用零部件仓库');
                  }
                } catch (error) {
                  console.error('获取物料库位信息失败:', error);
                }
              }
              
              // 创建入库单所需的数据 - 确保所有字段名称与后端一致，使用驼峰格式
              const receiptData = {
                // 订单信息
                orderId: Number(inspection.reference_id || 0),
                // 供应商信息
                supplierId: Number(inspection.supplier_id),
                supplierName: inspection.supplier_name,
                // 仓库信息 - 使用物料默认库位或零部件仓库
                warehouseId: warehouseId,
                warehouseName: warehouseName,
                // 日期和备注
                receiptDate: dayjs().format('YYYY-MM-DD'),
                note: `来自检验单 ${inspection.inspection_no} 的复检自动入库`,
                // 状态信息
                status: 'draft',
                // 来源信息
                fromInspection: true,
                inspectionId: Number(inspection.id),
                // 操作人
                operator: localStorage.getItem('username') || '系统',
                receiver: localStorage.getItem('username') || '系统',
                // 物料明细，按后端要求格式化
                items: [{
                  materialId: Number(inspection.material_id || 0),
                  materialCode: inspection.product_code || inspection.material_code || '',
                  materialName: inspection.product_name || inspection.material_name || '',
                  specification: inspection.specification || inspection.specs || '',
                  unitId: Number(inspection.unit_id || 1),
                  unit: inspection.unit || '',
                  orderedQuantity: parseFloat(inspection.quantity || 0),
                  quantity: parseFloat(inspection.quantity || 0),
                  receivedQuantity: parseFloat(inspection.quantity || 0),
                  qualifiedQuantity: parseFloat(inspection.quantity || 0),
                  price: parseFloat(inspection.price || 0),
                  remarks: `复检后自动入库：${inspection.note || ''}`,
                  locationId: warehouseId, // 使用物料默认库位或零部件仓库
                  warehouseId: warehouseId, // 确保item级别也有正确的库位ID
                  batchNo: inspection.batch_no || '',
                  fromInspection: true
                }]
              };
              
              console.log('创建入库单数据:', receiptData);
              
              // 调用采购入库API
              const receiptResponse = await purchaseApi.createReceipt(receiptData);
              if (receiptResponse.data && receiptResponse.data.success) {
                ElMessage.success('采购入库单创建成功');
              } else {
                ElMessage.warning('采购入库单创建失败: ' + (receiptResponse.data?.message || '未知错误'));
                console.error('入库单创建失败响应:', receiptResponse);
              }
            } catch (error) {
              console.error('创建入库单失败:', error);
              ElMessage.error(`创建入库单失败: ${error.message}`);
            }
          })
          .catch(() => {
            ElMessage.info('已取消创建入库单');
          });
      }
      
      // 关闭对话框并刷新数据
      reviewDialogVisible.value = false;
      fetchData();
    } else {
      ElMessage.error(response.data?.message || '复检提交失败');
    }
  } catch (error) {
    console.error('复检提交失败:', error);
    ElMessage.error(`复检提交失败: ${error.message}`);
  }
};
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

.inspection-standards {
  margin-top: 20px;
}

.standard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.result-input {
  width: 120px;
}

.standard-item {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #eee;
}

.standard-item:last-child {
  border-bottom: none;
}

.inspection-result {
  margin-top: 20px;
}

.inspection-report {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 4px;
  background-color: #fcfcfc;
}

.report-header {
  text-align: center;
  margin-bottom: 20px;
}

.report-title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 10px;
}

.report-no {
  color: #606266;
}

.report-info {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.report-info-item {
  width: 33.33%;
  margin-bottom: 10px;
}

.report-info-label {
  font-weight: bold;
  margin-right: 8px;
}

.report-standards {
  margin-bottom: 20px;
}

.report-result {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
}

.report-signature {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
}

.review-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.review-date, .review-reason {
  font-size: 14px;
  color: #606266;
}

.template-selection {
  padding: 10px 0;
}

.tip {
  margin-bottom: 15px;
  color: #606266;
}

.template-option {
  margin-bottom: 12px;
  padding: 10px;
  border: 1px solid #EBEEF5;
  border-radius: 4px;
  transition: all 0.3s;
}

.template-option:hover {
  background-color: #F5F7FA;
}

.template-info {
  display: flex;
  flex-direction: column;
  margin-left: 8px;
}

.template-name {
  font-weight: bold;
  font-size: 15px;
  margin-bottom: 5px;
}

.template-desc {
  color: #606266;
  font-size: 13px;
  margin-bottom: 5px;
}

.template-items {
  color: #909399;
  font-size: 12px;
}

.el-dropdown {
  vertical-align: middle;
  display: inline-flex;
}

.el-button {
  display: inline-flex;
  align-items: center;
}
</style>