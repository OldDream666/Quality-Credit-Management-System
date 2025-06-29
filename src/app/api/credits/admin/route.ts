import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";

// 班委审批/查询所有学分申请
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const payload = verifyJwt(token);
  // 允许管理员和班委可查看
  const allowedRoles = ["admin", "monitor", "league_secretary", "study_committee"];
  if (!payload || typeof payload === 'string' || !allowedRoles.includes(payload.role)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  let credits = [];
  if (payload.role === 'admin') {
    // 管理员可查看所有
    const result = await pool.query(`
      SELECT credits.*, users.name AS user_name, users.username AS user_username, users.class AS user_class
      FROM credits
      JOIN users ON credits.user_id = users.id
      ORDER BY credits.created_at DESC
    `);
    credits = result.rows;
  } else {
    // 班委只能查看自己班级的审批单
    const userRes = await pool.query('SELECT class FROM users WHERE id = $1', [payload.id]);
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "班委信息不存在" }, { status: 403 });
    }
    const userClass = userRes.rows[0].class;
    if (!userClass) {
      return NextResponse.json({ error: "班委未设置班级信息" }, { status: 403 });
    }
    const result = await pool.query(`
      SELECT credits.*, users.name AS user_name, users.username AS user_username, users.class AS user_class
      FROM credits
      JOIN users ON credits.user_id = users.id
      WHERE users.class = $1
      ORDER BY credits.created_at DESC
    `, [userClass]);
    credits = result.rows;
  }
  // 查询所有 proofs
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
  // 合并
  const creditsWithProofs = credits.map(c => ({ ...c, proofs: proofsMap[c.id] || [] }));
  return NextResponse.json({ credits: creditsWithProofs });
}

// 审批操作（通过/驳回）
export async function PATCH(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const payload = verifyJwt(token);
  // 只有班委可审批，管理员不可审批
  const approverRoles = ["monitor", "league_secretary", "study_committee"];
  if (!payload || typeof payload === 'string' || !approverRoles.includes(payload.role)) {
    return NextResponse.json({ error: "无审批权限" }, { status: 403 });
  }
  const { id, status, reject_reason, score } = await req.json();
  if (!id || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  // 审批权限校验：班委只能审批本班级的审批单
  const userRes = await pool.query('SELECT class FROM users WHERE id = $1', [payload.id]);
  if (userRes.rowCount === 0) {
    return NextResponse.json({ error: "班委信息不存在" }, { status: 403 });
  }
  const userClass = userRes.rows[0].class;
  if (!userClass) {
    return NextResponse.json({ error: "班委未设置班级信息" }, { status: 403 });
  }
  // 查审批单所属班级
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
    result = await pool.query('UPDATE credits SET status = $1, reject_reason = $2 WHERE id = $3 RETURNING *', [status, reject_reason || '', id]);
  } else {
    // 通过时必须填写分数
    if (typeof score !== 'number' || isNaN(score) || score <= 0) {
      return NextResponse.json({ error: "请填写有效分数" }, { status: 400 });
    }
    result = await pool.query('UPDATE credits SET status = $1, score = $2, reject_reason = NULL WHERE id = $3 RETURNING *', [status, score, id]);
  }
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "未找到记录" }, { status: 404 });
  }
  return NextResponse.json({ credit: result.rows[0] });
}
