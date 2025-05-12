const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('开始创建工序模板相关表...');

    // 创建工序模板主表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS process_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL COMMENT '模板编号',
        name VARCHAR(100) NOT NULL COMMENT '模板名称',
        product_id INT COMMENT '关联产品ID',
        description TEXT COMMENT '模板描述',
        status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用, 1-启用',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX idx_template_code (code),
        INDEX idx_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工序模板表';
    `);
    console.log('工序模板主表创建成功');

    // 创建工序模板明细表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS process_template_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_id INT NOT NULL COMMENT '模板ID',
        order_num INT NOT NULL COMMENT '工序顺序',
        name VARCHAR(100) NOT NULL COMMENT '工序名称',
        description TEXT COMMENT '工序描述',
        standard_hours DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '标准工时(小时)',
        department VARCHAR(50) COMMENT '执行部门',
        remark TEXT COMMENT '备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_template_id (template_id),
        INDEX idx_order (order_num)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工序模板明细表';
    `);
    console.log('工序模板明细表创建成功');

    // 添加一些测试数据
    const [templateInsertResult] = await connection.query(`
      INSERT INTO process_templates (code, name, product_id, description, status)
      VALUES 
        ('PT001', '标准机器人生产流程', 27, '6轴工业机器人标准生产工序', 1),
        ('PT002', '传送带生产流程', 28, '3米标准工业传送带生产工序', 1)
    `);
    console.log('插入工序模板测试数据成功');

    const [detailsInsertResult] = await connection.query(`
      INSERT INTO process_template_details 
        (template_id, order_num, name, description, standard_hours, department, remark)
      VALUES 
        (1, 1, '零部件预处理', '对机器人各零部件进行清洁和预处理', 2.5, '生产一部', '需要特殊清洁剂'),
        (1, 2, '机械臂组装', '组装机器人机械臂部分', 5, '生产一部', '需要精密校准'),
        (1, 3, '电气系统安装', '安装控制系统和电气连接', 3, '生产二部', '需要专业电工'),
        (1, 4, '软件烧录', '烧录控制软件并进行基础配置', 1.5, '生产二部', '使用最新固件版本'),
        (1, 5, '整机测试', '测试机器人各项功能和精度', 4, '质检部', '按照质检标准QC-R01执行'),
        (1, 6, '包装', '对成品进行包装', 1, '包装部', '使用加强型包装材料'),
        
        (2, 1, '框架制作', '焊接和组装传送带金属框架', 4, '生产一部', '使用标准钢材'),
        (2, 2, '传动系统安装', '安装电机和传动组件', 3, '生产一部', '需要专业技术人员'),
        (2, 3, '皮带安装', '安装和调整传送带皮带', 2, '生产二部', '注意皮带张力调整'),
        (2, 4, '控制系统安装', '安装和连接电控系统', 2.5, '生产二部', '包含变频控制系统'),
        (2, 5, '测试调试', '测试传送带运行情况并调整', 1.5, '质检部', '需要测速和负载测试'),
        (2, 6, '清洁包装', '清洁成品并包装', 1, '包装部', '使用防潮包装')
    `);
    console.log('插入工序模板明细测试数据成功');

    console.log('工序模板相关表创建和初始化完成!');
  } catch (error) {
    console.error('创建表过程中发生错误:', error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error); 