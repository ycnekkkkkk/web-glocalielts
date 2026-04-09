"use client";
import Header from "@/components/layouts/Header";
import Sidebar from "@/components/layouts/Sidebar";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, Building2, GraduationCap, LayoutDashboard, Users, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) router.replace("/organization");
    else if (user.role !== "organization") router.replace("/");
  }, [user, loading, mounted, router]);

  if (!mounted || loading) return <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
  </div>;

  const footerContent = user && (
    <div className="flex items-center gap-3 px-2 py-1">
      <Avatar name={user.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{user.name}</p>
        <p className="text-[11px] text-slate-400">Tổ chức</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar groups={navGroups} theme="purple" footerContent={footerContent} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} />
        {children}
      </div>
    </div>
  );
}
