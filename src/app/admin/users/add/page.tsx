"use client";
import { useState, useRef } from "react";
import AddUserForm from "../AddUserForm";
import { useRouter } from "next/navigation";
import { toast } from 'react-hot-toast';
import { useAuth } from "@/hooks/AuthProvider";

export default function AddUserPage() {
  const { user, loading } = useAuth();
  const [importResult, setImportResult] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  if (loading) return <div className="text-center mt-12 text-gray-500">权限校验中...</div>;
  if (!user || user.role !== "admin") return <div className="text-center mt-12 text-red-600">无权限</div>;

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setImportResult([]);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("请选择文件");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/users/import", {
      method: "POST",
      headers: {},
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("导入完成");
      setImportResult(data.results);
    } else {
      toast.error(data.error || "导入失败");
    }
  }

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-4 sm:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">添加用户/批量导入</h1>
      <div className="flex flex-col sm:flex-row gap-8">
        {/* 单个添加 */}
        <div className="flex-1 mb-8 sm:mb-0 bg-white/0">
          <h2 className="font-bold mb-2">单个添加</h2>
          <AddUserForm onSuccess={() => { }} />
        </div>
        {/* 批量导入 */}
        <div className="flex-1 bg-white/0">
          <h2 className="font-bold mb-2">批量导入</h2>
          <form onSubmit={handleImport} className="flex flex-col sm:flex-row gap-2 mb-4 items-center">
            <input type="file" accept=".xlsx" ref={fileInputRef} className="border p-2 rounded flex-1 min-w-0" />
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition w-full sm:w-auto" type="submit">批量导入</button>
            <a href="/导入模板.xlsx" className="text-blue-600 underline ml-0 sm:ml-2" download>下载模板</a>
          </form>
          {importResult.length > 0 && (
            <div className="mb-4">
              <div className="font-bold mb-1">导入结果：</div>
              <ul className="text-sm bg-gray-50 p-2 rounded">
                {importResult.map((r, i) => {
                  const label = r.name ? `${r.name}(${r.username})` : r.username;
                  let errorMsg = r.error;
                  if (errorMsg && errorMsg.includes('角色必须为')) {
                    errorMsg = '角色必须为 学生/班长/团支书/学习委员/管理员';
                  }
                  let statusMsg = '';
                  if (r.status === '新增') statusMsg = '✔️ 新增成功';
                  else if (r.status === '更新') statusMsg = '✔️ 已更新';
                  return (
                    <li key={i} className={statusMsg ? "text-green-700" : "text-red-600"}>
                      {label} {statusMsg || `❌ ${errorMsg || r.status || '导入失败'}`}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
