import { NextResponse } from "next/server";
import pool from "@/lib/db";

// GET /api/credits/proof-list?credit_id=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const credit_id = searchParams.get("credit_id");
  if (!credit_id) return NextResponse.json({ error: "缺少credit_id" }, { status: 400 });
  const result = await pool.query(
    "SELECT id, filename, mimetype FROM credits_proofs WHERE credit_id = $1 ORDER BY id",
    [credit_id]
  );
  return NextResponse.json({ proofs: result.rows });
}
