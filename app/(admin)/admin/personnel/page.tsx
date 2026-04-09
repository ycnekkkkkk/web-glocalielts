"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useStaff } from "@/hooks/useStaff";
import type { Staff } from "@/types";
import { Mail, Pencil, Phone, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const EMPTY: Omit<Staff, "id" | "created_at"> = {
  name: "", role: "", department: null, phone: null, email: null, status: "active",
};

export default function AdminPersonnelPage() {
  const { staff, loading, createStaff, updateStaff, deleteStaff } = useStaff();
  const [modal, setModal] = useState<null | "create" | "edit" | "delete">(null);
  const [selected, setSelected] = useState<Staff | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm(EMPTY);
    setSelected(null);
    setModal("create");
  }

  function openEdit(s: Staff) {
    setSelected(s);
    setForm({ name: s.name, role: s.role, department: s.department, phone: s.phone, email: s.email, status: s.status });
    setModal("edit");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === "create") {
        await createStaff({ ...form, department: form.department || null, phone: form.phone || null, email: form.email || null });
        toast.success("Thêm nhân viên thành công!");
      } else if (selected) {
        await updateStaff(selected.id, { ...form, department: form.department || null, phone: form.phone || null, email: form.email || null });
        toast.success("Cập nhật thành công!");
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
      await deleteStaff(selected.id);
      toast.success("Đã xóa nhân viên!");
      setModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  const f = form;

  return (
    <PageWrapper>
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Quản Lý Nhân Sự</h1>
          <p className="page-subtitle">{staff.length} nhân viên</p>
        </div>
        <Button icon={<UserPlus className="w-4 h-4" />} onClick={openCreate}>Thêm nhân viên</Button>
      </div>

      {loading ? (
        <Card className="p-4"><SkeletonTable /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {staff.map(s => (
            <Card key={s.id} hover className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar name={s.name} size="lg" />
                  <div>
                    <p className="font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.role}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(s)} />
                  <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} onClick={() => { setSelected(s); setModal("delete"); }} />
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Phòng ban:</span>
                  <Badge variant="default">{s.department || "–"}</Badge>
                </div>
                {s.phone && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Phone className="w-3 h-3 text-gray-400" />{s.phone}
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Mail className="w-3 h-3 text-gray-400" />{s.email}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Trạng thái:</span>
                  <Badge variant={s.status === "active" ? "success" : "gray"}>
                    {s.status === "active" ? "Đang làm việc" : "Nghỉ việc"}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
          {staff.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <p className="text-sm">Chưa có nhân viên nào. Nhấn "Thêm nhân viên" để bắt đầu.</p>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)}
        title={modal === "create" ? "Thêm nhân viên" : "Chỉnh sửa nhân viên"}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Họ tên *" value={f.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="Nguyễn Thị Lan" />
          <Input label="Chức vụ *" value={f.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} required placeholder="Kế toán" />
          <Input label="Phòng ban" value={f.department || ""} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="Tài chính" />
          <Input label="Số điện thoại" type="tel" value={f.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="0901 234 567" />
          <Input label="Email" type="email" value={f.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="nhanvien@glocal.edu.vn" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={f.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value as Staff["status"] }))}
            >
              <option value="active">Đang làm việc</option>
              <option value="inactive">Nghỉ việc</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(null)}>Hủy</Button>
            <Button type="submit" loading={saving} className="flex-1">{modal === "create" ? "Thêm" : "Lưu"}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Xóa nhân viên">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Bạn có chắc muốn xóa nhân viên <strong>{selected?.name}</strong>?</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(null)}>Hủy</Button>
            <Button variant="danger" className="flex-1" loading={saving} onClick={handleDelete}>Xóa</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
