"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPasswordStrength } from "@/lib/validation";
import { toast, Toaster } from "react-hot-toast";
import { getRoleLabel } from '@/lib/utils';
import { useAuth } from "@/hooks/AuthProvider";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [systemConfigs, setSystemConfigs] = useState<any>({ roles: [], statuses: [], creditTypes: [] });
  const [configLoaded, setConfigLoaded] = useState(false);
  const router = useRouter();

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
  }, []);

  async function handleChangePwd(e: React.FormEvent) {
    e.preventDefault();
    if (!oldPwd || !newPwd || !confirmPwd) {
      toast.error("请填写完整信息");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("两次新密码不一致");
      return;
    }
    // 密码复杂度验证
    if (newPwd.length < 6) {
      toast.error("新密码至少6位");
      return;
    }
    if (!/[A-Za-z]/.test(newPwd)) {
      toast.error("新密码需包含字母");
      return;
    }
    if (!/\d/.test(newPwd)) {
      toast.error("新密码需包含数字");
      return;
    }

    const passwordStrength = getPasswordStrength(newPwd);
    if (passwordStrength === '弱') {
      toast.error("密码强度较弱，建议包含大小写字母、数字和特殊字符");
      return;
    }

    setPwdLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_password: oldPwd, new_password: newPwd })
    });
    const data = await res.json();
    setPwdLoading(false);
    if (res.ok) {
      toast.success("密码修改成功");
      setOldPwd(""); 
      setNewPwd(""); 
      setConfirmPwd("");
    } else {
      toast.error(data.error || "修改失败");
    }
  }

  function roleLabel(role: string) {
    return getRoleLabel(role as any, systemConfigs.roles) || role;
  }

  if (loading || !configLoaded) return <div className="text-center mt-12 text-gray-500">加载中...</div>;
  if (!user) return <div className="p-8 text-center">加载中...</div>;

  return (
    <div className="max-w-md mx-auto card mt-8 sm:mt-16 p-4 sm:p-10 bg-white rounded-2xl shadow-xl relative">
      <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
      <span
        className="absolute left-4 top-4 text-blue-700 hover:underline hover:text-blue-900 cursor-pointer flex items-center text-base select-none"
        onClick={() => router.push("/dashboard")}
      >
        <svg className="inline mr-1" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 16L7 10L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        返回
      </span>
      <div style={{ height: 12 }} />
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-8 text-blue-700">个人信息</h1>
      <div className="mb-4 text-base"><span className="font-bold">用户名：</span>{user.username}</div>
      <div className="mb-4 text-base"><span className="font-bold">姓名：</span>{user.name || '-'}</div>
      <div className="mb-4 text-base"><span className="font-bold">学号：</span>{user.student_id || '-'}</div>
      <div className="mb-4 text-base"><span className="font-bold">角色：</span>{roleLabel(user.role)}</div>
      <div className="mb-4 text-base"><span className="font-bold">年级：</span>{user.grade || '-'}</div>
      <div className="mb-4 text-base"><span className="font-bold">专业：</span>{user.major || '-'}</div>
      <div className="mb-8 text-base"><span className="font-bold">班级：</span>{user.class || '-'}</div>
      <hr className="my-6" />
      <h2 className="text-lg font-bold mb-4 text-gray-700">修改密码</h2>
      <form onSubmit={handleChangePwd} className="space-y-4">
        <input
          className="input w-full"
          type="password"
          placeholder="原密码"
          value={oldPwd}
          onChange={e => setOldPwd(e.target.value)}
        />
        <div>
          <input
            className="input w-full"
            type="password"
            placeholder="新密码"
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
          />
          {newPwd && (
            <div className="mt-1">
              {/* 密码强度进度条 */}
              <div className="w-full h-2 bg-gray-200 rounded">
                <div
                  className={
                    `h-2 rounded transition-all duration-300 ` +
                    (getPasswordStrength(newPwd) === '强' ? 'bg-green-500 w-full' :
                     getPasswordStrength(newPwd) === '中' ? 'bg-orange-400 w-2/3' :
                     'bg-red-500 w-1/3')
                  }
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                提示：密码需包含字母和数字，建议使用大小写字母、数字和特殊字符。
              </div>
            </div>
          )}
        </div>
        <input
          className="input w-full"
          type="password"
          placeholder="确认新密码"
          value={confirmPwd}
          onChange={e => setConfirmPwd(e.target.value)}
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded shadow transition w-full"
          type="submit"
          disabled={pwdLoading}
        >
          {pwdLoading ? "提交中..." : "修改密码"}
        </button>
      </form>
    </div>
  );
}
