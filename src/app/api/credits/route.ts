import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireCreditSubmit } from "@/lib/auth";
import { validateObject, validationRules } from "@/lib/validation";
import { DatabaseConfigManager } from "@/lib/dbConfig";
import { CreditType } from "@/types";

// 文件类型验证
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'application/pdf'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 学分申请提交
export const POST = requireCreditSubmit(async (req, user) => {
  try {
    // 解析 multipart/form-data
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: "请使用表单上传" }, { status: 400 });
    }
    
    const formData = await req.formData();
    const type = formData.get('type') as string;
    const files = formData.getAll('proof');
    const activityName = formData.get('activityName') as string;
    const competitionName = formData.get('competitionName') as string;
    const certificateName = formData.get('certificateName') as string;
    const volunteerName = formData.get('volunteerName') as string;
    const volunteerHours = formData.get('volunteerHours') as string;

    // 动态获取可用的学分类型
    const creditTypes = await DatabaseConfigManager.getAllCreditTypes();
    const availableTypes = creditTypes.length > 0 
      ? creditTypes.map(ct => ct.key)
      : ['个人活动', '个人比赛', '个人证书', '志愿活动']; // 兜底配置

    // 验证学分类型是否合法
    if (!availableTypes.includes(type)) {
      return NextResponse.json({ 
        error: "无效的学分类型", 
        details: [`学分类型必须是以下值之一: ${availableTypes.join(', ')}`]
      }, { status: 400 });
    }

    // 动态字段校验和组装
    const typeConfig = creditTypes.find(ct => ct.key === type);
    const descObj: any = {};
    if (typeConfig?.fields) {
      for (const field of typeConfig.fields) {
        const fieldKey = typeof field === 'string' ? field : field.key;
        const value = formData.get(fieldKey);
        if (value !== null && value !== undefined && value !== "") {
          descObj[fieldKey] = value;
        }
      }
    }

    // 输入验证
    const validationData: any = { type };
    if (type === '个人活动') validationData.activityName = activityName;
    if (type === '个人比赛') validationData.competitionName = competitionName;
    if (type === '个人证书') validationData.certificateName = certificateName;
    if (type === '志愿活动') {
      validationData.volunteerName = volunteerName;
      validationData.volunteerHours = volunteerHours;
    }

    const validation = validateObject(validationData, {
      // 不再使用包含enum的creditType规则，type已在上面验证过
      activityName: type === '个人活动' ? validationRules.activityName : { required: false },
      competitionName: type === '个人比赛' ? validationRules.competitionName : { required: false },
      certificateName: type === '个人证书' ? validationRules.certificateName : { required: false },
      volunteerName: type === '志愿活动' ? validationRules.volunteerName : { required: false },
      volunteerHours: type === '志愿活动' ? validationRules.volunteerHours : { required: false },
    });

    if (!validation.isValid) {
      return NextResponse.json({ 
        error: "输入验证失败", 
        details: validation.errors 
      }, { status: 400 });
    }

    // 文件验证
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "请上传证明材料" }, { status: 400 });
    }

    // 验证每个文件
    for (const file of files) {
      if (file && typeof file === 'object' && 'arrayBuffer' in file && 'name' in file && 'type' in file) {
        const fileObj = file as File;
        
        // 检查文件类型
        if (!ALLOWED_FILE_TYPES.includes(fileObj.type)) {
          return NextResponse.json({ 
            error: `不支持的文件类型: ${fileObj.name}` 
          }, { status: 400 });
        }
        
        // 检查文件大小
        if (fileObj.size > MAX_FILE_SIZE) {
          return NextResponse.json({ 
            error: `文件过大: ${fileObj.name}` 
          }, { status: 400 });
        }
      }
    }

    // 开始事务
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 插入 credits 主表，score为null，description存json
      const result = await client.query(
        'INSERT INTO credits (user_id, type, score, status, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [user.id, type, null, 'pending', JSON.stringify(descObj)]
      );
      const credit = result.rows[0];

      // 插入所有证明材料
      for (const file of files) {
        if (file && typeof file === 'object' && 'arrayBuffer' in file && 'name' in file && 'type' in file) {
          const fileObj = file as File;
          const buf = Buffer.from(await fileObj.arrayBuffer());
          await client.query(
            'INSERT INTO credits_proofs (credit_id, file, filename, mimetype) VALUES ($1, $2, $3, $4)',
            [credit.id, buf, fileObj.name, fileObj.type]
          );
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ 
        credit,
        message: "申请提交成功，等待审批"
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('学分申请提交错误:', error);
    return NextResponse.json({ 
      error: "提交失败，请稍后重试" 
    }, { status: 500 });
  }
});

// 查询本人所有学分申请
export const GET = requireAuth(async (req, user) => {
  try {
    // 获取学分申请和证明材料
    const result = await pool.query(`
      SELECT c.*, 
             COUNT(cp.id) as proof_count
      FROM credits c
      LEFT JOIN credits_proofs cp ON c.id = cp.credit_id
      WHERE c.user_id = $1 
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [user.id]);

    return NextResponse.json({ credits: result.rows });
  } catch (error) {
    console.error('查询学分申请错误:', error);
    return NextResponse.json({ 
      error: "查询失败，请稍后重试" 
    }, { status: 500 });
  }
});
