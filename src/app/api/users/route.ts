import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";
import { requireRole } from '@/lib/auth';

export const GET = requireRole(['admin'])(async (req, user) => {
  const result = await pool.query('SELECT id, username, name, student_id, role, grade, major, class, created_at FROM users ORDER BY id');
  return NextResponse.json({ users: result.rows });
});
