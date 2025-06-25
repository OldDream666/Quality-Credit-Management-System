import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar({ user }: { user?: { username: string, name?: string, role: string } }) {
  const router = useRouter();
  function handleLogout() {
    localStorage.removeItem("token");
    // 清除cookie，确保服务端也能识别退出状态
    document.cookie = 'token=; Max-Age=0; path=/;';
    window.dispatchEvent(new Event("login-status-change"));
    router.push("/login");
    window.location.reload();
  }
  return (
    <nav className="w-full bg-white shadow flex items-center justify-between px-6 py-3 mb-6">
      <div className="font-bold text-xl text-blue-700">素质学分管理系统</div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link href="/profile" className="ml-4 text-gray-600 hover:text-blue-700 transition font-medium cursor-pointer">
              {user.name ? `${user.name}(${user.username})` : user.username}
            </Link>
            <button className="ml-2 text-red-500 hover:underline text-sm" onClick={handleLogout}>退出登录</button>
          </>
        ) : (
          <Link href="/login" className="hover:text-blue-600 transition">登录</Link>
        )}
      </div>
    </nav>
  );
}
