import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import pool from "@/lib/db";
import { clearLoginAttempts } from "@/lib/auth";

export const POST = requireAdmin(async function(req, user) {
  try {
    const { username } = await req.json();
    // 清除登录尝试记录
    await clearLoginAttempts(username);
    return NextResponse.json({ 
      message: "账号解锁成功" 
    });
  } catch (error) {
    console.error('解锁账号失败:', error);
    return NextResponse.json({ 
      error: "解锁账号失败，请稍后重试" 
    }, { status: 500 });
  }
}); 