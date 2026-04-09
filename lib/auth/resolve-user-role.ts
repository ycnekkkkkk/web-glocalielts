import type { UserRole } from "@/types";
import type { User } from "@supabase/supabase-js";

const ALLOWED_ROLES = new Set<string>([
  "admin",
  "teacher",
  "student",
  "organization",
  "academic_manager",
]);

/** Chuẩn hoá role từ profiles + JWT (OAuth / metadata) — tránh mặc định sai thành student. */
export function resolveUserRole(profileRole: string | null | undefined, authUser: User): UserRole {
  if (profileRole && ALLOWED_ROLES.has(profileRole)) return profileRole as UserRole;

  const fromUserMeta = authUser.user_metadata?.role;
  if (typeof fromUserMeta === "string" && ALLOWED_ROLES.has(fromUserMeta)) return fromUserMeta as UserRole;

  const fromAppMeta = authUser.app_metadata?.role;
  if (typeof fromAppMeta === "string" && ALLOWED_ROLES.has(fromAppMeta)) return fromAppMeta as UserRole;

  return "student";
}
