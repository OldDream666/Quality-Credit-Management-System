"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import ExcelJS from "exceljs";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { usersAPI } from '@/lib/api';
import { toast, Toaster } from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [roleEditUser, setRoleEditUser] = useState<any>(null);
  const [roleEditValue, setRoleEditValue] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterMajor, setFilterMajor] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [groupsPerPage, setGroupsPerPage] = useState(3);
  const router = useRouter();

  // 先声明所有筛选相关变量
  const gradeOptions = Array.from(new Set(users.map(u => u.grade).filter(Boolean))).sort();
  const filteredUsersForOptions = users.filter(u => {
    if (filterGrade && u.grade !== filterGrade) return false;
    return true;
  });
  const majorOptions = Array.from(new Set(filteredUsersForOptions.map(u => u.major).filter(Boolean))).sort();
  const filteredUsersForClass = users.filter(u => {
    if (filterGrade && u.grade !== filterGrade) return false;
    if (filterMajor && u.major !== filterMajor) return false;
    return true;
  });
  const classOptions = Array.from(new Set(filteredUsersForClass.map(u => u.class).filter(Boolean))).sort();
  const roleOptions = [
    { value: "", label: "全部角色" },
    { value: "student", label: "学生" },
    { value: "monitor", label: "班长" },
    { value: "league_secretary", label: "团支书" },
    { value: "study_committee", label: "学习委员" },
    { value: "admin", label: "管理员" },
  ];
  // 再声明filteredUsers
  const filteredUsers = users.filter(u => {
    if (filterClass && u.class !== filterClass) return false;
    if (filterGrade && u.grade !== filterGrade) return false;
    if (filterMajor && u.major !== filterMajor) return false;
    if (filterRole && u.role !== filterRole) return false;
    if (search) {
      const s = search.trim();
      return (
        (u.name && u.name.includes(s)) ||
        (u.username && u.username.includes(s)) ||
        (u.student_id && u.student_id.includes(s)) ||
        (u.class && u.class.includes(s)) ||
        (u.major && u.major.includes(s))
      );
    }
    return true;
  }).sort((a, b) => {
    // 首先按角色排序：管理员在前，其他角色在后
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    
    // 然后按年级排序（降序，高年级在前）
    if (a.grade && b.grade) {
      const gradeA = parseInt(a.grade.replace(/\D/g, '')) || 0;
      const gradeB = parseInt(b.grade.replace(/\D/g, '')) || 0;
      if (gradeA !== gradeB) return gradeB - gradeA;
    }
    
    // 再按专业排序（字母顺序）
    if (a.major && b.major) {
      const majorCompare = a.major.localeCompare(b.major, 'zh-CN');
      if (majorCompare !== 0) return majorCompare;
    }
    
    // 再按班级排序（数字顺序）
    if (a.class && b.class) {
      const classA = parseInt(a.class.replace(/\D/g, '')) || 0;
      const classB = parseInt(b.class.replace(/\D/g, '')) || 0;
      if (classA !== classB) return classA - classB;
      // 如果班级数字相同，按完整班级名排序
      return a.class.localeCompare(b.class, 'zh-CN');
    }
    
    // 最后按学号排序（数字顺序）
    if (a.student_id && b.student_id) {
      const studentIdA = parseInt(a.student_id) || 0;
      const studentIdB = parseInt(b.student_id) || 0;
      if (studentIdA !== studentIdB) return studentIdA - studentIdB;
    }
    
    // 如果都相同，按姓名排序
    if (a.name && b.name) {
      return a.name.localeCompare(b.name, 'zh-CN');
    }
    
    return 0;
  });
  // 再声明依赖filteredUsers的变量
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  
  // 先对全部数据进行分组
  const allGroups = filteredUsers.reduce((acc: Record<string, User[]>, u) => {
    let key = u.class || '未分班';
    // 如果是未分班且是管理员，key直接用'管理员'
    if (key === '未分班' && u.role === 'admin') key = '管理员';
    if (!acc[key]) acc[key] = [];
    acc[key].push(u);
    return acc;
  }, {});

  // 对分组进行排序
  const sortedGroups = Object.entries(allGroups)
    .sort(([a], [b]) => {
      // 管理员组排最前
      if (a === '管理员' && b !== '管理员') return -1;
      if (a !== '管理员' && b === '管理员') return 1;
      // 未分班排最后
      if (a === '未分班' && b !== '未分班') return 1;
      if (a !== '未分班' && b === '未分班') return -1;
      // 其他按班级名排序（数字顺序）
      const classA = parseInt(a.replace(/\D/g, '')) || 0;
      const classB = parseInt(b.replace(/\D/g, '')) || 0;
      if (classA !== classB) return classA - classB;
      // 如果班级数字相同，按完整班级名排序
      return a.localeCompare(b, 'zh-CN');
    });

  // 计算分页
  const totalPages = Math.ceil(sortedGroups.length / groupsPerPage);
  const startGroupIndex = (currentPage - 1) * groupsPerPage;
  const endGroupIndex = startGroupIndex + groupsPerPage;
  const currentPageGroups = sortedGroups.slice(startGroupIndex, endGroupIndex);
  
  // 获取当前页的所有用户
  const pagedUsers = currentPageGroups.reduce((acc, [_, users]) => [...acc, ...users], [] as User[]);

  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t || "");
    if (!t) {
      setError("请先登录");
      setCheckingAuth(false);
      setTimeout(() => router.replace("/login"), 1500);
      return;
    }
    // 校验管理员权限
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          // 清除cookie，确保服务端也能识别退出状态
          document.cookie = 'token=; Max-Age=0; path=/;';
          setError("登录状态已失效，请重新登录");
          setCheckingAuth(false);
          setTimeout(() => router.push("/login"), 1500);
          return { user: null };
        }
        return res.json();
      })
      .then(data => {
        if (data.user && data.user.role === "admin") {
          fetchUsers();
          setCheckingAuth(false);
        } else if (!data.user) {
          setError("请先登录");
          setCheckingAuth(false);
          setTimeout(() => router.replace("/login"), 1500);
        } else {
          setError("无权限访问该页面");
          setCheckingAuth(false);
          setTimeout(() => router.replace("/dashboard"), 1500);
        }
      })
      .catch(() => {
        setError("请先登录");
        setCheckingAuth(false);
        setTimeout(() => router.replace("/login"), 1500);
      });
  }, []);

  async function fetchUsers() {
    try {
      const response = await usersAPI.getAllUsers();
      setUsers(response.users);
    } catch (error: any) {
      setError(error.message || "加载失败");
    }
  }

  async function handleDeleteUser(id: number) {
    if (!window.confirm("确定要删除该用户吗？")) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setUsers(users => users.filter(u => u.id !== id));
      toast.success("删除成功");
    } else {
      const data = await res.json();
      toast.error(data.error || "删除失败");
    }
  }


  async function handleUpdateRole(user: any, newRole: string) {
    if (user.role === newRole) return;
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: newRole })
    });
    if (res.ok) {
      setUsers(users => users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      toast.success("角色已更新");
      setRoleEditUser(null);
    } else {
      const data = await res.json();
      toast.error(data.error || "角色修改失败");
    }
  }

  async function handleResetPassword(id: number) {
    if (!window.confirm("确定要重置该用户的密码吗？重置后密码将为学号后6位。")) return;
    try {
      await usersAPI.resetUserPassword(id);
      toast.success('密码已重置为学号后6位');
    } catch (error: any) {
      toast.error(error.message || "重置密码失败");
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要批量删除选中的 ${selectedIds.length} 个用户吗？`)) return;
    const res = await fetch("/api/admin/users/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: selectedIds })
    });
    if (res.ok) {
      setUsers(users => users.filter(u => !selectedIds.includes(u.id)));
      setSelectedIds([]);
      toast.success("批量删除成功");
      setTimeout(() => window.location.reload(), 2000);
    } else {
      const data = await res.json();
      toast.error(data.error || "批量删除失败");
      setTimeout(() => window.location.reload(), 2000);
    }
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  const handleUnlock = async (username: string) => {
    try {
      const response = await usersAPI.unlockUser(username);
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success('账号解锁成功');
      // 刷新用户列表
      fetchUsers();
    } catch (error) {
      toast.error('解锁账号失败，请稍后重试');
    }
  };

  if (checkingAuth) return <div className="text-center mt-12 text-gray-500">权限校验中...</div>;
  if (error) return <div className="text-red-600 text-center mt-12">{error}</div>;

  return (
    <div className="users-bg min-h-screen flex justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-2 sm:px-4 py-8">
      <Toaster position="top-center" />
      <div className="max-w-6xl w-full bg-white rounded-xl shadow-lg p-4 sm:p-8 relative">
        <span className="absolute left-4 top-4 text-blue-700 hover:underline hover:text-blue-900 cursor-pointer flex items-center text-base select-none" onClick={() => router.push("/dashboard")} style={{ fontSize: '1rem' }}>
          <svg className="inline mr-1" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 16L7 10L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          返回
        </span>
        <div className="h-12 sm:h-8" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-700">用户管理</h1>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => router.push("/admin/structure")}
              className="flex-1 sm:flex-none text-center justify-center"
            >
              架构管理
            </Button>
            <Button 
              onClick={() => router.push("/admin/users/add")}
              className="flex-1 sm:flex-none text-center justify-center"
            >
              添加用户
            </Button>
            <Button 
              onClick={() => exportUsersToExcel(filteredUsers)}
              className="flex-1 sm:flex-none text-center justify-center"
            >
              导出Excel
            </Button>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-[180px] w-48 flex-shrink-0">
              <Input placeholder="搜索姓名/用户名/学号..." value={search} onChange={e => setSearch(e.target.value)} className="w-full" />
            </div>
            <div className="min-w-[120px] w-32 flex-shrink-0">
              <Select value={filterGrade} onChange={v => setFilterGrade(v)} className="w-full" options={[{value:'',label:'全部年级'},...gradeOptions.map(g=>({value:g,label:g}))]} placeholder="全部年级" />
            </div>
            <div className="min-w-[120px] w-32 flex-shrink-0">
              <Select value={filterMajor} onChange={v => setFilterMajor(v)} className="w-full" options={[{value:'',label:'全部专业'},...majorOptions.map(m=>({value:m,label:m}))]} placeholder="全部专业" />
            </div>
            <div className="min-w-[120px] w-32 flex-shrink-0">
              <Select value={filterClass} onChange={v => setFilterClass(v)} className="w-full" options={[{value:'',label:'全部班级'},...classOptions.map(c=>({value:c,label:c}))]} placeholder="全部班级" />
            </div>
            <div className="min-w-[120px] w-32 flex-shrink-0">
              <Select value={filterRole} onChange={v => setFilterRole(v)} className="w-full" options={roleOptions} placeholder="全部角色" />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border max-h-[60vh] bg-white shadow" ref={tableRef} style={{ position: 'relative' }}>
          <table className="min-w-max w-full text-sm text-gray-700">
            <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
              <tr>
                <th className="p-3 font-bold text-gray-700 whitespace-nowrap">
                  <input type="checkbox" checked={pagedUsers.length>0 && pagedUsers.every(u=>selectedIds.includes(u.id))} onChange={e=>{
                    if(e.target.checked) setSelectedIds([...new Set([...selectedIds, ...pagedUsers.map(u=>u.id)])]);
                    else setSelectedIds(selectedIds.filter(id=>!pagedUsers.map(u=>u.id).includes(id)));
                  }} />
                </th>
                <th className="p-3 font-bold text-gray-700 whitespace-nowrap">用户名</th>
                <th className="p-3 font-bold text-gray-700 whitespace-nowrap">姓名</th>
                <th className="p-3 font-bold text-gray-700 whitespace-nowrap">学号</th>
                <th className="p-3 font-bold text-gray-700 whitespace-nowrap">角色</th>
                <th className="p-3 font-bold text-gray-700 whitespace-nowrap">年级</th>
                <th className="p-3 font-bold text-gray-700 whitespace-nowrap">专业</th>
                <th className="p-3 font-bold text-gray-700 whitespace-nowrap">班级</th>
                <th className="p-3 font-bold text-gray-700 whitespace-nowrap">注册时间</th>
                <th className="p-3 font-bold text-gray-700 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-gray-400 py-8">暂无数据</td></tr>
              ) : (
                currentPageGroups.map(([cls, users]) => {
                  // 判断分组标题
                  let groupLabel = cls;
                  if (cls === '未分班') {
                    const allAdmin = users.every(u => u.role === 'admin');
                    if (allAdmin) groupLabel = '管理员';
                  }
                  return [
                    <tr key={cls} className="bg-blue-50 font-bold text-blue-800 text-base sticky top-0 z-10">
                      <td colSpan={10} className="py-2 pl-2">{groupLabel} <span className="text-xs text-gray-400 font-normal">({allGroups[cls].length}人)</span></td>
                    </tr>,
                    ...users.map(u => (
                      <tr key={u.id} className="hover:bg-blue-50 transition border-b border-blue-100">
                        <td className="p-2 align-middle">
                          <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={e=>{
                            if(e.target.checked) setSelectedIds([...selectedIds, u.id]);
                            else setSelectedIds(selectedIds.filter(id=>id!==u.id));
                          }} />
                        </td>
                        <td className="p-2 align-middle">{u.username}</td>
                        <td className="p-2 align-middle">{u.name}</td>
                        <td className="p-2 align-middle">{u.student_id}</td>
                        <td className="p-2 align-middle flex items-center gap-2">
                          <RoleTag role={u.role} onClick={() => setRoleEditUser(u)} />
                        </td>
                        <td className="p-2 align-middle">{u.grade}</td>
                        <td className="p-2 align-middle">{u.major}</td>
                        <td className="p-2 align-middle">{u.class}</td>
                        <td className="p-2 align-middle">{u.created_at?.slice(0,10)}</td>
                        <td className="p-2 align-middle flex flex-wrap gap-1 min-w-[120px]">
                          <Button size="sm" onClick={()=>setDetailUser(u)}>详情</Button>
                          <Button size="sm" onClick={()=>handleResetPassword(u.id)}>重置密码</Button>
                          <Button size="sm" color="red" onClick={()=>handleDeleteUser(u.id)}>删除</Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleUnlock(u.username)}
                          >
                            解锁账号
                          </Button>
                        </td>
                      </tr>
                    ))
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
        {/* 分页控制 */}
        <div className="w-full flex flex-col gap-2 mt-4">
          <div className="text-sm text-gray-600 text-center">
            共 {filteredUsers.length} 条记录，{sortedGroups.length} 个班级
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
            <div className="flex items-center gap-2 justify-center">
              <Select
                value={groupsPerPage.toString()}
                onChange={value => {
                  setGroupsPerPage(Number(value));
                  setCurrentPage(1);
                }}
                className="w-22 text-sm"
                options={[
                  { value: "3", label: "3班/页" },
                  { value: "5", label: "5班/页" },
                  { value: "10", label: "10班/页" },
                  { value: "15", label: "15班/页" },
                  { value: "20", label: "20班/页" }
                ]}
              />
              {selectedIds.length > 0 && (
                <Button
                  size="sm"
                  color="red"
                  onClick={handleBatchDelete}
                  className="min-w-[60px] whitespace-nowrap"
                >
                  批量删除({selectedIds.length})
                </Button>
              )}
            </div>
          </div>
        </div>
        {/* 详情弹窗 */}
        <UserDetailModal user={detailUser} onClose={()=>setDetailUser(null)} />
        {/* 角色编辑弹窗 */}
        {roleEditUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xs relative">
              <button className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-2xl" onClick={()=>setRoleEditUser(null)}>&times;</button>
              <h3 className="text-lg font-bold mb-4">修改角色</h3>
              <select className="w-full border rounded px-3 py-2 mb-4" value={roleEditValue} onChange={e=>setRoleEditValue(e.target.value)}>
                <option value="student">学生</option>
                <option value="monitor">班长</option>
                <option value="league_secretary">团支书</option>
                <option value="study_committee">学习委员</option>
                <option value="admin">管理员</option>
              </select>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded shadow w-full" onClick={()=>handleUpdateRole(roleEditUser, roleEditValue)}>保存</button>
            </div>
          </div>
        )}
        {/* 操作反馈优化：可用Toast/LoadingSpinner等（略） */}
        {checkingAuth && <LoadingSpinner />}
        {/* 删除/批量删除提示已统一用 toast，不再显示 error/success */}
      </div>
    </div>
  );
}

// 角色标签组件
function RoleTag({ role, onClick }: { role: string, onClick?: () => void }) {
  const map: Record<string, { label: string; color: string }> = {
    admin: { label: '管理员', color: 'bg-gray-300 text-gray-800' },
    student: { label: '学生', color: 'bg-blue-100 text-blue-700' },
    monitor: { label: '班长', color: 'bg-green-100 text-green-700' },
    league_secretary: { label: '团支书', color: 'bg-yellow-100 text-yellow-700' },
    study_committee: { label: '学习委员', color: 'bg-purple-100 text-purple-700' },
  };
  const info = map[role] || { label: role, color: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-block px-2 py-1 rounded text-xs font-bold cursor-pointer ${info.color}`} title="点击修改角色" onClick={onClick}>{info.label}</span>;
}

