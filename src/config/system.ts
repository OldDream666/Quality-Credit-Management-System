/**
 * 系统配置管理
 * 类型定义、常量和工具函数
 * 所有配置数据完全依赖数据库
 */

import { UserRole, CreditType } from '@/types';

// ===== 类型定义 =====
export interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select';
  required?: boolean;
  description?: string;
}

export interface RoleConfig {
  key: UserRole;
  label: string;
  description: string;
  color: string; // 标签颜色（如 bg-gray-300 text-gray-800）
  cardColor: string; // 卡片背景渐变色（如 from-gray-100 to-gray-200）
  permissions: string[];
}

export interface CreditTypeConfig {
  key: CreditType;
  label: string;
  description: string;
  color: string; // 标签/边框颜色
  cardColor: string; // 卡片背景渐变色
  fields: (string | FieldConfig)[]; // 该类型需要的表单字段
  defaultScore?: number; // 默认分数
  scoreCalculation?: 'fixed' | 'time_based' | 'manual'; // 分数计算方式
  scorePerHour?: number; // 按时长计算时，每小时对应的分数
  approverRoles?: UserRole[]; // 新增：可审批该类型的角色
}

export interface StatusConfig {
  key: string;
  label: string;
  color: string;
}

export interface PermissionConfig {
  key: string;
  label: string;
  description: string;
  category: 'credit' | 'user' | 'notice' | 'system';
}

// ===== 系统常量 =====

// 审批角色列表
export const APPROVER_ROLES: UserRole[] = ['monitor', 'league_secretary', 'study_committee'];

// 管理员角色列表
export const ADMIN_ROLES: UserRole[] = ['admin'];

// 权限配置（不变的系统权限定义）
export const PERMISSIONS_CONFIG: Record<string, PermissionConfig> = {
  'credits.submit': {
    key: 'credits.submit',
    label: '提交学分申请',
    description: '可以提交学分申请',
    category: 'credit'
  },
  'credits.view_own': {
    key: 'credits.view_own',
    label: '查看个人学分',
    description: '可以查看自己的学分申请',
    category: 'credit'
  },
  'credits.view': {
    key: 'credits.view',
    label: '查看学分申请',
    description: '可以查看本班级的学分申请',
    category: 'credit'
  },
  'credits.approve': {
    key: 'credits.approve',
    label: '审批学分申请',
    description: '可以审批通过学分申请',
    category: 'credit'
  },
  'credits.reject': {
    key: 'credits.reject',
    label: '驳回学分申请',
    description: '可以驳回学分申请',
    category: 'credit'
  },
  'users.manage': {
    key: 'users.manage',
    label: '管理用户',
    description: '可以添加、删除、修改用户',
    category: 'user'
  },
  'notices.manage': {
    key: 'notices.manage',
    label: '管理公告',
    description: '可以发布、编辑、删除公告',
    category: 'notice'
  },
  'system.admin': {
    key: 'system.admin',
    label: '系统管理',
    description: '系统管理员权限',
    category: 'system'
  }
};

// 文件配置
export const FILE_CONFIG = {
  // 允许的文件类型
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf'
  ],
  // 最大文件大小 (10MB)
  MAX_SIZE: 10 * 1024 * 1024,
  // 最大文件数量
  MAX_COUNT: 6
};

// 验证配置
export const VALIDATION_CONFIG = {
  // 密码配置
  PASSWORD: {
    MIN_LENGTH: 6,
    REQUIRE_LETTER: true,
    REQUIRE_NUMBER: true
  },
  // 学号配置
  STUDENT_ID: {
    PATTERN: /^\d{8,12}$/,
    ERROR_MESSAGE: '学号应为8-12位数字'
  },
  // 用户名配置
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]+$/,
    ERROR_MESSAGE: '用户名只能包含字母、数字和下划线'
  }
};

// 字段标签配置
export const FIELD_LABELS: Record<string, string> = {
  activityName: '活动名称',
  competitionName: '比赛名称',
  certificateName: '证书名称',
  volunteerName: '志愿活动名称',
  volunteerHours: '志愿时长',
  organizationName: '组织机构',
  eventDate: '活动日期',
  duration: '持续时间',
  location: '活动地点',
  award: '获奖情况',
  level: '活动级别',
  score: '申请分数',
  proofFiles: '证明材料',
  remarks: '备注说明'
};

// ===== 工具函数 =====

// 获取字段标签
export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

// 获取权限配置
export function getPermissionConfig(permission: string): PermissionConfig | null {
  return PERMISSIONS_CONFIG[permission] || null;
}

// 获取权限标签
export function getPermissionLabel(permission: string): string {
  const config = getPermissionConfig(permission);
  return config?.label || permission;
}

// 获取权限分类的所有权限
export function getPermissionsByCategory(category: 'credit' | 'user' | 'notice' | 'system'): PermissionConfig[] {
  return Object.values(PERMISSIONS_CONFIG).filter(p => p.category === category);
}

// 检查用户是否有指定权限（基于动态权限列表）
export function hasPermission(userPermissions: string[], permission: string): boolean {
  // 管理员拥有所有权限
  if (userPermissions.includes('*')) {
    return true;
  }
  
  return userPermissions.includes(permission);
}

// 检查用户是否有指定角色
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

// 计算推荐分数（基于动态配置）
export function calculateRecommendedScore(config: CreditTypeConfig, data: any): number | null {
  switch (config.scoreCalculation) {
    case 'fixed':
      return config.defaultScore || 0;
    case 'time_based':
      if (data.volunteerHours) {
        const hours = Number(data.volunteerHours) || 0;
        const scorePerHour = config.scorePerHour || 0;
        return hours * scorePerHour;
      }
      return null;
    case 'manual':
    default:
      return null; // 需要手动输入
  }
}

export default {
  PERMISSIONS_CONFIG,
  FILE_CONFIG,
  VALIDATION_CONFIG,
  FIELD_LABELS
};
