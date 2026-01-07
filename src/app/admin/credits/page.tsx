"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/AuthProvider";
import { toast } from 'react-hot-toast';

export default function AdminCreditsPage() {
  const { user, loading } = useAuth();
  const [credits, setCredits] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [pendingIndex, setPendingIndex] = useState(0); // 当前审批单索引
  const router = useRouter();
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const rejectInputRef = useRef<HTMLInputElement>(null);
  const [creditTypesConfig, setCreditTypesConfig] = useState<Record<string, any>>({});
  const [systemConfigs, setSystemConfigs] = useState<any>({});
  const [errorNotified, setErrorNotified] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (!user || loading) return;
    const loadConfig = async () => {
      try {
        const configResponse = await fetch("/api/config/credit-types");
        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.types && configData.types.length > 0) {
            const config: Record<string, any> = {};
            configData.types.forEach((type: any) => {
              config[type.key] = type;
            });
            setCreditTypesConfig(config);
          }
        }
      } catch (error) {
        console.error('加载配置失败:', error);
      }
    };
    Promise.all([
      fetch("/api/credits/admin").then(res => res.ok ? res.json() : { credits: [] }),
      loadConfig()
    ]).then(([data]) => {
      if (data.credits) setCredits(data.credits);
      else setError(data.error || "加载失败");
    }).catch(() => {
      setError("加载失败");
    });
  }, [user, loading, router]);

  useEffect(() => {
    fetch("/api/config/system")
      .then(res => res.ok ? res.json() : null)
      .then(configData => {
        if (configData) {
          // 不再将 systemConfigs 存入 localStorage（可能包含敏感或过期的权限数据）
          setSystemConfigs(configData);
        }
      });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setCheckingAuth(false);
      setTimeout(() => router.replace('/login'), 1500);
      return;
    }
    if (!systemConfigs.roles) return; // roles 未加载时不做权限判断
    // 权限判断
    const userRoleConfig = systemConfigs.roles?.find((r: any) => r.key === user?.role);
    const userPermissions = Array.isArray(userRoleConfig?.permissions) ? userRoleConfig.permissions : [];
    const canApprove = userPermissions.includes('credits.approve') || userPermissions.includes('credits.view');
    if (user.role === 'admin' || !canApprove) {
      setCheckingAuth(false);
      setTimeout(() => router.replace('/dashboard'), 1500);
      return;
    }
    setCheckingAuth(false);
  }, [user, loading, systemConfigs, router]);

  // 修改 handleApprove 以关闭弹窗
  async function handleApprove(id: number, status: string, reject_reason?: string, score?: number) {
    if (!user) return;
    setError("");
    const body: any = { id, status };
    if (status === 'rejected') body.reject_reason = reject_reason || '';
    if (score !== undefined) body.score = score;
    const res = await fetch("/api/credits/admin", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      setCredits(credits => {
        const newList = credits.filter(c => c.id !== id);
        // 若当前审批单被删除，自动跳到上一条或下一条
        if (pendingIndex > 0 && pendingIndex >= newList.filter(c => c.status === 'pending').length) {
          setPendingIndex(pendingIndex - 1);
        }
        return newList;
      });
      setShowReject(false);
      setRejectReason("");
      toast.success('审批完成');
    } else {
      setError(data.error || "操作失败");
    }
  }

  // 所有待审批
  const pendings = credits.filter(c => c.status === 'pending');
  const pending = pendings[pendingIndex] || null;
  const totalPending = pendings.length;

  if (loading || checkingAuth || !systemConfigs.roles) return <div className="text-center mt-12 text-gray-500">加载中...</div>;
  if (!user) return <div className="text-center mt-12 text-red-600">未登录</div>;
  const userRoleConfig = systemConfigs.roles?.find((r: any) => r.key === user?.role);
  const userPermissions = Array.isArray(userRoleConfig?.permissions) ? userRoleConfig.permissions : [];
  const canApprove = userPermissions.includes('credits.approve') || userPermissions.includes('credits.view');
  if (user.role === 'admin' || !canApprove) return <div className="text-center mt-12 text-red-600">无权限</div>;

  return (
    <div className="max-w-3xl mx-auto">
      {/* 页面标题和状态栏 */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">学分审批</h1>
            <p className="text-gray-500 text-sm mt-1">审核学生提交的学分申请</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 px-4 py-2 rounded-xl">
              <span className="text-gray-600 text-sm">待审批</span>
              <span className="text-2xl font-bold text-blue-600 ml-2">{totalPending}</span>
            </div>
            <button
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
              onClick={() => router.push("/admin/credits/history")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              历史记录
            </button>
          </div>
        </div>
      </div>

      {/* 导航控制 */}
      {totalPending > 0 && (
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            className="flex items-center gap-1 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={pendingIndex === 0}
            onClick={() => setPendingIndex(i => Math.max(0, i - 1))}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            上一条
          </button>
          <span className="text-gray-600 font-medium">
            {pendingIndex + 1} / {totalPending}
          </span>
          <button
            className="flex items-center gap-1 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={pendingIndex === totalPending - 1}
            onClick={() => setPendingIndex(i => Math.min(totalPending - 1, i + 1))}
          >
            下一条
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* 审批卡片 */}
      {!pending ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 flex flex-col items-center justify-center">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-gray-400 text-lg">当前暂无待审批申请</div>
          <p className="text-gray-300 text-sm mt-2">所有申请都已处理完毕</p>
        </div>
      ) : (
        <ApprovalCard credit={pending} onApprove={handleApprove} loading={loading} creditTypesConfig={creditTypesConfig} systemConfigs={systemConfigs} />
      )}
    </div>
  );
}

function ApprovalCard({ credit, onApprove, loading, creditTypesConfig, systemConfigs }: {
  credit: any,
  onApprove: (id: number, status: string, reject_reason?: string, score?: number) => void,
  loading: boolean,
  creditTypesConfig: Record<string, any>,
  systemConfigs: any
}) {
  const statusMap: Record<string, string> = {
    approved: '已通过',
    rejected: '已拒绝',
    pending: '待审批',
  };
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showApprove, setShowApprove] = useState(false);
  const [approveScore, setApproveScore] = useState("");
  const rejectInputRef = useRef<HTMLInputElement>(null);
  const approveInputRef = useRef<HTMLInputElement>(null);

  function openReject() {
    setShowReject(true);
    setTimeout(() => rejectInputRef.current?.focus(), 100);
  }
  function closeReject() {
    setShowReject(false);
    setRejectReason("");
  }
  function submitReject() {
    if (!rejectReason.trim()) {
      toast.error('请填写驳回原因');
      return;
    }
    onApprove(credit.id, 'rejected', rejectReason.trim());
    setShowReject(false);
    setRejectReason("");
  }
  function openApprove() {
    // 推荐分数逻辑（完全基于动态配置）
    let defaultScore = "";
    const typeConfig = creditTypesConfig[credit.type];

    if (typeConfig) {
      if (typeConfig.scoreCalculation === 'fixed') {
        // 固定分数
        defaultScore = String(typeConfig.defaultScore || 0);
      } else if (typeConfig.scoreCalculation === 'time_based' && credit.type === '志愿活动') {
        // 按时长计算
        let desc: any = {};
        try { desc = credit.description ? JSON.parse(credit.description) : {}; } catch { }
        const hours = Number(desc.volunteerHours) || 0;
        const scorePerHour = typeConfig.scorePerHour || 0;
        if (hours > 0) defaultScore = String((hours * scorePerHour).toFixed(2));
      }
    } else {
      // 配置未加载，等待配置加载
      console.warn('配置未加载，无法计算推荐分数');
    }

    setApproveScore(defaultScore);
    setShowApprove(true);
    setTimeout(() => approveInputRef.current?.focus(), 100);
  }
  function closeApprove() {
    setShowApprove(false);
    setApproveScore("");
  }
  function submitApprove() {
    const trimmed = (approveScore).trim();
    if (trimmed === '') {
      toast.error('请输入分数');
      return;
    }
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      toast.error('请输入合法的数字分数');
      return;
    }
    const numScore = Number(trimmed);
    if (isNaN(numScore) || numScore < 0 || numScore > 1000) {
      toast.error('分数必须在0-1000之间');
      return;
    }
    onApprove(credit.id, 'approved', undefined, numScore);
    setShowApprove(false);
    setApproveScore("");
  }

  // 解析description
  let desc: {
    activityName?: string;
    competitionName?: string;
    certificateName?: string;
    volunteerName?: string;
    volunteerHours?: string | number;
  } = {};
  try { desc = credit.description ? JSON.parse(credit.description) : {}; } catch { }

  // 动态渲染类型特有字段
  const typeConfig = creditTypesConfig[credit.type] || {};
  const dynamicFields = Array.isArray(typeConfig.fields) ? typeConfig.fields : [];

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* 申请人信息头部 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {credit.user_name?.charAt(0) || '?'}
            </div>
            <div>
              <div className="font-bold text-lg text-gray-800">{credit.user_name}</div>
              <div className="text-gray-500 text-sm">{credit.user_username} · {credit.user_class}</div>
            </div>
          </div>
          <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
            {credit.type}
          </div>
        </div>
      </div>

      {/* 申请内容 */}
      <div className="p-6">
        {/* 动态字段 */}
        {dynamicFields.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">申请详情</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dynamicFields.map((field: any) => {
                const fieldKey = typeof field === 'string' ? field : field.key;
                const fieldLabel =
                  (systemConfigs?.availableFields?.find((f: any) => f.key === fieldKey)?.label)
                  || (typeof field === 'object' && field.label)
                  || fieldKey;
                const fieldType = systemConfigs?.availableFields?.find((f: any) => f.key === fieldKey)?.type;
                let value = (desc as Record<string, any>)[fieldKey];
                if (fieldType === 'file' || fieldKey === 'proofFiles' || fieldKey === 'proofs') return null;
                if (value === undefined || value === null || value === "") return null;
                return (
                  <div key={fieldKey} className="bg-gray-50 rounded-lg px-4 py-3">
                    <div className="text-xs text-gray-500 mb-1">{fieldLabel}</div>
                    <div className="font-medium text-gray-800">{value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 志愿活动分数计算 */}
        {credit.type === '志愿活动' && desc.volunteerHours && (() => {
          const typeConfig = creditTypesConfig[credit.type];
          const hours = Number(desc.volunteerHours) || 0;
          if (typeConfig && typeConfig.scoreCalculation === 'time_based' && hours > 0) {
            const scorePerHour = typeConfig.scorePerHour || 0;
            const calculatedScore = ((hours * scorePerHour).toFixed(2));
            return (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">推荐分数计算</span>
                </div>
                <div className="mt-2 text-lg font-bold text-blue-800">
                  {hours} 小时 × {scorePerHour} 分/小时 = <span className="text-2xl">{calculatedScore}</span> 分
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* 证明材料 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">证明材料</h3>
          <div className="bg-gray-50 rounded-xl p-4">
            <ProofList proofs={credit.proofs} />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4 pt-4 border-t border-gray-100">
          <button
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-green-500/30 transition-all duration-200 flex items-center justify-center gap-2"
            disabled={loading}
            onClick={openApprove}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            通过
          </button>
          <button
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            disabled={loading}
            onClick={openReject}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            驳回
          </button>
        </div>
      </div>
      {/* 通过弹窗 */}
      {showApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80 flex flex-col gap-4">
            <div className="font-bold text-lg mb-2 text-green-700">请输入审批通过的分数</div>
            <input
              ref={approveInputRef}
              className="border rounded px-3 py-2 w-full"
              placeholder="分数（必填，0-1000）"
              value={approveScore}
              onChange={e => setApproveScore(e.target.value)}
              maxLength={7}
              autoFocus
            />
            {/* 分数计算说明 */}
            {(() => {
              const typeConfig = creditTypesConfig[credit.type];
              if (typeConfig) {
                if (typeConfig.scoreCalculation === 'fixed') {
                  return (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      💡 建议分数：{typeConfig.defaultScore || 0} 分（固定分数）
                    </div>
                  );
                } else if (typeConfig.scoreCalculation === 'time_based' && credit.type === '志愿活动') {
                  let desc: any = {};
                  try { desc = credit.description ? JSON.parse(credit.description) : {}; } catch { }
                  const hours = Number(desc.volunteerHours) || 0;
                  const scorePerHour = typeConfig.scorePerHour || 0;
                  const calculatedScore = ((hours * scorePerHour).toFixed(2));
                  return (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      📊 建议分数：{hours} 小时 × {scorePerHour} 分/小时 = {calculatedScore} 分
                    </div>
                  );
                } else if (typeConfig.scoreCalculation === 'manual') {
                  return (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      ✏️ 手动输入分数（根据具体情况评定）
                    </div>
                  );
                }
              }
              return null;
            })()}
            <div className="flex gap-2 justify-end mt-2">
              <button className="px-4 py-1 rounded border" onClick={closeApprove}>取消</button>
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded"
                onClick={submitApprove}
              >确定通过</button>
            </div>
          </div>
        </div>
      )}
      {/* 驳回弹窗 */}
      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80 flex flex-col gap-4">
            <div className="font-bold text-lg mb-2 text-red-700">请输入驳回原因</div>
            <input
              ref={rejectInputRef}
              className="border rounded px-3 py-2 w-full"
              placeholder="驳回原因（必填）"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-2">
              <button className="px-4 py-1 rounded border" onClick={closeReject}>取消</button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded"
                onClick={submitReject}
              >确定驳回</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 组件：多文件证明材料展示
function ProofList({ proofs }: { proofs: any[] }) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const imageProofs = proofs.filter(p => p.mimetype && p.mimetype.startsWith('image/'));
  if (!proofs || !proofs.length) return <>-</>;
  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {proofs.map((p, idx) =>
          p.mimetype && p.mimetype.startsWith('image/') ? (
            <span key={p.id} style={{ display: 'inline-block', cursor: 'pointer' }} onClick={() => setPreviewIndex(idx)}>
              <ProofImage proofId={p.id} filename={p.filename} style={{ border: previewIndex === idx ? '2px solid #2563eb' : undefined }} />
            </span>
          ) : (
            <ProofFileLink key={p.id} proofId={p.id} filename={p.filename} mimetype={p.mimetype} />
          )
        )}
      </div>
      {/* 图片预览弹窗 */}
      {previewIndex !== null && imageProofs[previewIndex] && (
        <ImagePreviewModal
          proofs={imageProofs}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onSwitch={i => setPreviewIndex(i)}
        />
      )}
    </>
  );
}

// 加载图片（不再传递token，依赖 httpOnly cookie）
function ProofImage({ proofId, filename, style }: { proofId: number, filename: string, style?: React.CSSProperties }) {
  const [url, setUrl] = useState<string>("");
  const cacheRef = useRef<{ [id: number]: string }>({});
  const pendingRef = useRef<{ [id: number]: Promise<string> }>({});
  useEffect(() => {
    if (cacheRef.current[proofId]) {
      setUrl(cacheRef.current[proofId]);
      return;
    }
    if (typeof pendingRef.current[proofId] !== 'undefined') {
      pendingRef.current[proofId].then(cachedUrl => {
        if (cachedUrl) setUrl(cachedUrl);
      });
      return;
    }
    const request = fetch(`/api/credits/proof-file?id=${proofId}`)
      .then(res => res.ok ? res.blob() : null)
      .then(blob => {
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          cacheRef.current[proofId] = objectUrl;
          delete pendingRef.current[proofId];
          return objectUrl;
        }
        delete pendingRef.current[proofId];
        return "";
      })
      .catch(() => {
        delete pendingRef.current[proofId];
        return "";
      });
    pendingRef.current[proofId] = request;
    request.then(url => {
      if (url) setUrl(url);
    });
  }, [proofId]);
  if (!url) return <span style={{ display: 'inline-block', width: 60, height: 60, background: '#f3f3f3', borderRadius: 4, textAlign: 'center', lineHeight: '60px', color: '#bbb', ...style }}>图片加载中</span>;
  return <img src={url} alt={filename} style={{ maxWidth: 60, maxHeight: 60, borderRadius: 4, cursor: 'pointer', ...style }} />;
}

// 下载/预览非图片文件（不再传递token，依赖 httpOnly cookie）
function ProofFileLink({ proofId, filename, mimetype }: { proofId: number, filename: string, mimetype?: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleClick = async () => {
    setDownloading(true);
    setError("");
    try {
      const res = await fetch(`/api/credits/proof-file?id=${proofId}`);
      if (!res.ok) {
        const txt = await res.text();
        setError(txt || "下载失败");
        setDownloading(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (mimetype === 'application/pdf') {
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000 * 60);
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {
      setError("下载失败");
    }
    setDownloading(false);
  };

  return (
    <span>
      <button
        onClick={handleClick}
        disabled={downloading}
        className="text-blue-600 underline bg-transparent border-none cursor-pointer"
        style={{ padding: 0, margin: 0 }}
      >
        {filename}
      </button>
      {downloading && <span className="text-gray-400 ml-2">{mimetype === 'application/pdf' ? '加载中...' : '下载中...'}</span>}
      {error && <span className="text-red-500 ml-2">{error}</span>}
    </span>
  );
}
// 图片预览弹窗（不再传递token，依赖 httpOnly cookie）
function ImagePreviewModal({ proofs, index, onClose, onSwitch }: { proofs: any[], index: number, onClose: () => void, onSwitch: (i: number) => void }) {
  const [url, setUrl] = useState<string>("");
  const cacheRef = useRef<{ [id: number]: string }>({});
  const pendingRef = useRef<{ [id: number]: Promise<string> }>({});
  useEffect(() => {
    const proofId = proofs[index]?.id;
    if (!proofId) return;
    if (cacheRef.current[proofId]) {
      setUrl(cacheRef.current[proofId]);
      return;
    }
    if (typeof pendingRef.current[proofId] !== 'undefined') {
      pendingRef.current[proofId].then(cachedUrl => {
        if (cachedUrl) setUrl(cachedUrl);
      });
      return;
    }
    const request = fetch(`/api/credits/proof-file?id=${proofId}`)
      .then(res => res.ok ? res.blob() : null)
      .then(blob => {
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          cacheRef.current[proofId] = objectUrl;
          delete pendingRef.current[proofId];
          return objectUrl;
        }
        delete pendingRef.current[proofId];
        return "";
      })
      .catch(() => {
        delete pendingRef.current[proofId];
        return "";
      });
    pendingRef.current[proofId] = request;
    request.then(url => {
      if (url) setUrl(url);
    });
  }, [index, proofs]);
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <img src={url} alt={proofs[index].filename} style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 8, background: '#fff' }} />
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