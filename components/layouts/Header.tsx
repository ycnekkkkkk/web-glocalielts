"use client";

import Avatar from "@/components/ui/Avatar";
import { cn } from "@/utils/cn";
import { Calendar, LogOut, Settings, ChevronRight, ChevronDown, PanelLeftOpen } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";
import { createBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { AuthUser } from "@/types";
import { usePageTitle } from "./PageTitleContext";
import { useSidebarContext } from "./SidebarContext";

interface HeaderProps {
  user: AuthUser | null;
  title?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  "admin": "Quản trị",
  "teacher": "Giáo viên",
  "academic-manager": "Quản lý học vụ",
  "organization": "Tổ chức",
  "student": "Học viên",
  "classes": "Danh sách lớp",
  "teachers": "Giáo viên",
  "students": "Học viên",
  "courses": "Khóa học",
  "schedule": "Lịch dạy",
  "dashboard": "Tổng quan",
  "online-courses": "Khóa học online",
  "my-courses": "Khóa học của tôi",
  "mock-skill-exams": "Thi thử",
  "sessions": "Buổi học",
  "personnel": "Nhân sự",
  "academic-managers": "Quản lý học vụ",
  "course-requests": "Yêu cầu khóa học",
  "online-course-requests": "Yêu cầu khóa học online",
  "attendance": "Điểm danh",
  "homework": "Bài tập",
  "exam": "Bài thi",
  "grade": "Điểm số",
  "skill-reports": "Báo cáo kỹ năng",
  "my-online-courses": "Khóa học online",
  "thi-thu": "Thi thử",
  "analytics": "Thống kê",
  "account": "Tài khoản",
  "grading": "Chấm bài",
};

function getBreadcrumb(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((part, i) => {
    const label = ROUTE_LABELS[part] || part.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const href = "/" + parts.slice(0, i + 1).join("/");
    return { label, href };
  });
}

export default function Header({ user, title }: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const { title: pageTitle } = usePageTitle();
  const { collapsed, setCollapsed } = useSidebarContext();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const now = new Date();
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayName = days[now.getDay()];
    const dateFormatted = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    setCurrentDateStr(`${dayName}, ${dateFormatted}`);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const breadcrumbs = getBreadcrumb(pathname);
  const displayTitle = pageTitle || title;

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between shrink-0 px-4 md:px-6 transition-all">
      {/* ── Left section: Expand Button (if collapsed) + Breadcrumb ── */}
      <div className="flex items-center gap-3 min-w-0">
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            title="Mở menu điều hướng"
          >
            <PanelLeftOpen className="w-5 h-5 text-slate-600" />
          </button>
        )}

        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 min-w-0">
            {breadcrumbs.map((crumb, i) => {
              const isFirst = i === 0;
              const isLast = i === breadcrumbs.length - 1;
              const showTitle = isLast && displayTitle;

              return (
                <span key={crumb.href} className="flex items-center gap-2 shrink-0">
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                  {isFirst ? (
                    <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200/60 px-2.5 py-1 rounded-xl">
                      {crumb.label}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "leading-none whitespace-nowrap truncate max-w-[240px]",
                        isLast ? "font-black text-slate-900 text-sm" : "font-semibold text-slate-500 hover:text-slate-800 text-xs"
                      )}
                    >
                      {showTitle ? displayTitle : crumb.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        )}
      </div>

      {/* ── Right section: Search + Notifications + User Menu ── */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Realtime Date Indicator */}
        {currentDateStr && (
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span>{currentDateStr}</span>
          </div>
        )}

        {/* Notifications */}
        {user && <NotificationBell user={user} />}

        {/* User Pill Menu */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-2xl hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
            >
              <Avatar name={user.name} src={user.avatar_url} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mt-0.5 capitalize">
                  {user.role === "teacher" ? "Giáo viên" : user.role === "admin" ? "Quản trị viên" : user.role}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors hidden sm:block" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-40 overflow-hidden animate-[var(--animate-fade-in)]">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    href={user.role === "teacher" ? "/teacher/account" : "/admin/settings"}
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Cài đặt tài khoản
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
