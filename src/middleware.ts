import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/jwt';
import { rateLimit } from '@/lib/rateLimit';

// 需要认证的路由
const protectedRoutes = [
  '/dashboard',
  '/credits',
  '/profile',
  '/admin'
];

// 需要管理员权限的路由
const adminRoutes = [
  '/admin/users',
  '/admin/notices'
];

// 需要班委权限的路由
const approverRoutes = [
  '/admin/credits'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 速率限制检查
  const rateLimitResult = rateLimit(request);
  if (rateLimitResult) return rateLimitResult;
  
  // 检查是否是受保护的路由
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  const isAdminRoute = adminRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  const isApproverRoute = approverRoutes.some(route => 
    pathname.startsWith(route)
  );

  // 获取token
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  // 如果是受保护的路由但没有token，重定向到登录页
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 如果有token，验证权限
  if (token) {
    try {
      const payload = verifyJwt(token); 
      if (payload && typeof payload !== 'string') {
        // 检查管理员权限 - 在中间件层做基本检查，具体权限在API层验证
        if (isAdminRoute && payload.role !== 'admin') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        // 检查审批权限 - 在中间件层做基本检查，具体权限在API层验证
        if (isApproverRoute) {
          const commonApproverRoles = ['admin', 'monitor', 'league_secretary', 'study_committee'];
          if (!commonApproverRoles.includes(payload.role)) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
        }
      }
    } catch (error) {
      // token无效，清除cookie并重定向到登录页
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      return response;
    }
  }

  // 添加安全响应头
  const response = NextResponse.next();
  
  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // 禁止在iframe中加载
  response.headers.set('X-Frame-Options', 'DENY');
  
  // 内容类型嗅探保护
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // 严格传输安全
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // 引用策略
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 内容安全策略
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self'; " +
    "connect-src 'self';"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了以下开头的:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 