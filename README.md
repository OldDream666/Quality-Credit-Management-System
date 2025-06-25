# 学生素质学分管理系统

一个基于 Next.js + TypeScript + PostgreSQL 的现代化学生素质学分管理系统，支持学分申请、审批、用户管理等功能。

## ✨ 功能特性

### 🎯 核心功能
- **用户认证系统**: JWT认证，支持用户名/学号登录
- **学分申请管理**: 多类型申请（个人活动、比赛、证书），自动分数计算
- **审批流程**: 班委审批，支持通过/驳回，驳回原因记录
- **文件管理**: 多文件上传，支持图片和PDF格式
- **用户管理**: 管理员可管理用户，支持批量导入
- **公告系统**: 系统公告发布和管理
- **数据统计**: 实时统计和可视化展示

### 🔐 权限系统
- **管理员(admin)**: 全局管理权限
- **班长(monitor)**: 审批权限
- **团支书(league_secretary)**: 审批权限  
- **学习委员(study_committee)**: 审批权限
- **学生(student)**: 申请学分，查看个人状态

### 🎨 技术特性
- **现代化UI**: Tailwind CSS + 响应式设计
- **类型安全**: 完整的TypeScript类型定义
- **性能优化**: 数据库索引、API缓存、代码分割
- **安全性**: 文件类型验证、大小限制、SQL注入防护
- **可维护性**: 组件化架构、统一API客户端、自定义Hook

## 🚀 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 12+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd student
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp env.example .env.local
```
编辑 `.env.local` 文件，配置数据库连接等信息。

4. **数据库设置**
```bash
# 创建数据库
createdb student_credits

