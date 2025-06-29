-- 删除 users 表的 permissions 字段
ALTER TABLE users DROP COLUMN IF EXISTS permissions;
