"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { createBrowserClient } from "@/lib/supabase/client";
import { useStudents } from "@/hooks/useStudents";
import { useEnrollments } from "@/hooks/useEnrollments";
import type { Class, Student } from "@/types";
import {
  AlertCircle, GraduationCap, Mail, Pencil, Phone, Search, Trash2, UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function AdminStudentsPage() {
  const [search, setSearch] = useState("");
  const { students, loading, error: studentsError, createStudent, updateStudent, deleteStudent, reload } = useStudents();
  const [classes, setClasses] = useState<Class[]>([]);

  const [modal, setModal] = useState<null | "create" | "edit" | "delete" | "enroll">(null);
  const [selected, setSelected] = useState<Student | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", password: "", parent_info: "" });
  const [enrollForm, setEnrollForm] = useState({ class_id: "" });
  const [saving, setSaving] = useState(false);

  const { enroll } = useEnrollments();

  useEffect(() => {
    createBrowserClient()
      .from("classes")
      .select("id,name,tuition_fee,status,teacher:profiles!teacher_id(full_name)")
      .in("status", ["active", "upcoming"])
      .order("name")
      .then((res: { data: Class[] | null }) => setClasses(res.data || []));
  }, []);

  const filtered = students.filter(s =>
    (s.student_code || "").toLowerCase().includes(search.toLowerCase()) ||
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || "").includes(search) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setForm({ full_name: "", phone: "", email: "", password: "", parent_info: "" });
    setSelected(null);
    setModal("create");
  }

  function openEdit(s: Student) {
    setSelected(s);
    setForm({ full_name: s.full_name, phone: s.phone || "", email: s.email || "", password: "", parent_info: s.parent_info || "" });
    setModal("edit");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Create student account (auth user + password) via API
      const payload = {
        full_name: form.full_name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        parent_info: form.parent_info || undefined,
      };
      if (modal === "create") {
        if (!form.email || !form.password) {
          toast.error("Vui lòng nhập email và mật khẩu để tạo tài khoản học viên.");
          return;
        }

        const res = await fetch("/api/admin/create-student-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            fullName: form.full_name,
            phone: form.phone || undefined,
          }),
        });
        if (!res.ok) throw new Error(await res.text());

        const json = await res.json();

        // API chỉ set dữ liệu cốt lõi cho auth/student record.
        // Cần cập nhật thêm `parent_info` nếu admin nhập.
        if (form.parent_info?.trim() && json?.userId) {
          const supabase = createBrowserClient();
          const { data: sRow } = await supabase
            .from("students")
            .select("id")
            .eq("profile_id", json.userId)
            .maybeSingle();

          if (sRow?.id) {
            await supabase.from("students").update({ parent_info: form.parent_info.trim() }).eq("id", sRow.id);
          }
        }

        toast.success("Tạo tài khoản học viên thành công!");
        await reload();
      } else if (selected) {
        await updateStudent(selected.id, payload);
        toast.success("Cập nhật thành công!");
        await reload();
      }
      setModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteStudent(selected.id);
      toast.success("Đã xóa học viên!");
      setModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !enrollForm.class_id) return;
    setSaving(true);
    try {
      const cls = classes.find(c => c.id === enrollForm.class_id);
      if (!cls) throw new Error("Không tìm thấy lớp");
      await enroll(cls.id, selected.id, cls.tuition_fee, cls.name, selected.full_name);
      toast.success(`Đã đăng ký ${selected.full_name} vào ${cls.name}. Hóa đơn đã được tạo tự động.`);
      setModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper>
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Quản Lý Học Viên</h1>
          <p className="page-subtitle">{students.length} học viên</p>
        </div>
        <Button icon={<UserPlus className="w-4 h-4" />} onClick={openCreate}>Thêm học viên</Button>
      </div>

      {studentsError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm">
          <p className="font-semibold text-red-700 mb-1">⚠️ Lỗi tải học viên: {studentsError}</p>
          <p className="text-red-600 text-xs">
            Nếu lỗi <code className="bg-red-100 px-1 rounded">infinite recursion</code> trên enrollments, chạy{" "}
            <code className="bg-red-100 px-1 rounded">015_fix_enrollments_students_rls_recursion.sql</code>.
            Khác: <code className="bg-red-100 px-1 rounded">014_fix_admin_rls_access.sql</code> (SQL Editor).
          </p>
        </div>
      )}

      <Card>
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <Input placeholder="Tìm mã HV, tên, SĐT, email..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
          </div>
          <p className="text-sm text-gray-500">{filtered.length} kết quả</p>
        </div>

        {loading ? <div className="p-4"><SkeletonTable /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Học viên</th>
                  <th className="text-left px-4 py-3">Mã HV</th>
                  <th className="text-left px-4 py-3">Liên hệ</th>
                  <th className="text-left px-4 py-3">Phụ huynh</th>
                  <th className="text-left px-4 py-3">Ngày tạo</th>
                  <th className="text-left px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.full_name} size="sm" />
                        <span className="text-sm font-medium text-gray-900">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{s.student_code || "–"}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {s.phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone className="w-3 h-3" />{s.phone}</p>}
                        {s.email && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail className="w-3 h-3" />{s.email}</p>}
                        {!s.phone && !s.email && <span className="text-xs text-gray-400">–</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-40 truncate">{s.parent_info || "–"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" icon={<GraduationCap className="w-3.5 h-3.5" />}
                          onClick={() => { setSelected(s); setEnrollForm({ class_id: "" }); setModal("enroll"); }}>
                          Đăng ký lớp
                        </Button>
                        <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(s)} />
                        <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                          onClick={() => { setSelected(s); setModal("delete"); }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm font-medium">Không tìm thấy học viên nào</p>
                {students.length === 0 && !studentsError && (
                  <p className="text-xs mt-2 text-amber-500">
                    Nếu học viên đã được tạo, hãy vào{" "}
                    <a href="/admin/settings" className="underline text-amber-600">Cài đặt</a>{" "}
                    để kiểm tra quyền truy cập database.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)}
        title={modal === "create" ? "Thêm học viên" : "Chỉnh sửa học viên"}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Họ tên *" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Nguyễn Văn An" required />
          <Input label="Số điện thoại" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="0901 234 567" />
          <Input
            label="Email *"
            type="email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            placeholder="hocvien@email.com"
            required={modal === "create"}
          />
          {modal === "create" && (
            <Input
              label="Mật khẩu *"
              type="password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="Nhập mật khẩu cho học viên"
              required
            />
          )}
          <Input label="Thông tin phụ huynh" value={form.parent_info} onChange={e => setForm(p => ({ ...p, parent_info: e.target.value }))} placeholder="Nguyễn Văn B – 0901 234 999" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(null)}>Hủy</Button>
            <Button type="submit" loading={saving} className="flex-1">{modal === "create" ? "Thêm học viên" : "Lưu"}</Button>
          </div>
        </form>
      </Modal>

      {/* Enroll Modal */}
      <Modal open={modal === "enroll"} onClose={() => setModal(null)} title={`Đăng ký lớp – ${selected?.full_name}`}>
        <form onSubmit={handleEnroll} className="space-y-4">
          <p className="text-sm text-gray-500">Chọn lớp để đăng ký. Hóa đơn học phí sẽ được tạo tự động.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lớp học *</label>
            <select
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={enrollForm.class_id}
              onChange={e => setEnrollForm({ class_id: e.target.value })}
              required
            >
              <option value="">– Chọn lớp học –</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} – {c.tuition_fee ? `${(c.tuition_fee / 1_000_000).toFixed(1)}M` : "Liên hệ"}
                </option>
              ))}
            </select>
          </div>
          {enrollForm.class_id && (() => {
            const cls = classes.find(c => c.id === enrollForm.class_id);
            if (!cls) return null;
            return (
              <div className="bg-brand-50 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                <p className="text-xs text-brand-800">
                  Hóa đơn <strong>{cls.tuition_fee ? `${(cls.tuition_fee / 1_000_000).toFixed(1)}M VNĐ`  : "?"}</strong> sẽ được tạo sau khi đăng ký.
                </p>
              </div>
            );
          })()}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(null)}>Hủy</Button>
            <Button type="submit" loading={saving} className="flex-1">Xác nhận đăng ký</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Xóa học viên">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Bạn có chắc muốn xóa học viên <strong>{selected?.full_name}</strong>?
          </p>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Thao tác này sẽ xóa cả hồ sơ học viên trong hệ thống và tài khoản đăng nhập (Auth) nếu đang liên kết.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(null)}>Hủy</Button>
            <Button variant="danger" className="flex-1" loading={saving} onClick={handleDelete}>Xóa</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
