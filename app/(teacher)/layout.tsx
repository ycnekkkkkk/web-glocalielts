"use client";
import Header from "@/components/layouts/Header";
import Sidebar from "@/components/layouts/Sidebar";
import Avatar from "@/components/ui/Avatar";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import {
  BarChart3, BookOpen, Calendar, GraduationCap, LayoutDashboard, PenLine, Settings, Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavGroup } from "@/types";

const navGroups: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [
      { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Quản lý",
    items: [
      { label: "Lớp học", href: "/teacher/courses", icon: GraduationCap },
      { label: "Lịch dạy", href: "/teacher/schedule", icon: Calendar },
      { label: "Học viên", href: "/teacher/students", icon: Users },
    ],
  },
  {
    label: "Giảng dạy",
    items: [
      { label: "Chấm bài", href: "/teacher/grading", icon: PenLine },
      { label: "Analytics", href: "/teacher/analytics", icon: BarChart3 },
      { label: "Tài khoản", href: "/teacher/account", icon: Settings },
    ],
  },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRoleGuard("teacher", "/teacher");

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const footerContent = user && (
    <div className="flex items-center gap-3 px-2 py-1">
      <Avatar name={user.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{user.name}</p>
        <p className="text-[11px] text-gray-400">Giáo viên</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar groups={navGroups} theme="emerald" footerContent={footerContent} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} />
        {children}
      </div>
    </div>
  );
}
