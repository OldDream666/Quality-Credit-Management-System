import { NextResponse } from "next/server";
import { safeQuery } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signJwt } from "@/lib/jwt";
import { validateObject, validationRules } from "@/lib/validation";
import { checkLoginAttempts, recordLoginFailure, clearLoginAttempts, getLoginAttempts } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    
    // 输入验证
    const validation = validateObject({ username, password }, {
      username: {
        ...validationRules.username,
        pattern: /^[a-zA-Z0-9_]+$/,
      },
      password: validationRules.password
    });
    
    if (!validation.isValid) {
      const errorDetails = validation.errors.map(err => {
        if (err.includes('username')) {
          if (err.includes('不能为空')) {
            return '请输入用户名或学号';
          }
          if (err.includes('格式不正确')) {
            return '用户名只能包含字母、数字和下划线';
          }
          if (err.includes('长度不能少于')) {
            return '用户名长度不能少于3位';
          }
          if (err.includes('长度不能超过')) {
            return '用户名长度不能超过20位';
          }
          return err.replace('username', '用户名');
        }
        if (err.includes('password')) {
          if (err.includes('不能为空')) {
            return '请输入密码';
          }
          if (err.includes('长度不能少于')) {
            return '密码长度不能少于6位';
          }
          if (err.includes('长度不能超过')) {
            return '密码长度不能超过50位';
          }
          return err.replace('password', '密码');
        }
        return err;
      });
      return NextResponse.json({ 
        error: errorDetails[0], 
        details: errorDetails 
      }, { status: 400 });
    }

    // 检查登录失败次数
    const loginCheck = await checkLoginAttempts(username);
    if (!loginCheck.allowed) {
      const minutes = Math.floor(loginCheck.remainingTime! / 60);
      const seconds = loginCheck.remainingTime! % 60;
      const timeStr = minutes > 0 
        ? `${minutes}分钟${seconds}秒`
        : `${seconds}秒`;
      return NextResponse.json({ 
        error: "账号已被锁定",
        message: `由于多次登录失败，账号已被临时锁定。请在${timeStr}后重试，或联系管理员解锁。`
      }, { status: 429 });
    }

    // 支持用 student_id 或 username 登录
    let result = await safeQuery('SELECT * FROM users WHERE student_id = $1', [username]);
    if (result.rowCount === 0) {
      result = await safeQuery('SELECT * FROM users WHERE username = $1', [username]);
    }
    if (result.rowCount === 0) {
      return NextResponse.json({ 
        error: "用户名或学号不存在",
        message: "请检查输入的用户名或学号是否正确"
      }, { status: 404 });
    }
    
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await recordLoginFailure(username);
      const attempts = await getLoginAttempts(username);
      const remainingAttempts = attempts ? 5 - attempts.count : 4;
      return NextResponse.json({ 
        error: "密码错误",
        remainingAttempts,
        message: remainingAttempts > 0 
          ? `密码错误，还剩${remainingAttempts}次尝试机会` 
          : "由于多次登录失败，账号已被锁定15分钟，请稍后重试或联系管理员解锁。"
      }, { status: 401 });
    }

    // 登录成功，清除失败记录
    await clearLoginAttempts(username);

    // JWT中只包含必要的非敏感信息
    const token = signJwt({ 
      id: user.id, 
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7天过期
    });

    // 返回给前端的用户信息（不包含密码）
    const userInfo = { 
      id: user.id, 
      username: user.username, 
      name: user.name, 
      student_id: user.student_id, 
      role: user.role, 
      permissions: user.permissions 
    };

    // 设置 httpOnly cookie
    const response = NextResponse.json({ user: userInfo });
    response.headers.append(
      'Set-Cookie',
      `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`
    );
    return response;
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json({ 
      error: "登录失败，请稍后重试" 
    }, { status: 500 });
  }
}
