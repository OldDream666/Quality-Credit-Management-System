import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";

// POST /api/admin/users/batch-delete
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const payload = verifyJwt(token);
  if (!payload || typeof payload === 'string' || payload.role !== 'admin') {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  let ids: number[] = [];
  try {
    const body = await req.json();
    ids = Array.isArray(body.ids) ? body.ids : [];
    if (!ids.length) {
      return NextResponse.json({ error: "未选择用户" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  try {
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [ids]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "批量删除失败" }, { status: 500 });
  }
}
