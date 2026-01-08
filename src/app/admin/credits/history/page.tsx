"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/AuthProvider";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function CreditsHistoryPage() {
  const { user, loading } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const router = useRouter();
  const [systemConfigs, setSystemConfigs] = useState<any>({});

  // 筛选状态
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [fetched, setFetched] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 修改分数相关状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editScore, setEditScore] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 删除功能
  const handleDelete = async (recordId: number) => {
    if (!confirm("确定要删除这条记录吗？删除后无法恢复。")) return;

    try {
      const res = await fetch(`/api/credits/${recordId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== recordId));
        // filteredRecords 会通过 useEffect 自动更新吗？
        // 不会，因为 filteredRecords 是独立状态，虽然 useEffect 依赖 records，但只有 records 引用变化时才会触发。
        // setRecords(prev => ...) 可能会触发 useEffect，如果 useEffect 依赖的是 records。
        // 查看 line 212: useEffect(..., [records, ...])。是的，会触发。
        // 所以这里不需要手动更新 filteredRecords。
      } else {
        const data = await res.json();
        alert(data.error || "删除失败");
      }
    } catch (err) {
      console.error(err);
      alert("删除失败");
    }
  };

  // 导出功能
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (onlyMine) params.append('onlyMine', 'true');

      const response = await fetch(`/api/credits/history/export?${params.toString()}`, {
        headers: {
          // token 已由 httpOnly cookie 管理，无需传递
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `历史审批数据_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        alert(errorData.error || '导出失败');
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleEditClick = (record: any) => {
    setEditingRecord(record);
    setEditScore(String(record.score || 0));
    setShowEditModal(true);
  };

  const handleSaveScore = async () => {
    if (!editingRecord) return;

    // 验证
    const scoreNum = Number(editScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 3000) {
      alert("分数必须在 0 到 3000 之间");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/credits/${editingRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ score: scoreNum })
      });

      if (res.ok) {
        // 更新本地数据
        const updatedRecords = records.map(r =>
          r.id === editingRecord.id ? { ...r, score: scoreNum } : r
        );
        setRecords(updatedRecords);
        // 如果 filteredRecords 是独立的引用，也需要更新，或者依赖 useEffect 重新计算
        // 这里的筛选逻辑依赖 records 变化，所以更新 records 应该会触发筛选重算？
        // 看代码 useEffect [records, ...] 会触发筛选。

        setShowEditModal(false);
        setEditingRecord(null);
        setEditScore("");
      } else {
        const data = await res.json();
        alert(data.error || "保存失败");
      }
    } catch (err) {
      console.error(err);
      alert("保存出错，请检查网络");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!user || loading || fetched) return;
    setFetched(true);
    fetch("/api/credits/history")
      .then(res => res.ok ? res.json() : { credits: [] })
      .then(data => {
        if (data.credits) {
          const historyRecords = data.credits.filter((c: any) => c.status !== 'pending');
          setRecords(historyRecords);
          setFilteredRecords(historyRecords);
        } else {
          setError(data.error || "加载失败");
        }
        setLoadingData(false);
      })
      .catch(() => {
        setError("加载失败");
        setLoadingData(false);
      });
  }, [user, loading, fetched]);

  useEffect(() => {
    fetch("/api/config/system")
      .then(res => res.ok ? res.json() : null)
      .then(configData => {
        if (configData) setSystemConfigs(configData);
      });
  }, []);

  // 筛选逻辑
  useEffect(() => {
    setFilterLoading(true);

    // 使用 setTimeout 来避免过于频繁的筛选
    const timeoutId = setTimeout(() => {
      let filtered = records;

      // 新增：只看我审批的
      if (onlyMine && user) {
        filtered = filtered.filter(r => r.approver_id === user.id);
      }

      // 搜索筛选
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(r =>
          (r.user_name && r.user_name.toLowerCase().includes(term)) ||
          (r.user_username && r.user_username.toLowerCase().includes(term))
        );
      }

      // 类型筛选
      if (typeFilter) {
        filtered = filtered.filter(r => r.type === typeFilter);
      }

      // 状态筛选
      if (statusFilter) {
        filtered = filtered.filter(r => r.status === statusFilter);
      }

      // 日期范围筛选
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filtered = filtered.filter(r => {
          const recordDate = new Date(r.approved_at || r.rejected_at || r.updated_at || r.created_at);
          return recordDate >= fromDate;
        });
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // 设置为当天最后一刻
        filtered = filtered.filter(r => {
          const recordDate = new Date(r.approved_at || r.rejected_at || r.updated_at || r.created_at);
          return recordDate <= toDate;
        });
      }

      setFilteredRecords(filtered);
      setFilterLoading(false);
    }, 300); // 300ms 防抖

    return () => clearTimeout(timeoutId);
  }, [records, searchTerm, typeFilter, statusFilter, dateFrom, dateTo, onlyMine, user]);

  // 分页计算
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  // 当筛选条件改变时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, dateFrom, dateTo]);

  // 清除所有筛选
  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  };

  if (loading || loadingData || !systemConfigs.roles) return <div className="text-center mt-12 text-gray-500">加载中...</div>;
  if (!user) return <div className="text-center mt-12 text-red-600">未登录</div>;
  const userRoleConfig = systemConfigs.roles?.find((r: any) => r.key === user?.role);
  const userPermissions = Array.isArray(userRoleConfig?.permissions) ? userRoleConfig.permissions : [];
  const canView = user.role === 'admin' || userPermissions.includes('credits.view') || userPermissions.includes('system.admin');
  const canEditScore = user.role === 'admin' || userPermissions.includes('credits.approve');

  if (!canView) return <div className="text-center mt-12 text-red-600">无权限</div>;

  // 获取所有类型和状态选项
  const allTypes = Array.from(new Set(records.map(r => r.type))).sort();
  const allStatuses = Array.from(new Set(records.map(r => r.status))).sort();

  return (
    <div className="w-full relative">
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">历史审批记录</h1>
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <input type="text" placeholder="搜索姓名或学号..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">{showFilters ? '隐藏筛选' : '显示筛选'}</button>
            <button
              onClick={handleExport}
              disabled={exporting || filteredRecords.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed ml-2"
            >
              {exporting ? '导出中...' : '导出数据'}
            </button>
            <label className="flex items-center gap-2 ml-4 cursor-pointer select-none">
              <input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} />
              <span className="text-blue-700 text-sm">只看我审批的</span>
            </label>
          </div>
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">全部类型</option>
                  {allTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">全部状态</option>
                  {allStatuses.map(status => (
                    <option key={status} value={status}>
                      {status === 'approved' ? '已通过' :
                        status === 'rejected' ? '已拒绝' :
                          status === 'pending' ? '待审批' : status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}
          <div className="mt-4 text-sm text-gray-600">
            共找到 <span className="font-bold text-blue-600">{filteredRecords.length}</span> 条记录
            {(searchTerm || typeFilter || statusFilter || dateFrom || dateTo) && (
              <span className="ml-2">
                (共 <span className="font-bold">{records.length}</span> 条记录)
              </span>
            )}
            {totalPages > 1 && (
              <span className="ml-2">
                | 第 <span className="font-bold">{currentPage}</span> 页，共 <span className="font-bold">{totalPages}</span> 页
              </span>
            )}
            {filteredRecords.length > 0 && (
              <div className="mt-2 text-xs text-green-600">
                💡 点击"导出数据"可下载当前筛选条件下的Excel统计表和证明材料文件包。
              </div>
            )}
          </div>
        </div>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        {loadingData ? (
          <div className="text-center text-gray-500">加载中...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            {records.length === 0 ? "暂无历史审批记录" : "没有找到匹配的记录"}
          </div>
        ) : (
          <>
            {filterLoading && (
              <div className="text-center text-gray-500 mb-4">正在筛选...</div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full border rounded overflow-hidden bg-white min-w-[1000px] text-sm sm:text-base table-fixed">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="py-2 px-3 w-28">姓名</th>
                    <th className="py-2 px-3 w-32">学号</th>
                    <th className="py-2 px-3 w-36">类型</th>
                    <th className="py-2 px-3 w-32">分数</th>
                    <th className="py-2 px-3 w-40">证明材料</th>
                    <th className="py-2 px-3 w-28">状态</th>
                    <th className="py-2 px-3 w-28">审批人</th>
                    <th className="py-2 px-3 w-36">审批时间</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map(r => (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="py-2 px-3 align-middle text-center">{r.user_name || r.username || '-'}</td>
                      <td className="py-2 px-3 align-middle text-center">{r.user_username || r.username || '-'}</td>
                      <td className="py-2 px-3 align-middle text-center">{r.type}
                        {(() => {
                          let desc: any = {};
                          try { desc = r.description ? JSON.parse(r.description) : {}; } catch { }
                          if (r.type === '个人活动' && desc.activityName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.activityName}</div>;
                          if (r.type === '个人比赛' && desc.competitionName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.competitionName}</div>;
                          if (r.type === '个人证书' && desc.certificateName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.certificateName}</div>;
                          if (r.type === '志愿活动' && desc.volunteerName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.volunteerName}-{desc.volunteerHours}h</div>;
                          return null;
                        })()}
                      </td>
                      <td className="py-2 px-3 align-middle text-center relative group">
                        <span>{Number(r.score).toFixed(2)}</span>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          {canEditScore && r.status === 'approved' && (
                            <button
                              onClick={() => handleEditClick(r)}
                              className="text-blue-500 hover:text-blue-700 p-1"
                              title="修改分数"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                          )}
                          {/* 只有管理员或有审批权限的人能看见删除按钮(后端会校验权限，前端这里简单判断canEditScore即可，或者更严格的isAdmin) */}
                          {/* canEditScore包括admin和credits.approve，符合我们的后端逻辑 */}
                          {canEditScore && (
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="删除记录"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 align-middle text-center"><ProofList proofs={r.proofs} /></td>
                      <td className="py-2 px-3 align-middle text-center">
                        <span className={
                          r.status === 'approved' ? 'bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold' :
                            r.status === 'rejected' ? 'bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold' :
                              r.status === 'pending' ? 'bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold' :
                                'bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold'
                        }>
                          {r.status === 'approved' ? '已通过' : r.status === 'rejected' ? '已拒绝' : r.status === 'pending' ? '待审批' : r.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 align-middle text-center">{r.approver_name || r.approver_id || '-'}</td>
                      <td className="py-2 px-3 align-middle text-center">{
                        formatDate(
                          r.approved_at || r.rejected_at || r.updated_at || r.created_at
                        ) || '-'
                      }</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">每页显示：</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={10}>10条</option>
                    <option value={20}>20条</option>
                    <option value={50}>50条</option>
                    <option value={100}>100条</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    首页
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一页
                  </button>

                  <span className="px-3 py-1 text-sm">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一页
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    末页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 修改分数 Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">修改分数</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                学生：{editingRecord.user_name || editingRecord.username}
              </label>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                项目：{editingRecord.type}
              </label>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">新分数</label>
              <input
                type="number"
                step="0.01"
                value={editScore}
                onChange={e => setEditScore(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="3000"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">范围：0 - 3000</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                disabled={isSaving}
              >
                取消
              </button>
              <button
                onClick={handleSaveScore}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}


function ProofList({ proofs }: { proofs: any[] }) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const imageProofs = proofs.filter(p => p.mimetype && p.mimetype.startsWith('image/'));

  if (!proofs || !proofs.length) return <>-</>;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {proofs.map((p, idx) => {
          if (p.mimetype && p.mimetype.startsWith('image/')) {
            const imgIdx = imageProofs.findIndex(img => img.id === p.id);
            return (
              <span key={p.id} style={{ display: 'inline-block', cursor: 'pointer' }} onClick={() => setPreviewIndex(imgIdx)}>
                <ProofImage proofId={p.id} filename={p.filename} style={{ border: previewIndex === imgIdx ? '2px solid #2563eb' : undefined }} />
              </span>
            );
          } else {
            return (
              <span key={p.id}>
                <ProofFileLink proofId={p.id} filename={p.filename} mimetype={p.mimetype} />
              </span>
            );
          }
        })}
      </div>
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

function ProofImage({ proofId, filename, style }: { proofId: number, filename: string, style?: React.CSSProperties }) {
  const url = `/api/credits/proof-file?id=${proofId}`;
  return <img src={url} alt={filename} style={{ maxWidth: 40, maxHeight: 40, borderRadius: 4, cursor: 'pointer', objectFit: 'cover', ...style }} loading="lazy" />;
}

function ProofFileLink({ proofId, filename, mimetype }: { proofId: number, filename: string, mimetype?: string }) {
  const url = `/api/credits/proof-file?id=${proofId}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline text-xs"
      style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}
      download={filename}
    >
      {filename}
    </a>
  );
}

function ImagePreviewModal({ proofs, index, onClose, onSwitch }: { proofs: any[], index: number, onClose: () => void, onSwitch: (i: number) => void }) {
  const proofId = proofs[index]?.id;
  const url = `/api/credits/proof-file?id=${proofId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <img src={url} alt={proofs[index].filename} style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 8, background: '#fff', objectFit: 'contain' }} />
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
