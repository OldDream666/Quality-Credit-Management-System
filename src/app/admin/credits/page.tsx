"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/AuthProvider";
import { toast } from 'react-hot-toast';

export default function AdminCreditsPage() {
  const { user, loading } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
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
          localStorage.setItem('systemConfigs', JSON.stringify(configData));
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
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      setCredits(credits => {
        const newList = credits.filter(c => c.id !== id);
        // 若当前审批单被删除，自动跳到上一条或下一条
        if (pendingIndex > 0 && pendingIndex >= newList.filter(c=>c.status==='pending').length) {
          setPendingIndex(pendingIndex-1);
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
    <div className="max-w-xl mx-auto card mt-8 sm:mt-16 p-4 sm:p-10 bg-white rounded-2xl shadow-xl relative">
      <span
        className="absolute left-4 top-4 text-blue-700 hover:underline hover:text-blue-900 cursor-pointer flex items-center text-base select-none"
        onClick={() => router.push("/admin/credits/overview")}
        style={{ fontSize: '1rem' }}
      >
        <svg className="inline mr-1" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 16L7 10L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        返回
      </span>
      <div style={{ height: 12 }} />
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-8 text-blue-800">学分审批</h1>
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-600">剩余待审：<span className="font-bold text-blue-600">{totalPending}</span></span>
        <div className="flex gap-2 items-center">
          {totalPending > 0 && (
            <>
              <button
                className="border border-blue-600 text-blue-700 px-3 py-1 rounded disabled:opacity-50"
                disabled={pendingIndex === 0}
                onClick={() => setPendingIndex(i => Math.max(0, i-1))}
              >上一条</button>
              <button
                className="border border-blue-600 text-blue-700 px-3 py-1 rounded disabled:opacity-50"
                disabled={pendingIndex === totalPending-1}
                onClick={() => setPendingIndex(i => Math.min(totalPending-1, i+1))}
              >下一条</button>
            </>
          )}
          <button
            className="border border-blue-600 text-blue-700 hover:bg-blue-50 font-medium px-4 py-1.5 rounded transition shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ml-2"
            onClick={() => router.push("/admin/credits/history")}
          >
            查看历史审批记录
          </button>
        </div>
      </div>
      {!pending ? (
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="text-gray-400 text-lg mb-6">当前暂无审批</div>
        </div>
      ) : (
        <ApprovalCard credit={pending} onApprove={handleApprove} loading={loading} creditTypesConfig={creditTypesConfig} />
      )}
    </div>
  );
}

function ApprovalCard({ credit, onApprove, loading, creditTypesConfig }: { 
  credit: any, 
  onApprove: (id: number, status: string, reject_reason?: string, score?: number) => void, 
  loading: boolean,
  creditTypesConfig: Record<string, any>
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
        try { desc = credit.description ? JSON.parse(credit.description) : {}; } catch {}
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
  try { desc = credit.description ? JSON.parse(credit.description) : {}; } catch {}

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <div><span className="font-bold">姓名：</span>{credit.user_name}</div>
        <div><span className="font-bold">学号：</span>{credit.user_username}</div>
        <div><span className="font-bold">班级：</span>{credit.user_class}</div>
        <div><span className="font-bold">类型：</span>{credit.type}</div>
      </div>
      {/* 新增：显示各类型详细信息 */}
      {credit.type === '个人活动' && desc.activityName && <div><span className="font-bold">活动名称：</span>{desc.activityName}</div>}
      {credit.type === '个人比赛' && desc.competitionName && <div><span className="font-bold">比赛名称：</span>{desc.competitionName}</div>}
      {credit.type === '个人证书' && desc.certificateName && <div><span className="font-bold">证书名称：</span>{desc.certificateName}</div>}
      {credit.type === '志愿活动' && (
        <>
          <div><span className="font-bold">活动名称：</span>{desc.volunteerName}</div>
          <div><span className="font-bold">志愿时长：</span>{desc.volunteerHours} 小时</div>
          {/* 显示分数计算 */}
          {(() => {
            const typeConfig = creditTypesConfig[credit.type];
            const hours = Number(desc.volunteerHours) || 0;
            if (typeConfig && typeConfig.scoreCalculation === 'time_based' && hours > 0) {
              const scorePerHour = typeConfig.scorePerHour || 0;
              const calculatedScore = ((hours * scorePerHour).toFixed(2));
              return (
                <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  📊 按时长计算：{hours} 小时 × {scorePerHour} 分/小时 = {calculatedScore} 分
                </div>
              );
            }
            return null;
          })()}
        </>
      )}
      <div>
        <span className="font-bold">证明材料：</span>
        <ProofList proofs={credit.proofs} />
      </div>
      <div>
        <span className="font-bold">状态：</span>{statusMap[credit.status] || credit.status}
      </div>
      <div className="flex gap-4 mt-2">
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2 rounded shadow transition focus:outline-none focus:ring-2 focus:ring-green-300"
          disabled={loading}
          onClick={openApprove}
        >通过</button>
        <button
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-5 py-2 rounded shadow transition focus:outline-none focus:ring-2 focus:ring-gray-300"
          disabled={loading}
          onClick={openReject}
        >驳回</button>
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
                  try { desc = credit.description ? JSON.parse(credit.description) : {}; } catch {}
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

// 新增：带token加载图片
function ProofImage({ proofId, filename, style }: { proofId: number, filename: string, style?: React.CSSProperties }) {
  const [url, setUrl] = useState<string>("");
  const cacheRef = useRef<{ [id: number]: string }>({});
  const pendingRef = useRef<{ [id: number]: Promise<string> }>({});
  
  useEffect(() => {
    // 检查缓存
    if (cacheRef.current[proofId]) {
      setUrl(cacheRef.current[proofId]);
      return;
    }
    
    // 检查是否已有pending请求
    if (typeof pendingRef.current[proofId] !== 'undefined') {
      pendingRef.current[proofId].then(cachedUrl => {
        if (cachedUrl) setUrl(cachedUrl);
      });
      return;
    }
    
    // 发起新请求
    const token = localStorage.getItem("token");
    const request = fetch(`/api/credits/proof-file?id=${proofId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
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
  
  if (!url) return <span style={{display:'inline-block',width:60,height:60,background:'#f3f3f3',borderRadius:4,textAlign:'center',lineHeight:'60px',color:'#bbb',...style}}>图片加载中</span>;
  return <img src={url} alt={filename} style={{ maxWidth: 60, maxHeight: 60, borderRadius: 4, cursor: 'pointer', ...style }} />;
}

// 新增：带token下载/预览非图片文件
function ProofFileLink({ proofId, filename, mimetype }: { proofId: number, filename: string, mimetype?: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleClick = async () => {
    setDownloading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/credits/proof-file?id=${proofId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

function ImagePreviewModal({ proofs, index, onClose, onSwitch }: { proofs: any[], index: number, onClose: () => void, onSwitch: (i: number) => void }) {
  const [url, setUrl] = useState<string>("");
  const cacheRef = useRef<{ [id: number]: string }>({});
  const pendingRef = useRef<{ [id: number]: Promise<string> }>({});
  
  useEffect(() => {
    const proofId = proofs[index]?.id;
    if (!proofId) return;
    
    // 检查缓存
    if (cacheRef.current[proofId]) {
      setUrl(cacheRef.current[proofId]);
      return;
    }
    
    // 检查是否已有pending请求
    if (typeof pendingRef.current[proofId] !== 'undefined') {
      pendingRef.current[proofId].then(cachedUrl => {
        if (cachedUrl) setUrl(cachedUrl);
      });
      return;
    }
    
    // 发起新请求
    const token = localStorage.getItem("token");
    const request = fetch(`/api/credits/proof-file?id=${proofId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
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