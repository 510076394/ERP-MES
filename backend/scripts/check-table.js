const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // 检查表结构
    const [columns] = await connection.query(`
      SELECT 
        COLUMN_NAME, 
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME, 'products']);

    console.log('=== products 表结构 ===');
    columns.forEach(column => {
      console.log(`${column.COLUMN_NAME}: ${column.COLUMN_TYPE} ${column.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} ${column.COLUMN_DEFAULT ? `DEFAULT ${column.COLUMN_DEFAULT}` : ''} COMMENT '${column.COLUMN_COMMENT}'`);
    });

  } catch (error) {
    console.error('检查表结构时出错:', error);
  } finally {
    await connection.end();
  }
}

main(); 