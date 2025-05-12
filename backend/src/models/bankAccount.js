const sequelize = require('../config/sequelize');
const { DataTypes } = require('sequelize');

/**
 * 银行账户模型
 */
const BankAccount = sequelize.define('BankAccount', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  account_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  account_number: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  account_type: {
    type: DataTypes.ENUM('checking', 'savings', 'credit', 'cash'),
    allowNull: false,
    defaultValue: 'checking'
  },
  currency_code: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'CNY'
  },
  opening_balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  current_balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'bank_accounts',
  timestamps: true,
  underscored: true
});

module.exports = BankAccount; 