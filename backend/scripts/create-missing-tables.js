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
    // 1. 创建 processes 表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS processes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL COMMENT '工序编码',
        name VARCHAR(100) NOT NULL COMMENT '工序名称',
        description TEXT COMMENT '工序描述',
        standard_time INT COMMENT '标准工时(分钟)',
        is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_process_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工序表';
    `);
    console.log('processes 表创建成功');

    // 2. 创建 production_orders 表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS production_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_no VARCHAR(50) NOT NULL COMMENT '工单号',
        product_id INT NOT NULL COMMENT '产品ID',
        planned_quantity INT NOT NULL COMMENT '计划数量',
        actual_quantity INT DEFAULT 0 COMMENT '实际数量',
        start_date DATE COMMENT '计划开始日期',
        end_date DATE COMMENT '计划结束日期',
        actual_start_date DATE COMMENT '实际开始日期',
        actual_end_date DATE COMMENT '实际结束日期',
        status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '状态',
        priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium' COMMENT '优先级',
        remarks TEXT COMMENT '备注',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_order_no (order_no),
        KEY idx_product_id (product_id),
        KEY idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产工单表';
    `);
    console.log('production_orders 表创建成功');

    // 3. 重新创建 products 表
    await connection.query('DROP TABLE IF EXISTS products');
    await connection.query(`
      CREATE TABLE products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL COMMENT '产品编码',
        name VARCHAR(100) NOT NULL COMMENT '产品名称',
        description TEXT COMMENT '产品描述',
        unit VARCHAR(10) NOT NULL COMMENT '单位',
        category_id INT COMMENT '产品类别ID',
        is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_product_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品表';
    `);
    console.log('products 表重新创建成功');

    // 4. 重新创建 quality_inspections 表
    await connection.query('DROP TABLE IF EXISTS quality_inspection_items');
    await connection.query('DROP TABLE IF EXISTS quality_inspections');
    
    await connection.query(`
      CREATE TABLE quality_inspections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inspection_no VARCHAR(20) NOT NULL COMMENT '检验单号',
        inspection_type ENUM('incoming', 'process', 'final') NOT NULL COMMENT '检验类型: 来料检验/过程检验/成品检验',
        reference_id INT COMMENT '关联单号ID(采购单ID/工单ID)',
        reference_no VARCHAR(20) COMMENT '关联单号',
        material_id INT COMMENT '物料ID(来料检验)',
        product_id INT COMMENT '产品ID(过程检验和成品检验)',
        process_id INT COMMENT '工序ID(过程检验)',
        batch_no VARCHAR(50) NOT NULL COMMENT '批次号',
        quantity DECIMAL(10, 2) NOT NULL COMMENT '检验数量',
        unit VARCHAR(10) NOT NULL COMMENT '单位',
        status ENUM('pending', 'passed', 'failed', 'partial', 'rework', 'conditional') NOT NULL DEFAULT 'pending' COMMENT '检验状态',
        planned_date DATE NOT NULL COMMENT '计划检验日期',
        actual_date DATE COMMENT '实际检验日期',
        inspector_id INT COMMENT '检验员ID',
        inspector_name VARCHAR(50) COMMENT '检验员姓名',
        standard_type ENUM('factory', 'customer', 'industry', 'national') COMMENT '标准类型',
        standard_no VARCHAR(50) COMMENT '标准编号',
        note TEXT COMMENT '备注',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_inspection_no (inspection_no),
        KEY idx_reference_id (reference_id),
        KEY idx_material_id (material_id),
        KEY idx_product_id (product_id),
        KEY idx_process_id (process_id),
        KEY idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='质量检验主表';
    `);
    console.log('quality_inspections 表重新创建成功');

    // 5. 重新创建 quality_inspection_items 表
    await connection.query(`
      CREATE TABLE quality_inspection_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inspection_id INT NOT NULL COMMENT '检验单ID',
        item_name VARCHAR(100) NOT NULL COMMENT '检验项目名称',
        standard VARCHAR(200) NOT NULL COMMENT '检验标准',
        method VARCHAR(200) COMMENT '检验方法',
        result VARCHAR(100) COMMENT '检验结果',
        is_qualified BOOLEAN COMMENT '是否合格',
        remark TEXT COMMENT '备注',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_inspection_id (inspection_id),
        CONSTRAINT fk_inspection_items_inspection FOREIGN KEY (inspection_id) REFERENCES quality_inspections(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='质量检验项表';
    `);
    console.log('quality_inspection_items 表重新创建成功');

    // 6. 添加一些基础数据
    // 检查并添加示例工序
    const [existingProcesses] = await connection.query('SELECT code FROM processes');
    const existingProcessCodes = existingProcesses.map(p => p.code);
    const processesToAdd = [
      ['P001', '材料准备', '准备生产所需的原材料', 30],
      ['P002', '零件加工', '加工生产所需的零件', 120],
      ['P003', '组装', '将零件组装成成品', 90],
      ['P004', '测试', '对成品进行测试', 60],
      ['P005', '包装', '对成品进行包装', 30]
    ].filter(p => !existingProcessCodes.includes(p[0]));

    if (processesToAdd.length > 0) {
      await connection.query(`
        INSERT INTO processes (code, name, description, standard_time) VALUES ?
      `, [processesToAdd]);
      console.log('添加示例工序数据成功');
    } else {
      console.log('工序数据已存在，跳过添加');
    }

    // 添加示例产品
    await connection.query(`
      INSERT INTO products (code, name, description, unit) VALUES
      ('PRD001', '智能照明控制器', '用于智能家居的照明控制系统', '个'),
      ('PRD002', '电路板组件', '用于电子设备的核心电路板', '个'),
      ('PRD003', '智能家居网关', '智能家居系统的控制中心', '个'),
      ('PRD004', '无线传感器', '用于环境监测的无线传感器', '个');
    `);
    console.log('添加示例产品数据成功');

    // 添加示例生产工单
    await connection.query(`
      INSERT INTO production_orders (order_no, product_id, planned_quantity, start_date, end_date, status) VALUES
      ('PD20250413001', 1, 200, '2025-04-13', '2025-04-15', 'in_progress'),
      ('PD20250412002', 2, 300, '2025-04-12', '2025-04-14', 'completed'),
      ('PD20250411001', 3, 150, '2025-04-11', '2025-04-13', 'completed'),
      ('PD20250410003', 4, 500, '2025-04-10', '2025-04-12', 'completed');
    `);
    console.log('添加示例生产工单数据成功');

    console.log('所有表创建和数据初始化完成');

  } catch (error) {
    console.error('创建表时出错:', error);
  } finally {
    await connection.end();
  }
}

main(); 