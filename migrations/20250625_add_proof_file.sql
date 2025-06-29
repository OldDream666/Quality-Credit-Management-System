-- 学分证明材料存储到数据库
ALTER TABLE credits 
  ADD COLUMN proof_file bytea,
  ADD COLUMN proof_filename varchar(255),
  ADD COLUMN proof_mimetype varchar(128);
-- 可选：移除 proof_url 字段
-- ALTER TABLE credits DROP COLUMN proof_url;
