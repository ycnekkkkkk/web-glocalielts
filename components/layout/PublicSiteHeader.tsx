"use client";

import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { cn } from "@/utils/cn";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";

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

/** Khi đã ở / nhưng URL còn #anchor, Next Link href="/" không xóa hash — cần replaceState + sync. */
function useClearHomeHash(syncHash: () => void) {
  return useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (typeof window === "undefined") return;
      if (window.location.pathname === "/" && window.location.hash) {
        e.preventDefault();
        window.history.replaceState(null, "", "/");
        syncHash();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [syncHash]
  );
}

const navLinkBase =
  "rounded-lg px-2.5 py-2 -my-1 text-[0.9375rem] font-medium transition-colors duration-150";

function NavPill({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        navLinkBase,
        active
          ? "bg-brand-600 text-white shadow-md shadow-brand-600/25 ring-1 ring-brand-400/80 hover:bg-brand-700 hover:text-white"
          : "text-gray-700 hover:text-brand-700 hover:bg-brand-50/90"
      )}
    >
      {children}
    </Link>
  );
}

export default function PublicSiteHeader() {
  const { pathname, syncHash } = useRouteHash();
  const onHomeClick = useClearHomeHash(syncHash);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);
  const onHomeMobileClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      onHomeClick(e);
      closeMobileMenu();
    },
    [closeMobileMenu, onHomeClick]
  );

  const onHome = pathname === "/";
  const consultActive = pathname === "/consult";
  const homeActive = onHome;
  const coursesActive = pathname === "/courses" || pathname.startsWith("/courses/");
  const thiThuActive = pathname === "/thi-thu" || pathname.startsWith("/thi-thu/");

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/90 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 py-2.5 flex items-center justify-between gap-3 lg:gap-6">
        <Link
          href="/"
          onClick={onHomeClick}
          className="flex items-center gap-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/80 shrink-0"
        >
          <Logo size="md" className="shrink-0" />
        </Link>
        <nav className="hidden lg:flex items-center gap-4 xl:gap-7">
          <NavPill href="/" active={homeActive} onClick={onHomeClick}>
            Trang chủ
          </NavPill>
          <NavPill href="/courses" active={coursesActive}>
            Khóa học
          </NavPill>
          <NavPill href="/thi-thu" active={thiThuActive}>
            Thi thử
          </NavPill>
          <NavPill href="/consult" active={consultActive}>
            Tư vấn
          </NavPill>
        </nav>
        <div className="hidden lg:flex items-center gap-2.5 sm:gap-3 shrink-0">
          <Link href="/login">
            <Button variant="outline" size="md" className="min-h-10 px-5 sm:px-6">
              Đăng nhập
            </Button>
          </Link>
          <Link href="/register">
            <Button size="md" variant="primary" className="min-h-10 px-5 sm:px-6">
              Đăng ký
            </Button>
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={mobileOpen}
          className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-200/90 bg-white px-4 pb-4 pt-3">
          <div className="grid gap-2">
            <NavPill href="/" active={homeActive} onClick={onHomeMobileClick}>
              Trang chủ
            </NavPill>
            <NavPill href="/courses" active={coursesActive} onClick={closeMobileMenu}>
              Khóa học
            </NavPill>
            <NavPill href="/thi-thu" active={thiThuActive} onClick={closeMobileMenu}>
              Thi thử
            </NavPill>
            <NavPill href="/consult" active={consultActive} onClick={closeMobileMenu}>
              Tư vấn
            </NavPill>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/login" onClick={closeMobileMenu}>
              <Button variant="outline" size="md" className="w-full min-h-10 px-3">
                Đăng nhập
              </Button>
            </Link>
            <Link href="/register" onClick={closeMobileMenu}>
              <Button size="md" variant="primary" className="w-full min-h-10 px-3">
                Đăng ký
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
