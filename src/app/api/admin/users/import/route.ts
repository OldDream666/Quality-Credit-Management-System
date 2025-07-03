import { NextResponse } from "next/server";
import pool from "@/lib/db";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import { requireRole } from '@/lib/auth';

// 本地角色选项配置
const ROLE_OPTIONS = [
  { value: 'student', label: '学生' },
  { value: 'monitor', label: '班长' },
  { value: 'league_secretary', label: '团支书' },
  { value: 'study_committee', label: '学委' },
  { value: 'admin', label: '管理员' }
];

export const config = {
  maxRequestBodySize: '10mb',
};

export const POST = requireRole(['admin'])(async (req, user) => {
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
  const validRoles = ROLE_OPTIONS.map(role => role.value);
  // 中文角色映射
  const roleMap: Record<string, string> = {
    "学生": "student",
    "班长": "monitor",
    "团支书": "league_secretary",
    "学习委员": "study_committee",
    "管理员": "admin"
  };
  const users = data
    .filter(row => {
      if (!Array.isArray(row) || row.length < 3) return false;
      const keywords = ["姓名", "学号", "角色", "年级", "专业", "班级"];
      const normalize = (s: any) => typeof s === 'string' ? s.replace(/[\s\u3000\r\n]+/g, '').replace(/[:：]/g, ':') : '';
      if (row.some(cell => {
        const val = normalize(cell);
        return keywords.some(k => val.includes(k));
      })) return false;
      if (row.every(cell => cell === undefined || cell === null || (typeof cell === 'string' && cell.replace(/[\s\u3000\r\n]+/g, '') === ''))) return false;
      if (!row[1] || !row[2]) return false;
      return true;
    })
    .map(row => {
      const [name, student_id, roleRaw, grade, major, className] = row as any[];
      let role = typeof roleRaw === 'string' ? roleRaw.replace(/[\s\u3000\r\n]+/g, '').trim() : '';
      role = roleMap[role] || role.toLowerCase();
      const username = student_id || '';
      return { username, name, student_id, role, grade, major, class: className };
    });
  const results = [];
  // 只校验学号类账号的唯一性，跳过 admin 等特殊账号
  const isStudentAccount = (u: { username: string; student_id: string }) => u.username && u.student_id && /^\d+$/.test(u.username) && u.username === u.student_id;
  const existRes = await pool.query('SELECT username, student_id FROM users');
  const existUsernames = new Set(existRes.rows.filter(isStudentAccount).map(r => r.username));
  const existStudentIds = new Set(existRes.rows.filter(isStudentAccount).map(r => r.student_id));
  const importUsernames = new Set();
  const importStudentIds = new Set();
  for (const u of users) {
    if (!isStudentAccount(u)) {
      results.push({ ...u, error: '只允许用户名和学号都用学号，且必须一致' });
      continue;
    }
    if (existUsernames.has(u.username) && !existStudentIds.has(u.student_id)) {
      results.push({ ...u, error: '用户名已被其他学号占用' });
      continue;
    }
    if (existStudentIds.has(u.student_id) && !existUsernames.has(u.username)) {
      results.push({ ...u, error: '学号已被其他用户名占用' });
      continue;
    }
    if (importUsernames.has(u.username) || importStudentIds.has(u.student_id)) {
      results.push({ ...u, error: '导入文件中用户名或学号重复' });
      continue;
    }
    importUsernames.add(u.username);
    importStudentIds.add(u.student_id);
    if (!u.username) { results.push({ ...u, error: '缺少学号' }); continue; }
    if (!u.role) { results.push({ ...u, error: '缺少角色' }); continue; }
    if (!validRoles.includes(u.role as any)) { results.push({ ...u, error: '角色必须为 学生/班长/团支书/学习委员/管理员' }); continue; }
    try {
      let gradeId = null;
      if (u.grade) {
        let gradeRes = await pool.query('SELECT id FROM grades WHERE name=$1', [u.grade]);
        gradeId = gradeRes.rows[0]?.id;
        if (!gradeId) {
          const ins = await pool.query('INSERT INTO grades (name) VALUES ($1) RETURNING id', [u.grade]);
          gradeId = ins.rows[0].id;
        }
      }
      let majorId = null;
      if (u.major) {
        let majorRes = await pool.query('SELECT id FROM majors WHERE name=$1', [u.major]);
        majorId = majorRes.rows[0]?.id;
        if (!majorId) {
          const ins = await pool.query('INSERT INTO majors (name) VALUES ($1) RETURNING id', [u.major]);
          majorId = ins.rows[0].id;
        }
      }
      let classId = null;
      if (u.class && gradeId && majorId) {
        let classRes = await pool.query('SELECT id FROM classes WHERE name=$1 AND grade_id=$2 AND major_id=$3', [u.class, gradeId, majorId]);
        classId = classRes.rows[0]?.id;
        if (!classId) {
          const ins = await pool.query('INSERT INTO classes (name, grade_id, major_id) VALUES ($1, $2, $3) RETURNING id', [u.class, gradeId, majorId]);
          classId = ins.rows[0].id;
        }
      }
      const initialPassword = u.username;
      const hashedPassword = await bcrypt.hash(initialPassword, 10);
      // 判断是否已存在
      const existRes = await pool.query('SELECT id FROM users WHERE student_id=$1', [u.student_id]);
      let status = '';
      if (existRes.rows.length > 0) {
        // 已存在，更新
        await pool.query(
          `UPDATE users SET username=$1, name=$2, role=$3, grade=$4, major=$5, class=$6, password=$7 WHERE student_id=$8`,
          [u.username, u.name || null, u.role, u.grade || null, u.major || null, u.class || null, hashedPassword, u.student_id]
        );
        status = '更新';
      } else {
        // 新增
        await pool.query(
          `INSERT INTO users (username, name, student_id, role, grade, major, class, password)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [u.username, u.name || null, u.student_id || null, u.role, u.grade || null, u.major || null, u.class || null, hashedPassword]
        );
        status = '新增';
      }
      results.push({ ...u, status: status });
    } catch (error: any) {
      console.error('导入单条用户出错:', error);
      results.push({ ...u, error: error?.message || error?.code || JSON.stringify(error) || '导入失败' });
    }
  }
  return NextResponse.json({ results });
});
