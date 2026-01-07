"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/hooks/AuthProvider";
import { Toaster } from "react-hot-toast";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // 如果正在加载，显示加载状态
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-600 font-medium">加载中...</p>
                </div>
            </div>
        );
    }

    // 如果未登录，不渲染侧边栏
    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            {/* 侧边栏 */}
            <Sidebar />

            {/* 主内容区 */}
            <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
                {/* 顶部栏 - 移动端显示 */}
                <header className="lg:hidden h-16 bg-white shadow-sm flex items-center justify-center px-4">
                    <h1 className="text-lg font-bold text-blue-700">素质学分管理系统</h1>
                </header>

                {/* 页面内容 */}
                <main className="flex-1 p-4 lg:p-6 overflow-auto">
                    <Toaster position="top-center" />
                    {children}
                </main>

                {/* 页脚 */}
                <footer className="py-4 px-6 text-center text-gray-400 text-sm border-t bg-white/50">
                    © {new Date().getFullYear()} 学生素质学分管理系统 By OldDream
                </footer>
            </div>
        </div>
    );
}
