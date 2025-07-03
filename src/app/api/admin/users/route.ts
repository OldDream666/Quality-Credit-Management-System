import { NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";
import { requireRole } from '@/lib/auth';

// 仅管理员可添加用户
export const POST = requireRole(['admin'])(async (req, user) => {
  const { username, password, name, student_id, role, grade, major, class: className } = await req.json();
  if (!username || !password || (role !== 'admin' && (!name || !student_id))) {
    return NextResponse.json({ error: "请填写完整信息" }, { status: 400 });
  }
  if (role !== 'admin' && student_id && !/^\d+$/.test(student_id)) {
    return NextResponse.json({ error: "学号只能包含数字" }, { status: 400 });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const gradeValue = typeof grade === 'string' ? grade : null;
    const majorValue = typeof major === 'string' ? major : null;
    const classValue = typeof className === 'string' ? className : null;
    const result = await pool.query(
      'INSERT INTO users (username, password, name, student_id, role, grade, major, class) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, name, student_id, role, grade, major, class, created_at',
      [username, hash, name || null, student_id || null, role || 'student', gradeValue, majorValue, classValue]
    );
    return NextResponse.json({ user: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: "用户名或学号已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
});
