import RoleLoginForm from "@/components/ui/RoleLoginForm";

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const sp = await searchParams;
  const emailConfirmHint = sp.registered === "1";

  return (
    <RoleLoginForm
      emailConfirmHint={emailConfirmHint}
      config={{
        role: "student",
        title: "Đăng nhập Học viên",
        subtitle: "Dùng email/mật khẩu hoặc Google để đăng nhập",
        gradient: "bg-gradient-to-br from-sky-900 via-sky-800 to-cyan-700",
        accentClass: "text-sky-600",
        spinnerClass: "border-sky-600",
        dashboard: "/student/dashboard",
        oauth: { provider: "google", label: "Tiếp tục với Google" },
      }}
    />
  );
}
