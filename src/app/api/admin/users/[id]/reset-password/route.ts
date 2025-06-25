import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import bcrypt from "bcryptjs";

// POST /api/admin/users/[id]/reset-password
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const payload = verifyJwt(token);
  if (!payload || typeof payload === 'string' || payload.role !== 'admin') {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const { id: userId } = await params;
  // 查询用户
  const result = await pool.query('SELECT id, student_id FROM users WHERE id = $1', [userId]);
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }
  const user = result.rows[0];
  if (!user.student_id || user.student_id.length < 6) {
    return NextResponse.json({ error: "学号无效，无法重置密码" }, { status: 400 });
  }
  const newPassword = user.student_id.slice(-6);
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, user.id]);
  return NextResponse.json({ success: true });
}
