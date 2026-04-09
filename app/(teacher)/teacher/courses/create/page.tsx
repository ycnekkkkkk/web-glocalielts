"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

export default function CreateCoursePage() {
  const [form, setForm] = useState({ name: "", schedule: "", room: "", target: "", totalSessions: "24" });
  const [saving, setSaving] = useState(false);

  function update(f: string, v: string) { setForm(p => ({ ...p, [f]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    toast.success("Đã tạo lớp học mới!");
    setSaving(false);
  }

  return (
    <PageWrapper>
      <div className="mb-4">
        <Link href="/teacher/courses">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>Danh sách lớp</Button>
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">Tạo Lớp Học Mới</h1>
      </div>

      <Card className="max-w-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Tên lớp học" value={form.name} onChange={e => update("name", e.target.value)} placeholder="Vd: IELTS Nhóm – Band 7.0 (Tối) – Nguyễn Thị Lan" required />
          <Input label="Lịch học" value={form.schedule} onChange={e => update("schedule", e.target.value)} placeholder="Thứ 3, 5 · 19:30–21:30" />
          <Input label="Phòng học" value={form.room} onChange={e => update("room", e.target.value)} placeholder="Phòng 01" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Mục tiêu đầu ra" value={form.target} onChange={e => update("target", e.target.value)} placeholder="7.0" />
            <Input label="Tổng số buổi" type="number" value={form.totalSessions} onChange={e => update("totalSessions", e.target.value)} />
          </div>
          <Select label="Loại lớp" defaultValue="Nhóm"
            options={[{ value: "Nhóm", label: "Nhóm (4-8 HV)" }, { value: "1:1", label: "1:1 (cá nhân)" }]}
          />
          <div className="flex gap-3 pt-2">
            <Link href="/teacher/courses" className="flex-1">
              <Button type="button" variant="secondary" className="w-full">Hủy</Button>
            </Link>
            <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />} className="flex-1">Tạo lớp</Button>
          </div>
        </form>
      </Card>
    </PageWrapper>
  );
}
