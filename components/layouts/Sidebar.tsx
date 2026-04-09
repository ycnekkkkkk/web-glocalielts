"use client";
import Logo from "@/components/ui/Logo";
import { cn } from "@/utils/cn";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { NavGroup, NavItem, SidebarTheme } from "@/types";

const themeConfig = {
  brand: {
    bg: "bg-brand-950",
    groupLabel: "text-brand-400/70",
    link: "text-brand-200/70 hover:text-white hover:bg-brand-800/60",
    active: "bg-brand-600 text-white shadow-lg shadow-brand-600/30",
    activeIcon: "text-white",
    icon: "text-brand-400",
    badge: "bg-brand-600 text-white",
  },
  sky: {
    bg: "bg-slate-900",
    groupLabel: "text-slate-400/70",
    link: "text-slate-300/80 hover:text-white hover:bg-slate-700/60",
    active: "bg-sky-600 text-white shadow-lg shadow-sky-600/30",
    activeIcon: "text-white",
    icon: "text-slate-400",
    badge: "bg-sky-600 text-white",
  },
  purple: {
    bg: "bg-slate-900",
    groupLabel: "text-slate-400/70",
    link: "text-slate-300/80 hover:text-white hover:bg-slate-700/60",
    active: "bg-purple-600 text-white shadow-lg shadow-purple-600/30",
    activeIcon: "text-white",
    icon: "text-slate-400",
    badge: "bg-purple-600 text-white",
  },
  emerald: {
    bg: "bg-gray-900",
    groupLabel: "text-gray-400/70",
    link: "text-gray-300/80 hover:text-white hover:bg-gray-700/60",
    active: "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30",
    activeIcon: "text-white",
    icon: "text-gray-400",
    badge: "bg-emerald-600 text-white",
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
        "sidebar-link",
        collapsed ? "justify-center px-2" : depth > 0 ? "pl-10 pr-3" : "",
        isActive ? t.active : t.link
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", isActive ? t.activeIcon : t.icon)} />
      {!collapsed && <span className="flex-1 text-sm">{item.label}</span>}
      {!collapsed && item.badge !== undefined && (
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", isActive ? "bg-white/20 text-white" : t.badge)}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

interface SidebarProps {
  groups: NavGroup[];
  theme?: SidebarTheme;
  footerContent?: React.ReactNode;
}

export default function Sidebar({ groups, theme = "brand", footerContent }: SidebarProps) {
  const t = themeConfig[theme];
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "h-screen sticky top-0 flex flex-col shrink-0 overflow-hidden shadow-[var(--shadow-sidebar)] transition-all duration-200",
      collapsed ? "w-16" : "w-64",
      t.bg
    )}>
      <div
        className={cn(
          "border-b border-white/5 shrink-0 flex",
          collapsed
            ? "flex-col items-center gap-2 py-2 px-1"
            : "h-16 flex-row items-center px-5 justify-between"
        )}
      >
        {collapsed ? (
          <div className="flex items-center justify-center gap-1" title="Amazing Group · Glocal IELTS">
            <img
              src="/logo/logo-ag.svg"
              alt="Amazing Group"
              width={32}
              height={32}
              className="h-6 w-6 shrink-0 object-contain drop-shadow-sm"
            />
            <img
              src="/logo/logo-gi.svg"
              alt="Glocal IELTS"
              width={36}
              height={36}
              className="h-[30px] w-[30px] shrink-0 object-contain drop-shadow-sm"
            />
          </div>
        ) : (
          <Logo light />
        )}
        <button
          type="button"
          onClick={() => setCollapsed(v => !v)}
          className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
          aria-label={collapsed ? "Mở sidebar" : "Thu sidebar"}
          title={collapsed ? "Mở sidebar" : "Thu sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 min-h-0">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className={cn("px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest", t.groupLabel)}>
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

      {footerContent && (
        <div className={cn("border-t border-white/5", collapsed ? "p-2" : "p-3")}>
          {collapsed ? null : footerContent}
        </div>
      )}
    </aside>
  );
}
