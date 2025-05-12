const { pool } = require('../config/db');
const Excel = require('exceljs');

// 基础数据模型
const baseDataModel = {
  // 保留原有的所有方法...

  // 添加缺失的 getBomDetails 方法
  async getBomDetails(bomId) {
    try {
      // 获取BOM详情，包括物料和单位信息
      const [rows] = await pool.query(`
        SELECT 
          bd.*,
          m.name as material_name,
          m.code as material_code,
          u.name as unit_name
        FROM bom_details bd
        LEFT JOIN materials m ON bd.material_id = m.id
        LEFT JOIN units u ON bd.unit_id = u.id
        WHERE bd.bom_id = ?
      `, [bomId]);

      console.log(`获取BOM明细成功 (BOM ID: ${bomId}):`, JSON.stringify(rows, null, 2));
      return rows;
    } catch (error) {
      console.error(`获取BOM明细失败 (BOM ID: ${bomId}):`, error);
      throw error;
    }
  },

  // 其他原有的方法...
  // 供应商管理
  async getAllSuppliers(page = 1, pageSize = 10, filters = {}) {
    const offset = (page - 1) * pageSize;
    let whereClause = '1=1';
    const params = [];

    if (filters.code) {
      whereClause += ' AND code LIKE ?';
      params.push(`%${filters.code}%`);
    }
    if (filters.name) {
      whereClause += ' AND name LIKE ?';
      params.push(`%${filters.name}%`);
    }
    if (filters.status !== undefined && filters.status !== '') {
      const status = parseInt(filters.status);
      if (!isNaN(status)) {
        whereClause += ' AND status = ?';
        params.push(status);
      }
    }

    // 获取总记录数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM suppliers WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 获取分页数据
    const [rows] = await pool.query(
      `SELECT * FROM suppliers WHERE ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      list: rows,
      total,
      page,
      pageSize
    };
  },

  async getSupplierById(id) {
    const [rows] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [id]);
    return rows[0];
  },

  async createSupplier(data) {
    // 生成供应商编码
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const [maxCodeResult] = await pool.query(
      "SELECT MAX(code) as maxCode FROM suppliers WHERE code LIKE ?",
      [`GYS${year}${month}%`]
    );
    
    let sequence = '001';
    if (maxCodeResult[0].maxCode) {
      const currentSequence = parseInt(maxCodeResult[0].maxCode.slice(-3));
      sequence = (currentSequence + 1).toString().padStart(3, '0');
    }
    
    const code = `GYS${year}${month}${sequence}`;
    
    const [result] = await pool.query(
      'INSERT INTO suppliers (code, name, contact_person, contact_phone, email, address, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [code, data.name, data.contact_person, data.contact_phone, data.email, data.address, data.status, data.remark]
    );

    return {
      id: result.insertId,
      code,
      ...data
    };
  },

  async updateSupplier(id, data) {
    try {
      // 验证供应商是否存在
      const [existingSuppliers] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [id]);
      if (!existingSuppliers || existingSuppliers.length === 0) {
        throw new Error('供应商不存在');
      }

      // 定义允许更新的字段及其值
      const validFields = {
        name: data.name,
        contact_person: data.contact_person,
        contact_phone: data.contact_phone,
        email: data.email,
        address: data.address,
        status: data.status !== undefined ? Number(data.status) : undefined,  // 确保状态是数字
        remark: data.remark
      };

      // 确保不更新时间戳字段
      delete data.created_at;
      delete data.updated_at;

      // 过滤掉未定义的字段
      const updateFields = Object.entries(validFields)
        .filter(([_, value]) => value !== undefined)
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});

      if (Object.keys(updateFields).length === 0) {
        throw new Error('没有提供有效的更新字段');
      }

      // 构建 SQL 更新语句
      const fields = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updateFields), id];
      
      // 执行更新
      await pool.query(`UPDATE suppliers SET ${fields} WHERE id = ?`, values);

      // 获取并返回更新后的完整数据
      const [updatedSupplier] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [id]);
      return updatedSupplier[0];
    } catch (error) {
      console.error('更新供应商失败:', error);
      throw error;
    }
  },

  async deleteSupplier(id) {
    // TODO: 检查供应商是否有关联数据
    await pool.query('DELETE FROM suppliers WHERE id = ?', [id]);
    return true;
  },

  
  async getCategoryById(id) {
    return await this.findById('categories', id);
  },
  
  async createCategory(data) {
    // 处理父级分类
    let level = 1;
    if (data.parent_id) {
      const parent = await this.findById('categories', data.parent_id);
      if (parent) {
        level = parent.level + 1;
      }
    }
    
    // 添加层级信息
    const categoryData = { ...data, level };
    
    return await this.create('categories', categoryData);
  },
  
  async updateCategory(id, data) {
    // 处理父级分类
    let level = 1;
    if (data.parent_id) {
      const parent = await this.findById('categories', data.parent_id);
      if (parent) {
        level = parent.level + 1;
      }
    }
    
    // 添加层级信息
    const categoryData = { ...data, level };
    
    return await this.update('categories', id, categoryData);
  },
  
  async deleteCategory(id) {
    // 检查是否有子分类
    const children = await this.query('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?', [id]);
    if (children[0].count > 0) {
      throw new Error('该分类下有子分类，不能删除');
    }
    
    // 检查是否有关联的物料
    const materials = await this.query('SELECT COUNT(*) as count FROM materials WHERE category_id = ?', [id]);
    if (materials[0].count > 0) {
      throw new Error('该分类下有关联的物料，不能删除');
    }
    
    return await this.delete('categories', id);
  },
  
  // 单位相关方法
  async getAllUnits() {
    return await this.query('SELECT * FROM units ORDER BY id ASC');
  },
  
  async getUnitById(id) {
    return await this.findById('units', id);
  },
  
  async createUnit(data) {
    return await this.create('units', data);
  },
  
  async updateUnit(id, data) {
    return await this.update('units', id, data);
  },
  
  async deleteUnit(id) {
    // 检查是否有关联的物料
    const materials = await this.query('SELECT COUNT(*) as count FROM materials WHERE unit_id = ?', [id]);
    if (materials[0].count > 0) {
      throw new Error('该单位下有关联的物料，不能删除');
    }
    
    return await this.delete('units', id);
  },
  
  // 通用方法
  async query(sql, params = []) {
    try {
      console.log(`执行SQL: ${sql}`, params);
      const [rows] = await pool.query(sql, params);
      console.log(`SQL执行结果: 返回${rows.length}条记录`);
      return rows;
    } catch (error) {
      console.error(`SQL查询失败: ${sql}`, error);
      throw error; // 直接抛出原始错误，保留错误堆栈
    }
  },

  async findById(table, id) {
    return (await this.query(`SELECT * FROM ${table} WHERE id = ?`, [id]))[0];
  },

  async create(table, data) {
    // 过滤掉 id 字段，因为它是自增的
    const filteredData = { ...data };
    delete filteredData.id;
    
    // 过滤掉时间戳字段，让数据库使用默认值
    delete filteredData.created_at;
    delete filteredData.updated_at;
    
    const keys = Object.keys(filteredData);
    const values = Object.values(filteredData);
    let sql;
    
    if (table === 'categories') {
      // 处理分类的特殊情况
      let level = 1;
      if (filteredData.parent_id) {
        const [parentRow] = await pool.execute('SELECT level FROM categories WHERE id = ?', [filteredData.parent_id]);
        if (parentRow.length > 0) {
          level = parentRow[0].level + 1;
        }
      }
      keys.push('level');
      values.push(level);
    }
    
    sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
    const [result] = await pool.execute(sql, values);
    // 确保在返回结果中包含正确的level值
    let returnLevel;
    if (table === 'categories') {
      returnLevel = values[values.length - 1]; // 获取之前添加到values末尾的level值
    }
    return { id: result.insertId, ...data, ...(table === 'categories' ? { level: returnLevel } : {}) };
  },

  async update(table, id, data) {
    // 过滤掉时间戳字段，让数据库使用默认值
    const filteredData = { ...data };
    delete filteredData.created_at;
    delete filteredData.updated_at;
    
    const keys = Object.keys(filteredData);
    const values = Object.values(filteredData);
    const sql = `UPDATE ${table} SET ${keys.map(key => `${key} = ?`).join(', ')} WHERE id = ?`;
    await pool.execute(sql, [...values, id]);
    return { id, ...data };
  },

  async delete(table, id) {
    await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return true;
  },

  // 物料相关方法
  async getAllMaterials(page = 1, pageSize = 10, filters = {}) {
    try {
      const validPage = Math.max(1, parseInt(page) || 1);
      const validPageSize = Math.max(1, parseInt(pageSize) || 10);
      const offset = (validPage - 1) * validPageSize;

      // 构建基础SQL
      let sql = `
        SELECT 
          m.*,
          c.name as category_name,
          u.name as unit_name,
          l.name as location_name
        FROM materials m
        LEFT JOIN categories c ON m.category_id = c.id
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN locations l ON m.location_id = l.id
      `;
      
      // 构建WHERE子句
      const whereConditions = [];
      const params = [];

      // 搜索条件
      if (filters.name || filters.code || filters.specs) {
        const searchConditions = [];
        if (filters.name) {
          searchConditions.push('m.name LIKE ?');
          params.push(`%${filters.name}%`);
        }
        if (filters.code) {
          searchConditions.push('m.code LIKE ?');
          params.push(`%${filters.code}%`);
        }
        if (filters.specs) {
          searchConditions.push('m.specs LIKE ?');
          params.push(`%${filters.specs}%`);
        }
        if (searchConditions.length > 0) {
          whereConditions.push(`(${searchConditions.join(' OR ')})`);
        }
      }

      // 分类条件
      if (filters.category_id) {
        const categoryId = parseInt(filters.category_id);
        if (!isNaN(categoryId)) {
          whereConditions.push('m.category_id = ?');
          params.push(categoryId);
        }
      }

      // 状态条件
      if (filters.status !== undefined && filters.status !== '') {
        const status = parseInt(filters.status);
        if (!isNaN(status)) {
          whereConditions.push('m.status = ?');
          params.push(status);
        }
      }

      // 组合WHERE子句
      if (whereConditions.length > 0) {
        sql += ' WHERE ' + whereConditions.join(' AND ');
      }

      // 获取总数
      const countSql = `
        SELECT COUNT(*) as total 
        FROM materials m
        ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
      `;
      const [countResult] = await this.query(countSql, params);
      const total = countResult.total;

      // 添加排序和分页
      sql += ' ORDER BY m.id DESC LIMIT ? OFFSET ?';
      params.push(Number(validPageSize), Number(offset));

      let data = await this.query(sql, params);
      
      // 如果需要包含BOM信息
      if (filters.withBom === 'true' || filters.withBom === true) {
        const productIds = data.map(item => item.id);
        if (productIds.length > 0) {
          const bomSql = `
            SELECT bm.id, bm.product_id
            FROM bom_masters bm
            WHERE bm.product_id IN (${productIds.join(',')})
          `;
          const bomData = await this.query(bomSql);
          const bomMap = {};
          bomData.forEach(bom => {
            bomMap[bom.product_id] = bom.id;
          });
          data = data.map(product => ({
            ...product,
            hasBom: !!bomMap[product.id],
            bomId: bomMap[product.id] || null
          }));
        }
      }
      
      return {
        data,
        pagination: {
          total,
          page: validPage,
          pageSize: validPageSize,
          totalPages: Math.ceil(total / validPageSize)
        }
      };
    } catch (error) {
      console.error('getAllMaterials error:', error);
      throw error;
    }
  },

  // BOM相关方法
  async getBomById(id) {
    try {
      // 获取BOM主表信息，包括产品信息
      const [bom] = await this.query(`
        SELECT bm.*, m.code as product_code, m.name as product_name
        FROM bom_masters bm
        LEFT JOIN materials m ON bm.product_id = m.id
        WHERE bm.id = ?
      `, [id]);

      if (!bom) {
        console.log(`未找到BOM (ID: ${id})`);
        return null;
      }

      console.log(`获取BOM主表信息成功 (ID: ${id}):`, JSON.stringify(bom, null, 2));
      return bom;
    } catch (error) {
      console.error(`获取BOM详情失败 (ID: ${id}):`, error);
      throw error;
    }
  },

  async getBomDetails(bomId) {
    try {
      // 获取BOM详情，包括物料和单位信息
      const details = await this.query(`
        SELECT 
          bd.*,
          m.name as material_name,
          m.code as material_code,
          m.specification,
          u.name as unit_name
        FROM bom_details bd
        LEFT JOIN materials m ON bd.material_id = m.id
        LEFT JOIN units u ON bd.unit_id = u.id
        WHERE bd.bom_id = ?
        ORDER BY bd.id ASC
      `, [bomId]);

      console.log(`获取BOM明细成功 (BOM ID: ${bomId}):`, JSON.stringify(details, null, 2));
      return details;
    } catch (error) {
      console.error(`获取BOM明细失败 (BOM ID: ${bomId}):`, error);
      throw error;
    }
  },

  async createBom(bomData, details) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      console.log('创建BOM, 输入数据:', JSON.stringify({ bomData, details }, null, 2));

      // 验证必要字段
      if (!bomData.product_id) {
        throw new Error('产品ID是必需的');
      }
      if (!bomData.version) {
        throw new Error('BOM版本是必需的');
      }

      // 确保状态值为数字类型
      const status = bomData.status !== undefined ? Number(bomData.status) : 1;
      console.log('创建BOM时的状态值:', status);

      // 检查产品是否存在
      const [productCheck] = await connection.execute('SELECT id FROM materials WHERE id = ?', [bomData.product_id]);
      if (productCheck.length === 0) {
        throw new Error(`产品ID ${bomData.product_id} 不存在`);
      }

      // 检查BOM版本是否已存在
      const [versionCheck] = await connection.execute(
        'SELECT id FROM bom_masters WHERE product_id = ? AND version = ?',
        [bomData.product_id, bomData.version]
      );
      if (versionCheck.length > 0) {
        throw new Error(`产品ID ${bomData.product_id} 的BOM版本 ${bomData.version} 已存在`);
      }

      const [result] = await connection.execute(
        'INSERT INTO bom_masters (product_id, version, status, remark) VALUES (?, ?, ?, ?)',
        [bomData.product_id, bomData.version, status, bomData.remark || null]
      );

      const bomId = result.insertId;
      console.log(`BOM主表插入成功，ID: ${bomId}`);

      for (const detail of details) {
        if (!detail.material_id || !detail.quantity || !detail.unit_id) {
          throw new Error('BOM明细中的物料ID、数量和单位ID是必需的');
        }

        // 检查物料是否存在
        const [materialCheck] = await connection.execute('SELECT id FROM materials WHERE id = ?', [detail.material_id]);
        if (materialCheck.length === 0) {
          throw new Error(`物料ID ${detail.material_id} 不存在`);
        }

        // 检查单位是否存在
        const [unitCheck] = await connection.execute('SELECT id FROM units WHERE id = ?', [detail.unit_id]);
        if (unitCheck.length === 0) {
          throw new Error(`单位ID ${detail.unit_id} 不存在`);
        }

        await connection.execute(
          'INSERT INTO bom_details (bom_id, material_id, quantity, unit_id, remark) VALUES (?, ?, ?, ?, ?)',
          [bomId, detail.material_id, Number(detail.quantity), detail.unit_id, detail.remark || null]
        );
        console.log(`BOM明细插入成功，BOM ID: ${bomId}, 物料ID: ${detail.material_id}`);
      }

      await connection.commit();
      const createdBom = { id: bomId, ...bomData, details };
      console.log('BOM创建成功:', JSON.stringify(createdBom, null, 2));
      return createdBom;
    } catch (error) {
      await connection.rollback();
      console.error('创建BOM失败:', error);
      throw new Error(`创建BOM失败: ${error.message}`);
    } finally {
      connection.release();
    }
  },

  async updateBom(id, bomData, details) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      console.log(`更新BOM (ID: ${id}), 输入数据:`, { bomData, details });

      // 确保状态值为数字类型
      const status = bomData.status !== undefined ? Number(bomData.status) : 1;
      console.log('更新BOM时的状态值:', status);

      await connection.execute(
        'UPDATE bom_masters SET product_id = ?, version = ?, status = ?, remark = ? WHERE id = ?',
        [bomData.product_id, bomData.version, status, bomData.remark || null, id]
      );

      await connection.execute('DELETE FROM bom_details WHERE bom_id = ?', [id]);

      for (const detail of details) {
        await connection.execute(
          'INSERT INTO bom_details (bom_id, material_id, quantity, unit_id, remark) VALUES (?, ?, ?, ?, ?)',
          [id, detail.material_id, detail.quantity, detail.unit_id, detail.remark || null]
        );
      }

      await connection.commit();
      const updatedBom = { id, ...bomData, details };
      console.log('BOM更新成功:', updatedBom);
      return updatedBom;
    } catch (error) {
      await connection.rollback();
      console.error('更新BOM失败:', error);
      throw new Error(`更新BOM失败: ${error.message}`);
    } finally {
      connection.release();
    }
  },

  async getLatestBomByProductId(productId, status) {
    try {
      // 构建SQL条件
      let condition = 'bm.product_id = ?';
      const params = [productId];
      
      // 如果提供了状态参数
      if (status !== undefined && status !== null) {
        condition += ' AND bm.status = ?';
        params.push(parseInt(status));
      }
      
      // 获取指定产品最新版本的BOM
      const bomMasters = await this.query(`
        SELECT bm.*, m.name as product_name, m.code as product_code 
        FROM bom_masters bm 
        LEFT JOIN materials m ON bm.product_id = m.id 
        WHERE ${condition}
        ORDER BY bm.version DESC, bm.created_at DESC
      `, params);

      // 如果未找到BOM，返回空数组
      if (!bomMasters || bomMasters.length === 0) {
        return {
          data: []
        };
      }

      // 获取所有BOM明细
      const bomWithDetails = await Promise.all(bomMasters.map(async (bom) => {
        const details = await this.query(`
          SELECT 
            bd.*,
            m.name as material_name,
            m.code as material_code,
            m.specs as specification,
            u.name as unit_name
          FROM bom_details bd
          LEFT JOIN materials m ON bd.material_id = m.id
          LEFT JOIN units u ON bd.unit_id = u.id
          WHERE bd.bom_id = ?
        `, [bom.id]);
        
        return {
          ...bom,
          details
        };
      }));
      
      return {
        data: bomWithDetails
      };
    } catch (error) {
      console.error('获取产品BOM失败:', error);
      throw error;
    }
  },

  async getAllBoms(page = 1, pageSize = 10, filters = {}) {
    try {
      const offset = (page - 1) * pageSize;
      let whereClause = '1=1';
      const params = [];

      if (filters.productId) {
        whereClause += ' AND bm.product_id = ?';
        params.push(filters.productId);
      }
      if (filters.version) {
        whereClause += ' AND bm.version LIKE ?';
        params.push(`%${filters.version}%`);
      }
      if (filters.status !== undefined && filters.status !== '') {
        whereClause += ' AND bm.status = ?';
        params.push(parseInt(filters.status));
      }

      const countSql = `
        SELECT COUNT(*) as total
        FROM bom_masters bm
        WHERE ${whereClause}
      `;
      const [countResult] = await this.query(countSql, params);
      const total = countResult[0].total;

      const sql = `
        SELECT bm.*, m.code as product_code, m.name as product_name
        FROM bom_masters bm
        LEFT JOIN materials m ON bm.product_id = m.id
        WHERE ${whereClause}
        ORDER BY bm.id DESC
        LIMIT ? OFFSET ?
      `;
      params.push(parseInt(pageSize), offset);

      const boms = await this.query(sql, params);

      console.log('获取BOM列表, 查询参数:', { page, pageSize, filters });
      console.log('BOM列表查询结果:', boms);

      return {
        list: boms,
        pagination: {
          total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
        },
      };
    } catch (error) {
      console.error('获取BOM列表失败:', error);
      throw error;
    }
  },

  // 分类相关方法
  async getAllCategories(filters = {}) {
    let sql = 'SELECT * FROM categories WHERE 1=1';
    const params = [];

    if (filters.parent_id !== undefined && filters.parent_id !== '') {
      const parentId = parseInt(filters.parent_id);
      if (!isNaN(parentId)) {
        sql += ' AND parent_id = ?';
        params.push(parentId);
      }
    }
    if (filters.name) {
      sql += ' AND name LIKE ?';
      params.push(`%${filters.name}%`);
    }
    if (filters.code) {
      sql += ' AND code LIKE ?';
      params.push(`%${filters.code}%`);
    }
    if (filters.status !== undefined && filters.status !== '') {
      const status = parseInt(filters.status);
      if (!isNaN(status)) {
        sql += ' AND status = ?';
        params.push(status);
      }
    }

    sql += ' ORDER BY sort ASC, id ASC';
    
    try {
      const categories = await this.query(sql, params);
      
      // 如果没有指定parent_id或者请求的是树结构，则构建树形结构返回
      if (filters.tree === 'true' || filters.parent_id === undefined) {
        // 构建分类树结构
        const categoryMap = {};
        const rootCategories = [];
        
        // 首先将所有分类映射到 id
        categories.forEach(category => {
          categoryMap[category.id] = { ...category, children: [] };
        });
        
        // 然后构建树结构
        categories.forEach(category => {
          if (category.parent_id && categoryMap[category.parent_id]) {
            categoryMap[category.parent_id].children.push(categoryMap[category.id]);
          } else {
            rootCategories.push(categoryMap[category.id]);
          }
        });
        
        return rootCategories;
      }
      
      return categories;
    } catch (error) {
      console.error('获取分类列表失败:', error);
      throw error;
    }
  },

  // 单位相关方法
  async getAllUnits(filters = {}) {
    let sql = 'SELECT * FROM units WHERE 1=1';
    const params = [];

    if (filters.name) {
      sql += ' AND name LIKE ?';
      params.push(`%${filters.name}%`);
    }
    if (filters.code) {
      sql += ' AND code LIKE ?';
      params.push(`%${filters.code}%`);
    }
    if (filters.status !== undefined && filters.status !== '') {
      const status = parseInt(filters.status);
      if (!isNaN(status)) {
        sql += ' AND status = ?';
        params.push(status);
      }
    }

    sql += ' ORDER BY id ASC';
    
    try {
      return await this.query(sql, params);
    } catch (error) {
      console.error('获取单位列表失败:', error);
      throw error;
    }
  }
};

// 导出所需的模型
module.exports = {
  materialModel: {
    getAllMaterials: async (page = 1, pageSize = 10, filters = {}) => {
      try {
        const validPage = Math.max(1, parseInt(page) || 1);
        const validPageSize = Math.max(1, parseInt(pageSize) || 10);
        const offset = (validPage - 1) * validPageSize;

        // 构建基础SQL
        let sql = `
          SELECT 
            m.*,
            c.name as category_name,
            u.name as unit_name,
            l.name as location_name
          FROM materials m
          LEFT JOIN categories c ON m.category_id = c.id
          LEFT JOIN units u ON m.unit_id = u.id
          LEFT JOIN locations l ON m.location_id = l.id
        `;
        
        // 构建WHERE子句
        const whereConditions = [];
        const params = [];

        // 搜索条件
        if (filters.name || filters.code || filters.specs) {
          const searchConditions = [];
          if (filters.name) {
            searchConditions.push('m.name LIKE ?');
            params.push(`%${filters.name}%`);
          }
          if (filters.code) {
            searchConditions.push('m.code LIKE ?');
            params.push(`%${filters.code}%`);
          }
          if (filters.specs) {
            searchConditions.push('m.specs LIKE ?');
            params.push(`%${filters.specs}%`);
          }
          if (searchConditions.length > 0) {
            whereConditions.push(`(${searchConditions.join(' OR ')})`);
          }
        }

        // 分类条件
        if (filters.category_id) {
          const categoryId = parseInt(filters.category_id);
          if (!isNaN(categoryId)) {
            whereConditions.push('m.category_id = ?');
            params.push(categoryId);
          }
        }

        // 状态条件
        if (filters.status !== undefined && filters.status !== '') {
          const status = parseInt(filters.status);
          if (!isNaN(status)) {
            whereConditions.push('m.status = ?');
            params.push(status);
          }
        }

        // 组合WHERE子句
        if (whereConditions.length > 0) {
          sql += ' WHERE ' + whereConditions.join(' AND ');
        }

        // 获取总数
        const countSql = `
          SELECT COUNT(*) as total 
          FROM materials m
          ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
        `;
        const [countResult] = await baseDataModel.query(countSql, params);
        const total = countResult.total;

        // 添加排序和分页
        sql += ' ORDER BY m.id DESC LIMIT ? OFFSET ?';
        params.push(Number(validPageSize), Number(offset));

        let data = await baseDataModel.query(sql, params);
        
        // 如果需要包含BOM信息
        if (filters.withBom === 'true' || filters.withBom === true) {
          const productIds = data.map(item => item.id);
          if (productIds.length > 0) {
            const bomSql = `
              SELECT bm.id, bm.product_id
              FROM bom_masters bm
              WHERE bm.product_id IN (${productIds.join(',')})
            `;
            const bomData = await baseDataModel.query(bomSql);
            const bomMap = {};
            bomData.forEach(bom => {
              bomMap[bom.product_id] = bom.id;
            });
            data = data.map(product => ({
              ...product,
              hasBom: !!bomMap[product.id],
              bomId: bomMap[product.id] || null
            }));
          }
        }
        
        return {
          data,
          pagination: {
            total,
            page: validPage,
            pageSize: validPageSize,
            totalPages: Math.ceil(total / validPageSize)
          }
        };
      } catch (error) {
        console.error('getAllMaterials error:', error);
        throw error;
      }
    },
    getMaterialById: (id) => baseDataModel.findById('materials', id),
    createMaterial: (data) => baseDataModel.create('materials', data),
    updateMaterial: (id, data) => baseDataModel.update('materials', id, data),
    deleteMaterial: (id) => baseDataModel.delete('materials', id),
    
    // 导入物料数据
    async importMaterials(materialsData) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        const results = {
          success: [],
          errors: []
        };
        
        // 获取分类和单位数据，用于校验
        const [categories] = await connection.query('SELECT id, name FROM categories');
        const [units] = await connection.query('SELECT id, name FROM units');
        
        // 创建ID映射表，便于校验
        const categoryMap = new Map(categories.map(c => [c.name, c.id]));
        const unitMap = new Map(units.map(u => [u.name, u.id]));
        
        for (const material of materialsData) {
          try {
            // 检查必填字段
            if (!material.code || !material.name) {
              results.errors.push({
                data: material,
                error: '物料编码和名称为必填字段'
              });
              continue;
            }
            
            // 处理分类ID
            let categoryId = null;
            if (material.category_name) {
              categoryId = categoryMap.get(material.category_name);
              if (!categoryId) {
                results.errors.push({
                  data: material,
                  error: `分类"${material.category_name}"不存在`
                });
                continue;
              }
            }
            
            // 处理单位ID
            let unitId = null;
            if (material.unit_name) {
              unitId = unitMap.get(material.unit_name);
              if (!unitId) {
                results.errors.push({
                  data: material,
                  error: `单位"${material.unit_name}"不存在`
                });
                continue;
              }
            }
            
            // 检查物料编码是否已存在
            const [existingMaterials] = await connection.query(
              'SELECT id FROM materials WHERE code = ?',
              [material.code]
            );
            
            if (existingMaterials.length > 0) {
              // 如果物料已存在，则更新
              const updateData = {
                name: material.name,
                category_id: categoryId,
                unit_id: unitId,
                specs: material.specs || '',
                price: material.price || 0,
                min_stock: material.min_stock || 0,
                max_stock: material.max_stock || 0,
                location_id: material.location_id || null,
                location_name: material.location_name || '',
                status: material.status !== undefined ? Number(material.status) : 1,
                remark: material.remark || ''
              };
              
              const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
              const values = [...Object.values(updateData), existingMaterials[0].id];
              
              await connection.query(`UPDATE materials SET ${fields} WHERE id = ?`, values);
              
              results.success.push({
                id: existingMaterials[0].id,
                code: material.code,
                name: material.name,
                action: 'updated'
              });
            } else {
              // 如果物料不存在，则新增
              const insertData = {
                code: material.code,
                name: material.name,
                category_id: categoryId,
                unit_id: unitId,
                specs: material.specs || '',
                price: material.price || 0,
                min_stock: material.min_stock || 0,
                max_stock: material.max_stock || 0,
                location_id: material.location_id || null,
                location_name: material.location_name || '',
                status: material.status !== undefined ? Number(material.status) : 1,
                remark: material.remark || ''
              };
              
              const fields = Object.keys(insertData).join(', ');
              const placeholders = Object.keys(insertData).map(() => '?').join(', ');
              const values = Object.values(insertData);
              
              const [result] = await connection.query(
                `INSERT INTO materials (${fields}) VALUES (${placeholders})`,
                values
              );
              
              results.success.push({
                id: result.insertId,
                code: material.code,
                name: material.name,
                action: 'created'
              });
            }
          } catch (error) {
            // 记录每个物料的导入错误
            results.errors.push({
              data: material,
              error: error.message
            });
          }
        }
        
        await connection.commit();
        return {
          success: results.success.length,
          failed: results.errors.length,
          total: materialsData.length,
          data: results
        };
      } catch (error) {
        await connection.rollback();
        console.error('批量导入物料失败:', error);
        throw error;
      } finally {
        connection.release();
      }
    },
    
    // 导出物料数据
    async exportMaterials(filters = {}) {
      try {
        // 构建查询条件
        let whereClause = '1=1';
        const params = [];
        
        if (filters.name) {
          whereClause += ' AND m.name LIKE ?';
          params.push(`%${filters.name}%`);
        }
        if (filters.code) {
          whereClause += ' AND m.code LIKE ?';
          params.push(`%${filters.code}%`);
        }
        if (filters.specs) {
          whereClause += ' AND m.specs LIKE ?';
          params.push(`%${filters.specs}%`);
        }
        if (filters.category_id || filters.categoryId) {
          const catId = filters.category_id || filters.categoryId;
          whereClause += ' AND m.category_id = ?';
          params.push(catId);
        }
        if (filters.status !== undefined && filters.status !== '') {
          whereClause += ' AND m.status = ?';
          params.push(Number(filters.status));
        }
        
        // 查询物料数据，包括分类和单位信息
        const sql = `
          SELECT 
            m.*,
            c.name as category_name,
            u.name as unit_name
          FROM materials m
          LEFT JOIN categories c ON m.category_id = c.id
          LEFT JOIN units u ON m.unit_id = u.id
          WHERE ${whereClause}
          ORDER BY m.id DESC
        `;
        
        const materials = await baseDataModel.query(sql, params);
        
        // 创建Excel工作簿
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('物料列表');
        
        // 设置列
        worksheet.columns = [
          { header: '物料编码', key: 'code', width: 15 },
          { header: '物料名称', key: 'name', width: 20 },
          { header: '物料分类', key: 'category_name', width: 15 },
          { header: '规格型号', key: 'specs', width: 25 },
          { header: '单位', key: 'unit_name', width: 10 },
          { header: '参考价格', key: 'price', width: 12 },
          { header: '最小库存', key: 'min_stock', width: 12 },
          { header: '最大库存', key: 'max_stock', width: 12 },
          { header: '默认库位', key: 'location_name', width: 15 },
          { header: '状态', key: 'status', width: 10 },
          { header: '备注', key: 'remark', width: 30 }
        ];
        
        // 设置表头样式
        worksheet.getRow(1).font = { bold: true };
        
        // 添加数据
        materials.forEach(material => {
          // 格式化状态字段为中文
          const statusText = material.status === 1 ? '启用' : '禁用';
          
          worksheet.addRow({
            ...material,
            status: statusText
          });
        });
        
        // 导出为Buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
      } catch (error) {
        console.error('导出物料列表失败:', error);
        throw error;
      }
    }
  },
  bomModel: {
    getLatestBomByProductId: async (product_id, status) => {
      // 先查询物料是否存在
      const productCheckSql = `
        SELECT m.id, m.name, m.code, c.name as category_name 
        FROM materials m
        LEFT JOIN categories c ON m.category_id = c.id
        WHERE m.id = ?
      `;
      const productCheck = await baseDataModel.query(productCheckSql, [product_id]);
      
      if (productCheck.length === 0) {
        console.warn(`物料ID ${product_id} 不存在`);
        return { data: [] };
      }
      
      // 不再判断物料类型，直接查询BOM
      
      // 构建SQL条件
      let condition = 'bm.product_id = ?';
      const params = [product_id];
      
      // 如果提供了状态参数
      if (status) {
        if (status === 'active') {
          condition += ' AND bm.status = 1';
        } else if (status === 'inactive') {
          condition += ' AND bm.status = 0';
        } else if (!isNaN(parseInt(status))) {
          condition += ' AND bm.status = ?';
          params.push(parseInt(status));
        }
      }
      
      // 获取指定产品最新版本的BOM
      const [bomMaster] = await baseDataModel.query(`
        SELECT bm.*, m.name as product_name, m.code as product_code 
        FROM bom_masters bm 
        LEFT JOIN materials m ON bm.product_id = m.id 
        WHERE ${condition}
        ORDER BY bm.version DESC, bm.created_at DESC
        LIMIT 1
      `, params);

      if (!bomMaster) {
        return {
          data: []
        };
      }

      // 获取BOM明细
      const details = await baseDataModel.query(`
        SELECT 
          bd.*,
          m.name as material_name,
          m.code as material_code,
          m.specs as specification,
          u.name as unit_name
        FROM bom_details bd
        LEFT JOIN materials m ON bd.material_id = m.id
        LEFT JOIN units u ON bd.unit_id = u.id
        WHERE bd.bom_id = ?
      `, [bomMaster.id]);

      return {
        data: [{
          ...bomMaster,
          details
        }]
      };
    },

    getAllBoms: async (page = 1, pageSize = 10, filters = {}) => {
      const offset = (page - 1) * pageSize;
      let sql = `
        SELECT bm.*, m.name as product_name, m.code as product_code 
        FROM bom_masters bm 
        LEFT JOIN materials m ON bm.product_id = m.id 
        WHERE 1=1
      `;
      const params = [];

      if (filters.productId) {
        sql += ' AND bm.product_id = ?';
        params.push(filters.productId);
      }
      if (filters.version) {
        sql += ' AND bm.version LIKE ?';
        params.push(`%${filters.version}%`);
      }
      if (filters.status !== undefined && filters.status !== '') {
  if (filters.status === 'active') {
    sql += ' AND bm.status = ?';
    params.push(1); // 假设 1 代表 active 状态
  } else if (filters.status === 'inactive') {
    sql += ' AND bm.status = ?';
    params.push(0); // 假设 0 代表 inactive 状态
  } else {
    sql += ' AND bm.status = ?';
    params.push(parseInt(filters.status));
  }
}

      // 获取总数
      const countSql = sql.replace('bm.*, m.name as product_name, m.code as product_code', 'COUNT(*) as total');
      const [{ total }] = await baseDataModel.query(countSql, params);

      // 获取分页数据
      sql += ' ORDER BY bm.id DESC LIMIT ? OFFSET ?';
      params.push(parseInt(pageSize), offset);

      const data = await baseDataModel.query(sql, params);
      return {
        data,
        pagination: {
          total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPages: Math.ceil(total / pageSize)
        }
      };
    },
    getBomById: async (id) => {
      // 获取BOM主表信息
      const [bomMaster] = await baseDataModel.query(`
        SELECT bm.*, m.name as product_name, m.code as product_code 
        FROM bom_masters bm 
        LEFT JOIN materials m ON bm.product_id = m.id 
        WHERE bm.id = ?
      `, [id]);

      if (!bomMaster) {
        return null;
      }

      // 获取BOM明细
      const details = await baseDataModel.query(`
        SELECT 
          bd.*,
          m.name as material_name,
          m.code as material_code,
          u.name as unit_name
        FROM bom_details bd
        LEFT JOIN materials m ON bd.material_id = m.id
        LEFT JOIN units u ON bd.unit_id = u.id
        WHERE bd.bom_id = ?
      `, [id]);

      return {
        ...bomMaster,
        details
      };
    },
    createBom: baseDataModel.createBom.bind(baseDataModel),
    updateBom: baseDataModel.updateBom.bind(baseDataModel),
    deleteBom: (id) => baseDataModel.delete('bom_masters', id)
  },
  customerModel: {
    async getAllCustomers(page = 1, pageSize = 10, filters = {}) {
      const offset = (page - 1) * pageSize;
      let whereClause = '1=1';
      const params = [];

      if (filters.code) {
        whereClause += ' AND code LIKE ?';
        params.push(`%${filters.code}%`);
      }
      if (filters.name) {
        whereClause += ' AND name LIKE ?';
        params.push(`%${filters.name}%`);
      }
      if (filters.status !== undefined && filters.status !== '') {
        whereClause += ' AND status = ?';
        params.push(parseInt(filters.status));
      }

      // 获取总记录数
      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM customers WHERE ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // 获取分页数据
      const [rows] = await pool.query(
        `SELECT * FROM customers WHERE ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      return {
        list: rows,
        total,
        page,
        pageSize
      };
    },

    async getCustomerById(id) {
      const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
      return rows[0];
    },

    async findCustomerByCode(code) {
      // 由于当前表结构不支持 code 字段，我们暂时返回 null
      return null;
    },

    async createCustomer(data) {
    const { name, contact_person, contact_phone, email, address, status, remark, credit_limit = 0 } = data;
    
    const sql = `
      INSERT INTO customers 
      (name, contact_person, contact_phone, email, address, status, remark, credit_limit) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n      `;
    const [result] = await pool.query(sql, [
      name,
      contact_person || null,
      contact_phone || null,
      email || null,
      address || null,
      status === undefined || status === '' ? 'active' : status,  // 默认为'active'
      remark || null,
      credit_limit || 0
    ]);
    
    // 获取插入的完整记录
    const [newCustomer] = await pool.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);
    return newCustomer[0];
  },

    async updateCustomer(id, data) {
    try {
      // 验证客户是否存在
      const [existing] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
      if (!existing || existing.length === 0) {
        throw new Error('客户不存在');
      }

      // 定义允许更新的字段及其值
      const validFields = {
        name: data.name,
        contact_person: data.contact_person,
        contact_phone: data.contact_phone,
        email: data.email,
        address: data.address,
        status: data.status === undefined || data.status === '' ? undefined : data.status,  // 使用字符串类型的status
        remark: data.remark,
        credit_limit: data.credit_limit === undefined ? undefined : (data.credit_limit || 0)
      };

      // 确保不更新时间戳字段
      delete data.created_at;
      delete data.updated_at;

      // 过滤掉未定义的字段
      const updateFields = Object.entries(validFields)
        .filter(([_, value]) => value !== undefined)
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});

      if (Object.keys(updateFields).length === 0) {
        throw new Error('没有提供有效的更新字段');
      }

      // 构建 SQL 更新语句
      const fields = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updateFields), id];

      // 执行更新
      await pool.query(`UPDATE customers SET ${fields} WHERE id = ?`, values);

      // 获取并返回更新后的完整数据
      const [updated] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
      return updated[0];
    } catch (error) {
      console.error('更新客户失败:', error);
      throw error;
    }
  },

    async deleteCustomer(id) {
      // 检查是否有关联的销售订单
      const [orders] = await pool.query(
        'SELECT COUNT(*) as count FROM sales_orders WHERE customer_id = ?',
        [id]
      );
      if (orders[0].count > 0) {
        throw new Error('该客户有关联的销售订单，不能删除');
      }

      await pool.query('DELETE FROM customers WHERE id = ?', [id]);
      return true;
    }
  },
  supplierModel: {
    getAllSuppliers: async (page = 1, pageSize = 10, filters = {}) => {
      console.log('supplier model - getAllSuppliers called with:', { page, pageSize, filters });
      const offset = (page - 1) * pageSize;
      
      // 明确指定所有字段，不使用 *
      let sql = `
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
        WHERE 1=1
      `;
      
      const params = [];

      if (filters.code) {
        sql += ' AND code LIKE ?';
        params.push(`%${filters.code}%`);
      }
      if (filters.name) {
        sql += ' AND name LIKE ?';
        params.push(`%${filters.name}%`);
      }
      if (filters.status !== undefined && filters.status !== '') {
        const status = parseInt(filters.status);
        if (!isNaN(status)) {
          sql += ' AND status = ?';
          params.push(status);
        }
      }

      console.log('supplier model - constructed SQL:', sql);
      console.log('supplier model - SQL params:', params);

      // 获取总记录数
      const countSql = sql.replace('*', 'COUNT(*) as total');
      let countParams = [...params]; // 创建参数副本，不包括分页参数
      
      console.log('supplier model - count SQL:', countSql);
      console.log('supplier model - count params:', countParams);
      
      try {
        const [countResult] = await pool.query(countSql, countParams);
        console.log('supplier model - count result:', countResult);
        
        const total = countResult[0]?.total || 0;

        // 获取分页数据
        sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
        params.push(parseInt(pageSize), offset);
        
        console.log('supplier model - final SQL:', sql);
        console.log('supplier model - final params:', params);
        
        const [rows] = await pool.query(sql, params);
        console.log('supplier model - query returned rows:', rows?.length);
        
        const result = {
          list: rows || [],
          total,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPages: Math.ceil(total / pageSize)
        };
        
        console.log('supplier model - final result structure:', 
          Object.keys(result).reduce((acc, key) => {
            acc[key] = key === 'list' ? `Array(${result[key]?.length || 0})` : result[key];
            return acc;
          }, {})
        );
        
        return result;
      } catch (dbError) {
        console.error('supplier model - database error:', dbError);
        throw dbError;
      }
    },
    getSupplierById: (id) => baseDataModel.findById('suppliers', id),
    createSupplier: (data) => baseDataModel.create('suppliers', data),
    updateSupplier: (id, data) => baseDataModel.update('suppliers', id, data),
    deleteSupplier: (id) => baseDataModel.delete('suppliers', id)
  },
  categoryModel: {
    getAllCategories: baseDataModel.getAllCategories.bind(baseDataModel),
    getCategoryById: (id) => baseDataModel.findById('categories', id),
    createCategory: (data) => baseDataModel.create('categories', data),
    updateCategory: (id, data) => baseDataModel.update('categories', id, data),
    deleteCategory: (id) => baseDataModel.delete('categories', id)
  },
  unitModel: {
    getAllUnits: baseDataModel.getAllUnits.bind(baseDataModel),
    getUnitById: (id) => baseDataModel.findById('units', id),
    createUnit: (data) => baseDataModel.create('units', data),
    updateUnit: (id, data) => baseDataModel.update('units', id, data),
    deleteUnit: (id) => baseDataModel.delete('units', id)
  }
};