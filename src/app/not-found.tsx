"use client";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center max-w-md w-full max-h-[80vh]">
        <h1 className="text-4xl font-extrabold text-blue-700 mb-2">404</h1>
        <div className="text-lg font-bold text-gray-700 mb-1">页面未找到</div>
        <div className="text-gray-500 mb-4 text-sm text-center">您访问的页面不存在或已被删除</div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded shadow transition focus:outline-none focus:ring-2 focus:ring-blue-300 text-base"
          onClick={() => router.replace("/dashboard")}
        >返回首页</button>
      </div>
    </div>
  );
} 