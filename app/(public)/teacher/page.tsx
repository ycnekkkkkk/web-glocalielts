"use client";
import RoleLoginForm from "@/components/ui/RoleLoginForm";

export default function TeacherLoginPage() {
  return (
    <RoleLoginForm
      config={{
        role: "teacher",
        title: "Đăng nhập Giáo viên",
        subtitle: "Trang dành riêng cho giáo viên Glocal IELTS",
        gradient: "bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700",
        accentClass: "text-emerald-600",
        spinnerClass: "border-emerald-600",
        dashboard: "/teacher/dashboard",
      }}
    />
  );
}
