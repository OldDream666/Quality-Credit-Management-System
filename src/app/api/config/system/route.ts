import { NextResponse } from "next/server";
import { DatabaseConfigManager } from "@/lib/dbConfig";

// 获取系统配置（公开API，所有用户都可以访问）
export async function GET() {
  try {
    const configs = await DatabaseConfigManager.getAllConfigs();
    
    // 只返回前端需要的显示配置，不包含敏感的管理配置
    return NextResponse.json({
      roles: configs.roles || [],
      statuses: configs.statuses || [],
      creditTypes: configs.creditTypes || [],
      availableFields: configs.availableFields || []
    });
  } catch (error) {
    console.error('获取系统配置失败:', error);
    
    // 返回默认配置作为兜底
    return NextResponse.json({
      roles: [
        { key: 'admin', label: '管理员', color: 'bg-gray-300 text-gray-800', cardColor: 'from-gray-100 to-gray-200' },
        { key: 'monitor', label: '班长', color: 'bg-green-100 text-green-700', cardColor: 'from-green-100 to-green-200' },
        { key: 'league_secretary', label: '团支书', color: 'bg-yellow-100 text-yellow-700', cardColor: 'from-yellow-100 to-yellow-200' },
        { key: 'study_committee', label: '学习委员', color: 'bg-purple-100 text-purple-700', cardColor: 'from-purple-100 to-purple-200' },
        { key: 'student', label: '学生', color: 'bg-blue-100 text-blue-700', cardColor: 'from-blue-50 to-blue-100' }
      ],
      statuses: [
        { key: 'pending', label: '待审批', color: 'bg-yellow-100 text-yellow-700' },
        { key: 'approved', label: '已通过', color: 'bg-green-100 text-green-700' },
        { key: 'rejected', label: '已拒绝', color: 'bg-red-100 text-red-700' }
      ],
      creditTypes: [
        { key: '个人活动', label: '个人活动', color: 'bg-blue-100 text-blue-800', cardColor: 'from-blue-50 to-blue-100' },
        { key: '个人比赛', label: '个人比赛', color: 'bg-purple-100 text-purple-800', cardColor: 'from-purple-50 to-purple-100' },
        { key: '个人证书', label: '个人证书', color: 'bg-indigo-100 text-indigo-800', cardColor: 'from-indigo-50 to-indigo-100' },
        { key: '志愿活动', label: '志愿活动', color: 'bg-orange-100 text-orange-800', cardColor: 'from-orange-50 to-orange-100' }
      ],
      availableFields: []
    });
  }
}
