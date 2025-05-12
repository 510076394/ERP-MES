const { pool } = require('../config/db');

// 生成任务编号
exports.generateTaskCode = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    // 调用存储过程生成编号
    const [result] = await connection.query('CALL generate_task_code()');
    const [codeResult] = await connection.query('SELECT @new_code as code');
    
    if (!codeResult[0].code) {
      throw new Error('生成任务编号失败');
    }
    
    res.json({ code: codeResult[0].code });
  } catch (error) {
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 错误处理函数
const handleError = (res, error) => {
  console.error('操作失败:', error);
  
  // 特殊处理日期约束错误
  if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED' && error.sqlMessage && error.sqlMessage.includes('check_dates')) {
    return res.status(400).json({ message: '结束日期必须大于或等于开始日期' });
  }
  
  res.status(500).json({ message: error.message || '服务器内部错误' });
};

// 获取生产任务列表
exports.getProductionTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const status = req.query.status; // 获取状态过滤参数
    
    // 构建查询语句
    let query = `
      SELECT pt.*, pp.name as planName, p.name as productName, p.code as productCode, p.specs, 
             u.name as unit
      FROM production_tasks pt
      LEFT JOIN production_plans pp ON pt.plan_id = pp.id
      LEFT JOIN materials p ON pt.product_id = p.id
      LEFT JOIN units u ON p.unit_id = u.id
    `;
    
    const queryParams = [];
    
    // 如果指定了状态参数，添加状态过滤条件
    if (status) {
      query += ` WHERE pt.status = ?`;
      queryParams.push(status);
    }
    
    // 添加排序和分页
    query += ` ORDER BY pt.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(pageSize, offset);
    
    console.log('生产任务查询SQL:', query);
    console.log('查询参数:', queryParams);
    
    // 执行查询
    const [tasks] = await pool.query(query, queryParams);
    
    // 构建计数查询
    let countQuery = `SELECT COUNT(*) as total FROM production_tasks`;
    const countParams = [];
    
    // 添加状态过滤条件到计数查询
    if (status) {
      countQuery += ` WHERE status = ?`;
      countParams.push(status);
    }
    
    // 获取总记录数
    const [totalResult] = await pool.query(countQuery, countParams);
    const total = totalResult[0].total;
    
    res.json({
      items: tasks,
      total,
      page,
      pageSize
    });
  } catch (error) {
    console.error('获取生产任务列表失败:', error);
    handleError(res, error);
  }
};

// 创建生产任务
exports.createProductionTask = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { 
      plan_id, 
      product_id, 
      quantity, 
      start_date, 
      expected_end_date, 
      manager, 
      remarks,
      process_template_id // 添加工序模板ID
    } = req.body;
    
    // 1. 生成任务编号
    await connection.query('CALL generate_task_code()');
    const [codeResult] = await connection.query('SELECT @new_code as code');
    const code = codeResult[0].code;
    
    // 2. 如果提供了plan_id，检查生产计划是否存在
    if (plan_id) {
      const [planCheck] = await connection.query(
        'SELECT id, status, product_id, quantity FROM production_plans WHERE id = ?', 
        [plan_id]
      );
      
      if (planCheck.length === 0) {
        return res.status(404).json({ message: '生产计划不存在' });
      }
    }
    
    // 3. 插入生产任务
    const [taskResult] = await connection.query(`
      INSERT INTO production_tasks 
      (code, plan_id, product_id, quantity, start_date, expected_end_date, manager, remarks, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      code, 
      plan_id || null, 
      product_id, 
      quantity, 
      start_date, 
      expected_end_date, 
      manager || '未分配', 
      remarks || ''
    ]);
    
    const taskId = taskResult.insertId;
    
    // 4. 如果提供了工序模板ID，创建工序
    if (process_template_id) {
      // 查询工序模板
      const [templates] = await connection.query(
        'SELECT * FROM process_templates WHERE id = ?', 
        [process_template_id]
      );
      
      if (templates.length === 0) {
        return res.status(404).json({ message: '工序模板不存在' });
      }
      
      // 查询工序模板步骤
      const [steps] = await connection.query(
        'SELECT * FROM process_template_steps WHERE template_id = ? ORDER BY sequence', 
        [process_template_id]
      );
      
      // 为任务创建工序
      for (const step of steps) {
        await connection.query(`
          INSERT INTO production_processes 
          (task_id, name, sequence, responsible_person, planned_quantity, quantity, progress, status, remarks)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `, [
          taskId, 
          step.name, 
          step.sequence, 
          step.responsible_person || null, 
          quantity, 
          quantity, 
          0, 
          step.remarks || ''
        ]);
      }
    }
    
    // 5. 如果关联了生产计划，将生产计划状态更新为"生产中"
    if (plan_id) {
      await connection.query(
        'UPDATE production_plans SET status = "in_progress" WHERE id = ?',
        [plan_id]
      );
      console.log(`生产计划ID ${plan_id} 的状态已更新为"生产中"`);
    }
    
    await connection.commit();
    
    res.status(201).json({ 
      id: taskId,
      message: '生产任务创建成功'
    });
  } catch (error) {
    await connection.rollback();
    console.error('创建生产任务失败:', error);
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 更新生产任务
exports.updateProductionTask = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { 
      plan_id, 
      product_id, 
      quantity, 
      start_date, 
      expected_end_date, 
      manager, 
      remarks, 
      process_template_id 
    } = req.body;
    
    // 检查任务是否存在
    const [taskCheck] = await connection.query('SELECT id, status FROM production_tasks WHERE id = ?', [id]);
    if (taskCheck.length === 0) {
      return res.status(404).json({ message: '生产任务不存在' });
    }
    
    // 确保任务状态为pending，否则不允许修改
    if (taskCheck[0].status !== 'pending') {
      return res.status(400).json({ message: '只能修改待开始状态的生产任务' });
    }
    
    // 如果提供了plan_id，检查生产计划是否存在
    if (plan_id) {
      const [planCheck] = await connection.query('SELECT id, status FROM production_plans WHERE id = ?', [plan_id]);
      if (planCheck.length === 0) {
        return res.status(404).json({ message: '生产计划不存在' });
      }
    }
    
    // 更新生产任务
    await connection.query(`
      UPDATE production_tasks 
      SET plan_id = ?, product_id = ?, quantity = ?, start_date = ?, expected_end_date = ?, manager = ?, remarks = ?
      WHERE id = ?
    `, [plan_id || null, product_id, quantity, start_date, expected_end_date, manager, remarks, id]);
    
    // 如果提供了新的工序模板ID，则重新创建工序
    if (process_template_id) {
      // 先删除原有工序（如果存在）
      await connection.query('DELETE FROM production_processes WHERE task_id = ?', [id]);
      
      // 获取工序模板明细
      const [templateDetails] = await connection.query(`
        SELECT * FROM process_template_details
        WHERE template_id = ?
        ORDER BY order_num ASC
      `, [process_template_id]);
      
      if (templateDetails.length > 0) {
        // 根据工序模板创建工序
        const startDateObj = new Date(start_date);
        let currentDate = new Date(startDateObj);
        
        for (const detail of templateDetails) {
          // 计算计划结束时间
          const plannedStartTime = new Date(currentDate);
          const plannedEndTime = new Date(currentDate);
          plannedEndTime.setHours(plannedEndTime.getHours() + (detail.standard_hours || 8));
          
          await connection.query(`
            INSERT INTO production_processes
            (task_id, process_name, sequence, quantity, planned_start_time, planned_end_time, status, description)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
          `, [
            id,
            detail.name,
            detail.order_num,
            quantity,
            plannedStartTime,
            plannedEndTime,
            detail.description || null
          ]);
          
          // 更新日期到下一个工序
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }
    
    await connection.commit();
    
    res.json({ message: '生产任务更新成功' });
  } catch (error) {
    await connection.rollback();
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 删除生产任务
exports.deleteProductionTask = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // 检查任务是否存在
    const [taskCheck] = await connection.query('SELECT id, status FROM production_tasks WHERE id = ?', [id]);
    if (taskCheck.length === 0) {
      return res.status(404).json({ message: '生产任务不存在' });
    }
    
    if (taskCheck[0].status !== 'pending') {
      return res.status(400).json({ message: '只能删除待开始状态的生产任务' });
    }
    
    // 删除生产任务
    await connection.query('DELETE FROM production_tasks WHERE id = ?', [id]);
    
    await connection.commit();
    
    res.json({ message: '生产任务删除成功' });
  } catch (error) {
    await connection.rollback();
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 获取生产任务详情
exports.getProductionTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [tasks] = await pool.query(`
      SELECT pt.*, pp.name as planName, m.name as productName
      FROM production_tasks pt
      LEFT JOIN production_plans pp ON pt.plan_id = pp.id
      LEFT JOIN materials m ON pp.product_id = m.id
      WHERE pt.id = ?
    `, [id]);
    
    if (tasks.length === 0) {
      return res.status(404).json({ message: '生产任务不存在' });
    }
    
    res.json(tasks[0]);
  } catch (error) {
    handleError(res, error);
  }
};

// 更新生产任务进度
exports.updateProductionTaskProgress = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { progressDate, completedQuantity, remarks, status } = req.body;
    
    // 检查任务是否存在
    const [taskCheck] = await connection.query('SELECT id, status, plan_id FROM production_tasks WHERE id = ?', [id]);
    if (taskCheck.length === 0) {
      return res.status(404).json({ message: '生产任务不存在' });
    }
    
    // 检查任务状态，除非是明确要修改状态
    if (taskCheck[0].status === 'completed' || taskCheck[0].status === 'cancelled') {
      if (!status) {
        return res.status(400).json({ message: '已完成或已取消的任务不能更新进度' });
      }
    }
    
    // 如果提供了进度数据，则更新进度
    if (progressDate && completedQuantity !== undefined) {
      await connection.query(`
        INSERT INTO production_task_progress (task_id, progress_date, completed_quantity, remarks)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE completed_quantity = ?, remarks = ?
      `, [id, progressDate, completedQuantity, remarks || '', completedQuantity, remarks || '']);
    }
    
    // 如果提供了状态，则更新任务状态
    if (status) {
      let updateQuery = 'UPDATE production_tasks SET status = ? WHERE id = ?';
      let updateParams = [status, id];
      
      // 如果状态是已完成，则设置结束日期
      if (status === 'completed') {
        updateQuery = 'UPDATE production_tasks SET status = ?, actual_end_date = NOW() WHERE id = ?';
        
        // 如果任务关联了生产计划，则更新生产计划状态为检验中
        if (taskCheck[0].plan_id) {
          console.log(`任务ID=${id}状态更新为已完成，关联的生产计划ID=${taskCheck[0].plan_id}更新为检验中`);
          await connection.query(
            'UPDATE production_plans SET status = "inspection" WHERE id = ?',
            [taskCheck[0].plan_id]
          );
        }
        
        // 自动创建成品检验单
        await createFinalInspection(connection, id);
      }
      
      await connection.query(updateQuery, updateParams);
    } else if (progressDate && completedQuantity !== undefined) {
      // 没有提供状态但有进度数据时的默认行为，将pending状态更新为in_progress
      await connection.query(`
        UPDATE production_tasks 
        SET status = CASE
          WHEN status = 'pending' THEN 'in_progress'
          ELSE status
        END
        WHERE id = ?
      `, [id]);
      
      // 如果任务关联了生产计划并且状态从pending变为in_progress
      if (taskCheck[0].status === 'pending' && taskCheck[0].plan_id) {
        console.log(`任务ID=${id}状态从pending更新为in_progress，关联的生产计划ID=${taskCheck[0].plan_id}也更新为in_progress`);
        await connection.query(
          'UPDATE production_plans SET status = "in_progress" WHERE id = ? AND status != "completed"',
          [taskCheck[0].plan_id]
        );
      }
    }
    
    await connection.commit();
    
    res.json({ message: '生产任务更新成功' });
  } catch (error) {
    await connection.rollback();
    console.error('更新任务进度或状态失败:', error);
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 获取当天的最大序号
exports.getTodayMaxSequence = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10); // 获取 YYYY-MM-DD 格式的日期
    const datePrefix = `SC${today.getFullYear().toString().slice(-2)}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

    // 使用 FOR UPDATE 锁定查询结果
    const [result] = await connection.query(`
      SELECT MAX(SUBSTRING(code, 9)) as maxSeq
      FROM production_plans
      WHERE code LIKE ? 
        AND DATE(created_at) = ?
      FOR UPDATE
    `, [
      `${datePrefix}%`,
      dateStr
    ]);

    const maxSeq = result[0].maxSeq ? parseInt(result[0].maxSeq) : 0;
    const newSeq = (maxSeq + 1).toString().padStart(3, '0');
    
    // 验证新生成的编号是否已存在
    const [existCheck] = await connection.query(`
      SELECT COUNT(*) as count
      FROM production_plans
      WHERE code = ?
    `, [`${datePrefix}${newSeq}`]);
    
    if (existCheck[0].count > 0) {
      throw new Error('编号已存在，请重试');
    }
    
    await connection.commit();
    res.json({ sequence: newSeq });
  } catch (error) {
    await connection.rollback();
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 获取生产计划列表
exports.getProductionPlans = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const code = req.query.code || '';
    const product = req.query.product || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';
    // 处理状态参数，确保它是一个非空数组或者为null
    let status = [];
    if (req.query.status) {
      if (Array.isArray(req.query.status)) {
        status = req.query.status.filter(Boolean);
      } else if (typeof req.query.status === 'string' && req.query.status.trim() !== '') {
        status = req.query.status.split(',').filter(Boolean);
      }
    }
    
    // 构建查询条件
    let conditions = [];
    let params = [];
    
    if (code) {
      conditions.push('pp.code LIKE ?');
      params.push(`%${code}%`);
    }
    
    if (product) {
      conditions.push('m.name LIKE ? OR m.code LIKE ?');
      params.push(`%${product}%`, `%${product}%`);
    }
    
    if (startDate) {
      conditions.push('pp.plan_date >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      conditions.push('pp.plan_date <= ?');
      params.push(endDate);
    }
    
    if (status.length > 0) {
      // 使用 IN 操作符前确保数组非空
      conditions.push('pp.status IN (?)');
      params.push(status);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM production_plans pp ${whereClause}`;
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;
    
    // 查询分页数据
    const queryParams = [...params, pageSize, offset];
    const [plans] = await pool.query(`
      SELECT pp.id, pp.code, pp.name, pp.start_date, pp.end_date, pp.quantity, pp.status, pp.remark, pp.created_at, pp.updated_at,
             pp.product_id, m.name as productName, m.code as product_code
      FROM production_plans pp
      LEFT JOIN materials m ON pp.product_id = m.id
      ${whereClause}
      ORDER BY pp.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);
    
    res.json({
      items: plans,
      total,
      page,
      pageSize
    });
  } catch (error) {
    console.error('获取生产计划列表失败:', error);
    handleError(res, error);
  }
};

// 获取生产计划物料清单
exports.getPlanMaterials = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证生产计划存在
    const [planCheck] = await pool.query('SELECT id FROM production_plans WHERE id = ?', [id]);
    if (planCheck.length === 0) {
      return res.status(404).json({ message: '生产计划不存在' });
    }
    
    // 获取生产计划的物料清单
    const [materials] = await pool.query(`
      SELECT 
        ppm.id,
        ppm.material_id,
        m.code as material_code,
        m.name as material_name,
        m.specs as specification,
        m.unit_id,
        u.name as unit_name,
        ppm.required_quantity,
        COALESCE(s.quantity, 0) as stock_quantity
      FROM 
        production_plan_materials ppm
      JOIN 
        materials m ON ppm.material_id = m.id
      LEFT JOIN 
        units u ON m.unit_id = u.id
      LEFT JOIN 
        (SELECT material_id, SUM(quantity) as quantity 
         FROM inventory_stock 
         GROUP BY material_id) s ON m.id = s.material_id
      WHERE 
        ppm.plan_id = ?
      ORDER BY 
        m.code
    `, [id]);
    
    res.json(materials);
  } catch (error) {
    handleError(res, error);
  }
};

// 获取生产计划详情
exports.getProductionPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询计划基本信息
    const [plans] = await pool.query(`
      SELECT pp.*, m.name as productName 
      FROM production_plans pp
      LEFT JOIN materials m ON pp.product_id = m.id
      WHERE pp.id = ?
    `, [id]);
    
    if (plans.length === 0) {
      return res.status(404).json({ message: '生产计划不存在' });
    }
    
    const plan = plans[0];
    
    // 查询计划的物料需求
    const [materials] = await pool.query(`
      SELECT ppm.*, m.code, m.name, u.name as unit
      FROM production_plan_materials ppm
      LEFT JOIN materials m ON ppm.material_id = m.id
      LEFT JOIN units u ON m.unit_id = u.id
      WHERE ppm.plan_id = ?
    `, [id]);
    
    res.json({
      ...plan,
      materials
    });
  } catch (error) {
    handleError(res, error);
  }
};

// 创建生产计划
exports.createProductionPlan = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { code, name, start_date, end_date, productId, quantity } = req.body;
    
    // 处理日期格式，确保是YYYY-MM-DD格式
    const formattedStartDate = start_date ? new Date(start_date).toISOString().split('T')[0] : null;
    const formattedEndDate = end_date ? new Date(end_date).toISOString().split('T')[0] : null;
    
    // 插入生产计划
    const [result] = await connection.query(`
      INSERT INTO production_plans 
      (code, name, start_date, end_date, product_id, quantity, status)
      VALUES (?, ?, ?, ?, ?, ?, 'draft')
    `, [code, name, formattedStartDate, formattedEndDate, productId, quantity]);
    
    const planId = result.insertId;
    
    // 计算并插入物料需求
    await calculateAndInsertMaterials(connection, planId, productId, quantity);
    
    await connection.commit();
    
    res.status(201).json({ 
      id: planId,
      message: '生产计划创建成功'
    });
  } catch (error) {
    await connection.rollback();
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 更新生产计划
exports.updateProductionPlan = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { code, name, start_date, end_date, productId, quantity } = req.body;
    
    // 处理日期格式，确保是YYYY-MM-DD格式
    const formattedStartDate = start_date ? new Date(start_date).toISOString().split('T')[0] : null;
    const formattedEndDate = end_date ? new Date(end_date).toISOString().split('T')[0] : null;
    
    // 检查计划状态
    const [plans] = await connection.query(
      'SELECT status FROM production_plans WHERE id = ?', 
      [id]
    );
    
    if (plans.length === 0) {
      return res.status(404).json({ message: '生产计划不存在' });
    }
    
    if (plans[0].status !== 'draft') {
      return res.status(400).json({ message: '只能修改草稿状态的生产计划' });
    }
    
    // 更新生产计划，不更新编号
    await connection.query(`
      UPDATE production_plans 
      SET name = ?, start_date = ?, end_date = ?, product_id = ?, quantity = ?
      WHERE id = ?
    `, [name, formattedStartDate, formattedEndDate, productId, quantity, id]);
    
    // 删除原有物料需求
    await connection.query('DELETE FROM production_plan_materials WHERE plan_id = ?', [id]);
    
    // 重新计算并插入物料需求
    await calculateAndInsertMaterials(connection, id, productId, quantity);
    
    await connection.commit();
    
    res.json({ message: '生产计划更新成功' });
  } catch (error) {
    await connection.rollback();
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 删除生产计划
exports.deleteProductionPlan = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // 检查计划状态
    const [plans] = await connection.query(
      'SELECT status FROM production_plans WHERE id = ?', 
      [id]
    );
    
    if (plans.length === 0) {
      return res.status(404).json({ message: '生产计划不存在' });
    }
    
    if (plans[0].status !== 'draft') {
      return res.status(400).json({ message: '只能删除草稿状态的生产计划' });
    }
    
    // 删除物料需求
    await connection.query('DELETE FROM production_plan_materials WHERE plan_id = ?', [id]);
    
    // 删除生产计划
    await connection.query('DELETE FROM production_plans WHERE id = ?', [id]);
    
    await connection.commit();
    
    res.json({ message: '生产计划删除成功' });
  } catch (error) {
    await connection.rollback();
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 计算物料需求
exports.calculateMaterials = async (req, res) => {
  try {
    const { productId, bomId, quantity } = req.body;
    
    if (!productId || !quantity) {
      return res.status(400).json({ message: '产品ID和数量是必需的' });
    }

    // 先检查BOM是否存在
    const [bomCheck] = await pool.query(`
      SELECT bm.id, bm.product_id, bm.version
      FROM bom_masters bm
      WHERE bm.id = ? AND bm.status = 1
    `, [bomId]);

    if (bomCheck.length === 0) {
      return res.status(404).json({ message: '未找到有效的BOM' });
    }

    // 获取BOM详情
    const [boms] = await pool.query(`
      SELECT 
        bd.material_id,
        bd.quantity,
        m.code,
        m.name,
        u.name as unit,
        COALESCE(s.quantity, 0) as stock_quantity
      FROM bom_details bd
      LEFT JOIN materials m ON bd.material_id = m.id
      LEFT JOIN units u ON m.unit_id = u.id
      LEFT JOIN (
        SELECT 
          material_id,
          SUM(quantity) as quantity
        FROM inventory_stock
        GROUP BY material_id
      ) s ON m.id = s.material_id
      WHERE bd.bom_id = ?
    `, [bomId]);

    if (boms.length === 0) {
      return res.status(404).json({ message: '该BOM没有物料明细' });
    }

    // 计算需求数量和库存状态
    const materials = boms.map(bom => {
      const requiredQuantity = Number(bom.quantity) * Number(quantity);
      const stockQuantity = Number(bom.stock_quantity) || 0;

      return {
        materialId: bom.material_id,
        code: bom.code,
        name: bom.name,
        unit: bom.unit,
        requiredQuantity,
        stockQuantity,
        stockStatus: stockQuantity >= requiredQuantity ? 'sufficient' : 'insufficient'
      };
    });

    res.json(materials);
  } catch (error) {
    console.error('计算物料需求失败:', error);
    handleError(res, error);
  }
};

// 获取生产计划物料清单
exports.getPlanMaterials = async (req, res) => {
  try {
    const { id } = req.params;

    // 查询生产计划物料清单
    const [materials] = await pool.query(`
      SELECT ppm.*, m.code, m.name, u.name as unit
      FROM production_plan_materials ppm
      LEFT JOIN materials m ON ppm.material_id = m.id
      LEFT JOIN units u ON m.unit_id = u.id
      WHERE ppm.plan_id = ?
    `, [id]);

    res.json(materials);
  } catch (error) {
    handleError(res, error);
  }
};

// 辅助函数：计算并插入物料需求
async function calculateAndInsertMaterials(connection, planId, productId, quantity) {
  // 先获取产品最新的活跃BOM主表信息
  const [bomMasters] = await connection.query(`
    SELECT id
    FROM bom_masters
    WHERE product_id = ? AND status = 1
    ORDER BY created_at DESC
    LIMIT 1
  `, [productId]);

  if (bomMasters.length === 0) {
    throw new Error('未找到该产品的有效BOM');
  }

  const bomId = bomMasters[0].id;

  // 获取BOM详情
  const [boms] = await connection.query(`
    SELECT bd.material_id, bd.quantity, bd.unit_id
    FROM bom_details bd
    WHERE bd.bom_id = ?
  `, [bomId]);

  if (boms.length === 0) {
    throw new Error('BOM中没有物料明细');
  }
  
  // 插入物料需求
  for (const bom of boms) {
    const requiredQuantity = bom.quantity * quantity;
    
    // 获取当前库存
    const [stocks] = await connection.query(`
      SELECT COALESCE(SUM(quantity), 0) as stockQuantity
      FROM inventory_stock
      WHERE material_id = ?
    `, [bom.material_id]);
    
    const stockQuantity = stocks[0].stockQuantity || 0;
    
    // 插入物料需求记录
    await connection.query(`
      INSERT INTO production_plan_materials
      (plan_id, material_id, required_quantity, stock_quantity)
      VALUES (?, ?, ?, ?)
    `, [planId, bom.material_id, requiredQuantity, stockQuantity]);
  }
}

// ================ 生产过程相关API ================

// 获取生产过程列表
exports.getProcesses = async (req, res) => {
  try {
    const { taskId, status, page = 1, pageSize = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    if (!taskId) {
      return res.status(400).json({ message: '缺少必要参数: taskId' });
    }
    
    // 验证任务是否存在
    const [taskCheck] = await pool.query(
      'SELECT id FROM production_tasks WHERE id = ?', 
      [taskId]
    );
    
    if (taskCheck.length === 0) {
      // 任务不存在时返回空数组而不是错误
      return res.json({
        items: [],
        total: 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        message: '任务不存在'
      });
    }
    
    let whereClause = 'WHERE pp.task_id = ?';
    const params = [taskId];
    
    if (status) {
      whereClause += ' AND pp.status = ?';
      params.push(status);
    }
    
    // 获取总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM production_processes pp ${whereClause}`, 
      params
    );
    
    // 获取分页数据
    const [processes] = await pool.query(
      `SELECT pp.id, pp.task_id, 
              pp.process_name as processName, 
              pp.sequence, 
              pp.planned_start_time as plannedStartTime, 
              pp.planned_end_time as plannedEndTime, 
              pp.actual_start_time as actualStartTime, 
              pp.actual_end_time as actualEndTime, 
              pp.progress, pp.status, pp.remarks, 
              pp.created_at, pp.updated_at,
              pt.code as task_code 
       FROM production_processes pp
       JOIN production_tasks pt ON pp.task_id = pt.id
       ${whereClause}
       ORDER BY pp.id
       LIMIT ? OFFSET ?`, 
      [...params, parseInt(pageSize), offset]
    );
    
    res.json({
      items: processes,
      total: countResult[0].total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取生产过程列表失败:', error);
    handleError(res, error);
  }
};

