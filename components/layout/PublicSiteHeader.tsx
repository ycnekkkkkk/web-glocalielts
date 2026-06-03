"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type MouseEvent } from "react";

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
  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const onHome = pathname === "/";
  const consultActive = pathname === "/consult";
  const coursesActive = pathname === "/courses" || pathname.startsWith("/courses/");
  const thiThuActive = pathname === "/thi-thu" || pathname.startsWith("/thi-thu/");

  const navItems = [
    { href: "/", label: "Home", active: onHome },
    { href: "/courses", label: "Courses", active: coursesActive },
    { href: "/thi-thu", label: "Mock Tests", active: thiThuActive },
    { href: "/consult", label: "Consult", active: consultActive },
  ];

  const onHomeMobileClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    onHomeClick(e);
    closeMobileMenu();
  }, [onHomeClick, closeMobileMenu]);

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? "rgba(237,232,255,0.8)"
          : "rgba(237,232,255,0.45)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: scrolled ? "1px solid rgba(199,183,255,0.3)" : "1px solid transparent",
        boxShadow: scrolled ? "0 1px 24px rgba(91,91,214,0.06)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-5 lg:px-8 min-h-[68px] flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" onClick={onHomeClick} className="flex items-center gap-2.5 shrink-0">
          <img src="/logo/logo-ag.svg" alt="AG" className="w-9 h-9 object-contain" />
          <img src="/logo/logo-gi.svg" alt="Glocal IELTS" className="w-9 h-9 object-contain" />
          <span className="text-[15px] font-bold text-gray-900 tracking-tight hidden sm:block">Glocal IELTS</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={item.href === "/" ? onHomeClick : undefined}
              className="relative px-4 py-2 text-[0.9rem] font-medium rounded-xl transition-all duration-200"
              style={{
                color: item.active ? "#5B5BD6" : "#6B7280",
                background: item.active ? "rgba(91,91,214,0.08)" : "transparent",
              }}
            >
              {item.label}
              {item.active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full" style={{ background: "#5B5BD6" }} />
              )}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          <Link href="/login" className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-xl hover:bg-gray-100/70">
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:shadow-brand-500/20"
            style={{ background: "linear-gradient(135deg, #5B5BD6 0%, #7C6CFF 100%)" }}
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen(v => !v)}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white/80 text-gray-700"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl px-4 pb-5 pt-3">
          <div className="space-y-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={item.href === "/" ? onHomeMobileClick : closeMobileMenu}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ color: item.active ? "#5B5BD6" : "#374151", background: item.active ? "rgba(91,91,214,0.06)" : "transparent" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Link href="/login" onClick={closeMobileMenu} className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={closeMobileMenu}
              className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-white rounded-xl"
              style={{ background: "linear-gradient(135deg, #5B5BD6 0%, #7C6CFF 100%)" }}
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
