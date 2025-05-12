require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// MySQL connection pool configuration
const pool = mysql.createPool({
  host: '0.0.0.0',
  port: 3306,
  user: 'root',
  password: 'mysql',
  database: 'mes',
  waitForConnections: true,
  connectionLimit: 15,  // 增加连接池限制
  queueLimit: 30,  // 增加队列限制
  // 增加连接超时和重试参数
  connectTimeout: 60000, // 连接超时时间增加到60秒
  // 移除不支持的acquireTimeout选项
  enableKeepAlive: true, // 启用保持连接
  keepAliveInitialDelay: 10000, // 保持连接初始延迟10秒
  // 确保参数能正确传递
  namedPlaceholders: true,
  // 添加重连配置
  multipleStatements: true, // 允许执行多条SQL语句
  // 增加连接重试设置
  maxIdle: 10, // 最大空闲连接数
  idleTimeout: 60000, // 空闲超时时间
  // 错误处理
  trace: true, // 启用堆栈跟踪
  typeCast: function (field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      return (field.string() === '1'); // 1 = true, 0 = false
    }
    return next();
  }
});

// 添加连接池错误处理
pool.on('connection', (connection) => {
  console.log('新的数据库连接已建立');
});

pool.on('error', (err) => {
  console.error('数据库连接池错误:', err);
  if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('尝试重新连接数据库...');
  }
});

// 添加别名方法，保持向后兼容性
const query = async (sql, params) => {
  try {
    // 检查SQL中是否包含LIMIT和OFFSET，如果是原始参数方式则进行特殊处理
    if (sql.includes('LIMIT ?') && params && Array.isArray(params)) {
      // 找到LIMIT和OFFSET参数在数组中的位置
      const limitIndex = params.findIndex((_, i) => 
        sql.substring(0, sql.indexOf('LIMIT ?', i)).split('?').length - 1 === i);
      
      const offsetIndex = params.findIndex((_, i) => 
        sql.substring(0, sql.indexOf('OFFSET ?', i)).split('?').length - 1 === i);
      
      // 如果找到了LIMIT和OFFSET参数，确保它们是数字类型
      if (limitIndex !== -1) {
        params[limitIndex] = Number(params[limitIndex]);
      }
      
      if (offsetIndex !== -1) {
        params[offsetIndex] = Number(params[offsetIndex]);
      }
    }
    
    // 直接执行SQL查询
    console.log('执行SQL查询:', sql);
    console.log('参数:', params);
    
    const [result] = await pool.execute(sql, params);
    return { rows: result };
  } catch (error) {
    console.error('数据库查询错误:', error);
    console.error('SQL:', sql);
    console.error('参数:', params);
    throw error;
  }
};

// 工具函数：确保参数为数字类型
const ensureNumber = (value, defaultValue = 0) => {
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
};

// 添加获取连接的方法
const getClient = async () => {
  const connection = await pool.getConnection();
  
  // 备份原始的connection.query方法，防止无限递归
  const originalQuery = connection.query;
  
  // 重新定义query方法
  connection.query = async (sql, params) => {
    // 事务命令（BEGIN, COMMIT, ROLLBACK）使用直接查询
    if (sql.trim().toUpperCase() === 'BEGIN' || 
        sql.trim().toUpperCase() === 'COMMIT' || 
        sql.trim().toUpperCase() === 'ROLLBACK') {
      console.log(`直接执行事务命令: ${sql}`);
      try {
        const result = await originalQuery.call(connection, sql);
        // 返回一个统一的结果对象，不再是数组
        return {
          success: true,
          rows: Array.isArray(result) ? result[0] : (result || [])
        };
      } catch (error) {
        console.error(`执行事务命令失败: ${sql}`, error);
        throw error;
      }
    } else {
      // 使用预处理语句执行普通SQL
      try {
        const result = await connection.execute(sql, params);
        // 返回一个统一的结果对象，不再是数组
        return {
          success: true,
          rows: Array.isArray(result) ? result[0] : (result || [])
        };
      } catch (error) {
        console.error(`执行SQL失败: ${sql}`, error);
        throw error;
      }
    }
  };
  
  return connection;
};

