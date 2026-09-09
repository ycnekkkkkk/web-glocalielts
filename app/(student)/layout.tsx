"use client";
import Header from "@/components/layouts/Header";
import { SidebarInner } from "@/components/layouts/Sidebar";
import { SidebarProvider, useSidebarContext } from "@/components/layouts/SidebarContext";
import { PageTitleProvider } from "@/components/layouts/PageTitleContext";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  Award, BookOpen, Calendar, GraduationCap, Headphones, Home, Search, Settings
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { NavGroup } from "@/types";

const navGroups: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [
      { label: "Trang chủ", href: "/student/dashboard", icon: Home }
    ],
  },
  {
    label: "Học tập",
    items: [
      { label: "Khóa học của tôi", href: "/student/my-courses", icon: GraduationCap },
      { label: "Khóa online đã mua", href: "/student/my-online-courses", icon: BookOpen },
      { label: "Khám phá khóa online", href: "/student/online-courses", icon: Search },
      { label: "Lịch học", href: "/student/schedule", icon: Calendar },
      { label: "Thi thử 4 kỹ năng", href: "/student/thi-thu", icon: Headphones },
      { label: "Tài khoản", href: "/student/account", icon: Settings },
    ],
  },
  {
    label: "Kết quả",
    items: [
      { label: "Bài thi", href: "/student/exams", icon: BookOpen },
      { label: "Chứng chỉ", href: "/student/certificates", icon: Award },
    ],
  },
];

