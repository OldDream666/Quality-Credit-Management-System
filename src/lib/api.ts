import { 
  LoginForm, 
  CreditForm, 
  NoticeForm, 
  ApiResponse, 
  LoginResponse, 
  CreditsResponse, 
  UsersResponse, 
  NoticesResponse 
} from '@/types';

// API基础配置
const API_BASE = '/api';

// 通用请求函数
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    // 添加额外的错误信息
    (error as any).response = {
      status: response.status,
      data: errorData
    };
    throw error;
  }

  return response.json();
}

// 文件上传请求函数
async function apiUpload<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    // 添加额外的错误信息
    (error as any).response = {
      status: response.status,
      data: errorData
    };
    throw error;
  }

  return response.json();
}

// 认证相关API
export const authAPI = {
  // 用户登录
  login: (data: LoginForm): Promise<LoginResponse> => 
    apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 获取当前用户信息
  getMe: (): Promise<{ user: any }> => 
    apiRequest<{ user: any }>('/auth/me'),

  // 修改密码
  changePassword: (data: { oldPassword: string; newPassword: string }): Promise<ApiResponse> =>
    apiRequest<ApiResponse>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// 学分相关API
export const creditsAPI = {
  // 获取个人学分申请
  getMyCredits: (): Promise<CreditsResponse> => 
    apiRequest<CreditsResponse>('/credits'),

  // 提交学分申请
  submitCredit: (data: CreditForm): Promise<{ credit: any }> => {
    const formData = new FormData();
    formData.append('type', data.type);
    data.proof.forEach(file => {
      formData.append('proof', file);
    });
    return apiUpload<{ credit: any }>('/credits', formData);
  },

  // 获取所有学分申请（管理员/班委）
  getAllCredits: (): Promise<CreditsResponse> => 
    apiRequest<CreditsResponse>('/credits/admin'),

  // 审批学分申请
  approveCredit: (id: number, status: 'approved' | 'rejected', rejectReason?: string): Promise<{ credit: any }> =>
    apiRequest<{ credit: any }>('/credits/admin', {
      method: 'PATCH',
      body: JSON.stringify({ id, status, reject_reason: rejectReason }),
    }),

  // 获取单个学分申请详情
  getCreditById: (id: number): Promise<{ credit: any }> => 
    apiRequest<{ credit: any }>(`/credits/${id}`),

  // 导出学分数据
  exportCredits: (): Promise<Blob> => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE}/credits/export`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => res.blob());
  },
};

// 用户管理API
export const usersAPI = {
  // 获取所有用户
  getAllUsers: (): Promise<UsersResponse> => 
    apiRequest<UsersResponse>('/users'),

  // 获取单个用户
  getUserById: (id: number): Promise<{ user: any }> => 
    apiRequest<{ user: any }>(`/users/${id}`),

  // 创建用户
  createUser: (data: any): Promise<{ user: any }> => 
    apiRequest<{ user: any }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 更新用户
  updateUser: (id: number, data: any): Promise<{ user: any }> => 
    apiRequest<{ user: any }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // 删除用户
  deleteUser: (id: number): Promise<ApiResponse> => 
    apiRequest<ApiResponse>(`/users/${id}`, {
      method: 'DELETE',
    }),

  // 批量删除用户
  batchDeleteUsers: (ids: number[]): Promise<ApiResponse> => 
    apiRequest<ApiResponse>('/users/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // 重置用户密码
  resetUserPassword: (id: number): Promise<{ password: string }> => 
    apiRequest<{ password: string }>(`/admin/users/${id}/reset-password`, {
      method: 'POST',
    }),

  // 批量导入用户
  importUsers: (file: File): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiUpload<ApiResponse>('/users/import', formData);
  },

  // 解锁用户账号
  unlockUser: (username: string): Promise<ApiResponse> =>
    apiRequest<ApiResponse>(`/admin/users/${username}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),
};

// 公告相关API
export const noticesAPI = {
  // 获取所有公告
  getAllNotices: (): Promise<NoticesResponse> => 
    apiRequest<NoticesResponse>('/notices'),

  // 获取单个公告
  getNoticeById: (id: number): Promise<{ notice: any }> => 
    apiRequest<{ notice: any }>(`/notices/${id}`),

  // 创建公告
  createNotice: (data: NoticeForm): Promise<{ notice: any }> => 
    apiRequest<{ notice: any }>('/notices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 更新公告
  updateNotice: (id: number, data: NoticeForm): Promise<{ notice: any }> => 
    apiRequest<{ notice: any }>(`/notices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // 删除公告
  deleteNotice: (id: number): Promise<ApiResponse> => 
    apiRequest<ApiResponse>(`/notices/${id}`, {
      method: 'DELETE',
    }),
};

// 文件相关API
export const filesAPI = {
  // 下载证明材料
  downloadProof: (proofId: number): Promise<Blob> => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE}/credits/proof/${proofId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => res.blob());
  },
};

// 错误处理工具
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// 全局错误处理
export function handleAPIError(error: any): string {
  if (error instanceof APIError) {
    return error.message;
  }
  if (error.message) {
    return error.message;
  }
  return '网络错误，请稍后重试';
} 