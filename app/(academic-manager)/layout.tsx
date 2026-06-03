"use client";
import Header from "@/components/layouts/Header";
import { SidebarInner } from "@/components/layouts/Sidebar";
import { SidebarProvider } from "@/components/layouts/SidebarContext";
import { PageTitleProvider } from "@/components/layouts/PageTitleContext";
import Avatar from "@/components/ui/Avatar";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { BookOpen, LayoutList, Settings } from "lucide-react";
import type { NavGroup } from "@/types";

const navGroups: NavGroup[] = [
  {
    label: "Quản Lý Học Vụ",
    items: [
      { label: "Lớp Của Tôi", href: "/academic-manager/classes", icon: LayoutList },
    ],
  },
  {
    label: "Tài nguyên",
    items: [
      { label: "Tổng Quan", href: "/academic-manager/classes", icon: BookOpen },
      { label: "Tài khoản", href: "/academic-manager/account", icon: Settings },
    ],
  },
];

export default function AcademicManagerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRoleGuard("academic_manager", "/academic-manager");

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const footerContent = user && (
    <div className="flex items-center gap-2 px-1 py-1">
      <Avatar name={user.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-[#1F2937] truncate">{user.name}</p>
        <p className="text-[11px] text-[#9CA3AF]">Quản lý học vụ</p>
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
