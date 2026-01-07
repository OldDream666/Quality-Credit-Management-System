import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import { DatabaseConfigManager } from "@/lib/dbConfig";
import { requireAuth } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import { storage } from "@/lib/storage";

function bufferToBase64(buffer: Buffer) {
  return Buffer.from(buffer).toString('base64');
}

// GET /api/credits/proof-file?id=xxx 或 /api/credits/proof-file?ids=1,2,3
export const GET = requireAuth(async (req, user) => {
  try {
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
      // 批量查询文件
      const result = await pool.query(
        `SELECT p.id, p.file, p.filename, p.mimetype, c.user_id, pp.file_path
         FROM credits_proofs p 
         JOIN credits c ON p.credit_id = c.id 
         LEFT JOIN proof_paths pp ON p.id = pp.proof_id
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

      const files = await Promise.all(result.rows.map(async (row) => {
        if (!(user.id === row.user_id || canViewFiles)) {
          return null;
        }

        // 优先从文件系统/云存储读取
        let fileContent = row.file;
        if (row.file_path) {
          const content = await storage.getFile(row.file_path);
          if (content) {
            fileContent = content;
          }
        }

        // 如果文件内容为空（如DB中已清空且文件丢失），则无法提供
        if (!fileContent || fileContent.length === 0) return null;

        return {
          id: row.id,
          file: bufferToBase64(fileContent),
          filename: row.filename,
          mimetype: row.mimetype
        };

        // 如果文件内容为空（如DB中已清空且文件丢失），则无法提供
        if (!fileContent || fileContent.length === 0) return null;

        return {
          id: row.id,
          file: bufferToBase64(fileContent),
          filename: row.filename,
          mimetype: row.mimetype
        };
      }));

      const validFiles = files.filter(Boolean);
      if (validFiles.length === 0) {
        return NextResponse.json({ error: "无权限访问文件或文件不存在" }, { status: 403 });
      }
      return NextResponse.json({ files: validFiles });
    }
    // 单个文件获取
    if (!id) return NextResponse.json({ error: "缺少id" }, { status: 400 });
    const result = await pool.query(
      `SELECT p.file, p.filename, p.mimetype, c.user_id, pp.file_path 
       FROM credits_proofs p 
       JOIN credits c ON p.credit_id = c.id 
       LEFT JOIN proof_paths pp ON p.id = pp.proof_id
       WHERE p.id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "未找到文件" }, { status: 404 });
    }
    const { file, filename, mimetype, user_id, file_path } = result.rows[0];
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

    // 优化：如果是远程文件（如Blob），直接重定向，减轻服务器压力并加速
    if (file_path && (file_path.startsWith('http://') || file_path.startsWith('https://'))) {
      return NextResponse.redirect(file_path);
    }

    // 优先从文件系统读取 (本地存储)
    let fileBody = file;
    if (file_path) {
      const content = await storage.getFile(file_path);
      if (content) {
        fileBody = content;
      }
    }

    // 直接返回二进制流（用 NextResponse）
    const res = new NextResponse(fileBody, {
      status: 200,
      headers: {
        'Content-Type': mimetype,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`
      }
    });
    return res;
  } catch (err) {
    console.error('proof-file接口异常:', err);
    return NextResponse.json({ error: '服务器内部错误', detail: String(err) }, { status: 500 });
  }
});
