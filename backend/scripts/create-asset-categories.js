require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function createAssetCategories() {
  console.log('开始创建资产类别表...');
  
  // 创建数据库连接
  const connection = await mysql.createConnection({
    host: '1.94.98.8',
    port: 3306,
    user: 'root',
    password: 'mysql_ycMQCy',
    database: 'mes',
    multipleStatements: true // 允许多条SQL语句
  });
  
  try {
    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, '../sql/create_asset_categories.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 执行SQL
    console.log('执行SQL脚本创建资产类别表...');
    const [results] = await connection.query(sqlContent);
    
    console.log('资产类别表创建成功');
    console.log('插入了示例资产类别数据');
    
    return { success: true, message: '资产类别表创建成功' };
  } catch (error) {
    console.error('创建资产类别表失败:', error);
    return { success: false, message: error.message };
  } finally {
    await connection.end();
  }
}

// 直接运行函数
createAssetCategories()
  .then(result => {
    console.log(result.message);
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('执行脚本时发生错误:', err);
    process.exit(1);
  }); 