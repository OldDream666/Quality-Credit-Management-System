import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from '@/lib/auth';

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
