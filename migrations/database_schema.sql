-- 表结构定义
-- ------------------------------
-- 1. 业务表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, -- 用户ID，自增主键
    username character varying(50) NOT NULL, -- 用户名
    password character varying(100) NOT NULL, -- 密码
    role character varying(20) DEFAULT 'student'::character varying NOT NULL, -- 角色
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP, -- 注册时间
    name character varying(50), -- 姓名
    student_id character varying(32), -- 学号
    grade character varying(16), -- 年级
    major character varying(64), -- 专业
    class character varying(32), -- 班级
    UNIQUE (username),
    UNIQUE (student_id)
);

CREATE TABLE IF NOT EXISTS grades (
    id SERIAL PRIMARY KEY, -- 年级ID，自增主键
    name character varying(32) NOT NULL, -- 年级名称
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS majors (
    id SERIAL PRIMARY KEY, -- 专业ID，自增主键
    name character varying(64) NOT NULL, -- 专业名称
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY, -- 班级ID，自增主键
    name character varying(32) NOT NULL, -- 班级名称
    grade_id integer, -- 年级ID
    major_id integer, -- 专业ID
    UNIQUE (name, grade_id, major_id)
);

CREATE TABLE IF NOT EXISTS notices (
    id SERIAL PRIMARY KEY, -- 公告ID，自增主键
    title character varying(200) NOT NULL, -- 标题
    content text NOT NULL, -- 内容
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP -- 发布时间
);

CREATE TABLE IF NOT EXISTS login_attempts (
    username character varying(100) NOT NULL, -- 用户名
    count integer DEFAULT 0 NOT NULL, -- 尝试次数
    last_attempt timestamp with time zone DEFAULT now() NOT NULL, -- 最后尝试时间
    PRIMARY KEY (username)
);

CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL, -- 'role', 'credit_type', 'status', 'permission'
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT NOT NULL, -- JSON格式存储配置
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, config_key)
);

CREATE TABLE IF NOT EXISTS credits (
    id SERIAL PRIMARY KEY, -- 学分申请ID，自增主键
    user_id integer NOT NULL, -- 申请人ID
    type character varying(50) NOT NULL, -- 学分类型
    description text, -- 申请描述
    score numeric(6,2), -- 分数
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL, -- 状态
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    reject_reason character varying(255), -- 驳回原因
    approver_id integer, -- 审批人ID
    approved_at timestamp without time zone -- 审批时间
);

CREATE TABLE IF NOT EXISTS credits_proofs (
    id SERIAL PRIMARY KEY, -- 证明材料ID，自增主键
    credit_id integer, -- 学分申请ID
    file bytea NOT NULL, -- 文件内容
    filename character varying(255) NOT NULL, -- 文件名
    mimetype character varying(128) NOT NULL, -- 文件类型
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP -- 上传时间
);

-- 索引定义
-- ------------------------------
CREATE UNIQUE INDEX classes_name_grade_id_major_id_key ON public.classes USING btree (name, grade_id, major_id);
CREATE INDEX idx_credits_created_at ON public.credits USING btree (created_at DESC);
CREATE INDEX idx_credits_status ON public.credits USING btree (status);
CREATE INDEX idx_credits_type ON public.credits USING btree (type);
CREATE INDEX idx_credits_user_id ON public.credits USING btree (user_id);
CREATE INDEX idx_credits_proofs_created_at ON public.credits_proofs USING btree (created_at DESC);
CREATE INDEX idx_credits_proofs_credit_id ON public.credits_proofs USING btree (credit_id);
CREATE INDEX idx_login_attempts_last_attempt ON public.login_attempts USING btree (last_attempt);
CREATE INDEX idx_notices_created_at ON public.notices USING btree (created_at DESC);
CREATE INDEX idx_users_created_at ON public.users USING btree (created_at DESC);
CREATE INDEX idx_users_role ON public.users USING btree (role);
CREATE INDEX idx_users_student_id ON public.users USING btree (student_id);
CREATE INDEX idx_users_username ON public.users USING btree (username);

-- 序列定义
-- ------------------------------
CREATE SEQUENCE IF NOT EXISTS classes_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;
CREATE SEQUENCE IF NOT EXISTS credits_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;
CREATE SEQUENCE IF NOT EXISTS credits_proofs_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;
CREATE SEQUENCE IF NOT EXISTS grades_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;
CREATE SEQUENCE IF NOT EXISTS majors_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;
CREATE SEQUENCE IF NOT EXISTS notices_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;
CREATE SEQUENCE IF NOT EXISTS users_id_seq AS integer START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647;

-- 外键约束
-- ------------------------------
ALTER TABLE credits
  ADD CONSTRAINT fk_credits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE credits_proofs
  ADD CONSTRAINT fk_credits_proofs_credit FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE CASCADE;

-- 触发器和自动更新时间
-- ------------------------------
-- system_config表自动更新时间
CREATE OR REPLACE FUNCTION update_system_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_system_config_timestamp
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_system_config_timestamp();

