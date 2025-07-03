"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/credits");
  }, [router]);
  return <div className="text-center mt-12 text-gray-500">正在跳转...</div>;
}