// 获取单个生产过程
exports.getProcessById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [processes] = await pool.query(
      `SELECT pp.id, pp.task_id, 
              pp.process_name as processName, 
              pp.sequence, 
              pp.planned_start_time as plannedStartTime, 
              pp.planned_end_time as plannedEndTime, 
              pp.actual_start_time as actualStartTime, 
              pp.actual_end_time as actualEndTime, 
              pp.progress, pp.status, pp.remarks, 
              pp.created_at, pp.updated_at,
              pt.code as task_code 
       FROM production_processes pp
       JOIN production_tasks pt ON pp.task_id = pt.id
       WHERE pp.id = ?`, 
      [id]
    );
    
    if (processes.length === 0) {
      return res.status(404).json({ message: '生产过程不存在' });
    }
    
    res.json(processes[0]);
  } catch (error) {
    handleError(res, error);
  }
};

// 创建生产过程
exports.createProcess = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { 
      taskId, 
      processName, 
      sequenceNumber, 
      plannedStartTime, 
      plannedEndTime, 
      description 
    } = req.body;
    
    // 检查任务是否存在
    const [taskCheck] = await connection.query(
      'SELECT id FROM production_tasks WHERE id = ?', 
      [taskId]
    );
    
    if (taskCheck.length === 0) {
      return res.status(404).json({ message: '生产任务不存在' });
    }
    
    // 插入生产过程
    const [result] = await connection.query(
      `INSERT INTO production_processes 
       (task_id, process_name, sequence, planned_start_time, planned_end_time, remarks, status, progress) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)`, 
      [taskId, processName, sequenceNumber, plannedStartTime, plannedEndTime, description]
    );
    
    await connection.commit();
    
    res.status(201).json({
      id: result.insertId,
      message: '生产过程创建成功'
    });
  } catch (error) {
    await connection.rollback();
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 更新生产过程
exports.updateProcess = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { 
      status, 
      progress, 
      actualStartTime, 
      actualEndTime, 
      remarks 
    } = req.body;
    
    // 检查过程是否存在
    const [processCheck] = await connection.query(
      'SELECT id, status, task_id FROM production_processes WHERE id = ?', 
      [id]
    );
    
    if (processCheck.length === 0) {
      return res.status(404).json({ message: '生产过程不存在' });
    }
    
    // 提取现有的任务ID
    const taskId = processCheck[0].task_id;
    
    // 更新生产过程
    await connection.query(
      `UPDATE production_processes 
       SET status = ?, progress = ?, 
           actual_start_time = ?, actual_end_time = ?, 
           remarks = ?, updated_at = NOW() 
       WHERE id = ?`, 
      [status, progress, actualStartTime, actualEndTime, remarks, id]
    );
    
    // 如果完成了当前过程，检查是否需要更新任务状态
    if (status === 'completed') {
      // 检查是否所有过程都已完成
      const [processesCount] = await connection.query(
        'SELECT COUNT(*) as total FROM production_processes WHERE task_id = ?', 
        [taskId]
      );
      
      const [completedCount] = await connection.query(
        'SELECT COUNT(*) as completed FROM production_processes WHERE task_id = ? AND status = "completed"', 
        [taskId]
      );
      
      if (processesCount[0].total === completedCount[0].completed) {
        // 所有过程都已完成，更新任务状态为已完成
        await connection.query(
          'UPDATE production_tasks SET status = "completed", actual_end_date = NOW() WHERE id = ?', 
          [taskId]
        );
        
        // 检查任务是否关联了生产计划，如果有，更新生产计划状态为检验中
        const [taskInfo] = await connection.query(
          'SELECT plan_id FROM production_tasks WHERE id = ? AND plan_id IS NOT NULL', 
          [taskId]
        );
        
        if (taskInfo.length > 0 && taskInfo[0].plan_id) {
          console.log(`任务ID=${taskId}所有工序已完成，关联的生产计划ID=${taskInfo[0].plan_id}更新为检验中`);
          await connection.query(
            'UPDATE production_plans SET status = "inspection" WHERE id = ?',
            [taskInfo[0].plan_id]
          );
        }
        
        // 自动创建成品检验单
        await createFinalInspection(connection, taskId);
      }
    }
    
    await connection.commit();
    
    res.json({
      message: '生产过程更新成功'
    });
  } catch (error) {
    await connection.rollback();
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 删除生产过程
exports.deleteProcess = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // 检查过程是否存在
    const [processCheck] = await connection.query(
      'SELECT id, status FROM production_processes WHERE id = ?', 
      [id]
    );
    
    if (processCheck.length === 0) {
      return res.status(404).json({ message: '生产过程不存在' });
    }
    
    if (processCheck[0].status !== 'pending') {
      return res.status(400).json({ message: '只能删除未开始的生产过程' });
    }
    
    // 删除生产过程
    await connection.query(
      'DELETE FROM production_processes WHERE id = ?', 
      [id]
    );
    
    await connection.commit();
    
    res.json({
      message: '生产过程删除成功'
    });
  } catch (error) {
    await connection.rollback();
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// ================ 生产报工相关API ================

// 获取生产报工汇总数据
exports.getReportSummary = async (req, res) => {
  try {
    const { startDate, endDate, taskId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: '缺少必要参数: startDate, endDate' });
    }
    
    let whereClause = 'WHERE pr.report_date BETWEEN ? AND ?';
    const params = [startDate, endDate];
    
    if (taskId) {
      whereClause += ' AND pr.task_id = ?';
      params.push(taskId);
    }
    
    // 查询汇总数据
    const [summaryData] = await pool.query(
      `SELECT 
        m.name as productName,
        SUM(pp.quantity) as plannedQuantity,
        SUM(pr.completed_quantity) as actualQuantity,
        CASE 
          WHEN SUM(pp.quantity) > 0 
          THEN SUM(pr.completed_quantity) / SUM(pp.quantity)
          ELSE 0 
        END as completionRate,
        SUM(pr.qualified_quantity) as qualifiedQuantity,
        SUM(pr.completed_quantity - pr.qualified_quantity) as unqualifiedQuantity,
        CASE 
          WHEN SUM(pr.completed_quantity) > 0 
          THEN CONCAT(ROUND(SUM(pr.qualified_quantity) / SUM(pr.completed_quantity) * 100, 2), '%')
          ELSE '0%' 
        END as qualificationRate
       FROM production_reports pr
       JOIN production_processes pp ON pr.process_id = pp.id
       JOIN production_tasks pt ON pr.task_id = pt.id
       JOIN production_plans ppl ON pt.plan_id = ppl.id
       JOIN materials m ON ppl.product_id = m.id
       ${whereClause}
       GROUP BY m.name`,
      params
    );
    
    res.json(summaryData);
  } catch (error) {
    handleError(res, error);
  }
};

