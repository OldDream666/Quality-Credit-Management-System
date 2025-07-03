import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import bcrypt from "bcryptjs";
import { requireAuth } from '@/lib/auth';

export const POST = requireAuth(async (req, user) => {
  const { old_password, new_password } = await req.json();
  if (!old_password || !new_password) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }
  if (new_password.length < 6) {
    return NextResponse.json({ error: "新密码至少6位" }, { status: 400 });
  }
  if (!/[A-Za-z]/.test(new_password)) {
    return NextResponse.json({ error: "新密码需包含字母" }, { status: 400 });
  }
  if (!/\d/.test(new_password)) {
    return NextResponse.json({ error: "新密码需包含数字" }, { status: 400 });
  }
  const result = await pool.query('SELECT id, password FROM users WHERE id = $1', [user.id]);
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }
  const userRow = result.rows[0];
  const valid = await bcrypt.compare(old_password, userRow.password);
  if (!valid) {
    return NextResponse.json({ error: "原密码错误" }, { status: 400 });
  }
  const hash = await bcrypt.hash(new_password, 10);
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, userRow.id]);
  return NextResponse.json({ success: true });
});
