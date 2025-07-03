import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 拉取用户信息
  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const response = await authAPI.getMe();
      if (response.user) {
        setUser(response.user);
        setError(null);
      } else {
        setUser(null);
        localStorage.removeItem('token');
        document.cookie = 'token=; Max-Age=0; path=/;';
        router.replace('/login');
      }
    } catch (err: any) {
      setUser(null);
      localStorage.removeItem('token');
      document.cookie = 'token=; Max-Age=0; path=/;';
      setError('认证失败，请重新登录');
      router.replace('/login');
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
      localStorage.setItem('token', response.token);
      document.cookie = `token=${response.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      setUser(response.user);
      window.dispatchEvent(new Event('login-status-change'));
      return true;
    } catch (err: any) {
      const errorData = err.response?.data || {};
      if (errorData.message) setError(errorData.message);
      else if (errorData.error) setError(errorData.error);
      else setError('登录失败，请稍后重试');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    document.cookie = 'token=; Max-Age=0; path=/;';
    setUser(null);
    setError(null);
    window.dispatchEvent(new Event('login-status-change'));
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

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

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内部使用');
  return ctx;
} 