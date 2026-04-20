"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { createBrowserClient } from "@/lib/supabase/client";
import { BookOpen, Calendar, CheckCircle, Plus, Users, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { DAY_COLUMNS, DayColumn, generateSessionDates, formatDateFull } from "@/lib/scheduleUtils";
import toast from "react-hot-toast";

interface AssignedClass {
  id: string;
  name: string;
  schedule: string | null;
  total_sessions: number;
  sessions_done: number;
  level_out: string | null;
  status: string | null;
  teacher_name: string | null;
  student_count: number;
}

interface AttendanceRow {
  class_name: string | null;
  session_ref: string | null;
}

interface TeacherOption { id: string; profile_code?: string | null; full_name: string | null; email: string | null; }
interface StudentOption { id: string; student_code?: string | null; full_name: string; email: string | null; }

const DAY_LABELS: Record<DayColumn, string> = {
  T2: "Thứ 2", T3: "Thứ 3", T4: "Thứ 4", T5: "Thứ 5",
  T6: "Thứ 6", T7: "Thứ 7", CN: "Chủ nhật",
};

const EMPTY_FORM = {
  name: "",
  teacher_id: null as string | null,
  schedule: "",
  schedule_days: [] as DayColumn[],
  schedule_time: "",
  schedule_end_time: "",
  room: "",
  level_in: "",
  level_out: "",
  total_sessions: 0,
  start_date: null as string | null,
  tuition_fee: 0,
  status: "upcoming" as const,
  class_type: "group" as "group" | "1on1",
  zoom_link: null as string | null,
};

function statusVariant(status: string | null): "success" | "info" | "warning" | "default" {
  if (status === "active") return "success";
  if (status === "upcoming") return "info";
  if (status === "completed") return "warning";
  return "default";
}

function formatSchedule(days: DayColumn[], time: string, endTime: string): string {
  if (days.length === 0) return "";
  const dayLabels = days.map(d => DAY_LABELS[d]).join(", ");
  if (time) {
    return endTime ? dayLabels + " " + time + "–" + endTime : dayLabels + " " + time;
  }
  return dayLabels;
}

function statusLabel(status: string | null): string {
  if (status === "active") return "Đang học";
  if (status === "upcoming") return "Sắp khai giảng";
  if (status === "completed") return "Đã kết thúc";
  return status || "–";
}

export default function AcademicManagerClassesPage() {
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const supabase = createBrowserClient();

        const { data: assignments, error: assignErr } = await supabase
          .from("academic_manager_class_assignments")
          .select("class_id");

        if (assignErr) {
          if (assignErr.message.includes("does not exist") || assignErr.code === "42P01") {
            setError("Hệ thống đang cập nhật. Vui lòng liên hệ admin để chạy migration database.");
          } else {
            setError(assignErr.message);
          }
          setLoading(false);
          return;
        }

        if (!assignments || assignments.length === 0) {
          setLoading(false);
          return;
        }

        const classIds = assignments.map((a: { class_id: string }) => a.class_id);

        const { data: classData, error: classErr } = await supabase
          .from("classes")
          .select("id, name, schedule, total_sessions, sessions_done, level_out, status, teacher_id, teacher:profiles!teacher_id(full_name)")
          .in("id", classIds)
          .order("name");

        if (classErr) throw new Error(classErr.message);
        if (!classData) { setLoading(false); return; }

        const enrollmentMap: Record<string, number> = {};
        if (classIds.length > 0) {
          const { data: enrollData } = await supabase
            .from("enrollments")
            .select("class_id")
            .in("class_id", classIds)
            .eq("status", "active");
          for (const e of (enrollData || []) as { class_id: string }[]) {
            enrollmentMap[e.class_id] = (enrollmentMap[e.class_id] ?? 0) + 1;
          }
        }

        const taughtMap: Record<string, number> = {};
        const classNames = classData.map((c: { name: string }) => c.name);
        if (classNames.length > 0) {
          // Lấy sessions đã hoàn thành (status = 'DONE') để đếm buổi đã dạy
          const { data: sessionData } = await supabase
            .from("sessions")
            .select("class_name, status")
            .in("class_name", classNames)
            .eq("status", "DONE");

          // Đếm số buổi đã hoàn thành theo class_name
          for (const s of (sessionData || []) as { class_name: string; status: string }[]) {
            taughtMap[s.class_name] = (taughtMap[s.class_name] ?? 0) + 1;
          }
        }

        const result: AssignedClass[] = classData.map((c: {
          id: string; name: string; schedule: string | null;
          total_sessions: number; sessions_done: number; level_out: string | null;
          status: string | null; teacher?: { full_name: string | null } | null;
        }) => ({
          id: c.id,
          name: c.name,
          schedule: c.schedule,
          total_sessions: c.total_sessions ?? 0,
          sessions_done: Math.max(c.sessions_done ?? 0, taughtMap[c.name] ?? 0),
          level_out: c.level_out,
          status: c.status,
          teacher_name: (c.teacher as { full_name: string | null } | null)?.full_name ?? null,
          student_count: enrollmentMap[c.id] ?? 0,
        }));

        setClasses(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi khi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleDay(day: DayColumn) {
    setForm(p => ({
      ...p,
      schedule_days: p.schedule_days.includes(day)
        ? p.schedule_days.filter(d => d !== day)
        : [...p.schedule_days, day],
    }));
  }

  function updateTimeFields(field: "schedule_time" | "schedule_end_time", value: string) {
    setForm(p => ({ ...p, [field]: value }));
  }

  const previewDates =
    form.schedule_days.length > 0 && form.start_date && form.total_sessions > 0
      ? generateSessionDates(form.start_date, form.schedule_days, form.total_sessions)
      : [];

  function openCreateModal() {
    const supabase = createBrowserClient();
    supabase.from("profiles").select("id,profile_code,full_name,email").eq("role", "teacher").order("full_name")
      .then((res: { data: TeacherOption[] | null }) => setTeachers(res.data || []));
    supabase.from("students").select("id,student_code,full_name,email").order("full_name")
      .then((res: { data: StudentOption[] | null }) => setStudents(res.data || []));
    setForm(EMPTY_FORM);
    setSelectedStudentIds([]);
    setCreateModalOpen(true);
  }

  async function handleCreateClass() {
    if (!form.name.trim() || !form.total_sessions) {
      setCreateError("Vui lòng điền tên lớp và tổng số buổi");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const supabase = createBrowserClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Bạn chưa đăng nhập");
      }

      // organization_id có thể null (academic_manager chưa có org)
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      const { data: newClass, error: classErr } = await supabase
        .from("classes")
        .insert({
          name: form.name.trim(),
          teacher_id: form.teacher_id,
          schedule: form.schedule_days.length > 0
            ? formatSchedule(form.schedule_days, form.schedule_time, form.schedule_end_time)
            : form.schedule || null,
          schedule_days: form.schedule_days.length > 0 ? form.schedule_days : null,
          schedule_time: form.schedule_time || null,
          schedule_end_time: form.schedule_end_time || null,
          room: form.room || null,
          level_in: form.level_in || null,
          level_out: form.level_out || null,
          total_sessions: form.total_sessions,
          sessions_done: 0,
          tuition_fee: form.tuition_fee,
          start_date: form.start_date,
          class_type: form.class_type,
          status: form.status,
          zoom_link: form.zoom_link,
          created_by: user.id, // used by RLS policy for enrollments
        })
        .select("id")
        .single();

      if (classErr) throw classErr;
      if (!newClass) throw new Error("Không tạo được lớp");

      // Also add selected students to class (if INSERT policy allows)
      if (selectedStudentIds.length > 0) {
        const { error: enrollErr } = await supabase.from("enrollments").insert(
          selectedStudentIds.map(student_id => ({
            student_id,
            class_id: newClass.id,
            status: "active",
          }))
        );
        if (enrollErr) {
          console.error("[enrollments ERROR]", enrollErr);
          toast.error("Tạo lớp OK nhưng lỗi thêm học viên: " + enrollErr.message);
        }
      }

      // Auto-create sessions if schedule_days + start_date + total_sessions are set
      if (previewDates.length > 0) {
        const sessionRows = previewDates.map((date, i) => ({
          class_name: form.name.trim(),
          class_id: newClass.id,
          session_no: i + 1,
          session_date: formatDateFull(date),
          session_time: form.schedule_time || null,
          status: "UPCOMING",
          zoom_link: form.zoom_link || null,
        }));
        const { error: sessionsErr } = await supabase.from("sessions").insert(sessionRows);
        if (sessionsErr) {
          console.error("[sessions ERROR]", sessionsErr);
          toast.error("Tạo lớp OK nhưng lỗi tạo buổi học: " + sessionsErr.message);
        } else {
          toast.success(`Đã tạo ${previewDates.length} buổi học!`);
        }
      }

      if (user) {
        const { error: assignErr } = await supabase
          .from("academic_manager_class_assignments")
          .insert({ class_id: newClass.id, manager_user_id: user.id });
        if (assignErr) {
          console.error("[assignment ERROR]", assignErr);
        }
      }

      // Update local state instead of page reload
      setCreateModalOpen(false);
      setForm(EMPTY_FORM);
      setSelectedStudentIds([]);
      // Add the new class to the list immediately
      setClasses(prev => [...prev, {
        id: newClass.id,
        name: form.name.trim(),
        schedule: form.schedule_days.length > 0
          ? formatSchedule(form.schedule_days, form.schedule_time, form.schedule_end_time)
          : form.schedule || null,
        total_sessions: form.total_sessions,
        sessions_done: 0,
        level_out: form.level_out || null,
        status: form.status,
        teacher_name: teachers.find(t => t.id === form.teacher_id)?.full_name || null,
        student_count: selectedStudentIds.length,
      }]);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setCreating(false);
    }
  }

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.student_code || "").toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Lớp Của Tôi</h1>
            <p className="page-subtitle">Danh sách lớp học bạn được phân công quản lý</p>
          </div>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
            Tạo lớp mới
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-5 mb-4 bg-red-50 border border-red-200">
          <p className="text-red-700 text-sm font-medium">Lỗi tải danh sách lớp</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <p className="text-red-500 text-xs mt-2">
            Nếu thấy lỗi &quot;does not exist&quot;, bạn cần chạy migration SQL trong Supabase Dashboard → SQL Editor → chạy file
            <code className="bg-red-100 px-1 rounded mx-1">web/supabase/migrations/013_academic_manager.sql</code>
          </p>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !error && classes.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-base font-medium">Chưa có lớp nào được phân công cho bạn</p>
          <p className="text-gray-400 text-sm mt-1">Admin sẽ gán lớp học tương ứng cho tài khoản của bạn</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {classes.map(cls => {
            const progress = (cls.total_sessions ?? 0) > 0
              ? Math.round(((cls.sessions_done ?? 0) / (cls.total_sessions ?? 0)) * 100)
              : 0;
            return (
              <Link key={cls.id} href={`/academic-manager/classes/${cls.id}`}>
                <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 leading-tight truncate">{cls.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{cls.teacher_name || "Chưa có giảng viên"}</p>
                    </div>
                    <Badge variant={statusVariant(cls.status)}>{statusLabel(cls.status)}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{cls.schedule || "–"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{cls.student_count} học viên</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{cls.sessions_done}/{cls.total_sessions} buổi</span>
                    </div>
                    {cls.level_out && (
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{cls.level_out}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Tiến độ</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Modal tạo lớp mới */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tạo Lớp Mới"
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreateClass(); }} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">

          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {createError}
            </div>
          )}

          {/* ── Section 1: Thông tin lớp ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-brand-500" />
              <h3 className="text-sm font-bold text-gray-800">Thông tin lớp</h3>
            </div>
            <div className="bg-gray-50/70 rounded-xl p-4 space-y-3 border border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tên lớp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="VD: IELTS Nhóm Band 7.0 – T4/2026"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Loại lớp</label>
                  <select
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                    value={form.class_type}
                    onChange={e => setForm(p => ({ ...p, class_type: e.target.value as "group" | "1on1" }))}
                  >
                    <option value="group">Nhóm</option>
                    <option value="1on1">1:1</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Trạng thái</label>
                  <select
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value as typeof form.status }))}
                  >
                    <option value="upcoming">Sắp khai giảng</option>
                    <option value="active">Đang học</option>
                    <option value="completed">Kết thúc</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Giáo viên</label>
                  <select
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phòng học</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                    placeholder="Phòng A1"
                    value={form.room}
                    onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Lịch học & Thời gian ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-amber-500" />
              <h3 className="text-sm font-bold text-gray-800">Lịch học & Thời gian</h3>
            </div>
            <div className="bg-gray-50/70 rounded-xl p-4 space-y-4 border border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày học trong tuần
                  <span className="text-xs font-normal text-gray-400 ml-1.5">(chọn một hoặc nhiều thứ)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAY_COLUMNS.map(day => {
                    const active = form.schedule_days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border-2 transition-all select-none ${
                          active
                            ? "bg-brand-600 border-brand-600 text-white shadow-sm shadow-brand-200"
                            : "border-gray-200 text-gray-500 bg-white hover:border-brand-300 hover:text-brand-600 hover:shadow-sm"
                        }`}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Giờ bắt đầu</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                    value={form.schedule_time}
                    onChange={e => updateTimeFields("schedule_time", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Giờ kết thúc</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                    value={form.schedule_end_time}
                    onChange={e => updateTimeFields("schedule_end_time", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tổng số buổi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                    placeholder="VD: 30"
                    min={1}
                    value={form.total_sessions || ""}
                    onChange={e => setForm(p => ({ ...p, total_sessions: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày khai giảng (buổi đầu tiên)</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                  value={form.start_date || ""}
                  onChange={e => setForm(p => ({ ...p, start_date: e.target.value || null }))}
                />
              </div>

              {/* Rich schedule preview */}
              {previewDates.length > 0 ? (
                <div className="rounded-xl bg-brand-50 border-2 border-brand-200 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    <p className="text-xs font-bold text-brand-700">
                      {formatSchedule(form.schedule_days, form.schedule_time, form.schedule_end_time)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white rounded-lg p-2.5 border border-brand-100">
                      <p className="text-xl font-black text-gray-900">{previewDates.length}</p>
                      <p className="text-xs text-gray-500 font-medium">buổi học</p>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 border border-brand-100">
                      <p className="text-xs font-black text-gray-900 leading-tight">{formatDateFull(previewDates[0])}</p>
                      <p className="text-xs text-gray-500 font-medium">buổi đầu</p>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 border border-brand-100">
                      <p className="text-xs font-black text-gray-900 leading-tight">{formatDateFull(previewDates[previewDates.length - 1])}</p>
                      <p className="text-xs text-gray-500 font-medium">buổi cuối</p>
                    </div>
                  </div>
                  <p className="text-xs text-brand-600 font-medium">
                    {form.schedule_days.length} buổi/tuần
                    ~{Math.ceil(previewDates.length / form.schedule_days.length)} tuần
                    {form.schedule_time && (" " + form.schedule_time + (form.schedule_end_time ? String.fromCharCode(8209) + form.schedule_end_time : ""))}
                  </p>
                </div>
              ) : form.schedule_days.length > 0 && form.total_sessions > 0 && !form.start_date ? (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-2.5">
                  <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-amber-700 font-medium">Chọn ngày khai giảng để xem lịch tự động tạo</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Section 3: Học thuật & Học phí ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-bold text-gray-800">Học thuật & Học phí</h3>
            </div>
            <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Trình độ đầu vào</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                    placeholder="VD: 4.5"
                    value={form.level_in}
                    onChange={e => setForm(p => ({ ...p, level_in: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mục tiêu đầu ra</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                    placeholder="VD: 6.5"
                    value={form.level_out}
                    onChange={e => setForm(p => ({ ...p, level_out: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Học phí (VNĐ)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                    placeholder="VD: 8.000.000"
                    value={form.tuition_fee || ""}
                    onChange={e => setForm(p => ({ ...p, tuition_fee: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 4: Zoom & Liên kết ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-sky-500" />
              <h3 className="text-sm font-bold text-gray-800">Zoom & Liên kết</h3>
            </div>
            <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Link Zoom buổi học</label>
              <input
                type="url"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                placeholder="https://zoom.us/j/..."
                value={form.zoom_link || ""}
                onChange={e => setForm(p => ({ ...p, zoom_link: e.target.value || null }))}
              />
              <p className="text-xs text-gray-400 mt-1">Chia sẻ link Zoom cho học viên tham gia lớp học online</p>
            </div>
          </div>

          {/* ── Section 5: Học viên ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-purple-500" />
              <h3 className="text-sm font-bold text-gray-800">Học viên</h3>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã, tên hoặc email..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 placeholder:text-gray-400 transition-colors"
                  />
                </div>
                {selectedStudentIds.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-full">
                    {selectedStudentIds.length} đã chọn
                  </span>
                )}
              </div>
              <div className="max-h-52 overflow-y-auto rounded-xl border-2 border-gray-200 bg-white divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                      <Users className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      {students.length === 0 ? "Chưa có học viên nào trong hệ thống" : "Không tìm thấy học viên phù hợp"}
                    </p>
                  </div>
                ) : (
                  filteredStudents.map(s => {
                    const checked = selectedStudentIds.includes(s.id);
                    const initials = s.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                    const hue = (s.full_name.charCodeAt(0) * 37 + s.full_name.charCodeAt(1) * 13) % 360;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStudentIds(prev =>
                          prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                        )}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                          checked ? "bg-brand-50 border-l-2 border-l-brand-500" : "hover:bg-gray-50"
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black text-white shadow-sm"
                          style={{ background: `hsl(${hue}, 55%, 50%)` }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name}</p>
                            {s.student_code && (
                              <span className="inline-block text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 shrink-0">
                                {s.student_code}
                              </span>
                            )}
                          </div>
                          {s.email && <p className="text-xs text-gray-400 truncate">{s.email}</p>}
                        </div>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                          checked ? "bg-brand-600 border-brand-600" : "border-gray-300 bg-white"
                        }`}>
                          {checked && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t-2 border-gray-100">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setCreateModalOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              loading={creating}
              className="flex-1 font-semibold shadow-sm shadow-brand-200"
            >
              {previewDates.length > 0
                ? `Tạo lớp + ${previewDates.length} buổi${selectedStudentIds.length > 0 ? ` + ${selectedStudentIds.length} HV` : ""}`
                : selectedStudentIds.length > 0
                  ? `Tạo lớp + ${selectedStudentIds.length} học viên`
                  : "Tạo lớp"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
