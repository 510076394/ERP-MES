# ERP + MES 系统

## 项目概述
基于Vue3 + Node.js的企业资源规划(ERP)和制造执行系统(MES)集成平台。本系统提供完整的生产管理、库存管理、订单管理和财务管理功能，帮助企业实现生产过程的数字化转型。
## 核心功能
- 🔐 用户认证与授权
- 📦 库存管理
- 📋 订单管理
- 🏭 生产计划与执行
- 💰 财务管理
- 📊 数据可视化
- 🔄 实时状态更新

## 技术栈
### 前端技术
- **核心框架**: Vue 3 + Composition API
- **状态管理**: Pinia
- **路由管理**: Vue Router
- **UI组件**: Element Plus
- **构建工具**: Vite
- **HTTP客户端**: Axios

### 后端技术
- **运行环境**: Node.js
- **Web框架**: Express.js
- **数据库**: MySQL
- **ORM**: mysql2
- **缓存**: Redis
- **认证**: JSON Web Tokens (JWT)
- **API文档**: Swagger/OpenAPI

## 系统架构
```
前端(Vue3) <-> API网关(Express) <-> 业务服务 <-> 数据层(MySQL/Redis)
```

## 项目结构
```
.
├── backend/                 # 后端项目
│   ├── src/                 # 源代码目录
│   │   ├── config/          # 配置文件
│   │   ├── controllers/     # 业务控制器
│   │   ├── middleware/      # 中间件
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # API路由
│   │   └── index.js         # 应用入口
│   ├── .env                 # 环境变量配置
│   ├── database/            # 数据库脚本和迁移
│   └── package.json         # 项目依赖
├── frontend/                # 前端项目
│   ├── src/                 # 源代码目录
│   │   ├── assets/          # 静态资源
│   │   ├── components/      # 通用组件
│   │   ├── router/          # 路由配置
│   │   ├── stores/          # Pinia状态管理
│   │   ├── views/           # 页面组件
│   │   ├── App.vue          # 根组件
│   │   └── main.js          # 入口文件
│   ├── .env.development     # 开发环境配置
│   ├── .env.production      # 生产环境配置
│   ├── index.html           # HTML模板
│   └── package.json         # 项目依赖
├── docs/                    # 项目文档
└── README.md                # 项目说明
```