// Initialize database tables if they don't exist
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Create locations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        warehouse_name VARCHAR(100) NOT NULL,
        status TINYINT NOT NULL DEFAULT 1,
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (code),
        INDEX (status)
      )
    `);

    // Create users table (enhanced version with more fields)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        department_id INT,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        status TINYINT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (department_id),
        INDEX (status)
      )
    `);
    
    // Create inventory table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
        unit VARCHAR(20) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create orders table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer VARCHAR(100) NOT NULL,
        product VARCHAR(100) NOT NULL,
        quantity INT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create production table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS production (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product VARCHAR(100) NOT NULL,
        planned_quantity INT NOT NULL,
        actual_quantity INT DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'planned',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create customers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE COMMENT '客户编码',
        name VARCHAR(100) NOT NULL,
        contact_person VARCHAR(50),
        contact_phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        status TINYINT DEFAULT 1 COMMENT '状态：0-禁用 1-启用',
        remark TEXT COMMENT '备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create sales_quotations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales_quotations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quotation_no VARCHAR(50) NOT NULL UNIQUE,
        customer_id INT NOT NULL,
        total_amount DECIMAL(15,2) NOT NULL,
        validity_date DATE NOT NULL,
        status ENUM('draft', 'sent', 'accepted', 'rejected', 'expired') DEFAULT 'draft',
        remarks TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Create sales_quotation_items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales_quotation_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quotation_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(15,2) NOT NULL,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        tax_percent DECIMAL(5,2) DEFAULT 0,
        total_price DECIMAL(15,2) NOT NULL,
        FOREIGN KEY (quotation_id) REFERENCES sales_quotations(id),
        FOREIGN KEY (product_id) REFERENCES inventory(id)
      )
    `);

    // Create sales_orders table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_no VARCHAR(50) NOT NULL UNIQUE,
        customer_id INT NOT NULL,
        quotation_id INT,
        total_amount DECIMAL(15,2) NOT NULL,
        payment_terms VARCHAR(100),
        delivery_date DATE,
        status ENUM('draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'draft',
        remarks TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (quotation_id) REFERENCES sales_quotations(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Create sales_order_items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        material_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(15,2) NOT NULL,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        tax_percent DECIMAL(5,2) DEFAULT 0,
        total_price DECIMAL(15,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES sales_orders(id),
        FOREIGN KEY (material_id) REFERENCES inventory(id)
      )
    `);

    // Create sales_outbound table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales_outbound (
        id INT AUTO_INCREMENT PRIMARY KEY,
        outbound_no VARCHAR(50) NOT NULL UNIQUE,
        order_id INT NOT NULL,
        delivery_date DATE NOT NULL,
        status ENUM('draft', 'processing', 'completed', 'cancelled') DEFAULT 'draft',
        remarks TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES sales_orders(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Create sales_outbound_items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales_outbound_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        outbound_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        FOREIGN KEY (outbound_id) REFERENCES sales_outbound(id),
        FOREIGN KEY (product_id) REFERENCES inventory(id)
      )
    `);

    // Create sales_returns table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_no VARCHAR(50) NOT NULL UNIQUE,
        order_id INT NOT NULL,
        return_date DATE NOT NULL,
        return_reason TEXT NOT NULL,
        status ENUM('draft', 'pending', 'approved', 'completed', 'rejected') DEFAULT 'draft',
        remarks TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES sales_orders(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Create sales_return_items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales_return_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        reason TEXT,
        FOREIGN KEY (return_id) REFERENCES sales_returns(id),
        FOREIGN KEY (product_id) REFERENCES inventory(id)
      )
    `);

    // Create sales_exchanges table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales_exchanges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exchange_no VARCHAR(50) NOT NULL UNIQUE,
        order_id INT NOT NULL,
        exchange_date DATE NOT NULL,
        exchange_reason TEXT NOT NULL,
        status ENUM('draft', 'pending', 'approved', 'completed', 'rejected') DEFAULT 'draft',
        remarks TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES sales_orders(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Create sales_exchange_items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales_exchange_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exchange_id INT NOT NULL,
        old_product_id INT NOT NULL,
        new_product_id INT NOT NULL,
        quantity INT NOT NULL,
        reason TEXT,
        FOREIGN KEY (exchange_id) REFERENCES sales_exchanges(id),
        FOREIGN KEY (old_product_id) REFERENCES inventory(id),
        FOREIGN KEY (new_product_id) REFERENCES inventory(id)
      )
    `);

    // 创建库存相关表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE COMMENT '仓库编码',
        name VARCHAR(100) NOT NULL COMMENT '仓库名称',
        address VARCHAR(200) COMMENT '仓库地址',
        manager VARCHAR(50) COMMENT '负责人',
        contact VARCHAR(20) COMMENT '联系方式',
        status TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
        remarks TEXT COMMENT '备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (status)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory_stock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_id INT NOT NULL COMMENT '物料ID',
        warehouse_id INT NOT NULL COMMENT '仓库ID',
        location_code VARCHAR(50) COMMENT '库位编码',
        batch_no VARCHAR(50) COMMENT '批次号',
        quantity DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '库存数量',
        reserved_quantity DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '预留数量',
        available_quantity DECIMAL(10,2) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED COMMENT '可用数量',
        unit VARCHAR(20) COMMENT '单位',
        status TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-冻结 1-可用',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_material_warehouse_batch (material_id, warehouse_id, batch_no),
        INDEX (material_id),
        INDEX (warehouse_id),
        INDEX (status)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory_stock_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_id INT NOT NULL COMMENT '物料ID',
        warehouse_id INT NOT NULL COMMENT '仓库ID',
        batch_no VARCHAR(50) COMMENT '批次号',
        quantity DECIMAL(10,2) NOT NULL COMMENT '数量',
        type ENUM('in', 'out', 'adjust', 'transfer') NOT NULL COMMENT '类型',
        source_id INT COMMENT '来源单据ID',
        source_type VARCHAR(50) COMMENT '来源单据类型',
        operator VARCHAR(50) COMMENT '操作员',
        remarks TEXT COMMENT '备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (material_id),
        INDEX (warehouse_id),
        INDEX (type),
        INDEX (source_id, source_type)
      )
    `);
    
    // 创建库存流水表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_no VARCHAR(50) NOT NULL UNIQUE COMMENT '流水编号',
        material_id INT NOT NULL COMMENT '物料ID',
        location_id INT NOT NULL COMMENT '仓库ID',
        transaction_type ENUM('入库', '出库', '销售出库', '调拨', '盘点', '其他') NOT NULL COMMENT '流水类型',
        quantity DECIMAL(10,2) NOT NULL COMMENT '数量',
        before_quantity DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '变动前数量',
        after_quantity DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '变动后数量',
        unit_id INT COMMENT '单位ID',
        amount DECIMAL(15,2) DEFAULT 0 COMMENT '金额',
        batch_no VARCHAR(50) COMMENT '批次号',
        reference_no VARCHAR(50) COMMENT '关联单据号',
        reference_type VARCHAR(50) COMMENT '关联单据类型',
        transaction_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '交易时间',
        created_by VARCHAR(50) COMMENT '操作人',
        remarks TEXT COMMENT '备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (material_id),
        INDEX (location_id),
        INDEX (transaction_type),
        INDEX (transaction_time),
        INDEX (reference_no, reference_type)
      )
    `);

    // 创建物料主数据表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE COMMENT '物料编码',
        name VARCHAR(100) NOT NULL COMMENT '物料名称',
        category_id INT COMMENT '分类ID',
        unit_id INT COMMENT '主单位ID',
        specs VARCHAR(200) COMMENT '规格',
        model VARCHAR(100) COMMENT '型号',
        brand VARCHAR(100) COMMENT '品牌',
        min_stock DECIMAL(10,2) DEFAULT 0 COMMENT '最小库存',
        max_stock DECIMAL(10,2) DEFAULT 0 COMMENT '最大库存',
        safety_stock DECIMAL(10,2) DEFAULT 0 COMMENT '安全库存',
        status TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
        remarks TEXT COMMENT '备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (category_id),
        INDEX (status)
      )
    `);

    // 创建采购订单表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_no VARCHAR(50) NOT NULL UNIQUE COMMENT '订单编号',
        supplier_id INT NOT NULL COMMENT '供应商ID',
        order_date DATE NOT NULL COMMENT '订单日期',
        delivery_date DATE COMMENT '预计交货日期',
        total_amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '总金额',
        payment_terms VARCHAR(100) COMMENT '付款条件',
        delivery_method VARCHAR(100) COMMENT '交货方式',
        status ENUM('draft', 'approved', 'processing', 'completed', 'cancelled') DEFAULT 'draft' COMMENT '状态',
        approver VARCHAR(50) COMMENT '审批人',
        approval_date DATETIME COMMENT '审批日期',
        creator VARCHAR(50) COMMENT '创建人',
        remarks TEXT COMMENT '备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (supplier_id),
        INDEX (status)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL COMMENT '订单ID',
        material_id INT NOT NULL COMMENT '物料ID',
        quantity DECIMAL(10,2) NOT NULL COMMENT '数量',
        unit_price DECIMAL(10,2) NOT NULL COMMENT '单价',
        tax_rate DECIMAL(5,2) DEFAULT 0 COMMENT '税率',
        amount DECIMAL(15,2) NOT NULL COMMENT '金额',
        delivery_date DATE COMMENT '交货日期',
        remarks TEXT COMMENT '备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES purchase_orders(id),
        INDEX (material_id)
      )
    `);

    // Create suppliers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        contact_person VARCHAR(50),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        status TINYINT NOT NULL DEFAULT 1,
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create categories table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parent_id INT NULL,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        level INT NOT NULL DEFAULT 1,
        sort INT NOT NULL DEFAULT 0,
        status TINYINT NOT NULL DEFAULT 1,
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (parent_id),
        INDEX (code),
        INDEX (status)
      )
    `);
    
    // Create units table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        code VARCHAR(20) NOT NULL,
        status TINYINT NOT NULL DEFAULT 1,
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (code),
        INDEX (status)
      )
    `);
    
    // Create departments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parent_id INT,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        manager VARCHAR(50),
        phone VARCHAR(20),
        sort_order INT DEFAULT 0,
        status TINYINT NOT NULL DEFAULT 1,
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (parent_id),
        INDEX (status)
      )
    `);
    
    // Create roles table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description VARCHAR(200),
        status TINYINT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (status)
      )
    `);
    
    // Create user_roles table (many-to-many relationship)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (role_id),
        UNIQUE KEY unique_user_role (user_id, role_id)
      )
    `);
    
    // Create menus table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS menus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parent_id INT,
        name VARCHAR(50) NOT NULL,
        path VARCHAR(100),
        component VARCHAR(100),
        redirect VARCHAR(100),
        icon VARCHAR(50),
        permission VARCHAR(100),
        type TINYINT NOT NULL DEFAULT 0 COMMENT '0-目录 1-菜单 2-按钮',
        visible TINYINT NOT NULL DEFAULT 1,
        status TINYINT NOT NULL DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (parent_id),
        INDEX (status)
      )
    `);
    
    // Create role_menus table (many-to-many relationship)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS role_menus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL,
        menu_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (role_id),
        INDEX (menu_id),
        UNIQUE KEY unique_role_menu (role_id, menu_id)
      )
    `);
    
    // Check if admin user exists, if not create default admin
    const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', ['admin']);
    
    if (users.length === 0) {
      // Create default admin user with password '123456'
      const hashedPassword = await bcrypt.hash('123456', 10);
      await connection.execute(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin']
      );
      console.log('Default admin user created');
    } else {
      // For debugging purposes, let's update the admin password to '123456'
      const hashedPassword = await bcrypt.hash('123456', 10);
      await connection.execute(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, 'admin']
      );
      console.log('Admin password updated for testing');
    }
    
    // Insert sample data if tables are empty
    const [inventoryItems] = await connection.execute('SELECT COUNT(*) as count FROM inventory');
    if (inventoryItems[0].count === 0) {
      await connection.execute(
        'INSERT INTO inventory (name, quantity, unit, status) VALUES (?, ?, ?, ?)',
        ['Raw Material A', 100, 'kg', 'in-stock']
      );
      await connection.execute(
        'INSERT INTO inventory (name, quantity, unit, status) VALUES (?, ?, ?, ?)',
        ['Raw Material B', 50, 'liters', 'in-stock']
      );
      await connection.execute(
        'INSERT INTO inventory (name, quantity, unit, status) VALUES (?, ?, ?, ?)',
        ['Product X', 30, 'pieces', 'finished-goods']
      );
      console.log('Sample inventory data inserted');
    }
    
    // Insert default roles if they don't exist
    const [roles] = await connection.execute('SELECT * FROM roles');
    
    if (roles.length === 0) {
      await connection.execute(
        'INSERT INTO roles (name, code, description, status) VALUES (?, ?, ?, ?)',
        ['管理员', 'admin', '系统管理员，拥有所有权限', 1]
      );
      
      await connection.execute(
        'INSERT INTO roles (name, code, description, status) VALUES (?, ?, ?, ?)',
        ['普通用户', 'user', '普通用户，拥有基本权限', 1]
      );
      
      console.log('Default roles created');
    }
    
    // Insert default menus if they don't exist
    const [menus] = await connection.execute('SELECT * FROM menus');
    
    if (menus.length === 0) {
      // First insert system management main menu
      const [systemResult] = await connection.execute(
        'INSERT INTO menus (parent_id, name, path, component, icon, type, visible, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [null, '系统管理', '/system', 'Layout', 'icon-setting', 0, 1, 1, 100]
      );
      
      const systemMenuId = systemResult.insertId;
      
      // Then insert submenus
      await connection.execute(
        'INSERT INTO menus (parent_id, name, path, component, icon, type, visible, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [systemMenuId, '用户管理', 'users', 'system/Users', 'icon-user', 1, 1, 1, 1]
      );
      
      await connection.execute(
        'INSERT INTO menus (parent_id, name, path, component, icon, type, visible, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [systemMenuId, '部门管理', 'departments', 'system/Departments', 'icon-office-building', 1, 1, 1, 2]
      );
      
      await connection.execute(
        'INSERT INTO menus (parent_id, name, path, component, icon, type, visible, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [systemMenuId, '权限设置', 'permissions', 'system/Permissions', 'icon-lock', 1, 1, 1, 3]
      );
      
      console.log('Default menus created');
    }
    
    // Assign admin role to admin user if not already assigned
    const [userRoles] = await connection.execute(
      'SELECT * FROM user_roles ur JOIN users u ON ur.user_id = u.id JOIN roles r ON ur.role_id = r.id WHERE u.username = ? AND r.code = ?',
      ['admin', 'admin']
    );
    
    if (userRoles.length === 0) {
      const [adminUser] = await connection.execute('SELECT id FROM users WHERE username = ?', ['admin']);
      const [adminRole] = await connection.execute('SELECT id FROM roles WHERE code = ?', ['admin']);
      
      if (adminUser.length > 0 && adminRole.length > 0) {
        await connection.execute(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [adminUser[0].id, adminRole[0].id]
        );
        console.log('Admin role assigned to admin user');
      }
    }
    
    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize database on module load
