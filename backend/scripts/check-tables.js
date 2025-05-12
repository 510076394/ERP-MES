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
    const tables = [
      'processes',
      'products',
      'production_orders',
      'quality_inspections',
      'quality_inspection_items'
    ];

    for (const table of tables) {
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
      `, [process.env.DB_NAME, table]);

      console.log(`\n=== ${table} 表结构 ===`);
      columns.forEach(column => {
        console.log(`${column.COLUMN_NAME}: ${column.COLUMN_TYPE} ${column.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} ${column.COLUMN_DEFAULT ? `DEFAULT ${column.COLUMN_DEFAULT}` : ''} COMMENT '${column.COLUMN_COMMENT}'`);
      });

      // 检查数据
      const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`\n${table} 表中的记录数: ${rows[0].count}`);

      // 显示示例数据
      const [data] = await connection.query(`SELECT * FROM ${table} LIMIT 3`);
      if (data.length > 0) {
        console.log('示例数据:');
        console.log(data);
      }
      console.log('\n' + '='.repeat(80));
    }

  } catch (error) {
    console.error('检查表结构时出错:', error);
  } finally {
    await connection.end();
  }
}

main(); 