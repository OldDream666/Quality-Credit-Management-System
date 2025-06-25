-- 为 credits 表添加驳回原因字段
ALTER TABLE credits ADD COLUMN IF NOT EXISTS reject_reason VARCHAR(255);
