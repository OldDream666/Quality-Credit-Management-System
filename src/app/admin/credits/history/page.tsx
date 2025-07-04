"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/AuthProvider";

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
  const [pageSize, setPageSize] = useState(20);

  const [fetched, setFetched] = useState(false);
  const [exporting, setExporting] = useState(false);

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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
  if (!canView) return <div className="text-center mt-12 text-red-600">无权限</div>;

  // 获取所有类型和状态选项
  const allTypes = Array.from(new Set(records.map(r => r.type))).sort();
  const allStatuses = Array.from(new Set(records.map(r => r.status))).sort();

  return (
    <div className="min-h-screen flex justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-8">
      <div className="max-w-6xl w-full bg-white rounded-xl shadow-lg p-8 mt-6 sm:mt-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-700">历史审批记录</h1>
          <button className="border border-blue-600 text-blue-700 hover:bg-blue-50 font-medium px-4 py-1.5 rounded transition shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300" onClick={() => router.push("/admin")}>返回审批</button>
        </div>
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
                    <th className="py-2 px-3 w-20">分数</th>
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
                          try { desc = r.description ? JSON.parse(r.description) : {}; } catch {}
                          if (r.type === '个人活动' && desc.activityName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.activityName}</div>;
                          if (r.type === '个人比赛' && desc.competitionName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.competitionName}</div>;
                          if (r.type === '个人证书' && desc.certificateName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.certificateName}</div>;
                          if (r.type === '志愿活动' && desc.volunteerName) return <div className="text-gray-500 text-xs whitespace-nowrap">{desc.volunteerName}-{desc.volunteerHours}h</div>;
                          return null;
                        })()}
                      </td>
                      <td className="py-2 px-3 align-middle text-center">{r.score}</td>
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
            {totalPages > 1 && (
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
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function ProofList({ proofs }: { proofs: any[] }) {
  const [urls, setUrls] = useState<{ [id: number]: string }>({});
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const cacheRef = useRef<{ [id: number]: string }>({});
  const pendingRef = useRef<{ [id: number]: Promise<string> }>({});

  useEffect(() => {
    if (!proofs || !proofs.length) return;
    const t = localStorage.getItem("token");
    const uncachedProofs = proofs.filter(p => !cacheRef.current[p.id] && !urls[p.id] && typeof pendingRef.current[p.id] === 'undefined');
    if (uncachedProofs.length === 0) {
      // 使用缓存的数据
      const cachedUrls = proofs.reduce((acc, p) => {
        if (cacheRef.current[p.id]) {
          acc[p.id] = cacheRef.current[p.id];
        }
        return acc;
      }, {} as { [id: number]: string });
      if (Object.keys(cachedUrls).length > 0) {
        setUrls(cachedUrls);
      }
      return;
    }
    // 批量获取文件
    const proofIds = uncachedProofs.map(p => p.id).join(',');
    // 创建批量请求的 Promise
    const batchRequest = fetch(`/api/credits/proof-file?ids=${proofIds}`, {
      headers: { Authorization: `Bearer ${t}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.files) {
          const newUrls: { [id: number]: string } = {};
          data.files.forEach((fileData: any) => {
            const bytes = base64ToUint8Array(fileData.file);
            const blob = new Blob([bytes], { type: fileData.mimetype });
            const objectUrl = URL.createObjectURL(blob);
            cacheRef.current[fileData.id] = objectUrl;
            newUrls[fileData.id] = objectUrl;
            // 清理 pending 状态
            delete pendingRef.current[fileData.id];
          });
          return newUrls;
        }
        return {};
      })
      .catch(error => {
        console.warn('批量请求失败，回退到单个请求:', error);
        // 批量请求失败，回退到单个请求
        const singleRequests = uncachedProofs.map(p => {
          const request = fetch(`/api/credits/proof-file?id=${p.id}`, {
            headers: { Authorization: `Bearer ${t}` }
          })
            .then(res => res.ok ? res.blob() : null)
            .then(blob => {
              if (blob) {
                const objectUrl = URL.createObjectURL(blob);
                cacheRef.current[p.id] = objectUrl;
                delete pendingRef.current[p.id];
                return { id: p.id, url: objectUrl };
              }
              delete pendingRef.current[p.id];
              return null;
            })
            .catch(() => {
              delete pendingRef.current[p.id];
              return null;
            });
          pendingRef.current[p.id] = request.then(result => result?.url || '');
          return request;
        });
        return Promise.all(singleRequests).then(results => {
          const newUrls = results.reduce((acc, result) => {
            if (result && typeof result === 'object' && 'id' in result && 'url' in result) {
              acc[result.id] = result.url;
            }
            return acc;
          }, {} as { [id: number]: string });
          return newUrls;
        });
      });
    // 标记所有未缓存的请求为 pending
    uncachedProofs.forEach(p => {
      if (!pendingRef.current[p.id]) {
        pendingRef.current[p.id] = batchRequest.then(urls => urls[p.id] || '');
      }
    });
    // 处理结果
    batchRequest.then(newUrls => {
      if (Object.keys(newUrls).length > 0) {
        setUrls(prev => ({ ...prev, ...newUrls }));
      }
    });
    return () => {
      // 清理函数：如果组件卸载，清理 pending 状态
      uncachedProofs.forEach(p => {
        delete pendingRef.current[p.id];
      });
    };
  }, [JSON.stringify(proofs)]);

  if (!proofs || !proofs.length) return <>-</>;
  const imageProofs = proofs.filter(p => p.mimetype && p.mimetype.startsWith('image/'));
  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {proofs.map((p, idx) => {
          const url = urls[p.id] || cacheRef.current[p.id];
          if (p.mimetype && p.mimetype.startsWith('image/')) {
            const imgIdx = imageProofs.findIndex(img => img.id === p.id);
            return (
              <span key={p.id} style={{ display: 'inline-block', cursor: 'pointer' }} onClick={() => setPreviewIndex(imgIdx)}>
                {url ? (
                  <img 
                    src={url} 
                    alt={p.filename} 
                    style={{ maxWidth: 40, maxHeight: 40, borderRadius: 4 }}
                    loading="lazy"
                  />
                ) : (
                  <div 
                    style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 4, 
                      background: '#f3f4f6', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: '#9ca3af'
                    }}
                  >
                    加载中
                  </div>
                )}
              </span>
            );
          } else {
            // pdf和其它类型都显示为下载链接
            return (
              <a 
                key={p.id} 
                href={url || '#'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 underline text-xs"
                style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {p.filename}
              </a>
            );
          }
        })}
      </div>
      {previewIndex !== null && imageProofs[previewIndex] && (
        <ImagePreviewModal
          proofs={imageProofs.map(img => ({ ...img, url: urls[img.id] || cacheRef.current[img.id] }))}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onSwitch={i => setPreviewIndex(i)}
        />
      )}
    </>
  );
}

// 审批页同款图片预览弹窗
function ImagePreviewModal({ proofs, index, onClose, onSwitch }: { proofs: any[], index: number, onClose: () => void, onSwitch: (i: number) => void }) {
  if (!proofs[index] || !proofs[index].url) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <img src={proofs[index].url} alt={proofs[index].filename} style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 8, background: '#fff' }} />
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
