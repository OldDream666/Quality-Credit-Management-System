"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function AdminCreditsPage() {
  const [token, setToken] = useState("");
  const [credits, setCredits] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingIndex, setPendingIndex] = useState(0); // 当前审批单索引
  const router = useRouter();
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const rejectInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 权限校验
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
          // 仅班委可访问审批页面
          const allowedRoles = ["monitor", "league_secretary", "study_committee"];
          if (!allowedRoles.includes(data.user.role)) {
            setError("无权限访问该页面");
            setLoading(false);
            setCheckingAuth(false);
            setTimeout(() => router.replace("/dashboard"), 1500);
          } else {
            // 拉取审批数据
            fetch("/api/credits/admin", { headers: { Authorization: `Bearer ${t}` } })
              .then(res => res.ok ? res.json() : { credits: [] })
              .then(data => {
                if (data.credits) setCredits(data.credits);
                else setError(data.error || "加载失败");
                setLoading(false);
                setCheckingAuth(false);
              })
              .catch(() => { 
                setError("加载失败"); 
                setLoading(false); 
                setCheckingAuth(false);
              });
          }
        }
      })
      .catch(() => {
        setError("请先登录");
        setLoading(false);
        setCheckingAuth(false);
        setTimeout(() => router.replace("/login"), 1500);
      });
  }, [router]);

  // 修改 handleApprove 以关闭弹窗
  async function handleApprove(id: number, status: string, reject_reason?: string, score?: number) {
    if (!token) return;
    setError("");
    const body: any = { id, status };
    if (status === 'rejected') body.reject_reason = reject_reason || '';
    if (score) body.score = score;
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
    } else {
      setError(data.error || "操作失败");
    }
  }

  if (checkingAuth || loading) return <div className="text-center mt-12 text-gray-500">加载中...</div>;
  if (error) return <div className="text-red-600 text-center mt-12">{error}</div>;

  // 所有待审批
  const pendings = credits.filter(c => c.status === 'pending');
  const pending = pendings[pendingIndex] || null;
  const totalPending = pendings.length;

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
        <ApprovalCard credit={pending} onApprove={handleApprove} loading={loading} />
      )}
    </div>
  );
}

function ApprovalCard({ credit, onApprove, loading }: { credit: any, onApprove: (id: number, status: string, reject_reason?: string, score?: number) => void, loading: boolean }) {
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
    if (!rejectReason.trim()) return;
    onApprove(credit.id, 'rejected', rejectReason.trim());
    setShowReject(false);
    setRejectReason("");
  }
  function openApprove() {
    // 推荐分数逻辑
    let defaultScore = "";
    if (credit.type === '个人活动') defaultScore = "15";
    else if (credit.type === '志愿活动') {
      let desc: any = {};
      try { desc = credit.description ? JSON.parse(credit.description) : {}; } catch {}
      const hours = Number(desc.volunteerHours) || 0;
      if (hours > 0) defaultScore = String(hours * 6);
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
    if (!approveScore || isNaN(Number(approveScore))) return;
    onApprove(credit.id, 'approved', undefined, Number(approveScore));
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
              placeholder="分数（必填）"
              value={approveScore}
              onChange={e => setApproveScore(e.target.value.replace(/[^\d.]/g, ''))}
              maxLength={5}
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-2">
              <button className="px-4 py-1 rounded border" onClick={closeApprove}>取消</button>
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded"
                disabled={!approveScore || isNaN(Number(approveScore))}
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
                disabled={!rejectReason.trim()}
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
            <ProofFileLink key={p.id} proofId={p.id} filename={p.filename} />
          )
        )}
      </div>
      {/* 图片预览弹窗 */}
      {previewIndex !== null && proofs[previewIndex] && proofs[previewIndex].mimetype.startsWith('image/') && (
        <ImagePreviewModal
          proofs={proofs.filter(p => p.mimetype && p.mimetype.startsWith('image/'))}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onSwitch={i => setPreviewIndex(i)}
        />
      )}
    </>
  );
}

// 新增：图片预览弹窗组件
function ImagePreviewModal({ proofs, index, onClose, onSwitch }: { proofs: any[], index: number, onClose: () => void, onSwitch: (i: number) => void }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    const token = localStorage.getItem("token");
    let revoke: string | null = null;
    fetch(`/api/credits/proof-file?id=${proofs[index].id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.blob() : null)
      .then(blob => {
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
          revoke = objectUrl;
        }
      });
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
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

// 新增：带token加载图片
function ProofImage({ proofId, filename, style }: { proofId: number, filename: string, style?: React.CSSProperties }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    const token = localStorage.getItem("token");
    let revoke: string | null = null;
    fetch(`/api/credits/proof-file?id=${proofId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.blob() : null)
      .then(blob => {
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
          revoke = objectUrl;
        }
      });
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [proofId]);
  if (!url) return <span style={{display:'inline-block',width:60,height:60,background:'#f3f3f3',borderRadius:4,textAlign:'center',lineHeight:'60px',color:'#bbb',...style}}>图片加载中</span>;
  return <img src={url} alt={filename} style={{ maxWidth: 60, maxHeight: 60, borderRadius: 4, cursor: 'pointer', ...style }} />;
}

// 新增：带token下载非图片文件
function ProofFileLink({ proofId, filename }: { proofId: number, filename: string }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`/api/credits/proof-file?id=${proofId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.blob() : null)
      .then(blob => {
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      });
    // 不回收url，下载后由浏览器回收
  }, [proofId]);
  if (!url) return <span className="text-gray-400">加载中...</span>;
  return <a href={url} download={filename} className="text-blue-600 underline">{filename}</a>;
}