initDatabase();

// Database access functions
module.exports = {
  pool,
  query,
  getClient,
  ensureNumber,
  initDatabase,
  // User functions
  async getUser(username) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  },
  
  async getUserById(id) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  },
  
  async updateUser(id, userData) {
    try {
      console.log('更新用户信息，ID:', id, '数据:', userData);
      const updateFields = [];
      const updateValues = [];
      
      // 检查并添加要更新的字段
      if (userData.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(userData.name);
      }
      
      if (userData.email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(userData.email);
      }
      
      if (userData.phone !== undefined) {
        updateFields.push('phone = ?');
        updateValues.push(userData.phone);
      }
      
      if (userData.department_id !== undefined) {
        updateFields.push('department_id = ?');
        updateValues.push(userData.department_id);
      }
      
      if (userData.status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(userData.status);
      }
      
      if (userData.avatar !== undefined) {
        updateFields.push('avatar = ?');
        updateValues.push(userData.avatar);
      }
      
      // 如果没有要更新的字段，返回当前用户
      if (updateFields.length === 0) {
        return await this.getUserById(id);
      }
      
      // 添加ID到值数组的末尾
      updateValues.push(id);
      
      const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      console.log('执行SQL:', sql, '参数:', updateValues);
      
      await pool.execute(sql, updateValues);
      
      // 返回更新后的用户信息
      return await this.getUserById(id);
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  },
  
  async getAllUsers() {
    const [rows] = await pool.execute('SELECT id, username, role, created_at FROM users');
    return rows;
  },
  
  // Inventory functions
  async getInventoryItems() {
    const [rows] = await pool.execute('SELECT * FROM inventory');
    return rows;
  },
  
  async getInventoryItem(id) {
    const [rows] = await pool.execute('SELECT * FROM inventory WHERE id = ?', [id]);
    return rows[0];
  },
  
  async createInventoryItem(item) {
    const [result] = await pool.execute(
      'INSERT INTO inventory (name, quantity, unit, status) VALUES (?, ?, ?, ?)',
      [item.name, item.quantity, item.unit, item.status]
    );
    return { id: result.insertId, ...item };
  },
  
  async updateInventoryItem(id, item) {
    await pool.execute(
      'UPDATE inventory SET name = ?, quantity = ?, unit = ?, status = ? WHERE id = ?',
      [item.name, item.quantity, item.unit, item.status, id]
    );
    return { id, ...item };
  },
  
  // Orders functions
  async getOrders() {
    const [rows] = await pool.execute('SELECT * FROM orders');
    return rows;
  },
  
  async getOrder(id) {
    const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
    return rows[0];
  },
  
  async createOrder(order) {
    const [result] = await pool.execute(
      'INSERT INTO orders (customer, product, quantity, status) VALUES (?, ?, ?, ?)',
      [order.customer, order.product, order.quantity, order.status]
    );
    return { id: result.insertId, ...order };
  },
  
  async updateOrder(id, order) {
    await pool.execute(
      'UPDATE orders SET customer = ?, product = ?, quantity = ?, status = ? WHERE id = ?',
      [order.customer, order.product, order.quantity, order.status, id]
    );
    return { id, ...order };
  },
  
  // Production functions
  async getProductionJobs() {
    const [rows] = await pool.execute('SELECT * FROM production');
    return rows;
  },
  
  async getProductionJob(id) {
    const [rows] = await pool.execute('SELECT * FROM production WHERE id = ?', [id]);
    return rows[0];
  },
  
  async createProductionJob(job) {
    const [result] = await pool.execute(
      'INSERT INTO production (product, planned_quantity, actual_quantity, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
      [job.product, job.plannedQuantity, job.actualQuantity || 0, job.status, job.startDate, job.endDate]
    );
    return { id: result.insertId, ...job };
  },
  
  async updateProductionJob(id, job) {
    await pool.execute(
      'UPDATE production SET product = ?, planned_quantity = ?, actual_quantity = ?, status = ?, start_date = ?, end_date = ? WHERE id = ?',
      [job.product, job.plannedQuantity, job.actualQuantity, job.status, job.startDate, job.endDate, id]
    );
    return { id, ...job };
  },

  // Customers functions
  async getCustomers() {
    const [rows] = await pool.execute('SELECT * FROM customers');
    return rows;
  },

  async getCustomer(id) {
    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [id]);
    return rows[0];
  },

  async createCustomer(customer) {
    const [result] = await pool.execute(
      'INSERT INTO customers (name, contact_person, phone, email, address, credit_limit, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [customer.name, customer.contactPerson, customer.phone, customer.email, customer.address, customer.creditLimit, customer.status]
    );
    return { id: result.insertId, ...customer };
  },

  async updateCustomer(id, customer) {
    await pool.execute(
      'UPDATE customers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, credit_limit = ?, status = ? WHERE id = ?',
      [customer.name, customer.contactPerson, customer.phone, customer.email, customer.address, customer.creditLimit, customer.status, id]
    );
    return { id, ...customer };
  },

  // Sales Quotations functions
  async getSalesQuotations() {
    const [rows] = await pool.execute(`
      SELECT sq.*, c.name as customer_name, u.username as created_by_name 
      FROM sales_quotations sq
      JOIN customers c ON sq.customer_id = c.id
      JOIN users u ON sq.created_by = u.id
    `);
    return rows;
  },

  async getSalesQuotation(id) {
    const [quotation] = await pool.execute(`
      SELECT sq.*, c.name as customer_name, u.username as created_by_name 
      FROM sales_quotations sq
      JOIN customers c ON sq.customer_id = c.id
      JOIN users u ON sq.created_by = u.id
      WHERE sq.id = ?
    `, [id]);
    
    const [items] = await pool.execute(`
      SELECT sqi.*, i.name as product_name
      FROM sales_quotation_items sqi
      JOIN inventory i ON sqi.product_id = i.id
      WHERE sqi.quotation_id = ?
    `, [id]);
    
    return { ...quotation[0], items };
  },

  async createSalesQuotation(quotation, items) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [result] = await connection.execute(
        'INSERT INTO sales_quotations (quotation_no, customer_id, total_amount, validity_date, status, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [quotation.quotationNo, quotation.customerId, quotation.totalAmount, quotation.validityDate, quotation.status, quotation.remarks, quotation.createdBy]
      );
      
      const quotationId = result.insertId;
      
      for (const item of items) {
        await connection.execute(
          'INSERT INTO sales_quotation_items (quotation_id, product_id, quantity, unit_price, discount_percent, tax_percent, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [quotationId, item.productId, item.quantity, item.unitPrice, item.discountPercent, item.taxPercent, item.totalPrice]
        );
      }
      
      await connection.commit();
      return { id: quotationId, ...quotation, items };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Sales Orders functions
  async getLastOrderNoOfDay(dateStr) {
    const [rows] = await pool.execute(`
      SELECT order_no 
      FROM sales_orders 
      WHERE order_no LIKE ? 
      ORDER BY order_no DESC 
      LIMIT 1
    `, [`DD${dateStr}%`]);
    return rows[0]?.order_no;
  },

  async getSalesOrders() {
    try {
      const [orders] = await pool.execute(`
        SELECT 
          so.*, 
          c.name as customer_name,
          c.contact_person,
          c.contact_phone,
          c.address as delivery_address
        FROM sales_orders so
        JOIN customers c ON so.customer_id = c.id
      `);
      
      // 获取每个订单的物料明细
      for (let order of orders) {
        try {
          const [items] = await pool.execute(`
            SELECT 
              soi.*,
              m.code as material_code,
              m.name as material_name,
              m.specs as specification,
              u.name as unit_name
            FROM sales_order_items soi
            JOIN materials m ON soi.material_id = m.id
            LEFT JOIN units u ON m.unit_id = u.id
            WHERE soi.order_id = ?
          `, [order.id]);
          
          order.items = items;
        } catch (error) {
          console.error(`Error fetching items for order ${order.id}:`, error);
          order.items = []; // 如果获取明细失败，设置为空数组
        }
      }
      
      return orders;
    } catch (error) {
      console.error('Error in getSalesOrders:', error);
      return [];
    }
  },

  async getSalesOrder(id) {
    const [order] = await pool.execute(`
      SELECT 
        so.*, 
        c.id as customer_id,
        c.name as customer_name,
        c.contact_person,
        c.contact_phone,
        c.address as delivery_address,
        u.username as created_by_name 
      FROM sales_orders so
      JOIN customers c ON so.customer_id = c.id
      JOIN users u ON so.created_by = u.id
      WHERE so.id = ?
    `, [id]);
    
    const [items] = await pool.execute(`
      SELECT 
        soi.*, 
        m.code as material_code,
        m.name as material_name,
        m.specs as specification,
        u.name as unit_name
      FROM sales_order_items soi
      JOIN materials m ON soi.material_id = m.id
      LEFT JOIN units u ON m.unit_id = u.id
      WHERE soi.order_id = ?
    `, [id]);
    
    return { ...order[0], items };
  },

  async createSalesOrder(order, items) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [result] = await connection.execute(
        'INSERT INTO sales_orders (order_no, customer_id, quotation_id, total_amount, payment_terms, delivery_date, status, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [order.orderNo, order.customerId, order.quotationId, order.totalAmount, order.paymentTerms, order.deliveryDate, order.status, order.remarks, order.createdBy]
      );
      
      const orderId = result.insertId;
      
      for (const item of items) {
        await connection.execute(
          'INSERT INTO sales_order_items (order_id, material_id, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?)',
          [orderId, item.material_id, item.quantity, item.unit_price, item.amount]
        );
      }
      
      await connection.commit();
      return { id: orderId, ...order, items };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
  
  // 更新销售订单
  async updateSalesOrder(id, order, items) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // 更新销售订单基本信息
      await connection.execute(
        'UPDATE sales_orders SET customer_id = ?, total_amount = ?, payment_terms = ?, delivery_date = ?, status = ?, remarks = ? WHERE id = ?',
        [order.customer_id, order.total_amount, order.payment_terms, order.delivery_date, order.status, order.remarks, id]
      );
      
      // 删除原有的订单明细
      await connection.execute('DELETE FROM sales_order_items WHERE order_id = ?', [id]);
      
      // 添加新的订单明细
      for (const item of items) {
        await connection.execute(
          'INSERT INTO sales_order_items (order_id, material_id, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?)',
          [id, item.material_id, item.quantity, item.unit_price, item.amount]
        );
      }
      
      await connection.commit();
      return { id, ...order, items };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};