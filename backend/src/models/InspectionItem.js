const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class InspectionItem extends Model {
    static associate(models) {
      // 定义关联关系
      InspectionItem.belongsToMany(models.InspectionTemplate, {
        through: models.TemplateItemMapping,
        foreignKey: 'item_id',
        otherKey: 'template_id',
        as: 'Templates'
      });
    }
  }
  
  InspectionItem.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    item_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '检验项目名称'
    },
    standard: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '检验标准'
    },
    type: {
      type: DataTypes.ENUM('visual', 'dimension', 'function', 'performance', 'safety', 'other'),
      allowNull: false,
      comment: '检验类型'
    },
    is_critical: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否关键项'
    }
  }, {
    sequelize,
    modelName: 'InspectionItem',
    tableName: 'inspection_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  
  return InspectionItem;
}; 