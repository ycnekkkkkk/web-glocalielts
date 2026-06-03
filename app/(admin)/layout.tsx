"use client";
import Header from "@/components/layouts/Header";
import { SidebarInner } from "@/components/layouts/Sidebar";
import { SidebarProvider } from "@/components/layouts/SidebarContext";
import { PageTitleProvider } from "@/components/layouts/PageTitleContext";
import Avatar from "@/components/ui/Avatar";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import {
  BarChart3, BookOpen, BookMarked, Building2, DollarSign, FileText,
  GraduationCap, LayoutDashboard, Settings, ShoppingCart, Users, UserSquare2, Calendar, ClipboardList, ShieldCheck,
} from "lucide-react";
import type { NavGroup } from "@/types";

const navGroups: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Quản lý",
    items: [
      { label: "Lớp học", href: "/admin/classes", icon: GraduationCap },
      { label: "Buổi học", href: "/admin/sessions", icon: Calendar },
      { label: "Học viên", href: "/admin/students", icon: Users },
      { label: "Giáo viên", href: "/admin/teachers", icon: UserSquare2 },
      { label: "Tài khoản Admin", href: "/admin/admin-accounts", icon: ShieldCheck },
      { label: "Quản lý học vụ", href: "/admin/academic-managers", icon: ClipboardList },
      { label: "Nhân sự", href: "/admin/personnel", icon: Building2 },
    ],
  },
  {
    label: "Nội dung",
    items: [
      { label: "Chương trình", href: "/admin/curriculum", icon: BookOpen },
      { label: "Khóa học online", href: "/admin/online-courses", icon: BookOpen },
      { label: "Yêu cầu mua khóa", href: "/admin/course-requests", icon: ShoppingCart },
      { label: "Tài liệu", href: "/admin/content", icon: FileText },
      { label: "Thi thử 4 kỹ năng", href: "/admin/mock-skill-exams", icon: BookMarked },
    ],
  },
  {
    label: "Tài chính",
    items: [
      { label: "Hóa đơn", href: "/admin/invoices", icon: DollarSign },
      { label: "Tài chính", href: "/admin/financials", icon: BarChart3 },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { label: "Cài đặt", href: "/admin/settings", icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRoleGuard("admin", "/admin");

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const footerContent = user && (
    <div className="flex items-center gap-2 px-1 py-1">
      <Avatar name={user.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-[#1F2937] truncate">{user.name}</p>
        <p className="text-[11px] text-[#9CA3AF]">Quản trị viên</p>
      </div>
    </div>
  );

  return (
    <SidebarProvider>
      <PageTitleProvider>
        <div className="flex min-h-screen bg-gray-50">
          <SidebarInner groups={navGroups} theme="purple" footerContent={footerContent} />
          <div className="flex-1 flex flex-col min-w-0">
            <Header user={user} />
            {children}
          </div>
        </div>
      </PageTitleProvider>
    </SidebarProvider>
  );
}
