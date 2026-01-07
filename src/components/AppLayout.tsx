"use client";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/AuthProvider";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";

interface AppLayoutProps {
    children: React.ReactNode;
}

// 不需要侧边栏的路由
const publicRoutes = ["/login", "/register", "/forgot-password", "/"];

export default function AppLayout({ children }: AppLayoutProps) {
    const pathname = usePathname();
    const { user, loading } = useAuth();

    // 检查是否是公开页面
    const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith("/api")
    );

    // 加载中显示加载状态
    if (loading && !isPublicRoute) {
        return (
            <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-600 font-medium">加载中...</p>
                </div>
            </div>
        );
    }

    // 公开页面或未登录时使用简单布局
    if (isPublicRoute || !user) {
        return (
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
                <Toaster position="top-center" />
                <main className="flex-1">{children}</main>
            </div>
        );
    }

    // 已登录用户使用侧边栏布局 - 固定高度，内容区独立滚动
    return (
        <div className="h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            {/* 侧边栏 - 固定不动 */}
            <Sidebar />

            {/* 主内容区 - 使用 flex 布局管理高度 */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* 顶部栏 - 移动端显示，固定高度 */}
                <header className="lg:hidden h-16 flex-shrink-0 bg-white shadow-sm flex items-center justify-center px-4 pl-16">
                    <h1 className="text-lg font-bold text-blue-700">素质学分管理系统</h1>
                </header>

                {/* 页面内容 - 可滚动区域，占据中间所有空间 */}
                <main className="flex-1 overflow-auto p-4 lg:p-6">
                    <Toaster position="top-center" />
                    {children}
                </main>

                {/* 页脚 - 固定在底部，不随内容滚动 */}
                <footer className="flex-shrink-0 py-3 px-6 text-center text-gray-400 text-sm border-t bg-white/90 backdrop-blur-sm">
                    © {new Date().getFullYear()} 学生素质学分管理系统 By OldDream
                </footer>
            </div>
        </div>
    );
}

