# 学生学分管理系统 - 实际数据库结构文档

## 🗄️ 数据库表结构

### 1. 用户管理相关表

#### `users` - 用户表
```sql
CREATE TABLE users (
    id integer(32) DEFAULT nextval('users_id_seq'::regclass) NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(100) NOT NULL,
    role character varying(20) DEFAULT 'student'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    name character varying(50),
    student_id character varying(32),
    grade character varying(16),
    major character varying(64),
    class character varying(32),
    PRIMARY KEY (id),
    UNIQUE (username),
    UNIQUE (student_id)
);
```

**字段说明：**
- `id`: 用户唯一标识符（自增）
- `username`: 用户名（唯一）
- `password`: 密码（加密存储）
- `role`: 用户角色（admin/student/monitor/league_secretary/study_committee）
- `name`: 真实姓名
- `student_id`: 学号（唯一）
- `grade`: 年级
- `major`: 专业
- `class`: 班级
- `created_at`: 创建时间

**索引：**
- `idx_users_username` (username)
- `idx_users_student_id` (student_id)
- `idx_users_role` (role)
- `idx_users_created_at` (created_at DESC)

#### `login_attempts` - 登录尝试记录表
```sql
CREATE TABLE login_attempts (
    username character varying(100) NOT NULL,
    count integer(32) DEFAULT 0 NOT NULL,
    last_attempt timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (username)
);
```

**用途：** 防暴力破解，记录登录失败次数和时间

### 2. 学分管理相关表

#### `credits` - 学分申请表
```sql
CREATE TABLE credits (
    id integer(32) DEFAULT nextval('credits_id_seq'::regclass) NOT NULL,
    user_id integer(32) NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    score numeric(4,2),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reject_reason character varying(255),
    PRIMARY KEY (id)
);
```

**字段说明：**
- `id`: 申请唯一标识符
- `user_id`: 申请人ID（关联users表）
- `type`: 申请类型（个人活动/个人比赛/个人证书/志愿活动）
- `description`: 申请描述（JSON格式存储详细信息）
- `score`: 获得的学分
- `status`: 申请状态（pending/approved/rejected）
- `reject_reason`: 拒绝原因

**索引：**
- `idx_credits_user_id` (user_id)
- `idx_credits_type` (type)
- `idx_credits_status` (status)
- `idx_credits_created_at` (created_at DESC)

#### `credits_proofs` - 学分证明材料表
```sql
CREATE TABLE credits_proofs (
    id integer(32) DEFAULT nextval('credits_proofs_id_seq'::regclass) NOT NULL,
    credit_id integer(32),
    file bytea NOT NULL,
    filename character varying(255) NOT NULL,
    mimetype character varying(128) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

**字段说明：**
- `id`: 证明材料唯一标识符
- `credit_id`: 关联的学分申请ID
- `file`: 文件内容（二进制存储）
- `filename`: 文件名
- `mimetype`: 文件类型

**索引：**
- `idx_credits_proofs_credit_id` (credit_id)
- `idx_credits_proofs_created_at` (created_at DESC)

### 3. 公告管理表

#### `notices` - 公告表
```sql
CREATE TABLE notices (
    id integer(32) DEFAULT nextval('notices_id_seq'::regclass) NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

**索引：**
- `idx_notices_created_at` (created_at DESC)

### 4. 组织架构相关表

#### `grades` - 年级表
```sql
CREATE TABLE grades (
    id integer(32) DEFAULT nextval('grades_id_seq'::regclass) NOT NULL,
    name character varying(32) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (name)
);
```

#### `majors` - 专业表
```sql
CREATE TABLE majors (
    id integer(32) DEFAULT nextval('majors_id_seq'::regclass) NOT NULL,
    name character varying(64) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (name)
);
```

#### `classes` - 班级表
```sql
CREATE TABLE classes (
    id integer(32) DEFAULT nextval('classes_id_seq'::regclass) NOT NULL,
    name character varying(32) NOT NULL,
    grade_id integer(32),
    major_id integer(32),
    PRIMARY KEY (id),
    UNIQUE (name),
    UNIQUE (grade_id),
    UNIQUE (major_id)
);
```

**复合唯一索引：**
- `classes_name_grade_id_major_id_key` (name, grade_id, major_id)

## 🔗 表关系图

```
users (1) ←→ (N) credits (1) ←→ (N) credits_proofs
  ↓
login_attempts

grades (1) ←→ (N) classes
  ↑
majors (1) ←→ (N) classes

notices (独立表)
```

## 📊 数据统计

- **总表数**: 8个
- **总索引数**: 16个
- **总序列数**: 7个
- **触发器数**: 0个
- **视图数**: 0个

## 🛠️ 建议的改进

### 1. 添加外键约束
```sql
-- 学分申请 → 用户
ALTER TABLE credits 
ADD CONSTRAINT fk_credits_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 证明材料 → 学分申请
ALTER TABLE credits_proofs 
ADD CONSTRAINT fk_credits_proofs_credit_id 
FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE CASCADE;

-- 班级 → 年级/专业
ALTER TABLE classes 
ADD CONSTRAINT fk_classes_grade_id 
FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE SET NULL;

ALTER TABLE classes 
ADD CONSTRAINT fk_classes_major_id 
FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE SET NULL;
```

### 2. 添加检查约束
```sql
-- 学分申请状态检查
ALTER TABLE credits 
ADD CONSTRAINT chk_credits_status 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- 学分申请类型检查
ALTER TABLE credits 
ADD CONSTRAINT chk_credits_type 
CHECK (type IN ('个人活动', '个人比赛', '个人证书', '志愿活动'));

-- 用户角色检查
ALTER TABLE users 
ADD CONSTRAINT chk_users_role 
CHECK (role IN ('admin', 'student', 'monitor', 'league_secretary', 'study_committee'));
```

### 3. 创建有用的视图
```sql
-- 学分申请详情视图
CREATE OR REPLACE VIEW credit_details AS
SELECT 
    c.id, c.user_id, u.username, u.name as user_name,
    u.student_id, u.role as user_role, u.grade, u.major, u.class,
    c.type, c.score, c.status, c.reject_reason, c.description,
    c.created_at, COUNT(cp.id) as proof_count
FROM credits c
JOIN users u ON c.user_id = u.id
LEFT JOIN credits_proofs cp ON c.id = cp.credit_id
GROUP BY c.id, u.id;

-- 统计视图
CREATE OR REPLACE VIEW credit_stats AS
SELECT type, status, COUNT(*) as count, AVG(score) as avg_score
FROM credits GROUP BY type, status;
```

## 🔒 安全考虑

1. **密码安全**: 使用 bcrypt 加密存储密码
2. **登录保护**: 通过 `login_attempts` 表防止暴力破解
3. **文件上传**: 限制文件类型和大小
4. **权限控制**: 基于角色的访问控制

## 📈 性能优化

1. **索引策略**: 为常用查询字段创建索引
2. **分区表**: 对于大量数据的表可考虑分区
3. **定期维护**: 定期清理过期数据和更新统计信息

## 🚀 部署建议

1. **备份策略**: 定期备份数据库结构和数据
2. **监控**: 监控数据库性能和连接数
3. **扩展**: 根据业务增长考虑读写分离

## 📝 版本历史

- **v1.0**: 初始数据库结构
- **v1.1**: 添加索引优化
- **v1.2**: 添加组织架构表（grades, majors, classes）

---

*最后更新: 2025-06-29*
*基于实际数据库结构导出* 