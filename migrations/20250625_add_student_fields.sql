-- 增加学生信息字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id VARCHAR(32) UNIQUE;
-- student_id 作为学号和登录依据，管理员可为空
