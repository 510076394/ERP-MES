const Locations = require('../models/locations');

const locationsController = {
  // 获取所有仓库
  getWarehouses: async (req, res) => {
    try {
      const warehouses = await Locations.getWarehouses();
      res.json(warehouses);
    } catch (error) {
      console.error('Error getting warehouses:', error);
      res.status(500).json({ 
        message: 'Error getting warehouses', 
        error: error.message,
        sqlMessage: error.sqlMessage,
        sql: error.sql
      });
    }
  },

  // 获取所有库位
  getAll: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const search = req.query.search || '';
      const result = await Locations.getAll(search, page, pageSize);
      res.json(result);
    } catch (error) {
      console.error('Error getting locations:', error);
      res.status(500).json({ message: 'Error getting locations', error: error.message });
    }
  },

  // 获取单个库位
  getById: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const location = await Locations.getById(id);
      if (location) {
        res.json(location);
      } else {
        res.status(404).json({ message: 'Location not found' });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      res.status(500).json({ message: 'Error getting location', error: error.message });
    }
  },

  // 创建库位
  create: async (req, res) => {
    try {
      const locationData = req.body;
      
      // 验证必要字段
      const requiredFields = ['code', 'name'];
      const missingFields = requiredFields.filter(field => !locationData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          message: 'Missing required fields',
          fields: missingFields
        });
      }

      const id = await Locations.create(locationData);
      res.status(201).json({ id, ...locationData });
    } catch (error) {
      console.error('Error creating location:', error);
      res.status(500).json({ message: 'Error creating location', error: error.message });
    }
  },

  // 更新库位
  update: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const locationData = { ...req.body };
      
      // 移除 created_at 和 updated_at 字段，让数据库自动处理这些字段
      delete locationData.created_at;
      delete locationData.updated_at;
      
      const affectedRows = await Locations.update(id, locationData);
      if (affectedRows) {
        res.json({ id, ...locationData });
      } else {
        res.status(404).json({ message: 'Location not found' });
      }
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ message: 'Error updating location', error: error.message });
    }
  },

  // 删除库位
  delete: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const affectedRows = await Locations.delete(id);
      if (affectedRows) {
        res.json({ message: 'Location deleted successfully' });
      } else {
        res.status(404).json({ message: 'Location not found' });
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      res.status(500).json({ message: 'Error deleting location', error: error.message });
    }
  }
};

module.exports = locationsController;