const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Todo = sequelize.define('Todo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'userId',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '待办事项所属用户ID'
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '待办事项标题'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '待办事项描述'
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '截止日期'
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: '优先级: 1低, 2中, 3高'
    },
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否已完成'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'createdAt',
      comment: '创建时间'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updatedAt',
      comment: '更新时间'
    }
  }, {
    tableName: 'todos',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        name: 'todos_user_id_index',
        fields: ['userId']
      }
    ]
  });

  Todo.associate = (models) => {
    // 与用户表关联
    if (models.User) {
      Todo.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    } else {
      console.warn('警告: 找不到User模型，无法建立关联关系');
    }
  };

  return Todo;
}; 