// 用户相关类型
export interface User {
  id: number;
  username: string;
  name?: string;
  student_id?: string;
  role: UserRole;
  grade?: string;
  major?: string;
  class?: string;
  created_at: string;
}

export type UserRole = 'admin' | 'student' | 'monitor' | 'league_secretary' | 'study_committee';

// 学分申请相关类型
export interface Credit {
  id: number;
  user_id: number;
  type: CreditType;
  score: number | null;
  status: CreditStatus;
  reject_reason?: string;
  created_at: string;
  user_name?: string;
  user_username?: string;
  proofs?: CreditProof[];
}

export type CreditType =
  | '个人活动'
  | '个人比赛'
  | '个人证书'
  | '志愿活动';

export type CreditStatus = 'pending' | 'approved' | 'rejected';

// 证明材料类型
export interface CreditProof {
  id: number;
  credit_id: number;
  filename: string;
  mimetype: string;
  created_at: string;
}

// 公告类型
export interface Notice {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreditsResponse {
  credits: Credit[];
}

export interface UsersResponse {
  users: User[];
}

export interface NoticesResponse {
  notices: Notice[];
}

// 表单类型
export interface LoginForm {
  username: string;
  password: string;
}

export interface CreditForm {
  type: CreditType;
  activityName?: string;
  competitionName?: string;
  certificateName?: string;
  volunteerName?: string;
  volunteerHours?: number;
  proof: File[];
}

export interface NoticeForm {
  title: string;
  content: string;
}

// 统计数据类型
export interface DashboardStats {
  totalUsers: number;
  totalCredits: number;
  pendingCredits: number;
  approvedCredits: number;
  rejectedCredits: number;
  userStats: {
    admin: number;
    monitor: number;
    league_secretary: number;
    study_committee: number;
    student: number;
  };
}

// 权限检查类型
export interface PermissionConfig {
  canApprove: boolean;
  canManageUsers: boolean;
  canManageNotices: boolean;
  canViewAllCredits: boolean;
} 