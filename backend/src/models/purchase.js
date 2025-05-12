const db = require('../config/db');

const createPurchaseTablesIfNotExist = async () => {
  try {
    const connection = await db.pool.getConnection();
    
    try {
      // 检查采购申请表是否存在
      const [tables] = await connection.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'purchase_requisitions'
      `);

      let needsRecreation = false;

      if (tables.length > 0) {
        // 检查表结构是否正确
        try {
          const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'purchase_requisitions' 
            AND COLUMN_NAME = 'requisition_number'
          `);
          
          if (columns.length === 0) {
            console.log('采购申请表结构不正确，需要重新创建...');
            needsRecreation = true;
            
            // 删除相关表
            await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
            await connection.execute('DROP TABLE IF EXISTS purchase_return_items');
            await connection.execute('DROP TABLE IF EXISTS purchase_returns');
            await connection.execute('DROP TABLE IF EXISTS purchase_receipt_items');
            await connection.execute('DROP TABLE IF EXISTS purchase_receipts');
            await connection.execute('DROP TABLE IF EXISTS purchase_order_items');
            await connection.execute('DROP TABLE IF EXISTS purchase_orders');
            await connection.execute('DROP TABLE IF EXISTS purchase_requisition_items');
            await connection.execute('DROP TABLE IF EXISTS purchase_requisitions');
            await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
          } else {
            console.log('采购管理相关表结构正确，跳过创建');
          }
        } catch (err) {
          console.error('检查表结构时出错:', err);
          needsRecreation = true;
        }
      } else {
        needsRecreation = true;
      }

      if (needsRecreation) {
        console.log('创建采购管理相关表...');

        // 创建采购申请表
        await connection.execute(`
          CREATE TABLE purchase_requisitions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            requisition_number VARCHAR(50) UNIQUE NOT NULL,
            request_date DATE NOT NULL,
            requester VARCHAR(50),
            remarks TEXT,
            status VARCHAR(20) DEFAULT 'draft' NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);

        // 创建采购申请物料项目表
        await connection.execute(`
          CREATE TABLE purchase_requisition_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            requisition_id INT NOT NULL,
            material_id INT,
            material_code VARCHAR(50) NOT NULL,
            material_name VARCHAR(100) NOT NULL,
            specification VARCHAR(200),
            unit VARCHAR(20),
            unit_id INT,
            quantity DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (requisition_id) REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id),
            FOREIGN KEY (unit_id) REFERENCES units(id)
          )
        `);

        // 创建采购订单表
        await connection.execute(`
          CREATE TABLE purchase_orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_no VARCHAR(50) UNIQUE NOT NULL,
            order_date DATE NOT NULL,
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

        // 创建采购订单物料项目表
        await connection.execute(`
          CREATE TABLE purchase_order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            material_id INT,
            material_code VARCHAR(50) NOT NULL,
            material_name VARCHAR(100) NOT NULL,
            specification VARCHAR(200),
            unit VARCHAR(20),
            unit_id INT,
            price DECIMAL(10, 2) NOT NULL,
            quantity DECIMAL(10, 2) NOT NULL,
            total DECIMAL(12, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id),
            FOREIGN KEY (unit_id) REFERENCES units(id)
          )
        `);

        // 创建采购入库表
        await connection.execute(`
          CREATE TABLE purchase_receipts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            receipt_no VARCHAR(50) UNIQUE NOT NULL,
            order_id INT,
            order_no VARCHAR(50) NOT NULL,
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
            FOREIGN KEY (order_id) REFERENCES purchase_orders(id),
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
            FOREIGN KEY (warehouse_id) REFERENCES inventory_locations(id)
          )
        `);

        // 创建采购入库物料项目表
        await connection.execute(`
          CREATE TABLE purchase_receipt_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            receipt_id INT NOT NULL,
            order_item_id INT,
            material_id INT,
            material_code VARCHAR(50) NOT NULL,
            material_name VARCHAR(100) NOT NULL,
            specification VARCHAR(200),
            unit VARCHAR(20),
            unit_id INT,
            quantity DECIMAL(10, 2) NOT NULL,
            actual_quantity DECIMAL(10, 2) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (receipt_id) REFERENCES purchase_receipts(id) ON DELETE CASCADE,
            FOREIGN KEY (order_item_id) REFERENCES purchase_order_items(id),
            FOREIGN KEY (material_id) REFERENCES materials(id),
            FOREIGN KEY (unit_id) REFERENCES units(id)
          )
        `);

        // 创建采购退货表
        await connection.execute(`
          CREATE TABLE purchase_returns (
            id INT AUTO_INCREMENT PRIMARY KEY,
            return_no VARCHAR(50) UNIQUE NOT NULL,
            receipt_id INT,
            receipt_no VARCHAR(50) NOT NULL,
            supplier_id INT,
            supplier_name VARCHAR(100) NOT NULL,
            warehouse_id INT,
            warehouse_name VARCHAR(100) NOT NULL,
            return_date DATE NOT NULL,
            reason TEXT,
            total_amount DECIMAL(12, 2) DEFAULT 0,
            operator VARCHAR(50),
            remarks TEXT,
            status VARCHAR(20) DEFAULT 'pending' NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (receipt_id) REFERENCES purchase_receipts(id),
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
            FOREIGN KEY (warehouse_id) REFERENCES inventory_locations(id)
          )
        `);

        // 创建采购退货物料项目表
        await connection.execute(`
          CREATE TABLE purchase_return_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            return_id INT NOT NULL,
            receipt_item_id INT,
            material_id INT,
            material_code VARCHAR(50) NOT NULL,
            material_name VARCHAR(100) NOT NULL,
            specification VARCHAR(200),
            unit VARCHAR(20),
            unit_id INT,
            quantity DECIMAL(10, 2) NOT NULL,
            return_quantity DECIMAL(10, 2) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
            FOREIGN KEY (receipt_item_id) REFERENCES purchase_receipt_items(id),
            FOREIGN KEY (material_id) REFERENCES materials(id),
            FOREIGN KEY (unit_id) REFERENCES units(id)
          )
        `);

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

        console.log('采购管理相关表创建完成');
      } else {
        console.log('采购管理相关表已存在，跳过创建');
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('创建采购管理相关表失败:', error);
    throw error;
  }
};

