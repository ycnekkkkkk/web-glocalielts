"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { createBrowserClient } from "@/lib/supabase/client";
import { useClasses } from "@/hooks/useClasses";
import {
  DAY_COLUMNS, DayColumn, generateSessionDates, formatDateFull,
} from "@/lib/scheduleUtils";
import type { Class } from "@/types";
import { GraduationCap, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface TeacherOption { id: string; profile_code?: string | null; full_name: string | null; email: string | null; }
interface StudentOption { id: string; student_code?: string | null; full_name: string; email: string | null; }

const STATUS_OPTIONS = [
  { value: "active",    label: "Đang học" },
  { value: "upcoming",  label: "Sắp khai giảng" },
  { value: "completed", label: "Kết thúc" },
  { value: "cancelled", label: "Đã hủy" },
];

const TYPE_OPTIONS = [
  { value: "group", label: "Nhóm" },
  { value: "1on1",  label: "1:1" },
];

const DAY_LABELS: Record<DayColumn, string> = {
  T2: "Thứ 2", T3: "Thứ 3", T4: "Thứ 4", T5: "Thứ 5",
  T6: "Thứ 6", T7: "Thứ 7", CN: "Chủ nhật",
};

function statusBadge(status: string) {
  const map: Record<string, { v: "success"|"info"|"gray"|"danger"; l: string }> = {
    active:    { v: "success", l: "Đang học" },
    upcoming:  { v: "info",    l: "Sắp khai giảng" },
    completed: { v: "gray",    l: "Kết thúc" },
    cancelled: { v: "danger",  l: "Đã hủy" },
  };
  const m = map[status] || { v: "gray" as const, l: status };
  return <Badge variant={m.v}>{m.l}</Badge>;
}

type FormData = Omit<Class, "id"|"created_at"|"updated_at"|"teacher"|"enrollments">;

const EMPTY: FormData = {
  organization_id: null, name: "", teacher_id: null, schedule: "",
  schedule_days: [], schedule_time: "", schedule_end_time: "",
  room: "", level_in: "", level_out: "", total_sessions: 0, sessions_done: 0,
  tuition_fee: 0, start_date: null, end_date: "", status: "active", class_type: "group",
};

export default function AdminClassesPage() {
  const { classes, loading, error: classesError, createClass, updateClass, deleteClass } = useClasses();
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "create" | "edit" | "delete">(null);
  const [selected, setSelected] = useState<Class | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [generatingSessions, setGeneratingSessions] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.from("profiles").select("id,profile_code,full_name,email").eq("role", "teacher").order("full_name")
      .then((res: { data: TeacherOption[] | null }) => setTeachers(res.data || []));
    supabase.from("students").select("id,student_code,full_name,email").order("full_name")
      .then((res: { data: StudentOption[] | null }) => setStudents(res.data || []));
  }, []);

  async function loadEnrollments(classId: string) {
    const { data } = await createBrowserClient()
      .from("enrollments")
      .select("student_id")
      .eq("class_id", classId)
      .eq("status", "active");
    setSelectedStudentIds((data || []).map((e: { student_id: string }) => e.student_id));
  }

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.teacher?.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setForm(EMPTY);
    setSelected(null);
    setSelectedStudentIds([]);
    setStudentSearch("");
    setModal("create");
  }

  function openEdit(cls: Class) {
    setSelected(cls);
    setForm({
      organization_id: cls.organization_id, name: cls.name, teacher_id: cls.teacher_id,
      schedule: cls.schedule || "",
      schedule_days: cls.schedule_days || [],
      schedule_time: cls.schedule_time || "",
      schedule_end_time: cls.schedule_end_time || "",
      room: cls.room || "", level_in: cls.level_in || "",
      level_out: cls.level_out || "", total_sessions: cls.total_sessions, sessions_done: cls.sessions_done,
      tuition_fee: cls.tuition_fee, start_date: cls.start_date, end_date: cls.end_date || "",
      status: cls.status, class_type: cls.class_type,
    });
    setStudentSearch("");
    setSelectedStudentIds([]);
    loadEnrollments(cls.id);
    setModal("edit");
  }

  function toggleStudent(id: string) {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  function toggleDay(day: DayColumn) {
    setForm(prev => {
      const days = prev.schedule_days || [];
      const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
      // Keep canonical order
      const ordered = DAY_COLUMNS.filter(d => next.includes(d));
      // Build human-readable schedule text
      const timeStr = prev.schedule_time ? ` ${prev.schedule_time}${prev.schedule_end_time ? `–${prev.schedule_end_time}` : ""}` : "";
      const schedule = ordered.map(d => DAY_LABELS[d].replace("Thứ ", "T")).join(", ") + timeStr;
      return { ...prev, schedule_days: ordered, schedule: schedule || prev.schedule };
    });
  }

  function updateTimeFields(field: "schedule_time" | "schedule_end_time", value: string) {
    setForm(prev => {
      const days = prev.schedule_days || [];
      const ordered = DAY_COLUMNS.filter(d => days.includes(d));
      const startTime = field === "schedule_time" ? value : prev.schedule_time || "";
      const endTime = field === "schedule_end_time" ? value : prev.schedule_end_time || "";
      const timeStr = startTime ? ` ${startTime}${endTime ? `–${endTime}` : ""}` : "";
      const schedule = ordered.map(d => DAY_LABELS[d].replace("Thứ ", "T")).join(", ") + timeStr;
      return { ...prev, [field]: value, schedule: schedule || prev.schedule };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        teacher_id: form.teacher_id || null,
        schedule: form.schedule || null,
        schedule_days: form.schedule_days?.length ? form.schedule_days : null,
        schedule_time: form.schedule_time || null,
        schedule_end_time: form.schedule_end_time || null,
        room: form.room || null,
        level_in: form.level_in || null,
        level_out: form.level_out || null,
        end_date: form.end_date || null,
      };

      if (modal === "create") {
        const newClass = await createClass(payload);
        toast.success("Tạo lớp thành công!");

        const supabase = createBrowserClient();

        // Enroll selected students
        if (selectedStudentIds.length > 0) {
          const enrollRows = selectedStudentIds.map(sid => ({
            class_id: newClass.id,
            student_id: sid,
            status: "active",
          }));
          const { error: enrollErr } = await supabase.from("enrollments").insert(enrollRows);
          if (enrollErr) toast.error(`Thêm học viên lỗi: ${enrollErr.message}`);
          else toast.success(`Đã thêm ${selectedStudentIds.length} học viên!`);
        }

        // Auto-generate sessions when weekdays + start_date + total_sessions are set
        if (newClass && previewDates.length > 0) {
          setGeneratingSessions(true);
          const sessionRows = previewDates.map((date, i) => ({
            class_id: newClass.id,
            class_name: newClass.name,
            session_no: i + 1,
            session_date: formatDateFull(date),
            session_time: form.schedule_time || null,
            status: "UPCOMING",
          }));
          const { error } = await supabase.from("sessions").insert(sessionRows);
          if (error) {
            toast.error(`Tạo lớp OK nhưng lỗi tạo buổi học: ${error.message}`);
          } else {
            toast.success(`Đã tạo ${previewDates.length} buổi học!`);
          }
          setGeneratingSessions(false);
        }
      } else if (modal === "edit" && selected) {
        await updateClass(selected.id, payload);
        toast.success("Cập nhật lớp thành công!");

        // Sync enrollments: add new, remove dropped
        const supabase = createBrowserClient();
        const { data: existing } = await supabase
          .from("enrollments").select("student_id").eq("class_id", selected.id).eq("status", "active");
        const existingIds = (existing || []).map((e: { student_id: string }) => e.student_id);
        const toAdd = selectedStudentIds.filter((id: string) => !existingIds.includes(id));
        const toRemove = existingIds.filter((id: string) => !selectedStudentIds.includes(id));
        if (toAdd.length > 0) {
          await supabase
            .from("enrollments")
            .insert(toAdd.map((sid: string) => ({ class_id: selected.id, student_id: sid, status: "active" })));
        }
        if (toRemove.length > 0) {
          await supabase.from("enrollments").update({ status: "dropped" }).eq("class_id", selected.id).in("student_id", toRemove);
        }
        if (toAdd.length > 0 || toRemove.length > 0) {
          toast.success(`Đã cập nhật danh sách học viên!`);
        }
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
      await deleteClass(selected.id);
      toast.success("Đã xóa lớp!");
      setModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  // Filtered students for picker
  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.student_code || "").toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Preview: computed session dates for the schedule preview panel
  const previewDates =
    form.schedule_days && form.schedule_days.length > 0 && form.start_date && form.total_sessions > 0
      ? generateSessionDates(form.start_date, form.schedule_days as DayColumn[], form.total_sessions)
      : [];

  return (
    <PageWrapper>
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Quản Lý Lớp Học</h1>
          <p className="page-subtitle">{classes.length} lớp học</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Tạo lớp mới</Button>
      </div>

      {classesError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Lỗi tải danh sách lớp: {classesError}
        </div>
      )}

      <Card>
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <Input placeholder="Tìm lớp học, giáo viên..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
          </div>
          <p className="text-sm text-gray-500">{filtered.length} kết quả</p>
        </div>

        {loading ? (
          <div className="p-4"><SkeletonTable /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Tên lớp</th>
                  <th className="text-left px-4 py-3">Giáo viên</th>
                  <th className="text-left px-4 py-3">Học viên</th>
                  <th className="text-left px-4 py-3">Lịch học</th>
                  <th className="text-left px-4 py-3">Học phí</th>
                  <th className="text-left px-4 py-3">Trạng thái</th>
                  <th className="text-left px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((cls, i) => {
                  const count = cls.enrollments?.[0]?.count ?? 0;
                  return (
                    <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
                            <GraduationCap className="w-4 h-4 text-brand-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 max-w-48 truncate">{cls.name}</p>
                            {cls.class_type === "1on1" && <p className="text-xs text-purple-600">1:1</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{cls.teacher?.full_name || "–"}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-sm text-gray-700">
                          <Users className="w-3.5 h-3.5 text-gray-400" />{count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-40 truncate">{cls.schedule || "–"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{cls.tuition_fee ? `${(cls.tuition_fee / 1_000_000).toFixed(1)}M` : "–"}</td>
                      <td className="px-4 py-3">{statusBadge(cls.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Link by class name so detail page can query classes_current by name */}
                          <Link href={`/admin/classes/${encodeURIComponent(cls.name)}`}>
                            <Button variant="ghost" size="sm">Chi tiết</Button>
                          </Link>
                          <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(cls)} />
                          <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} onClick={() => { setSelected(cls); setModal("delete"); }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Không tìm thấy lớp học nào</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)}
        title={modal === "create" ? "Tạo lớp mới" : "Chỉnh sửa lớp học"}
        size="lg">
        <form onSubmit={handleSave} className="space-y-5">

          {/* ── Section 1: Thông tin cơ bản ── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Thông tin lớp</p>
            <div className="space-y-3">
              <Input
                label="Tên lớp *"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="VD: IELTS Nhóm Band 7.0 – T4/2026"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại lớp</label>
                  <Select value={form.class_type} onChange={e => setForm(p => ({ ...p, class_type: e.target.value as "group"|"1on1" }))} options={TYPE_OPTIONS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Class["status"] }))} options={STATUS_OPTIONS} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giáo viên</label>
                  <select
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.teacher_id || ""}
                    onChange={e => setForm(p => ({ ...p, teacher_id: e.target.value || null }))}
                  >
                    <option value="">– Chưa phân công –</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.profile_code ? `[${t.profile_code}] ` : ""}{t.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input label="Phòng học" value={form.room || ""} onChange={e => setForm(p => ({ ...p, room: e.target.value }))} placeholder="Phòng A1" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Section 2: Lịch học ── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Lịch học &amp; Thời gian</p>
            <div className="space-y-3">

              {/* Weekday picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày học trong tuần
                  <span className="text-xs font-normal text-gray-400 ml-1">(chọn một hoặc nhiều thứ)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAY_COLUMNS.map(day => {
                    const active = (form.schedule_days || []).includes(day);
                    return (
                      <button
                        key={day} type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all select-none ${
                          active
                            ? "bg-brand-600 border-brand-600 text-white shadow-sm"
                            : "border-gray-200 text-gray-500 bg-white hover:border-brand-300 hover:text-brand-600"
                        }`}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time + sessions on same row */}
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Giờ bắt đầu"
                  type="time"
                  value={form.schedule_time || ""}
                  onChange={e => updateTimeFields("schedule_time", e.target.value)}
                />
                <Input
                  label="Giờ kết thúc"
                  type="time"
                  value={form.schedule_end_time || ""}
                  onChange={e => updateTimeFields("schedule_end_time", e.target.value)}
                />
                <Input
                  label="Tổng số buổi *"
                  type="number"
                  min={1}
                  value={form.total_sessions || ""}
                  onChange={e => setForm(p => ({ ...p, total_sessions: Number(e.target.value) }))}
                  placeholder="VD: 30"
                />
              </div>

              {/* Start date */}
              <Input
                label="Ngày khai giảng (buổi đầu tiên)"
                type="date"
                value={form.start_date || ""}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value || null }))}
              />

              {/* Rich schedule preview */}
              {previewDates.length > 0 ? (
                <div className="rounded-xl bg-brand-50 border border-brand-200 p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                    <p className="text-xs font-semibold text-brand-700">Lịch: {form.schedule}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-900">{previewDates.length}</p>
                      <p className="text-xs text-gray-500">buổi học</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-sm font-bold text-gray-900">{formatDateFull(previewDates[0])}</p>
                      <p className="text-xs text-gray-500">buổi đầu</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-sm font-bold text-gray-900">{formatDateFull(previewDates[previewDates.length - 1])}</p>
                      <p className="text-xs text-gray-500">buổi cuối</p>
                    </div>
                  </div>
                  <p className="text-xs text-brand-600">
                    {(form.schedule_days || []).length} buổi/tuần ·{" "}
                    ~{Math.ceil(previewDates.length / (form.schedule_days || []).length)} tuần
                    {form.schedule_time && ` · ${form.schedule_time}${form.schedule_end_time ? `–${form.schedule_end_time}` : ""}`}
                  </p>
                </div>
              ) : (form.schedule_days || []).length > 0 && form.total_sessions > 0 && !form.start_date ? (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  Chọn ngày khai giảng để xem lịch tự động tạo
                </p>
              ) : null}

            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Section 3: Học thuật & Tài chính ── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Học thuật &amp; Học phí</p>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Trình độ đầu vào" value={form.level_in || ""} onChange={e => setForm(p => ({ ...p, level_in: e.target.value }))} placeholder="4.5" />
              <Input label="Mục tiêu đầu ra" value={form.level_out || ""} onChange={e => setForm(p => ({ ...p, level_out: e.target.value }))} placeholder="6.5" />
              <Input label="Học phí (VNĐ)" type="number" value={form.tuition_fee || ""} onChange={e => setForm(p => ({ ...p, tuition_fee: Number(e.target.value) }))} placeholder="8000000" />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Section 4: Học viên ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Học viên
              </p>
              {selectedStudentIds.length > 0 && (
                <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  {selectedStudentIds.length} đã chọn
                </span>
              )}
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm theo mã, tên hoặc email..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-gray-400"
              />
            </div>
            <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-5">
                  {students.length === 0 ? "Chưa có học viên nào trong hệ thống" : "Không tìm thấy học viên"}
                </p>
              ) : (
                filteredStudents.map(s => {
                  const checked = selectedStudentIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? "bg-brand-50" : "hover:bg-gray-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(s.id)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {s.student_code ? `[${s.student_code}] ` : ""}{s.full_name}
                        </p>
                        {s.email && <p className="text-xs text-gray-500 truncate">{s.email}</p>}
                      </div>
                      {checked && <span className="text-brand-500 text-xs font-medium shrink-0">✓</span>}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1 border-t border-gray-100">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(null)}>Hủy</Button>
            <Button type="submit" loading={saving || generatingSessions} className="flex-1">
              {modal === "create"
                ? previewDates.length > 0
                  ? `Tạo lớp + ${previewDates.length} buổi${selectedStudentIds.length > 0 ? ` + ${selectedStudentIds.length} HV` : ""}`
                  : selectedStudentIds.length > 0
                    ? `Tạo lớp + ${selectedStudentIds.length} học viên`
                    : "Tạo lớp"
                : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={modal === "delete"} onClose={() => setModal(null)} title="Xóa lớp học">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Bạn có chắc muốn xóa lớp <strong>{selected?.name}</strong>?
            Tất cả học viên đăng ký sẽ bị xóa theo.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(null)}>Hủy</Button>
            <Button variant="danger" className="flex-1" loading={saving} onClick={handleDelete}>Xóa lớp</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
