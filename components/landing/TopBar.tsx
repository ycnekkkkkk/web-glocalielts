"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  return useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/" && window.location.hash) {
      e.preventDefault();
      window.history.replaceState(null, "", "/");
      syncHash();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [syncHash]);
}

const navItems = [
  {
    href: "/",
    label: "Trang chủ",
    outlineIcon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/courses",
    label: "Khóa học",
    outlineIcon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
    ),
  },
  {
    href: "/thi-thu",
    label: "Luyện đề",
    outlineIcon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: "/consult",
    label: "Tư vấn",
    outlineIcon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function TopBar() {
  const { pathname, syncHash } = useRouteHash();
  const onHomeClick = useClearHomeHash(syncHash);
  const [mobileOpen, setMobileOpen] = useState(false);

  const onHome = pathname === "/";
  const coursesActive = pathname === "/courses" || pathname.startsWith("/courses/");
  const thiThuActive = pathname === "/thi-thu" || pathname.startsWith("/thi-thu/");
  const consultActive = pathname === "/consult";

  const isActive = (item: (typeof navItems)[number]) => {
    if (item.href === "/") return onHome;
    if (item.href === "/courses") return coursesActive;
    if (item.href === "/thi-thu") return thiThuActive;
    if (item.href === "/consult") return consultActive;
    return false;
  };

  return (
    <>
      {/* Floating glassmorphism navbar — no background, floats over shared gradient */}
      <header className="fixed top-2 left-0 right-0 z-50 flex items-center justify-center"
        style={{ paddingLeft: "10px", paddingRight: "10px" }}>
        <div
          className="relative flex items-center justify-between gap-3 w-full"
          style={{
            maxWidth: "1200px",
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.72)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            boxShadow: "0 8px 32px rgba(91,91,214,0.08), 0 1px 0 rgba(255,255,255,0.6) inset",
            border: "1px solid rgba(255,255,255,0.50)",
            padding: "0 16px",
            height: "64px",
          }}
        >
          {/* Left: Logo group */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              className="flex items-center justify-center rounded-[12px] transition-colors duration-200"
              style={{
                width: "36px",
                height: "36px",
                background: "rgba(249,249,253,1)",
                border: "1px solid rgba(229,231,235,1)",
              }}
            >
              <Menu className="w-[17px] h-[17px]" style={{ color: "#6B7280" }} />
            </button>

            <div className="flex items-center gap-2">
              <img
                src="/logo/logo-ag.svg"
                alt="AG"
                className="object-contain"
                style={{ width: 32, height: 32 }}
              />
              <img
                src="/logo/logo-gi.svg"
                alt="GI"
                className="object-contain"
                style={{ width: 32, height: 32 }}
              />
              <div className="flex flex-col leading-none">
                <span
                  className="text-[14px] font-semibold tracking-tight"
                  style={{ color: "#111827" }}
                >
                  Glocal IELTS
                </span>
                <span
                  className="text-[10px] font-medium tracking-wide"
                  style={{ color: "#9CA3AF" }}
                >
                  Amazing Group
                </span>
              </div>
            </div>
          </div>

          {/* Center: Navigation */}
          <nav className="hidden lg:flex items-center">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={item.href === "/" ? onHomeClick : undefined}
                  className="relative flex flex-col items-center transition-all duration-200"
                  style={{ padding: "6px 16px" }}
                >
                  {active && (
                    <span
                      className="absolute inset-0 rounded-full pointer-events-none transition-all duration-200"
                      style={{ background: "rgba(91, 91, 214, 0.08)" }}
                    />
                  )}
                  <span
                    className="relative flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-200"
                    style={{ color: active ? "#5B5BD6" : "#6B7280", zIndex: 1 }}
                  >
                    {item.outlineIcon}
                    {item.label}
                  </span>
                  {active && (
                    <span
                      className="absolute -bottom-[14px] left-1/2 -translate-x-1/2 rounded-full"
                      style={{ width: "5px", height: "5px", background: "#5B5BD6" }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* <button
              type="button"
              className="relative flex items-center justify-center rounded-[12px] transition-colors duration-200"
              style={{
                width: "36px",
                height: "36px",
                background: "rgba(249,249,253,1)",
                border: "1px solid rgba(229,231,235,1)",
              }}
            >
              <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="#6B7280" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              <span
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full font-bold"
                style={{
                  width: "14px",
                  height: "14px",
                  background: "#EF4444",
                  fontSize: "8px",
                  color: "#FFFFFF",
                  lineHeight: 1,
                }}
              >
                3
              </span>
            </button> */}

            {/* <div
              className="flex items-center justify-center rounded-full overflow-hidden"
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #5B5BD6 0%, #7B79E8 100%)",
                border: "1.5px solid rgba(229,231,235,1)",
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div> */}

            <Link
              href="/register"
              className="flex items-center justify-center rounded-[12px] text-[12px] font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-md"
              style={{
                height: "36px",
                paddingLeft: "14px",
                paddingRight: "14px",
                background: "linear-gradient(135deg, #5B5BD6 0%, #4338CA 100%)",
                boxShadow: "0 2px 8px rgba(34,197,94,0.25)",
              }}
            >
              Đăng ký
            </Link>

            <Link
              href="/login"
              className="hidden sm:flex items-center justify-center rounded-[12px] text-[12px] font-semibold transition-all duration-200"
              style={{
                height: "36px",
                paddingLeft: "14px",
                paddingRight: "14px",
                color: "#374151",
                background: "rgba(249,249,253,1)",
                border: "1px solid rgba(229,231,235,1)",
              }}
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-x-0 z-40 flex items-end justify-center"
          style={{ bottom: "0", paddingBottom: "24px" }}
        >
          <div
            className="mx-4 w-full max-w-[calc(100vw-40px)] rounded-[24px] bg-white/90 backdrop-blur-xl border border-white/60 overflow-hidden"
            style={{ boxShadow: "0 8px 40px rgba(91,91,214,0.15)" }}
          >
            <div className="p-3">
              {navItems.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => { setMobileOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-[14px] font-medium transition-colors duration-150"
                    style={{
                      color: active ? "#5B5BD6" : "#374151",
                      background: active ? "rgba(91,91,214,0.08)" : "transparent",
                    }}
                  >
                    {item.outlineIcon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div
              className="flex gap-2 p-3 border-t"
              style={{ borderColor: "rgba(229,231,235,1)" }}
            >
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center py-3 text-[13px] font-semibold rounded-[14px] transition-colors duration-200"
                style={{
                  color: "#374151",
                  background: "rgba(249,249,253,1)",
                  border: "1px solid rgba(229,231,235,1)",
                }}
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center py-3 text-[13px] font-semibold text-white rounded-[14px] transition-all duration-200"
                style={{ background: "linear-gradient(135deg, #5B5BD6 0%, #7B79E8 100%)" }}
              >
                Đăng ký
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setMobileOpen(v => !v)}
        className="lg:hidden fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-[18px] transition-all duration-200"
        style={{
          width: "52px",
          height: "52px",
          background: "rgba(255,255,255,0.90)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 4px 24px rgba(91,91,214,0.15), 0 1px 4px rgba(0,0,0,0.06)",
          border: "1px solid rgba(255,255,255,0.70)",
        }}
      >
        {mobileOpen ? (
          <X className="w-5 h-5" style={{ color: "#374151" }} />
        ) : (
          <Menu className="w-5 h-5" style={{ color: "#374151" }} />
        )}
      </button>
    </>
  );
}