// 生成采购申请单号
const generateRequisitionNo = async () => {
  try {
    // 确保表已创建
    await createPurchaseTablesIfNotExist();
    
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const prefix = `PR${year}${month}${day}`;

    // 使用try-catch包装查询
    try {
      const [rows] = await db.pool.execute(
        `SELECT COUNT(*) as count FROM purchase_requisitions WHERE requisition_number LIKE ?`,
        [`${prefix}%`]
      );
      
      const count = parseInt(rows[0].count) + 1;
      return `${prefix}${String(count).padStart(4, '0')}`;
    } catch (err) {
      console.error('获取申请单号计数失败，使用默认编号:', err);
      return `${prefix}0001`;
    }
  } catch (error) {
    console.error('生成申请单号失败:', error);
    throw error;
  }
};

// 生成采购订单号
const generateOrderNo = async () => {
  try {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const prefix = `PO${year}${month}${day}`;
    
    console.log('生成采购订单号，前缀:', prefix);
    
    // 先查询当前日期的最大订单号
    const [rows] = await db.pool.execute(
      `SELECT MAX(order_no) as max_no FROM purchase_orders WHERE order_no LIKE ?`,
      [`${prefix}%`]
    );
    
    let count = 1;
    
    // 如果有结果并且有最大订单号
    if (rows && rows[0] && rows[0].max_no) {
      // 从最大订单号中提取序号部分，例如从PO202504230004中提取0004
      const maxOrderNo = rows[0].max_no;
      console.log('当前日期的最大订单号:', maxOrderNo);
      
      const lastNumberPart = maxOrderNo.substring(prefix.length);
      // 将序号转换为数字，例如"0004"转为4，然后加1
      if (lastNumberPart && !isNaN(parseInt(lastNumberPart))) {
        count = parseInt(lastNumberPart) + 1;
      }
    } else {
      // 如果没有查到最大订单号，再查询总数
      const [countRows] = await db.pool.execute(
        `SELECT COUNT(*) as count FROM purchase_orders WHERE order_no LIKE ?`,
        [`${prefix}%`]
      );
      
      if (countRows && countRows[0] && !isNaN(parseInt(countRows[0].count))) {
        count = parseInt(countRows[0].count) + 1;
      }
    }
    
    const orderNo = `${prefix}${String(count).padStart(4, '0')}`;
    console.log('生成的订单号:', orderNo);
    
    // 验证生成的订单号是否已存在，如果存在则添加随机后缀
    const [existingRows] = await db.pool.execute(
      `SELECT COUNT(*) as count FROM purchase_orders WHERE order_no = ?`,
      [orderNo]
    );
    
    if (existingRows && existingRows[0] && existingRows[0].count > 0) {
      // 订单号已存在，添加随机后缀
      console.warn(`订单号 ${orderNo} 已存在，添加随机后缀`);
      // 生成3位随机字符
      const randomSuffix = Math.floor(Math.random() * 900 + 100);
      return `${prefix}${String(count).padStart(4, '0')}R${randomSuffix}`;
    }
    
    return orderNo;
  } catch (error) {
    console.error('生成订单号失败:', error);
    // 出现异常时，生成一个基于时间戳的备用编号
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now();
    return `PO${year}${month}${day}ERR${timestamp}`;
  }
};

