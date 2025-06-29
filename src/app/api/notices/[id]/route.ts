import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";

// 公告详情、编辑、删除（仅管理员）
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
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
  const { title, content } = await req.json();
  if (!title || !content) {
    return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 });
  }
  const result = await pool.query(
    'UPDATE notices SET title=$1, content=$2 WHERE id=$3 RETURNING *',
    [title, content, id]
  );
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "未找到公告" }, { status: 404 });
  }
  return NextResponse.json({ notice: result.rows[0] });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
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
  const result = await pool.query('DELETE FROM notices WHERE id=$1 RETURNING *', [id]);
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "未找到公告" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
