"use client";

import { cn } from "@/utils/cn";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebarContext } from "./SidebarContext";
import type { NavGroup, NavItem, SidebarTheme } from "@/types";

const themeConfig = {
  brand: {
    bg: "bg-brand-950",
    groupLabel: "text-brand-400/60",
    link: "text-brand-200/70 hover:text-white hover:bg-brand-900/60",
    active: "bg-gradient-to-r from-brand-500 to-sky-600 text-white shadow-lg shadow-brand-500/20",
    activeIcon: "text-white",
    icon: "text-brand-400",
    badge: "bg-brand-600 text-white",
    navBg: "hover:bg-brand-900/60",
  },
  sky: {
    bg: "bg-slate-950",
    groupLabel: "text-slate-400/60",
    link: "text-slate-300/80 hover:text-white hover:bg-slate-800/60",
    active: "bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/20",
    activeIcon: "text-white",
    icon: "text-slate-400",
    badge: "bg-sky-600 text-white",
    navBg: "hover:bg-slate-800/60",
  },
  purple: {
    bg: "bg-white",
    groupLabel: "text-slate-400",
    link: "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80",
    active: "bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-600 text-white font-bold shadow-md shadow-brand-500/25",
    activeIcon: "text-white",
    icon: "text-slate-400 group-hover:text-slate-700",
    badge: "bg-brand-600 text-white font-bold",
    navBg: "hover:bg-slate-100/80",
  },
  emerald: {
    bg: "bg-gray-950",
    groupLabel: "text-gray-400/60",
    link: "text-gray-300/80 hover:text-white hover:bg-gray-800/60",
    active: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20",
    activeIcon: "text-white",
    icon: "text-gray-400",
    badge: "bg-emerald-600 text-white",
    navBg: "hover:bg-gray-800/60",
  },
};

function NavLink({
  item,
  theme,
  collapsed = false,
  depth = 0,
}: {
  item: NavItem;
  theme: SidebarTheme;
  collapsed?: boolean;
  depth?: number;
}) {
  const pathname = usePathname();
  // Exact match for dashboard roots, prefix match for nested routes
  const isDashboardRoot = item.href === "/teacher/dashboard" || item.href === "/admin/dashboard" || item.href === "/student/dashboard";
  const isActive = isDashboardRoot ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + "/"));
  const t = themeConfig[theme] || themeConfig.purple;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl transition-all duration-200 font-semibold text-[13px]",
        collapsed ? "justify-center p-2.5" : depth > 0 ? "pl-11 pr-3 py-2.5" : "px-3.5 py-2.5",
        isActive ? t.active : cn(t.link, t.navBg)
      )}
    >
      <Icon className={cn(
        "w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105",
        isActive ? t.activeIcon : t.icon
      )} />
      {!collapsed && (
        <span className="flex-1 truncate leading-none">{item.label}</span>
      )}
      {!collapsed && item.badge !== undefined && (
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full leading-none",
          isActive ? "bg-white/20 text-white" : t.badge
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function SidebarInner({
  groups,
  theme = "purple",
  footerContent,
}: {
  groups: NavGroup[];
  theme?: SidebarTheme;
  footerContent?: React.ReactNode;
}) {
  const { collapsed, setCollapsed } = useSidebarContext();
  const t = themeConfig[theme] || themeConfig.purple;

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col shrink-0 overflow-hidden bg-white z-20",
        "border-r border-slate-200/80 transition-all duration-300 ease-in-out select-none",
        collapsed ? "w-[72px]" : "w-[250px]",
        t.bg
      )}
    >
      {/* ── Brand Header & Toggle ── */}
      <div className="shrink-0 h-16 flex items-center justify-between px-3.5 border-b border-slate-100">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <img src="/logo/logo-ag.svg" alt="AG" className="h-7 w-7 object-contain" />
              <img src="/logo/logo-gi.svg" alt="Glocal IELTS" className="h-7 w-7 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 leading-tight truncate">Glocal IELTS</p>
              <p className="text-[10px] font-bold text-brand-600 leading-none mt-0.5 uppercase tracking-wider truncate">Amazing Group</p>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <img src="/logo/logo-gi.svg" alt="Glocal IELTS" className="h-7 w-7 object-contain" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
          aria-label={collapsed ? "Mở menu" : "Thu gọn menu"}
          title={collapsed ? "Mở menu" : "Thu gọn menu"}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* ── Navigation Items ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5 min-h-0 custom-scrollbar">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className={cn("px-3 mb-1.5 text-[10px] font-black uppercase tracking-widest", t.groupLabel)}>
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} theme={theme} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      {footerContent && (
        <div
          className={cn(
            "border-t border-slate-100 shrink-0 bg-slate-50/50",
            collapsed ? "p-2 flex items-center justify-center" : "p-3"
          )}
        >
          {footerContent}
        </div>
      )}
    </aside>
  );
}

export default function Sidebar({
  groups,
  theme = "purple",
  footerContent,
}: {
  groups: NavGroup[];
  theme?: SidebarTheme;
  footerContent?: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <SidebarInner groups={groups} theme={theme} footerContent={footerContent} />
    </SidebarProvider>
  );
}
