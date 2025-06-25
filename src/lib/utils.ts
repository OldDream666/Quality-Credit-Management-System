import { UserRole, PermissionConfig } from '@/types';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 类名合并工具函数
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 角色显示名称映射
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  admin: '管理员',
  student: '学生',
  monitor: '班长',
  league_secretary: '团支书',
  study_committee: '学习委员'
};

// 状态显示名称映射
export const STATUS_DISPLAY_NAMES: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝'
};

// 状态颜色映射
export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
};

// 权限检查函数
export function getPermissions(role: UserRole): PermissionConfig {
  const isAdmin = role === 'admin';
  const isApprover = ['admin', 'monitor', 'league_secretary', 'study_committee'].includes(role);
  
  return {
    canApprove: isApprover,
    canManageUsers: isAdmin,
    canManageNotices: isAdmin,
    canViewAllCredits: isApprover
  };
}

// 格式化日期
export function formatDate(dateString: string, format: 'short' | 'long' = 'short'): string {
  const date = new Date(dateString);
  if (format === 'short') {
    return date.toLocaleDateString('zh-CN');
  }
  return date.toLocaleString('zh-CN');
}

// 文件大小格式化
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 文件类型验证
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

// 文件大小验证
export function isValidFileSize(file: File, maxSizeMB: number): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 深拷贝函数
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const clonedObj = {} as any;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

// 生成唯一ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 验证邮箱格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 验证学号格式（假设学号为8-12位数字）
export function isValidStudentId(studentId: string): boolean {
  const studentIdRegex = /^\d{8,12}$/;
  return studentIdRegex.test(studentId);
}

// 计算学分总分
export function calculateTotalScore(credits: any[]): number {
  return credits
    .filter(credit => credit.status === 'approved')
    .reduce((total, credit) => total + Number(credit.score), 0);
}

// 获取用户显示名称
export function getUserDisplayName(user: any): string {
  return user.name ? `${user.name}(${user.username})` : user.username;
}

// 角色名称转换
export function getRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    admin: '管理员',
    monitor: '班长',
    league_secretary: '团支书',
    study_committee: '学习委员',
    student: '学生'
  };
  return roleLabels[role] || role;
}

// 状态颜色
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
}

// 学分类型颜色
export function getCreditTypeColor(type: string): string {
  const typeColors: Record<string, string> = {
    '个人活动': 'bg-blue-100 text-blue-800',
    '个人比赛': 'bg-purple-100 text-purple-800',
    '个人证书': 'bg-indigo-100 text-indigo-800',
    '志愿活动': 'bg-orange-100 text-orange-800'
  };
  return typeColors[type] || 'bg-gray-100 text-gray-800';
}

// 生成随机字符串
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
} 