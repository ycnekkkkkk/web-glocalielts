export * from "./database";

export type UserRole = "admin" | "teacher" | "student" | "organization" | "academic_manager";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar_url?: string | null;
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export type SidebarTheme = "brand" | "sky" | "purple" | "emerald";
