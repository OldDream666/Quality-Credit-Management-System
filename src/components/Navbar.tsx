import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/AuthProvider";

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  function handleLogout() {
    logout();
    // router.push("/login"); // logout 已处理跳转
    // window.location.reload(); // 不再强制刷新
  }
  return (
    <nav className="w-full bg-white shadow flex items-center justify-between px-6 py-3 mb-6">
      <div className="font-bold text-xl text-blue-700">素质学分管理系统</div>
      <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
        {user ? (
          <>
            <Link href="/profile" className="text-gray-600 hover:text-blue-700 transition font-medium cursor-pointer text-sm sm:text-base">
              {user.name ? `${user.name}(${user.username})` : user.username}
            </Link>
            <button
              className="p-1 text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer"
              title="退出登录"
              onClick={handleLogout}
              aria-label="退出登录"
            >
              {/* 退出登录icon（door/logout） */}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
              </svg>
            </button>
          </>
        ) : (
          <Link href="/login" className="p-1 text-blue-600 hover:text-blue-800 transition" title="登录" aria-label="登录">
            {/* 登录icon（user/login） */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </nav>
  );
}
