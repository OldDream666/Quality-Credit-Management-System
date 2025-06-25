"use client";
import { useState, useRef, useEffect } from "react";
import AddUserForm from "../AddUserForm";
import { useRouter } from "next/navigation";

export default function AddUserPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [importResult, setImportResult] = useState<any[]>([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      setError("请先登录");
      setCheckingAuth(false);
      setTimeout(() => router.replace("/login"), 1500);
      return;
    }
    setToken(t);
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
      .then(res => res.json())
      .then(data => {
        if (!data.user) {
          setError("请先登录");
          setCheckingAuth(false);
          setTimeout(() => router.replace("/login"), 1500);
        } else if (data.user.role !== "admin") {
          setError("无权限访问该页面");
          setCheckingAuth(false);
          setTimeout(() => router.replace("/dashboard"), 1500);
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => {
        setError("请先登录");
        setCheckingAuth(false);
        setTimeout(() => router.replace("/login"), 1500);
      });
  }, [router]);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setImportSuccess(""); setAddSuccess(""); setImportResult([]);
    const file = fileInputRef.current?.files?.[0];
    if (!file) return setError("请选择文件");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/users/import", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      setImportSuccess("导入完成");
      setImportResult(data.results);
    } else setError(data.error || "导入失败");
  }

  if (checkingAuth) return <div className="text-center mt-12 text-gray-500">权限校验中...</div>;
  if (error) return <div className="text-red-600 text-center mt-12">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8 bg-white/90 rounded-xl shadow-lg mt-6 sm:mt-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-700">添加用户/批量导入</h1>
        <button
          className="border border-blue-600 text-blue-700 hover:bg-blue-50 font-medium px-4 py-1.5 rounded transition shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          onClick={() => router.push("/admin/users")}
        >
          返回列表
        </button>
      </div>
      <div className="mb-8">
        <h2 className="font-bold mb-2">单个添加</h2>
        <AddUserForm token={token} onSuccess={() => setAddSuccess("添加成功")}/>
        {addSuccess && <div className="text-green-600 mt-2">{addSuccess}</div>}
      </div>
      <div className="mb-8">
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
                // 角色错误提示友好化
                let errorMsg = r.error;
                if (errorMsg && errorMsg.includes('角色必须为')) {
                  errorMsg = '角色必须为 学生/班长/团支书/学习委员/管理员';
                }
                return (
                  <li key={i} className={r.success ? "text-green-700" : "text-red-600"}>
                    {label} {r.success ? "✔️" : `❌ ${errorMsg}`}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {importSuccess && <div className="text-green-600 mt-2">{importSuccess}</div>}
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
    </div>
  );
}
