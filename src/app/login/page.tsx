"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { toast } from 'react-hot-toast';

function LoginPageInner() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  
  const { user, loading, error, login } = useAuth();

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // 如果已经登录且加载完毕，自动重定向到 redirect
  useEffect(() => {
    if (!loading && user) {
      router.replace(redirect);
    }
  }, [user, loading, router, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setIsSubmitting(true);
    try {
      const success = await login(username.trim(), password);
      setIsSubmitting(false);
      if (success) {
        router.replace(redirect); // 登录成功立即跳转
      }
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  if (loading || isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) return null;

  return (
  <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
  <Card className="w-full max-w-md mb-0">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">欢迎登录</h1>
          <p className="text-gray-600">学生素质学分管理系统</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="用户名"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="请输入用户名或学号"
            required
            autoFocus
          />
          <Input
            label="密码"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="请输入密码"
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            disabled={!username.trim() || !password.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? '登录中...' : '登录'}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-500">
          <p className="mt-1">如有问题请联系管理员</p>
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
      <LoginPageInner />
    </Suspense>
  );
}
