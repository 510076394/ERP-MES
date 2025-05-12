const express = require('express');
const db = require('../config/db');
const router = express.Router();

/**
 * 测试获取库存流水列表
 */
router.get('/inventory-transactions', async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    // 获取请求参数
    const { 
      page = 1, 
      pageSize = 10, 
      startDate = '2025-04-01', 
      endDate = '2025-05-31'
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 构建查询条件
    let conditions = [];
    let params = [];
    
    if (startDate && endDate) {
      conditions.push('t.created_at BETWEEN ? AND ?');
      params.push(
        `${startDate} 00:00:00`,
        `${endDate} 23:59:59`
      );
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    // 查询总记录数
    const [countResult] = await connection.query(
      `SELECT COUNT(*) as total 
       FROM inventory_transactions t
       ${whereClause.replace('t.', '')}`,
      params
    );
    
    const total = countResult[0].total;
    
    // 简化查询，不使用复杂的JOIN
    const [transactions] = await connection.query(
      `SELECT 
         id,
         material_id,
         location_id,
         transaction_type,
         quantity,
         reference_no,
         operator,
         created_at
       FROM 
         inventory_transactions
       ${whereClause.replace('t.', '')}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    // 返回标准格式的响应
    res.json({
      items: transactions,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('测试查询库存流水失败:', error);
    res.status(500).json({ 
      message: '测试查询库存流水失败', 
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

/**
 * 测试获取库存流水列表 - 详细版本
 */
router.get('/inventory-transactions-detail', async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    // 获取请求参数
    const { 
      page = 1, 
      pageSize = 10, 
      startDate = '2025-04-01', 
      endDate = '2025-05-31'
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 构建查询条件
    let conditions = [];
    let params = [];
    
    if (startDate && endDate) {
      conditions.push('inventory_transactions.created_at BETWEEN ? AND ?');
      params.push(
        `${startDate} 00:00:00`,
        `${endDate} 23:59:59`
      );
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    // 查询所有列，看看实际返回了什么
    const [columns] = await connection.query('SHOW COLUMNS FROM inventory_transactions');
    console.log('库存流水表字段列表:');
    columns.forEach(col => console.log(`- ${col.Field}`));
    
    // 使用详细的查询，确保返回所有需要的字段
    const query = `
      SELECT 
        inventory_transactions.*,
        inventory_transactions.id,
        inventory_transactions.material_id as materialId,
        materials.code as materialCode,
        materials.name as materialName,
        inventory_transactions.location_id as locationId,
        locations.name as locationName,
        inventory_transactions.transaction_type as transactionType,
        CASE 
          WHEN inventory_transactions.transaction_type = 'inbound' THEN '入库'
          WHEN inventory_transactions.transaction_type = 'outbound' THEN '出库'
          WHEN inventory_transactions.transaction_type = 'transfer' THEN '调拨'
          WHEN inventory_transactions.transaction_type = 'check' THEN '盘点'
          ELSE inventory_transactions.transaction_type
        END as transactionTypeName,
        inventory_transactions.quantity,
        inventory_transactions.unit_id as unitId,
        units.name as unitName,
        inventory_transactions.reference_no as referenceNo,
        inventory_transactions.reference_type as referenceType,
        inventory_transactions.operator as createdBy,
        inventory_transactions.remark as remarks,
        DATE_FORMAT(inventory_transactions.created_at, '%Y-%m-%d %H:%i:%s') as transactionTime
      FROM 
        inventory_transactions
      LEFT JOIN 
        materials ON inventory_transactions.material_id = materials.id
      LEFT JOIN 
        locations ON inventory_transactions.location_id = locations.id
      LEFT JOIN 
        units ON inventory_transactions.unit_id = units.id
      ${whereClause}
      ORDER BY 
        inventory_transactions.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    console.log('执行查询:', query);
    
    const [transactions] = await connection.query(query, [...params, limit, offset]);
    
    console.log('查询结果字段:', Object.keys(transactions[0] || {}).join(', '));
    
    // 简单处理一下
    const formattedTransactions = transactions.map(trans => {
      // 确保数字字段是数值类型
      return {
        ...trans,
        quantity: parseFloat(trans.quantity || 0)
      };
    });
    
    // 查询总记录数
    const [countResult] = await connection.query(
      `SELECT COUNT(*) as total FROM inventory_transactions ${whereClause.replace('inventory_transactions.', '')}`,
      params
    );
    
    // 返回标准格式的响应
    res.json({
      items: formattedTransactions,
      total: countResult[0].total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('测试查询库存流水失败:', error);
    res.status(500).json({ 
      message: '测试查询库存流水失败', 
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

module.exports = router; 