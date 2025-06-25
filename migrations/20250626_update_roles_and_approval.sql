-- 新增班委角色，移除 can_approve 字段，审批权限由角色决定
ALTER TABLE users DROP COLUMN IF EXISTS can_approve;
-- 建议：role 字段可选值：admin, student, monitor, league_secretary, study_committee
-- monitor=班长，league_secretary=团支书，study_committee=学习委员
-- 你可根据实际需要调整字段类型和约束
