import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { extractUserFromRequest } from "@/lib/auth";

// GET: 获取所有专业
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const gradeId = searchParams.get('grade_id');

  let query = `
    SELECT DISTINCT m.* 
    FROM majors m
  `;
  
  if (gradeId) {
    query += `
      INNER JOIN classes c ON c.major_id = m.id 
      WHERE c.grade_id = $1
    `;
    const result = await pool.query(query, [gradeId]);
    return NextResponse.json({ majors: result.rows });
  } else {
    const result = await pool.query(query + ' ORDER BY id DESC');
    return NextResponse.json({ majors: result.rows });
  }
}

// POST: 新增专业
export async function POST(req: NextRequest) {
  const user = extractUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: '专业名称不能为空' }, { status: 400 });
  try {
    const result = await pool.query('INSERT INTO majors (name) VALUES ($1) RETURNING *', [name]);
    return NextResponse.json({ major: result.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// PUT: 修改专业
export async function PUT(req: NextRequest) {
  const user = extractUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const { id, name } = await req.json();
  if (!id || !name) return NextResponse.json({ error: '参数不完整' }, { status: 400 });
  try {
    // 查询旧专业名
    const oldRes = await pool.query('SELECT name FROM majors WHERE id=$1', [id]);
    if (oldRes.rowCount === 0) return NextResponse.json({ error: '专业不存在' }, { status: 404 });
    const oldName = oldRes.rows[0].name;
    // 更新专业表
    const result = await pool.query('UPDATE majors SET name=$1 WHERE id=$2 RETURNING *', [name, id]);
    // 同步更新users表
    await pool.query('UPDATE users SET major=$1 WHERE major=$2', [name, oldName]);
    return NextResponse.json({ major: result.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// DELETE: 删除专业
export async function DELETE(req: NextRequest) {
  const user = extractUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: '参数不完整' }, { status: 400 });
  try {
    // 查询专业名
    const oldRes = await pool.query('SELECT name FROM majors WHERE id=$1', [id]);
    if (oldRes.rowCount === 0) return NextResponse.json({ error: '专业不存在' }, { status: 404 });
    const oldName = oldRes.rows[0].name;
    // 删除专业
    const result = await pool.query('DELETE FROM majors WHERE id=$1 RETURNING *', [id]);
    // 置空users表中对应major
    await pool.query('UPDATE users SET major=NULL WHERE major=$1', [oldName]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
} 