<template>
  <div class="purchase-orders-container">
    <div class="page-header">
      <h2>采购订单管理</h2>
      <el-button type="primary" @click="openOrderDialog()">
        <el-icon><Plus /></el-icon> 新建采购订单
      </el-button>
    </div>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="订单编号">
          <el-input v-model="searchForm.order_no" placeholder="请输入订单编号" clearable></el-input>
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="供应商">
          <el-select 
            v-model="searchForm.supplier_id" 
            placeholder="请选择供应商" 
            clearable 
            filterable
          >
            <el-option 
              v-for="item in suppliers" 
              :key="item.id" 
              :label="item.name" 
              :value="item.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="searchForm.date_range"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          ></el-date-picker>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><Refresh /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 统计信息 -->
    <div class="statistics-row">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ orderStats.total || 0 }}</div>
        <div class="stat-label">订单总数</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ formatCurrency(orderStats.totalAmount || 0) }}</div>
        <div class="stat-label">订单总金额</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ orderStats.pendingCount || 0 }}</div>
        <div class="stat-label">待审批订单</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ orderStats.approvedCount || 0 }}</div>
        <div class="stat-label">已批准订单</div>
      </el-card>
      <el-card class="stat-card" shadow="hover">
        <div class="stat-value">{{ orderStats.completedCount || 0 }}</div>
        <div class="stat-label">已完成订单</div>
      </el-card>
    </div>
    
    <!-- 数据表格 -->
    <el-card class="data-card">
      <el-table
        v-loading="loading"
        :data="orderList"
        border
        style="width: 100%"
      >
        <el-table-column prop="order_no" label="订单编号" min-width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="order_date" label="订单日期" min-width="110"></el-table-column>
        <el-table-column prop="expected_delivery_date" label="预计到货日期" min-width="120"></el-table-column>
        <el-table-column prop="supplier_name" label="供应商" min-width="150" show-overflow-tooltip></el-table-column>
        <el-table-column prop="total_amount" label="订单金额" min-width="120">
          <template #default="scope">
            ¥{{ parseFloat(scope.row.total_amount).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" min-width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="requisition_number" label="关联申请单" min-width="120" show-overflow-tooltip>
          <template #default="scope">
            <!-- 添加调试信息，输出scope.row的相关数据 -->
            <span style="display: none;">{{ 
              console.log('行数据:', 
              JSON.stringify({
                id: scope.row.id,
                requisition_id: scope.row.requisition_id, 
                requisition_number: scope.row.requisition_number
              }, null, 2)) 
            }}</span>
            
            <!-- 简化条件判断逻辑，直接检查requisition_id和requisition_number -->
            <el-link 
              v-if="scope.row.requisition_id" 
              type="primary" 
              @click="viewRequisition(scope.row.requisition_id)"
            >
              {{ scope.row.requisition_number || `申请单-${scope.row.requisition_id}` }}
            </el-link>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="200" fixed="right">
          <template #default="scope">
            <div class="table-operations">
              <div class="operation-group">
                <el-button size="small" @click="viewOrder(scope.row.id)">查看</el-button>
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="editOrder(scope.row.id)"
                  v-if="scope.row.status === 'draft'"
                >编辑</el-button>
              </div>
              
              <div class="operation-group" v-if="scope.row.status !== 'cancelled' && scope.row.status !== 'completed'">
                <el-dropdown trigger="click" placement="bottom">
                  <el-button size="small" type="success">
                    更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <!-- 草稿状态可以提交订单 -->
                      <el-dropdown-item 
                        v-if="scope.row.status === 'draft'" 
                        @click="updateStatus(scope.row.id, 'pending')"
                        :disabled="loading"
                      >提交订单</el-dropdown-item>
                      
                      <!-- 待处理状态可以批准订单 -->
                      <el-dropdown-item 
                        v-if="scope.row.status === 'pending'" 
                        @click="updateStatus(scope.row.id, 'approved')"
                        :disabled="loading"
                      >批准订单</el-dropdown-item>
                      
                      <!-- 已批准状态可以完成订单 -->
                      <el-dropdown-item 
                        v-if="scope.row.status === 'approved'" 
                        @click="updateStatus(scope.row.id, 'completed')"
                        :disabled="loading"
                      >完成订单</el-dropdown-item>
                      
                      <!-- 多种状态下可以取消订单 -->
                      <el-dropdown-item 
                        v-if="['draft', 'pending', 'approved'].includes(scope.row.status)" 
                        @click="updateStatus(scope.row.id, 'cancelled')"
                        :disabled="loading"
                      >取消订单</el-dropdown-item>
                      
                      <!-- 草稿状态可以删除订单 -->
                      <el-dropdown-item 
                        v-if="scope.row.status === 'draft'" 
                        @click="deleteOrder(scope.row.id)" 
                        divided
                        :disabled="loading"
                      >删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="pagination.current"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pagination.size"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
        >
        </el-pagination>
      </div>
    </el-card>
    
    <!-- 查看订单详情对话框 -->
    <el-dialog
      title="采购订单详情"
      v-model="viewDialogVisible"
      width="1050px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-loading="detailLoading">
        <el-descriptions border :column="2">
          <el-descriptions-item label="订单编号">{{ viewData.order_number }}</el-descriptions-item>
          <el-descriptions-item label="订单日期">{{ viewData.order_date }}</el-descriptions-item>
          <el-descriptions-item label="预计到货日期">{{ viewData.expected_delivery_date }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(viewData.status)">{{ getStatusText(viewData.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="供应商">{{ viewData.supplier_name }}</el-descriptions-item>
          <el-descriptions-item label="总金额">¥{{ parseFloat(viewData.total_amount).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ viewData.contact_person }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ viewData.contact_phone }}</el-descriptions-item>
          <el-descriptions-item label="关联申请单" v-if="viewData.requisition_id">
            <el-link type="primary" @click="viewRequisition(viewData.requisition_id)">
              {{ viewData.requisition_number || `申请单-${viewData.requisition_id}` }}
            </el-link>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ viewData.notes }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider content-position="center">订单物料</el-divider>
        <el-table :data="viewData.items || []" border style="width: 100%">
          <el-table-column type="index" label="序号" width="60" align="center"></el-table-column>
          <el-table-column prop="material_code" label="物料编码" min-width="120">
            <template #default="scope">
              {{ scope.row.material_code || scope.row.materialCode || scope.row.code || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="material_name" label="物料名称" min-width="150">
            <template #default="scope">
              {{ scope.row.material_name || scope.row.materialName || scope.row.name || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="规格" min-width="150">
            <template #default="scope">
              {{ scope.row.specs || scope.row.specification || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="unit" label="单位" min-width="80">
            <template #default="scope">
              {{ scope.row.unit || scope.row.unitName || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="100">
            <template #default="scope">
              <el-input
                v-model="scope.row.quantity"
                type="number"
                :min="0.01"
                :precision="2"
                style="width: 100%"
                @change="recalculatePrice(scope.row)"
              ></el-input>
            </template>
          </el-table-column>
          <el-table-column prop="price" label="单价" width="100">
            <template #default="scope">
              <el-input
                v-model="scope.row.price"
                type="number"
                :min="0"
                :precision="2"
                style="width: 100%"
                @change="recalculatePrice(scope.row)"
              ></el-input>
            </template>
          </el-table-column>
          <el-table-column label="总价" min-width="120">
            <template #default="scope">
              ¥{{ (parseFloat(scope.row.total_price || scope.row.totalPrice || (scope.row.quantity * scope.row.price)) || 0).toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="viewDialogVisible = false">关闭</el-button>
          <el-button 
            type="primary" 
            @click="printOrder"
            v-if="viewData.status !== 'draft'"
          >打印订单</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 新建/编辑采购订单对话框 -->
    <el-dialog
      v-model="orderDialog.visible"
      :title="orderDialog.isEdit ? '编辑采购订单' : '新建采购订单'"
      width="1065px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="orderFormRef" :model="orderForm" :rules="orderRules" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="订单编号" prop="order_number">
              <el-input v-model="orderForm.order_number" placeholder="系统自动生成" disabled></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="订单日期" prop="order_date">
              <el-date-picker
                v-model="orderForm.order_date"
                type="date"
                placeholder="选择订单日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              ></el-date-picker>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="预计到货日期" prop="expected_delivery_date">
              <el-date-picker
                v-model="orderForm.expected_delivery_date"
                type="date"
                placeholder="选择预计到货日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              ></el-date-picker>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplier_id">
              <el-select
                v-model="orderForm.supplier_id"
                filterable
                placeholder="选择供应商"
                style="width: 100%"
                @change="handleSupplierChange"
              >
                <el-option
                  v-for="item in suppliers"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                >
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contact_person">
              <el-input v-model="orderForm.contact_person" placeholder="供应商联系人"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="contact_phone">
              <el-input v-model="orderForm.contact_phone" placeholder="联系电话"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="备注" prop="notes">
              <el-input v-model="orderForm.notes" type="textarea" rows="1" placeholder="备注信息"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 采购申请关联 -->
        <el-divider content-position="left">关联采购申请</el-divider>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-button type="primary" @click="openRequisitionDialog">选择采购申请</el-button>
            <div v-if="orderForm.requisition_id" style="margin-top: 10px;">
              <el-tag type="success">已关联采购申请: {{ orderForm.requisition_number }}</el-tag>
              <el-button type="text" @click="removeRequisition">取消关联</el-button>
            </div>
          </el-col>
        </el-row>
        
        <!-- 物料列表 -->
        <el-divider content-position="left">物料列表</el-divider>
        
        <div class="material-list-header">
          <el-button type="primary" @click="openMaterialDialog">添加物料</el-button>
        </div>
        
        <el-table :data="orderForm.items" border style="width: 100%; margin-top: 15px;">
          <el-table-column label="序号" type="index" width="60" align="center"></el-table-column>
          <el-table-column prop="material_code" label="物料编码" width="120"></el-table-column>
          <el-table-column prop="material_name" label="物料名称" width="180"></el-table-column>
          <el-table-column label="规格" width="150">
            <template #default="scope">
              {{ scope.row.specs || scope.row.specification || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="unit" label="单位" min-width="80"></el-table-column>
          <el-table-column prop="quantity" label="数量" width="100">
            <template #default="scope">
              <el-input
                v-model="scope.row.quantity"
                type="number"
                :min="0.01"
                :precision="2"
                style="width: 100%"
                @change="recalculatePrice(scope.row)"
              ></el-input>
            </template>
          </el-table-column>
          <el-table-column prop="price" label="单价" width="100">
            <template #default="scope">
              <el-input
                v-model="scope.row.price"
                type="number"
                :min="0"
                :precision="2"
                style="width: 100%"
                @change="recalculatePrice(scope.row)"
              ></el-input>
            </template>
          </el-table-column>
          <el-table-column prop="total_price" label="总价" width="120">
            <template #default="scope">
              <span>{{ (scope.row.quantity * scope.row.price).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template #default="scope">
              <el-button 
                type="text" 
                class="delete-text-btn"
                @click="removeItem(scope.$index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 合计金额 -->
        <div class="total-price">
          <span>订单总金额: ¥{{ calculateTotalAmount() }}</span>
        </div>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="orderDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="submitOrderForm">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 物料选择对话框 -->
    <el-dialog
      title="选择物料"
      v-model="materialDialogVisible"
      width="40%"
      :close-on-click-modal="false"
    >
      <div class="material-search">
        <el-input
          v-model="materialSearchKeyword"
          placeholder="输入物料编码或名称搜索"
          clearable
          @keyup.enter="searchMaterials"
        >
          <template #append>
            <el-button @click="searchMaterials">搜索</el-button>
          </template>
        </el-input>
      </div>
      
      <el-table
        :data="materialList"
        border
        style="width: 100%; margin-top: 15px;"
        @selection-change="handleMaterialSelectionChange"
      >
        <el-table-column type="selection" width="55"></el-table-column>
        <el-table-column prop="code" label="物料编码" width="120"></el-table-column>
        <el-table-column prop="name" label="物料名称" width="180"></el-table-column>
        <el-table-column label="规格" width="150">
          <template #default="scope">
            {{ scope.row.specs || scope.row.specification || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="unit_name" label="单位" width="80"></el-table-column>
        <el-table-column label="数量" width="120">
          <template #default="scope">
            <el-input
              v-model="scope.row.quantity"
              type="number"
              :min="0.01"
              :precision="2"
              style="width: 100%"
            ></el-input>
          </template>
        </el-table-column>
        <el-table-column label="单价" width="120">
          <template #default="scope">
            <el-input
              v-model="scope.row.price"
              type="number"
              :min="0"
              :precision="2"
              style="width: 100%"
            ></el-input>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container">
        <el-pagination
          @size-change="handleMaterialSizeChange"
          @current-change="handleMaterialCurrentChange"
          :current-page="materialPagination.current"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="materialPagination.size"
          layout="total, sizes, prev, pager, next, jumper"
          :total="materialPagination.total"
        >
        </el-pagination>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="materialDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmMaterialSelection">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 采购申请选择对话框 -->
    <el-dialog
      title="选择采购申请"
      v-model="requisitionDialogVisible"
      width="40%"
      :close-on-click-modal="false"
    >
      <div class="requisition-search">
        <el-input
          v-model="requisitionSearchKeyword"
          placeholder="输入采购申请编号搜索"
          clearable
          @keyup.enter="searchRequisitions"
        >
          <template #append>
            <el-button @click="searchRequisitions">搜索</el-button>
          </template>
        </el-input>
      </div>
      
      <el-table
        :data="requisitionList"
        border
        style="width: 100%; margin-top: 15px;"
        @row-click="handleRequisitionSelection"
      >
        <el-table-column prop="requisition_number" label="申请编号" width="150"></el-table-column>
        <el-table-column prop="request_date" label="申请日期" width="120"></el-table-column>
        <el-table-column prop="requester" label="申请人" width="120"></el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remarks" label="备注" show-overflow-tooltip></el-table-column>
      </el-table>
      
      <div class="pagination-container">
        <el-pagination
          @size-change="handleRequisitionSizeChange"
          @current-change="handleRequisitionCurrentChange"
          :current-page="requisitionPagination.current"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="requisitionPagination.size"
          layout="total, sizes, prev, pager, next, jumper"
          :total="requisitionPagination.total"
        >
        </el-pagination>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="requisitionDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmRequisitionSelection">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 申请单详情对话框 -->
    <el-dialog
      v-model="requisitionViewDialog.visible"
      title="采购申请详情"
      width="1050px"
      destroy-on-close
    >
      <div v-loading="requisitionViewDialog.loading">
        <el-descriptions border :column="2">
          <el-descriptions-item label="申请单号">{{ requisitionViewData.requisition_number || requisitionViewData.requisitionNumber || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="申请日期">{{ formatDate(requisitionViewData.request_date || requisitionViewData.requestDate) }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ requisitionViewData.requester || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(requisitionViewData.status || 'draft')">{{ getStatusText(requisitionViewData.status || 'draft') }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(requisitionViewData.created_at || requisitionViewData.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(requisitionViewData.updated_at || requisitionViewData.updatedAt) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ requisitionViewData.remarks || '无' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="center">申请物料</el-divider>

        <el-table :data="requisitionViewData.materials || []" border style="width: 100%">
          <el-table-column type="index" label="序号" width="60" align="center"></el-table-column>
          <el-table-column prop="material_code" label="物料编码" min-width="120">
            <template #default="scope">
              {{ scope.row.material_code || scope.row.materialCode || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="material_name" label="物料名称" min-width="150">
            <template #default="scope">
              {{ scope.row.material_name || scope.row.materialName || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="规格" min-width="150">
            <template #default="scope">
              {{ scope.row.specification || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="unit" label="单位" min-width="80">
            <template #default="scope">
              {{ scope.row.unit || scope.row.unitName || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" min-width="80">
            <template #default="scope">
              {{ parseFloat(scope.row.quantity || 0).toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="requisitionViewDialog.visible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import { purchaseApi, supplierApi, materialApi, qualityApi } from '@/services/api';
import { Plus, Search, Refresh, ArrowDown, Delete } from '@element-plus/icons-vue';

const router = useRouter();

// 状态选项
const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待处理' },
  { value: 'approved', label: '已批准' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
];

// 格式化日期函数，移除ISO日期字符串中的时间部分
const formatDate = (dateString) => {
  if (!dateString) return '';
  // 如果日期包含T和时区信息，只保留年月日部分
  if (dateString.includes('T')) {
    return dateString.split('T')[0];
  }
  return dateString;
};

// 搜索表单
const searchForm = reactive({
  order_no: '',
  status: '',
  supplier_id: '',
  date_range: []
});

// 分页配置
const pagination = reactive({
  current: 1,
  size: 10,
  total: 0
});

// 其他状态变量
const loading = ref(false);
const detailLoading = ref(false);
const orderList = ref([]);
const suppliers = ref([]);
const viewDialogVisible = ref(false);
const viewData = reactive({
  id: null,
  order_number: '',
  order_date: '',
  expected_delivery_date: '',
  supplier_id: '',
  supplier_name: '',
  contact_person: '',
  contact_phone: '',
  remarks: '',
  status: '',
  total_amount: 0,
  requisition_id: null,
  requisition_number: '',
  items: []
});

// 订单表单相关
const orderFormRef = ref(null);
const orderDialog = reactive({
  visible: false,
  isEdit: false,
  editId: null
});

// 订单表单数据
const orderForm = reactive({
  order_number: '',
  order_date: new Date().toISOString().split('T')[0],
  expected_delivery_date: '',
  supplier_id: '',
  supplier_name: '',
  contact_person: '',
  contact_phone: '',
  notes: '',
  requisition_id: null,
  requisition_number: '',
  status: 'draft',
  items: []
});

// 表单验证规则
const orderRules = {
  order_date: [{ required: true, message: '请选择订单日期', trigger: 'blur' }],
  expected_delivery_date: [{ required: true, message: '请选择预计到货日期', trigger: 'blur' }],
  supplier_id: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  items: [{ required: true, type: 'array', min: 1, message: '至少添加一个物料', trigger: 'change' }]
};

// 物料对话框相关
const materialDialogVisible = ref(false);
const materialSearchKeyword = ref('');
const materialList = ref([]);
const selectedMaterials = ref([]);

// 物料分页
const materialPagination = reactive({
  current: 1,
  size: 10,
  total: 0
});

// 采购申请对话框相关
const requisitionDialogVisible = ref(false);
const requisitionSearchKeyword = ref('');
const requisitionList = ref([]);
const selectedRequisition = ref(null);

// 采购申请分页
const requisitionPagination = reactive({
  current: 1,
  size: 10,
  total: 0
});

// 查看申请单详情对话框状态
const requisitionViewDialog = reactive({
  visible: false,
  loading: false
});

// 申请单详情数据
const requisitionViewData = reactive({
  id: null,
  requisition_number: '',
  request_date: '',
  requester: '',
  status: '',
  remarks: '',
  created_at: '',
  updated_at: '',
  materials: []
});

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'draft': '草稿',
    'pending': '待处理',
    'approved': '已批准',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return statusMap[status] || status;
};

// 获取状态类型（用于标签颜色）
const getStatusType = (status) => {
  const statusTypeMap = {
    'draft': 'info',
    'pending': 'warning',
    'approved': 'success',
    'completed': 'success',
    'cancelled': 'info'
  };
  return statusTypeMap[status] || '';
};

// 加载订单列表
const loadOrders = async () => {
  loading.value = true;
  try {
    // 构建查询参数
    const params = {
      page: pagination.current,
      pageSize: pagination.size,
      orderNo: searchForm.order_no,
      status: searchForm.status,
      supplierId: searchForm.supplier_id
    };
    
    // 添加日期范围
    if (searchForm.date_range && searchForm.date_range.length === 2) {
      params.startDate = searchForm.date_range[0];
      params.endDate = searchForm.date_range[1];
    }
    
    console.log('获取订单列表，参数:', params);
    const res = await purchaseApi.getOrders(params);
    console.log('获取订单列表响应:', JSON.stringify(res.data, null, 2));
    
    if (res.data) {
      // 格式化日期
      const formattedOrders = (res.data.items || []).map(order => {
        // 检查并记录关键字段
        console.log('原始订单数据:', JSON.stringify({
          id: order.id,
          order_no: order.order_no,
          status: order.status,
          requisition_id: order.requisition_id,
          requisitionId: order.requisitionId,
          requisition_number: order.requisition_number,
          requisitionNumber: order.requisitionNumber
        }, null, 2));
        
        // 检查关联申请字段
        const requisitionId = order.requisition_id || order.requisitionId;
        // 后端可能没有正确传递申请单号，即使有关联，也可能是NULL或""
        // 这里我们做一个更强的处理，如果有ID但没有号码，就设置一个默认值
        let requisitionNumber = order.requisition_number || order.requisitionNumber;
        
        // 如果有ID但没有号码，强制设置一个值，确保显示
        if (requisitionId && (!requisitionNumber || requisitionNumber === '' || requisitionNumber === '关联申请')) {
          // 尝试主动获取申请单详情以获取正确的编号
          console.log(`订单 ${order.order_no} 缺少申请单号，设置默认值 "申请单-${requisitionId}"`);
          requisitionNumber = `申请单-${requisitionId}`;
        }
        
        if (requisitionId) {
          console.log(`订单 ${order.order_no} 关联申请ID: ${requisitionId}, 编号: ${requisitionNumber || '未知'}, 状态: ${order.status}`);
        }
        
        // 创建格式化后的订单对象
        const formattedOrder = {
          ...order,
          order_date: formatDate(order.order_date),
          expected_delivery_date: formatDate(order.expected_delivery_date),
          // 确保字段名称统一
          requisition_id: requisitionId,
          requisition_number: requisitionNumber
        };
        
        console.log('格式化后的订单数据:', JSON.stringify({
          id: formattedOrder.id,
          order_no: formattedOrder.order_no,
          requisition_id: formattedOrder.requisition_id,
          requisition_number: formattedOrder.requisition_number,
          status: formattedOrder.status
        }, null, 2));
        
        return formattedOrder;
      });
      
      orderList.value = formattedOrders;
      pagination.total = res.data.total || 0;
    }
  } catch (error) {
    console.error('获取采购订单列表失败:', error);
    ElMessage.error('获取采购订单列表失败');
  } finally {
    loading.value = false;
  }
};

// 加载供应商列表
const loadSuppliers = async () => {
  try {
    const res = await supplierApi.getSuppliers({ page: 1, limit: 1000 });
    console.log('供应商API响应:', res); // 添加日志
    
    // 处理不同格式的响应数据
    if (res.data && Array.isArray(res.data)) {
      suppliers.value = res.data;
    } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
      suppliers.value = res.data.data;
    } else if (res.data && res.data.list && Array.isArray(res.data.list)) {
      suppliers.value = res.data.list;
    } else if (res.data && res.data.items && Array.isArray(res.data.items)) {
      suppliers.value = res.data.items;
    } else {
      console.error('未能识别的供应商数据格式:', res.data);
      suppliers.value = [];
    }
    
    console.log('解析后的供应商数据:', suppliers.value.length, '条记录');
    
    if (suppliers.value.length === 0) {
      ElMessage.warning('未找到供应商数据，请先在基础数据中添加供应商');
    }
  } catch (error) {
    console.error('获取供应商列表失败:', error);
    ElMessage.error('获取供应商列表失败: ' + (error.message || '未知错误'));
    suppliers.value = [];
  }
};

// 搜索
const handleSearch = async () => {
  pagination.current = 1;
  await loadOrders();
  await getOrderStats();
};

// 重置搜索
const resetSearch = () => {
  // 重置搜索表单
  searchForm.order_no = '';
  searchForm.status = '';
  searchForm.supplier_id = '';
  searchForm.date_range = [];
  
  // 重新加载数据
  pagination.current = 1;
  loadOrders();
};

// 处理分页变化
const handleSizeChange = (val) => {
  pagination.size = val;
  loadOrders();
};

const handleCurrentChange = (val) => {
  pagination.current = val;
  loadOrders();
};

// 打开新增/编辑订单对话框
const openOrderDialog = (id) => {
  if (id) {
    // 编辑
    orderDialog.isEdit = true;
    orderDialog.editId = id;
    loadOrderDetails(id);
  } else {
    // 新增
    orderDialog.isEdit = false;
    orderDialog.editId = null;
    resetOrderForm();
  }
  orderDialog.visible = true;
};

// 重置订单表单
const resetOrderForm = () => {
  Object.assign(orderForm, {
    order_number: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    supplier_id: '',
    supplier_name: '',
    contact_person: '',
    contact_phone: '',
    notes: '',
    requisition_id: null,
    requisition_number: '',
    status: 'draft',
    items: []
  });
};

// 加载订单详情
const loadOrderDetails = async (id) => {
  loading.value = true;
  try {
    console.log('加载订单详情，ID:', id);
    const res = await purchaseApi.getOrder(id);
    console.log('订单详情响应:', res);
    
    if (res.data) {
      // 处理字段名称差异，优先使用下划线格式，然后是驼峰格式
      const data = res.data;
      
      // 记录订单相关申请信息，但不再强制修改状态
      if (data.requisition_id || data.requisitionId) {
        console.log(`订单有关联申请，当前状态:`, data.status);
      }
      
      Object.assign(orderForm, {
        order_number: data.order_no || data.orderNo,
        order_date: formatDate(data.order_date || data.orderDate),
        expected_delivery_date: formatDate(data.expected_delivery_date || data.expectedDeliveryDate),
        supplier_id: data.supplier_id || data.supplierId,
        supplier_name: data.supplier_name || data.supplierName,
        contact_person: data.contact_person || data.contactPerson,
        contact_phone: data.contact_phone || data.contactPhone,
        notes: data.notes || data.remarks,
        status: data.status || 'draft', // 使用原始状态
        requisition_id: data.requisition_id || data.requisitionId,
        requisition_number: data.requisition_number || data.requisitionNumber,
        items: data.items || []
      });
      
      console.log('加载后的orderForm状态:', orderForm.status);
    }
  } catch (error) {
    console.error('获取采购订单详情失败:', error);
    ElMessage.error('获取采购订单详情失败');
  } finally {
    loading.value = false;
  }
};

// 新建采购订单 - 现在通过对话框
const handleCreate = () => {
  openOrderDialog();
};

// 编辑采购订单
const editOrder = (id) => {
  openOrderDialog(id);
};

// 处理供应商变更
const handleSupplierChange = (supplierId) => {
  const supplier = suppliers.value.find(s => s.id === supplierId);
  if (supplier) {
    orderForm.supplier_name = supplier.name;
    orderForm.contact_person = supplier.contact_person || '';
    orderForm.contact_phone = supplier.contact_phone || '';
  }
};

// 物料相关方法
const searchMaterials = async () => {
  loading.value = true;
  try {
    const params = {
      page: materialPagination.current,
      limit: materialPagination.size,
      keyword: materialSearchKeyword.value
    };
    
    const res = await materialApi.getMaterials(params);
    
    let materialData = [];
    let totalCount = 0;
    
    if (res.data && res.data.list) {
      materialData = res.data.list;
      totalCount = res.data.total || 0;
    } else if (res.list) {
      materialData = res.list;
      totalCount = res.total || res.list.length;
    } else if (Array.isArray(res)) {
      materialData = res;
      totalCount = res.length;
    } else if (res.data && Array.isArray(res.data)) {
      materialData = res.data;
      totalCount = res.data.length;
    } else {
      console.warn('物料数据格式不符合预期:', res);
    }
    
    materialList.value = materialData.map(item => ({
      ...item,
      id: item.id,
      code: item.code || item.material_code,
      name: item.name || item.material_name,
      specs: item.specs || item.specification || '', // 优先使用specs字段
      unit_name: item.unit_name || item.unit || '',
      unit_id: item.unit_id || item.unit || '',
      quantity: 1, // 默认数量
      price: item.price || 0, // 默认单价
      selected: false
    }));
    
    materialPagination.total = totalCount;
  } catch (error) {
    console.error('获取物料列表失败:', error);
    ElMessage.error('获取物料列表失败');
  } finally {
    loading.value = false;
  }
};

const handleMaterialSizeChange = (val) => {
  materialPagination.size = val;
  materialPagination.current = 1;
  searchMaterials();
};

const handleMaterialCurrentChange = (val) => {
  materialPagination.current = val;
  searchMaterials();
};

const handleMaterialSelectionChange = (selection) => {
  selectedMaterials.value = selection;
};

const openMaterialDialog = () => {
  materialDialogVisible.value = true;
  searchMaterials();
};

const confirmMaterialSelection = () => {
  if (selectedMaterials.value.length === 0) {
    ElMessage.warning('请至少选择一个物料');
    return;
  }
  
  // 添加选中的物料到表单
  selectedMaterials.value.forEach(material => {
    // 检查是否已存在相同物料
    const existingIndex = orderForm.items.findIndex(item => item.material_id === material.id);
    
    if (existingIndex >= 0) {
      // 如果已存在，增加数量
      orderForm.items[existingIndex].quantity += material.quantity;
      // 重新计算总价
      recalculatePrice(orderForm.items[existingIndex]);
    } else {
      // 否则，添加新物料
      const newItem = {
        material_id: material.id,
        material_code: material.code,
        material_name: material.name,
        specification: material.specs || material.specification || '', // 优先使用specs字段
        unit: material.unit_name,
        unit_id: material.unit_id,
        quantity: material.quantity,
        price: material.price || 0,
        total_price: (material.quantity * (material.price || 0))
      };
      orderForm.items.push(newItem);
    }
  });
  
  materialDialogVisible.value = false;
  ElMessage.success('物料添加成功');
};

// 重新计算价格
const recalculatePrice = (item) => {
  if (item.quantity <= 0) {
    ElMessage.warning('数量必须大于0');
    item.quantity = 0.01;
  }
  item.total_price = item.quantity * item.price;
};

// 移除物料项
const removeItem = (index) => {
  orderForm.items.splice(index, 1);
};

// 计算总金额
const calculateTotalAmount = () => {
  return orderForm.items.reduce((total, item) => total + (item.quantity * item.price), 0).toFixed(2);
};

// 采购申请相关方法
const searchRequisitions = async () => {
  loading.value = true;
  try {
    const params = {
      page: requisitionPagination.current,
      pageSize: requisitionPagination.size,
      status: 'approved' // 只显示已批准的采购申请
    };
    
    // 如果有关键词搜索，添加requisitionNo参数
    if (requisitionSearchKeyword.value) {
      params.requisitionNo = requisitionSearchKeyword.value;
    }
    
    console.log('搜索采购申请，参数:', params);
    const response = await purchaseApi.getRequisitions(params);
    console.log('采购申请响应:', JSON.stringify(response, null, 2));
    
    if (response && response.items && response.items.length > 0) {
      // 格式化日期并打印每个申请的状态
      const formattedRequisitions = response.items.map(req => {
        console.log(`申请ID: ${req.id}, 状态: ${req.status}, 申请单号: ${req.requisition_number || '未设置'}`);
        return {
          ...req,
          requisition_number: req.requisition_number, // 确保使用正确的字段名
          request_date: formatDate(req.request_date)
        };
      });
      requisitionList.value = formattedRequisitions;
      requisitionPagination.total = response.total || 0;
    } else {
      requisitionList.value = [];
      requisitionPagination.total = 0;
    }
  } catch (error) {
    console.error('获取采购申请列表失败:', error);
    ElMessage.error('获取采购申请列表失败: ' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

const handleRequisitionSizeChange = (val) => {
  requisitionPagination.size = val;
  requisitionPagination.current = 1;
  searchRequisitions();
};

const handleRequisitionCurrentChange = (val) => {
  requisitionPagination.current = val;
  searchRequisitions();
};

const handleRequisitionSelection = (row) => {
  selectedRequisition.value = row;
};

const openRequisitionDialog = () => {
  requisitionDialogVisible.value = true;
  searchRequisitions();
};

const confirmRequisitionSelection = async () => {
  if (!selectedRequisition.value) {
    ElMessage.warning('请选择一个采购申请');
    return;
  }
  
  try {
    console.log('选中的采购申请:', JSON.stringify(selectedRequisition.value, null, 2));
    
    // 获取采购申请详细信息
    const response = await purchaseApi.getRequisition(selectedRequisition.value.id);
    console.log('获取到的采购申请详情:', JSON.stringify(response, null, 2));
    
    if (response) {
      // 设置关联的采购申请
      orderForm.requisition_id = response.id;
      // 优先使用requisition_number字段
      orderForm.requisition_number = response.requisition_number || 
                                   selectedRequisition.value.requisition_number || 
                                   `申请单-${response.id}`;
      
      console.log('设置关联申请信息:', {
        id: orderForm.requisition_id,
        number: orderForm.requisition_number
      });
      
      // 添加采购申请中的物料到订单
      if (response.materials && response.materials.length > 0) {
        // 清空现有的物料
        const keepExistingItems = await ElMessageBox.confirm(
          '是否保留当前已添加的物料？',
          '提示',
          {
            confirmButtonText: '是',
            cancelButtonText: '否',
            type: 'warning'
          }
        ).then(() => true).catch(() => false);
        
        if (!keepExistingItems) {
          orderForm.items = [];
        }
        
        // 获取物料详细信息以获取specs字段
        const materialDetails = await Promise.all(
          response.materials.map(async (item) => {
            try {
              const materialRes = await materialApi.getMaterial(item.material_id);
              return {
                ...item,
                specs: materialRes.specs || materialRes.specification || ''
              };
            } catch (error) {
              console.error(`获取物料${item.material_id}详情失败:`, error);
              return item;
            }
          })
        );
        
        // 添加采购申请中的物料
        materialDetails.forEach(item => {
          // 检查是否已存在相同物料
          const existingIndex = orderForm.items.findIndex(i => i.material_id === item.material_id);
          
          if (existingIndex >= 0) {
            // 如果已存在，询问是否更新数量
            orderForm.items[existingIndex].quantity = item.quantity;
            recalculatePrice(orderForm.items[existingIndex]);
          } else {
            // 否则，添加新物料
            orderForm.items.push({
              material_id: item.material_id,
              material_code: item.material_code,
              material_name: item.material_name,
              specification: item.specs || item.specification || '', // 优先使用specs字段
              unit: item.unit,
              unit_id: item.unit_id,
              quantity: item.quantity,
              price: 0,
              total_price: 0
            });
          }
        });
      }
      
      // 检查当前订单状态并设置为草稿状态
      console.log('设置订单状态前:', orderForm.status);
      orderForm.status = 'draft';
      console.log('设置订单状态后:', orderForm.status);
      
      requisitionDialogVisible.value = false;
      ElMessage.success('采购申请关联成功');
    } else {
      ElMessage.warning('获取采购申请详情失败，请重试');
    }
  } catch (error) {
    console.error('获取采购申请详情失败:', error);
    ElMessage.error('获取采购申请详情失败: ' + (error.message || '未知错误'));
  }
};

// 移除关联的采购申请
const removeRequisition = () => {
  ElMessageBox.confirm('确定要移除关联的采购申请吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    orderForm.requisition_id = null;
    orderForm.requisition_number = '';
    ElMessage.success('已移除关联的采购申请');
  }).catch(() => {});
};

// 提交订单表单
const submitOrderForm = async () => {
  if (orderForm.items.length === 0) {
    ElMessage.warning('请至少添加一个物料');
    return;
  }
  
  try {
    await orderFormRef.value.validate();
    
    console.log('提交前orderForm:', JSON.stringify({
      status: orderForm.status,
      requisition_id: orderForm.requisition_id,
      requisition_number: orderForm.requisition_number
    }, null, 2));
    
    // 重构表单数据以匹配后端API预期的格式
    const formDataToSubmit = {
      order_date: orderForm.order_date,
      supplier_id: orderForm.supplier_id, 
      expected_delivery_date: orderForm.expected_delivery_date,
      contact_person: orderForm.contact_person,
      contact_phone: orderForm.contact_phone,
      notes: orderForm.notes,
      total_amount: parseFloat(calculateTotalAmount()),
      status: 'draft', // 强制设置状态为draft，确保创建的订单状态正确
      // 确保申请单信息使用下划线格式，只提供必要的字段
      requisition_id: orderForm.requisition_id || null,
      requisition_number: orderForm.requisition_number || '',
      // 格式化物料项，确保字段名与后端期望的一致
      items: orderForm.items.map(item => ({
        material_id: item.material_id,
        material_code: item.material_code,
        material_name: item.material_name,
        specification: item.specification,
        unit: item.unit,
        unit_id: item.unit_id,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price),
        total_price: parseFloat(item.quantity * item.price)
      }))
    };
    
    console.log('提交的采购订单数据:', JSON.stringify({
      ...formDataToSubmit,
      requisition_id: formDataToSubmit.requisition_id,
      requisition_number: formDataToSubmit.requisition_number,
      items: formDataToSubmit.items.length + '个物料项'
    }, null, 2));
    
    // 提交到后端
    let res;
    if (orderDialog.isEdit) {
      // 更新
      res = await purchaseApi.updateOrder(orderDialog.editId, formDataToSubmit);
      console.log('更新订单响应:', res);
      ElMessage.success('采购订单更新成功');
    } else {
      // 创建
      res = await purchaseApi.createOrder(formDataToSubmit);
      console.log('创建订单响应:', res);
      ElMessage.success('采购订单创建成功');
    }
    
    orderDialog.visible = false;
    loadOrders(); // 刷新列表
  } catch (error) {
    console.error('提交表单失败:', error);
    ElMessage.error(error.message || '提交失败，请检查表单');
  }
};

// 修复物料项结构，确保数据格式正确
const fixItemsStructure = (items) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  
  return items.map(item => {
    // 确保关键属性存在
    return {
      material_id: item.material_id || item.materialId || item.id || '',
      material_code: item.material_code || item.materialCode || item.code || '',
      material_name: item.material_name || item.materialName || item.name || '',
      specification: item.specification || '',
      unit: item.unit || item.unitName || '',
      quantity: parseFloat(item.quantity || 0),
      price: parseFloat(item.price || 0),
      total_price: parseFloat(item.total_price || item.totalPrice || (item.quantity * item.price) || 0)
    };
  });
};

// 查看采购订单详情
const viewOrder = async (id) => {
  detailLoading.value = true;
  viewDialogVisible.value = true;
  
  try {
    const response = await purchaseApi.getOrder(id);
    
    // 重置viewData对象，避免旧数据残留
    Object.keys(viewData).forEach(key => {
      if (key !== 'items') {
        viewData[key] = '';
      } else {
        viewData[key] = [];
      }
    });
    
    if (response) {
      // 获取响应数据，支持多种响应结构
      const data = response.data || response;
      
      // 获取物料数据，尝试多种可能的属性名
      let items = data.items || data.orderItems || data.materialItems || [];
      
      // 修复物料项结构
      items = fixItemsStructure(items);
      
      // 格式化日期，然后更新查看数据
      const formattedResponse = {
        id: data.id,
        order_number: data.order_no || data.orderNo || '',
        order_date: formatDate(data.order_date || data.orderDate || ''),
        expected_delivery_date: formatDate(data.expected_delivery_date || data.expectedDeliveryDate || ''),
        supplier_id: data.supplier_id || data.supplierId || '',
        supplier_name: data.supplier_name || data.supplierName || '',
        contact_person: data.contact_person || data.contactPerson || '',
        contact_phone: data.contact_phone || data.contactPhone || '',
        notes: data.notes || data.remarks || '',
        status: data.status || '',
        total_amount: data.total_amount || data.totalAmount || 0,
        // 确保关联的采购申请字段正确映射
        requisition_id: data.requisition_id || data.requisitionId || null,
        requisition_number: data.requisition_number || data.requisitionNumber || '',
        items: items
      };
      
      // 更新查看数据
      Object.assign(viewData, formattedResponse);
    } else {
      ElMessage.warning('获取不到订单详情');
    }
  } catch (error) {
    console.error('获取采购订单详情失败:', error);
    ElMessage.error('获取采购订单详情失败: ' + (error.message || '未知错误'));
  } finally {
    detailLoading.value = false;
  }
};

// 查看关联的采购申请
const viewRequisition = async (id) => {
  requisitionViewDialog.loading = true;
  requisitionViewDialog.visible = true;
  
  try {
    // 清空之前的数据
    Object.keys(requisitionViewData).forEach(key => {
      if (Array.isArray(requisitionViewData[key])) {
        requisitionViewData[key] = [];
      } else {
        requisitionViewData[key] = '';
      }
    });
    
    // 获取申请单详情
    console.log('正在获取申请单详情，ID:', id);
    const response = await purchaseApi.getRequisition(id);
    console.log('获取到的申请单详情:', response);
    
    if (response) {
      // 规范化数据结构，优先使用requisition_number字段
      const formattedResponse = {
        id: response.id,
        requisition_number: response.requisition_number || `申请单-${id}`,
        request_date: formatDate(response.request_date),
        requester: response.requester || '',
        status: response.status || 'draft',
        remarks: response.remarks || '',
        created_at: formatDate(response.created_at),
        updated_at: formatDate(response.updated_at),
        materials: []
      };
      
      // 处理物料数据
      if (response.materials && Array.isArray(response.materials)) {
        formattedResponse.materials = response.materials.map(item => ({
          material_id: item.material_id,
          material_code: item.material_code || '',
          material_name: item.material_name || '',
          specification: item.specification || '',
          unit: item.unit || '',
          quantity: item.quantity || 0
        }));
      } else {
        console.warn('申请单缺少物料数据或格式不正确');
      }
      
      // 更新申请单详情数据
      Object.assign(requisitionViewData, formattedResponse);
    } else {
      ElMessage.warning('未找到采购申请详情');
    }
  } catch (error) {
    console.error('获取采购申请详情失败:', error);
    ElMessage.error('获取采购申请详情失败');
  } finally {
    requisitionViewDialog.loading = false;
  }
};

// 打印订单
const printOrder = () => {
  if (!viewData.id) {
    ElMessage.warning('无法打印，订单详情不完整');
    return;
  }
  
  // 创建一个打印友好的页面
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    ElMessage.error('打印窗口被阻止，请允许弹出窗口');
    return;
  }
  
  // 构建打印页面的HTML
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>采购订单 - ${viewData.order_number}</title>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          font-size: 14px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .title {
          font-size: 22px;
          font-weight: bold;
        }
        .order-info {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .order-info td {
          padding: 5px 10px;
          border: 1px solid #ddd;
        }
        .order-info .label {
          font-weight: bold;
          background-color: #f5f5f5;
          width: 120px;
        }
        table.items {
          width: 100%;
          border-collapse: collapse;
        }
        table.items th, table.items td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        table.items th {
          background-color: #f5f5f5;
        }
        .total {
          margin-top: 20px;
          text-align: right;
          font-weight: bold;
        }
        .signatures {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
        }
        .signature-line {
          border-top: 1px solid #000;
          width: 200px;
          margin-top: 50px;
          padding-top: 5px;
        }
        @media print {
          button.no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">采购订单</div>
        <div>订单编号：${viewData.order_number}</div>
      </div>
      
      <table class="order-info">
        <tr>
          <td class="label">订单日期</td>
          <td>${formatDate(viewData.order_date)}</td>
          <td class="label">预计到货日期</td>
          <td>${formatDate(viewData.expected_delivery_date)}</td>
        </tr>
        <tr>
          <td class="label">供应商</td>
          <td>${viewData.supplier_name}</td>
          <td class="label">状态</td>
          <td>${getStatusText(viewData.status)}</td>
        </tr>
        <tr>
          <td class="label">联系人</td>
          <td>${viewData.contact_person || '-'}</td>
          <td class="label">联系电话</td>
          <td>${viewData.contact_phone || '-'}</td>
        </tr>
        <tr>
          <td class="label">备注</td>
          <td colspan="3">${viewData.notes || '-'}</td>
        </tr>
      </table>
      
      <table class="items">
        <thead>
          <tr>
            <th>序号</th>
            <th>物料编码</th>
            <th>物料名称</th>
            <th>规格</th>
            <th>单位</th>
            <th>数量</th>
            <th>单价(¥)</th>
            <th>总价(¥)</th>
          </tr>
        </thead>
        <tbody>
          ${(viewData.items || []).map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.material_code || item.materialCode || item.code || '-'}</td>
              <td>${item.material_name || item.materialName || item.name || '-'}</td>
              <td>${item.specification || '-'}</td>
              <td>${item.unit || item.unitName || '-'}</td>
              <td>${parseFloat(item.quantity || 0).toFixed(2)}</td>
              <td>${parseFloat(item.price || 0).toFixed(2)}</td>
              <td>${(parseFloat(item.total_price || item.totalPrice || (item.quantity * item.price)) || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="total">
        订单总金额：¥${parseFloat(viewData.total_amount).toFixed(2)}
      </div>
      
      <div class="signatures">
        <div>
          <div class="signature-line">采购方签名</div>
        </div>
        <div>
          <div class="signature-line">供应商签名</div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <button class="no-print" onclick="window.print()">打印</button>
        <button class="no-print" onclick="window.close()">关闭</button>
      </div>
    </body>
    </html>
  `;
  
  // 写入内容到新窗口
  printWindow.document.open();
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // 等待内容加载完成后自动打印
  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.focus();
      // 自动打印可以注释下面一行
      // printWindow.print();
    }, 500);
  };
};

// 创建来料检验单
const createIncomingInspection = async (order) => {
  try {
    for (const item of order.items) {
      let inspectionTemplate = null;
      try {
        inspectionTemplate = await getInspectionTemplate(item.material_id);
      } catch (err) {
        ElMessage.warning(`物料【${item.material_name || item.name}】未设置默认检验模板，已跳过`);
        continue; // 跳过没有模板的物料
      }
      
      // 记录供应商名称，但不传递给API
      const supplierName = order.supplier_name;
      console.log(`为供应商 ${supplierName} 创建来料检验单`);
      
      // 准备提交的数据
      const submitData = {
        inspection_type: 'incoming',
        material_id: item.material_id,
        // 将物料ID也写入product_id字段
        product_id: item.material_id,
        // 将物料名称写入product_name字段
        product_name: item.material_name || item.name,
        // 将物料型号写入product_code字段
        product_code: item.specs || item.specification || '',
        reference_id: order.id,
        reference_no: order.order_number || order.order_no,
        batch_no: '默认批次号',
        quantity: item.quantity,
        unit: item.unit,
        planned_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        note: `自动创建的来料检验单 - 供应商: ${supplierName}`,
        items: inspectionTemplate.items
      };
      
      console.log('创建来料检验单数据:', JSON.stringify(submitData, null, 2));
      
      const response = await qualityApi.createIncomingInspection(submitData);
      if (response.data && response.data.success) {
        ElMessage.success(`来料检验单创建成功: ${item.material_name || item.name}`);
      } else {
        ElMessage.error(`来料检验单创建失败: ${item.material_name || item.name}`);
      }
    }
  } catch (error) {
    console.error('创建来料检验单失败:', error);
    ElMessage.error('创建来料检验单失败');
  }
};

// 更新订单状态
const updateStatus = async (id, status) => {
  // 状态文本映射
  const statusTextMap = {
    'draft': '设为草稿',
    'pending': '设为待处理',
    'approved': '批准',
    'completed': '完成',
    'cancelled': '取消'
  };
  
  // 检查状态转换是否合法
  const validTransitions = {
    'draft': ['pending', 'cancelled'],
    'pending': ['approved', 'cancelled'],
    'approved': ['completed', 'cancelled'],
    'completed': [],
    'cancelled': []
  };
  
  try {
    loading.value = true; // 添加加载状态，防止重复点击
    
    // 首先获取订单当前状态
    console.log('获取订单最新状态，ID:', id);
    const orderRes = await purchaseApi.getOrder(id);
    
    if (!orderRes || !orderRes.data) {
      ElMessage.error('获取订单信息失败，无法更新状态');
      loading.value = false;
      return;
    }
    
    const currentStatus = orderRes.data.status;
    console.log('当前订单状态:', currentStatus, '目标状态:', status);
    
    // 检查是否是同一状态
    if (currentStatus === status) {
      console.log('目标状态与当前状态相同，取消更新操作');
      ElMessage.info(`订单当前已经是"${getStatusText(status)}"状态`);
      loading.value = false;
      return;
    }
    
    // 检查是否是有效的状态转换
    if (!validTransitions[currentStatus].includes(status)) {
      console.log(`无效状态转换：${currentStatus} -> ${status}`);
      ElMessage.error(`无法将订单从"${getStatusText(currentStatus)}"状态转换为"${getStatusText(status)}"状态`);
      loading.value = false;
      return;
    }
    
    await ElMessageBox.confirm(
      `确定要${statusTextMap[status] || '更新'}此采购订单吗？`, 
      '提示', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    console.log('发送状态更新请求，ID:', id, '新状态:', status);
    const res = await purchaseApi.updateOrderStatus(id, status);
    console.log('状态更新响应:', res);
    ElMessage.success(`订单已${statusTextMap[status] || '更新'}`);
    await loadOrders(); // 刷新列表
    
    if (status === 'completed') {
      const order = orderList.value.find(o => o.id === id);
      if (order) {
        console.log('订单完成，开始创建来料检验单');
        await createIncomingInspection(order);
      }
    }
  } catch (error) {
    if (error === 'cancel') return;
    
    console.error('更新订单状态失败:', error);
    // 显示详细错误信息
    if (error.response && error.response.data) {
      const errorData = error.response.data;
      if (errorData.error) {
        if (errorData.error === '当前已经是该状态') {
          ElMessage.info(`订单当前已经是"${getStatusText(status)}"状态`);
        } else {
          ElMessage.error(`更新失败: ${errorData.error}`);
        }
        
        // 记录更多详细信息用于调试
        if (errorData.validTransitions) {
          console.log('有效的状态转换:', errorData.validTransitions);
        }
        if (errorData.receivedStatus) {
          console.log('接收到的状态:', errorData.receivedStatus);
        }
      } else {
        ElMessage.error('更新失败: 服务器返回未知错误');
      }
    } else {
      ElMessage.error(error.message || '操作失败');
    }
  } finally {
    loading.value = false;
    // 无论成功失败，都刷新一次列表以确保显示最新状态
    loadOrders();
  }
};

// 删除采购订单
const deleteOrder = async (id) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此采购订单吗？此操作不可恢复！', 
      '警告', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    );
    
    const res = await purchaseApi.deleteOrder(id);
    ElMessage.success('采购订单已删除');
    loadOrders(); // 刷新列表
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除采购订单失败:', error);
      ElMessage.error(error.message || '删除失败');
    }
  }
};

// 订单统计数据
const orderStats = ref({
  total: 0,
  totalAmount: 0,
  pendingCount: 0,
  approvedCount: 0,
  completedCount: 0
});

// 格式化货币金额
const formatCurrency = (value) => {
  if (!value) return '¥0.00';
  return '¥' + parseFloat(value).toFixed(2);
};

// 在加载订单时获取统计数据
const getOrderStats = async () => {
  try {
    const response = await purchaseApi.getOrderStats();
    if (response && response.data) {
      orderStats.value = {
        total: response.data.counts?.total_orders || 0,
        totalAmount: response.data.monthlyAmount || 0,
        pendingCount: response.data.counts?.pending_orders || 0,
        approvedCount: response.data.counts?.approved_orders || 0,
        completedCount: response.data.counts?.completed_orders || 0
      };
    }
  } catch (error) {
    console.error('获取订单统计信息失败:', error);
  }
};

// 获取检验模板
const getInspectionTemplate = async (materialId) => {
  try {
    console.log(`正在获取物料ID: ${materialId} 的检验模板...`);
    
    // 先获取模板列表
    const response = await qualityApi.getMaterialDefaultTemplate(materialId);
    console.log('检验模板API响应:', response.data);
    
    if (!response.data || !response.data.success) {
      console.error('API返回数据格式不符合预期');
      throw new Error('未找到默认检验模板');
    }
    
    // 检查是否有模板数据
    const templates = response.data.data;
    if (!templates || templates.length === 0) {
      console.error('未找到物料的默认检验模板');
      throw new Error('未找到默认检验模板');
    }
    
    // 获取第一个模板的ID
    const templateId = templates[0].id;
    console.log(`找到模板ID: ${templateId}, 正在获取模板详情...`);
    
    // 获取模板详情，包括检验项目
    const templateDetailResponse = await qualityApi.getTemplate(templateId);
    console.log('模板详情响应:', templateDetailResponse.data);
    
    if (!templateDetailResponse.data || !templateDetailResponse.data.success) {
      console.error('获取模板详情失败');
      throw new Error('获取模板详情失败');
    }
    
    const templateDetail = templateDetailResponse.data.data;
    
    // 检查是否有检验项目
    if (!templateDetail.InspectionItems || templateDetail.InspectionItems.length === 0) {
      console.error('模板没有检验项目');
      throw new Error('模板没有检验项目');
    }
    
    // 返回包含检验项目的模板
    return {
      id: templateDetail.id,
      name: templateDetail.template_name,
      items: templateDetail.InspectionItems.map(item => ({
        item_name: item.item_name,
        standard: item.standard,
        type: item.type,
        is_critical: item.is_critical
      }))
    };
  } catch (error) {
    console.error('获取检验模板失败:', error);
    throw error;
  }
};

// 页面初始化
onMounted(() => {
  loadOrders();
  loadSuppliers();
  getOrderStats();
});
</script>

<style scoped>
.purchase-orders-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 140px;
  text-align: center;
  cursor: default;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #409EFF;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.data-card {
  margin-bottom: 16px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 操作按钮样式 */
.table-operations {
  display: flex;
  gap: 8px;
  align-items: center;
}

.operation-group {
  display: flex;
  gap: 4px;
}

.operation-group:not(:last-child) {
  border-right: 1px solid #ebeef5;
  padding-right: 8px;
}

.material-list-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.total-price {
  margin-top: 15px;
  text-align: right;
  font-size: 16px;
  font-weight: bold;
}

.material-search, .requisition-search {
  margin-bottom: 15px;
}

/* 对话框样式 */
:deep(.el-dialog__body) {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.delete-text-btn {
  color: #F56C6C;
  padding: 0 4px;
}

.delete-text-btn:hover {
  color: #f78989;
}
</style> 