-- 创建登录尝试记录表
CREATE TABLE login_attempts (
  username VARCHAR(100) PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_login_attempts_last_attempt ON login_attempts(last_attempt);

-- 添加注释
COMMENT ON TABLE login_attempts IS '登录尝试记录表';
COMMENT ON COLUMN login_attempts.username IS '用户名';
COMMENT ON COLUMN login_attempts.count IS '尝试次数';
COMMENT ON COLUMN login_attempts.last_attempt IS '最后尝试时间'; 