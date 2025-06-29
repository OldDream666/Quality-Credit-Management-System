import { useState, useEffect, useCallback } from 'react';
import { Credit, CreditType } from '@/types';
import { creditsAPI } from '@/lib/api';

interface UseCreditsReturn {
  credits: Credit[];
  loading: boolean;
  error: string | null;
  submitCredit: (type: CreditType, files: File[]) => Promise<boolean>;
  refreshCredits: () => Promise<void>;
}

export function useCredits(): UseCreditsReturn {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取学分申请列表
  const refreshCredits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await creditsAPI.getMyCredits();
      setCredits(response.credits || []);
    } catch (err: any) {
      setError(err.message || '获取学分申请失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 提交学分申请
  const submitCredit = useCallback(async (type: CreditType, files: File[]): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      await creditsAPI.submitCredit({ type, proof: files });
      
      // 重新获取列表
      await refreshCredits();
      
      return true;
    } catch (err: any) {
      setError(err.message || '提交申请失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshCredits]);

  // 初始化时获取数据
  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  return {
    credits,
    loading,
    error,
    submitCredit,
    refreshCredits
  };
}

// 管理员/班委使用的Hook
interface UseAdminCreditsReturn {
  credits: Credit[];
  loading: boolean;
  error: string | null;
  approveCredit: (id: number, status: 'approved' | 'rejected', rejectReason?: string) => Promise<boolean>;
  refreshCredits: () => Promise<void>;
}

export function useAdminCredits(): UseAdminCreditsReturn {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取所有学分申请
  const refreshCredits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await creditsAPI.getAllCredits();
      setCredits(response.credits || []);
    } catch (err: any) {
      setError(err.message || '获取学分申请失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 审批学分申请
  const approveCredit = useCallback(async (
    id: number, 
    status: 'approved' | 'rejected', 
    rejectReason?: string
  ): Promise<boolean> => {
    try {
      setError(null);
      
      await creditsAPI.approveCredit(id, status, rejectReason);
      
      // 从列表中移除已审批的申请
      setCredits(prev => prev.filter(credit => credit.id !== id));
      
      return true;
    } catch (err: any) {
      setError(err.message || '审批失败');
      return false;
    }
  }, []);

  // 初始化时获取数据
  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  return {
    credits,
    loading,
    error,
    approveCredit,
    refreshCredits
  };
} 