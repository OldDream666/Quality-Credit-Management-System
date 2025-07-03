import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { DatabaseConfigManager } from "@/lib/dbConfig";
import pool from '@/lib/db';

// 获取系统配置
export const GET = requireAdmin(async function(req, user) {
  try {
    const configs = await DatabaseConfigManager.getAllConfigs();
    return NextResponse.json(configs);
  } catch (error) {
    console.error('获取系统配置失败:', error);
    return NextResponse.json({ 
      error: "获取配置失败，请稍后重试" 
    }, { status: 500 });
  }
});

// 更新系统配置
export const POST = requireAdmin(async function(req, user) {
  try {
    const { type, config } = await req.json();
    
    switch (type) {
      case 'role':
        const roleValidation = DatabaseConfigManager.validateRoleConfig(config);
        if (!roleValidation.valid) {
          return NextResponse.json({ 
            error: "配置验证失败", 
            details: roleValidation.errors 
          }, { status: 400 });
        }
        await DatabaseConfigManager.saveRoleConfig(config);
        break;
        
      case 'creditType':
        const creditTypeValidation = DatabaseConfigManager.validateCreditTypeConfig(config);
        if (!creditTypeValidation.valid) {
          return NextResponse.json({ 
            error: "配置验证失败", 
            details: creditTypeValidation.errors 
          }, { status: 400 });
        }
        await DatabaseConfigManager.saveCreditTypeConfig(config);
        break;
        
      case 'status':
        const statusValidation = DatabaseConfigManager.validateStatusConfig(config);
        if (!statusValidation.valid) {
          return NextResponse.json({ 
            error: "配置验证失败", 
            details: statusValidation.errors 
          }, { status: 400 });
        }
        await DatabaseConfigManager.saveStatusConfig(config);
        break;
        
      case 'availableFields':
        if (!Array.isArray(config)) {
          return NextResponse.json({ error: "字段配置必须为数组" }, { status: 400 });
        }
        await pool.query(`
          INSERT INTO system_config (category, config_key, config_value, updated_at)
          VALUES ('fields', 'available_fields', $1, CURRENT_TIMESTAMP)
          ON CONFLICT (category, config_key)
          DO UPDATE SET config_value = $1, updated_at = CURRENT_TIMESTAMP
        `, [JSON.stringify(config)]);
        break;
        
      default:
        return NextResponse.json({ 
          error: "不支持的配置类型" 
        }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: "配置更新成功" 
    });
  } catch (error) {
    console.error('更新系统配置失败:', error);
    return NextResponse.json({ 
      error: "更新配置失败，请稍后重试" 
    }, { status: 500 });
  }
});

// 删除配置
export const DELETE = requireAdmin(async function(req, user) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const key = searchParams.get('key');
    
    if (!type || !key) {
      return NextResponse.json({ 
        error: "缺少必要参数" 
      }, { status: 400 });
    }
    
    switch (type) {
      case 'role':
        await DatabaseConfigManager.deleteRoleConfig(key);
        break;
        
      case 'creditType':
        await DatabaseConfigManager.deleteCreditTypeConfig(key);
        break;
        
      case 'status':
        await DatabaseConfigManager.deleteStatusConfig(key);
        break;
        
      default:
        return NextResponse.json({ 
          error: "不支持的配置类型" 
        }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: "配置删除成功" 
    });
  } catch (error) {
    console.error('删除系统配置失败:', error);
    return NextResponse.json({ 
      error: "删除配置失败，请稍后重试" 
    }, { status: 500 });
  }
});
