import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from '@/lib/auth';
import { DatabaseConfigManager } from "@/lib/dbConfig";
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { storage } from "@/lib/storage";

// 导出历史审批数据
export const GET = requireAuth(async (req, user) => {
  try {
    // 检查权限
    const userRes = await pool.query('SELECT id, role, class FROM users WHERE id = $1', [user.id]);
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 403 });
    }
    const currentUser = userRes.rows[0];
    const roleConfig = await DatabaseConfigManager.getRoleConfig(currentUser.role);
    if (!roleConfig) {
      return NextResponse.json({ error: "角色配置不存在" }, { status: 403 });
    }
    const permissions = Array.isArray(roleConfig.permissions) ? roleConfig.permissions : [];
    const canView = currentUser.role === 'admin' || permissions.includes('credits.view') || permissions.includes('system.admin');
    if (!canView) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 获取查询参数
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');
    const statusFilter = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const onlyMine = searchParams.get('onlyMine') === 'true';

    // 构建查询条件
    let whereConditions = ["c.status != 'pending'"];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (onlyMine && currentUser.role !== 'admin') {
      whereConditions.push(`c.approver_id = $${paramIndex}`);
      queryParams.push(currentUser.id);
      paramIndex++;
    }

    if (typeFilter) {
      whereConditions.push(`c.type = $${paramIndex}`);
      queryParams.push(typeFilter);
      paramIndex++;
    }

    if (statusFilter) {
      whereConditions.push(`c.status = $${paramIndex}`);
      queryParams.push(statusFilter);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`(c.approved_at >= $${paramIndex} OR c.created_at >= $${paramIndex})`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`(c.approved_at <= $${paramIndex} OR c.created_at <= $${paramIndex})`);
      queryParams.push(dateTo + ' 23:59:59');
      paramIndex++;
    }

    // 根据用户角色限制查询范围
    let query = `
      SELECT 
        c.*,
        u.name AS user_name,
        u.username AS user_username,
        u.student_id,
        u.class AS user_class,
        approver.name AS approver_name
      FROM credits c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users approver ON c.approver_id = approver.id
    `;

    if (currentUser.role !== 'admin') {
      whereConditions.push(`u.class = $${paramIndex}`);
      queryParams.push(currentUser.class);
      paramIndex++;
    }
    // 班长不过滤类型，其他班委按类型过滤
    if (currentUser.role !== 'admin' && currentUser.role !== 'monitor') {
      const allCreditTypes = await DatabaseConfigManager.getAllCreditTypes();
      const approvableTypes = allCreditTypes.filter(ct => Array.isArray(ct.approverRoles) && ct.approverRoles.includes(currentUser.role)).map(ct => ct.key);
      if (approvableTypes.length > 0) {
        whereConditions.push(`c.type = ANY($${paramIndex})`);
        queryParams.push(approvableTypes);
        paramIndex++;
      } else {
        // 没有权限类型，直接返回空
        return NextResponse.json({ error: "无可导出的审批数据" }, { status: 403 });
      }
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await pool.query(query, queryParams);
    const credits = result.rows;

    // 获取证明材料
    const creditIds = credits.map(c => c.id);
    let proofsMap: Record<number, any[]> = {};
    if (creditIds.length > 0) {
      // 修改查询：同时获取 file_path
      const proofsRes = await pool.query(`
        SELECT p.id, p.credit_id, p.filename, p.mimetype, p.file, pp.file_path 
        FROM credits_proofs p
        LEFT JOIN proof_paths pp ON p.id = pp.proof_id
        WHERE p.credit_id = ANY($1) 
        ORDER BY p.id
      `, [creditIds]);

      proofsMap = proofsRes.rows.reduce((acc: any, p: any) => {
        if (!acc[p.credit_id]) acc[p.credit_id] = [];
        acc[p.credit_id].push(p);
        return acc;
      }, {});
    }

    // 按用户分组统计数据
    const userStats: Record<string, any> = {};
    credits.forEach(credit => {
      const userId = credit.user_id;
      const userName = credit.user_name || credit.user_username;

      if (!userStats[userId]) {
        userStats[userId] = {
          user_id: userId,
          user_name: userName,
          user_username: credit.user_username,
          student_id: credit.student_id,
          user_class: credit.user_class,
          type_stats: {},
          total_score: 0,
          total_submissions: 0,
          approved_submissions: 0,
          rejected_submissions: 0
        };
      }

      const stats = userStats[userId];
      stats.total_submissions++;

      if (!stats.type_stats[credit.type]) {
        stats.type_stats[credit.type] = {
          submissions: 0,
          approved: 0,
          score: 0
        };
        if (credit.type === '志愿活动') {
          stats.type_stats[credit.type].volunteer_total_hours = 0;
        }
      }
      stats.type_stats[credit.type].submissions++;

      if (credit.status === 'approved') {
        stats.approved_submissions++;
        stats.total_score += Number(credit.score) || 0;
        stats.type_stats[credit.type].approved++;
        stats.type_stats[credit.type].score += Number(credit.score) || 0;
        if (credit.type === '志愿活动') {
          // 解析description中的volunteerHours
          let hours = 0;
          try {
            if (credit.description) {
              const desc = typeof credit.description === 'string' ? JSON.parse(credit.description) : credit.description;
              hours = Number(desc.volunteerHours) || 0;
            }
          } catch { }
          stats.type_stats[credit.type].volunteer_total_hours += hours;
        }
      } else if (credit.status === 'rejected') {
        stats.rejected_submissions++;
      }
    });

    // 用 exceljs 生成 Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('历史审批数据');

    // 统计所有类型，动态生成表头
    const allTypes = Array.from(new Set(credits.map(c => c.type)));
    const columns = [
      { header: '姓名', key: 'user_name', width: 15 },
      { header: '学号', key: 'user_username', width: 15 },
      { header: '班级', key: 'user_class', width: 15 },
      { header: '总提交次数', key: 'total_submissions', width: 15 },
      { header: '已通过次数', key: 'approved_submissions', width: 15 },
      { header: '已拒绝次数', key: 'rejected_submissions', width: 15 },
      { header: '总获得分数', key: 'total_score', width: 15 },
    ];
    allTypes.forEach(type => {
      columns.push({ header: `${type}_通过次数`, key: `${type}_approved`, width: 15 });
      if (type === '志愿活动') {
        columns.push({ header: '志愿活动_总时长', key: 'volunteer_total_hours', width: 15 });
      }
      columns.push({ header: `${type}_获得分数`, key: `${type}_score`, width: 15 });
    });
    worksheet.columns = columns;

    // 填充数据
    Object.values(userStats).forEach((user: any) => {
      const row: any = {
        user_name: user.user_name,
        user_username: user.user_username,
        user_class: user.user_class,
        total_submissions: user.total_submissions,
        approved_submissions: user.approved_submissions,
        rejected_submissions: user.rejected_submissions,
        total_score: user.total_score,
      };
      allTypes.forEach(type => {
        row[`${type}_approved`] = 0;
        row[`${type}_score`] = 0;
        if (user.type_stats[type]) {
          row[`${type}_approved`] = user.type_stats[type].approved || 0;
          row[`${type}_score`] = user.type_stats[type].score || 0;
        }
        if (type === '志愿活动') {
          // 统计志愿活动总时长
          row['volunteer_total_hours'] = user.type_stats[type]?.volunteer_total_hours || 0;
        }
      });
      worksheet.addRow(row);
    });

    // 生成 Excel buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // 创建ZIP文件包含Excel和证明材料
    const zip = new JSZip();

    // 添加Excel文件
    zip.file('历史审批数据.xlsx', excelBuffer);

    // 添加证明材料文件（并行处理以提高速度）
    const downloadPromises: Promise<void>[] = [];

    Object.values(userStats).forEach((user: any) => {
      const userName = user.user_name || user.user_username;
      credits.forEach(credit => {
        if (credit.user_id === user.user_id && credit.status === 'approved') {
          const proofs = proofsMap[credit.id] || [];
          const typeFolder = zip.folder(credit.type);
          if (!typeFolder) return;
          const userFolder = typeFolder.folder(userName);
          if (!userFolder) return;

          proofs.forEach((proof: any) => {
            downloadPromises.push(async function () {
              let fileContent = proof.file;
              // 如果数据库中二进制为空，则尝试从 storage 获取
              if ((!fileContent || fileContent.length === 0) && proof.file_path) {
                try {
                  const fetched = await storage.getFile(proof.file_path);
                  if (fetched) fileContent = fetched;
                } catch (e) {
                  console.error(`Failed to download file for proof ${proof.id}:`, e);
                }
              }

              if (fileContent && fileContent.length > 0) {
                userFolder.file(proof.filename, fileContent);
              }
            }());
          });
        }
      });
    });

    // 停止等待所有下载完成，改为直接使用 generateNodeStream 流式传输
    // 但是目前代码逻辑是先下载后压缩，为了稳妥起见，保留 await Promise.all
    // 这样至少保证文件都已在内存中（Inputs），主要解决的是输出 Buffer (Output) 过大导致内存溢出或 Response Payload 限制问题
    await Promise.all(downloadPromises);

    // 使用 generateNodeStream 而不是 generateAsync，避免在内存中构建巨大的完整 ZIP Buffer
    const stream = zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true });

    // 将 Node.js Stream 转换为 Web ReadableStream
    const readable = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      }
    });

    // 返回流式响应，避免 Vercel 4.5MB/6MB 的响应体限制
    const exportName = `历史审批数据_${new Date().toISOString().split('T')[0]}.zip`;
    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=export.zip; filename*=UTF-8''${encodeURIComponent(exportName)}`
      }
    });

  } catch (error) {
    console.error('导出失败:', error);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  }
}); 