// 获取生产报工明细数据
exports.getReportDetail = async (req, res) => {
  try {
    const { startDate, endDate, taskId, page = 1, pageSize = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: '缺少必要参数: startDate, endDate' });
    }
    
    let whereClause = 'WHERE pr.report_date BETWEEN ? AND ?';
    const params = [startDate, endDate];
    
    if (taskId) {
      whereClause += ' AND pr.task_id = ?';
      params.push(taskId);
    }
    
    // 获取总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM production_reports pr ${whereClause}`, 
      params
    );
    
    // 获取分页数据
    const [detailData] = await pool.query(
      `SELECT 
        pr.id,
        pt.code as taskCode,
        m.name as productName,
        pp.process_name as processName,
        pr.report_date as reportDate,
        pp.quantity as plannedQuantity,
        pr.completed_quantity as completedQuantity,
        pr.qualified_quantity as qualifiedQuantity,
        (pr.completed_quantity - pr.qualified_quantity) as unqualifiedQuantity,
        pr.work_hours as workHours,
        pr.reporter,
        pr.remarks
       FROM production_reports pr
       JOIN production_processes pp ON pr.process_id = pp.id
       JOIN production_tasks pt ON pr.task_id = pt.id
       JOIN production_plans ppl ON pt.plan_id = ppl.id
       JOIN materials m ON ppl.product_id = m.id
       ${whereClause}
       ORDER BY pr.report_date DESC, pr.id DESC
       LIMIT ? OFFSET ?`, 
      [...params, parseInt(pageSize), offset]
    );
    
    res.json({
      items: detailData,
      total: countResult[0].total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    handleError(res, error);
  }
};