function StudentSidebarFooter({ user }: { user: { name: string; avatar_url?: string; email?: string } }) {
  const { collapsed } = useSidebarContext();

  if (collapsed) {
    return (
      <Link
        href="/student/account"
        title={`${user.name} (Học viên) - Cài đặt tài khoản`}
        className="flex items-center justify-center p-1 rounded-xl hover:bg-brand-50 transition-colors group"
      >
        <Avatar name={user.name} src={user.avatar_url} size="sm" />
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-brand-300 hover:shadow-sm transition-all group">
      <Link href="/student/account" className="shrink-0">
        <Avatar name={user.name} src={user.avatar_url} size="sm" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          href="/student/account"
          className="block text-xs font-bold text-slate-900 truncate hover:text-brand-600 transition-colors"
        >
          {user.name}
        </Link>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Học viên</span>
        </div>
      </div>
      <Link
        href="/student/account"
        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        title="Cài đặt tài khoản"
      >
        <Settings className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRoleGuard("student", "/login");
  const [mounted, setMounted] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [studentRowId, setStudentRowId] = useState<string | null>(null);
  const [requireLocalPassword, setRequireLocalPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    current_address: "",
    current_status: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || loading || !user || user.role !== "student") return;
    let active = true;
    const userId = user.id;
    const userName = user.name || "";
    const userEmail = user.email || "";

    async function loadStudentProfileGate() {
      const supabase = createBrowserClient();
      const { data: authUserData } = await supabase.auth.getUser();
      const { data: student } = await supabase
        .from("students")
        .select("id, full_name, email, phone, date_of_birth, current_address, current_status, profile_completed")
        .eq("profile_id", userId)
        .maybeSingle();
      const { data: profile } = await supabase
        .from("profiles")
        .select("has_local_password")
        .eq("id", userId)
        .maybeSingle();

      if (!active) return;
      setCheckingProfile(false);
      if (!student) return;

      const providers = authUserData.user?.app_metadata?.providers || [];
      const isGoogle = Array.isArray(providers) && providers.includes("google");
      const needsPassword = isGoogle && !profile?.has_local_password;
      setRequireLocalPassword(needsPassword);

      setStudentRowId(student.id);
      setProfileForm({
        full_name: student.full_name || userName,
        email: student.email || userEmail,
        phone: student.phone || "",
        date_of_birth: student.date_of_birth || "",
        current_address: student.current_address || "",
        current_status: student.current_status || "",
        password: "",
        confirmPassword: "",
      });
      setShowProfileModal(!student.profile_completed || needsPassword);
    }

    loadStudentProfileGate().catch(() => {
      if (!active) return;
      setCheckingProfile(false);
    });

    return () => {
      active = false;
    };
  }, [mounted, loading, user]);

  async function handleSaveProfile() {
    if (!studentRowId) return;
    if (!profileForm.phone.trim()) return;
    if (!profileForm.date_of_birth) return;
    if (!profileForm.current_address.trim()) return;
    if (!profileForm.current_status) return;
    if (requireLocalPassword) {
      if (!profileForm.password || profileForm.password.length < 6) return;
      if (profileForm.password !== profileForm.confirmPassword) return;
    }

    setSavingProfile(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("students")
        .update({
          phone: profileForm.phone.trim(),
          date_of_birth: profileForm.date_of_birth,
          current_address: profileForm.current_address.trim(),
          current_status: profileForm.current_status,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentRowId);

      if (error) throw error;

      if (requireLocalPassword) {
        const res = await fetch("/api/account/set-local-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: profileForm.full_name.trim(),
            phone: profileForm.phone.trim(),
            password: profileForm.password,
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || "Không thể thiết lập mật khẩu đăng nhập.");
        }
      }

      setShowProfileModal(false);
      toast.success("Đã cập nhật thông tin cá nhân.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu thông tin.");
    } finally {
      setSavingProfile(false);
    }
  }

  if (!mounted || loading || checkingProfile) return <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
  </div>;

  return (
    <SidebarProvider>
      <PageTitleProvider>
        <div className="flex min-h-screen bg-gray-50">
          <SidebarInner
            groups={navGroups}
            theme="purple"
            footerContent={user ? <StudentSidebarFooter user={user} /> : null}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <Header user={user} />
            {children}
          </div>
        </div>
        <Modal
          open={showProfileModal}
          onClose={() => {}}
          title="Cập nhật thông tin cá nhân"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Vui lòng hoàn tất thông tin để tiếp tục sử dụng khu vực học viên.
            </p>
            <Input
              label="Họ và tên"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))}
              disabled={!requireLocalPassword}
            />
            <Input label="Email" value={profileForm.email} disabled />
            <Input
              label="Ngày tháng năm sinh *"
              type="date"
              value={profileForm.date_of_birth}
              onChange={(e) => setProfileForm((p) => ({ ...p, date_of_birth: e.target.value }))}
              required
            />
            <Input
              label="Số điện thoại *"
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="09xxxxxxxx"
              required
            />
            <Input
              label="Nơi ở hiện tại *"
              value={profileForm.current_address}
              onChange={(e) => setProfileForm((p) => ({ ...p, current_address: e.target.value }))}
              placeholder="Thành phố / Quận / Huyện"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hiện tại đang là *</label>
              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={profileForm.current_status}
                onChange={(e) => setProfileForm((p) => ({ ...p, current_status: e.target.value }))}
                required
              >
                <option value="">-- Chọn trạng thái --</option>
                <option value="Học sinh">Học sinh</option>
                <option value="Sinh viên">Sinh viên</option>
                <option value="Người đi làm">Người đi làm</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            {requireLocalPassword && (
              <>
                <Input
                  label="Mật khẩu đăng nhập *"
                  type="password"
                  value={profileForm.password}
                  onChange={(e) => setProfileForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
                <Input
                  label="Xác nhận mật khẩu *"
                  type="password"
                  value={profileForm.confirmPassword}
                  onChange={(e) => setProfileForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Nhập lại mật khẩu"
                  required
                />
              </>
            )}
            <Button
              className="w-full"
              loading={savingProfile}
              onClick={handleSaveProfile}
              disabled={
                !profileForm.phone.trim() ||
                !profileForm.date_of_birth ||
                !profileForm.current_address.trim() ||
                !profileForm.current_status ||
                (requireLocalPassword &&
                  (!profileForm.password ||
                    profileForm.password.length < 6 ||
                    profileForm.password !== profileForm.confirmPassword))
              }
            >
              {requireLocalPassword ? "Lưu thông tin & tạo mật khẩu" : "Lưu thông tin"}
            </Button>
          </div>
        </Modal>
      </PageTitleProvider>
    </SidebarProvider>
  );
}
