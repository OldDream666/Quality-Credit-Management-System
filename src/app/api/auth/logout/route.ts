import { NextResponse } from "next/server";

export async function POST() {
  // 清除 httpOnly token cookie
  const res = NextResponse.json({ success: true });
  res.cookies.set('token', '', { path: '/', httpOnly: true, maxAge: 0 });
  return res;
}