// 生成采购入库单号
const generateReceiptNo = async () => {
  try {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const prefix = `GR${year}${month}${day}`;

    console.log('生成收货单号，前缀:', prefix);
    
    const query = `SELECT COUNT(*) as count FROM purchase_receipts WHERE receipt_no LIKE ?`;
    const params = [`${prefix}%`];
    
    console.log('执行SQL查询:', query);
    console.log('SQL参数:', params);
    
    let rows;
    try {
      [rows] = await db.pool.execute(query, params);
      console.log('查询结果:', JSON.stringify(rows));
    } catch (dbError) {
      console.error('数据库查询失败:', dbError);
      // 如果数据库查询失败，生成一个基于时间戳的备用编号
      const timestamp = Date.now();
      return `${prefix}ERR${timestamp}`;
    }
    
    if (!rows || !rows[0] || rows[0].count === undefined) {
      console.error('查询结果格式不正确:', rows);
      // 如果结果格式不正确，生成一个基于时间戳的备用编号
      const timestamp = Date.now();
      return `${prefix}ERR${timestamp}`;
    }
    
    const count = parseInt(rows[0].count) + 1;
    const result = `${prefix}${String(count).padStart(4, '0')}`;
    console.log('生成的收货单号:', result);
    
    return result;
  } catch (error) {
    console.error('生成收货单号时发生错误:', error);
    // 出现异常时，生成一个基于时间戳的备用编号
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now();
    return `GR${year}${month}${day}ERR${timestamp}`;
  }
};

// 生成采购退货单号
const generateReturnNo = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prefix = `PR${year}${month}${day}`;

  const [rows] = await db.pool.execute(
    `SELECT COUNT(*) as count FROM purchase_returns WHERE return_no LIKE ?`,
    [`${prefix}%`]
  );
  
  const count = parseInt(rows[0].count) + 1;
  return `${prefix}${String(count).padStart(4, '0')}`;
};

// 生成外委加工单号
const generateProcessingNo = async () => {
  try {
    // 确保表已创建
    await createPurchaseTablesIfNotExist();
    
    const date = new Date();
    const year = date.getFullYear() % 100; // 只取年份的后两位
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const prefix = `WW${year}${month}${day}`;
    
    const [latestNo] = await db.pool.execute(
      `SELECT processing_no FROM outsourced_processings 
       WHERE processing_no LIKE ? 
       ORDER BY id DESC LIMIT 1`,
      [`${prefix}%`]
    );
    
    let serialNumber = 1;
    if (latestNo.length > 0) {
      const lastSerialNumber = parseInt(latestNo[0].processing_no.slice(-3), 10);
      serialNumber = lastSerialNumber + 1;
    }
    
    return `${prefix}${String(serialNumber).padStart(3, '0')}`;
  } catch (error) {
    console.error('生成外委加工单号失败:', error);
    throw error;
  }
};

// 生成外委加工入库单号
const generateProcessingReceiptNo = async () => {
  try {
    // 确保表已创建
    await createPurchaseTablesIfNotExist();
    
    const date = new Date();
    const year = date.getFullYear() % 100; // 只取年份的后两位
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const prefix = `WWRK${year}${month}${day}`;
    
    const [latestNo] = await db.pool.execute(
      `SELECT receipt_no FROM outsourced_processing_receipts 
       WHERE receipt_no LIKE ? 
       ORDER BY id DESC LIMIT 1`,
      [`${prefix}%`]
    );
    
    let serialNumber = 1;
    if (latestNo.length > 0) {
      const lastSerialNumber = parseInt(latestNo[0].receipt_no.slice(-3), 10);
      serialNumber = lastSerialNumber + 1;
    }
    
    return `${prefix}${String(serialNumber).padStart(3, '0')}`;
  } catch (error) {
    console.error('生成外委加工入库单号失败:', error);
    throw error;
  }
};

module.exports = {
  createPurchaseTablesIfNotExist,
  generateRequisitionNo,
  generateOrderNo,
  generateReceiptNo,
  generateReturnNo,
  generateProcessingNo,
  generateProcessingReceiptNo
}; 