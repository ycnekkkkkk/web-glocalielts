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
    groupLabel: "text-slate-400 text-[10px] font-bold uppercase tracking-wider",
    link: "text-slate-600 hover:text-brand-600 hover:bg-brand-50/60 font-medium",
    active: "bg-brand-50 text-brand-700 font-bold border border-brand-200/60 shadow-xs",
    activeIcon: "text-brand-600",
    icon: "text-slate-400 group-hover:text-brand-600",
    badge: "bg-brand-600 text-white font-bold",
    navBg: "hover:bg-slate-50",
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
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const t = themeConfig[theme];
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-xl transition-all duration-150",
        collapsed ? "justify-center px-2 py-2.5" : depth > 0 ? "pl-10 pr-3 py-2" : "px-3 py-2",
        isActive ? t.active : t.link,
        !isActive && t.navBg
      )}
    >
      {isActive && (
        <div className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full",
          theme === "sky" && "bg-sky-400",
          theme === "brand" && "bg-brand-400",
          theme === "purple" && "bg-brand-600",
          theme === "emerald" && "bg-emerald-400"
        )} />
      )}
      <Icon className={cn("w-[17px] h-[17px] shrink-0 transition-colors duration-150", isActive ? t.activeIcon : t.icon)} />
      {!collapsed && (
        <span className="flex-1 text-[13px] font-medium leading-none">{item.label}</span>
      )}
      {!collapsed && item.badge !== undefined && (
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none",
          isActive
            ? theme === "purple" ? "bg-brand-100 text-brand-700" : "bg-white/20 text-white"
            : t.badge
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function SidebarInner({ groups, theme = "purple", footerContent }: {
  groups: NavGroup[];
  theme?: SidebarTheme;
  footerContent?: React.ReactNode;
}) {
  const { collapsed, setCollapsed } = useSidebarContext();
  const t = themeConfig[theme];

  return (
    <aside className={cn(
      "h-screen sticky top-0 flex flex-col shrink-0 overflow-hidden",
      "border-r border-slate-200/80",
      collapsed ? "w-[64px]" : "w-[240px]",
      t.bg
    )}>
      {/* Hamburger toggle */}
      <div className="shrink-0 h-14 flex items-center px-4 border-b border-slate-200/80">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex flex-col gap-[5px] p-1.5 rounded-xl cursor-pointer transition-all duration-200",
            "hover:bg-brand-50"
          )}
          aria-label={collapsed ? "Mở menu" : "Thu menu"}
          title={collapsed ? "Mở menu" : "Thu menu"}
        >
          <span className={cn(
            "block w-5 h-[2px] rounded-full bg-slate-400 transition-all duration-200",
            collapsed ? "w-4" : "w-5"
          )} />
          <span className={cn(
            "block w-5 h-[2px] rounded-full bg-slate-400 transition-all duration-200"
          )} />
          <span className={cn(
            "block w-3.5 h-[2px] rounded-full bg-slate-400 transition-all duration-200"
          )} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4 min-h-0">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className={cn("px-2.5 mb-1 font-semibold uppercase tracking-wider", t.groupLabel)}>
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink key={item.href} item={item} theme={theme} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {footerContent && (
        <div className={cn(
          "border-t border-slate-200/80 shrink-0",
          collapsed ? "p-2 flex items-center justify-center" : "p-3"
        )}>
          {footerContent}
        </div>
      )}
    </aside>
  );
}

export default function Sidebar({ groups, theme = "purple", footerContent }: {
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
