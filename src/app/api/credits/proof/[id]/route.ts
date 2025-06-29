import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";

// 证明材料下载接口
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return new Response("未认证", { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const payload = verifyJwt(token);
  if (!payload || typeof payload === 'string') {
    return new Response("无效 token", { status: 401 });
  }
  const { id: proofId } = await params;
  // 查 proofs 表
  const result = await pool.query('SELECT * FROM credits_proofs WHERE id = $1', [proofId]);
  if (result.rows.length === 0) {
    return new Response("未找到文件", { status: 404 });
  }
  const proof = result.rows[0];
  // 查 credits 主表，校验权限
  const creditRes = await pool.query('SELECT * FROM credits WHERE id = $1', [proof.credit_id]);
  if (creditRes.rows.length === 0) {
    return new Response("无效关联", { status: 404 });
  }
  const credit = creditRes.rows[0];
  if (payload.role !== 'admin' && credit.user_id !== payload.id) {
    return new Response("无权限", { status: 403 });
  }
  // 返回文件
  return new Response(proof.file, {
    status: 200,
    headers: {
      'Content-Type': proof.mimetype,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(proof.filename)}"`
    }
  });
}