// 导出生产报工数据
exports.exportReport = async (req, res) => {
  try {
    const { startDate, endDate, taskId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: '缺少必要参数: startDate, endDate' });
    }
    
    let whereClause = 'WHERE pr.report_date BETWEEN ? AND ?';
    const params = [startDate, endDate];
    
    if (taskId) {
      whereClause += ' AND pr.task_id = ?';
      params.push(taskId);
    }
    
    // 查询报工数据
    const [reportData] = await pool.query(
      `SELECT 
        pt.code as taskCode,
        m.name as productName,
        pp.process_name as processName,
        pr.report_date as reportDate,
        pp.quantity as plannedQuantity,
        pr.completed_quantity as completedQuantity,
        pr.qualified_quantity as qualifiedQuantity,
        (pr.completed_quantity - pr.qualified_quantity) as unqualifiedQuantity,
        CASE 
          WHEN pr.completed_quantity > 0 
          THEN CONCAT(ROUND(pr.qualified_quantity / pr.completed_quantity * 100, 2), '%')
          ELSE '0%' 
        END as qualificationRate,
        pr.work_hours as workHours,
        pr.reporter,
        pr.remarks
       FROM production_reports pr
       JOIN production_processes pp ON pr.process_id = pp.id
       JOIN production_tasks pt ON pr.task_id = pt.id
       JOIN production_plans ppl ON pt.plan_id = ppl.id
       JOIN materials m ON ppl.product_id = m.id
       ${whereClause}
       ORDER BY pr.report_date DESC, pr.id DESC`,
      params
    );
    
    // 这里应该调用导出Excel的逻辑，简化起见直接返回数据
    res.json({
      reportData,
      message: '导出成功'
    });
  } catch (error) {
    handleError(res, error);
  }
};