// 详情弹窗组件
function UserDetailModal({ user, onClose }: { user: User | null, onClose: () => void }) {
  if (!user) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-8 min-w-[320px] max-w-[90vw] relative">
        <button className="absolute right-4 top-4 text-gray-400 hover:text-blue-600 text-2xl" onClick={onClose}>×</button>
        <h2 className="text-xl font-bold mb-4 text-blue-700">用户详情</h2>
        <div className="space-y-2 text-base">
          <div><b>用户名：</b>{user.username}</div>
          <div><b>姓名：</b>{user.name || '-'}</div>
          <div><b>学号：</b>{user.student_id || '-'}</div>
          <div><b>角色：</b><RoleTag role={user.role} /></div>
          <div><b>年级：</b>{user.grade || '-'}</div>
          <div><b>专业：</b>{user.major || '-'}</div>
          <div><b>班级：</b>{user.class || '-'}</div>
          <div><b>注册时间：</b>{user.created_at?.slice(0, 10)}</div>
        </div>
      </div>
    </div>
  );
}

// 导出Excel函数
async function exportUsersToExcel(users: User[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("用户列表");
  worksheet.columns = [
    { header: "用户名", key: "username", width: 20 },
    { header: "姓名", key: "name", width: 15 },
    { header: "学号", key: "student_id", width: 20 },
    { header: "角色", key: "role", width: 15 },
    { header: "年级", key: "grade", width: 10 },
    { header: "专业", key: "major", width: 15 },
    { header: "班级", key: "class", width: 10 },
    { header: "注册时间", key: "created_at", width: 15 },
  ];
  users.forEach(u => {
    // 角色映射
    const roleMap: Record<string, string> = {
      admin: '管理员',
      student: '学生',
      monitor: '班长',
      league_secretary: '团支书',
      study_committee: '学习委员',
    };
    worksheet.addRow({
      username: u.username,
      name: u.name,
      student_id: u.student_id,
      role: roleMap[u.role] || u.role,
      grade: u.grade,
      major: u.major,
      class: u.class,
      created_at: u.created_at?.slice(0, 10),
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "用户列表.xlsx";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}
