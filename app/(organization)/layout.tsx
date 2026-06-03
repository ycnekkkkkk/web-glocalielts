"use client";
import Header from "@/components/layouts/Header";
import { SidebarInner } from "@/components/layouts/Sidebar";
import { SidebarProvider } from "@/components/layouts/SidebarContext";
import { PageTitleProvider } from "@/components/layouts/PageTitleContext";
import Avatar from "@/components/ui/Avatar";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { BarChart3, GraduationCap, LayoutDashboard, Users, CreditCard } from "lucide-react";
import type { NavGroup } from "@/types";

const navGroups: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [{ label: "Dashboard", href: "/organization/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Quản lý",
    items: [
      { label: "Học viên", href: "/organization/students", icon: Users },
      { label: "Giảng viên", href: "/organization/instructors", icon: GraduationCap },
    ],
  },
  {
    label: "Báo cáo",
    items: [
      { label: "Báo cáo", href: "/organization/reports", icon: BarChart3 },
      { label: "Thanh toán", href: "/organization/billing", icon: CreditCard },
    ],
  },
];

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRoleGuard("organization", "/organization");

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
  </div>;

  const footerContent = user && (
    <div className="flex items-center gap-2 px-1 py-1">
      <Avatar name={user.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-[#1F2937] truncate">{user.name}</p>
        <p className="text-[11px] text-[#9CA3AF]">Tổ chức</p>
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