// 获取单个报工记录
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [reports] = await pool.query(
      `SELECT 
        pr.*,
        pt.code as taskCode,
        m.name as productName,
        pp.process_name as processName
       FROM production_reports pr
       JOIN production_processes pp ON pr.process_id = pp.id
       JOIN production_tasks pt ON pr.task_id = pt.id
       JOIN production_plans ppl ON pt.plan_id = ppl.id
       JOIN materials m ON ppl.product_id = m.id
       WHERE pr.id = ?`, 
      [id]
    );
    
    if (reports.length === 0) {
      return res.status(404).json({ message: '报工记录不存在' });
    }
    
    res.json(reports[0]);
  } catch (error) {
    handleError(res, error);
  }
};

// 创建报工记录
exports.createReport = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { processId, quantity, operatorId, operatorName, remarks, date } = req.body;
    
    // 检查工序是否存在
    const [processCheck] = await connection.query(
      'SELECT id, task_id, quantity as process_quantity FROM production_processes WHERE id = ?', 
      [processId]
    );
    
    if (processCheck.length === 0) {
      return res.status(404).json({ message: '生产工序不存在' });
    }
    
    const taskId = processCheck[0].task_id;
    
    // 获取已报工总数量
    const [reportedTotal] = await connection.query(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM production_reports WHERE process_id = ?',
      [processId]
    );
    
    const alreadyReported = reportedTotal[0].total || 0;
    const processTotal = processCheck[0].process_quantity || 0;
    const newTotal = alreadyReported + parseFloat(quantity);
    
    // 计算完成进度百分比
    let progress = Math.min(Math.round((newTotal / processTotal) * 100), 100);
    
    // 确定工序状态
    let processStatus = 'pending';
    if (progress === 0) {
      processStatus = 'pending';
    } else if (progress < 100) {
      processStatus = 'inProgress';
    } else {
      processStatus = 'completed';
    }
    
    // 创建报工记录
    const [result] = await connection.query(`
      INSERT INTO production_reports 
      (process_id, quantity, report_date, operator_id, operator_name, remarks)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [processId, quantity, date || new Date(), operatorId, operatorName, remarks || '']);
    
    // 更新工序进度和状态
    await connection.query(`
      UPDATE production_processes 
      SET progress = ?, status = ?, 
          actual_start_time = COALESCE(actual_start_time, NOW()),
          actual_end_time = CASE WHEN ? = 'completed' THEN NOW() ELSE actual_end_time END
      WHERE id = ?
    `, [progress, processStatus, processStatus, processId]);
    
    // 如果完成了当前过程，检查是否需要更新任务状态
    if (processStatus === 'completed') {
      // 检查是否所有过程都已完成
      const [processesCount] = await connection.query(
        'SELECT COUNT(*) as total FROM production_processes WHERE task_id = ?', 
        [taskId]
      );
      
      const [completedCount] = await connection.query(
        'SELECT COUNT(*) as completed FROM production_processes WHERE task_id = ? AND status = "completed"', 
        [taskId]
      );
      
      if (processesCount[0].total === completedCount[0].completed) {
        // 所有过程都已完成，更新任务状态为已完成
        await connection.query(
          'UPDATE production_tasks SET status = "completed", actual_end_date = NOW() WHERE id = ?', 
          [taskId]
        );
        
        // 检查任务是否关联了生产计划，如果有，更新生产计划状态为检验中
        const [taskInfo] = await connection.query(
          'SELECT plan_id FROM production_tasks WHERE id = ? AND plan_id IS NOT NULL', 
          [taskId]
        );
        
        if (taskInfo.length > 0 && taskInfo[0].plan_id) {
          console.log(`任务ID=${taskId}所有工序已完成，关联的生产计划ID=${taskInfo[0].plan_id}更新为检验中`);
          await connection.query(
            'UPDATE production_plans SET status = "inspection" WHERE id = ?',
            [taskInfo[0].plan_id]
          );
        }
        
        // 自动创建成品检验单
        await createFinalInspection(connection, taskId);
      } else if (completedCount[0].completed > 0) {
        // 有部分过程完成，更新任务状态为进行中
        await connection.query(
          'UPDATE production_tasks SET status = "in_progress" WHERE id = ? AND status = "pending"', 
          [taskId]
        );
        
        // 检查任务是否关联了生产计划，如果有且当前状态不是已完成，则更新为进行中
        const [taskInfo] = await connection.query(
          'SELECT plan_id FROM production_tasks WHERE id = ? AND plan_id IS NOT NULL', 
          [taskId]
        );
        
        if (taskInfo.length > 0 && taskInfo[0].plan_id) {
          console.log(`任务ID=${taskId}部分工序已完成，关联的生产计划ID=${taskInfo[0].plan_id}更新为进行中`);
          await connection.query(
            'UPDATE production_plans SET status = "in_progress" WHERE id = ? AND status != "completed"',
            [taskInfo[0].plan_id]
          );
        }
      }
    }
    
    await connection.commit();
    
    res.status(201).json({
      id: result.insertId,
      message: '报工记录创建成功'
    });
  } catch (error) {
    await connection.rollback();
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 更新报工记录
exports.updateReport = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { quantity, operatorId, operatorName, remarks, date } = req.body;
    
    // 检查报工记录是否存在
    const [reportCheck] = await connection.query(
      'SELECT id, process_id FROM production_reports WHERE id = ?', 
      [id]
    );
    
    if (reportCheck.length === 0) {
      return res.status(404).json({ message: '报工记录不存在' });
    }
    
    const processId = reportCheck[0].process_id;
    
    // 获取工序信息
    const [processInfo] = await connection.query(
      'SELECT id, task_id, quantity FROM production_processes WHERE id = ?', 
      [processId]
    );
    
    if (processInfo.length === 0) {
      return res.status(404).json({ message: '关联的生产工序不存在' });
    }
    
    const taskId = processInfo[0].task_id;
    
    // 更新报工记录
    await connection.query(`
      UPDATE production_reports 
      SET quantity = ?, report_date = ?, operator_id = ?, operator_name = ?, remarks = ?
      WHERE id = ?
    `, [quantity, date, operatorId, operatorName, remarks || '', id]);
    
    // 获取该工序所有报工的总完成数量
    const [totalCompleted] = await connection.query(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM production_reports WHERE process_id = ?', 
      [processId]
    );
    
    const totalReported = totalCompleted[0].total || 0;
    const processTotal = processInfo[0].quantity || 0;
    
    // 计算完成进度百分比
    let progress = Math.min(Math.round((totalReported / processTotal) * 100), 100);
    
    // 确定工序状态
    let processStatus = 'pending';
    if (progress === 0) {
      processStatus = 'pending';
    } else if (progress < 100) {
      processStatus = 'inProgress';
    } else {
      processStatus = 'completed';
    }
    
    // 更新工序进度和状态
    await connection.query(`
      UPDATE production_processes 
      SET progress = ?, status = ?, 
          actual_start_time = COALESCE(actual_start_time, NOW()),
          actual_end_time = CASE WHEN ? = 'completed' THEN NOW() ELSE actual_end_time END
      WHERE id = ?
    `, [progress, processStatus, processStatus, processId]);
    
    // 如果完成了当前过程，检查是否需要更新任务状态
    if (processStatus === 'completed') {
      // 更新实际结束时间
      await connection.query(
        `UPDATE production_processes 
         SET actual_end_time = NOW()
         WHERE id = ? AND actual_end_time IS NULL`, 
        [processId]
      );
      
      // 检查是否所有过程都已完成
      const [processesCount] = await connection.query(
        'SELECT COUNT(*) as total FROM production_processes WHERE task_id = ?', 
        [taskId]
      );
      
      const [completedCount] = await connection.query(
        'SELECT COUNT(*) as completed FROM production_processes WHERE task_id = ? AND status = "completed"', 
        [taskId]
      );
      
      if (processesCount[0].total === completedCount[0].completed) {
        // 所有过程都已完成，更新任务状态为已完成
        await connection.query(
          'UPDATE production_tasks SET status = "completed", actual_end_date = NOW() WHERE id = ?', 
          [taskId]
        );
        
        // 检查任务是否关联了生产计划，如果有，更新生产计划状态为已完成
        const [taskInfo] = await connection.query(
          'SELECT plan_id FROM production_tasks WHERE id = ? AND plan_id IS NOT NULL', 
          [taskId]
        );
        
        if (taskInfo.length > 0 && taskInfo[0].plan_id) {
          console.log(`任务ID=${taskId}所有工序已完成，关联的生产计划ID=${taskInfo[0].plan_id}也更新为已完成`);
          await connection.query(
            'UPDATE production_plans SET status = "completed" WHERE id = ?',
            [taskInfo[0].plan_id]
          );
        }
        
        // 自动创建成品检验单
        await createFinalInspection(connection, taskId);
      }
    }
    
    await connection.commit();
    
    res.json({
      message: '报工记录更新成功'
    });
  } catch (error) {
    await connection.rollback();
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 删除报工记录
exports.deleteReport = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // 检查报工记录是否存在
    const [reportCheck] = await connection.query(
      'SELECT id, process_id FROM production_reports WHERE id = ?', 
      [id]
    );
    
    if (reportCheck.length === 0) {
      return res.status(404).json({ message: '报工记录不存在' });
    }
    
    const processId = reportCheck[0].process_id;
    
    // 获取工序信息
    const [processInfo] = await connection.query(
      'SELECT id, task_id, quantity FROM production_processes WHERE id = ?', 
      [processId]
    );
    
    if (processInfo.length === 0) {
      return res.status(404).json({ message: '关联的生产工序不存在' });
    }
    
    const taskId = processInfo[0].task_id;
    
    // 删除报工记录
    await connection.query('DELETE FROM production_reports WHERE id = ?', [id]);
    
    if (processInfo.length > 0) {
      // 计算该工序所有剩余报工的总完成数量
      const [totalCompleted] = await connection.query(
        'SELECT COALESCE(SUM(completed_quantity), 0) as total FROM production_reports WHERE process_id = ?', 
        [processId]
      );
      
      // 计算新的进度百分比
      let newProgress = 0;
      if (processInfo[0].quantity > 0) {
        newProgress = Math.min(
          Math.round((totalCompleted[0].total / processInfo[0].quantity) * 100), 
          100
        );
      }
      
      // 更新工序进度和状态
      let processStatus = 'pending';
      if (newProgress === 0) {
        processStatus = 'pending';
        // 如果没有进度，清除实际开始时间
        await connection.query(
          `UPDATE production_processes 
           SET progress = ?, status = ?, actual_start_time = NULL, actual_end_time = NULL
           WHERE id = ?`, 
          [newProgress, processStatus, processId]
        );
      } else if (newProgress < 100) {
        processStatus = 'inProgress';
        // 有部分进度，清除实际结束时间
        await connection.query(
          `UPDATE production_processes 
           SET progress = ?, status = ?, actual_end_time = NULL
           WHERE id = ?`, 
          [newProgress, processStatus, processId]
        );
      } else {
        processStatus = 'completed';
        await connection.query(
          `UPDATE production_processes 
           SET progress = ?, status = ?
           WHERE id = ?`, 
          [newProgress, processStatus, processId]
        );
      }
      
      // 更新任务状态
      // 检查是否所有过程都已完成
      const [processesCount] = await connection.query(
        'SELECT COUNT(*) as total FROM production_processes WHERE task_id = ?', 
        [taskId]
      );
      
      const [completedCount] = await connection.query(
        'SELECT COUNT(*) as completed FROM production_processes WHERE task_id = ? AND status = "completed"', 
        [taskId]
      );
      
      const [inProgressCount] = await connection.query(
        'SELECT COUNT(*) as inProgress FROM production_processes WHERE task_id = ? AND status = "inProgress"', 
        [taskId]
      );
      
      // 获取任务的计划ID
      const [taskInfo] = await connection.query(
        'SELECT plan_id FROM production_tasks WHERE id = ?',
        [taskId]
      );
      
      const planId = taskInfo.length > 0 ? taskInfo[0].plan_id : null;
      
      if (processesCount[0].total === completedCount[0].completed) {
        // 所有过程都已完成，更新任务状态为已完成
        await connection.query(
          'UPDATE production_tasks SET status = "completed", actual_end_date = NOW() WHERE id = ?', 
          [taskId]
        );
        
        // 如果有关联的生产计划，将其状态也更新为已完成
        if (planId) {
          console.log(`任务ID=${taskId}所有工序已完成，关联的生产计划ID=${planId}也更新为已完成`);
          await connection.query(
            'UPDATE production_plans SET status = "completed" WHERE id = ?',
            [planId]
          );
        }
      } else if (inProgressCount[0].inProgress > 0 || completedCount[0].completed > 0) {
        // 有部分过程进行中或已完成，确保任务状态为进行中
        await connection.query(
          'UPDATE production_tasks SET status = "in_progress", actual_end_date = NULL WHERE id = ?', 
          [taskId]
        );
        
        // 如果有关联的生产计划且不是已完成状态，则更新为进行中
        if (planId) {
          console.log(`任务ID=${taskId}部分工序进行中或完成，关联的生产计划ID=${planId}更新为进行中`);
          await connection.query(
            'UPDATE production_plans SET status = "in_progress" WHERE id = ? AND status != "completed"',
            [planId]
          );
        }
      } else {
        // 所有过程都未开始，更新任务状态为待处理
        await connection.query(
          'UPDATE production_tasks SET status = "pending", actual_end_date = NULL WHERE id = ?', 
          [taskId]
        );
      }
    }
    
    await connection.commit();
    
    res.json({
      message: '报工记录删除成功'
    });
  } catch (error) {
    await connection.rollback();
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 直接获取产品BOM详情
exports.getBomByProductId = async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少必要参数: productId' 
      });
    }
    
    // 先获取产品最新的活跃BOM主表信息
    const [bomMasters] = await pool.query(`
      SELECT bm.id, bm.product_id, bm.version, bm.status, bm.created_at,
             m.code as product_code, m.name as product_name
      FROM bom_masters bm
      JOIN materials m ON bm.product_id = m.id
      WHERE bm.product_id = ? AND bm.status = 1
      ORDER BY bm.created_at DESC
      LIMIT 1
    `, [productId]);
    
    if (bomMasters.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '未找到该产品的有效BOM' 
      });
    }
    
    const bomMaster = bomMasters[0];
    
    // 获取BOM详情
    const [bomDetails] = await pool.query(`
      SELECT bd.id, bd.bom_id, bd.material_id, bd.quantity, 
             m.code as material_code, m.name as material_name,
             u.name as unit_name, m.specs
      FROM bom_details bd
      JOIN materials m ON bd.material_id = m.id
      LEFT JOIN units u ON m.unit_id = u.id
      WHERE bd.bom_id = ?
      ORDER BY bd.id
    `, [bomMaster.id]);
    
    // 获取库存信息
    const materialIds = bomDetails.map(detail => detail.material_id);
    
    let stockMap = {};
    if (materialIds.length > 0) {
      const [stocks] = await pool.query(`
        SELECT material_id, SUM(quantity) as stock_quantity
        FROM inventory_stock
        WHERE material_id IN (?)
        GROUP BY material_id
      `, [materialIds]);
      
      // 构建物料ID到库存数量的映射
      stockMap = stocks.reduce((map, stock) => {
        map[stock.material_id] = stock.stock_quantity || 0;
        return map;
      }, {});
    }
    
    // 将库存信息添加到BOM详情中
    const detailsWithStock = bomDetails.map(detail => ({
      ...detail,
      stock_quantity: stockMap[detail.material_id] || 0
    }));
    
    // 构建完整的BOM响应对象
    const bom = {
      ...bomMaster,
      details: detailsWithStock
    };
    
    res.json({
      success: true,
      data: bom
    });
  } catch (error) {
    console.error('获取产品BOM详情失败:', error);
    handleError(res, error);
  }
};

// 更新生产任务状态
exports.updateProductionTaskStatus = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`后端收到状态更新请求: 任务ID=${id}, 状态=${status}`);
    
    if (!status) {
      return res.status(400).json({ message: '缺少必要的状态参数' });
    }
    
    // 检查任务是否存在以及是否关联了计划
    const [taskCheck] = await connection.query('SELECT id, status, plan_id, product_id, quantity FROM production_tasks WHERE id = ?', [id]);
    if (taskCheck.length === 0) {
      return res.status(404).json({ message: '生产任务不存在' });
    }
    
    console.log(`当前任务状态: ${taskCheck[0].status}`);
    
    // 获取表结构信息以确定status列的定义
    console.log('尝试查询表结构...');
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM production_tasks WHERE Field = 'status'
    `);
    
    if (columns.length > 0) {
      console.log('状态列定义:', columns[0]);
      if (columns[0].Type && columns[0].Type.toLowerCase().startsWith('enum')) {
        // 如果是枚举类型，提取允许的值
        const enumStr = columns[0].Type;
        const enumValues = enumStr.match(/enum\(([^)]+)\)/i);
        if (enumValues && enumValues[1]) {
          console.log(`状态列是枚举类型，允许的值: ${enumValues[1]}`);
        }
      }
    }
    
    // 直接尝试使用传入的值，观察是否匹配
    let dbStatus = status;
    
    // 如果是已完成状态，同时更新结束日期
    let updateQuery = 'UPDATE production_tasks SET status = ? WHERE id = ?';
    if (dbStatus === 'completed') {
      updateQuery = 'UPDATE production_tasks SET status = ?, actual_end_date = NOW() WHERE id = ?';
    }
    
    console.log(`执行SQL: ${updateQuery.replace('?', `'${dbStatus}'`).replace('?', id)}`);
    
    try {
      await connection.query(updateQuery, [dbStatus, id]);
      
      // 如果任务状态变为已完成，且关联了生产计划，则更新生产计划状态为"检验中"
      if (dbStatus === 'completed' && taskCheck[0].plan_id) {
        console.log(`任务已完成，且关联了计划ID: ${taskCheck[0].plan_id}，更新计划状态为检验中`);
        await connection.query(
          'UPDATE production_plans SET status = "inspection" WHERE id = ?',
          [taskCheck[0].plan_id]
        );
      }
      
      // 如果任务状态变为已完成，自动创建成品检验单
      if (dbStatus === 'completed') {
        await createFinalInspection(connection, id);
      }
      
      await connection.commit();
      console.log('状态更新成功');
      res.json({ message: '任务状态更新成功' });
    } catch (updateError) {
      console.error('状态更新失败:', updateError);
      
      // 如果直接更新失败，尝试从一些常见状态值中匹配
      if (updateError.code === 'WARN_DATA_TRUNCATED') {
        console.log('尝试使用预定义的状态映射...');
        let altStatus;
        
        // 尝试各种可能的状态值映射
        if (status === 'wip' || status === 'inProgress' || status === 'in_progress') {
          // 尝试各种可能的进行中状态表示
          const possibleStatusValues = ['in_progress', 'inprogress', 'processing', 'process', 'doing', 'started', 'start', 'wip', '1'];
          
          for (const possibleStatus of possibleStatusValues) {
            try {
              console.log(`尝试状态值: ${possibleStatus}`);
              await connection.query('UPDATE production_tasks SET status = ? WHERE id = ?', [possibleStatus, id]);
              console.log(`状态值 ${possibleStatus} 更新成功`);
              altStatus = possibleStatus;
              break;
            } catch (err) {
              console.log(`状态值 ${possibleStatus} 更新失败:`, err.message);
            }
          }
        }
        
        if (altStatus) {
          // 如果使用了替代状态，检查是否需要更新相关计划
          if ((altStatus === 'completed' || status === 'completed') && taskCheck[0].plan_id) {
            console.log(`任务已完成（使用替代状态 ${altStatus}），更新关联计划ID: ${taskCheck[0].plan_id} 的状态为检验中`);
            try {
              await connection.query(
                'UPDATE production_plans SET status = "inspection" WHERE id = ?',
                [taskCheck[0].plan_id]
              );
              
              // 如果任务已完成，自动创建成品检验单
              if (altStatus === 'completed' || status === 'completed') {
                await createFinalInspection(connection, id);
              }
            } catch (planUpdateError) {
              console.error('更新计划状态失败:', planUpdateError);
            }
          }
          
          await connection.commit();
          console.log(`使用替代状态 ${altStatus} 更新成功`);
          res.json({ message: '任务状态更新成功' });
        } else {
          throw updateError; // 如果所有尝试都失败，抛出原始错误
        }
      } else {
        throw updateError;
      }
    }
  } catch (error) {
    await connection.rollback();
    console.error('更新任务状态失败:', error);
    handleError(res, error);
  } finally {
    connection.release();
  }
};

