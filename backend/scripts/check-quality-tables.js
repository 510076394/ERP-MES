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
    // 1. 检查所有相关表是否存在
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN (
        'quality_inspections',
        'quality_inspection_items',
        'quality_standards',
        'quality_standard_items',
        'materials',
        'products',
        'processes',
        'suppliers',
        'purchase_orders',
        'production_orders'
      )
    `, [process.env.DB_NAME]);

    console.log('=== 表存在性检查 ===');
    const requiredTables = [
      'quality_inspections',
      'quality_inspection_items',
      'quality_standards',
      'quality_standard_items',
      'materials',
      'products',
      'processes',
      'suppliers',
      'purchase_orders',
      'production_orders'
    ];
    
    const existingTables = tables.map(row => row.TABLE_NAME);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('缺少以下表：');
      missingTables.forEach(table => console.log(`- ${table}`));
    } else {
      console.log('所有必需的表都存在');
    }
    console.log('\n');

    // 2. 检查表结构完整性
    console.log('=== 表结构完整性检查 ===');
    
    // 检查 quality_inspections 表
    const [inspections] = await connection.query('SHOW CREATE TABLE quality_inspections');
    console.log('quality_inspections 表结构：');
    console.log(inspections[0]['Create Table']);
    console.log('\n');

    // 检查 quality_inspection_items 表
    const [items] = await connection.query('SHOW CREATE TABLE quality_inspection_items');
    console.log('quality_inspection_items 表结构：');
    console.log(items[0]['Create Table']);
    console.log('\n');

    // 3. 检查外键约束
    console.log('=== 外键约束检查 ===');
    const [foreignKeys] = await connection.query(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ?
      AND REFERENCED_TABLE_NAME IS NOT NULL
      AND TABLE_NAME IN (
        'quality_inspections',
        'quality_inspection_items',
        'quality_standards',
        'quality_standard_items'
      )
    `, [process.env.DB_NAME]);

    if (foreignKeys.length > 0) {
      console.log('外键约束：');
      foreignKeys.forEach(fk => {
        console.log(`${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    } else {
      console.log('未找到外键约束');
    }
    console.log('\n');

    // 4. 检查索引
    console.log('=== 索引检查 ===');
    const [indexes] = await connection.query(`
      SELECT 
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME IN (
        'quality_inspections',
        'quality_inspection_items',
        'quality_standards',
        'quality_standard_items'
      )
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `, [process.env.DB_NAME]);

    if (indexes.length > 0) {
      console.log('索引信息：');
      let currentTable = '';
      indexes.forEach(index => {
        if (currentTable !== index.TABLE_NAME) {
          currentTable = index.TABLE_NAME;
          console.log(`\n表 ${currentTable}：`);
        }
        console.log(`- ${index.INDEX_NAME}: ${index.COLUMN_NAME}`);
      });
    } else {
      console.log('未找到索引');
    }
    console.log('\n');

    // 5. 检查数据完整性
    console.log('=== 数据完整性检查 ===');
    const [inspectionCount] = await connection.query('SELECT COUNT(*) as count FROM quality_inspections');
    console.log(`quality_inspections 表中的记录数: ${inspectionCount[0].count}`);
    
    const [itemCount] = await connection.query('SELECT COUNT(*) as count FROM quality_inspection_items');
    console.log(`quality_inspection_items 表中的记录数: ${itemCount[0].count}`);
    
    const [standardCount] = await connection.query('SELECT COUNT(*) as count FROM quality_standards');
    console.log(`quality_standards 表中的记录数: ${standardCount[0].count}`);
    
    const [standardItemCount] = await connection.query('SELECT COUNT(*) as count FROM quality_standard_items');
    console.log(`quality_standard_items 表中的记录数: ${standardItemCount[0].count}`);

    // 6. 检查关联表数据
    console.log('\n=== 关联表数据检查 ===');
    const [materialCount] = await connection.query('SELECT COUNT(*) as count FROM materials');
    console.log(`materials 表中的记录数: ${materialCount[0].count}`);
    
    const [productCount] = await connection.query('SELECT COUNT(*) as count FROM products');
    console.log(`products 表中的记录数: ${productCount[0].count}`);
    
    const [processCount] = await connection.query('SELECT COUNT(*) as count FROM processes');
    console.log(`processes 表中的记录数: ${processCount[0].count}`);
    
    const [supplierCount] = await connection.query('SELECT COUNT(*) as count FROM suppliers');
    console.log(`suppliers 表中的记录数: ${supplierCount[0].count}`);

  } catch (error) {
    console.error('检查表结构时出错:', error);
  } finally {
    await connection.end();
  }
}

main(); 