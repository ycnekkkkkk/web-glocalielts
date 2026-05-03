import { UserRole } from "@/types";

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  academic_manager: "/academic-manager/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  organization: "/organization/dashboard",
};

export const ROLE_LAYOUT_ROOTS: Record<UserRole, string> = {
  admin: "/admin",
  academic_manager: "/academic-manager",
  teacher: "/teacher",
  student: "/student",
  organization: "/organization",
};

/**
 * Returns the default dashboard for a given role.
 */
export function getDashboardForRole(role: UserRole): string {
  return ROLE_DASHBOARDS[role] || "/";
}

/**
 * Checks if a user with a specific role is allowed to access a path.
 */
export function canAccessPath(role: UserRole, pathname: string): boolean {
  // Public paths are handled outside layouts usually, 
  // but here we check if the pathname starts with the role's assigned root.
  const root = ROLE_LAYOUT_ROOTS[role];
  if (!root) return false;
  return pathname.startsWith(root);
}
