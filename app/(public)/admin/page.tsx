"use client";
import RoleLoginForm from "@/components/ui/RoleLoginForm";

export default function AdminLoginPage() {
  return (
    <RoleLoginForm
      config={{
        role: "admin",
        title: "Đăng nhập Quản trị",
        subtitle: "Trang dành riêng cho quản trị viên",
        gradient: "bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800",
        accentClass: "text-brand-600",
        spinnerClass: "border-brand-600",
        dashboard: "/admin/dashboard",
      }}
    />
  );
}
