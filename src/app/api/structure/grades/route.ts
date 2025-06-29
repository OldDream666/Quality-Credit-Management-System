import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { extractUserFromRequest } from "@/lib/auth";

// GET: 获取所有年级
export async function GET(req: NextRequest) {
  const result = await pool.query('SELECT * FROM grades ORDER BY id DESC');
  return NextResponse.json({ grades: result.rows });
}

// POST: 新增年级
export async function POST(req: NextRequest) {
  const user = extractUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: '年级名称不能为空' }, { status: 400 });
  try {
    const result = await pool.query('INSERT INTO grades (name) VALUES ($1) RETURNING *', [name]);
    return NextResponse.json({ grade: result.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// PUT: 修改年级
export async function PUT(req: NextRequest) {
  const user = extractUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const { id, name } = await req.json();
  if (!id || !name) return NextResponse.json({ error: '参数不完整' }, { status: 400 });
  try {
    // 查询旧年级名
    const oldRes = await pool.query('SELECT name FROM grades WHERE id=$1', [id]);
    if (oldRes.rowCount === 0) return NextResponse.json({ error: '年级不存在' }, { status: 404 });
    const oldName = oldRes.rows[0].name;
    // 更新年级表
    const result = await pool.query('UPDATE grades SET name=$1 WHERE id=$2 RETURNING *', [name, id]);
    // 同步更新users表
    await pool.query('UPDATE users SET grade=$1 WHERE grade=$2', [name, oldName]);
    return NextResponse.json({ grade: result.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// DELETE: 删除年级
export async function DELETE(req: NextRequest) {
  const user = extractUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: '参数不完整' }, { status: 400 });
  try {
    // 查询年级名
    const oldRes = await pool.query('SELECT name FROM grades WHERE id=$1', [id]);
    if (oldRes.rowCount === 0) return NextResponse.json({ error: '年级不存在' }, { status: 404 });
    const oldName = oldRes.rows[0].name;
    // 删除年级
    const result = await pool.query('DELETE FROM grades WHERE id=$1 RETURNING *', [id]);
    // 置空users表中对应grade
    await pool.query('UPDATE users SET grade=NULL WHERE grade=$1', [oldName]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
} 