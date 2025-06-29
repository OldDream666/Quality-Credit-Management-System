import { NextRequest, NextResponse } from 'next/server';
import { generateRandomString } from './utils';

// CSRF Token 存储（生产环境应使用Redis等）
const csrfTokens = new Map<string, { token: string; expires: number }>();

// 生成CSRF Token
export function generateCSRFToken(): string {
  const token = generateRandomString(32);
  const expires = Date.now() + 30 * 60 * 1000; // 30分钟过期
  
  // 清理过期的token
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires < Date.now()) {
      csrfTokens.delete(key);
    }
  }
  
  return token;
}

// 验证CSRF Token
export function validateCSRFToken(token: string): boolean {
  const tokenData = csrfTokens.get(token);
  if (!tokenData) return false;
  
  if (tokenData.expires < Date.now()) {
    csrfTokens.delete(token);
    return false;
  }
  
  return true;
}

// CSRF中间件
export function withCSRF(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    // 只对POST、PUT、DELETE请求进行CSRF验证
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const csrfToken = req.headers.get('x-csrf-token') || 
                       req.nextUrl.searchParams.get('csrf_token');
      
      if (!csrfToken || !validateCSRFToken(csrfToken)) {
        return NextResponse.json({ 
          error: "CSRF验证失败" 
        }, { status: 403 });
      }
    }
    
    return handler(req);
  };
}

// 为响应添加CSRF Token
export function addCSRFToken(response: NextResponse): NextResponse {
  const token = generateCSRFToken();
  response.headers.set('x-csrf-token', token);
  return response;
} 