# 运行迁移文件（按顺序执行）
psql -d student_credits -f migrations/20250625_add_student_fields.sql
psql -d student_credits -f migrations/20250625_add_credits_proofs.sql
psql -d student_credits -f migrations/20250625_add_proof_file.sql
psql -d student_credits -f migrations/20250625_add_reject_reason.sql
psql -d student_credits -f migrations/20250625_add_can_approve.sql
psql -d student_credits -f migrations/20250626_add_class_fields.sql
psql -d student_credits -f migrations/20250626_update_roles_and_approval.sql
psql -d student_credits -f migrations/20250627_optimize_database.sql
```

5. **启动开发服务器**
```bash
npm run dev
```

6. **访问应用**
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 📁 项目结构

```
student/
├── migrations/           # 数据库迁移文件
├── public/              # 静态资源
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── api/         # API路由
│   │   ├── admin/       # 管理员页面
│   │   ├── credits/     # 学分申请页面
│   │   ├── dashboard/   # 仪表盘
│   │   └── login/       # 登录页面
│   ├── components/      # React组件
│   │   ├── ui/          # 通用UI组件
│   │   └── Navbar.tsx   # 导航栏
│   ├── hooks/           # 自定义Hook
│   ├── lib/             # 工具库
│   │   ├── api.ts       # API客户端
│   │   ├── db.ts        # 数据库连接
│   │   ├── jwt.ts       # JWT工具
│   │   ├── auth.ts      # 权限控制
│   │   ├── validation.ts # 输入验证
│   │   ├── csrf.ts      # CSRF防护
│   │   └── utils.ts     # 通用工具函数
│   └── types/           # TypeScript类型定义
├── middleware.ts        # Next.js中间件
├── next.config.ts       # Next.js配置
├── tailwind.config.js   # Tailwind CSS配置
├── SECURITY.md          # 安全配置文档
└── package.json         # 项目依赖
```

## 🔧 配置说明

### 环境变量

| 变量名                  | 说明                   | 示例值                        |
|-------------------------|------------------------|-------------------------------|
| PGUSER                  | 数据库用户名           | postgres                      |
| PGPASSWORD              | 数据库密码             | your_password                 |
| PGHOST                  | 数据库主机             | localhost                     |
| PGDATABASE              | 数据库名               | student_credits               |
| PGPORT                  | 数据库端口             | 5432                          |
| JWT_SECRET              | JWT密钥                | your_jwt_secret               |
| NODE_ENV                | 运行环境               | development/production        |
| NEXT_PUBLIC_APP_NAME    | 应用名称               | 学生素质学分管理系统          |
| NEXT_PUBLIC_APP_VERSION | 应用版本               | 1.0.0                         |
| MAX_FILE_SIZE           | 上传文件最大字节数     | 10485760                      |
| ALLOWED_FILE_TYPES      | 允许的文件类型         | image/jpeg,application/pdf     |
| CORS_ORIGIN             | 允许的前端地址         | http://localhost:3000         |

> 请根据实际部署环境填写 `.env` 文件，敏感信息切勿上传到仓库。

### 数据库表结构

#### users表
- `id`: 主键
- `username`: 用户名（唯一）
- `password`: 加密密码
- `name`: 真实姓名
- `student_id`: 学号（唯一）
- `role`: 角色
- `grade`: 年级
- `major`: 专业
- `class`: 班级
- `created_at`: 创建时间

#### credits表
- `id`: 主键
- `user_id`: 用户ID（外键）
- `type`: 申请类型
- `score`: 分数
- `status`: 状态
- `reject_reason`: 驳回原因
- `created_at`: 创建时间

#### credits_proofs表
- `id`: 主键
- `credit_id`: 学分申请ID（外键）
- `file`: 文件二进制数据
- `filename`: 文件名
- `mimetype`: 文件类型
- `created_at`: 创建时间

## 🔒 安全特性

### 已实施的安全措施

- ✅ **输入验证**: 完整的服务器端输入验证，防止恶意输入
- ✅ **权限控制**: 基于角色的访问控制 (RBAC)，细粒度权限管理
- ✅ **认证安全**: JWT token 认证，减少敏感信息泄露风险
- ✅ **文件安全**: 严格的文件类型和大小限制，防止恶意文件上传
- ✅ **CSRF防护**: CSRF token 机制，防止跨站请求伪造
- ✅ **错误处理**: 安全的错误信息处理，避免信息泄露
- ✅ **数据保护**: 密码加密存储，参数化查询防止SQL注入

### 安全最佳实践

1. **开发环境**
   - 使用环境变量管理敏感配置
   - 定期更新依赖包
   - 代码审查时关注安全问题
   - 使用TypeScript进行类型安全开发

2. **生产环境**
   - 启用HTTPS
   - 设置安全的HTTP头
   - 配置CORS策略
   - 定期备份数据
   - 监控系统日志

3. **用户管理**
   - 强密码策略
   - 账户锁定机制
   - 会话超时设置
   - 多因素认证（可选）

详细的安全配置请参考 [SECURITY.md](./SECURITY.md)

## 🛠️ 开发指南

### 添加新功能

1. **创建类型定义** (`src/types/index.ts`)
2. **添加API路由** (`src/app/api/`)
3. **创建自定义Hook** (`src/hooks/`)
4. **开发UI组件** (`src/components/`)
5. **编写页面** (`src/app/`)

### 代码规范

- 使用TypeScript进行类型检查
- 遵循ESLint规则
- 使用Prettier格式化代码
- 组件使用函数式组件 + Hooks
- API使用统一的错误处理

### 数据库迁移

创建新的迁移文件：
```sql
-- migrations/YYYYMMDD_description.sql
-- 添加你的SQL语句
```

## 🚀 部署

### 生产环境部署

1. **构建项目**
```bash
npm run build
```

2. **启动生产服务器**
```bash
npm start
```

### Docker部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
```

## 📝 API 文档

### 认证相关

#### 登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

#### 获取用户信息
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### 学分相关

#### 提交学分申请
```http
POST /api/credits
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "type": "个人活动|个人比赛|个人证书|志愿活动",
  "activityName": "string",
  "proof": File[]
}
```

#### 获取学分申请列表
```http
GET /api/credits
Authorization: Bearer <token>
```

### 管理员相关

#### 获取所有用户
```http
GET /api/users
Authorization: Bearer <token>
```

#### 获取所有学分申请
```http
GET /api/credits/admin
Authorization: Bearer <token>
```

## 🐛 故障排除

### 常见问题·

1. **数据库连接失败**
   - 检查数据库服务是否启动
   - 验证连接字符串是否正确
   - 确认数据库用户权限

2. **文件上传失败**
   - 检查文件大小限制
   - 验证文件类型是否允许
   - 确认存储目录权限

3. **权限验证失败**
   - 检查 JWT token 是否有效
   - 确认用户角色配置
   - 验证 API 路由权限设置

### 日志查看

- 开发环境：控制台输出
- 生产环境：查看应用日志文件

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 邮箱：support@example.com
- 问题反馈：[GitHub Issues](https://github.com/your-repo/issues)

## 📋 更新日志

### v1.0.0 (2024-01-XX)
- 初始版本发布
- 基础功能实现
- 安全措施完善
- 权限控制系统
- 文件上传功能
