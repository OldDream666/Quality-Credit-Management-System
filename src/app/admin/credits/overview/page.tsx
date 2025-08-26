"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/AuthProvider";

export default function CreditsOverview() {
  const { user, loading } = useAuth();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const [systemConfigs, setSystemConfigs] = useState<any>({});

  useEffect(() => {
    if (!user || loading) return;
    fetch("/api/credits/admin")
      .then(res => res.ok ? res.json() : { credits: [] })
      .then(data => {
        setApprovals(data.credits || []);
        setLoadingData(false);
      })
      .catch(() => {
        setError("加载失败");
        setLoadingData(false);
      });
  }, [user, loading, router]);

  useEffect(() => {
    fetch("/api/config/system")
      .then(res => res.ok ? res.json() : null)
      .then(configData => {
        if (configData) {
          // localStorage 仅用于缓存配置，与 token 无关，无需处理
          setSystemConfigs(configData);
        }
      });
  }, []);

  if (loading || loadingData || !systemConfigs.roles) return <div className="text-center mt-12 text-gray-500">加载中...</div>;
  if (!user) return <div className="text-center mt-12 text-red-600">无权限</div>;
  if (user.role === 'admin') return <div className="text-center mt-12 text-red-600">无权限</div>;

  const userRoleConfig = systemConfigs.roles?.find((r: any) => r.key === user.role);
  const userPermissions = Array.isArray(userRoleConfig?.permissions) ? userRoleConfig.permissions : [];
  const canApprove = userPermissions.includes('credits.approve') || userPermissions.includes('credits.view');
  if (!canApprove) return <div className="text-center mt-12 text-red-600">无权限</div>;

  const total = approvals.length;
  const pending = approvals.filter((c:any)=>c.status==='pending').length;
  const approved = approvals.filter((c:any)=>c.status==='approved').length;
  const rejected = approvals.filter((c:any)=>c.status==='rejected').length;

  return (
    <div className="min-h-screen flex justify-center items-start bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-8">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-xl p-10 relative mt-12">
        <span
          className="absolute left-4 top-4 text-blue-700 hover:underline hover:text-blue-900 cursor-pointer flex items-center text-base select-none"
          onClick={() => router.push("/dashboard")}
        >
          <svg className="inline mr-1" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 16L7 10L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回
        </span>
        <div style={{ height: 12 }} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-primary mb-2">学分审批总览</h1>
            <div className="text-gray-500 text-base">账号：{user.username}</div>
            <div className="text-gray-500 text-base">班级：{user.class}</div>
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-3 rounded-lg shadow transition focus:outline-none focus:ring-2 focus:ring-purple-300 text-lg" onClick={() => router.push("/admin/credits")}>去审批</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="rounded-xl p-5 bg-gradient-to-br from-blue-100 to-blue-200 shadow text-center">
            <div className="text-4xl font-bold text-blue-700">{total}</div>
            <div className="text-gray-600 mt-1">总申请数</div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-yellow-100 to-yellow-200 shadow text-center">
            <div className="text-4xl font-bold text-yellow-700">{pending}</div>
            <div className="text-gray-600 mt-1">待审批</div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-green-100 to-green-200 shadow text-center">
            <div className="text-4xl font-bold text-green-700">{approved}</div>
            <div className="text-gray-600 mt-1">已通过</div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-red-100 to-red-200 shadow text-center">
            <div className="text-4xl font-bold text-red-700">{rejected}</div>
            <div className="text-gray-600 mt-1">已拒绝</div>
          </div>
        </div>
        <hr className="my-8 border-blue-200" />
        <h2 className="text-xl font-bold mb-4 text-gray-700">最新审批动态</h2>
        <div className="overflow-x-auto rounded-xl shadow">
          <table className="w-full min-w-[900px] border rounded-xl overflow-hidden bg-white text-base table-fixed">
            <thead className="bg-blue-50">
              <tr>
                <th className="py-2 px-3 w-32">姓名</th>
                <th className="py-2 px-3 w-32">学号</th>
                <th className="py-2 px-3 w-36">类型</th>
                <th className="py-2 px-3 w-24">分数</th>
                <th className="py-2 px-3 w-28">状态</th>
                <th className="py-2 px-3 w-36">提交时间</th>
              </tr>
            </thead>
            <tbody>
              {approvals.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-6">暂无审批记录</td></tr>
              ) : approvals.slice(0, 5).map((c:any) => {
                const statusMap: Record<string, string> = {
                  approved: '已通过',
                  rejected: '已拒绝',
                  pending: '待审批',
                };
                const date = c.created_at ? new Date(c.created_at) : null;
                const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : '';
                return (
                  <tr key={c.id} className="border-t hover:bg-blue-50 transition">
                    <td className="py-2 px-3 align-middle text-center">{c.user_name || c.username || '-'}</td>
                    <td className="py-2 px-3 align-middle text-center">{c.user_username || c.username || '-'}</td>
                    <td className="py-2 px-3 align-middle text-center">{c.type}
                        {(() => {
                          let desc: any = {};
                          try { desc = c.description ? JSON.parse(c.description) : {}; } catch {}
                          if (c.type === '个人活动' && desc.activityName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.activityName}</div>;
                          if (c.type === '个人比赛' && desc.competitionName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.competitionName}</div>;
                          if (c.type === '个人证书' && desc.certificateName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.certificateName}</div>;
                          if (c.type === '志愿活动' && desc.volunteerName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.volunteerName}</div>;
                          return null;
                        })()}
                      </td>
                    <td className="py-2 px-3 align-middle text-center">{c.score}</td>
                    <td className="py-2 px-3 align-middle text-center">
                      <span className={
                        c.status === 'approved' ? 'bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold' :
                        c.status === 'rejected' ? 'bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold' :
                        c.status === 'pending' ? 'bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold' :
                        'bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold'
                      }>
                        {statusMap[c.status] || c.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 align-middle text-center">{dateStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
