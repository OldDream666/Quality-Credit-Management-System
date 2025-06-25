"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRoleLabel, getStatusColor, getCreditTypeColor, formatDate } from "@/lib/utils";
import { ChevronUpIcon, ChevronDownIcon, MegaphoneIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";

// 新增：简单公告类型
interface Notice {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<any[]>([]);
  const [token, setToken] = useState<string>("");
  const [approvals, setApprovals] = useState<any[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]); // 公告
  const [expandedNotices, setExpandedNotices] = useState<Record<number, boolean>>({}); // 新增：控制公告展开状态
  const [detailOpen, setDetailOpen] = useState(false); // 详情弹窗
  const [detailItem, setDetailItem] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null); // 修复hooks顺序
  const router = useRouter();
  // 分页相关
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(credits.length / pageSize);
  const pagedCredits = credits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      setError("请先登录");
      setLoading(false);
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
          setLoading(false);
          setCheckingAuth(false);
          setTimeout(() => router.replace("/login"), 1500);
        } else {
          setUser(data.user);
          setLoading(false);
          setCheckingAuth(false);
        }
      })
      .catch(() => {
        setError("请先登录");
        setLoading(false);
        setCheckingAuth(false);
        setTimeout(() => router.replace("/login"), 1500);
      });
    // 管理员获取全局审批数据
    fetch("/api/credits/admin", { headers: { Authorization: `Bearer ${t}` } })
      .then(res => res.ok ? res.json() : { credits: [] })
      .then(data => {
        if (data.credits) setApprovals(data.credits);
      });
    // 管理员获取所有用户
    fetch("/api/users", { headers: { Authorization: `Bearer ${t}` } })
      .then(res => res.ok ? res.json() : { users: [] })
      .then(data => setAllUsers(data.users || []));
    // 普通用户获取个人数据
    fetch("/api/credits", { headers: { Authorization: `Bearer ${t}` } })
      .then(res => res.json())
      .then(data => {
        setCredits(data.credits || []);
      });
    // 获取公告
    fetch("/api/notices")
      .then(res => res.ok ? res.json() : { notices: [] })
      .then(data => setNotices(data.notices || []));
  }, [router]);

  if (checkingAuth) return <div className="text-center mt-12 text-gray-500">加载中...</div>;
  if (error) return <div className="text-center mt-12 text-red-600">{error}</div>;
  if (loading) return <div className="p-4 text-center">加载中...</div>;
  if (!token || !user) return null;

  const approvalRoles = [
    'monitor', // 班长
    'league_secretary', // 团支书
    'study_committee' // 学习委员
  ];

  // 管理员仪表盘
  if (user.role === 'admin') {
  const total = approvals.length;
  const pending = approvals.filter((c:any)=>c.status==='pending').length;
  const approved = approvals.filter((c:any)=>c.status==='approved').length;
  const rejected = approvals.filter((c:any)=>c.status==='rejected').length;
  const userCount = allUsers.length;
  const adminCount = allUsers.filter(u=>u.role==='admin').length;
  const monitorCount = allUsers.filter(u=>u.role==='monitor').length;
  const leagueCount = allUsers.filter(u=>u.role==='league_secretary').length;
  const studyCount = allUsers.filter(u=>u.role==='study_committee').length;
  const studentCount = allUsers.filter(u=>u.role==='student').length;
  const latestUsers = [...allUsers].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,5);

  return (
    <div className="max-w-5xl mx-auto card mt-12 p-4 sm:p-10 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-primary mb-2">欢迎，管理员 {user.name || user.username}</h1>
          <div className="text-gray-500 text-base">账号：{user.username}</div>
        </div>
        <div className="flex gap-4">
          <button className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg shadow transition focus:outline-none focus:ring-2 focus:ring-green-300 text-lg" onClick={() => router.push("/admin/users")}>用户管理</button>
          <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-6 py-3 rounded-lg shadow transition focus:outline-none focus:ring-2 focus:ring-yellow-300 text-lg" onClick={() => router.push("/admin/notices")}>公告管理</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="rounded-xl p-5 bg-gradient-to-br from-blue-100 to-blue-200 shadow text-center">
          <div className="text-4xl font-bold text-blue-700">{userCount}</div>
          <div className="text-gray-600 mt-1">系统用户</div>
        </div>
        <div className="rounded-xl p-5 bg-gradient-to-br from-gray-100 to-gray-200 shadow text-center">
          <div className="text-2xl font-bold text-gray-700">{adminCount}</div>
          <div className="text-gray-600 mt-1">管理员</div>
        </div>
        <div className="rounded-xl p-5 bg-gradient-to-br from-green-100 to-green-200 shadow text-center">
          <div className="text-2xl font-bold text-green-700">{monitorCount}</div>
          <div className="text-gray-600 mt-1">班长</div>
        </div>
        <div className="rounded-xl p-5 bg-gradient-to-br from-yellow-100 to-yellow-200 shadow text-center">
          <div className="text-2xl font-bold text-yellow-700">{leagueCount}</div>
          <div className="text-gray-600 mt-1">团支书</div>
        </div>
        <div className="rounded-xl p-5 bg-gradient-to-br from-purple-100 to-purple-200 shadow text-center">
          <div className="text-2xl font-bold text-purple-700">{studyCount}</div>
          <div className="text-gray-600 mt-1">学习委员</div>
        </div>
        <div className="rounded-xl p-5 bg-gradient-to-br from-blue-50 to-blue-100 shadow text-center">
          <div className="text-2xl font-bold text-blue-700">{studentCount}</div>
          <div className="text-gray-600 mt-1">学生</div>
        </div>
        <div className="rounded-xl p-5 bg-gradient-to-br from-blue-100 to-blue-200 shadow text-center">
          <div className="text-2xl font-bold text-blue-700">{total}</div>
          <div className="text-gray-600 mt-1">审批单</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
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
      <div className="mb-10">
        <h2 className="text-xl font-bold mb-4 text-gray-700">最新注册用户</h2>
        <ul className="divide-y bg-white rounded-xl shadow">
          {latestUsers.map(u => (
            <li key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3">
              <div>
                <span className="font-semibold text-blue-700 mr-2">{u.username}</span>
                <span className="text-gray-700">{u.name || '-'}</span>
                <span className="ml-2 text-xs text-gray-400">角色：{getRoleLabel(u.role)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1 sm:mt-0">注册时间：{formatDate(u.created_at)}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
  }
  // 普通用户/班委仪表盘（统一渲染，按钮区根据 isApprover 控制审批入口）
  const isApprover = approvalRoles.includes(user.role);
  const userApprovals = credits;
  const userTotalScore = (credits || []).filter((c: any) => c.status === 'approved').reduce((sum: number, c: any) => sum + Number(c.score), 0);
  
  // 统计各类型分数
  const typeScoreMap: Record<string, number> = {
    "个人活动": 0,
    "个人比赛": 0,
    "个人证书": 0,
    "志愿活动": 0
  };
  (credits || []).forEach((c: any) => {
    if (c.status === 'approved' && c.type && typeScoreMap.hasOwnProperty(c.type)) {
      typeScoreMap[c.type] += Number(c.score) || 0;
    }
  });

  return (
    <div className="max-w-5xl mx-auto card mt-12 p-4 sm:p-10 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-primary mb-2">欢迎，{user.name}({user.username})</h1>
          <div className="text-gray-500 text-base">角色：{getRoleLabel(user.role)}</div>
          <div className="text-gray-500 text-base">班级：{user.class || '-'}</div>
        </div>
        <div className="flex flex-row gap-4 items-center">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg shadow transition focus:outline-none focus:ring-2 focus:ring-blue-300 text-lg"
            onClick={() => router.push("/credits")}
          >
            申请
          </button>
          {isApprover && (
            <button
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg shadow transition focus:outline-none focus:ring-2 focus:ring-green-300 text-lg"
              onClick={() => router.push("/admin/credits/overview")}
            >
              审批
            </button>
          )}
        </div>
      </div>
      {/* 公告区域 */}
      {notices.length > 0 && (
        <div className="mb-6">
          <div className="font-bold text-lg mb-2 text-blue-700 flex items-center gap-2">
            <span className="inline-block w-2 h-5 bg-blue-400 rounded"></span>
            <MegaphoneIcon className="w-6 h-6 text-blue-400 mr-1" />
            系统通知
          </div>
          <ul className="space-y-1">
            {notices.slice(0, 3).map(n => (
              <li key={n.id} className="bg-blue-100 rounded px-3 py-2 text-gray-700 text-sm flex flex-col">
                <div className="flex justify-between items-start">
                  <span className="font-semibold">{n.title}</span>
                  <button 
                    onClick={() => setExpandedNotices(prev => ({ ...prev, [n.id]: !prev[n.id] }))}
                    className="text-blue-600 hover:text-blue-800 text-sm ml-2 flex items-center transition-colors duration-200 rounded px-2 py-1 hover:bg-blue-50"
                  >
                    {expandedNotices[n.id] ? (
                      <>
                        收起
                        <ChevronUpIcon className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        展开
                        <ChevronDownIcon className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                </div>
                <span className="text-xs text-gray-500">{n.created_at?.slice(0, 10)}</span>
                <div 
                  className={`mt-1 overflow-hidden transition-all duration-300 ${
                    expandedNotices[n.id] ? 'max-h-[500px]' : 'max-h-[5em]'
                  }`}
                >
                  <div 
                    dangerouslySetInnerHTML={{ __html: n.content }} 
                    className="prose prose-sm max-w-none overflow-y-auto" 
                    style={{ maxHeight: expandedNotices[n.id] ? '500px' : 'none' }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* 彩色卡片显示素质学分总分 */}
      <div className="mb-6">
        <div className="rounded-xl p-5 bg-gradient-to-br from-blue-100 to-blue-200 shadow text-center">
          <div className="text-lg text-gray-700 font-semibold mb-1">素质学分总分</div>
          <div className="text-4xl font-bold text-blue-700">{userTotalScore}</div>
        </div>
        {/* 各类型分数统计 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div className="rounded-lg p-3 text-center shadow border border-blue-100 bg-gradient-to-br from-blue-100 to-blue-50">
            <div className="text-base text-gray-700 font-semibold mb-1">个人活动</div>
            <div className="text-xl font-bold text-blue-700">{typeScoreMap["个人活动"]}</div>
          </div>
          <div className="rounded-lg p-3 text-center shadow border border-green-100 bg-gradient-to-br from-green-100 to-green-50">
            <div className="text-base text-gray-700 font-semibold mb-1">个人比赛</div>
            <div className="text-xl font-bold text-green-700">{typeScoreMap["个人比赛"]}</div>
          </div>
          <div className="rounded-lg p-3 text-center shadow border border-purple-100 bg-gradient-to-br from-purple-100 to-purple-50">
            <div className="text-base text-gray-700 font-semibold mb-1">个人证书</div>
            <div className="text-xl font-bold text-purple-700">{typeScoreMap["个人证书"]}</div>
          </div>
          <div className="rounded-lg p-3 text-center shadow border border-yellow-100 bg-gradient-to-br from-yellow-100 to-yellow-50">
            <div className="text-base text-gray-700 font-semibold mb-1">志愿活动</div>
            <div className="text-xl font-bold text-yellow-700">{typeScoreMap["志愿活动"]}</div>
          </div>
        </div>
      </div>
      <hr className="my-8 border-blue-200" />
      <h2 className="text-xl font-bold mb-4 text-gray-700">提交记录</h2>
      <div className="overflow-x-auto rounded-xl shadow">
        <table className="w-full min-w-[700px] border rounded-xl overflow-hidden bg-white text-base table-fixed">
          <thead className="bg-blue-50">
            <tr>
              <th className="py-2 px-3 w-36">类型</th>
              <th className="py-2 px-3 w-24">分数</th>
              <th className="py-2 px-3 w-28">状态</th>
              <th className="py-2 px-3 w-36">提交时间</th>
              <th className="py-2 px-3 w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {pagedCredits.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-gray-400 py-6">暂无审批记录</td></tr>
            ) : pagedCredits.map(c => {
              // 状态转中文
              const statusMap: Record<string, string> = {
                approved: '已通过',
                rejected: '已拒绝',
                pending: '待审批',
              };
              // 时间格式化 yyyy-MM-dd
              const date = c.created_at ? new Date(c.created_at) : null;
              const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
              // 解析description
              let desc: any = {};
              try { desc = c.description ? JSON.parse(c.description) : {}; } catch {}
              return (
                <tr key={c.id} className="border-t hover:bg-blue-50 transition">
                  <td className="py-2 px-3 align-middle">
                    <div className="font-medium">{c.type}</div>
                    {(() => {
                      if (c.type === '个人活动' && desc.activityName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.activityName}</div>;
                      if (c.type === '个人比赛' && desc.competitionName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.competitionName}</div>;
                      if (c.type === '个人证书' && desc.certificateName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.certificateName}</div>;
                      if (c.type === '志愿活动' && desc.volunteerName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.volunteerName}</div>;
                      return null;
                    })()}
                  </td>
                  <td className="py-2 px-3 align-middle text-center">{c.score}</td>
                  <td className="py-2 px-3 align-middle text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getStatusColor(c.status)}`}>{statusMap[c.status] || c.status}</span>
                  </td>
                  <td className="py-2 px-3 align-middle text-center">{dateStr}</td>
                  <td className="py-2 px-3 align-middle text-center">
                    <button className="text-blue-600 hover:underline" onClick={() => handleShowDetail(c)}>详细</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* 分页控制 */}
        <div className="w-full flex flex-col gap-2 mt-4">
          <div className="text-sm text-gray-600 text-center">
            共 {userApprovals.length} 条记录
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <div className="flex items-center gap-1 justify-center">
              <Button
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="min-w-[40px] whitespace-nowrap px-1"
              >
                首页
              </Button>
              <Button
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="min-w-[40px] whitespace-nowrap px-1"
              >
                上一页
              </Button>
              <span className="mx-1 text-sm whitespace-nowrap">
                <span className="text-blue-600 font-medium">{currentPage}</span>
                <span className="mx-0.5">/</span>
                <span>{totalPages || 1}</span>
              </span>
              <Button
                size="sm"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="min-w-[40px] whitespace-nowrap px-1"
              >
                下一页
              </Button>
              <Button
                size="sm"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(totalPages)}
                className="min-w-[40px] whitespace-nowrap px-1"
              >
                末页
              </Button>
            </div>
          </div>
        </div>
        <div style={{ height: 20 }} />
      </div>
      {/* 详情弹窗 */}
      {detailOpen && detailItem && (() => {
        const statusMap: Record<string, string> = {
          approved: '已通过',
          rejected: '已拒绝',
          pending: '待审批',
        };
        // 只取图片类型
        const imageProofs = (detailItem.proofs || []).filter((p: any) => p.mimetype && p.mimetype.startsWith('image/'));
        // 解析description
        let desc: any = {};
        try { desc = detailItem.description ? JSON.parse(detailItem.description) : {}; } catch {}
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md relative">
              <button className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setDetailOpen(false)}>&times;</button>
              <h3 className="text-lg font-bold mb-2">申请详情</h3>
              <div className="mb-2"><span className="font-semibold">类型：</span>{detailItem.type}
                {/* 新增：显示各类型的名称 */}
                {(() => {
                  if (detailItem.type === '个人活动' && desc.activityName) return <span className="text-gray-500 text-xs ml-2">{desc.activityName}</span>;
                  if (detailItem.type === '个人比赛' && desc.competitionName) return <span className="text-gray-500 text-xs ml-2">{desc.competitionName}</span>;
                  if (detailItem.type === '个人证书' && desc.certificateName) return <span className="text-gray-500 text-xs ml-2">{desc.certificateName}</span>;
                  if (detailItem.type === '志愿活动' && desc.volunteerName) return <span className="text-gray-500 text-xs ml-2">{desc.volunteerName}</span>;
                  return null;
                })()}
              </div>
              <div className="mb-2"><span className="font-semibold">分数：</span>{detailItem.score}</div>
              <div className="mb-2"><span className="font-semibold">状态：</span><span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getStatusColor(detailItem.status)}`}>{statusMap[detailItem.status] || detailItem.status}</span></div>
              <div className="mb-2"><span className="font-semibold">提交时间：</span>{detailItem.created_at?.slice(0, 10)}</div>
              {detailItem.reject_reason && <div className="mb-2"><span className="font-semibold">驳回原因：</span><span className="text-red-600">{detailItem.reject_reason}</span></div>}
              {/* 仅有 proofs 且为数组且长度大于0时才显示证明材料 */}
              {detailItem.proofs && Array.isArray(detailItem.proofs) && detailItem.proofs.length > 0 && (
                <div className="mb-2">
                  <span className="font-semibold">证明材料：</span>
                  <ul className="list-disc ml-5">
                    {detailItem.proofs.map((p: any, idx: number) => {
                      if (p.mimetype && p.mimetype.startsWith('image/')) {
                        // 预览弹窗索引应为图片在imageProofs中的索引
                        const imgIdx = imageProofs.findIndex((img: any) => img.id === p.id);
                        return (
                          <li key={idx} style={{ cursor: 'pointer', display: 'inline-block', marginRight: 8 }} onClick={() => setPreviewIndex(imgIdx)}>
                            <span style={{ width: 40, height: 40, borderRadius: 4, display: 'inline-block', overflow: 'hidden', background: '#f3f4f6' }}>
                              <AuthImage src={p.url} alt={p.name || `材料${idx + 1}`} token={token} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                            </span>
                          </li>
                        );
                      } else {
                        return (
                          <li key={idx} style={{ display: 'inline-block', marginRight: 8 }}>
                            <a href={p.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">{p.name || `材料${idx + 1}`}</a>
                          </li>
                        );
                      }
                    })}
                  </ul>
                  {/* 图片预览弹窗 */}
                  {previewIndex !== null && imageProofs[previewIndex] && (
                    <ImagePreviewModal
                      proofs={imageProofs.map((img: any) => ({ ...img, url: img.url }))}
                      index={previewIndex}
                      onClose={() => setPreviewIndex(null)}
                      onSwitch={i => setPreviewIndex(i)}
                      token={token}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );

  // 详情弹窗拉取单条详情，必须在组件内部
  async function handleShowDetail(item: any) {
    try {
      const t = localStorage.getItem("token");
      const res = await fetch(`/api/credits/${item.id}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDetailItem({ ...item, ...data });
      } else {
        setDetailItem(item);
      }
    } catch {
      setDetailItem(item);
    }
    setDetailOpen(true);
  }
}

// 修改AuthImage支持style透传
function AuthImage({ src, alt, token, style }: { src: string, alt: string, token: string, style?: React.CSSProperties }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    let revoke: string | null = null;
    fetch(src, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        revoke = objectUrl;
      });
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [src, token]);
  if (!url) return <span className="text-gray-400">图片加载中...</span>;
  return <img src={url} alt={alt} style={style} className="border shadow" />;
}

// 审批页同款图片预览弹窗，支持token
function ImagePreviewModal({ proofs, index, onClose, onSwitch, token }: { proofs: any[], index: number, onClose: () => void, onSwitch: (i: number) => void, token: string }) {
  if (!proofs[index] || !proofs[index].url) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <AuthImage src={proofs[index].url} alt={proofs[index].filename || proofs[index].name} token={token} style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 8, background: '#fff', display: 'block' }} />
        <button className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl" onClick={onClose}>&times;</button>
        {proofs.length > 1 && (
          <>
            <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center text-2xl" onClick={() => onSwitch((index - 1 + proofs.length) % proofs.length)}>&lt;</button>
            <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center text-2xl" onClick={() => onSwitch((index + 1) % proofs.length)}>&gt;</button>
          </>
        )}
      </div>
    </div>
  );
}
