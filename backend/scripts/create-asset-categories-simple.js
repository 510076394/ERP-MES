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
    const sqlFilePath = path.join(__dirname, '../sql/simple_create_asset_categories.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 将SQL拆分成单独的语句
    const statements = sqlContent.split(';').filter(stmt => stmt.trim() !== '');
    
    console.log('执行SQL脚本创建资产类别表...');
    
    // 逐条执行SQL语句
    for (const stmt of statements) {
      try {
        console.log(`执行: ${stmt.substring(0, 50)}...`);
        await connection.execute(stmt + ';');
      } catch (err) {
        console.warn(`语句执行失败: ${err.message}`);
        console.warn('继续执行下一条语句...');
      }
    }
    
    // 检查表是否创建成功
    const [tables] = await connection.execute("SHOW TABLES LIKE 'asset_categories'");
    if (tables.length > 0) {
      console.log('资产类别表创建成功');
      
      // 检查是否有数据
      const [count] = await connection.execute('SELECT COUNT(*) as count FROM asset_categories');
      console.log(`资产类别表中有 ${count[0].count} 条数据`);
      
      return { success: true, message: '资产类别表创建成功，数据已插入' };
    } else {
      return { success: false, message: '资产类别表创建失败' };
    }
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