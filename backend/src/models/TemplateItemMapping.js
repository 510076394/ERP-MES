const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class TemplateItemMapping extends Model {
    static associate(models) {
      // 定义关联关系
      TemplateItemMapping.belongsTo(models.InspectionTemplate, {
        foreignKey: 'template_id',
        as: 'Template'
      });
      
      TemplateItemMapping.belongsTo(models.InspectionItem, {
        foreignKey: 'item_id',
        as: 'Item'
      });
    }
  }
  
  TemplateItemMapping.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    template_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '模板ID'
    },
    item_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: '项目ID'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序顺序'
    }
  }, {
    sequelize,
    modelName: 'TemplateItemMapping',
    tableName: 'template_item_mappings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });
  
  return TemplateItemMapping;
}; 