import { NextRequest, NextResponse } from "next/server";
import pool from '@/lib/db';
import { extractUserFromRequest } from '@/lib/auth';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = extractUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: '未上传文件' }, { status: 400 });
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];
  const rows: string[][] = [];
  worksheet.eachRow((row) => {
    const values = Array.isArray(row.values) ? row.values : [];
    rows.push(values.slice(1).map((cell: any) => cell == null ? '' : cell));
  });
  if (!rows.length) return NextResponse.json({ error: '文件内容为空' }, { status: 400 });
  const header = rows[0];
  const data = rows.slice(1);
  // 检查表头
  if (!header || header[0] !== '年级' || header[1] !== '专业' || header[2] !== '班级') {
    return NextResponse.json({ error: '模板格式错误，表头应为：年级、专业、班级' }, { status: 400 });
  }
  const results = [];
  for (const row of data) {
    // 跳过全空、全空白、全undefined/null的行
    if (!Array.isArray(row) || row.length < 3 || row.every(cell => cell === undefined || cell === null || (typeof cell === 'string' && cell.replace(/\s|\u3000|\r|\n/g, '') === ''))) {
      continue;
    }
    const [grade, major, className] = row;
    if (!grade || !major || !className) {
      results.push({ success: false, message: `缺少数据：${JSON.stringify(row)}` });
      continue;
    }
    try {
      // 年级
      let gradeIdRes = await pool.query('SELECT id FROM grades WHERE name=$1', [grade]);
      let gradeId = gradeIdRes.rows[0]?.id;
      if (!gradeId) {
        const ins = await pool.query('INSERT INTO grades (name) VALUES ($1) RETURNING id', [grade]);
        gradeId = ins.rows[0].id;
      }
      // 专业
      let majorIdRes = await pool.query('SELECT id FROM majors WHERE name=$1', [major]);
      let majorId = majorIdRes.rows[0]?.id;
      if (!majorId) {
        const ins = await pool.query('INSERT INTO majors (name) VALUES ($1) RETURNING id', [major]);
        majorId = ins.rows[0].id;
      }
      // 班级
      let classRes = await pool.query('SELECT id FROM classes WHERE name=$1 AND grade_id=$2 AND major_id=$3', [className, gradeId, majorId]);
      if (!classRes.rows[0]) {
        await pool.query('INSERT INTO classes (name, grade_id, major_id) VALUES ($1, $2, $3)', [className, gradeId, majorId]);
        results.push({ success: true, message: `导入成功：${grade}-${major}-${className}` });
      } else {
        results.push({ success: false, message: `已存在：${grade}-${major}-${className}` });
      }
    } catch (e:any) {
      results.push({ success: false, message: `导入失败：${grade}-${major}-${className}，${e.message}` });
    }
  }
  return NextResponse.json({ results });
} 