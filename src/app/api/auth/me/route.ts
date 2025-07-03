import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import pool from "@/lib/db";
import { requireAuth } from '@/lib/auth';

export const GET = requireAuth(async (req, user) => {
  const result = await pool.query('SELECT id, username, name, student_id, role, grade, major, class FROM users WHERE id = $1', [user.id]);
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "用户不存在或已被删除" }, { status: 401 });
  }
  const userRow = result.rows[0];
  return NextResponse.json({ user: userRow });
});
