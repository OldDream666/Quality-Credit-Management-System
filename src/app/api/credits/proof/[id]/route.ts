import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import { requireAuth } from '@/lib/auth';

// 证明材料下载接口
export const GET = requireAuth(async (req, user) => {
  const url = new URL(req.url);
  const paths = url.pathname.split('/');
  const proofId = paths[paths.length - 1];
  // 查 proofs 表
  const result = await pool.query('SELECT * FROM credits_proofs WHERE id = $1', [proofId]);
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "未找到文件" }, { status: 404 });
  }
  const proof = result.rows[0];
  // 查 credits 主表，校验权限
  const creditRes = await pool.query('SELECT * FROM credits WHERE id = $1', [proof.credit_id]);
  if (creditRes.rows.length === 0) {
    return NextResponse.json({ error: "无效关联" }, { status: 404 });
  }
  const credit = creditRes.rows[0];
  if (user.role !== 'admin' && credit.user_id !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  // 返回文件（base64编码，前端可解码下载）
  const fileBase64 = Buffer.from(proof.file).toString('base64');
  return NextResponse.json({
    file: fileBase64,
    filename: proof.filename,
    mimetype: proof.mimetype
  });
});
