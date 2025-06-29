"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUpIcon, ChevronDownIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import RichTextEditor from "@/components/RichTextEditor";

export default function AdminNotices() {
  const [notices, setNotices] = useState<any[]>([]);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<any>(null);
  const [editId, setEditId] = useState<number|null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [expandedNotices, setExpandedNotices] = useState<Record<number, boolean>>({});
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
        } else if (data.user.role !== 'admin') {
          setError("无权限访问该页面");
          setCheckingAuth(false);
          setTimeout(() => router.replace("/dashboard"), 1500);
        } else {
          setUser(data.user);
          setCheckingAuth(false);
          fetchNotices();
        }
      })
      .catch(() => {
        setError("请先登录");
        setCheckingAuth(false);
        setTimeout(() => router.replace("/login"), 1500);
      });
  }, [router]);

  function fetchNotices() {
    fetch("/api/notices")
      .then(async res => {
        if (!res.ok) return { notices: [] };
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await res.json();
        } else {
          return { notices: [] };
        }
      })
      .then(data => setNotices(data.notices || []));
  }

  async function handleSubmit(e:any) {
    e.preventDefault();
    if (!content.trim()) {
      alert("请输入公告内容");
      return;
    }
    setLoading(true);
    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/notices/${editId}` : "/api/notices";
    await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, content }),
    });
    setTitle(""); 
    setContent("");
    setEditId(null); 
    setLoading(false);
    fetchNotices();
  }

  async function handleEdit(n:any) {
    setEditId(n.id); 
    setTitle(n.title);
    setContent(n.content);
  }

  async function handleDelete(id:number) {
    if (!window.confirm("确定要删除该公告吗？")) return;
    try {
      const res = await fetch(`/api/notices/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("删除失败");
      }
      fetchNotices();
    } catch (err) {
      alert("删除失败，请重试");
    }
  }

  if (checkingAuth) return <div className="text-center mt-12 text-gray-500">加载中...</div>;
  if (error) return <div className="text-center mt-12 text-red-600">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto card mt-10 p-4 sm:p-10 bg-white rounded-2xl shadow-xl relative">
      <span
        className="absolute left-4 top-4 text-blue-700 hover:underline hover:text-blue-900 cursor-pointer flex items-center text-base select-none"
        style={{ fontSize: '1rem' }}
        onClick={() => router.push("/dashboard")}
      >
        <svg className="inline mr-1" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 16L7 10L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        返回
      </span>
      <div style={{ height: 12 }} />
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-8 text-blue-700">公告管理</h1>
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <input 
          className="w-full border rounded-lg px-4 py-3 text-base sm:text-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors duration-200" 
          placeholder="公告标题" 
          value={title} 
          onChange={e=>setTitle(e.target.value)} 
          required 
        />
        <div className="min-h-[500px] border rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors duration-200">
          <RichTextEditor content={content} onChange={setContent} />
        </div>
        <div className="flex gap-3 mt-6">
          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg shadow text-base sm:text-lg transition-colors duration-200 font-medium" 
            disabled={loading}
          >
            {editId ? "保存修改" : "发布公告"}
          </button>
          {editId && (
            <button 
              type="button" 
              className="px-5 py-2.5 rounded-lg border hover:bg-gray-50 text-base sm:text-lg transition-colors duration-200" 
              onClick={()=>{setEditId(null);setTitle("");setContent("");}}
            >
              取消
            </button>
          )}
        </div>
      </form>
      <ul className="divide-y">
        {notices.map(n=>(
          <li key={n.id} className="py-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="font-semibold text-xl text-gray-800">{n.title}</div>
                <div className="text-gray-500 text-sm mt-1">{n.created_at?.slice(0,10)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEdit(n)}
                  className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  <span>编辑</span>
                </button>
                <button 
                  onClick={() => handleDelete(n.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>删除</span>
                </button>
                <button 
                  onClick={() => setExpandedNotices(prev => ({ ...prev, [n.id]: !prev[n.id] }))}
                  className="flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors duration-200 ml-2"
                >
                  {expandedNotices[n.id] ? (
                    <>
                      收起
                      <ChevronUpIcon className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      展开
                      <ChevronDownIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
            <div 
              className={`mt-4 overflow-hidden transition-all duration-300 ${
                expandedNotices[n.id] ? 'max-h-[800px]' : 'max-h-[3em]'
              }`}
            >
              <div 
                className="prose prose-lg max-w-none overflow-y-auto" 
                style={{ maxHeight: expandedNotices[n.id] ? '800px' : 'none' }}
                dangerouslySetInnerHTML={{ __html: n.content }} 
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
