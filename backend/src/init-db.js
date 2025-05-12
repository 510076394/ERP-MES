// 数据库初始化脚本
const db = require('./config/db');
const purchaseModel = require('./models/purchase');

// 使用 IIFE (立即调用函数表达式) 来允许使用 async/await
(async () => {
  try {
    console.log('开始初始化数据库表...');
    
    // 创建外委加工相关表
    await forceCreateOutsourcedProcessingTables();
    
    // 初始化采购相关表，包括外委加工表
    await purchaseModel.createPurchaseTablesIfNotExist();
    
    console.log('数据库表初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库表初始化失败:', error);
    process.exit(1);
  }
})();

// 强制创建外委加工相关表
async function forceCreateOutsourcedProcessingTables() {
  try {
    const connection = await db.pool.getConnection();
    
    try {
      console.log('强制创建外委加工相关表...');
      
      // 删除现有的外委加工相关表（如果存在）
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      await connection.execute('DROP TABLE IF EXISTS outsourced_processing_receipt_items');
      await connection.execute('DROP TABLE IF EXISTS outsourced_processing_receipts');
      await connection.execute('DROP TABLE IF EXISTS outsourced_processing_products');
      await connection.execute('DROP TABLE IF EXISTS outsourced_processing_materials');
      await connection.execute('DROP TABLE IF EXISTS outsourced_processings');
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      
      // 创建外委加工主表
      await connection.execute(`
        CREATE TABLE outsourced_processings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          processing_no VARCHAR(50) UNIQUE NOT NULL,
          processing_date DATE NOT NULL,
          supplier_id INT,
          supplier_name VARCHAR(100) NOT NULL,
          expected_delivery_date DATE,
          contact_person VARCHAR(50),
          contact_phone VARCHAR(50),
          total_amount DECIMAL(12, 2) DEFAULT 0,
          remarks TEXT,
          status VARCHAR(20) DEFAULT 'pending' NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        )
      `);

      // 创建外委加工发料表
      await connection.execute(`
        CREATE TABLE outsourced_processing_materials (
          id INT AUTO_INCREMENT PRIMARY KEY,
          processing_id INT NOT NULL,
          material_id INT,
          material_code VARCHAR(50) NOT NULL,
          material_name VARCHAR(100) NOT NULL,
          specification VARCHAR(200),
          unit VARCHAR(20),
          unit_id INT,
          quantity DECIMAL(10, 2) NOT NULL,
          remark TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (processing_id) REFERENCES outsourced_processings(id) ON DELETE CASCADE,
          FOREIGN KEY (material_id) REFERENCES materials(id),
          FOREIGN KEY (unit_id) REFERENCES units(id)
        )
      `);

      // 创建外委加工成品表
      await connection.execute(`
        CREATE TABLE outsourced_processing_products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          processing_id INT NOT NULL,
          product_id INT,
          product_code VARCHAR(50) NOT NULL,
          product_name VARCHAR(100) NOT NULL,
          specification VARCHAR(200),
          unit VARCHAR(20),
          unit_id INT,
          quantity DECIMAL(10, 2) NOT NULL,
          unit_price DECIMAL(10, 2) NOT NULL,
          total_price DECIMAL(12, 2) NOT NULL,
          remark TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (processing_id) REFERENCES outsourced_processings(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES materials(id),
          FOREIGN KEY (unit_id) REFERENCES units(id)
        )
      `);

      // 创建外委加工入库表
      await connection.execute(`
        CREATE TABLE outsourced_processing_receipts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          receipt_no VARCHAR(50) UNIQUE NOT NULL,
          processing_id INT,
          processing_no VARCHAR(50) NOT NULL,
          supplier_id INT,
          supplier_name VARCHAR(100) NOT NULL,
          warehouse_id INT,
          warehouse_name VARCHAR(100) NOT NULL,
          receipt_date DATE NOT NULL,
          operator VARCHAR(50),
          remarks TEXT,
          status VARCHAR(20) DEFAULT 'pending' NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (processing_id) REFERENCES outsourced_processings(id),
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
          FOREIGN KEY (warehouse_id) REFERENCES inventory_locations(id)
        )
      `);

      // 创建外委加工入库明细表
      await connection.execute(`
        CREATE TABLE outsourced_processing_receipt_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          receipt_id INT NOT NULL,
          product_id INT,
          product_code VARCHAR(50) NOT NULL,
          product_name VARCHAR(100) NOT NULL,
          specification VARCHAR(200),
          unit VARCHAR(20),
          unit_id INT,
          expected_quantity DECIMAL(10, 2) NOT NULL,
          actual_quantity DECIMAL(10, 2) NOT NULL,
          unit_price DECIMAL(10, 2) NOT NULL,
          total_price DECIMAL(12, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (receipt_id) REFERENCES outsourced_processing_receipts(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES materials(id),
          FOREIGN KEY (unit_id) REFERENCES units(id)
        )
      `);

      console.log('外委加工相关表创建完成');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('创建外委加工相关表失败:', error);
    throw error;
  }
} 