## 功能模块
### 1. 用户认证
- 登录/登出功能
- JWT认证
- 角色权限管理
![Image](https://github.com/user-attachments/assets/2b0ef359-cfed-431b-b707-6f16fd701f1c)

![Image](https://github.com/user-attachments/assets/6e7af484-1c40-40d8-bee2-1fb440058c0f)

### 2. 库存管理
- 库存项CRUD操作
- 库存状态追踪
- 入库/出库管理
- 库存盘点
- 库存预警

![Image](https://github.com/user-attachments/assets/8ac9d827-f68c-4ce4-b054-48637eeb63a9)
![Image](https://github.com/user-attachments/assets/6e1c995c-35b3-4ea3-95fd-b75bca108267)

### 3. 订单管理
- 订单CRUD操作
- 订单状态追踪
- 订单执行流程

![Image](https://github.com/user-attachments/assets/cc068085-427f-4013-93d6-d23989128c13)

![Image](https://github.com/user-attachments/assets/ce005424-b461-460c-89c5-c54a67a046ff)

### 4. 生产管理
- 生产计划CRUD操作
- 生产进度追踪
- 工序管理
- 质量控制

![Image](https://github.com/user-attachments/assets/8c472e56-6ebc-44b0-a48e-b4f31b16ec5e)

![Image](https://github.com/user-attachments/assets/168e5665-789a-4065-b0ed-e34e6d965878)

![Image](https://github.com/user-attachments/assets/8f7880ca-33eb-4bc5-ac73-281e2e566864)

### 5. 销售管理
- 客户管理：客户信息的CRUD操作
- 销售报价：创建和管理销售报价单
- 销售订单：基于报价单创建销售订单
- 销售出库：管理商品出库流程
- 销售退货：处理客户退货请求
- 销售换货：处理客户换货请求

![Image](https://github.com/user-attachments/assets/548280fb-2a4b-4ad0-b7cb-e21feaa670eb)

### 6. 财务管理
- **总账管理 (GL)**: 会计科目管理、会计分录与记账、会计期间管理
- **应收账款 (AR)**: 客户账单生成与跟踪、收款管理、应收账款账龄分析
- **应付账款 (AP)**: 供应商发票管理、付款计划与执行、应付账款账龄分析
- **固定资产管理**: 资产登记与分类、折旧计算、资产处置与转移
- **现金管理**: 银行账户管理、银行交易记录、银行对账、资金调拨

![Image](https://github.com/user-attachments/assets/c5c3d0e0-b508-4cde-a677-115b7efca023)

![Image](https://github.com/user-attachments/assets/1e849dce-d7fc-4989-861a-f59c2f40971d)


## 数据模型
### 销售模块
- customers：客户信息表
- sales_quotations：销售报价单主表
- sales_quotation_items：销售报价单明细表
- sales_orders：销售订单主表
- sales_order_items：销售订单明细表
- sales_outbound：销售出库单主表
- sales_outbound_items：销售出库单明细表
- sales_returns：销售退货单主表
- sales_return_items：销售退货单明细表
- sales_exchanges：销售换货单主表
- sales_exchange_items：销售换货单明细表

### 财务模块
- gl_accounts：会计科目表
- gl_entries：会计分录表
- gl_entry_items：会计分录明细表
- gl_periods：会计期间表
- ar_invoices：应收账款发票表
- ar_receipts：应收账款收款表
- ar_receipt_items：应收账款收款明细表
- ap_invoices：应付账款发票表
- ap_payments：应付账款付款表
- ap_payment_items：应付账款付款明细表
- fixed_assets：固定资产表
- asset_depreciation：固定资产折旧表
- bank_accounts：银行账户表
- bank_transactions：银行交易表

## API路由
### 销售模块
- /api/sales/customers - 客户管理
- /api/sales/quotations - 销售报价
- /api/sales/orders - 销售订单
- /api/sales/outbound - 销售出库
- /api/sales/returns - 销售退货
- /api/sales/exchanges - 销售换货

### 财务模块
- /api/finance/accounts - 会计科目管理
- /api/finance/entries - 会计分录管理
- /api/finance/periods - 会计期间管理
- /api/finance/ar/invoices - 应收账款发票管理
- /api/finance/ar/receipts - 收款管理
- /api/finance/ap/invoices - 应付账款发票管理
- /api/finance/ap/payments - 付款管理
- /api/finance/assets - 固定资产管理
- /api/finance/bank-accounts - 银行账户管理

## 数据库配置
### MySQL配置
- 主机：0.0.0.0
- 端口：3306
- 用户名：root
- 密码：MySQL
- 数据库名：mes

### Redis配置
- 主机：0.0.0.0
- 端口：6379
- 密码：redis

## 环境要求
1. Node.js (v16+)
2. MySQL 5.7+
3. Redis 6+
4. npm 7+ 或 yarn 1.22+

## 快速开始

### 1. 环境准备
确保已安装所需的所有依赖：
- Node.js
- MySQL
- Redis
- npm 或 yarn

### 2. 安装项目依赖
```bash
# 前端依赖安装
cd frontend
npm install

# 后端依赖安装
cd backend
npm install
```

### 3. 配置环境变量
在backend目录下创建.env文件（已预配置）：
```env
PORT=8080
JWT_SECRET=your_jwt_secret_key_change_this_in_production
NODE_ENV=development

# MySQL配置
DB_HOST=0.0.0.0
DB_PORT=3306
DB_USER=root
DB_PASSWORD=MySQL
DB_NAME=mes

# Redis配置
REDIS_HOST=0.0.0.0
REDIS_PORT=6379
REDIS_PASSWORD=redis
```

### 4. 运行项目
```bash
# 启动后端服务（默认端口8080）
cd backend
npm run dev

# 启动前端开发服务器（默认端口3000）
cd frontend
npm run dev
```

## 默认账户
系统初始化时会自动创建一个管理员账户：
- 用户名：admin
- 密码：123456

## 部署指南

### 开发环境
```bash
# 前端开发服务器
cd frontend
npm run dev

# 后端开发服务器
cd backend
npm run dev
```

### 生产环境
#### 1. 前端部署
构建前端：
```bash
cd frontend
npm run build
```
将生成的dist目录内容部署到Web服务器（如Nginx）中。

Nginx参考配置：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 2. 后端部署
使用PM2进行进程管理：
```bash
cd backend
npm install -g pm2
pm2 start src/index.js --name erp-backend

# 添加开机自启动
pm2 startup
pm2 save
```

#### 3. 数据库备份
设置定时备份MySQL数据库：
```bash
# 创建备份脚本
echo '#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mysqldump -h 0.0.0.0 -u root -pmysql mes > /path/to/backups/mes_$TIMESTAMP.sql
find /path/to/backups -name "mes_*.sql" -type f -mtime +7 -delete' > /usr/local/bin/backup_erp_db.sh

# 添加执行权限
chmod +x /usr/local/bin/backup_erp_db.sh

# 添加到crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup_erp_db.sh") | crontab -
```

## 系统初始化
系统首次部署后，需要初始化数据库和基础数据。

### 初始化数据库结构
```bash
cd backend
node database/create-system-tables.js
```

### 初始化财务模块
```bash
cd backend
node init-finance-module.js
```

## 访问地址
- 开发环境前端：http://localhost:3000
- 开发环境后端API：http://localhost:8080
- 生产环境：根据您的域名配置

## 注意事项
1. 确保MySQL和Redis服务正常运行
2. 系统首次启动时会自动初始化数据库表结构
3. 生产环境部署时请修改JWT密钥和数据库密码
4. 建议使用PM2或Docker进行生产环境部署
5. 定期备份数据库数据
6. 定期检查系统日志

## 开发规范
1. 使用ESLint进行代码规范检查
2. 遵循Vue3组件命名规范
3. 使用Composition API编写组件
4. 遵循RESTful API设计规范
5. 保持代码注释完整性

## 贡献指南
1. Fork本仓库
2. 创建特性分支
3. 提交更改
4. 发起Pull Request

## 更新日志
### 版本1.0.0（2025-05-12）
- 完成ERP+MES系统基础框架
- 实现用户认证、库存管理、订单管理、生产管理、销售管理和财务管理等核心功能
- 优化系统性能和用户体验
- 修复已知Bug，提高系统稳定性

## 许可证
MIT License

## 联系方式
- 邮箱：510076394@qq.com
- 技术支持：510076394
