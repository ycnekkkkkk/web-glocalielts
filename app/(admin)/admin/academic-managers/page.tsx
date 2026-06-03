"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import { createBrowserClient } from "@/lib/supabase/client";
import { BookOpen, Copy, Eye, EyeOff, KeyRound, Lock, Plus, Search, Trash2, UserCheck } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

interface ManagerAccount {
  id: string;
  profile_code?: string | null;
  full_name: string | null;
  email: string | null;
  role: string;
  assigned_classes: { class_id: string; class_name: string }[];
}

export default function AdminAcademicManagersPage() {
  const [managers, setManagers] = useState<ManagerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create modal
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Credentials modal (shown after creation)
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string; name: string } | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<ManagerAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetPw, setResetPw] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resettingMgr, setResettingMgr] = useState<ManagerAccount | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();

      // Fetch all academic managers
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, profile_code, full_name, email, role")
        .eq("role", "academic_manager")
        .order("full_name");

      if (profErr) throw profErr;
      const rawManagers = (profiles || []) as { id: string; profile_code?: string | null; full_name: string | null; email: string | null; role: string }[];

      // Fetch assignments per manager
      let assignedMap: Record<string, { class_id: string; class_name: string }[]> = {};
      if (rawManagers.length > 0) {
        const managerIds = rawManagers.map(m => m.id);
        const { data: assignments } = await supabase
          .from("academic_manager_class_assignments")
          .select("manager_user_id, class_id")
          .in("manager_user_id", managerIds);

        if (assignments && assignments.length > 0) {
          const classIds = [...new Set((assignments as { class_id: string }[]).map(a => a.class_id))];
          const { data: classData } = await supabase
            .from("classes")
            .select("id, name")
            .in("id", classIds);
          const classMap: Record<string, string> = {};
          for (const c of (classData || []) as { id: string; name: string }[]) {
            classMap[c.id] = c.name;
          }
          for (const a of assignments as { manager_user_id: string; class_id: string }[]) {
            if (!assignedMap[a.manager_user_id]) assignedMap[a.manager_user_id] = [];
            assignedMap[a.manager_user_id].push({ class_id: a.class_id, class_name: classMap[a.class_id] || a.class_id });
          }
        }
      }

      setManagers(rawManagers.map(m => ({
        ...m,
        assigned_classes: assignedMap[m.id] || [],
      })));
    } catch {
      // assignment table might not exist yet (migration not run)
      const supabase = createBrowserClient();
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, profile_code, full_name, email, role")
        .eq("role", "academic_manager")
        .order("full_name");
      setManagers(((profiles || []) as { id: string; profile_code?: string | null; full_name: string | null; email: string | null; role: string }[]).map(m => ({
        ...m, assigned_classes: [],
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Vui lòng nhập đầy đủ thông tin"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/create-academic-manager-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, fullName: form.full_name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi tạo tài khoản");

      toast.success("Tạo tài khoản thành công!");
      setCreatedCreds({ email: form.email, password: form.password, name: form.full_name });
      setForm({ full_name: "", email: "", password: "" });
      setCreateModal(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("profiles")
        .update({ role: "student" })  // demote rather than hard delete
        .eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Đã xóa quyền quản lý học vụ");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setDeleting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resettingMgr || !resetPw) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/reset-user-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resettingMgr.id, newPassword: resetPw }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Đã đổi mật khẩu cho ${resettingMgr.full_name}`);
      setShowResetModal(false);
      setResetPw("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }


  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(`Đã sao chép ${label}`));
  }

  const filtered = managers.filter(m =>
    (m.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Quản Lý Học Vụ</h1>
          <p className="page-subtitle">{managers.length} tài khoản quản lý học vụ</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateModal(true)}>
          Tạo tài khoản mới
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100">
          <Input
            placeholder="Tìm theo tên, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-base font-medium text-gray-500">
              {managers.length === 0 ? "Chưa có tài khoản quản lý học vụ nào" : "Không tìm thấy kết quả"}
            </p>
            {managers.length === 0 && (
              <p className="text-sm text-gray-400 mt-1">Nhấn "Tạo tài khoản mới" để bắt đầu</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(mgr => (
              <div key={mgr.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <Avatar name={mgr.full_name || "?"} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">
                      {mgr.profile_code ? `[${mgr.profile_code}] ` : ""}{mgr.full_name || "–"}
                    </p>
                    <Badge variant="info">Quản lý học vụ</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{mgr.email || "–"}</p>
                  {mgr.assigned_classes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {mgr.assigned_classes.map(c => (
                        <span key={c.class_id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full border border-sky-100">
                          <BookOpen className="w-3 h-3" />{c.class_name}
                        </span>
                      ))}
                    </div>
                  )}
                  {mgr.assigned_classes.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">Chưa được gán lớp nào</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setResettingMgr(mgr); setResetPw(""); setShowResetModal(true); }}
                    title="Đặt lại mật khẩu"
                    className="p-2 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCreatedCreds({ email: mgr.email || "", password: "••••••••", name: mgr.full_name || "" })}
                    title="Xem thông tin đăng nhập"
                    className="p-2 rounded-lg text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(mgr)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Xóa quyền"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Tạo Tài Khoản Quản Lý Học Vụ">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs text-sky-700">
            Tài khoản này sẽ đăng nhập tại địa chỉ:{" "}
            <span className="font-mono font-semibold">/academic-manager</span>
          </div>
          <Input
            label="Họ và tên *"
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            placeholder="Nguyễn Văn A"
            required
          />
          <Input
            label="Email đăng nhập *"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="manager@example.com"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Tối thiểu 8 ký tự"
                required
                minLength={8}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setCreateModal(false)}>
              Hủy
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              Tạo tài khoản
            </Button>
          </div>
        </form>
      </Modal>

      {/* Credentials Display Modal */}
      <Modal
        open={!!createdCreds}
        onClose={() => setCreatedCreds(null)}
        title="Thông Tin Đăng Nhập"
      >
        {createdCreds && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800">
                  {createdCreds.password === "••••••••" ? "Thông tin tài khoản" : "Tài khoản đã tạo thành công!"}
                </p>
              </div>
              <p className="text-xs text-emerald-700 mb-4">
                Tên: <span className="font-semibold">{createdCreds.name}</span>
              </p>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Trang đăng nhập</p>
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-gray-200">
                    <code className="flex-1 text-sm font-mono text-sky-600">/academic-manager</code>
                    <button
                      onClick={() => copyToClipboard("/academic-manager", "URL")}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Email đăng nhập</p>
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-gray-200">
                    <code className="flex-1 text-sm font-mono text-gray-800">{createdCreds.email}</code>
                    <button
                      onClick={() => copyToClipboard(createdCreds.email, "email")}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {createdCreds.password !== "••••••••" && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Mật khẩu</p>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-gray-200">
                      <code className="flex-1 text-sm font-mono text-gray-800">{createdCreds.password}</code>
                      <button
                        onClick={() => copyToClipboard(createdCreds.password, "mật khẩu")}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {createdCreds.password !== "••••••••" && (
                <p className="text-xs text-amber-600 mt-3 font-medium">
                  ⚠️ Lưu lại mật khẩu ngay, sẽ không hiển thị lại sau khi đóng
                </p>
              )}
            </div>
            <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-xl">
              Để gán lớp cho quản lý học vụ này, vào{" "}
              <span className="font-semibold text-gray-700">Quản lý → Lớp học → [Tên lớp] → Tab "Quản Lý HV"</span>
            </div>
            <Button className="w-full" onClick={() => setCreatedCreds(null)}>Đóng</Button>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xóa quyền Quản Lý Học Vụ">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Bạn có chắc muốn thu hồi quyền quản lý học vụ của{" "}
              <span className="font-semibold text-gray-900">{deleteTarget.full_name}</span>?
            </p>
            <p className="text-xs text-gray-500">
              Tài khoản sẽ không còn truy cập được portal Quản Lý Học Vụ. Dữ liệu phân công lớp sẽ được giữ lại.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>Hủy</Button>
              <Button variant="danger" className="flex-1" loading={deleting} onClick={handleDelete}>
                Xóa quyền
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Reset Password Modal */}
      <Modal open={showResetModal} onClose={() => setShowResetModal(false)} title={`Đặt lại mật khẩu – ${resettingMgr?.full_name}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-gray-500">
            Đặt lại mật khẩu mới cho học vụ. Người dùng sẽ dùng mật khẩu này để đăng nhập ngay lập tức.
          </p>
          <Input
            label="Mật khẩu mới *"
            type="password"
            value={resetPw}
            onChange={e => setResetPw(e.target.value)}
            placeholder="Nhập ít nhất 6 ký tự"
            required
            autoFocus
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowResetModal(false)}>Hủy</Button>
            <Button type="submit" loading={saving} className="flex-1">Cập nhật mật khẩu</Button>
          </div>
        </form>
      </Modal>

    </PageWrapper>
  );
}
