import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import bcrypt from "bcryptjs";
import { requireRole } from '@/lib/auth';

// POST /api/admin/users/[id]/reset-password
export const POST = requireRole(['admin'])(async (req, user) => {
  const url = new URL(req.url);
  const paths = url.pathname.split('/');
  const userId = paths[paths.length - 2];
  // 查询用户
  const result = await pool.query('SELECT id, student_id FROM users WHERE id = $1', [userId]);
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }
  const userRow = result.rows[0];
  if (!userRow.student_id || userRow.student_id.length < 6) {
    return NextResponse.json({ error: "学号无效，无法重置密码" }, { status: 400 });
  }
  const newPassword = userRow.student_id.slice(-6);
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, userRow.id]);
  return NextResponse.json({ success: true });
});
