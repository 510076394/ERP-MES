const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const sequelize = require('../config/sequelize');
const db = {};

// 特别处理User模型和Todo模型，确保它们被优先加载
const userModel = require('./User')(sequelize);
db[userModel.name] = userModel;

const todoModel = require('./todo')(sequelize);
db[todoModel.name] = todoModel;

// 然后加载其他Sequelize模型
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && 
           (file !== basename) && 
           (file.slice(-3) === '.js') &&
           // 排除已经手动加载的模型和其他非Sequelize模型
           !['bankAccount.js', 'qualityInspection.js', 'qualityStandard.js', 'traceability.js', 'User.js', 'todo.js'].includes(file);
  })
  .forEach(file => {
    const modelPath = path.join(__dirname, file);
    const modelModule = require(modelPath);
    
    if (typeof modelModule === 'function') {
      try {
        const model = modelModule(sequelize);
        db[model.name] = model;
      } catch (error) {
        console.error(`Error loading Sequelize model ${file}:`, error);
      }
    }
  });

// 然后加载其他类型的模型
const otherModels = [
  'bankAccount.js',
  'qualityInspection.js',
  'qualityStandard.js',
  'traceability.js'
];

otherModels.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    const modelPath = path.join(__dirname, file);
    const modelModule = require(modelPath);
    const modelName = file.replace('.js', '');
    db[modelName] = modelModule;
  }
});

// 设置模型关联
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db; 