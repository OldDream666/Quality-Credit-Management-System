"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRoleLabel, getStatusColor, getStatusLabel, getCreditTypeColor, getCreditTypeLabel, formatDate } from "@/lib/utils";
import { ChevronUpIcon, ChevronDownIcon, MegaphoneIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/AuthProvider";

// 新增：简单公告类型
interface Notice {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

// 获取活动名称的函数（基于字段内容推测）
const getActivityName = (type: string, desc: any) => {
  // 直接根据已知字段获取活动名称
  if (desc.activityName) return desc.activityName;
  if (desc.competitionName) return desc.competitionName;
  if (desc.certificateName) return desc.certificateName;
  if (desc.volunteerName) {
    return desc.volunteerName + (desc.volunteerHours ? `-${desc.volunteerHours}h` : '');
  }

  return null;
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [credits, setCredits] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]); // 公告
  const [expandedNotices, setExpandedNotices] = useState<Record<number, boolean>>({});
  const [detailOpen, setDetailOpen] = useState(false); // 详情弹窗
  const [detailItem, setDetailItem] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [systemConfigs, setSystemConfigs] = useState<any>({ roles: [], statuses: [], creditTypes: [] });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [error, setError] = useState("");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null); // 修改hooks顺序
  const router = useRouter();
  // 分页相关
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(credits.length / pageSize);
  const pagedCredits = credits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    fetch("/api/config/system")
      .then(res => res.ok ? res.json() : null)
      .then(configData => {
        if (configData) {
          setSystemConfigs({
            roles: configData.roles || [],
            statuses: configData.statuses || [],
            creditTypes: configData.creditTypes || []
          });
        }
        setConfigLoaded(true);
      })
      .catch(() => setConfigLoaded(true));
    fetch("/api/credits/admin")
      .then(res => res.ok ? res.json() : { credits: [] })
      .then(data => {
        if (data.credits) setApprovals(data.credits);
      });
    fetch("/api/users")
      .then(res => res.ok ? res.json() : { users: [] })
      .then(data => setAllUsers(data.users || []));
    fetch("/api/credits")
      .then(res => res.json())
      .then(data => {
        setCredits(data.credits || []);
      });
    fetch("/api/notices")
      .then(res => res.ok ? res.json() : { notices: [] })
      .then(data => setNotices(data.notices || []));
  }, [router]);

  if (loading || !configLoaded) return <div className="text-center mt-12 text-gray-500">加载中...</div>;
  if (!user) return null;

  // 管理员仪表盘
  if (user.role === 'admin') {
    const total = approvals.length;
    const pending = approvals.filter((c: any) => c.status === 'pending').length;
    const approved = approvals.filter((c: any) => c.status === 'approved').length;
    const rejected = approvals.filter((c: any) => c.status === 'rejected').length;
    const userCount = allUsers.length;

    // 动态统计各角色数量（基于实际用户数据）
    const roleStats: Record<string, { count: number; label: string; color: string }> = {};

    // 从用户数据中动态收集角色统计
    allUsers.forEach(user => {
      if (!roleStats[user.role]) {
        roleStats[user.role] = {
          count: 0,
          label: getRoleLabel(user.role, systemConfigs.roles) || user.role,
          color: getColorForRole(user.role)
        };
      }
      roleStats[user.role].count++;
    });

    // 获取角色对应的颜色（动态获取）
    function getColorForRole(role: string) {
      if (systemConfigs.roles && systemConfigs.roles.length > 0) {
        const config = systemConfigs.roles.find((r: any) => r.key === role);
        return config?.cardColor || 'from-gray-50 to-gray-100';
      }
      return 'from-gray-50 to-gray-100'; // 默认颜色
    }

    // 获取角色对应的文字颜色（动态获取）
    function getTextColorForRole(role: string) {
      if (systemConfigs.roles && systemConfigs.roles.length > 0) {
        const config = systemConfigs.roles.find((r: any) => r.key === role);
        // 从color字段中提取文字颜色，如 "bg-blue-100 text-blue-700" -> "text-blue-700"
        if (config?.color) {
          const colorMatch = config.color.match(/text-[\w-]+/);
          return colorMatch ? colorMatch[0] : 'text-gray-700';
        }
      }
      return 'text-gray-700'; // 默认颜色
    }

    const latestUsers = [...allUsers].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

    return (
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">管理员仪表盘</h1>
          <p className="text-gray-500">欢迎回来，{user.name || user.username}</p>
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="rounded-xl p-5 bg-gradient-to-br from-blue-100 to-blue-200 shadow text-center">
            <div className="text-4xl font-bold text-blue-700">{userCount}</div>
            <div className="text-gray-600 mt-1">系统用户</div>
          </div>
          {/* 动态生成角色统计卡片 */}
          {Object.entries(roleStats).map(([roleKey, roleData]) => (
            <div key={roleKey} className={`rounded-xl p-5 shadow text-center bg-gradient-to-br ${roleData.color}`}>
              <div className={`text-2xl font-bold ${getTextColorForRole(roleKey)}`}>{roleData.count}</div>
              <div className="text-gray-600 mt-1">{roleData.label}</div>
            </div>
          ))}
          <div className="rounded-xl p-5 bg-gradient-to-br from-blue-100 to-blue-200 shadow text-center">
            <div className="text-2xl font-bold text-blue-700">{total}</div>
            <div className="text-gray-600 mt-1">审批单</div>
          </div>
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
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
                  <span className="ml-2 text-xs text-gray-400">角色：{getRoleLabel(u.role, systemConfigs.roles)}</span>
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
  // 检查是否有审批权限（从系统配置中动态判断）
  const userRoleConfig = systemConfigs.roles?.find((r: any) => r.key === user.role);
  const userPermissions = Array.isArray(userRoleConfig?.permissions) ? userRoleConfig.permissions : [];
  const isApprover = userPermissions.includes('credits.approve') || userPermissions.includes('credits.reject');
  const userApprovals = credits;
  const userTotalScore = (credits || []).filter((c: any) => c.status === 'approved').reduce((sum: number, c: any) => sum + Number(c.score), 0);

  // 统计各类型分数（基于实际数据动态计算）
  const typeScoreMap: Record<string, { score: number; label: string; color: string }> = {};

  // 从学分数据中动态收集类型统计
  (credits || []).forEach((c: any) => {
    if (c.status === 'approved' && c.type) {
      if (!typeScoreMap[c.type]) {
        typeScoreMap[c.type] = {
          score: 0,
          label: getCreditTypeLabel(c.type, systemConfigs.creditTypes), // 使用动态标签
          color: getColorForCreditType(c.type)
        };
      }
      typeScoreMap[c.type].score += Number(c.score) || 0;
    }
  });

  // 获取学分类型对应的颜色（动态获取）
  function getColorForCreditType(type: string) {
    if (systemConfigs.creditTypes && systemConfigs.creditTypes.length > 0) {
      const config = systemConfigs.creditTypes.find((t: any) => t.key === type);
      return config?.cardColor || 'from-gray-50 to-gray-100';
    }
    return 'from-gray-50 to-gray-100'; // 默认颜色
  }
  // 获取学分类型对应的分数字体颜色（动态获取）
  function getTextColorForCreditType(type: string) {
    if (systemConfigs.creditTypes && systemConfigs.creditTypes.length > 0) {
      const config = systemConfigs.creditTypes.find((t: any) => t.key === type);
      if (config?.color) {
        const colorMatch = config.color.match(/text-[\w-]+/);
        return colorMatch ? colorMatch[0] : 'text-blue-700';
      }
    }
    return 'text-blue-700';
  }

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">我的仪表盘</h1>
        <div className="flex flex-wrap gap-4 text-gray-500">
          <span>👤 {user.name}（{user.username}）</span>
          <span>🏷️ {getRoleLabel(user.role, systemConfigs.roles)}</span>
          {user.class && <span>📚 {user.class}</span>}
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
                  className={`mt-1 overflow-hidden transition-all duration-300 ${expandedNotices[n.id] ? 'max-h-[500px]' : 'max-h-[5em]'
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
          {Object.entries(typeScoreMap).map(([key, typeData]) => (
            <div key={key} className={`rounded-lg p-3 text-center shadow bg-gradient-to-br ${typeData.color}`}>
              <div className="text-base text-gray-700 font-semibold mb-1">{typeData.label}</div>
              <div className={`text-xl font-bold ${getTextColorForCreditType(key)}`}>{typeData.score}</div>
            </div>
          ))}
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
              <tr><td colSpan={5} className="text-center text-gray-400 py-6">暂无提交记录</td></tr>
            ) : pagedCredits.map(c => {
              // 时间格式化 yyyy-MM-dd
              const date = c.created_at ? new Date(c.created_at) : null;
              const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
              // 解析description
              let desc: any = {};
              try { desc = c.description ? JSON.parse(c.description) : {}; } catch { }
              return (
                <tr key={c.id} className="border-t hover:bg-blue-50 transition">
                  <td className="py-2 px-3 align-middle">
                    <div className="font-medium">{getCreditTypeLabel(c.type, systemConfigs.creditTypes)}</div>
                    {(() => {
                      const activityName = getActivityName(c.type, desc);
                      return activityName ? <div className="text-gray-500 text-xs whitespace-nowrap">{activityName}</div> : null;
                    })()}
                  </td>
                  <td className="py-2 px-3 align-middle text-center">{c.score}</td>
                  <td className="py-2 px-3 align-middle text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getStatusColor(c.status, systemConfigs.statuses)}`}>{getStatusLabel(c.status, systemConfigs.statuses)}</span>
                  </td>
                  <td className="py-2 px-3 align-middle text-center">{dateStr}</td>
                  <td className="py-2 px-3 align-middle text-center">
                    <button className="text-blue-600 hover:underline mr-2" onClick={() => handleShowDetail(c)}>详细</button>
                    {c.status === 'pending' && (
                      <button
                        className="text-red-500 hover:underline hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("确定要撤销这条申请吗？撤销后将删除该记录。")) {
                            handleRevoke(c.id);
                          }
                        }}
                      >
                        撤销
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* 分页控制条移到表格外部 */}
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
      {/* 详情弹窗 */}
      {detailOpen && detailItem && (() => {
        // 只取图片类型
        const imageProofs = (detailItem.proofs || []).filter((p: any) => p.mimetype && p.mimetype.startsWith('image/'));
        // 解析description
        let desc: any = {};
        try { desc = detailItem.description ? JSON.parse(detailItem.description) : {}; } catch { }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md relative">
              <button className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setDetailOpen(false)}>&times;</button>
              <h3 className="text-lg font-bold mb-2">申请详情</h3>
              <div className="mb-2"><span className="font-semibold">类型：</span>{getCreditTypeLabel(detailItem.type, systemConfigs.creditTypes)}
                {/* 新增：显示各类型的名称 */}
                {(() => {
                  const activityName = getActivityName(detailItem.type, desc);
                  return activityName ? <span className="text-gray-500 text-xs ml-2">{activityName}</span> : null;
                })()}
              </div>
              <div className="mb-2"><span className="font-semibold">分数：</span>{detailItem.score}</div>
              <div className="mb-2"><span className="font-semibold">状态：</span><span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getStatusColor(detailItem.status, systemConfigs.statuses)}`}>{getStatusLabel(detailItem.status, systemConfigs.statuses)}</span></div>
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
                            {/* 缩略图容器：使用 max 宽高约束，图片保持原始纵横比 */}
                            <span style={{ maxWidth: 120, maxHeight: 120, borderRadius: 4, display: 'inline-block', overflow: 'hidden', background: '#f3f4f6' }}>
                              <img src={p.url} alt={p.name || `材料${idx + 1}`} style={{ maxWidth: 120, maxHeight: 120, width: 'auto', height: 'auto', borderRadius: 4, display: 'block', objectFit: 'cover' }} loading="lazy" />
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
                    // token 已由 httpOnly cookie 管理，无需传递
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

  async function handleRevoke(id: number) {
    try {
      const res = await fetch(`/api/credits/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCredits(prev => prev.filter(c => c.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "撤销失败");
      }
    } catch (err) {
      alert("撤销失败，请重试");
    }
  }

  // 详情弹窗拉取单条详情，必须在组件内部
  async function handleShowDetail(item: any) {
    try {
      const res = await fetch(`/api/credits/${item.id}`, {
        credentials: 'include',
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

// 审批页同款图片预览弹窗
function ImagePreviewModal({ proofs, index, onClose, onSwitch }: { proofs: any[], index: number, onClose: () => void, onSwitch: (i: number) => void }) {
  if (!proofs[index] || !proofs[index].url) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <img src={proofs[index].url} alt={proofs[index].filename || proofs[index].name} style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 8, background: '#fff', display: 'block', objectFit: 'contain' }} />
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
