import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";

// 导出本人已审批通过的学分证明（示例：导出为 JSON，可扩展为 PDF、Excel 等）
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const payload = verifyJwt(token);
  if (!payload || typeof payload === 'string') {
    return NextResponse.json({ error: "无效 token" }, { status: 401 });
  }
  const result = await pool.query('SELECT * FROM credits WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC', [payload.id, 'approved']);
  // 这里简单导出为 JSON，后续可扩展为 PDF/Excel
  return NextResponse.json({ proof: result.rows });
}
