"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      setLoading(false);
      return;
    }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
      .then(res => res.json())
      .then(data => {
        if (!data.user) {
          setLoading(false);
        } else {
          setUser(data.user);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (!loading && user) {
      router.replace("/admin/credits");
    }
  }, [loading, user, router]);

  if (loading) return <div className="text-center mt-12 text-gray-500">加载中...</div>;
  return <div className="text-center mt-12 text-gray-500">正在跳转...</div>;
}
