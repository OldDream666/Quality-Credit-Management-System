import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { DatabaseConfigManager } from "@/lib/dbConfig";
import { requireAuth } from '@/lib/auth';
import { UserRole } from '@/types';

// 历史审批记录API
export const GET = requireAuth(async (req, user) => {
  // 查询用户信息
  const userRes = await pool.query('SELECT id, role, class FROM users WHERE id = $1', [user.id]);
  if (userRes.rowCount === 0) {
    return NextResponse.json({ error: "用户不存在" }, { status: 403 });
  }
  const currentUser = userRes.rows[0];
  const roleConfig = await DatabaseConfigManager.getRoleConfig(currentUser.role);
  if (!roleConfig) {
    return NextResponse.json({ error: "角色配置不存在" }, { status: 403 });
  }
  const permissions = Array.isArray(roleConfig.permissions) ? roleConfig.permissions : [];
  const isAdminUser = currentUser.role === 'admin';
  let credits = [];
  if (isAdminUser) {
    // 管理员获取全部
    const result = await pool.query(`
      SELECT credits.*, approver.name AS approver_name
      FROM credits
      LEFT JOIN users approver ON credits.approver_id = approver.id
    `);
    credits = result.rows;
  } else {
    const userClass = currentUser.class;
    if (!userClass) {
      return NextResponse.json({ error: "班委未设置班级信息" }, { status: 403 });
    }
    const result = await pool.query(`
      SELECT credits.*, users.name AS user_name, users.username AS user_username, users.class AS user_class, approver.name AS approver_name
      FROM credits
      JOIN users ON credits.user_id = users.id
      LEFT JOIN users approver ON credits.approver_id = approver.id
      WHERE users.class = $1
      ORDER BY credits.created_at DESC
    `, [userClass]);
    credits = result.rows;
    if (currentUser.role !== 'monitor') {
      // 其他班委角色按类型过滤
      const allCreditTypes = await DatabaseConfigManager.getAllCreditTypes();
      const approvableTypes = allCreditTypes.filter(ct => Array.isArray(ct.approverRoles) && ct.approverRoles.includes(currentUser.role as UserRole)).map(ct => ct.key);
      credits = credits.filter(c => approvableTypes.includes(c.type));
    }
  }
  // 关联证明材料
  const creditIds = credits.map(c => c.id);
  let proofsMap: Record<number, any[]> = {};
  if (creditIds.length) {
    const proofsRes = await pool.query(
      'SELECT id, credit_id, filename, mimetype FROM credits_proofs WHERE credit_id = ANY($1) ORDER BY id',
      [creditIds]
    );
    proofsMap = proofsRes.rows.reduce((acc: any, p: any) => {
      if (!acc[p.credit_id]) acc[p.credit_id] = [];
      acc[p.credit_id].push(p);
      return acc;
    }, {});
  }
  const creditsWithProofs = credits.map(c => ({ ...c, proofs: proofsMap[c.id] || [] }));
  return NextResponse.json({ credits: creditsWithProofs });
}); 