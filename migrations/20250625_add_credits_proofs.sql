-- 1. 新建证明材料子表 credits_proofs
CREATE TABLE credits_proofs (
  id SERIAL PRIMARY KEY,
  credit_id INTEGER REFERENCES credits(id) ON DELETE CASCADE,
  file bytea NOT NULL,
  filename VARCHAR(255) NOT NULL,
  mimetype VARCHAR(128) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 2. 可选：删除 credits 表中的 proof_file/proof_filename/proof_mimetype/proof_url 字段
ALTER TABLE credits DROP COLUMN IF EXISTS proof_file, DROP COLUMN IF EXISTS proof_filename, DROP COLUMN IF EXISTS proof_mimetype;
