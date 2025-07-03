import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import { requireAuth } from '@/lib/auth';

// 导出本人已审批通过的学分证明（示例：导出为 JSON，可扩展为 PDF、Excel 等）
export const GET = requireAuth(async (req, user) => {
  const result = await pool.query('SELECT * FROM credits WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC', [user.id, 'approved']);
  // 这里简单导出为 JSON，后续可扩展为 PDF/Excel
  return NextResponse.json({ proof: result.rows });
});
