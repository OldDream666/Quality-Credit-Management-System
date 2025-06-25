import { NextResponse } from "next/server";
import pool from "@/lib/db";

// GET /api/credits/proof?id=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少id" }, { status: 400 });
  const result = await pool.query(
    "SELECT proof_file, proof_filename, proof_mimetype FROM credits WHERE id = $1",
    [id]
  );
  if (result.rowCount === 0 || !result.rows[0].proof_file) {
    return NextResponse.json({ error: "未找到文件" }, { status: 404 });
  }
  const { proof_file, proof_filename, proof_mimetype } = result.rows[0];
  return new Response(proof_file, {
    status: 200,
    headers: {
      "Content-Type": proof_mimetype || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(proof_filename)}`,
    },
  });
}
