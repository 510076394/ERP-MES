/**
 * 生成各种业务编号的工具函数
 */

/**
 * 生成业务编号
 * @param {string} prefix 编号前缀
 * @returns {string} 生成的编号
 */
const generateCode = (prefix) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

/**
 * 生成日期格式的编号
 * @param {string} prefix 编号前缀
 * @returns {string} 生成的编号
 */
const generateDateCode = (prefix) => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${year}${month}${day}${random}`;
};

/**
 * 生成序列号
 * @param {string} prefix 编号前缀
 * @param {number} length 序列号长度
 * @returns {string} 生成的序列号
 */
const generateSerialNumber = (prefix, length = 6) => {
  const random = Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
  return `${prefix}${random}`;
};

/**
 * 为检验模板生成编号 IT+YYMMDD+序号(001递增)
 * @param {string} prefix 编号前缀，通常是IT
 * @param {object} db 数据库实例，用于查询最新序号
 * @returns {string} 生成的编号
 */
const generateTemplateCode = async (prefix, db) => {
  // 获取当前日期
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateCode = `${year}${month}${day}`;
  
  // 构建前缀部分
  const codePrefix = `${prefix}${dateCode}`;
  
  try {
    // 查找当天最大的序号
    const latestTemplate = await db.InspectionTemplate.findOne({
      where: {
        template_code: {
          [db.Sequelize.Op.like]: `${codePrefix}%`
        }
      },
      order: [['template_code', 'DESC']]
    });

    let sequenceNumber = 1;
    
    // 如果找到了当天的模板，则获取序号并+1
    if (latestTemplate) {
      const latestCode = latestTemplate.template_code;
      // 提取序号部分（最后3位）并转为数字
      const latestSequence = parseInt(latestCode.slice(-3), 10);
      sequenceNumber = latestSequence + 1;
    }
    
    // 格式化序号为3位，例如：001, 002, ...
    const formattedSequence = sequenceNumber.toString().padStart(3, '0');
    
    // 返回完整编号
    return `${codePrefix}${formattedSequence}`;
  } catch (error) {
    console.error('生成模板编号失败:', error);
    // 如果查询失败，回退到使用随机数
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${codePrefix}${random}`;
  }
};

module.exports = {
  generateCode,
  generateDateCode,
  generateSerialNumber,
  generateTemplateCode
}; 