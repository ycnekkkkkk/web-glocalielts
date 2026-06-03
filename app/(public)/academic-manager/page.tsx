"use client";
import RoleLoginForm from "@/components/ui/RoleLoginForm";

export default function AcademicManagerLoginPage() {
  return (
    <RoleLoginForm
      config={{
        role: "academic_manager",
        title: "Đăng nhập Quản Lý Học Vụ",
        subtitle: "Trang dành riêng cho quản lý học vụ",
        gradient: "bg-gradient-to-br from-sky-900 via-sky-800 to-sky-700",
        accentClass: "text-sky-600",
        spinnerClass: "border-sky-600",
        dashboard: "/academic-manager/classes",
      }}
    />
  );
}
