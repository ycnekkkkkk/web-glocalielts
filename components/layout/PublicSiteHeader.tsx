"use client";

import { Menu, X, ArrowRight, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

function useRouteHash() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const syncHash = useCallback(() => {
    setHash(typeof window !== "undefined" ? window.location.hash || "" : "");
  }, []);
  useEffect(() => {
    const tick = requestAnimationFrame(() => syncHash());
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      cancelAnimationFrame(tick);
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, [pathname, syncHash]);
  return { pathname, hash, syncHash };
}

function useClearHomeHash(syncHash: () => void) {
  return useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/" && window.location.hash) {
      e.preventDefault();
      window.history.replaceState(null, "", "/");
      syncHash();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [syncHash]);
}

export default function PublicSiteHeader() {
  const { pathname, syncHash } = useRouteHash();
  const onHomeClick = useClearHomeHash(syncHash);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ name?: string; role?: string; email?: string } | null>(null);
  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Check client auth state
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const meta = session.user.user_metadata || {};
          setUser({
            name: meta.full_name || session.user.email?.split("@")[0] || "Học viên",
            role: meta.role || "student",
            email: session.user.email,
          });
        }
      } catch {
        // Guest mode
      }
    }
    checkAuth();
  }, []);

  const onHome = pathname === "/";
  const coursesActive = pathname === "/courses" || pathname.startsWith("/courses/");
  const thiThuActive = pathname === "/thi-thu" || pathname.startsWith("/thi-thu/");
  const consultActive = pathname === "/consult";

  const navItems = [
    { href: "/", label: "Trang chủ", active: onHome },
    { href: "/courses", label: "Khóa học IELTS", active: coursesActive },
    { href: "/thi-thu", label: "Thi thử trực tuyến", active: thiThuActive },
    { href: "/login", label: "Cổng học tập", active: pathname === "/login" },
    { href: "/consult", label: "Tư vấn lộ trình", active: consultActive },
  ];

  const onHomeMobileClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    onHomeClick(e);
    closeMobileMenu();
  }, [onHomeClick, closeMobileMenu]);

  const dashboardUrl = user?.role === "admin" 
    ? "/admin/dashboard" 
    : user?.role === "teacher" 
    ? "/teacher/dashboard" 
    : "/student/dashboard";

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-200 border-b"
      style={{
        height: "56px",
        background: scrolled
          ? "rgba(255, 255, 255, 0.96)"
          : "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: scrolled ? "rgba(226, 232, 240, 0.9)" : "rgba(226, 232, 240, 0.7)",
        boxShadow: scrolled ? "0 4px 20px -2px rgba(0, 0, 0, 0.04)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">

        {/* Left: Identical branding to Header.tsx */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" onClick={onHomeClick} className="flex items-center gap-1.5 shrink-0 group">
            <img src="/logo/logo-ag.svg" alt="AG" className="h-6 w-6 object-contain" />
            <img src="/logo/logo-gi.svg" alt="Glocal IELTS" className="h-6 w-6 object-contain" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 leading-none truncate">Glocal IELTS</p>
              <p className="text-[9px] font-medium text-slate-400 leading-none mt-0.5 truncate">Amazing Group</p>
            </div>
          </Link>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-200 mx-1 hidden md:block shrink-0" />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={item.href === "/" ? onHomeClick : undefined}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
                  item.active 
                    ? "text-brand-700 bg-brand-50" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            /* Logged in view */
            <Link
              href={dashboardUrl}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-200/80 text-brand-700 hover:bg-brand-100 hover:border-brand-300 transition-all text-xs font-bold shadow-2xs"
            >
              <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold">
                {user.name?.[0]?.toUpperCase() || <UserIcon className="w-3 h-3" />}
              </div>
              <span className="hidden sm:inline max-w-[120px] truncate">{user.name}</span>
              <span className="text-[11px] font-semibold text-brand-600 hidden sm:inline">• Bảng điều khiển</span>
              <ArrowRight className="w-3.5 h-3.5 text-brand-600" />
            </Link>
          ) : (
            /* Guest view: Synchronized with dashboard aesthetics */
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100/80 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 text-xs font-bold text-white rounded-lg bg-brand-600 hover:bg-brand-700 transition-all duration-150 shadow-xs hover:shadow-sm"
              >
                Bắt đầu ngay
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-b border-slate-200/80 bg-white/98 backdrop-blur-xl px-4 py-3 shadow-lg animate-[var(--animate-fade-in)]">
          <div className="space-y-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={item.href === "/" ? onHomeMobileClick : closeMobileMenu}
                className={`block px-3 py-2 text-xs font-semibold rounded-lg ${
                  item.active ? "text-brand-700 bg-brand-50 font-bold" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 mt-2 flex flex-col gap-2">
            {user ? (
              <Link
                href={dashboardUrl}
                onClick={closeMobileMenu}
                className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-white bg-brand-600 rounded-lg shadow-xs"
              >
                Vào bảng điều khiển ({user.name})
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="flex-1 text-center py-2 text-xs font-bold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobileMenu}
                  className="flex-1 text-center py-2 text-xs font-bold text-white bg-brand-600 rounded-lg shadow-xs hover:bg-brand-700"
                >
                  Bắt đầu ngay
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
