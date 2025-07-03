import { NextResponse } from "next/server";
import { DatabaseConfigManager } from "@/lib/dbConfig";

// 默认学分类型选项（作为兜底）
const DEFAULT_CREDIT_TYPE_OPTIONS = [
  { value: '个人活动', label: '个人活动' },
  { value: '个人比赛', label: '个人比赛' },
  { value: '个人证书', label: '个人证书' },
  { value: '志愿活动', label: '志愿活动' }
];

// 获取学分类型配置（公开API，不需要管理员权限）
export async function GET() {
  try {
    // 先尝试从数据库获取配置
    const creditTypes = await DatabaseConfigManager.getAllCreditTypes();
    
    if (creditTypes && creditTypes.length > 0) {
      // 数据库中有配置，使用数据库配置
      const typeOptions = creditTypes.map(type => ({
        value: type.key,
        label: type.label
      }));
      
      return NextResponse.json({
        types: creditTypes,
        options: typeOptions
      });
    } else {
      // 数据库中没有配置，返回默认配置
      return NextResponse.json({
        types: [], // 空的类型配置，前端会使用默认配置
        options: DEFAULT_CREDIT_TYPE_OPTIONS,
        fallback: true
      });
    }
  } catch (error) {
    console.error('获取学分类型配置失败:', error);
    
    // 出错时使用默认配置作为后备
    return NextResponse.json({
      types: [],
      options: DEFAULT_CREDIT_TYPE_OPTIONS,
      fallback: true,
      error: '获取数据库配置失败，使用默认配置'
    });
  }
}
