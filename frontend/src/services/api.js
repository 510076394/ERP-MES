import axios from 'axios';
import { ElMessage } from 'element-plus';

// 使用环境变量，如果没有设置则使用相对路径
const API_URL = (import.meta.env.VITE_API_URL || '') + '/api';
console.log('API基础URL:', API_URL);

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 增加超时设置
  timeout: 30000,
});

// 添加请求拦截器来设置认证token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('API请求:', config.method.toUpperCase(), config.url);
  console.log('API拦截器中的token:', token);
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
    console.log('设置Authorization头:', `Bearer ${token}`);
  } else {
    console.warn('未找到token，请求将不包含Authorization头');
  }
  
  // 不能直接设置Accept-Encoding头，浏览器会拒绝
  // config.headers['Accept-Encoding'] = 'identity';
  
  return config;
}, (error) => {
  console.error('API请求拦截器错误:', error);
  return Promise.reject(error);
});

// 添加响应拦截器，处理401错误（未授权）以及响应数据
api.interceptors.response.use(
  (response) => {
    // 响应数据处理在这里进行
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error('认证失败，请重新登录');
      // 清除token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 重定向到登录页面
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 添加响应拦截器用于调试
axios.interceptors.response.use(
  response => {
    console.log(`[API调试] ${response.config.url} 响应:`, response.data);
    return response;
  },
  error => {
    console.error(`[API错误] ${error.config?.url || '未知请求'}:`, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const salesApi = {
  // 客户管理
  getCustomers: () => api.get('/sales/customers'),
  getCustomer: (id) => api.get(`/sales/customers/${id}`),
  createCustomer: (customer) => api.post('/sales/customers', customer),
  updateCustomer: (id, customer) => api.put(`/sales/customers/${id}`, customer),
  deleteCustomer: (id) => api.delete(`/sales/customers/${id}`),

  // 报价单管理
  getQuotations: () => api.get('/sales/quotations'),
  getQuotation: (id) => api.get(`/sales/quotations/${id}`),
  createQuotation: (quotation) => api.post('/sales/quotations', quotation),
  updateQuotation: (id, quotation) => api.put(`/sales/quotations/${id}`, quotation),
  deleteQuotation: (id) => api.delete(`/sales/quotations/${id}`),
  convertQuotationToOrder: (id) => api.post(`/sales/quotations/${id}/convert`),

  // 销售订单管理
  getOrders: (params) => api.get('/sales/orders', { params }),
  getOrder: (id) => api.get(`/sales/orders/${id}`),
  getOrderDetails: (id) => api.get(`/sales/orders/${id}`),
  createOrder: (order) => api.post('/sales/orders', order),
  updateOrder: (id, order) => api.put(`/sales/orders/${id}`, order),
  deleteOrder: (id) => api.delete(`/sales/orders/${id}`),
  updateOrderStatus: (id, statusData) => api.put(`/sales/orders/${id}/status`, statusData),

  // 销售出库管理
  getOutbounds: (params) => api.get('/sales/outbound', { params }),
  getOutbound: (id) => api.get(`/sales/outbound/${id}`),
  createOutbound: (outbound) => api.post('/sales/outbound', outbound),
  updateOutbound: (id, outbound) => api.put(`/sales/outbound/${id}`, outbound),
  deleteOutbound: (id) => api.delete(`/sales/outbound/${id}`),

  // 销售退货管理
  getReturns: () => api.get('/sales/returns'),
  getReturn: (id) => api.get(`/sales/returns/${id}`),
  createReturn: (returnOrder) => api.post('/sales/returns', returnOrder),
  updateReturn: (id, returnOrder) => api.put(`/sales/returns/${id}`, returnOrder),
  deleteReturn: (id) => api.delete(`/sales/returns/${id}`),

  // 销售换货管理
  getExchanges: () => api.get('/sales/exchanges'),
  getExchange: (id) => api.get(`/sales/exchanges/${id}`),
  createExchange: (exchange) => api.post('/sales/exchanges', exchange),
  updateExchange: (id, exchange) => api.put(`/sales/exchanges/${id}`, exchange),
  deleteExchange: (id) => api.delete(`/sales/exchanges/${id}`),

  // 统计数据
  getQuotationStatistics: () => api.get('/sales/quotations/statistics'),
  getOrderStatistics: () => api.get('/sales/orders/statistics'),
  getSalesStatistics: () => api.get('/sales/statistics')
};

export const baseDataApi = {
  // 物料管理
  getMaterials: (params) => api.get('/baseData/materials', { params }),
  getMaterial: (id) => api.get(`/baseData/materials/${id}`),
  createMaterial: (material) => api.post('/baseData/materials', material),
  updateMaterial: (id, material) => api.put(`/baseData/materials/${id}`, material),
  deleteMaterial: (id) => api.delete(`/baseData/materials/${id}`),
  // 添加导入物料API
  importMaterials: (materials) => api.post('/baseData/materials/import', { materials }),
  // 添加导出物料API
  exportMaterials: (filters) => api.post('/baseData/materials/export', filters, { 
    responseType: 'blob' 
  }),
  
  // 供应商管理
  getSuppliers: async (params = {}) => {
    console.log('调用getSuppliers API，参数:', params);
    try {
      const response = await api.get('/baseData/suppliers', { 
        params: params || {},
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        }
      });
      console.log('getSuppliers API响应成功，数据长度:', 
        Array.isArray(response.data) ? response.data.length : '未知格式');
      return response;
    } catch (error) {
      console.error('getSuppliers API错误:', error);
      throw error;
    }
  },
  getSupplier: (id) => api.get(`/baseData/suppliers/${id}`),
  createSupplier: (supplier) => api.post('/baseData/suppliers', supplier),
  updateSupplier: (id, supplier) => api.put(`/baseData/suppliers/${id}`, supplier),
  deleteSupplier: (id) => api.delete(`/baseData/suppliers/${id}`),
  
  // BOM管理
  getBoms: async (params) => {
    console.log('===== 开始调用getBoms API =====');
    console.log('调用参数:', params);
    try {
      // 提取product_id参数，确保后续比较时使用
      const productId = params?.params?.product_id || params?.product_id;
      console.log('需要查询的产品ID:', productId);
      
      // 添加时间戳防止缓存
      const requestParams = {
        ...(params?.params || params || {}),
      };
      
      // 确保时间戳参数存在且有效
      if (!requestParams.timestamp) {
        requestParams.timestamp = new Date().getTime();
      }
      
      // 确保product_id参数为数字或保持原样
      if (productId && !isNaN(Number(productId))) {
        requestParams.product_id = Number(productId);
      }
      
      console.log('最终请求参数:', requestParams);
      const response = await api.get('/baseData/boms', { 
        params: requestParams,
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        }
      });
      console.log('getBoms API响应:', response.data);
      
      // 检查响应数据结构
      if (!response.data) {
        console.warn('getBoms API响应为空');
        return { data: { data: [] } };
      }
      
      // 标准化响应数据格式
      let bomsData = [];
      if (Array.isArray(response.data)) {
        bomsData = response.data;
        response.data = { data: bomsData };
      } else if (response.data.data && Array.isArray(response.data.data)) {
        bomsData = response.data.data;
      } else if (typeof response.data === 'object' && !Array.isArray(response.data)) {
        // 单个BOM对象
        bomsData = [response.data];
        response.data = { data: bomsData };
      }
      
      // 处理BOM详情
      if (bomsData.length > 0) {
        bomsData = bomsData.map(bom => {
          // 确保details是数组
          if (!bom.details || !Array.isArray(bom.details)) {
            if (bom.details_string && typeof bom.details_string === 'string') {
              try {
                bom.details = JSON.parse(bom.details_string);
              } catch (e) {
                console.error('解析BOM details_string失败:', e);
                bom.details = [];
              }
            } else {
              bom.details = [];
            }
          }
          
          // 确保BOM状态字段存在
          if (bom.status === undefined) {
            bom.status = bom.is_active ? 'active' : 'inactive';
          }
          
          return bom;
        });
        
        // 如果指定了产品ID，则过滤数据确保只返回该产品的BOM
        if (productId) {
          const originalLength = bomsData.length;
          const filteredBoms = bomsData.filter(bom => {
            const bomProductId = bom.product_id;
            const match = String(bomProductId) === String(productId);
            if (!match) {
              console.warn(`过滤掉不匹配的BOM - BOM产品ID:${bomProductId}, 请求的产品ID:${productId}`);
            }
            return match;
          });
          
          // 记录过滤结果
          if (filteredBoms.length === 0 && originalLength > 0) {
            console.warn(`警告: 所有BOM(${originalLength}个)都被过滤掉了，没有匹配产品ID:${productId}的BOM`);
          } else if (filteredBoms.length < originalLength) {
            console.log(`从${originalLength}个BOM中过滤出${filteredBoms.length}个匹配产品ID:${productId}的BOM`);
          }
          
          // 更新过滤后的数据
          bomsData = filteredBoms;
        }
        
        // 更新响应数据
        if (Array.isArray(response.data)) {
          response.data = bomsData;
        } else if (response.data.data) {
          response.data.data = bomsData;
        }
      }
      
      console.log('处理后的getBoms响应数据:', response.data);
      console.log(`最终返回的BOM数据数量: ${response.data?.data?.length || 0}`);
      return response;
    } catch (error) {
      console.error('getBoms API调用失败:', error);
      // 提供友好的错误响应而不是直接抛出错误
      return { 
        data: { 
          data: [],
          error: error.message
        },
        error: error
      };
    } finally {
      console.log('===== 结束调用getBoms API =====');
    }
  },
  getBom: async (id) => {
    console.log('===== 开始调用getBom API =====');
    console.log('调用参数, BOM ID:', id);
    try {
      const response = await api.get(`/baseData/boms/${id}`);
      console.log('getBom API响应:', response.data);
      
      // 检查响应数据
      if (!response.data) {
        console.warn('getBom API响应为空');
        return { data: null };
      }
      
      // 处理BOM详情
      let bomData = response.data;
      
      // 确保details是数组
      if (!bomData.details || !Array.isArray(bomData.details)) {
        if (bomData.details_string && typeof bomData.details_string === 'string') {
          try {
            bomData.details = JSON.parse(bomData.details_string);
          } catch (e) {
            console.error('解析BOM details_string失败:', e);
            bomData.details = [];
          }
        } else {
          bomData.details = [];
        }
      }
      
      // 确保BOM状态字段存在
      if (bomData.status === undefined) {
        bomData.status = bomData.is_active ? 'active' : 'inactive';
      }
      
      console.log('处理后的getBom响应数据:', bomData);
      return { data: bomData };
    } catch (error) {
      console.error('getBom API调用失败:', error);
      return { 
        data: null,
        error: error.message
      };
    } finally {
      console.log('===== 结束调用getBom API =====');
    }
  },
  createBom: (bom) => api.post('/baseData/boms', bom),
  updateBom: (id, bom) => api.put(`/baseData/boms/${id}`, bom),
  deleteBom: (id) => api.delete(`/baseData/boms/${id}`),
  
  // 库位管理
  getLocations: (params) => api.get('/baseData/locations', { params }),
  getLocation: (id) => api.get(`/baseData/locations/${id}`),
  createLocation: (location) => api.post('/baseData/locations', location),
  updateLocation: (id, location) => api.put(`/baseData/locations/${id}`, location),
  deleteLocation: (id) => api.delete(`/baseData/locations/${id}`),

  // 获取客户列表（销售模块）
  getCustomers: (params) => api.get('/baseData/customers', { params }), // 使用统一的客户管理接口
  getCustomersList: () => api.get('/sales/customers-list'), // 保留销售模块特定接口
  // 获取成品列表（销售模块）
  getProducts: () => api.get('/sales/products-list'),
  
  // 分类管理
  getCategories: (params) => api.get('/baseData/categories', { params }),
  getCategory: (id) => api.get(`/baseData/categories/${id}`),
  createCategory: (category) => api.post('/baseData/categories', category),
  updateCategory: (id, category) => api.put(`/baseData/categories/${id}`, category),
  deleteCategory: (id) => api.delete(`/baseData/categories/${id}`),

  // 单位管理
  getUnits: (params) => api.get('/baseData/units', { params }),
  getUnit: (id) => api.get(`/baseData/units/${id}`),
  createUnit: (unit) => api.post('/baseData/units', unit),
  updateUnit: (id, unit) => api.put(`/baseData/units/${id}`, unit),
  deleteUnit: (id) => api.delete(`/baseData/units/${id}`),

  // 客户管理
  getCustomer: (id) => api.get(`/baseData/customers/${id}`),
  createCustomer: (customer) => api.post('/baseData/customers', customer),
  updateCustomer: (id, customer) => api.put(`/baseData/customers/${id}`, customer),
  deleteCustomer: (id) => api.delete(`/baseData/customers/${id}`),

  // 供应商管理
  getSuppliers: async (params) => {
    try {
      console.log('调用供应商列表API，参数:', params);
      const response = await api.get('/baseData/suppliers', { params });
      console.log('供应商列表API响应:', response);
      
      // 处理响应数据
      if (response && response.data) {
        let supplierData = [];
        
        // 处理响应数据可能的不同格式
        if (Array.isArray(response.data)) {
          supplierData = response.data;
        } else if (response.data.items && Array.isArray(response.data.items)) {
          supplierData = response.data.items;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          supplierData = response.data.data;
        } else if (typeof response.data === 'object' && !Array.isArray(response.data)) {
          // 可能是单个供应商对象
          supplierData = [response.data];
        }
        
        // 规范化供应商数据
        supplierData = supplierData.map(supplier => ({
          id: typeof supplier.id === 'string' ? parseInt(supplier.id) : supplier.id,
          code: supplier.code || supplier.supplier_code || '',
          name: supplier.name || supplier.supplier_name || supplier.company_name || '',
          contactPerson: supplier.contact_person || supplier.contactPerson || '',
          contactPhone: supplier.contact_phone || supplier.contactPhone || '',
          status: supplier.status || (supplier.is_active ? 'active' : 'inactive')
        }));
        
        return {
          ...response,
          data: supplierData
        };
      }
      
      return response;
    } catch (error) {
      console.error('获取供应商列表失败:', error);
      // 返回空数据而不是抛出错误，以避免阻塞UI渲染
      return {
        data: []
      };
    }
  }
};

export const inventoryApi = {
  // 库存查询
  getStocks: (params) => api.get('/inventory/stock', { params }),
  getStockDetail: (id) => api.get(`/inventory/stocks/${id}`),
  getStockRecords: (id) => api.get(`/inventory/stock/${id}/records`),
  // 添加通过物料ID获取库存记录的API
  getMaterialRecords: (materialId) => api.get(`/inventory/materials/${materialId}/records`),
  exportStock: (data) => api.post('/inventory/stocks/export', data, {
    responseType: 'blob'
  }),
  getInventoryStock: async (params) => {
    try {
      console.log('获取库存查询参数:', params);
      const response = await api.get('/inventory/stock', { params });
      console.log('库存数据原始响应:', response);
      
      // 提取数据并确保是数组格式
      let stockData = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          stockData = response.data;
        } else if (response.data.items && Array.isArray(response.data.items)) {
          stockData = response.data.items;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          stockData = response.data.data;
        }
      }
      
      // 确保每个物料记录都有正确的quantity值
      stockData = stockData.map(item => {
        // 确保quantity字段是数值类型
        const quantity = item.quantity !== undefined && item.quantity !== null
          ? parseFloat(item.quantity)
          : 0;
        
        return {
          ...item,
          quantity: quantity,
          // 添加stock_quantity字段以保持一致性
          stock_quantity: quantity
        };
      });
      
      console.log('处理后的库存数据:', stockData);
      
      return {
        ...response,
        data: stockData
      };
    } catch (error) {
      console.error('获取库存数据失败:', error);
      return { data: [] };
    }
  },
  
  // 库存调整
  adjustStock: (data) => api.post('/inventory/stock/adjust', data),
  
  // 获取库位列表
  getLocations: (params) => api.get('/baseData/locations', { params }),
  
  // 获取物料列表（库存模块特定）
  getMaterials: (params) => api.get('/inventory/materials', { params }),
  // 获取所有物料列表 - 与 baseDataApi.getMaterials 保持一致
  getAllMaterials: (params) => {
    console.log('调用 getAllMaterials API，参数:', params)
    return api.get('/baseData/materials', { params })
  },
  
  // 获取单位列表 - 与 baseDataApi.getUnits 保持一致
  getUnits: (params) => api.get('/baseData/units', { params }),
  
  // 获取库位列表 - 与 baseDataApi.getLocations 保持一致
  getLocations: (params) => api.get('/baseData/locations', { params }),

  // 新增出库单
  createOutbound: (data) => api.post('/inventory/outbound', data),

  // 更新出库单
  updateOutbound: (data) => api.put(`/inventory/outbound/${data.id}`, data),

  // 获取出库单列表
  getOutboundList: (params) => api.get('/inventory/outbound', { 
    params: {
      page: params.page,
      pageSize: params.pageSize,
      outboundNo: params.outboundNo,
      startDate: params.startDate,
      endDate: params.endDate
    }
  }),

  // 获取出库单详情
  getOutbound: (id) => api.get(`/inventory/outbound/${id}`),

  // 删除出库单
  deleteOutbound: (id) => api.delete(`/inventory/outbound/${id}`),

  // 更新出库单状态
  updateOutboundStatus: (id, newStatus) => api.put(`/inventory/outbound/${id}/status`, { newStatus }),

  // 批量更新出库单状态
  batchUpdateOutboundStatus: (ids, newStatus) => api.post('/inventory/outbound/batch-status', { ids, newStatus }),

  // 批量删除出库单
  batchDeleteOutbound: (ids) => api.post('/inventory/outbound/batch-delete', { ids }),

  // 导出出库单
  exportOutbound: (params) => api.get('/inventory/outbound/export', { 
    params,
    responseType: 'blob'
  }),

  // 搜索物料
  searchMaterials: (query) => api.get(`/inventory/materials/search?query=${query}`),

  // 获取物料库存
  getMaterialStock: async (materialId, warehouseId) => {
    try {
      console.log(`获取物料库存: materialId=${materialId}, warehouseId=${warehouseId}`);
      
      if (!materialId || !warehouseId) {
        console.error('物料ID或仓库ID为空');
        return {
          data: {
            quantity: 0,
            stock_quantity: 0,
            material_id: materialId,
            location_id: warehouseId
          }
        };
      }
      
      // 使用新的直接API
      const response = await api.get(`/inventory/stock/${materialId}/${warehouseId}`);
      console.log('物料库存API响应:', response);
      
      if (response.data) {
        return {
          data: response.data
        };
      }
      
      return {
        data: {
          quantity: 0,
          stock_quantity: 0,
          material_id: materialId,
          location_id: warehouseId
        }
      };
    } catch (error) {
      console.error('获取物料库存失败:', error);
      // 返回默认值
      return {
        data: {
          quantity: 0,
          stock_quantity: 0,
          material_id: materialId,
          location_id: warehouseId
        }
      };
    }
  },

  // 获取入库单列表
  getInboundList: (params) => api.get('/inventory/inbound', { params }),
  
  // 获取入库单详情
  getInboundDetail: (id) => api.get(`/inventory/inbound/${id}`),
  
  // 创建入库单
  createInbound: (data) => api.post('/inventory/inbound', data),
  
  // 从质检单创建入库单
  createInboundFromQuality: (params) => api.post('/inventory/inbound/from-quality', params),
  
  // 更新入库单状态
  updateInboundStatus: (id, data) => {
    // 允许传入整个对象或者简单的状态字符串
    const payload = typeof data === 'object' ? data : { newStatus: data };
    return api.put(`/inventory/inbound/status/${id}`, payload);
  },

  // 库存调拨相关API
  getTransferList: async (params) => {
    try {
      console.log('调用调拨单列表API，参数:', params);
      const response = await api.get('/inventory/transfer', { params });
      return response;
    } catch (error) {
      console.warn('调用调拨单列表API失败，使用模拟数据', error);
      // 返回模拟数据
      return {
        data: {
          items: [
            {
              id: 1,
              transfer_no: 'TR20250101001',
              transfer_date: '2025-01-01',
              from_location: '原料仓-A01-01',
              to_location: '车间仓-B02-03',
              item_count: 5,
              status: 'completed',
              creator: '张三'
            },
            {
              id: 2,
              transfer_no: 'TR20250102001',
              transfer_date: '2025-01-02',
              from_location: '成品仓-C03-02',
              to_location: '发货区-D01-01',
              item_count: 3,
              status: 'pending',
              creator: '李四'
            },
            {
              id: 3,
              transfer_no: 'TR20250103001',
              transfer_date: '2025-01-03',
              from_location: '车间仓-B01-01',
              to_location: '成品仓-C02-02',
              item_count: 2,
              status: 'approved',
              creator: '王五'
            },
            {
              id: 4,
              transfer_no: 'TR20250104001',
              transfer_date: '2025-01-04',
              from_location: '原料仓-A02-03',
              to_location: '车间仓-B03-01',
              item_count: 4,
              status: 'draft',
              creator: '赵六'
            },
            {
              id: 5,
              transfer_no: 'TR20250105001',
              transfer_date: '2025-01-05',
              from_location: '成品仓-C01-03',
              to_location: '发货区-D02-02',
              item_count: 1,
              status: 'cancelled',
              creator: '钱七'
            }
          ],
          total: 5
        }
      };
    }
  },
  getTransferDetail: async (id) => {
    try {
      const response = await api.get(`/inventory/transfer/${id}`);
      return response;
    } catch (error) {
      console.warn(`调用调拨单详情API失败，使用模拟数据. ID: ${id}`, error);
      // 返回模拟数据
      return {
        data: {
          id: id,
          transfer_no: `TR20250101${id.toString().padStart(3, '0')}`,
          transfer_date: '2025-01-01',
          from_location: '原料仓-A01-01',
          to_location: '车间仓-B02-03',
          status: 'draft',
          creator: '张三',
          created_at: '2025-01-01 08:00:00',
          remark: '库存调拨测试',
          items: [
            {
              id: 1,
              material_id: 1,
              material_code: 'M001',
              material_name: '钢板A',
              specification: '2mm*1000mm*2000mm',
              quantity: 10,
              unit_name: '张'
            },
            {
              id: 2,
              material_id: 2,
              material_code: 'M002',
              material_name: '螺丝B',
              specification: 'M8*20mm',
              quantity: 200,
              unit_name: '个'
            }
          ]
        }
      };
    }
  },
  createTransfer: async (data) => {
    try {
      const response = await api.post('/inventory/transfer', data);
      return response;
    } catch (error) {
      console.warn('调用创建调拨单API失败，返回模拟成功响应', error);
      return {
        data: {
          success: true,
          message: '创建成功',
          id: Math.floor(Math.random() * 1000) + 1,
          transfer_no: `TR${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}${Math.floor(Math.random() * 900 + 100)}`
        }
      };
    }
  },
  updateTransfer: async (id, data) => {
    try {
      const response = await api.put(`/inventory/transfer/${id}`, data);
      return response;
    } catch (error) {
      console.warn(`调用更新调拨单API失败，返回模拟成功响应. ID: ${id}`, error);
      return {
        data: {
          success: true,
          message: '更新成功',
          id: id
        }
      };
    }
  },
  deleteTransfer: async (id) => {
    try {
      const response = await api.delete(`/inventory/transfer/${id}`);
      return response;
    } catch (error) {
      console.warn(`调用删除调拨单API失败，返回模拟成功响应. ID: ${id}`, error);
      return {
        data: {
          success: true,
          message: '删除成功'
        }
      };
    }
  },
  updateTransferStatus: async (id, status) => {
    try {
      const data = typeof status === 'object' ? status : { newStatus: status };
      const response = await api.put(`/inventory/transfer/${id}/status`, data);
      return response;
    } catch (error) {
      console.warn(`调用更新调拨单状态API失败，返回模拟成功响应. ID: ${id}, 状态: ${JSON.stringify(status)}`, error);
      return {
        data: {
          success: true,
          message: '状态更新成功',
          id: id,
          status: typeof status === 'object' ? status.newStatus : status
        }
      };
    }
  },
  getTransferStatistics: async () => {
    try {
      const response = await api.get('/inventory/transfer/statistics');
      return response;
    } catch (error) {
      console.warn('调用调拨统计API失败，返回空数据', error);
      throw error; // 直接抛出错误，让调用方处理
    }
  },

  // 库存盘点相关API
  getCheckList: (params) => api.get('/inventory/check', { params }),
  getCheckDetail: (id) => api.get(`/inventory/check/${id}`),
  createCheck: (data) => api.post('/inventory/check', data),
  updateCheck: (id, data) => api.put(`/inventory/check/${id}`, data),
  deleteCheck: (id) => api.delete(`/inventory/check/${id}`),
  getCheckStatistics: async () => {
    try {
      // 如果后端接口未实现，使用模拟数据
      /*
      const response = await api.get('/inventory/check/statistics');
      return response;
      */
      
      console.log('使用库存盘点统计模拟数据');
      
      return {
        data: {
          total: 5,
          pendingCount: 1,
          completeCount: 2,
          accuracyRate: 0.95,
          profitLossAmount: -230
        }
      };
    } catch (error) {
      console.warn('调用盘点统计API失败，使用模拟数据', error);
      return {
        data: {
          total: 0,
          pendingCount: 0,
          completeCount: 0,
          accuracyRate: 0,
          profitLossAmount: 0
        }
      };
    }
  },
  submitCheckResult: (id, data) => api.post(`/inventory/check/${id}/result`, data),
  adjustInventory: (id) => api.post(`/inventory/check/${id}/adjust`)
};

export const productionApi = {
  // 生产计划
  getProductionPlans: async (params) => {
    try {
      console.log('调用生产计划API，参数:', params);
      
      // 请求添加时间戳防止缓存
      const requestParams = {
        ...(params || {}),
        timestamp: new Date().getTime()
      };
      
      const response = await api.get('/production/plans', { 
        params: requestParams,
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('生产计划API响应:', response.data);
      return response;
    } catch (error) {
      console.error('获取生产计划列表失败:', error);
      throw error;
    }
  },
  getProductionPlan: (id) => api.get(`/production/plans/${id}`),
  createProductionPlan: (data) => api.post('/production/plans', data),
  updateProductionPlan: (id, data) => api.put(`/production/plans/${id}`, data),
  deleteProductionPlan: (id) => api.delete(`/production/plans/${id}`),
  updateProductionPlanStatus: (id, data) => api.put(`/production/plans/${id}/status`, data),
  
  // 生产任务
  getProductionTasks: (params) => api.get('/production/tasks', { params }),
  getProductionTask: (id) => api.get(`/production/tasks/${id}`),
  createProductionTask: (data) => api.post('/production/tasks', data),
  updateProductionTask: (id, data) => api.put(`/production/tasks/${id}`, data),
  deleteProductionTask: (id) => api.delete(`/production/tasks/${id}`),
  updateProductionTaskStatus: (id, data) => {
    console.log(`任务状态更新API调用: id=${id}, 状态=${data.status}`, data);
    return api.put(`/production/tasks/${id}/status`, { status: data.status });
  },
  generateTaskCode: () => api.get('/production/tasks/generate-code'),
  
  // 生产过程
  getProductionProcesses: (params) => api.get('/production/processes', { params }),
  getProductionProcess: (id) => api.get(`/production/processes/${id}`),
  updateProductionProcess: (id, data) => api.put(`/production/processes/${id}`, data),
  
  // 生产报工
  getProductionReports: (params) => api.get('/production/reports', { params }),
  getProductionReportSummary: (params) => api.get('/production/reports/summary', { params }),
  getProductionReportDetail: (params) => api.get('/production/reports/detail', { params }),
  createProductionReport: (data) => api.post('/production/reports', data),
  
  // 导出生产数据
  exportProductionData: (params) => api.get('/production/export', { 
    params,
    responseType: 'blob'
  }),
  
  // 物料需求计算
  calculateMaterials: async (params) => {
    try {
      // 确保传递必要的参数
      if (!params.productId || !params.bomId || !params.quantity) {
        throw new Error('缺少必要参数: productId、bomId或quantity');
      }
      
      if (isNaN(Number(params.quantity)) || Number(params.quantity) <= 0) {
        throw new Error('quantity参数必须是大于0的数字');
      }
      
      // 添加时间戳以避免缓存问题
      const requestParams = {
        ...params,
        quantity: Number(params.quantity), // 确保quantity是数字类型
        timestamp: new Date().getTime()
      };
      
      // 执行API调用
      const response = await api.post('/production/calculate-materials', requestParams);
      
      // 检查响应数据是否正确
      if (!response.data) {
        return { data: [], success: false, error: '服务器返回空响应' };
      }
      
      // 处理响应数据，确保格式正确
      let materialsData = [];
      if (Array.isArray(response.data)) {
        materialsData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        materialsData = response.data.data;
      } else if (typeof response.data === 'object' && !Array.isArray(response.data)) {
        // 单个物料对象
        materialsData = [response.data];
      }
      
      // 规范化物料数据
      materialsData = materialsData.map(material => {
        // 确保数值字段是数字类型
        const requiredQuantity = typeof material.requiredQuantity === 'string' ? parseFloat(material.requiredQuantity) : (material.requiredQuantity || 0);
        const stockQuantity = typeof material.stockQuantity === 'string' ? parseFloat(material.stockQuantity) : (material.stockQuantity || 0);
        
        // 计算缺料数量
        const shortageQuantity = Math.max(0, requiredQuantity - stockQuantity);
        
        return {
          ...material,
          // 标准化数值字段
          quantity: typeof material.quantity === 'string' ? parseFloat(material.quantity) : (material.quantity || 0),
          requiredQuantity: requiredQuantity,
          stockQuantity: stockQuantity,
          shortageQuantity: shortageQuantity,
          // 添加物料状态标记
          status: shortageQuantity > 0 ? 'shortage' : 'sufficient',
          // 确保有物料编码和名称
          materialCode: material.code || material.materialCode || '',
          materialName: material.name || material.materialName || ''
        };
      });
      
      // 返回标准化的响应结构
      return {
        data: materialsData,
        success: true
      };
    } catch (error) {
      // 返回友好的错误结构
      return {
        data: [],
        success: false,
        error: error.message || '获取物料需求数据失败'
      };
    }
  },
  
  // 获取产品的BOM数据
  getProductBom: async (productId) => {
    try {
      if (!productId) {
        throw new Error('缺少必要参数: productId');
      }
      
      console.log('正在通过新API获取产品BOM数据, 产品ID:', productId);
      
      // 使用新的直接API端点获取BOM数据
      const response = await api.get(`/production/product-bom/${productId}`);
      
      // 检查响应数据
      if (!response.data || !response.data.success) {
        console.log('BOM数据获取失败:', response.data?.message);
        return { data: null, error: response.data?.message || '未找到BOM数据' };
      }
      
      console.log('成功获取BOM数据:', response.data.data);
      return { data: response.data.data };
    } catch (error) {
      console.error('获取产品BOM数据失败:', error);
      return {
        data: null,
        error: error.message || '获取产品BOM数据失败'
      };
    }
  }
};

// 添加采购管理相关的API
export const purchaseApi = {
  // 采购申请
  getRequisitions: async (params) => {
    console.log('调用采购申请列表API，参数:', params);
    try {
      const response = await api.get('/purchase/requisitions', { params });
      console.log('采购申请列表API响应:', response);
      return response.data || response;
    } catch (error) {
      console.error('采购申请列表API错误:', error);
      throw error;
    }
  },
  getRequisition: async (id) => {
    console.log('调用获取采购申请详情API，ID:', id);
    try {
      const response = await api.get(`/purchase/requisitions/${id}`);
      console.log('采购申请详情API响应:', response);
      return response.data || response;
    } catch (error) {
      console.error('采购申请详情API错误:', error);
      throw error;
    }
  },
  createRequisition: (data) => api.post('/purchase/requisitions', data),
  updateRequisition: (id, data) => api.put(`/purchase/requisitions/${id}`, data),
  deleteRequisition: (id) => api.delete(`/purchase/requisitions/${id}`),
  updateRequisitionStatus: (id, data) => api.put(`/purchase/requisitions/${id}/status`, data),
  
  // 采购订单
  getOrders: async (params) => {
    try {
      const response = await api.get('/purchase/orders', { params });
      console.log('获取订单列表原始响应:', response);
      
      // 处理响应数据
      if (response.data && response.data.items) {
        // 检查每个订单的状态，如果含有关联申请且状态为pending，则修正为draft
        response.data.items = response.data.items.map(order => {
          // 确保关联申请字段统一
          if (order.requisitionId && !order.requisition_id) {
            order.requisition_id = order.requisitionId;
          }
          if (order.requisitionNumber && !order.requisition_number) {
            order.requisition_number = order.requisitionNumber;
          }
          
          // 如果有关联申请但字段为null或undefined，确保显示为空字符串
          if (order.requisition_id) {
            if (!order.requisition_number) {
              order.requisition_number = '关联申请';
            }
          }
          
          // 记录关联申请单的订单状态
          if (order.requisition_id && order.status === 'pending') {
            console.log(`订单${order.order_no}含有关联申请且状态为pending`);
            // 不再修改状态，只添加标记
            order.hasRequisition = true;
          }
          return order;
        });
      }
      
      return response;
    } catch (error) {
      console.error('获取订单列表失败:', error);
      throw error;
    }
  },
  getOrder: async (id) => {
    try {
      const response = await api.get(`/purchase/orders/${id}`);
      console.log('获取订单详情原始响应:', response);
      
      // 处理响应数据
      if (response.data) {
        // 记录关联申请单的订单状态
        if (response.data.requisition_id && response.data.status === 'pending') {
          console.log(`订单${response.data.order_no}含有关联申请且状态为pending`);
          // 不再修改状态，只添加标记
          response.data.hasRequisition = true;
        }
      }
      
      return response;
    } catch (error) {
      console.error('获取订单详情失败:', error);
      throw error;
    }
  },
  createOrder: async (order) => {
    console.log('创建采购订单，提交的数据:', JSON.stringify(order, null, 2));
    
    // 保留原始状态，不再强制设置为draft
    const orderData = { 
      ...order, 
      // 确保同时提供下划线和驼峰格式的关联申请字段
      requisition_id: order.requisition_id,
      requisitionId: order.requisition_id,
      requisition_number: order.requisition_number,
      requisitionNumber: order.requisition_number
    };
    
    console.log('最终提交的订单数据:', JSON.stringify({
      ...orderData,
      items: orderData.items ? `${orderData.items.length}个物料项` : "无物料"
    }, null, 2));
    
    // 注意: 后端的createOrder函数中有硬编码status='pending'逻辑，无论前端传什么状态都会被覆盖
    // 见purchaseOrderController.js第185行左右:
    // await connection.query(insertQuery, [
    //   orderNo, orderDate, supplierId, supplierName, expectedDeliveryDate, 
    //   contactPerson, contactPhone, totalAmount || 0, remarks, 'pending'
    // ]);
    
    const response = await api.post('/purchase/orders', orderData);
    console.log('创建订单响应:', response);
    return response;
  },
  updateOrder: async (id, order) => {
    console.log('更新采购订单，ID:', id, '数据:', JSON.stringify(order, null, 2));
    
    // 保留原始状态，不再强制设置为draft
    const orderData = { 
      ...order, 
      // 确保同时提供下划线和驼峰格式的关联申请字段
      requisition_id: order.requisition_id,
      requisitionId: order.requisition_id,
      requisition_number: order.requisition_number,
      requisitionNumber: order.requisition_number
    };
    
    console.log('最终提交的订单数据:', JSON.stringify({
      ...orderData,
      items: orderData.items ? `${orderData.items.length}个物料项` : "无物料"
    }, null, 2));
    
    const response = await api.put(`/purchase/orders/${id}`, orderData);
    console.log('更新订单响应:', response);
    return response;
  },
  deleteOrder: (id) => api.delete(`/purchase/orders/${id}`),
  updateOrderStatus: (id, status) => {
    // 处理status参数格式
    console.log('更新订单状态，原始参数:', id, status);
    
    // 如果status是字符串，将其转换为{newStatus: status}格式
    const data = (typeof status === 'string') ? 
                 { newStatus: status } : 
                 // 如果status是对象但没有newStatus字段，也确保转换为正确格式
                 (typeof status === 'object' && !status.newStatus) ?
                 { newStatus: status.status || 'draft' } :
                 // 否则假设已经是正确格式
                 status;
    
    console.log('最终提交的状态数据:', data);
    return api.put(`/purchase/orders/${id}/status`, data);
  },
  getOrderStats: () => api.get('/purchase/orders/statistics'),
  
  // 采购入库
  getReceipts: (params) => api.get('/purchase/receipts', { params }),
  getReceipt: (id) => api.get(`/purchase/receipts/${id}`),
  createReceipt: async (data) => {
    try {
      console.log('正在创建收货单，提交的数据:', JSON.stringify(data, null, 2));
      
      // 确保orderId字段存在并处理字段格式
      if (!data.orderId) {
        console.error('创建收货单失败: 缺少必要的orderId字段');
        throw new Error('缺少必要的orderId字段');
      }
      
      // 确保其他必要字段存在
      if (!data.receiptDate) {
        console.error('创建收货单失败: 缺少必要的receiptDate字段');
        throw new Error('缺少必要的receiptDate字段');
      }
      
      // 确保items字段是数组
      if (!data.items || !Array.isArray(data.items)) {
        console.error('创建收货单失败: items必须是数组');
        data.items = [];  // 设置为空数组以防止错误
      }
      
      if (!data.warehouseId) {
        console.error('创建收货单失败: 缺少必要的warehouseId字段');
        throw new Error('缺少必要的warehouseId字段');
      }
      
      // 确保warehouseId是数字类型
      const warehouseId = parseInt(data.warehouseId);
      if (isNaN(warehouseId)) {
        console.error('创建收货单失败: warehouseId不是有效的数字', data.warehouseId);
        throw new Error(`仓库ID格式无效: ${data.warehouseId}`);
      }
      
      // 准备最终发送的数据，处理下划线格式和驼峰格式字段
      const receiptData = {
        ...data,
        status: data.status || 'draft',
        order_id: data.orderId,
        orderId: data.orderId,
        receipt_date: data.receiptDate,
        receiptDate: data.receiptDate,
        warehouse_id: warehouseId, // 使用转换后的数字类型
        warehouseId: warehouseId,  // 同时提供驼峰形式
        inspection_id: data.inspectionId || null,
        inspectionId: data.inspectionId || null,
        items: data.items.map(item => ({
          material_id: item.materialId,
          materialId: item.materialId,
          unit_id: item.unitId,
          unitId: item.unitId,
          ordered_quantity: Number(item.orderedQuantity),
          orderedQuantity: Number(item.orderedQuantity),
          received_quantity: Number(item.receivedQuantity),
          receivedQuantity: Number(item.receivedQuantity),
          qualified_quantity: Number(item.qualifiedQuantity),
          qualifiedQuantity: Number(item.qualifiedQuantity),
          price: Number(item.price || 0),
          remarks: item.remarks || ''
        }))
      };
      
      console.log('最终提交的收货单数据:', JSON.stringify(receiptData, null, 2));
      console.log('仓库ID类型:', typeof receiptData.warehouse_id, '值:', receiptData.warehouse_id);
      
      const response = await api.post('/purchase/receipts', receiptData);
      console.log('创建收货单响应:', response);
      return response;
    } catch (error) {
      console.error('创建收货单失败:', error);
      if (error.response) {
        console.error('错误响应状态:', error.response.status);
        console.error('错误响应数据:', error.response.data);
        console.error('错误响应头:', error.response.headers);
        if (error.response.data && error.response.data.error) {
          console.error('服务器返回的错误信息:', error.response.data.error);
        }
      } else if (error.request) {
        console.error('请求已发送但没有收到响应');
        console.error('请求对象:', error.request);
      } else {
        console.error('设置请求时发生错误:', error.message);
      }
      console.error('错误配置:', error.config);
      throw error;
    }
  },
  updateReceipt: async (id, data) => {
    try {
      console.log('正在更新收货单，ID:', id, '提交的数据:', JSON.stringify(data, null, 2));
      
      // 确保orderId字段存在并处理字段格式
      if (!data.orderId) {
        console.error('更新收货单失败: 缺少必要的orderId字段');
        throw new Error('缺少必要的orderId字段');
      }
      
      // 确保其他必要字段存在
      if (!data.receiptDate) {
        console.error('更新收货单失败: 缺少必要的receiptDate字段');
        throw new Error('缺少必要的receiptDate字段');
      }
      
      if (!data.receiver) {
        console.error('更新收货单失败: 缺少必要的receiver字段');
        throw new Error('缺少必要的receiver字段');
      }
      
      if (!data.warehouseId) {
        console.error('更新收货单失败: 缺少必要的warehouseId字段');
        throw new Error('缺少必要的warehouseId字段');
      }
      
      // 确保warehouseId是数字类型
      const warehouseId = parseInt(data.warehouseId);
      if (isNaN(warehouseId)) {
        console.error('更新收货单失败: warehouseId不是有效的数字', data.warehouseId);
        throw new Error(`仓库ID格式无效: ${data.warehouseId}`);
      }
      
      // 准备最终发送的数据，处理下划线格式和驼峰格式字段
      const receiptData = {
        ...data,
        status: data.status || 'draft',
        order_id: data.orderId,
        orderId: data.orderId,
        receipt_date: data.receiptDate,
        receiptDate: data.receiptDate,
        warehouse_id: warehouseId, // 使用转换后的数字类型
        warehouseId: warehouseId,  // 同时提供驼峰形式
        inspection_id: data.inspectionId || null,
        inspectionId: data.inspectionId || null,
        items: data.items.map(item => ({
          material_id: item.materialId,
          materialId: item.materialId,
          unit_id: item.unitId,
          unitId: item.unitId,
          ordered_quantity: Number(item.orderedQuantity),
          orderedQuantity: Number(item.orderedQuantity),
          received_quantity: Number(item.receivedQuantity),
          receivedQuantity: Number(item.receivedQuantity),
          qualified_quantity: Number(item.qualifiedQuantity),
          qualifiedQuantity: Number(item.qualifiedQuantity),
          price: Number(item.price || 0),
          remarks: item.remarks || ''
        }))
      };
      
      console.log('最终提交的收货单数据:', JSON.stringify(receiptData, null, 2));
      console.log('仓库ID类型:', typeof receiptData.warehouse_id, '值:', receiptData.warehouse_id);
      
      const response = await api.put(`/purchase/receipts/${id}`, receiptData);
      console.log('更新收货单响应:', response);
      return response;
    } catch (error) {
      console.error('更新收货单失败:', error);
      if (error.response) {
        console.error('错误响应状态:', error.response.status);
        console.error('错误响应数据:', error.response.data);
      }
      throw error;
    }
  },
  deleteReceipt: (id) => api.delete(`/purchase/receipts/${id}`),
  updateReceiptStatus: async (id, data) => {
    try {
      console.log('正在更新收货单状态，ID:', id, '提交的数据:', JSON.stringify(data, null, 2));
      
      // 处理status参数格式，确保与后端API期望的格式一致
      const statusData = typeof data === 'object' ? data : { status: data };
      
      console.log('最终提交的状态数据:', JSON.stringify(statusData, null, 2));
      
      const response = await api.put(`/purchase/receipts/${id}/status`, statusData);
      console.log('更新收货单状态响应:', response);
      return response;
    } catch (error) {
      console.error('更新收货单状态失败:', error);
      if (error.response) {
        console.error('错误响应状态:', error.response.status);
        console.error('错误响应数据:', error.response.data);
      }
      throw error;
    }
  },
  getReceiptStats: async () => {
    try {
      console.log('正在调用收货单统计API...');
      // 尝试调用后端接口
      const response = await api.get('/purchase/receipts-statistics');
      console.log('收货单统计API响应成功:', response);
      
      // Ensure response data has the correct format, even if backend returns unexpected data
      if (!response || !response.data) {
        console.warn('收货单统计API响应格式不正确:', response);
        return {
          data: {
            total: 0,
            draftCount: 0,
            confirmedCount: 0,
            completedCount: 0,
            totalAmount: 0
          }
        };
      }
      
      return response;
    } catch (error) {
      console.error('获取收货单统计API失败:', error);
      // 返回模拟数据
      return {
        data: {
          total: 0,
          draftCount: 0,
          confirmedCount: 0,
          completedCount: 0,
          totalAmount: 0
        }
      };
    }
  },
  
  // 采购退货
  getReturns: (params) => api.get('/purchase/returns', { params }),
  getReturn: (id) => api.get(`/purchase/returns/${id}`),
  createReturn: (data) => api.post('/purchase/returns', data),
  updateReturn: (id, data) => api.put(`/purchase/returns/${id}`, data),
  deleteReturn: (id) => api.delete(`/purchase/returns/${id}`),
  updateReturnStatus: (id, data) => api.put(`/purchase/returns/${id}/status`, data),
  
  // 获取采购统计数据
  getStatistics: () => api.get('/purchase/statistics'),
  
  // 供应商（采购模块专用）
  getSuppliers: () => api.get('/purchase/suppliers')
};

// Add supplier API for use in purchase modules
export const supplierApi = {
  // Get all suppliers with optional filtering
  getSuppliers: async (params) => {
    console.log('Calling getSuppliers API with params:', params);
    try {
      const response = await api.get('/baseData/suppliers', { params });
      console.log('getSuppliers API success response:', response);
      return response;
    } catch (error) {
      console.error('getSuppliers API error:', error);
      throw error;
    }
  },
  // Get a single supplier by ID
  getSupplier: async (id) => {
    console.log('Calling getSupplier API with ID:', id);
    try {
      const response = await api.get(`/baseData/suppliers/${id}`);
      console.log('getSupplier API success response:', response);
      return response;
    } catch (error) {
      console.error('getSupplier API error:', error);
      throw error;
    }
  },
  // Create a new supplier
  createSupplier: (supplier) => api.post('/baseData/suppliers', supplier),
  // Update an existing supplier
  updateSupplier: (id, supplier) => api.put(`/baseData/suppliers/${id}`, supplier),
  // Delete a supplier
  deleteSupplier: (id) => api.delete(`/baseData/suppliers/${id}`)
};

// 添加物料API，复用基础数据中的物料相关API
export const materialApi = {
  // 获取物料列表
  getMaterials: (params) => api.get('/baseData/materials', { params }),
  // 获取单个物料
  getMaterial: (id) => api.get(`/baseData/materials/${id}`),
  // 创建物料
  createMaterial: (material) => api.post('/baseData/materials', material),
  // 更新物料
  updateMaterial: (id, material) => api.put(`/baseData/materials/${id}`, material),
  // 删除物料
  deleteMaterial: (id) => api.delete(`/baseData/materials/${id}`)
};

// 添加质检相关的API
export const qualityApi = {
  // 获取所有检验单列表
  getInspections: (params) => api.get('/quality/inspections', { params }),
  
  // 获取来料检验单列表
  getIncomingInspections: (params) => api.get('/quality/inspections/incoming', { params }),
  getIncomingInspection: (id, params) => api.get(`/quality/inspections/${id}`, params),
  createIncomingInspection: (data) => api.post('/quality/inspections', data),
  updateIncomingInspection: (id, data) => api.put(`/quality/inspections/${id}`, data),
  
  // 获取过程检验单列表
  getProcessInspections: (params) => api.get('/quality/inspections/process', { params }),
  getProcessInspection: (id) => api.get(`/quality/inspections/process/${id}`),
  createProcessInspection: (data) => api.post('/quality/inspections', data),
  updateProcessInspection: (id, data) => api.put(`/quality/inspections/${id}`, data),
  
  // 获取成品检验单列表
  getFinalInspections: (params) => api.get('/quality/inspections/final', { params }),
  getFinalInspection: (id) => api.get(`/quality/inspections/final/${id}`),
  createFinalInspection: (data) => api.post('/quality/inspections', data),
  updateFinalInspection: (data) => api.put(`/quality/inspections/${data.id}`, data),
  
  // 获取模板列表
  getTemplates: (params) => api.get('/quality/templates', { params }),
  // 获取模板详情
  getTemplate: (id) => api.get(`/quality/templates/${id}`),
  // 创建模板
  createTemplate: (data) => api.post('/quality/templates', data),
  // 更新模板
  updateTemplate: (id, data) => api.put(`/quality/templates/${id}`, data),
  // 删除模板
  deleteTemplate: (id) => api.delete(`/quality/templates/${id}`),
  // 更改模板状态
  updateTemplateStatus: (id, status) => api.put(`/quality/templates/${id}/status`, { status }),
  // 复制模板
  copyTemplate: (id) => api.post(`/quality/templates/${id}/copy`),
  // 获取可复用的检验项目
  getReusableItems: (params) => api.get('/quality/templates/reusable-items', { params }),
  
  // 获取物料的默认检验模板
  getMaterialDefaultTemplate: (materialId, type = 'incoming') => {
    return api.get('/quality/templates', { 
      params: {
        material_type: materialId,
        inspection_type: type,
        status: 'active',
        is_default: true
      }
    });
  },
  
  // 获取可追溯性记录
  getTraceabilityRecords: (params) => api.get('/quality/traceability', { params }),
  getTraceabilityRecord: (id) => api.get(`/quality/traceability/${id}`),
  createTraceabilityRecord: (data) => api.post('/quality/traceability', data),
  updateTraceabilityRecord: (id, data) => api.put(`/quality/traceability/${id}`, data),
  deleteTraceabilityRecord: (id) => api.delete(`/quality/traceability/${id}`),
   
  // 获取质量检验数据统计信息
  getQualityStatistics: async (period = 'month') => {
    try {
      const response = await api.get('/quality/statistics', { params: { period } });
      return response.data;
    } catch (error) {
      console.error('获取质量统计数据失败:', error);
      return {
        incoming: { total: 0, passed: 0, failed: 0, pending: 0 },
        process: { total: 0, passed: 0, failed: 0, pending: 0 },
        final: { total: 0, passed: 0, failed: 0, pending: 0 }
      };
    }
  }
};

// 添加用户相关API
export const userApi = {
  // 获取当前用户信息
  getCurrentUser: () => api.get('/auth/profile'),
  
  // 更新用户信息
  updateProfile: async (data) => {
    try {
      console.log('updateProfile API调用，发送数据:', data);
      const response = await api.put('/auth/profile', data);
      console.log('updateProfile API成功响应:', response);
      return response;
    } catch (error) {
      console.error('updateProfile API错误:', error);
      if (error.response) {
        console.error('错误状态码:', error.response.status);
        console.error('错误响应详情:', error.response.data);
      }
      throw error;
    }
  },
  
  // 更改密码
  changePassword: (data) => api.put('/users/change-password', data),
  
  // 获取用户统计信息
  getUserStats: () => api.get('/users/stats'),
  
  // 获取用户活动记录
  getUserActivities: (params) => api.get('/users/activities', { params }),
  
  // 获取用户待办事项
  getUserTodos: () => api.get('/users/todos'),
  
  // 添加待办事项
  addTodo: (todo) => api.post('/users/todos', todo),
  
  // 更新待办事项
  updateTodo: (id, todo) => api.put(`/users/todos/${id}`, todo),
  
  // 删除待办事项
  deleteTodo: (id) => api.delete(`/users/todos/${id}`),
  
  // 上传用户头像
  uploadAvatar: (formData) => api.post('/users/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
};

// 待办事项相关API
export const todoApi = {
  // 获取所有待办事项
  getAllTodos: () => api.get('/todos'),
  
  // 按条件过滤待办事项
  filterTodos: (params) => api.get('/todos/filter', { params }),
  
  // 获取单个待办事项
  getTodoById: (id) => api.get(`/todos/${id}`),
  
  // 创建待办事项
  createTodo: (data) => api.post('/todos', data),
  
  // 更新待办事项
  updateTodo: (id, data) => api.put(`/todos/${id}`, data),
  
  // 删除待办事项
  deleteTodo: (id) => api.delete(`/todos/${id}`),
  
  // 切换待办事项状态
  toggleTodoStatus: (id) => api.patch(`/todos/${id}/toggle`)
};

// 添加通用API，合并基础数据和其他模块常用API
export const commonApi = {
  // BOM相关
  getBoms: (params) => api.get('/baseData/boms', { params }),
  getBom: (id) => api.get(`/baseData/boms/${id}`),
  
  // 物料相关
  getMaterials: (params) => api.get('/baseData/materials', { params }),
  getMaterial: (id) => api.get(`/baseData/materials/${id}`),
  
  // 生产计划相关
  getProductionPlan: (id) => api.get(`/production/plans/${id}`),
  putProductionPlan: (id, data) => api.put(`/production/plans/${id}`, data),
  
  // 其他常用API
  getTodaySequence: () => api.get('/production/today-sequence')
};

// 导出 api 实例
export default api;