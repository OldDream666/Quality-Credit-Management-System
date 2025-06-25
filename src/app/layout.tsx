"use client";
import "./globals.css";
import Navbar from "@/components/Navbar";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    function syncUser() {
      const t = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
      if (t) {
        fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
          .then(res => res.json())
          .then(data => {
            if (data.user) setUser(data.user);
            else setUser(null);
          });
      } else {
        setUser(null);
      }
    }
    syncUser();
    // 登录/退出后立即同步 user
    window.addEventListener("login-status-change", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("login-status-change", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  return (
    <html lang="zh-cn">
      <body className="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
        <Navbar user={user} />
        <main className="w-full px-0 pb-16">{children}</main>
        <footer className="w-full text-center text-gray-400 py-4 border-t mt-8 text-sm">
          © {new Date().getFullYear()} 学生素质学分管理系统
        </footer>
      </body>
    </html>
  );
}
