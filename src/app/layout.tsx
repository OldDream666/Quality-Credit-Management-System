"use client";
import "./globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "@/hooks/AuthProvider";
import AppLayout from "@/components/AppLayout";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-cn">
      <head>
        <title>素质学分管理系统</title>
        <meta name="description" content="学生素质学分管理系统" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
