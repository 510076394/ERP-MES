const { materialModel, bomModel, customerModel, supplierModel, categoryModel, unitModel } = require('../models/baseData');
const locationsModel = require('../models/locations');
const { pool } = require('../config/db');

const baseDataController = {
  // 分类管理
  async getAllCategories(req, res) {
    try {
      const result = await categoryModel.getAllCategories(req.query);
      res.json({
        list: result,
        total: result.length
      });
    } catch (error) {
      console.error('获取分类列表失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async getCategoryById(req, res) {
    try {
      const category = await categoryModel.getCategoryById(req.params.id);
      if (category) {
        res.json(category);
      } else {
        res.status(404).json({ message: '分类不存在' });
      }
    } catch (error) {
      console.error('获取分类详情失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async createCategory(req, res) {
    try {
      const newCategory = await categoryModel.createCategory(req.body);
      res.status(201).json(newCategory);
    } catch (error) {
      console.error('创建分类失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async updateCategory(req, res) {
    try {
      const updatedCategory = await categoryModel.updateCategory(req.params.id, req.body);
      res.json(updatedCategory);
    } catch (error) {
      console.error('更新分类失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async deleteCategory(req, res) {
    try {
      await categoryModel.deleteCategory(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error('删除分类失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // 单位管理
  async getAllUnits(req, res) {
    try {
      const result = await unitModel.getAllUnits(req.query);
      res.json({
        list: result,
        total: result.length
      });
    } catch (error) {
      console.error('获取单位列表失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async getUnitById(req, res) {
    try {
      const unit = await unitModel.getUnitById(req.params.id);
      if (unit) {
        res.json(unit);
      } else {
        res.status(404).json({ message: '单位不存在' });
      }
    } catch (error) {
      console.error('获取单位详情失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async createUnit(req, res) {
    try {
      const newUnit = await unitModel.createUnit(req.body);
      res.status(201).json(newUnit);
    } catch (error) {
      console.error('创建单位失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async updateUnit(req, res) {
    try {
      const updatedUnit = await unitModel.updateUnit(req.params.id, req.body);
      res.json(updatedUnit);
    } catch (error) {
      console.error('更新单位失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async deleteUnit(req, res) {
    try {
      await unitModel.deleteUnit(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error('删除单位失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // 物料管理
  async getAllMaterials(req, res) {
    try {
      const { page, pageSize, ...filters } = req.query;
      const result = await materialModel.getAllMaterials(page, pageSize, filters);
      
      // 直接返回原始结果，确保前端能正确处理
      res.json(result);
    } catch (error) {
      console.error('获取物料列表失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async getMaterialById(req, res) {
    try {
      const material = await materialModel.getMaterialById(req.params.id);
      if (material) {
        res.json(material);
      } else {
        res.status(404).json({ message: '物料不存在' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async createMaterial(req, res) {
    try {
      const newMaterial = await materialModel.createMaterial(req.body);
      res.status(201).json(newMaterial);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async updateMaterial(req, res) {
    try {
      const updatedMaterial = await materialModel.updateMaterial(req.params.id, req.body);
      res.json(updatedMaterial);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async deleteMaterial(req, res) {
    try {
      await materialModel.deleteMaterial(req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // 导入物料数据
  async importMaterials(req, res) {
    try {
      if (!req.body || !req.body.materials || !Array.isArray(req.body.materials)) {
        return res.status(400).json({ message: '无效的请求数据，需要提供物料数组' });
      }

      const result = await materialModel.importMaterials(req.body.materials);
      res.status(200).json(result);
    } catch (error) {
      console.error('导入物料失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // 导出物料数据
  async exportMaterials(req, res) {
    try {
      const filters = req.body;
      const materials = await materialModel.exportMaterials(filters);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=materials.xlsx');
      
      res.send(materials);
    } catch (error) {
      console.error('导出物料失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // BOM管理
  async getAllBoms(req, res) {
    try {
      const { page = 1, pageSize = 10, product_id, status, ...filters } = req.query;
      
      if (product_id) {
        // 如果提供了product_id，直接查找最新版本的BOM
        console.log('根据产品ID查询BOM:', product_id);
        
        // 首先验证该ID是否对应的是产品
        const [productCheck] = await pool.query(
          'SELECT m.id, m.name, m.code, c.name as category_name FROM materials m LEFT JOIN categories c ON m.category_id = c.id WHERE m.id = ?',
          [product_id]
        );
        
        if (productCheck.length === 0) {
          return res.status(404).json({
            message: '未找到该物料',
            data: []
          });
        }
        
        // 由于数据库中没有明确标记产品的字段，我们不再做类型检查
        // 如果物料存在且有BOM，我们就认为它是一个产品
        
        // 构建过滤条件
        const bomFilters = { ...filters };
        if (status) {
          bomFilters.status = status;
        }

        const bomResult = await bomModel.getLatestBomByProductId(product_id, status);
        console.log('获取到BOM结果:', JSON.stringify(bomResult, null, 2));
        
        if (!bomResult || !bomResult.data || bomResult.data.length === 0) {
          return res.status(404).json({ 
            message: '未找到相关的BOM信息',
            data: []
          });
        }
        
        // 直接返回 bomResult，保持与 model 层返回格式一致
        res.json(bomResult);
      } else {
        // 否则，使用原来的分页逻辑
        const result = await bomModel.getAllBoms(page, pageSize, filters);
        res.json({
          data: result.data || [],
          pagination: result.pagination || {
            total: result.total || 0,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
          }
        });
      }
    } catch (error) {
      console.error('获取BOM信息失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async getBomById(req, res) {
    try {
      // 获取BOM主表信息
      const [bomRows] = await pool.query(`
        SELECT bm.*, m.name as product_name, m.code as product_code
        FROM bom_masters bm
        LEFT JOIN materials m ON bm.product_id = m.id
        WHERE bm.id = ?
      `, [req.params.id]);

      if (bomRows && bomRows.length > 0) {
        const bom = bomRows[0];
        
        // 获取BOM明细
        const [detailRows] = await pool.query(`
          SELECT 
            bd.*,
            m.name as material_name,
            m.code as material_code,
            u.name as unit_name
          FROM bom_details bd
          LEFT JOIN materials m ON bd.material_id = m.id
          LEFT JOIN units u ON bd.unit_id = u.id
          WHERE bd.bom_id = ?
        `, [req.params.id]);

        // 格式化BOM数据，确保字段类型正确
        const formattedBom = {
          id: bom.id,
          product_id: bom.product_id,
          version: bom.version,
          status: Number(bom.status),
          remark: bom.remark || '',
          product_code: bom.product_code,
          product_name: bom.product_name,
          created_at: bom.created_at,
          updated_at: bom.updated_at,
          details: detailRows.map(detail => ({
            id: detail.id,
            bom_id: detail.bom_id,
            material_id: detail.material_id,
            quantity: Number(detail.quantity),
            unit_id: detail.unit_id,
            remark: detail.remark || '',
            material_code: detail.material_code,
            material_name: detail.material_name,
            unit_name: detail.unit_name
          }))
        };

        // 返回格式化后的BOM信息
        res.json({
          data: formattedBom
        });
      } else {
        res.status(404).json({ message: 'BOM不存在' });
      }
    } catch (error) {
      console.error('获取BOM详情失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async createBom(req, res) {
    try {
      console.log('接收到创建BOM请求:', JSON.stringify(req.body, null, 2));
      
      const { bomData, details } = req.body;
      
      // 验证请求数据
      if (!bomData) {
        console.error('创建BOM失败: bomData不存在');
        return res.status(400).json({ message: 'bomData是必需的' });
      }
      
      if (!details || !Array.isArray(details) || details.length === 0) {
        console.error('创建BOM失败: details不存在或不是数组或为空');
        return res.status(400).json({ message: 'details必须是非空数组' });
      }
      
      if (!bomData.product_id) {
        console.error('创建BOM失败: 产品ID不存在');
        return res.status(400).json({ message: '产品ID是必需的' });
      }
      
      if (!bomData.version) {
        console.error('创建BOM失败: 版本号不存在');
        return res.status(400).json({ message: '版本号是必需的' });
      }
      
      // 确保状态是数字类型
      if (bomData.status !== undefined) {
        bomData.status = Number(bomData.status);
      }
      
      // 验证每个明细项
      for (const detail of details) {
        if (!detail.material_id) {
          console.error('创建BOM失败: 明细中缺少物料ID');
          return res.status(400).json({ message: '明细中的物料ID是必需的' });
        }
        
        if (!detail.quantity) {
          console.error('创建BOM失败: 明细中缺少数量');
          return res.status(400).json({ message: '明细中的数量是必需的' });
        }
        
        if (!detail.unit_id) {
          console.error('创建BOM失败: 明细中缺少单位ID');
          return res.status(400).json({ message: '明细中的单位ID是必需的' });
        }
        
        // 确保数量和单位ID是数字类型
        detail.quantity = Number(detail.quantity);
        detail.unit_id = Number(detail.unit_id);
      }
      
      console.log('验证通过，开始创建BOM');
      const newBom = await bomModel.createBom(bomData, details);
      console.log('BOM创建成功:', JSON.stringify(newBom, null, 2));
      res.status(201).json(newBom);
    } catch (error) {
      console.error('创建BOM失败:', error);
      res.status(500).json({ message: error.message || '创建BOM失败' });
    }
  },

  async updateBom(req, res) {
    try {
      const { bomData, details } = req.body;
      const updatedBom = await bomModel.updateBom(req.params.id, bomData, details);
      res.json(updatedBom);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async deleteBom(req, res) {
    try {
      await bomModel.deleteBom(req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // 客户管理
  async getAllCustomers(req, res) {
    try {
      const { page, pageSize, ...filters } = req.query;
      const result = await customerModel.getAllCustomers(parseInt(page) || 1, parseInt(pageSize) || 10, filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getCustomerById(req, res) {
    try {
      const customer = await customerModel.getCustomerById(req.params.id);
      if (customer) {
        res.json(customer);
      } else {
        res.status(404).json({ message: '客户不存在' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async createCustomer(req, res) {
    try {
      // 检查必填字段
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: '客户名称为必填项' });
      }

      const newCustomer = await customerModel.createCustomer(req.body);
      res.status(201).json(newCustomer);
    } catch (error) {
      console.error('创建客户失败:', error);
      res.status(500).json({ message: error.message || '创建客户失败' });
    }
  },

  async updateCustomer(req, res) {
    try {
      const customerId = req.params.id;
      const updateData = req.body;
      
      // 检查客户是否存在
      const existingCustomer = await customerModel.getCustomerById(customerId);
      if (!existingCustomer) {
        return res.status(404).json({ message: '客户不存在' });
      }

      // 验证更新数据
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: '没有提供要更新的数据' });
      }

      const updatedCustomer = await customerModel.updateCustomer(customerId, updateData);
      
      if (!updatedCustomer) {
        return res.status(500).json({ message: '更新客户失败，请稍后重试' });
      }

      res.json(updatedCustomer);
    } catch (error) {
      console.error('更新客户时发生错误:', error);
      res.status(500).json({ message: '服务器内部错误', error: error.message });
    }
  },

  async deleteCustomer(req, res) {
    try {
      await customerModel.deleteCustomer(req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // 供应商管理
  async getAllSuppliers(req, res) {
    try {
      console.log('获取所有供应商数据，查询参数:', req.query);
      
      // 直接查询所有供应商，确保获取所有字段
      const [rows] = await pool.query(`
        SELECT 
          id, 
          code, 
          name, 
          contact_person, 
          contact_phone, 
          email, 
          address, 
          status, 
          remark,
          created_at,
          updated_at
        FROM suppliers 
        ORDER BY id DESC
      `);
      
      console.log(`查询到${rows.length}条供应商记录，包含字段:`, 
        rows.length > 0 ? Object.keys(rows[0]).join(', ') : '无数据');
      
      if (rows.length > 0) {
        console.log('第一条记录示例:', JSON.stringify(rows[0], null, 2));
      }
      
      // 直接返回数组形式的数据
      res.json(rows);
    } catch (error) {
      console.error('获取供应商列表失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async getSupplierById(req, res) {
    try {
      const supplier = await supplierModel.getSupplierById(req.params.id);
      if (supplier) {
        res.json(supplier);
      } else {
        res.status(404).json({ message: '供应商不存在' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async createSupplier(req, res) {
    try {
      const newSupplier = await supplierModel.createSupplier(req.body);
      res.status(201).json(newSupplier);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async updateSupplier(req, res) {
    try {
      const updatedSupplier = await supplierModel.updateSupplier(req.params.id, req.body);
      res.json(updatedSupplier);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async deleteSupplier(req, res) {
    try {
      await supplierModel.deleteSupplier(req.params.id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // 获取物料的BOM信息
  async getMaterialBom(req, res) {
    try {
      const materialId = req.params.id;
      const result = await bomModel.getLatestBomByProductId(materialId);
      
      if (result.found) {
        res.json(result.bom);
      } else {
        // 不返回404，而是返回一个表示没有BOM的对象
        res.json({ 
          id: null, 
          product_id: materialId,
          found: false,
          message: '未找到该物料的BOM' 
        });
      }
    } catch (error) {
      console.error('获取物料BOM失败:', error);
      res.status(500).json({ message: error.message || '获取物料BOM失败' });
    }
  },

  // 获取供应商选项
  async getSupplierOptions(req, res) {
    try {
      const [rows] = await pool.query(`
        SELECT id, code, name 
        FROM suppliers 
        WHERE status = 1 
        ORDER BY name
      `);
      
      const options = rows.map(row => ({
        value: row.id,
        label: `${row.code} - ${row.name}`
      }));
      
      res.json(options);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // 获取物料选项
  async getMaterialOptions(req, res) {
    try {
      const { search = '' } = req.query;
      let whereClause = 'WHERE m.status = 1';
      const params = [];
      
      if (search) {
        whereClause += ' AND (m.name LIKE ? OR m.code LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      const [rows] = await pool.query(`
        SELECT m.id, m.code, m.name, m.specs, u.name as unit_name
        FROM materials m
        JOIN units u ON m.unit_id = u.id
        ${whereClause}
        ORDER BY m.name
      `, params);
      
      const options = rows.map(row => ({
        value: row.id,
        label: `${row.code} - ${row.name}${row.specs ? ` (${row.specs})` : ''} - ${row.unit_name}`
      }));
      
      res.json(options);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // 获取产品的BOM信息
  async getBomByProductId(req, res) {
    try {
      const productId = req.params.id;
      const { status = 1 } = req.query;
      
      const result = await bomModel.getLatestBomByProductId(productId, status);
      
      if (result.data && result.data.length > 0) {
        res.json({
          data: result.data[0]
        });
      } else {
        res.status(404).json({ 
          message: '未找到该产品的BOM信息',
          data: null
        });
      }
    } catch (error) {
      console.error('获取产品BOM失败:', error);
      res.status(500).json({ message: error.message || '获取产品BOM失败' });
    }
  },

  // 库位管理
  async getAllLocations(req, res) {
    try {
      const { page = 1, pageSize = 10, search = '' } = req.query;
      const result = await locationsModel.getAll(search, page, pageSize);
      res.json(result);
    } catch (error) {
      console.error('获取库位列表失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async getLocationById(req, res) {
    try {
      const location = await locationsModel.getById(req.params.id);
      if (location) {
        res.json(location);
      } else {
        res.status(404).json({ message: '库位不存在' });
      }
    } catch (error) {
      console.error('获取库位详情失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async createLocation(req, res) {
    try {
      const newLocationId = await locationsModel.create(req.body);
      const newLocation = await locationsModel.getById(newLocationId);
      res.status(201).json(newLocation);
    } catch (error) {
      console.error('创建库位失败:', error);
      // 返回更详细的错误信息
      if (error.message.includes('already exists')) {
        return res.status(400).json({ message: error.message });
      } else if (error.message.includes('Missing required fields')) {
        return res.status(400).json({ message: error.message });
      } else if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: '库位编码已存在，请使用其他编码' });
      }
      res.status(500).json({ 
        message: error.message || '创建库位失败，请稍后重试',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  async updateLocation(req, res) {
    try {
      await locationsModel.update(req.params.id, req.body);
      const updatedLocation = await locationsModel.getById(req.params.id);
      res.json(updatedLocation);
    } catch (error) {
      console.error('更新库位失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async deleteLocation(req, res) {
    try {
      await locationsModel.delete(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error('删除库位失败:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // 工序模板相关方法
  // 获取所有工序模板
  async getAllProcessTemplates(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const productId = req.query.productId || '';
      const name = req.query.name || '';

      // 构建筛选条件
      let conditions = [];
      let params = [];

      if (productId) {
        conditions.push('pt.product_id = ?');
        params.push(productId);
      }

      if (name) {
        conditions.push('pt.name LIKE ?');
        params.push(`%${name}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // 计算总数
      const countSql = `
        SELECT COUNT(*) as total
        FROM process_templates pt
        ${whereClause}
      `;
      
      const [countResult] = await pool.query(countSql, params);
      const total = countResult[0].total;
      
      // 查询数据
      const offset = (page - 1) * pageSize;
      const sql = `
        SELECT 
          pt.*,
          m.code as product_code,
          m.name as product_name
        FROM process_templates pt
        LEFT JOIN materials m ON pt.product_id = m.id
        ${whereClause}
        ORDER BY pt.id DESC
        LIMIT ? OFFSET ?
      `;
      
      params.push(parseInt(pageSize), offset);
      const [templates] = await pool.query(sql, params);
      
      // 查询每个模板的工序明细
      const templatesWithDetails = await Promise.all(templates.map(async (template) => {
        const [processes] = await pool.query(`
          SELECT * FROM process_template_details
          WHERE template_id = ?
          ORDER BY order_num ASC
        `, [template.id]);
        
        return {
          ...template,
          processes
        };
      }));
      
      res.json({
        data: templatesWithDetails,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      });
    } catch (error) {
      console.error('获取工序模板列表失败:', error);
      res.status(500).json({ error: '获取工序模板列表失败' });
    }
  },

  // 获取工序模板详情
  async getProcessTemplateById(req, res) {
    try {
      const { id } = req.params;
      
      // 查询模板基本信息
      const [templates] = await pool.query(`
        SELECT 
          pt.*,
          m.code as product_code,
          m.name as product_name
        FROM process_templates pt
        LEFT JOIN materials m ON pt.product_id = m.id
        WHERE pt.id = ?
      `, [id]);
      
      if (templates.length === 0) {
        return res.status(404).json({ error: '工序模板不存在' });
      }
      
      const template = templates[0];
      
      // 查询模板工序明细
      const [processes] = await pool.query(`
        SELECT * FROM process_template_details
        WHERE template_id = ?
        ORDER BY order_num ASC
      `, [id]);
      
      res.json({
        ...template,
        processes
      });
    } catch (error) {
      console.error('获取工序模板详情失败:', error);
      res.status(500).json({ error: '获取工序模板详情失败' });
    }
  },

  // 根据产品ID获取工序模板
  async getProcessTemplateByProductId(req, res) {
    try {
      const { id } = req.params;
      
      // 查询该产品关联的工序模板
      const [templates] = await pool.query(`
        SELECT 
          pt.*,
          m.code as product_code,
          m.name as product_name
        FROM process_templates pt
        LEFT JOIN materials m ON pt.product_id = m.id
        WHERE pt.product_id = ? AND pt.status = 1
        ORDER BY pt.id DESC
        LIMIT 1
      `, [id]);
      
      if (templates.length === 0) {
        return res.json({ data: null });
      }
      
      const template = templates[0];
      
      // 查询模板工序明细
      const [processes] = await pool.query(`
        SELECT * FROM process_template_details
        WHERE template_id = ?
        ORDER BY order_num ASC
      `, [template.id]);
      
      res.json({
        data: {
          ...template,
          processes
        }
      });
    } catch (error) {
      console.error('获取产品工序模板失败:', error);
      res.status(500).json({ error: '获取产品工序模板失败' });
    }
  },

  // 创建工序模板
  async createProcessTemplate(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { name, product_id, description, processes } = req.body;
      
      // 生成模板编码
      const prefix = 'PT';
      const [latestCode] = await connection.query(`
        SELECT code FROM process_templates
        WHERE code LIKE '${prefix}%'
        ORDER BY id DESC
        LIMIT 1
      `);
      
      let code;
      if (latestCode.length === 0) {
        code = `${prefix}001`;
      } else {
        const lastCode = latestCode[0].code;
        const lastNumber = parseInt(lastCode.substring(prefix.length));
        code = `${prefix}${(lastNumber + 1).toString().padStart(3, '0')}`;
      }
      
      // 插入模板主表
      const [result] = await connection.query(`
        INSERT INTO process_templates (code, name, product_id, description, status)
        VALUES (?, ?, ?, ?, 1)
      `, [code, name, product_id, description]);
      
      const templateId = result.insertId;
      
      // 插入工序明细
      if (processes && processes.length > 0) {
        const processValues = processes.map((process, index) => [
          templateId,
          process.order,
          process.name,
          process.description || '',
          process.standard_hours || 0,
          process.department || '',
          process.remark || ''
        ]);
        
        const placeholders = processes.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
        
        await connection.query(`
          INSERT INTO process_template_details 
          (template_id, order_num, name, description, standard_hours, department, remark)
          VALUES ${placeholders}
        `, processValues.flat());
      }
      
      await connection.commit();
      
      res.status(201).json({
        id: templateId,
        code,
        message: '工序模板创建成功'
      });
    } catch (error) {
      await connection.rollback();
      console.error('创建工序模板失败:', error);
      res.status(500).json({ error: '创建工序模板失败' });
    } finally {
      connection.release();
    }
  },

  // 更新工序模板
  async updateProcessTemplate(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      const { name, product_id, description, processes, status } = req.body;
      
      // 检查模板是否存在
      const [existingTemplate] = await connection.query(`
        SELECT * FROM process_templates WHERE id = ?
      `, [id]);
      
      if (existingTemplate.length === 0) {
        return res.status(404).json({ error: '工序模板不存在' });
      }
      
      // 更新模板主表
      await connection.query(`
        UPDATE process_templates
        SET name = ?, product_id = ?, description = ?, status = ?
        WHERE id = ?
      `, [name, product_id, description, status !== undefined ? status : existingTemplate[0].status, id]);
      
      // 删除原有工序明细
      await connection.query(`
        DELETE FROM process_template_details
        WHERE template_id = ?
      `, [id]);
      
      // 插入新的工序明细
      if (processes && processes.length > 0) {
        const processValues = processes.map((process) => [
          id,
          process.order,
          process.name,
          process.description || '',
          process.standard_hours || 0,
          process.department || '',
          process.remark || ''
        ]);
        
        const placeholders = processes.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
        
        await connection.query(`
          INSERT INTO process_template_details 
          (template_id, order_num, name, description, standard_hours, department, remark)
          VALUES ${placeholders}
        `, processValues.flat());
      }
      
      await connection.commit();
      
      res.json({ message: '工序模板更新成功' });
    } catch (error) {
      await connection.rollback();
      console.error('更新工序模板失败:', error);
      res.status(500).json({ error: '更新工序模板失败' });
    } finally {
      connection.release();
    }
  },

  // 更新工序模板状态
  async updateProcessTemplateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // 检查模板是否存在
      const [existingTemplate] = await pool.query(`
        SELECT * FROM process_templates WHERE id = ?
      `, [id]);
      
      if (existingTemplate.length === 0) {
        return res.status(404).json({ error: '工序模板不存在' });
      }
      
      // 更新状态
      await pool.query(`
        UPDATE process_templates
        SET status = ?
        WHERE id = ?
      `, [status, id]);
      
      res.json({ message: '工序模板状态更新成功' });
    } catch (error) {
      console.error('更新工序模板状态失败:', error);
      res.status(500).json({ error: '更新工序模板状态失败' });
    }
  },

  // 删除工序模板
  async deleteProcessTemplate(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      
      // 检查模板是否存在
      const [existingTemplate] = await connection.query(`
        SELECT * FROM process_templates WHERE id = ?
      `, [id]);
      
      if (existingTemplate.length === 0) {
        return res.status(404).json({ error: '工序模板不存在' });
      }
      
      // 删除工序明细
      await connection.query(`
        DELETE FROM process_template_details
        WHERE template_id = ?
      `, [id]);
      
      // 删除模板主表
      await connection.query(`
        DELETE FROM process_templates
        WHERE id = ?
      `, [id]);
      
      await connection.commit();
      
      res.json({ message: '工序模板删除成功' });
    } catch (error) {
      await connection.rollback();
      console.error('删除工序模板失败:', error);
      res.status(500).json({ error: '删除工序模板失败' });
    } finally {
      connection.release();
    }
  },
};

module.exports = baseDataController;