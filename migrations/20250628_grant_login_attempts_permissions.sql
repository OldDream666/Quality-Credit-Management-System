-- 授予student用户对login_attempts表的所有权限
GRANT ALL PRIVILEGES ON TABLE login_attempts TO student;

-- 授予student用户对login_attempts_username_seq序列的所有权限（如果有的话）
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO student; 