import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { authAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 检查本地存储的token并获取用户信息
  const refreshUser = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      if (response.user) {
        setUser(response.user);
        setError(null);
      } else {
        // 清除cookie
        document.cookie = 'token=; Max-Age=0; path=/;';
        // 只有在当前不在登录页时才重定向
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          router.replace('/login');
        }
      }
    } catch (err: any) {
      setUser(null);
      // 清除cookie
      document.cookie = 'token=; Max-Age=0; path=/;';
      setError('认证失败，请重新登录');
      // 只有在当前不在登录页时才重定向
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        router.replace('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  // 登录
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.login({ username, password });
      // 同步写入cookie，确保服务端能识别token
      document.cookie = `token=${response.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      setUser(response.user);
      // 触发登录状态变化事件
      window.dispatchEvent(new Event('login-status-change'));
      return true;
    } catch (err: any) {
      const errorData = err.response?.data || {};
      // 设置错误信息
      if (errorData.message) {
        setError(errorData.message);
      } else if (errorData.error) {
        setError(errorData.error);
      } else {
        setError('登录失败，请稍后重试');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(() => {
    // 清除cookie
    document.cookie = 'token=; Max-Age=0; path=/;';
    setUser(null);
    setError(null);
    // 触发登录状态变化事件
    window.dispatchEvent(new Event('login-status-change'));
    // 重定向到登录页
    router.replace('/login');
  }, [router]);

  // 初始化时检查用户状态
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // 监听登录状态变化
  useEffect(() => {
    const handleLoginChange = () => {
      refreshUser();
    };

    window.addEventListener('login-status-change', handleLoginChange);
    window.addEventListener('storage', handleLoginChange);

    return () => {
      window.removeEventListener('login-status-change', handleLoginChange);
      window.removeEventListener('storage', handleLoginChange);
    };
  }, [refreshUser]);

  return {
    user,
    loading,
    error,
    login,
    logout,
    refreshUser
  };
} 