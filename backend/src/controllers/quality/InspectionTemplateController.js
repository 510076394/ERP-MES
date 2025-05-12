const db = require('../../models');
const { Op } = require('sequelize');
const { generateTemplateCode } = require('../../utils/codeGenerator');

class InspectionTemplateController {
  // 获取模板列表
  async getTemplates(req, res) {
    try {
      console.log('开始获取模板列表...');
      const { page = 1, pageSize = 20, keyword, inspection_type, status, material_type } = req.query;
      console.log('请求参数:', { page, pageSize, keyword, inspection_type, status, material_type });
      
      const offset = (page - 1) * pageSize;
      
      const where = {};
      if (keyword) {
        where[Op.or] = [
          { template_code: { [Op.like]: `%${keyword}%` } },
          { template_name: { [Op.like]: `%${keyword}%` } }
        ];
      }
      if (inspection_type) where.inspection_type = inspection_type;
      if (status) where.status = status;
      
      // 如果指定了material_type，检查是否为该物料定制的模板
      if (material_type) {
        where.material_type = material_type;
      }
      
      console.log('模板查询条件:', where);
      
      // 准备关联查询条件
      let includeOptions = [{
        model: db.InspectionItem,
        through: { attributes: [] },
        as: 'InspectionItems'
      }];
      
      const { count, rows } = await db.InspectionTemplate.findAndCountAll({
        where,
        include: includeOptions,
        limit: parseInt(pageSize),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });
      
      console.log('查询结果:', { count, rows: rows.length });
      
      res.json({
        success: true,
        data: rows,
        total: count
      });
    } catch (error) {
      console.error('获取模板列表失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        message: '获取模板列表失败',
        error: error.message
      });
    }
  }
  
  // 获取模板详情
  async getTemplate(req, res) {
    try {
      const { id } = req.params;
      
      console.log(`获取模板详情，ID: ${id}`);
      
      // 使用更详细的关联查询以确保能够获取所有检验项
      const template = await db.InspectionTemplate.findByPk(id, {
        include: [
          {
            model: db.InspectionItem,
            through: { attributes: [] }, // 不包含中间表的属性
            as: 'InspectionItems'
          }
        ]
      });
      
      if (!template) {
        console.log(`未找到ID为 ${id} 的模板`);
        return res.status(404).json({
          success: false,
          message: '模板不存在'
        });
      }
      
      console.log(`成功获取模板 ${id}, 检验项数量: ${template.InspectionItems?.length || 0}`);
      
      // 将Items属性复制到items属性，以便前端可以统一访问
      const responseData = template.toJSON();
      if (responseData.InspectionItems && !responseData.items) {
        responseData.items = responseData.InspectionItems;
      }
      
      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('获取模板详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取模板详情失败',
        error: error.message
      });
    }
  }
  
  // 创建模板
  async createTemplate(req, res) {
    const t = await db.sequelize.transaction();
    
    try {
      const {
        template_name,
        inspection_type,
        material_type,
        version,
        description,
        items
      } = req.body;
      
      // 检查用户认证
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        });
      }
      
      // 生成模板编号 格式：IT+日期+序号
      const template_code = await generateTemplateCode('IT', db);
      
      // 创建模板
      const template = await db.InspectionTemplate.create({
        template_code,
        template_name,
        inspection_type,
        material_type,
        version,
        description,
        status: 'inactive',
        created_by: req.user.id || 'system' // 如果用户ID不存在，使用默认值
      }, { transaction: t });
      
      // 创建/或复用检验项目
      const mappingPromises = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let itemId;
        
        // 检查是否需要复用现有项目
        if (item.reuse_item_id) {
          // 如果提供了复用项目ID，则直接使用该ID
          itemId = item.reuse_item_id;
        } else {
          // 否则查找是否存在相同标准的检验项
          const existingItem = await db.InspectionItem.findOne({
            where: {
              item_name: item.item_name,
              standard: item.standard,
              type: item.type,
              is_critical: item.is_critical
            }
          });
          
          if (existingItem) {
            // 如果找到了相同的检验项，则复用它
            itemId = existingItem.id;
          } else {
            // 否则创建新的检验项
            const newItem = await db.InspectionItem.create({
              item_name: item.item_name,
              standard: item.standard,
              type: item.type,
              is_critical: item.is_critical
            }, { transaction: t });
            
            itemId = newItem.id;
          }
        }
        
        // 创建模板-项目关联
        mappingPromises.push(db.TemplateItemMapping.create({
          template_id: template.id,
          item_id: itemId,
          sort_order: i
        }, { transaction: t }));
      }
      
      await Promise.all(mappingPromises);
      
      await t.commit();
      
      res.json({
        success: true,
        message: '模板创建成功',
        data: template
      });
    } catch (error) {
      await t.rollback();
      console.error('创建模板失败:', error);
      res.status(500).json({
        success: false,
        message: '创建模板失败',
        error: error.message
      });
    }
  }
  
  // 更新模板
  async updateTemplate(req, res) {
    const t = await db.sequelize.transaction();
    
    try {
      const { id } = req.params;
      const {
        template_name,
        inspection_type,
        material_type,
        version,
        description,
        items
      } = req.body;
      
      // 更新模板基本信息
      await db.InspectionTemplate.update({
        template_name,
        inspection_type,
        material_type,
        version,
        description
      }, {
        where: { id },
        transaction: t
      });
      
      // 删除旧的检验项目关联
      await db.TemplateItemMapping.destroy({
        where: { template_id: id },
        transaction: t
      });
      
      // 创建/或复用检验项目
      const mappingPromises = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let itemId;
        
        // 检查是否需要复用现有项目
        if (item.reuse_item_id) {
          // 如果提供了复用项目ID，则直接使用该ID
          itemId = item.reuse_item_id;
        } else if (item.id) {
          // 如果提供了项目ID，则使用该ID
          itemId = item.id;
        } else {
          // 否则查找是否存在相同标准的检验项
          const existingItem = await db.InspectionItem.findOne({
            where: {
              item_name: item.item_name,
              standard: item.standard,
              type: item.type,
              is_critical: item.is_critical
            }
          });
          
          if (existingItem) {
            // 如果找到了相同的检验项，则复用它
            itemId = existingItem.id;
          } else {
            // 否则创建新的检验项
            const newItem = await db.InspectionItem.create({
              item_name: item.item_name,
              standard: item.standard,
              type: item.type,
              is_critical: item.is_critical
            }, { transaction: t });
            
            itemId = newItem.id;
          }
        }
        
        // 创建模板-项目关联
        mappingPromises.push(db.TemplateItemMapping.create({
          template_id: id,
          item_id: itemId,
          sort_order: i
        }, { transaction: t }));
      }
      
      await Promise.all(mappingPromises);
      
      await t.commit();
      
      res.json({
        success: true,
        message: '模板更新成功'
      });
    } catch (error) {
      await t.rollback();
      console.error('更新模板失败:', error);
      res.status(500).json({
        success: false,
        message: '更新模板失败'
      });
    }
  }
  
  // 更新模板状态
  async updateTemplateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      await db.InspectionTemplate.update(
        { status },
        { where: { id } }
      );
      
      res.json({
        success: true,
        message: '模板状态更新成功'
      });
    } catch (error) {
      console.error('更新模板状态失败:', error);
      res.status(500).json({
        success: false,
        message: '更新模板状态失败'
      });
    }
  }
  
  // 复制模板
  async copyTemplate(req, res) {
    const t = await db.sequelize.transaction();
    
    try {
      const { id } = req.params;
      
      // 获取原模板信息
      const originalTemplate = await db.InspectionTemplate.findByPk(id, {
        include: [
          {
            model: db.InspectionItem,
            through: { attributes: [] }
          }
        ]
      });
      
      if (!originalTemplate) {
        return res.status(404).json({
          success: false,
          message: '模板不存在'
        });
      }
      
      // 生成新的模板编号
      const template_code = await generateTemplateCode('IT', db);
      
      // 创建新模板
      const newTemplate = await db.InspectionTemplate.create({
        template_code,
        template_name: `${originalTemplate.template_name} - 副本`,
        inspection_type: originalTemplate.inspection_type,
        material_type: originalTemplate.material_type,
        version: originalTemplate.version,
        description: originalTemplate.description,
        status: 'draft',
        created_by: req.user.id
      }, { transaction: t });
      
      // 复制检验项目
      const createdItems = await Promise.all(
        originalTemplate.InspectionItems.map(item => db.InspectionItem.create({
          item_name: item.item_name,
          standard: item.standard,
          type: item.type,
          is_critical: item.is_critical
        }, { transaction: t }))
      );
      
      // 创建新的模板-项目关联
      await Promise.all(
        createdItems.map((item, index) => db.TemplateItemMapping.create({
          template_id: newTemplate.id,
          item_id: item.id,
          sort_order: index
        }, { transaction: t }))
      );
      
      await t.commit();
      
      res.json({
        success: true,
        message: '模板复制成功',
        data: newTemplate
      });
    } catch (error) {
      await t.rollback();
      console.error('复制模板失败:', error);
      res.status(500).json({
        success: false,
        message: '复制模板失败'
      });
    }
  }
  
  // 删除模板
  async deleteTemplate(req, res) {
    const t = await db.sequelize.transaction();
    
    try {
      const { id } = req.params;
      
      // 删除模板-项目关联
      await db.TemplateItemMapping.destroy({
        where: { template_id: id },
        transaction: t
      });
      
      // 删除模板
      await db.InspectionTemplate.destroy({
        where: { id },
        transaction: t
      });
      
      await t.commit();
      
      res.json({
        success: true,
        message: '模板删除成功'
      });
    } catch (error) {
      await t.rollback();
      console.error('删除模板失败:', error);
      res.status(500).json({
        success: false,
        message: '删除模板失败'
      });
    }
  }
  
  // 获取可复用的检验项目列表
  async getReusableItems(req, res) {
    try {
      const { keyword, type } = req.query;
      
      // 构建查询条件
      const where = {};
      
      if (keyword) {
        where[Op.or] = [
          { item_name: { [Op.like]: `%${keyword}%` } },
          { standard: { [Op.like]: `%${keyword}%` } }
        ];
      }
      
      if (type) {
        where.type = type;
      }
      
      // 查询检验项目
      const items = await db.InspectionItem.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: 100 // 限制结果数量
      });
      
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      console.error('获取可复用检验项目失败:', error);
      res.status(500).json({
        success: false,
        message: '获取可复用检验项目失败',
        error: error.message
      });
    }
  }
}

module.exports = new InspectionTemplateController(); 