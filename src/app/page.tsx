"use client";

import "./globals.css";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    if (!t) {
      router.replace("/login");
    } else {
      router.replace("/dashboard");
    }
  }, [router]);
  return null;
}
