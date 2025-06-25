import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const WINDOW_SIZE = 60 * 1000; // 1分钟
const MAX_REQUESTS = 100; // 每个IP每分钟最大请求数

interface RequestLog {
  count: number;
  firstRequest: number;
}

const requestLogs = new Map<string, RequestLog>();

// 清理过期的请求记录
setInterval(() => {
  const now = Date.now();
  for (const [ip, log] of requestLogs.entries()) {
    if (now - log.firstRequest > WINDOW_SIZE) {
      requestLogs.delete(ip);
    }
  }
}, WINDOW_SIZE);

export function rateLimit(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  const now = Date.now();
  
  let requestLog = requestLogs.get(ip);
  if (!requestLog) {
    requestLog = { count: 1, firstRequest: now };
    requestLogs.set(ip, requestLog);
    return null;
  }

  // 检查是否在时间窗口内
  if (now - requestLog.firstRequest > WINDOW_SIZE) {
    requestLog.count = 1;
    requestLog.firstRequest = now;
    return null;
  }

  requestLog.count++;
  if (requestLog.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  return null;
} 