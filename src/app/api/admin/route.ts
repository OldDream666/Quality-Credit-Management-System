import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const payload = verifyJwt(token);
  if (!payload || typeof payload === 'string' || payload.role !== 'admin') {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  return NextResponse.json({ message: "管理员接口访问成功" });
}
