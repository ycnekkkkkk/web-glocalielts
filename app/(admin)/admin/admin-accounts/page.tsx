"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { createBrowserClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Plus, Search, Shield, ShieldX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

interface AdminAccount {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
}

export default function AdminAccountsPage() {
  const [rows, setRows] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });

  const loadRows = useCallback(async () => {
    setLoading(true);
    const supabase = createBrowserClient();
    const [{ data: userData }, { data: profiles, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("id, full_name, email, role").eq("role", "admin").order("full_name"),
    ]);
    setCurrentUserId(userData.user?.id ?? null);
    if (error) {
      toast.error(error.message || "Không tải được danh sách admin");
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((profiles as AdminAccount[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRows().catch(console.error);
  }, [loadRows]);

  const filtered = useMemo(
    () =>
      rows.filter((x) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (x.full_name || "").toLowerCase().includes(q) || (x.email || "").toLowerCase().includes(q);
      }),
    [rows, search]
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/create-admin-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.full_name,
          email: form.email,
          password: form.password,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Tạo tài khoản thất bại");
      toast.success("Tạo tài khoản admin thành công");
      setCreateModal(false);
      setForm({ full_name: "", email: "", password: "" });
      await loadRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  async function revokeAdmin(adminId: string) {
    if (!confirm("Thu hồi quyền admin của tài khoản này?")) return;
    setRevokingId(adminId);
    try {
      const res = await fetch("/api/admin/revoke-admin-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Thu hồi quyền thất bại");
      toast.success("Đã thu hồi quyền admin");
      await loadRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <PageWrapper>
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Quản lý tài khoản Admin</h1>
          <p className="page-subtitle">{rows.length} tài khoản quản trị viên</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateModal(true)}>
          Thêm admin
        </Button>
      </div>

      <Card className="p-4 mb-5">
        <Input
          placeholder="Tìm theo tên hoặc email admin..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </Card>

      <Card>
        {loading ? (
          <div className="flex justify-center py-14">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-gray-500">Không có tài khoản admin nào.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((row) => {
              const isMe = row.id === currentUserId;
              return (
                <div key={row.id} className="flex items-center gap-4 px-5 py-4">
                  <Avatar name={row.full_name || "A"} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{row.full_name || "—"}</p>
                      <Badge variant="info">Admin</Badge>
                      {isMe ? <Badge variant="success">Bạn</Badge> : null}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{row.email || "—"}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<ShieldX className="w-4 h-4" />}
                    disabled={isMe || revokingId === row.id}
                    loading={revokingId === row.id}
                    onClick={() => revokeAdmin(row.id)}
                  >
                    Thu hồi quyền
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Tạo tài khoản Admin mới">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-xs text-brand-700">
            Tài khoản tạo mới sẽ có quyền truy cập toàn bộ trang quản trị.
          </div>
          <Input
            label="Họ và tên *"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            placeholder="Nguyễn Văn A"
            required
          />
          <Input
            label="Email đăng nhập *"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="admin@example.com"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Tối thiểu 8 ký tự"
                minLength={8}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
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
            <Button type="submit" className="flex-1" loading={saving} icon={<Shield className="w-4 h-4" />}>
              Tạo admin
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