-- 初始化数据
-- ------------------------------
-- 插入默认角色配置
INSERT INTO system_config (category, config_key, config_value) VALUES
('role', 'admin', '{"key":"admin","label":"管理员","description":"系统管理员，拥有最高权限","color":"bg-gray-300 text-gray-800","cardColor":"from-gray-100 to-gray-200","permissions":["*","users.manage","notices.manage","system.admin"]}'),
('role', 'monitor', '{"key":"monitor","label":"班长","description":"班级管理者，可审批本班学分申请","color":"bg-green-100 text-green-700","cardColor":"from-green-100 to-green-200","permissions":["credits.approve","credits.reject","credits.view","credits.submit","credits.view_own"]}'),
('role', 'league_secretary', '{"key":"league_secretary","label":"团支书","description":"团支部书记，可审批本班学分申请","color":"bg-yellow-100 text-yellow-700","cardColor":"from-yellow-100 to-yellow-200","permissions":["credits.approve","credits.reject","credits.view","credits.submit","credits.view_own"]}'),
('role', 'study_committee', '{"key":"study_committee","label":"学习委员","description":"学习委员，可审批本班学分申请","color":"bg-purple-100 text-purple-700","cardColor":"from-purple-100 to-purple-200","permissions":["credits.approve","credits.reject","credits.view","credits.submit","credits.view_own"]}'),
('role', 'student', '{"key":"student","label":"学生","description":"普通学生，可申请学分","color":"bg-blue-100 text-blue-700","cardColor":"from-blue-50 to-blue-100","permissions":["credits.submit","credits.view_own"]}')
ON CONFLICT (category, config_key) DO NOTHING;

-- 插入默认学分类型配置
INSERT INTO system_config (category, config_key, config_value) VALUES
('credit_type', '个人活动', '{"key":"个人活动","label":"个人活动","description":"如学生会、社团、讲座、社会实践等校内外活动。需上传相关证明材料。","color":"bg-blue-100 text-blue-800","cardColor":"from-blue-50 to-blue-100","fields":["activityName","proofFiles"],"defaultScore":15,"scoreCalculation":"fixed"}'),
('credit_type', '个人比赛', '{"key":"个人比赛","label":"个人比赛","description":"如各类学科竞赛、技能大赛、文体比赛等。需上传获奖证书或成绩单。","color":"bg-purple-100 text-purple-800","cardColor":"from-purple-50 to-purple-100","fields":["competitionName","proofFiles"],"scoreCalculation":"manual"}'),
('credit_type', '个人证书', '{"key":"个人证书","label":"个人证书","description":"如英语等级证书、计算机等级证书等国家或行业认证。需上传证书文件。","color":"bg-indigo-100 text-indigo-800","cardColor":"from-indigo-50 to-indigo-100","fields":["certificateName","proofFiles"],"scoreCalculation":"manual"}'),
('credit_type', '志愿活动', '{"key":"志愿活动","label":"志愿活动","description":"如志愿服务、公益活动等，需准确填写活动名称和时长，并上传相关证明。","color":"bg-orange-100 text-orange-800","cardColor":"from-orange-50 to-orange-100","fields":["volunteerName","volunteerHours","proofFiles"],"scoreCalculation":"time_based","scorePerHour":6}')
ON CONFLICT (category, config_key) DO NOTHING;

-- 插入默认状态配置
INSERT INTO system_config (category, config_key, config_value) VALUES
('status', 'pending', '{"key":"pending","label":"待审批","color":"bg-yellow-100 text-yellow-700"}'),
('status', 'approved', '{"key":"approved","label":"已通过","color":"bg-green-100 text-green-700"}'),
('status', 'rejected', '{"key":"rejected","label":"已拒绝","color":"bg-red-100 text-red-700"}')
ON CONFLICT (category, config_key) DO NOTHING;

-- 插入默认字段配置
INSERT INTO system_config (category, config_key, config_value)
VALUES (
  'fields',
  'available_fields',
  '[
    {"key":"activityName","label":"活动名称","description":"活动或项目的名称"},
    {"key":"competitionName","label":"比赛名称","description":"比赛或竞赛的名称"},
    {"key":"certificateName","label":"证书名称","description":"证书或资质的名称"},
    {"key":"volunteerName","label":"志愿活动名称","description":"志愿服务活动的名称"},
    {"key":"volunteerHours","label":"志愿时长","description":"志愿服务的小时数（用于计算分数）"},
    {"key":"proofFiles","label":"证明材料","description":"文件上传功能，支持图片和PDF文件"}
  ]'
)
ON CONFLICT (category, config_key) DO NOTHING;

--插入默认管理员账号admin/admin123
INSERT INTO users (username, password, role) VALUES ('admin', '$2b$10$0lDTamYVvpLFXOM/Pp4tWOjczX5hJ1tNvjU16Ts1qmZEDU1gPUIay', 'admin');