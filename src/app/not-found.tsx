"use client";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center">
        <h1 className="text-6xl font-extrabold text-blue-700 mb-4">404</h1>
        <div className="text-2xl font-bold text-gray-700 mb-2">页面未找到</div>
        <div className="text-gray-500 mb-6">您访问的页面不存在或已被删除</div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg shadow transition focus:outline-none focus:ring-2 focus:ring-blue-300 text-lg"
          onClick={() => router.replace("/dashboard")}
        >返回首页</button>
      </div>
    </div>
  );
} 