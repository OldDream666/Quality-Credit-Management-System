-- 安装pgcrypto扩展（如果尚未安装）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 创建一个函数来生成bcrypt哈希
CREATE OR REPLACE FUNCTION generate_bcrypt_hash(password text)
RETURNS text AS $$
BEGIN
  -- 使用 crypt 函数和 bf (blowfish) 算法生成哈希
  -- $2a$10 表示使用 bcrypt 算法和 10 轮加密
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

-- 为所有非管理员用户更新密码
-- 使用他们的用户名（学号）作为初始密码
UPDATE users 
SET password = generate_bcrypt_hash(username)
WHERE role != 'admin';

-- 删除临时函数
DROP FUNCTION generate_bcrypt_hash; 