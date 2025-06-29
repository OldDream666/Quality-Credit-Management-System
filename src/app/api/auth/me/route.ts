import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import pool from "@/lib/db";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const payload = verifyJwt(token);
  if (!payload || typeof payload === 'string') {
    return NextResponse.json({ error: "无效或过期的 token" }, { status: 401 });
  }
  // 校验用户是否真实存在
  const result = await pool.query('SELECT id, username, name, student_id, role, grade, major, class FROM users WHERE id = $1', [payload.id]);
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "用户不存在或已被删除" }, { status: 401 });
  }
  // 返回数据库中的用户信息，防止 token 伪造
  const user = result.rows[0];
  return NextResponse.json({ user });
}