// 创建生成成品检验单的辅助函数
async function createFinalInspection(connection, taskId) {
  try {
    console.log(`准备为任务ID=${taskId}创建成品检验单`);
    
    // 获取任务详情
    const [taskInfo] = await connection.query(
      'SELECT id, code, product_id, quantity FROM production_tasks WHERE id = ?', 
      [taskId]
    );
    
    if (taskInfo.length === 0) {
      console.error(`未找到任务信息，任务ID=${taskId}`);
      return false;
    }
    
    const task = taskInfo[0];
    
    // 获取产品信息
    const [productInfo] = await connection.query(
      'SELECT m.id, m.name, m.code, m.specs, u.name as unit FROM materials m LEFT JOIN units u ON m.unit_id = u.id WHERE m.id = ?',
      [task.product_id]
    );
    
    if (productInfo.length === 0) {
      console.error(`未找到产品信息，产品ID=${task.product_id}`);
      return false;
    }
    
    const product = productInfo[0];
    console.log(`获取到产品信息:`, product);
    
    // 尝试获取该产品的默认检验模板
    console.log(`尝试获取产品ID=${product.id}的成品检验模板`);
    const [templates] = await connection.query(`
      SELECT it.id, it.template_name 
      FROM inspection_templates it
      WHERE it.inspection_type = 'final' 
      AND it.material_type = ? 
      AND it.status = 'active'
      LIMIT 1
    `, [product.id]);
    
    let inspectionItems = [];
    
    // 如果有模板，获取模板检验项
    if (templates.length > 0) {
      const templateId = templates[0].id;
      console.log(`找到产品检验模板，ID=${templateId}，获取检验项`);
      
      const [templateItems] = await connection.query(`
        SELECT ii.item_name, ii.standard, ii.type, ii.is_critical
        FROM template_item_mappings tim
        JOIN inspection_items ii ON tim.item_id = ii.id
        WHERE tim.template_id = ?
      `, [templateId]);
      
      if (templateItems.length > 0) {
        inspectionItems = templateItems;
        console.log(`获取到${templateItems.length}个检验项`);
      }
    }
    
    // 如果没有获取到检验项，使用默认检验项
    if (inspectionItems.length === 0) {
      console.log(`未找到检验模板或模板没有检验项，使用默认检验项`);
      inspectionItems = [
        { item_name: '外观检查', standard: '无明显缺陷、划痕、变形', type: 'visual', is_critical: true },
        { item_name: '尺寸检查', standard: '符合图纸要求', type: 'dimension', is_critical: true },
        { item_name: '功能测试', standard: '功能正常', type: 'function', is_critical: true }
      ];
    }
    
    // 生成检验单号
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // 获取当天的序号
    const [rows] = await connection.query(
      `SELECT COUNT(*) as count FROM quality_inspections 
       WHERE inspection_no LIKE ? AND created_at >= CURRENT_DATE()`,
      [`FQC${dateStr}%`]
    );
    
    const sequence = String(rows[0].count + 1).padStart(3, '0');
    const inspectionNo = `FQC${dateStr}${sequence}`;
    
    console.log(`生成的检验单号: ${inspectionNo}`);
    
    // 检查是否已经为该任务创建了检验单
    const [existingCheck] = await connection.query(
      `SELECT id FROM quality_inspections 
       WHERE inspection_type = 'final' AND reference_id = ?`,
      [taskId]
    );
    
    if (existingCheck.length > 0) {
      console.log(`任务ID=${taskId}已存在成品检验单，ID=${existingCheck[0].id}，跳过创建`);
      return true;
    }
    
    // 创建成品检验单
    const [result] = await connection.query(`
      INSERT INTO quality_inspections (
        inspection_no, inspection_type, product_id, reference_id, reference_no,
        batch_no, quantity, unit, product_name, product_code, planned_date, status, note
      ) VALUES (?, 'final', ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'pending', ?)
    `, [
      inspectionNo,
      product.id,
      taskId,
      task.code,
      `批次${dateStr}`,
      task.quantity,
      product.unit || '个',
      product.name,
      product.specs || product.code,
      `任务${task.code}完成后自动生成的成品检验单`
    ]);
    
    const inspectionId = result.insertId;
    
    // 插入检验项
    for (const item of inspectionItems) {
      await connection.query(`
        INSERT INTO quality_inspection_items (
          inspection_id, item_name, standard, type, is_critical
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        inspectionId,
        item.item_name,
        item.standard,
        item.type || 'other',
        item.is_critical ? 1 : 0
      ]);
    }
    
    console.log(`成功创建成品检验单，ID=${inspectionId}，检验单号=${inspectionNo}`);
    return true;
  } catch (error) {
    console.error('创建成品检验单失败:', error);
    return false;
  }
}

// 更新生产计划状态
exports.updateProductionPlanStatus = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { status } = req.body;
    
    // 验证状态值是否有效
    const validStatuses = ['draft', 'preparing', 'material_issued', 'in_progress', 'inspection', 'warehousing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }
    
    // 检查生产计划是否存在
    const [plans] = await connection.query(
      'SELECT id, status FROM production_plans WHERE id = ?', 
      [id]
    );
    
    if (plans.length === 0) {
      return res.status(404).json({ message: '生产计划不存在' });
    }
    
    // 更新生产计划状态
    await connection.query(
      'UPDATE production_plans SET status = ? WHERE id = ?',
      [status, id]
    );
    
    // 如果状态更新为已发料，还需要更新关联的出库单状态
    if (status === 'material_issued') {
      // 查询与该生产计划关联的出库单
      const [outbounds] = await connection.query(
        'SELECT id FROM inventory_outbound WHERE reference_id = ? AND reference_type = "production_plan"',
        [id]
      );
      
      // 更新出库单状态为已完成
      for (const outbound of outbounds) {
        await connection.query(
          'UPDATE inventory_outbound SET status = "completed" WHERE id = ?',
          [outbound.id]
        );
      }
    }
    
    await connection.commit();
    
    res.json({ 
      message: '生产计划状态更新成功',
      status: status
    });
  } catch (error) {
    await connection.rollback();
    handleError(res, error);
  } finally {
    connection.release();
  }
};