import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";

export const config = {
  maxRequestBodySize: '10mb',
};

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const payload = verifyJwt(token);
  if (!payload || typeof payload === 'string' || payload.role !== 'admin') {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: "未上传文件" }, { status: 400 });
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];
  const rows: any[][] = [];
  worksheet.eachRow((row) => {
    const values = Array.isArray(row.values) ? row.values : [];
    rows.push(values.slice(1).map((cell: any) => cell == null ? '' : cell));
  });
  const [header, ...data] = rows;
  // 支持所有角色
  const validRoles = ["student", "monitor", "league_secretary", "study_committee", "admin"];
  // 中文角色映射
  const roleMap: Record<string, string> = {
    "学生": "student",
    "班长": "monitor",
    "团支书": "league_secretary",
    "学习委员": "study_committee",
    "管理员": "admin"
  };
  // 跳过表头和无效行（如提示行、空行、任意列包含关键字的行，兼容全角/半角/多余空格/换行/回车）
  const users = data
    .filter(row => {
      if (!Array.isArray(row) || row.length < 3) return false;
      // 跳过任意单元格包含"姓名""学号""角色"等关键字（兼容全角/半角/空格/换行/回车）
      const keywords = ["姓名", "学号", "角色", "年级", "专业", "班级"];
      const normalize = (s: any) => typeof s === 'string' ? s.replace(/[\s\u3000\r\n]+/g, '').replace(/[:：]/g, ':') : '';
      if (row.some(cell => {
        const val = normalize(cell);
        return keywords.some(k => val.includes(k));
      })) return false;
      // 跳过全空行、全 undefined、全空字符串、全空白字符
      if (row.every(cell => cell === undefined || cell === null || (typeof cell === 'string' && cell.replace(/[\s\u3000\r\n]+/g, '') === ''))) return false;
      // 必须有学号和角色
      if (!row[1] || !row[2]) return false;
      return true;
    })
    .map(row => {
      // 按顺序：姓名、学号、角色、年级、专业、班级
      const [name, student_id, roleRaw, grade, major, className] = row as any[];
      // 角色字段标准化（去除所有空白、全角空格、换行、回车）
      let role = typeof roleRaw === 'string' ? roleRaw.replace(/[\s\u3000\r\n]+/g, '').trim() : '';
      // 支持中文角色自动映射
      role = roleMap[role] || role.toLowerCase();
      const username = student_id || '';
      return { username, name, student_id, role, grade, major, class: className };
    });
  const results = [];
  for (const u of users) {
    if (!u.username) { results.push({ ...u, error: '缺少学号' }); continue; }
    if (!u.role) { results.push({ ...u, error: '缺少角色' }); continue; }
    if (!validRoles.includes(u.role)) { results.push({ ...u, error: '角色必须为 学生/班长/团支书/学习委员/管理员' }); continue; }
    try {
      // 自动补全年级
      let gradeId = null;
      if (u.grade) {
        let gradeRes = await pool.query('SELECT id FROM grades WHERE name=$1', [u.grade]);
        gradeId = gradeRes.rows[0]?.id;
        if (!gradeId) {
          const ins = await pool.query('INSERT INTO grades (name) VALUES ($1) RETURNING id', [u.grade]);
          gradeId = ins.rows[0].id;
        }
      }
      // 自动补全专业
      let majorId = null;
      if (u.major) {
        let majorRes = await pool.query('SELECT id FROM majors WHERE name=$1', [u.major]);
        majorId = majorRes.rows[0]?.id;
        if (!majorId) {
          const ins = await pool.query('INSERT INTO majors (name) VALUES ($1) RETURNING id', [u.major]);
          majorId = ins.rows[0].id;
        }
      }
      // 自动补全班级
      let classId = null;
      if (u.class && gradeId && majorId) {
        let classRes = await pool.query('SELECT id FROM classes WHERE name=$1 AND grade_id=$2 AND major_id=$3', [u.class, gradeId, majorId]);
        classId = classRes.rows[0]?.id;
        if (!classId) {
          const ins = await pool.query('INSERT INTO classes (name, grade_id, major_id) VALUES ($1, $2, $3) RETURNING id', [u.class, gradeId, majorId]);
          classId = ins.rows[0].id;
        }
      }

      // 使用学号作为初始密码，并进行加密
      const initialPassword = u.username;
      const hashedPassword = await bcrypt.hash(initialPassword, 10);

      await pool.query(
        'INSERT INTO users (username, name, student_id, role, grade, major, class, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [u.username, u.name || null, u.student_id || null, u.role, u.grade || null, u.major || null, u.class || null, hashedPassword]
      );
      results.push({ ...u, status: '导入成功' });
    } catch (error: any) {
      if (error.code === '23505') {
        results.push({ ...u, error: '用户名或学号已存在' });
      } else {
        results.push({ ...u, error: error.message || '导入失败' });
      }
    }
  }

  return NextResponse.json({ results });
}
