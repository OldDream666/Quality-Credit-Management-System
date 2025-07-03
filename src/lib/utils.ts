import { UserRole, PermissionConfig } from '@/types';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  hasPermission as checkPermission,
  APPROVER_ROLES
} from '@/config/system';

// 类名合并工具函数
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 权限检查函数（简化为基于权限数组的检查）
export function getPermissions(userPermissions: string[]): PermissionConfig {
  return {
    canApprove: userPermissions.includes('credits.approve') || userPermissions.includes('*'),
    canManageUsers: userPermissions.includes('users.manage') || userPermissions.includes('*'),
    canManageNotices: userPermissions.includes('notices.manage') || userPermissions.includes('*'),
    canViewAllCredits: userPermissions.some(p => ['credits.approve', 'credits.view', '*'].includes(p))
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

// 角色名称转换（动态获取，无硬编码）
export function getRoleLabel(role: string, roleConfigs?: any[]): string {
  if (roleConfigs) {
    const config = roleConfigs.find(r => r.key === role);
    return config?.label || role;
  }
  return role; // 无配置时直接返回原值
}

// 角色颜色（动态获取，无硬编码）
export function getRoleColor(role: string, roleConfigs?: any[]): string {
  if (roleConfigs) {
    const config = roleConfigs.find(r => r.key === role);
    return config?.color || 'bg-gray-100 text-gray-700';
  }
  return 'bg-gray-100 text-gray-700'; // 默认颜色
}

// 状态标签（动态获取，无硬编码）
export function getStatusLabel(status: string, statusConfigs?: any[]): string {
  if (statusConfigs) {
    const config = statusConfigs.find(s => s.key === status);
    return config?.label || status;
  }
  return status; // 无配置时直接返回原值
}

// 状态颜色（动态获取，无硬编码）
export function getStatusColor(status: string, statusConfigs?: any[]): string {
  if (statusConfigs) {
    const config = statusConfigs.find(s => s.key === status);
    return config?.color || 'bg-gray-100 text-gray-700';
  }
  return 'bg-gray-100 text-gray-700'; // 默认颜色
}

// 学分类型颜色（动态获取，无硬编码）
export function getCreditTypeColor(type: string, typeConfigs?: any[]): string {
  if (typeConfigs) {
    const config = typeConfigs.find(t => t.key === type);
    return config?.color || 'bg-gray-100 text-gray-800';
  }
  return 'bg-gray-100 text-gray-800'; // 默认颜色
}

// 学分类型标签（动态获取，无硬编码）
export function getCreditTypeLabel(type: string, typeConfigs?: any[]): string {
  if (typeConfigs) {
    const config = typeConfigs.find(t => t.key === type);
    return config?.label || type;
  }
  return type; // 无配置时直接返回原值
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