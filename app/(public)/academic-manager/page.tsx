"use client";
import RoleLoginForm from "@/components/ui/RoleLoginForm";

export default function AcademicManagerLoginPage() {
  return (
    <RoleLoginForm
      config={{
        role: "academic_manager",
        title: "Đăng nhập Quản Lý Học Vụ",
        subtitle: "Trang dành riêng cho quản lý học vụ",
        gradient: "bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-700",
        accentClass: "text-indigo-600",
        spinnerClass: "border-indigo-600",
        dashboard: "/academic-manager/classes",
      }}
    />
  );
}
