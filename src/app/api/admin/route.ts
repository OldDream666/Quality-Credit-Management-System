import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { requireRole } from '@/lib/auth';

export const GET = requireRole(['admin'])(async (req, user) => {
  return NextResponse.json({ message: "管理员接口访问成功" });
});
