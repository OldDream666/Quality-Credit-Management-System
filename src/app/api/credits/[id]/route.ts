import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from '@/lib/auth';
import { DatabaseConfigManager } from "@/lib/dbConfig";

// 查询单条学分申请及其证明材料
export const GET = requireAuth(async (req, user) => {
  const url = new URL(req.url);
  const paths = url.pathname.split('/');
  const creditId = paths[paths.length - 1];
  // 查询主表
  const result = await pool.query('SELECT * FROM credits WHERE id = $1', [creditId]);
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "未找到记录" }, { status: 404 });
  }
  const credit = result.rows[0];
  // 权限校验：仅本人或管理员可查
  if (user.role !== 'admin' && credit.user_id !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  // 查询证明材料
  const proofsRes = await pool.query('SELECT id, filename, mimetype FROM credits_proofs WHERE credit_id = $1', [creditId]);
  // 拼接下载 url
  const proofs = proofsRes.rows.map((p: any) => ({
    id: p.id,
    name: p.filename,
    url: `/api/credits/proof-file?id=${p.id}`,
    mimetype: p.mimetype,
  }));
  return NextResponse.json({ ...credit, proofs });
});

// 修改学分申请（主要用于修改分数）
export const PUT = requireAuth(async (req, user) => {
  try {
    const url = new URL(req.url);
    const paths = url.pathname.split('/');
    const creditId = paths[paths.length - 1];

    // 权限检查
    const roleConfig = await DatabaseConfigManager.getRoleConfig(user.role);
    const permissions = Array.isArray(roleConfig?.permissions) ? roleConfig.permissions : [];
    const canEdit = user.role === 'admin' || permissions.includes('credits.approve');

    if (!canEdit) {
      return NextResponse.json({ error: "无权限修改" }, { status: 403 });
    }

    const body = await req.json();
    const { score } = body;

    // 验证分数
    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 3000) {
      return NextResponse.json({ error: "分数必须在0-3000之间" }, { status: 400 });
    }

    // 检查记录是否存在
    const checkRes = await pool.query('SELECT id, status FROM credits WHERE id = $1', [creditId]);
    if (checkRes.rowCount === 0) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    const record = checkRes.rows[0];
    // 只有已通过的记录才有修改分数的意义，或者是为了修正已拒绝的？
    // 通常这里的需求是修改“已通过”的分数。
    // 如果是 pending 状态，应该走审批流程。
    // 不过作为通用的修改接口，只要有权限，修改分数应该是允许的。

    await pool.query(
      'UPDATE credits SET score = $1 WHERE id = $2',
      [numScore, creditId]
    );

    return NextResponse.json({ success: true, score: numScore });
  } catch (error: any) {
    console.error('修改分数失败:', error);
    return NextResponse.json({ error: error.message || "修改失败" }, { status: 500 });
  }
});

// 删除/撤销申请
export const DELETE = requireAuth(async (req, user) => {
  try {
    const url = new URL(req.url);
    const paths = url.pathname.split('/');
    const creditId = paths[paths.length - 1];

    // 查询记录确认归属和状态
    const res = await pool.query('SELECT user_id, status FROM credits WHERE id = $1', [creditId]);
    if (res.rowCount === 0) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
    const record = res.rows[0];

    // 权限检查
    const isAdmin = user.role === 'admin';
    const isOwner = record.user_id === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 状态检查：只有 pending 状态可以撤销（除非是管理员强制删除，但需求是撤销未审批）
    // 如果是学生自己撤销，必须是 pending
    if (!isAdmin && record.status !== 'pending') {
      return NextResponse.json({ error: "只能撤销待审批的申请" }, { status: 400 });
    }

    // 执行删除
    await pool.query('DELETE FROM credits WHERE id = $1', [creditId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('撤销失败:', error);
    return NextResponse.json({ error: error.message || "撤销失败" }, { status: 500 });
  }
});
