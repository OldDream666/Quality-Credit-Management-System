import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt';
import pool from '@/lib/db';

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  student_id: string;
  role: string;
  permissions: string[];
}

// 角色权限映射
export const ROLE_PERMISSIONS = {
  admin: ['*'] as const,
  monitor: ['credits.approve', 'credits.reject', 'credits.view', 'credits.submit', 'credits.view_own'] as const,
  league_secretary: ['credits.approve', 'credits.reject', 'credits.view', 'credits.submit', 'credits.view_own'] as const,
  study_committee: ['credits.approve', 'credits.reject', 'credits.view', 'credits.submit', 'credits.view_own'] as const,
  student: ['credits.submit', 'credits.view_own'] as const,
} as const;

// 锁定时间（秒）
export const LOCK_DURATION = 15 * 60; // 15分钟

// 检查登录失败次数
export async function checkLoginAttempts(username: string): Promise<{ allowed: boolean; remainingTime?: number }> {
  const MAX_ATTEMPTS = 5;
  
  // 清理过期记录
  await pool.query(
    'DELETE FROM login_attempts WHERE last_attempt < NOW() - INTERVAL \'15 minutes\''
  );
  
  // 获取当前记录
  const result = await pool.query(
    'SELECT count, EXTRACT(EPOCH FROM (NOW() - last_attempt)) as seconds_elapsed FROM login_attempts WHERE username = $1',
    [username]
  );

  if (result.rowCount === 0) {
    return { allowed: true };
  }

  const { count, seconds_elapsed } = result.rows[0];
  
  if (count >= MAX_ATTEMPTS) {
    const remainingTime = Math.max(0, LOCK_DURATION - Math.floor(seconds_elapsed));
    return { allowed: false, remainingTime };
  }

  return { allowed: true };
}

// 记录登录失败
export async function recordLoginFailure(username: string) {
  // 使用 upsert 语法更新或插入记录
  await pool.query(
    `INSERT INTO login_attempts (username, count, last_attempt)
     VALUES ($1, 1, NOW())
     ON CONFLICT (username)
     DO UPDATE SET 
       count = CASE 
         WHEN login_attempts.last_attempt < NOW() - INTERVAL '15 minutes' THEN 1
         ELSE login_attempts.count + 1
       END,
       last_attempt = NOW()`,
    [username]
  );
}

// 清除用户的登录尝试记录
export async function clearLoginAttempts(username: string) {
  const client = await pool.connect();
  try {
    await client.query(
      'DELETE FROM login_attempts WHERE username = $1',
      [username]
    );
  } finally {
    client.release();
  }
}

// 获取登录尝试记录
export async function getLoginAttempts(username: string) {
  const result = await pool.query(
    'SELECT count, last_attempt FROM login_attempts WHERE username = $1',
    [username]
  );
  
  if (result.rowCount === 0) {
    return null;
  }
  
  return {
    count: result.rows[0].count,
    lastAttempt: result.rows[0].last_attempt
  };
}

// 检查用户是否有指定权限
export function hasPermission(user: AuthUser, permission: string): boolean {
  if (user.role === 'admin') return true;
  
  const userPermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
  return (userPermissions as readonly string[]).includes(permission);
}

// 检查用户是否有指定角色
export function hasRole(user: AuthUser, roles: string[]): boolean {
  return roles.includes(user.role);
}

// 从请求中提取用户信息
export function extractUserFromRequest(req: NextRequest): AuthUser | null {
  // 优先用 header 里的 token，其次才用 cookie
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ||
                req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const payload = verifyJwt(token);
    if (payload && typeof payload !== 'string') {
      return payload as AuthUser;
    }
  } catch (error) {
    return null;
  }
  return null;
}

// API 权限验证中间件
export function requireAuth(handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const user = extractUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "未认证" }, { status: 401 });
    }
    
    return handler(req, user);
  };
}

// 需要特定权限的中间件
export function requirePermission(permission: string) {
  return (handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>) => {
    return async (req: NextRequest) => {
      const user = extractUserFromRequest(req);
      if (!user) {
        return NextResponse.json({ error: "未认证" }, { status: 401 });
      }
      
      if (!hasPermission(user, permission)) {
        return NextResponse.json({ error: "权限不足" }, { status: 403 });
      }
      
      return handler(req, user);
    };
  };
}

// 需要特定角色的中间件
export function requireRole(roles: string[]) {
  return (handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>) => {
    return async (req: NextRequest) => {
      const user = extractUserFromRequest(req);
      if (!user) {
        return NextResponse.json({ error: "未认证" }, { status: 401 });
      }
      
      if (!hasRole(user, roles)) {
        return NextResponse.json({ error: "权限不足" }, { status: 403 });
      }
      
      return handler(req, user);
    };
  };
}

// 管理员权限中间件
export const requireAdmin = requireRole(['admin']);

// 审批权限中间件
export const requireApprover = requireRole(['admin', 'monitor', 'league_secretary', 'study_committee']);

// 学分提交权限中间件
export const requireCreditSubmit = requirePermission('credits.submit');

// 学分审批权限中间件
export const requireCreditApprove = requirePermission('credits.approve'); 