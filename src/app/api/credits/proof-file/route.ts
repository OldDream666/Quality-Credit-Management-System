import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";

function bufferToBase64(buffer: Buffer) {
  return Buffer.from(buffer).toString('base64');
}

// GET /api/credits/proof-file?id=xxx 或 /api/credits/proof-file?ids=1,2,3
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const payload = verifyJwt(token);
  if (!payload || typeof payload === "string") {
    return NextResponse.json({ error: "无效 token" }, { status: 401 });
  }
  
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
    const canApproveRoles = ["admin", "monitor", "league_secretary", "study_committee"];
    const files = result.rows.map(row => {
      if (!(payload.id === row.user_id || canApproveRoles.includes(payload.role))) {
        return null;
      }
      return {
        id: row.id,
        file: bufferToBase64(row.file), // 转为base64
        filename: row.filename,
        mimetype: row.mimetype
      };
    }).filter(Boolean);

    if (files.length === 0) {
      return NextResponse.json({ error: "无权限访问文件" }, { status: 403 });
    }

    // 返回批量文件数据
    return NextResponse.json({ files });
  }

  // 单个文件获取（原有逻辑）
  if (!id) return NextResponse.json({ error: "缺少id" }, { status: 400 });
  
  // 查找 proof 及其关联的 credits
  const result = await pool.query(
    `SELECT p.file, p.filename, p.mimetype, c.user_id FROM credits_proofs p JOIN credits c ON p.credit_id = c.id WHERE p.id = $1`,
    [id]
  );
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "未找到文件" }, { status: 404 });
  }
  const { file, filename, mimetype, user_id } = result.rows[0];
  // 权限校验
  const canApproveRoles = [
    "admin",
    "monitor",
    "league_secretary",
    "study_committee",
  ];
  if (!(payload.id === user_id || canApproveRoles.includes(payload.role))) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  return new Response(file, {
    status: 200,
    headers: {
      "Content-Type": mimetype || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
