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
    // 生成检验单号：IQC + 日期 + 3位序号
    const today = new Date();
    const dateStr = today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');
    
    // 获取当天的序号
    const [rows] = await connection.query(
      `SELECT COUNT(*) as count FROM quality_inspections 
       WHERE inspection_no LIKE ? AND created_at >= CURRENT_DATE()`,
      [`IQC${dateStr}%`]
    );
    const sequence = String(rows[0].count + 1).padStart(3, '0');
    const inspectionNo = `IQC${dateStr}${sequence}`;

    // 开始事务
    await connection.beginTransaction();

    // 插入检验单主表数据
    const [result] = await connection.query(`
      INSERT INTO quality_inspections (
        inspection_no,
        inspection_type,
        reference_id,
        reference_no,
        material_id,
        batch_no,
        quantity,
        unit,
        status,
        planned_date,
        inspector_name,
        standard_type,
        standard_no,
        note
      ) VALUES (
        ?,
        'incoming',
        1,
        'PO20250415001',
        1,
        'B20250415001',
        100,
        '个',
        'pending',
        CURRENT_DATE(),
        '张工',
        'factory',
        'IQC-STD-001',
        '测试来料检验单'
      )
    `, [inspectionNo]);

    const inspectionId = result.insertId;

    // 插入检验项目数据
    await connection.query(`
      INSERT INTO quality_inspection_items (
        inspection_id,
        item_name,
        standard,
        method
      ) VALUES
      (?, '外观检查', '无明显划痕、变形', '目视检查'),
      (?, '尺寸检查', '长度：100±0.5mm，宽度：50±0.3mm', '卡尺测量'),
      (?, '性能测试', '工作电压：12V±0.5V', '万用表测量'),
      (?, '标识检查', '标签清晰可读，信息完整', '目视检查')
    `, [inspectionId, inspectionId, inspectionId, inspectionId]);

    // 提交事务
    await connection.commit();

    console.log('来料检验测试数据添加成功');
    console.log('检验单号:', inspectionNo);
    console.log('检验单ID:', inspectionId);

  } catch (error) {
    await connection.rollback();
    console.error('添加测试数据时出错:', error);
  } finally {
    await connection.end();
  }
}

main(); 