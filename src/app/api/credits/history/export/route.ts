import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from '@/lib/auth';
import { DatabaseConfigManager } from "@/lib/dbConfig";
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

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
      const proofsRes = await pool.query(
        'SELECT id, credit_id, filename, mimetype, file FROM credits_proofs WHERE credit_id = ANY($1) ORDER BY id',
        [creditIds]
      );
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
          } catch {}
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

    // 添加证明材料文件
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
            userFolder.file(proof.filename, proof.file);
          });
        }
      });
    });

    // 生成ZIP文件
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // 返回ZIP文件
    const exportName = `历史审批数据_${new Date().toISOString().split('T')[0]}.zip`;
    return new NextResponse(zipBuffer, {
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