"use client";

import { useAuth } from "@/hooks/useAuth";
import { getDashboardForRole } from "@/lib/auth/rbac";
import { UserRole } from "@/types";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Hook to enforce role-based access control in layout components.
 * @param allowedRole The role required for this layout/section.
 * @param loginPath Where to send unauthenticated users (defaults to /[allowedRole] or /login).
 */
export function useRoleGuard(allowedRole: UserRole, loginPath?: string) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;

    if (!user) {
      // Not logged in -> send to portal login or main login
      router.replace(loginPath || "/login");
      return;
    }

    if (user.role !== allowedRole) {
      // Logged in but WRONG role -> send to their own dashboard
      const correctDashboard = getDashboardForRole(user.role);
      
      // Prevent infinite redirect if somehow they are already on their dashboard but role check failed
      if (pathname !== correctDashboard) {
        router.replace(correctDashboard);
      } else {
        // If they are on their dashboard but the layout says they shouldn't be here,
        // it means there's a configuration mismatch. Default to home.
        router.replace("/");
      }
    }
  }, [user, loading, mounted, router, allowedRole, loginPath, pathname]);

  return { user, loading: !mounted || loading };
}
