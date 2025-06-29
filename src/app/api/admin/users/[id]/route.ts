import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";

// PATCH: 管理员修改用户角色
export async function PATCH(req: Request, context: { params: any }) {
  const { id } = await context.params;
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const payload = verifyJwt(token);
  if (!payload || typeof payload === 'string' || payload.role !== 'admin') {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  if (!id) return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
  const { role } = await req.json();
  if (!role) return NextResponse.json({ error: "缺少角色" }, { status: 400 });
  const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, name, student_id, role, grade, major, class, created_at', [role, id]);
  if (result.rowCount === 0) return NextResponse.json({ error: "未找到用户" }, { status: 404 });
  return NextResponse.json({ user: result.rows[0] });
}

// DELETE: 管理员删除用户
export async function DELETE(req: Request, context: { params: any }) {
  const { id } = await context.params;
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const payload = verifyJwt(token);
  if (!payload || typeof payload === 'string' || payload.role !== 'admin') {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  // 只需删除users表记录，数据库已设置ON DELETE CASCADE
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "未找到用户" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
