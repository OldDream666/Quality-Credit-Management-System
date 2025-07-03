import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import { requireRole } from '@/lib/auth';

// 查询所有公告（按时间倒序）
export async function GET() {
  const result = await pool.query('SELECT * FROM notices ORDER BY created_at DESC');
  return NextResponse.json({ notices: result.rows });
}

// 新增公告（仅管理员）
export const POST = requireRole(['admin'])(async (req, user) => {
  const { title, content } = await req.json();
  if (!title || !content) {
    return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 });
  }
  const result = await pool.query(
    'INSERT INTO notices (title, content, created_at) VALUES ($1, $2, NOW()) RETURNING *',
    [title, content]
  );
  return NextResponse.json({ notice: result.rows[0] });
});
