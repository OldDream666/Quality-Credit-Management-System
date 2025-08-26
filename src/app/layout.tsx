"use client";
import "./globals.css";
import Navbar from "@/components/Navbar";
import type { ReactNode } from "react";
import { AuthProvider } from "@/hooks/AuthProvider";
import { Toaster } from 'react-hot-toast';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-cn">
      <head>
        <title>素质学分管理系统</title>
        <meta name="description" content="学生素质学分管理系统" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen flex flex-col">
        <AuthProvider>
          <Navbar />
          <Toaster position="top-center" />
          <main className="w-full px-0 pb-16">{children}</main>
          <footer className="w-full text-center text-gray-400 py-4 border-t mt-8 text-sm">
            © {new Date().getFullYear()} 学生素质学分管理系统 By OldDream
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
