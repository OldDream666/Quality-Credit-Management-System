import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import { DatabaseConfigManager } from "@/lib/dbConfig";
import { cookies } from "next/headers";
import { requireAuth } from '@/lib/auth';


// 班委审批/查询所有学分申请
export const GET = requireAuth(async (req, user) => {
  // 实时查询用户角色和权限
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
  const canViewCredits = permissions.includes('credits.view') || permissions.includes('system.admin');
  if (!isAdminUser && !canViewCredits) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  let credits = [];
  const isAdmin = permissions.includes('system.admin') || permissions.includes('*');
  if (isAdmin) {
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
  }
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

// 审批操作（通过/驳回）
export const PATCH = requireAuth(async (req, user) => {
  // 实时查询用户角色和权限
  const userRes = await pool.query('SELECT id, role, class FROM users WHERE id = $1', [user.id]);
  if (userRes.rowCount === 0) {
    return NextResponse.json({ error: "用户不存在" }, { status: 403 });
  }
  const currentUser = userRes.rows[0];
  if (currentUser.role === 'admin') {
    return NextResponse.json({ error: "管理员禁止审批操作" }, { status: 403 });
  }
  const roleConfig = await DatabaseConfigManager.getRoleConfig(currentUser.role);
  if (!roleConfig) {
    return NextResponse.json({ error: "角色配置不存在" }, { status: 403 });
  }
  const permissions = Array.isArray(roleConfig.permissions) ? roleConfig.permissions : [];
  const canApprove = permissions.includes('credits.approve') || permissions.includes('credits.reject');
  if (!canApprove) {
    return NextResponse.json({ error: "无审批权限" }, { status: 403 });
  }
  const { id, status, reject_reason, score } = await req.json();
  if (!id || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const userClass = currentUser.class;
  if (!userClass) {
    return NextResponse.json({ error: "班委未设置班级信息" }, { status: 403 });
  }
  const creditRes = await pool.query(
    'SELECT u.class FROM credits c JOIN users u ON c.user_id = u.id WHERE c.id = $1',
    [id]
  );
  if (creditRes.rowCount === 0) {
    return NextResponse.json({ error: "审批单不存在" }, { status: 404 });
  }
  const creditClass = creditRes.rows[0].class;
  if (creditClass !== userClass) {
    return NextResponse.json({ error: "无权限审批其他班级的审批单" }, { status: 403 });
  }
  let result;
  if (status === 'rejected') {
    result = await pool.query(
      'UPDATE credits SET status = $1, reject_reason = $2, approver_id = $3, approved_at = NOW() WHERE id = $4 RETURNING *',
      [status, reject_reason || '', currentUser.id, id]
    );
  } else {
    if (typeof score !== 'number' || score < 0 || score > 1000) {
      return NextResponse.json({ error: "分数必须在0-1000之间" }, { status: 400 });
    }
    result = await pool.query(
      'UPDATE credits SET status = $1, score = $2, reject_reason = NULL, approver_id = $3, approved_at = NOW() WHERE id = $4 RETURNING *',
      [status, score, currentUser.id, id]
    );
  }
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "未找到记录" }, { status: 404 });
  }
  return NextResponse.json({ credit: result.rows[0] });
});
