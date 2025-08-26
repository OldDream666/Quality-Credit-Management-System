import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireRole } from "@/lib/auth";

// GET: 获取所有班级，支持按年级和专业过滤
export const GET = requireRole(['admin'])(async (req: NextRequest, user) => {
  const gradeId = req.nextUrl.searchParams.get('grade_id');
  const majorId = req.nextUrl.searchParams.get('major_id');
  
  let sql = `
    SELECT 
      c.*,
      g.name as grade_name,
      m.name as major_name
    FROM classes c
    LEFT JOIN grades g ON c.grade_id = g.id
    LEFT JOIN majors m ON c.major_id = m.id
  `;
  
  const params: any[] = [];
  if (gradeId) {
    params.push(gradeId);
    sql += params.length === 1 ? ' WHERE c.grade_id = $1' : ' AND c.grade_id = $' + params.length;
  }
  if (majorId) {
    params.push(majorId);
    sql += params.length === 1 ? ' WHERE c.major_id = $1' : ' AND c.major_id = $' + params.length;
  }
  sql += ' ORDER BY c.id DESC';
  
  const result = await pool.query(sql, params);
  return NextResponse.json({ classes: result.rows });
});

// POST: 新增班级
export const POST = requireRole(['admin'])(async (req: NextRequest, user) => {
  const { name, grade_id, major_id } = await req.json();
  if (!name || !grade_id || !major_id) return NextResponse.json({ error: '参数不完整' }, { status: 400 });
  try {
    const result = await pool.query('INSERT INTO classes (name, grade_id, major_id) VALUES ($1, $2, $3) RETURNING *', [name, grade_id, major_id]);
    return NextResponse.json({ class: result.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
});

// PUT: 修改班级
export const PUT = requireRole(['admin'])(async (req: NextRequest, user) => {
  const { id, name, grade_id, major_id } = await req.json();
  if (!id || !name || !grade_id || !major_id) return NextResponse.json({ error: '参数不完整' }, { status: 400 });
  try {
    // 查询旧班级名
    const oldRes = await pool.query('SELECT name FROM classes WHERE id=$1', [id]);
    if (oldRes.rowCount === 0) return NextResponse.json({ error: '班级不存在' }, { status: 404 });
    const oldName = oldRes.rows[0].name;
    // 更新班级表
    const result = await pool.query('UPDATE classes SET name=$1, grade_id=$2, major_id=$3 WHERE id=$4 RETURNING *', [name, grade_id, major_id, id]);
    // 同步更新users表
    await pool.query('UPDATE users SET class=$1 WHERE class=$2', [name, oldName]);
    return NextResponse.json({ class: result.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
});

// DELETE: 删除班级
export const DELETE = requireRole(['admin'])(async (req: NextRequest, user) => {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: '参数不完整' }, { status: 400 });
  try {
    // 查询班级名
    const oldRes = await pool.query('SELECT name FROM classes WHERE id=$1', [id]);
    if (oldRes.rowCount === 0) return NextResponse.json({ error: '班级不存在' }, { status: 404 });
    const oldName = oldRes.rows[0].name;
    // 删除班级
    const result = await pool.query('DELETE FROM classes WHERE id=$1 RETURNING *', [id]);
    // 置空users表中对应class
    await pool.query('UPDATE users SET class=NULL WHERE class=$1', [oldName]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
});