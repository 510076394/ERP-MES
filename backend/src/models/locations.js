const db = require('../config/db');

const Locations = {
  // 获取所有仓库列表
  getWarehouses: async () => {
    try {
      const query = `
        SELECT 
          id,
          name,
          code
        FROM locations
        ORDER BY name
      `;
      const [rows] = await db.pool.query(query);
      return rows;
    } catch (error) {
      console.error('Error in getWarehouses:', error);
      throw error;
    }
  },

  // 获取所有库位
  getAll: async (searchQuery = '', page = 1, pageSize = 10) => {
    try {
      // 确保页码和分页大小是数字
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const offset = (pageNum - 1) * pageSizeNum;
      
      // 使用query而不是execute来避免参数类型问题
      let query, params;
      
      if (searchQuery) {
        const searchPattern = `%${searchQuery}%`;
        query = `
          SELECT * FROM locations
          WHERE code LIKE ? OR name LIKE ?
          ORDER BY id DESC
          LIMIT ${offset}, ${pageSizeNum}
        `;
        params = [searchPattern, searchPattern];
      } else {
        query = `
          SELECT * FROM locations
          ORDER BY id DESC
          LIMIT ${offset}, ${pageSizeNum}
        `;
        params = [];
      }
      
      // 使用query方法而不是execute
      const [rows] = await db.pool.query(query, params);
      
      // 获取总数
      const countQuery = searchQuery
        ? `SELECT COUNT(*) as total FROM locations WHERE code LIKE ? OR name LIKE ?`
        : `SELECT COUNT(*) as total FROM locations`;
      
      const countParams = searchQuery
        ? [`%${searchQuery}%`, `%${searchQuery}%`]
        : [];
        
      const [countResult] = await db.pool.query(countQuery, countParams);
      const total = countResult[0].total;
      
      return {
        data: rows,
        total
      };
    } catch (error) {
      console.error('Error in getAll locations:', error);
      throw error;
    }
  },

  // 获取单个库位
  getById: async (id) => {
    try {
      const [rows] = await db.pool.query('SELECT * FROM locations WHERE id = ?', [Number(id)]);
      return rows[0];
    } catch (error) {
      console.error('Error in getById location:', error);
      throw error;
    }
  },

  // 创建库位
  create: async (locationData) => {
    try {
      // 验证必要字段
      const requiredFields = ['code', 'name'];
      const missingFields = requiredFields.filter(field => !locationData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // 检查code是否已存在
      const [existingCode] = await db.pool.query('SELECT id FROM locations WHERE code = ?', [locationData.code]);
      if (existingCode.length > 0) {
        throw new Error(`Location code '${locationData.code}' already exists`);
      }
      
      // 删除id字段，让数据库自动生成
      if (locationData.id === '' || locationData.id === undefined || locationData.id === null) {
        delete locationData.id;
      }
      
      // 过滤掉空字符串的字段，但保留数字0
      const filteredData = {};
      for (const [key, value] of Object.entries(locationData)) {
        // 保留数字0值，但过滤空字符串
        if (value !== '' || value === 0) {
          filteredData[key] = value;
        }
      }
      
      // 确保状态字段是数字类型
      if (filteredData.status !== undefined) {
        filteredData.status = Number(filteredData.status);
      }
      
      // 构建插入语句
      const fields = Object.keys(filteredData).join(', ');
      const placeholders = Object.keys(filteredData).map(() => '?').join(', ');
      const values = Object.values(filteredData);
      
      console.log('即将插入数据:', filteredData);
      const query = `INSERT INTO locations (${fields}) VALUES (${placeholders})`;
      const [result] = await db.pool.query(query, values);
      return result.insertId;
    } catch (error) {
      console.error('Error in create location:', error);
      throw error;
    }
  },

  // 更新库位
  update: async (id, locationData) => {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      // 验证必要字段
      const requiredFields = ['code', 'name'];
      const missingFields = requiredFields.filter(field => !locationData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // 获取原始库位数据
      const [oldLocation] = await connection.query('SELECT * FROM locations WHERE id = ?', [Number(id)]);
      
      if (!oldLocation[0]) {
        throw new Error(`Location with id ${id} not found`);
      }
      
      // 确保状态字段是数字类型
      if (locationData.status !== undefined) {
        locationData.status = Number(locationData.status);
      }
      
      console.log('更新库位数据:', locationData);

      // 构建更新语句
      const setClause = Object.keys(locationData)
        .map(key => `${key} = ?`)
        .join(', ');
      const values = [...Object.values(locationData), Number(id)];
      
      // 更新库位表
      const query = `UPDATE locations SET ${setClause} WHERE id = ?`;
      const [result] = await connection.query(query, values);

      // 如果库位名称发生变化，更新materials表中的location_name
      if (oldLocation[0] && locationData.name && oldLocation[0].name !== locationData.name) {
        await connection.query(
          'UPDATE materials SET location_name = ? WHERE location_name = ?',
          [locationData.name, oldLocation[0].name]
        );
      }

      await connection.commit();
      return result.affectedRows;
    } catch (error) {
      await connection.rollback();
      console.error('Error in update location:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  // 删除库位
  delete: async (id) => {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      // 获取要删除的库位信息
      const [location] = await connection.query('SELECT * FROM locations WHERE id = ?', [Number(id)]);
      
      if (location[0]) {
        // 更新使用此库位的物料，将其location_name设置为null
        await connection.query(
          'UPDATE materials SET location_name = NULL WHERE location_name = ?',
          [location[0].name]
        );
      }

      // 删除库位
      const [result] = await connection.query('DELETE FROM locations WHERE id = ?', [Number(id)]);
      
      await connection.commit();
      return result.affectedRows;
    } catch (error) {
      await connection.rollback();
      console.error('Error in delete location:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = Locations;