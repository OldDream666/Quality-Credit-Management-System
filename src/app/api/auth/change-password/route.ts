import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const payload = verifyJwt(token);
  if (!payload || typeof payload === 'string' || !payload.id) {
    return NextResponse.json({ error: "无效 token" }, { status: 401 });
  }
  const { old_password, new_password } = await req.json();
  if (!old_password || !new_password) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }
  // 密码复杂度验证
  if (new_password.length < 6) {
    return NextResponse.json({ error: "新密码至少6位" }, { status: 400 });
  }
  if (!/[A-Za-z]/.test(new_password)) {
    return NextResponse.json({ error: "新密码需包含字母" }, { status: 400 });
  }
  if (!/\d/.test(new_password)) {
    return NextResponse.json({ error: "新密码需包含数字" }, { status: 400 });
  }
  // 查询用户
  const result = await pool.query('SELECT id, password FROM users WHERE id = $1', [payload.id]);
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }
  const user = result.rows[0];
  const valid = await bcrypt.compare(old_password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "原密码错误" }, { status: 400 });
  }
  const hash = await bcrypt.hash(new_password, 10);
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, user.id]);
  return NextResponse.json({ success: true });
}
