import { resolveUserRole } from "@/lib/auth/resolve-user-role";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Login pages for each role (not protected)
const LOGIN_PAGES: Record<string, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/login",
  organization: "/organization",
  academic_manager: "/academic-manager",
};

// Dashboard for each role (redirect after login)
const DASHBOARDS: Record<string, string> = {
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  organization: "/organization/dashboard",
  academic_manager: "/academic-manager/classes",
};

// Sub-paths that require auth (portal pages, NOT the login page itself)
function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/teacher/") ||
    pathname.startsWith("/student/") ||
    pathname.startsWith("/organization/") ||
    pathname.startsWith("/academic-manager/")
  );
}

// Which role is required for a protected path
function requiredRole(pathname: string): string | null {
  if (pathname.startsWith("/admin/")) return "admin";
  if (pathname.startsWith("/teacher/")) return "teacher";
  if (pathname.startsWith("/student/")) return "student";
  if (pathname.startsWith("/organization/")) return "organization";
  if (pathname.startsWith("/academic-manager/")) return "academic_manager";
  return null;
}


export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  /** Mọi lần Supabase ghi cookie (OAuth PKCE, refresh) — redirect phải replay, không mất session. */
  const authCookies = new Map<string, { name: string; value: string; options?: Record<string, unknown> }>();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const c of cookiesToSet) {
            authCookies.set(c.name, c);
          }
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const redirect = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const res = NextResponse.redirect(url);
    for (const { name, value, options } of authCookies.values()) {
      res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
    }
    return res;
  };

  // — Unauthenticated user hits a protected sub-path → send to that role's login
  if (!user && isProtectedPath(pathname)) {
    const role = requiredRole(pathname)!;
    return redirect(LOGIN_PAGES[role]);
  }

  // — Authenticated user: get their role
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = resolveUserRole(profile?.role, user);
    const loginPage = LOGIN_PAGES[role];
    const dashboard = DASHBOARDS[role];

    // If on old /login or /register, redirect to their dashboard
    if (pathname === "/login" || pathname === "/register") {
      return redirect(dashboard);
    }

    // If on their own login page (e.g. admin on /admin), redirect to dashboard
    if (pathname === loginPage) {
      return redirect(dashboard);
    }

    // If on a different role's login page, redirect to their own dashboard
    const allLoginPages = Object.values(LOGIN_PAGES);
    if (allLoginPages.includes(pathname) && pathname !== loginPage) {
      return redirect(dashboard);
    }

    // If on a protected sub-path for the wrong role, redirect to own dashboard
    if (isProtectedPath(pathname)) {
      const required = requiredRole(pathname);
      if (required && required !== role) {
        return redirect(dashboard);
      }

    }
  }

  return supabaseResponse;
}
