-- 数据库优化迁移
-- 1. 为常用查询字段添加索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- 2. 为学分申请表添加索引
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_status ON credits(status);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_type ON credits(type);

-- 3. 为证明材料表添加索引
CREATE INDEX IF NOT EXISTS idx_credits_proofs_credit_id ON credits_proofs(credit_id);
CREATE INDEX IF NOT EXISTS idx_credits_proofs_created_at ON credits_proofs(created_at DESC);

-- 4. 为公告表添加索引
CREATE INDEX IF NOT EXISTS idx_notices_created_at ON notices(created_at DESC);

-- 5. 添加外键约束（如果不存在）
ALTER TABLE credits ADD CONSTRAINT IF NOT EXISTS fk_credits_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE credits_proofs ADD CONSTRAINT IF NOT EXISTS fk_credits_proofs_credit_id 
    FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE CASCADE;

-- 6. 添加检查约束
ALTER TABLE credits ADD CONSTRAINT IF NOT EXISTS check_credits_score 
    CHECK (score IN (1, 3, 5));

ALTER TABLE credits ADD CONSTRAINT IF NOT EXISTS check_credits_status 
    CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE credits ADD CONSTRAINT IF NOT EXISTS check_credits_type 
    CHECK (type IN ('个人活动', '比赛', '证书'));

-- 7. 优化字段类型和长度
ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(50);
ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(50);
ALTER TABLE users ALTER COLUMN student_id TYPE VARCHAR(32);
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20);

-- 8. 添加唯一约束
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS unique_username UNIQUE (username);
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS unique_student_id UNIQUE (student_id) WHERE student_id IS NOT NULL; 