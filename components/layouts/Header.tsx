"use client";
import Avatar from "@/components/ui/Avatar";
import { Search, LogOut, Settings, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import NotificationBell from "./NotificationBell";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthUser } from "@/types";
import { usePageTitle } from "./PageTitleContext";

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
  "schedule": "Lịch học",
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
};

function getBreadcrumb(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((part, i) => {
    const label = ROUTE_LABELS[part] || ROUTE_LABELS[part.replace(/-/g, "-")] || part.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const href = "/" + parts.slice(0, i + 1).join("/");
    return { label, href };
  });
}

export default function Header({ user, title }: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { title: pageTitle } = usePageTitle();
  const pathname = usePathname();
  const router = useRouter();

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
    <header className="h-14 border-b border-slate-200/80 bg-white sticky top-0 z-30 flex items-center justify-between shrink-0">
      {/* Left section: logo + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0 px-4">
        {/* Logo - always visible */}
        <div className="flex items-center gap-1.5 shrink-0">
          <img src="/logo/logo-ag.svg" alt="AG" className="h-6 w-6 object-contain" />
          <img src="/logo/logo-gi.svg" alt="Glocal IELTS" className="h-6 w-6 object-contain" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 leading-none truncate">Glocal IELTS</p>
            <p className="text-[9px] font-medium text-slate-400 leading-none mt-0.5 truncate">Amazing Group</p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />

        {/* Breadcrumb + page title */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-[13px] min-w-0">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              const showTitle = isLast && displayTitle;
              return (
                <span key={crumb.href} className="flex items-center gap-1 shrink-0">
                  {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                  <span className={cn(
                    "leading-none whitespace-nowrap truncate max-w-[200px]",
                    showTitle ? "font-bold text-slate-900" : isLast ? "font-bold text-slate-900" : "font-medium text-slate-400 hover:text-slate-600"
                  )}>
                    {showTitle ? displayTitle : crumb.label}
                  </span>
                </span>
              );
            })}
          </nav>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 pr-4 shrink-0">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-400 w-48 cursor-pointer hover:border-brand-300 hover:bg-white transition-all duration-150">
          <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="text-xs text-slate-500">Tìm kiếm...</span>
          <span className="ml-auto text-[10px] bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded-md font-medium">⌘K</span>
        </div>

        {/* Notifications */}
        {user && <NotificationBell user={user} />}

        {/* User Menu */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Avatar name={user.name} src={user.avatar_url} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-none">{user.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-none capitalize font-medium">{user.role}</p>
              </div>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-20 overflow-hidden animate-[var(--animate-fade-in)]">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href={user.role === "student" ? "/student/account" : `/${user.role}/settings`}
                    onClick={() => setShowMenu(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors cursor-pointer text-left"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Cài đặt tài khoản
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4" />
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

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}
