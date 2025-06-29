-- （可选）添加外键约束脚本

-- 1. 添加学分申请表的外键约束
ALTER TABLE credits 
ADD CONSTRAINT fk_credits_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. 添加学分证明材料表的外键约束
ALTER TABLE credits_proofs 
ADD CONSTRAINT fk_credits_proofs_credit_id 
FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE CASCADE;

-- 3. 添加班级表的外键约束
ALTER TABLE classes 
ADD CONSTRAINT fk_classes_grade_id 
FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE SET NULL;

ALTER TABLE classes 
ADD CONSTRAINT fk_classes_major_id 
FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE SET NULL;

-- 4. 添加检查约束
ALTER TABLE credits 
ADD CONSTRAINT chk_credits_status 
CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE credits 
ADD CONSTRAINT chk_credits_type 
CHECK (type IN ('个人活动', '个人比赛', '个人证书', '志愿活动'));

ALTER TABLE users 
ADD CONSTRAINT chk_users_role 
CHECK (role IN ('admin', 'student', 'monitor', 'league_secretary', 'study_committee'));

-- 5. 添加默认值约束
ALTER TABLE credits 
ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE users 
ALTER COLUMN role SET DEFAULT 'student';

-- 6. 添加非空约束（如果需要）
-- ALTER TABLE users ALTER COLUMN name SET NOT NULL;
-- ALTER TABLE users ALTER COLUMN student_id SET NOT NULL;

-- 7. 创建有用的视图
CREATE OR REPLACE VIEW credit_details AS
SELECT 
    c.id,
    c.user_id,
    u.username,
    u.name as user_name,
    u.student_id,
    u.role as user_role,
    u.grade,
    u.major,
    u.class,
    c.type,
    c.score,
    c.status,
    c.reject_reason,
    c.description,
    c.created_at,
    COUNT(cp.id) as proof_count
FROM credits c
JOIN users u ON c.user_id = u.id
LEFT JOIN credits_proofs cp ON c.id = cp.credit_id
GROUP BY c.id, u.id;

-- 8. 创建统计视图
CREATE OR REPLACE VIEW credit_stats AS
SELECT 
    type,
    status,
    COUNT(*) as count,
    AVG(score) as avg_score,
    MIN(created_at) as first_application,
    MAX(created_at) as last_application
FROM credits
GROUP BY type, status;

-- 9. 创建用户统计视图
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    role,
    COUNT(*) as count,
    COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as has_grade_count,
    COUNT(CASE WHEN major IS NOT NULL THEN 1 END) as has_major_count,
    COUNT(CASE WHEN class IS NOT NULL THEN 1 END) as has_class_count
FROM users
GROUP BY role; 