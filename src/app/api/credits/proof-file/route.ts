import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import { DatabaseConfigManager } from "@/lib/dbConfig";
import { requireAuth, extractUserFromRequest } from '@/lib/auth';
import type { NextRequest } from 'next/server';

function bufferToBase64(buffer: Buffer) {
  return Buffer.from(buffer).toString('base64');
}

// GET /api/credits/proof-file?id=xxx 或 /api/credits/proof-file?ids=1,2,3
export async function GET(req: NextRequest) {
  try {
    const user = extractUserFromRequest(req);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");
    // 支持批量获取
    if (ids) {
      const idArray = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (idArray.length === 0) {
        return NextResponse.json({ error: "无效的ID列表" }, { status: 400 });
      }
      // 批量查询文件
      const result = await pool.query(
        `SELECT p.id, p.file, p.filename, p.mimetype, c.user_id 
         FROM credits_proofs p 
         JOIN credits c ON p.credit_id = c.id 
         WHERE p.id = ANY($1)`,
        [idArray]
      );
      if (result.rowCount === 0) {
        return NextResponse.json({ error: "未找到文件" }, { status: 404 });
      }
      // 权限校验
      const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [user.id]);
      if (userRes.rowCount === 0) {
        return NextResponse.json({ error: "用户不存在" }, { status: 403 });
      }
      const userRole = userRes.rows[0].role;
      const roleConfig = await DatabaseConfigManager.getRoleConfig(userRole);
      const permissions = Array.isArray(roleConfig?.permissions) ? roleConfig.permissions : [];
      const canViewFiles = permissions.includes('credits.view') || permissions.includes('system.admin');
      const files = result.rows.map(row => {
        if (!(user.id === row.user_id || canViewFiles)) {
          return null;
        }
        return {
          id: row.id,
          file: bufferToBase64(row.file),
          filename: row.filename,
          mimetype: row.mimetype
        };
      }).filter(Boolean);
      if (files.length === 0) {
        return NextResponse.json({ error: "无权限访问文件" }, { status: 403 });
      }
      return NextResponse.json({ files });
    }
    // 单个文件获取
    if (!id) return NextResponse.json({ error: "缺少id" }, { status: 400 });
    const result = await pool.query(
      `SELECT p.file, p.filename, p.mimetype, c.user_id FROM credits_proofs p JOIN credits c ON p.credit_id = c.id WHERE p.id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "未找到文件" }, { status: 404 });
    }
    const { file, filename, mimetype, user_id } = result.rows[0];
    const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [user.id]);
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 403 });
    }
    const userRole = userRes.rows[0].role;
    const roleConfig = await DatabaseConfigManager.getRoleConfig(userRole);
    const permissions = Array.isArray(roleConfig?.permissions) ? roleConfig.permissions : [];
    const canViewFiles = permissions.includes('credits.view') || permissions.includes('system.admin');
    if (!(user.id === user_id || canViewFiles)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }
    // 直接返回二进制流
    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': mimetype,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`
      }
    });
  } catch (err) {
    console.error('proof-file接口异常:', err);
    return NextResponse.json({ error: '服务器内部错误', detail: String(err) }, { status: 500 });
  }
}
