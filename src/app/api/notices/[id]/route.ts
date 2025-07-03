import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import { requireRole } from '@/lib/auth';

// 公告详情、编辑、删除（仅管理员）
export const PUT = requireRole(['admin'])(async (req, user) => {
  const url = new URL(req.url);
  const paths = url.pathname.split('/');
  const id = paths[paths.length - 1];
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
});

export const DELETE = requireRole(['admin'])(async (req, user) => {
  const url = new URL(req.url);
  const paths = url.pathname.split('/');
  const id = paths[paths.length - 1];
  const result = await pool.query('DELETE FROM notices WHERE id=$1 RETURNING *', [id]);
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "未找到公告" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
});
