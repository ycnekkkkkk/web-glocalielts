"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createBrowserClient } from "@/lib/supabase/client";
import { BookOpen, Calendar, CheckCircle, Plus, Users, Search, DollarSign, Pencil } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import { DAY_COLUMNS, DayColumn, generateSessionDates, formatDateFull, getDayColumn, parseSessionDate } from "@/lib/scheduleUtils";
import toast from "react-hot-toast";

// New Components
import ScheduleItem from "@/components/classes/ScheduleItem";
import StudentTag from "@/components/classes/StudentTag";
import StudentFeeCard from "@/components/classes/StudentFeeCard";

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

interface StudentEnrollment {
  student_id: string;
  full_name: string;
  student_code?: string | null;
  email?: string | null;
  level_in: string;
  level_out: string;
  tuition_fee: number;
  paid_fee: number;
}

interface ClassScheduleItem {
  day: DayColumn;
  startTime: string;
  endTime: string;
}

const EMPTY_FORM = {
  name: "",
  teacher_id: null as string | null,
  teacher_salary_per_hour: null as number | null,
  schedules: [] as ClassScheduleItem[],
  total_sessions: 0,
  start_date: null as string | null,
  status: "upcoming" as const,
  class_type: "group" as "group" | "1on1",
  zoom_link: null as string | null,
  default_level_in: "",
  default_level_out: "",
  default_tuition_fee: 0,
};

function statusVariant(status: string | null): "success" | "info" | "warning" | "default" {
  if (status === "active") return "success";
  if (status === "upcoming") return "info";
  if (status === "completed") return "warning";
  return "default";
}

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
}

function formatSchedule(schedules: ClassScheduleItem[]): string {
  if (schedules.length === 0) return "";
  return schedules
    .map(s => {
      const label = DAY_LABELS[s.day];
      if (s.startTime && s.endTime) {
        return `${label} ${s.startTime}–${s.endTime}`;
      }
      return label;
    })
    .join(", ");
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
  const [editingClass, setEditingClass] = useState<AssignedClass | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [selectedStudents, setSelectedStudents] = useState<StudentEnrollment[]>([]);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
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

  // Handle class type change: if 1on1, keep only the first student
  useEffect(() => {
    if (form.class_type === "1on1" && selectedStudents.length > 1) {
      setSelectedStudents(prev => prev.slice(0, 1));
      toast.error("Đã chuyển về lớp 1:1 (chỉ giữ lại 1 học viên)");
    }
  }, [form.class_type, selectedStudents.length]);

  function toggleDay(day: DayColumn) {
    setForm(p => {
      const exists = p.schedules.find(s => s.day === day);
      if (exists) {
        return { ...p, schedules: p.schedules.filter(s => s.day !== day) };
      }
      return {
        ...p,
        schedules: [...p.schedules, { day, startTime: "18:00", endTime: "20:00" }].sort(
          (a, b) => DAY_COLUMNS.indexOf(a.day) - DAY_COLUMNS.indexOf(b.day)
        ),
      };
    });
  }

  function updateDaySchedule(day: DayColumn, field: "startTime" | "endTime", value: string) {
    setForm(p => ({
      ...p,
      schedules: p.schedules.map(s => s.day === day ? { ...s, [field]: value } : s),
    }));
  }

  const previewDates = useMemo(() => {
    if (form.schedules.length === 0 || !form.start_date || form.total_sessions <= 0) return [];
    return generateSessionDates(form.start_date, form.schedules.map(s => s.day), form.total_sessions);
  }, [form.schedules, form.start_date, form.total_sessions]);

  const classFeeSummary = useMemo(() => {
    const total = selectedStudents.reduce((acc, s) => acc + s.tuition_fee, 0);
    const paid = selectedStudents.reduce((acc, s) => acc + s.paid_fee, 0);
    return { total, paid, remaining: total - paid };
  }, [selectedStudents]);

  function openCreateModal() {
    const supabase = createBrowserClient();
    supabase.from("profiles").select("id,profile_code,full_name,email").eq("role", "teacher").order("full_name")
      .then((res: { data: TeacherOption[] | null }) => setTeachers(res.data || []));
    supabase.from("students").select("id,student_code,full_name,email").order("full_name")
      .then((res: { data: StudentOption[] | null }) => setStudents(res.data || []));
    setForm(EMPTY_FORM);
    setSelectedStudents([]);
    setExpandedStudentId(null);
    setCreateModalOpen(true);
  }

  async function handleCreateClass() {
    if (!form.name.trim() || !form.total_sessions) {
      setCreateError("Vui lòng điền tên lớp và tổng số buổi");
      return;
    }
    if (form.schedules.length === 0) {
      setCreateError("Vui lòng chọn ít nhất một ngày học trong tuần");
      return;
    }
    if (selectedStudents.some(s => s.paid_fee > s.tuition_fee)) {
      setCreateError("Có học viên có số tiền đóng lớn hơn học phí. Vui lòng kiểm tra lại.");
      return;
    }
    if (form.class_type === "1on1" && selectedStudents.length > 1) {
      setCreateError("Lớp 1:1 chỉ được có tối đa 1 học viên");
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
          teacher_salary_per_hour: form.teacher_salary_per_hour,
          schedule: formatSchedule(form.schedules),
          schedule_days: form.schedules.map(s => s.day),
          schedule_time: form.schedules[0]?.startTime || null,
          schedule_end_time: form.schedules[0]?.endTime || null,
          total_sessions: form.total_sessions,
          sessions_done: 0,
          tuition_fee: classFeeSummary.total, // sum of all student fees
          start_date: form.start_date,
          class_type: form.class_type,
          status: form.status,
          zoom_link: form.zoom_link,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (classErr) throw classErr;
      if (!newClass) throw new Error("Không tạo được lớp");

      // Add selected students to enrollments with fees and levels
      if (selectedStudents.length > 0) {
        const { error: enrollErr } = await supabase.from("enrollments").insert(
          selectedStudents.map(s => ({
            student_id: s.student_id,
            class_id: newClass.id,
            status: "active",
            level_in: s.level_in || null,
            level_out: s.level_out || null,
            tuition_fee: s.tuition_fee,
            paid_amount: s.paid_fee,
          }))
        );
        if (enrollErr) {
          console.error("[enrollments ERROR]", enrollErr);
          toast.error("Tạo lớp OK nhưng lỗi thêm học viên: " + enrollErr.message);
        }
      }

      // Auto-create sessions with day-specific times
      if (previewDates.length > 0) {
        console.log(`[createClass] previewDates.length=${previewDates.length}, form.total_sessions=${form.total_sessions}`);
        const sessionRows = previewDates.map((date, i) => {
          const col = getDayColumn(date);
          const daySched = form.schedules.find(s => s.day === col);
          return {
            class_name: form.name.trim(),
            class_id: newClass.id,
            session_no: i + 1,
            session_date: formatDateFull(date),
            session_time: daySched?.startTime || null,
            status: "UPCOMING",
            zoom_link: form.zoom_link || null,
          };
        });
        console.log(`[createClass] inserting ${sessionRows.length} sessions`);
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

      // Update local state
      setCreateModalOpen(false);
      setForm(EMPTY_FORM);
      setSelectedStudents([]);
      setExpandedStudentId(null);
      setClasses(prev => [...prev, {
        id: newClass.id,
        name: form.name.trim(),
        schedule: formatSchedule(form.schedules),
        total_sessions: form.total_sessions,
        sessions_done: 0,
        level_out: null, // we don't have a single class level_out anymore
        status: form.status,
        teacher_name: teachers.find(t => t.id === form.teacher_id)?.full_name || null,
        student_count: selectedStudents.length,
      }]);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setCreating(false);
    }
  }

  async function openEditModal(cls: AssignedClass) {
    const supabase = createBrowserClient();
    supabase.from("profiles").select("id,profile_code,full_name,email").eq("role", "teacher").order("full_name")
      .then((res: { data: TeacherOption[] | null }) => setTeachers(res.data || []));
    supabase.from("students").select("id,student_code,full_name,email").order("full_name")
      .then((res: { data: StudentOption[] | null }) => setStudents(res.data || []));

    setCreating(true);
    setCreateError(null);
    try {
      const { data: clsDetails, error } = await supabase
        .from("classes")
        .select("id, name, teacher_id, teacher_salary_per_hour, schedule_days, schedule_time, schedule_end_time, total_sessions, start_date, class_type, status, zoom_link")
        .eq("id", cls.id)
        .single();

      if (error) throw error;
      if (clsDetails) {
        setEditingClass(cls);
        setForm({
          name: clsDetails.name || "",
          teacher_id: clsDetails.teacher_id || null,
          teacher_salary_per_hour: clsDetails.teacher_salary_per_hour || null,
          schedules: (clsDetails.schedule_days || []).map((day: DayColumn) => ({
            day,
            startTime: clsDetails.schedule_time || "18:00",
            endTime: clsDetails.schedule_end_time || "20:00"
          })),
          total_sessions: clsDetails.total_sessions || 0,
          start_date: clsDetails.start_date || null,
          status: (clsDetails.status as typeof form.status) || "upcoming",
          class_type: (clsDetails.class_type as typeof form.class_type) || "group",
          zoom_link: clsDetails.zoom_link || null,
          default_level_in: "",
          default_level_out: "",
          default_tuition_fee: 0,
        });

        // Load enrolled students
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from("enrollments")
          .select("student_id, level_in, level_out, tuition_fee, paid_amount, students:students!inner(id, student_code, full_name, email)")
          .eq("class_id", cls.id)
          .eq("status", "active");

        if (enrollmentsError) {
          console.error("[openEditModal enrollmentsError]", enrollmentsError);
        }

        if (enrollmentsData) {
          const loadedStudents: StudentEnrollment[] = enrollmentsData.map((e: any) => ({
            student_id: e.student_id,
            full_name: e.students?.full_name || "",
            student_code: e.students?.student_code || "",
            email: e.students?.email || "",
            level_in: e.level_in || "",
            level_out: e.level_out || "",
            tuition_fee: e.tuition_fee || 0,
            paid_fee: e.paid_amount || 0,
          }));
          setSelectedStudents(loadedStudents);
        } else {
          setSelectedStudents([]);
        }

        setExpandedStudentId(null);
        setCreateModalOpen(true);
      }
    } catch (err) {
      toast.error("Lỗi khi tải thông tin lớp học!");
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleEditClass() {
    if (!editingClass) return;
    if (!form.name.trim() || !form.total_sessions) {
      setCreateError("Vui lòng điền tên lớp và tổng số buổi");
      return;
    }
    if (form.schedules.length === 0) {
      setCreateError("Vui lòng chọn ít nhất một ngày học trong tuần");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const supabase = createBrowserClient();

      const { error: classErr } = await supabase
        .from("classes")
        .update({
          name: form.name.trim(),
          teacher_id: form.teacher_id,
          teacher_salary_per_hour: form.teacher_salary_per_hour,
          schedule: formatSchedule(form.schedules),
          schedule_days: form.schedules.map(s => s.day),
          schedule_time: form.schedules[0]?.startTime || null,
          schedule_end_time: form.schedules[0]?.endTime || null,
          total_sessions: form.total_sessions,
          start_date: form.start_date,
          class_type: form.class_type,
          status: form.status,
          zoom_link: form.zoom_link,
        })
        .eq("id", editingClass.id);

      if (classErr) throw classErr;

      const oldName = editingClass.name;
      const newName = form.name.trim();

      if (newName !== oldName) {
        // Update class_name in sessions
        await supabase
          .from("sessions")
          .update({ class_name: newName })
          .eq("class_id", editingClass.id);

        // Fetch session IDs of this class to update session_attendance and evaluations
        const { data: classSess } = await supabase
          .from("sessions")
          .select("id")
          .eq("class_id", editingClass.id);

        if (classSess && classSess.length > 0) {
          const sessionIds = classSess.map((s: any) => s.id);

          // Update session_attendance class_name and session_ref
          const { data: saRecords } = await supabase
            .from("session_attendance")
            .select("session_id, student_name, session_ref")
            .in("session_id", sessionIds);

          if (saRecords && saRecords.length > 0) {
            const saPromises = saRecords.map((sa: any) => {
              const suffix = sa.session_ref.startsWith(oldName)
                ? sa.session_ref.substring(oldName.length)
                : sa.session_ref.substring(sa.session_ref.indexOf('#'));
              return supabase
                .from("session_attendance")
                .update({
                  class_name: newName,
                  session_ref: newName + suffix
                })
                .eq("session_id", sa.session_id)
                .eq("student_name", sa.student_name);
            });
            await Promise.all(saPromises);
          }

          // Update session_teacher_evaluation
          await supabase
            .from("session_teacher_evaluation")
            .update({ class_name: newName })
            .eq("class_name", oldName);

          const { data: steRecords } = await supabase
            .from("session_teacher_evaluation")
            .select("id, session_ref")
            .eq("class_name", newName);

          if (steRecords && steRecords.length > 0) {
            const stePromises = steRecords.map((r: any) => {
              const suffix = r.session_ref.startsWith(oldName)
                ? r.session_ref.substring(oldName.length)
                : r.session_ref.substring(r.session_ref.indexOf('#'));
              return supabase
                .from("session_teacher_evaluation")
                .update({ session_ref: newName + suffix })
                .eq("id", r.id);
            });
            await Promise.all(stePromises);
          }

          // Update session_class_evaluation
          await supabase
            .from("session_class_evaluation")
            .update({ class_name: newName })
            .eq("class_name", oldName);

          const { data: sceRecords } = await supabase
            .from("session_class_evaluation")
            .select("id, session_ref")
            .eq("class_name", newName);

          if (sceRecords && sceRecords.length > 0) {
            const scePromises = sceRecords.map((r: any) => {
              const suffix = r.session_ref.startsWith(oldName)
                ? r.session_ref.substring(oldName.length)
                : r.session_ref.substring(r.session_ref.indexOf('#'));
              return supabase
                .from("session_class_evaluation")
                .update({ session_ref: newName + suffix })
                .eq("id", r.id);
            });
            await Promise.all(scePromises);
          }

          // Update session_student_evaluation
          await supabase
            .from("session_student_evaluation")
            .update({ class_name: newName })
            .eq("class_name", oldName);

          const { data: sseRecords } = await supabase
            .from("session_student_evaluation")
            .select("id, session_ref")
            .eq("class_name", newName);

          if (sseRecords && sseRecords.length > 0) {
            const ssePromises = sseRecords.map((r: any) => {
              const suffix = r.session_ref.startsWith(oldName)
                ? r.session_ref.substring(oldName.length)
                : r.session_ref.substring(r.session_ref.indexOf('#'));
              return supabase
                .from("session_student_evaluation")
                .update({ session_ref: newName + suffix })
                .eq("id", r.id);
            });
            await Promise.all(ssePromises);
          }

          // Update attendance_makeup
          const { data: makeupRecords } = await supabase
            .from("attendance_makeup")
            .select("id, session_ref, target_session_ref")
            .or(`session_ref.like.${oldName}#%,target_session_ref.like.${oldName}#%`);

          if (makeupRecords && makeupRecords.length > 0) {
            const amPromises = makeupRecords.map((r: any) => {
              const updateObj: any = {};
              if (r.session_ref && r.session_ref.startsWith(oldName)) {
                const suffix = r.session_ref.substring(oldName.length);
                updateObj.session_ref = newName + suffix;
              }
              if (r.target_session_ref && r.target_session_ref.startsWith(oldName)) {
                const suffix = r.target_session_ref.substring(oldName.length);
                updateObj.target_session_ref = newName + suffix;
              }
              if (Object.keys(updateObj).length > 0) {
                return supabase
                  .from("attendance_makeup")
                  .update(updateObj)
                  .eq("id", r.id);
              }
              return Promise.resolve();
            });
            await Promise.all(amPromises);
          }
        }
      }

      // Sync enrollments
      // 1. Fetch current enrollments from DB
      const { data: existingEnrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", editingClass.id);

      const existingIds = (existingEnrollments || []).map((e: any) => e.student_id);
      const selectedIds = selectedStudents.map(s => s.student_id);

      // 2. Identify students to delete
      const idsToDelete = existingIds.filter((id: string) => !selectedIds.includes(id));
      if (idsToDelete.length > 0) {
        await supabase
          .from("enrollments")
          .delete()
          .eq("class_id", editingClass.id)
          .in("student_id", idsToDelete);
      }

      // 3. Identify students to insert or update
      for (const s of selectedStudents) {
        if (existingIds.includes(s.student_id)) {
          // Update levels / fee if changed
          await supabase
            .from("enrollments")
            .update({
              level_in: s.level_in || null,
              level_out: s.level_out || null,
              tuition_fee: s.tuition_fee,
              paid_amount: s.paid_fee,
            })
            .eq("class_id", editingClass.id)
            .eq("student_id", s.student_id);
        } else {
          // Insert new enrollment
          await supabase
            .from("enrollments")
            .insert({
              student_id: s.student_id,
              class_id: editingClass.id,
              status: "active",
              level_in: s.level_in || null,
              level_out: s.level_out || null,
              tuition_fee: s.tuition_fee,
              paid_amount: s.paid_fee,
            });
        }
      }

      // Update sessions if schedules, start date, or total sessions changed
      const { data: allSessions } = await supabase
        .from("sessions")
        .select("*")
        .eq("class_id", editingClass.id)
        .order("session_no");

      if (allSessions) {
        const pastSessions = allSessions.filter((s: any) => s.status !== "UPCOMING");
        const upcomingSessions = allSessions.filter((s: any) => s.status === "UPCOMING");

        const { data: origClass } = await supabase
          .from("classes")
          .select("schedule_days, schedule_time, start_date, total_sessions")
          .eq("id", editingClass.id)
          .single();

        let scheduleChanged = false;
        if (origClass) {
          const oldSchedules = JSON.stringify(origClass.schedule_days || []);
          const newSchedules = JSON.stringify(form.schedules.map(s => s.day));
          if (oldSchedules !== newSchedules) scheduleChanged = true;

          const oldTime = origClass.schedule_time;
          const newTime = form.schedules[0]?.startTime;
          if (oldTime !== newTime) scheduleChanged = true;

          if (origClass.total_sessions !== form.total_sessions) scheduleChanged = true;
          if (origClass.start_date !== form.start_date) scheduleChanged = true;
        }

        if (scheduleChanged) {
          if (upcomingSessions.length > 0) {
            const upcomingIds = upcomingSessions.map((s: any) => s.id);
            await supabase.from("sessions").delete().in("id", upcomingIds);
          }

          const remainingCount = form.total_sessions - pastSessions.length;
          if (remainingCount > 0 && form.schedules.length > 0) {
            let nextStartDateStr = form.start_date;
            if (pastSessions.length > 0) {
              const sortedPast = [...pastSessions].sort((a, b) => {
                const da = parseSessionDate(a.session_date);
                const db = parseSessionDate(b.session_date);
                if (!da) return 1; if (!db) return -1;
                return da.getTime() - db.getTime();
              });
              const lastSession = sortedPast[sortedPast.length - 1];
              const lastDate = parseSessionDate(lastSession.session_date);
              if (lastDate) {
                lastDate.setDate(lastDate.getDate() + 1);
                nextStartDateStr = lastDate.toISOString().split('T')[0];
              }
            }

            if (nextStartDateStr) {
              const newDates = generateSessionDates(nextStartDateStr, form.schedules.map(s => s.day), remainingCount);
              if (newDates.length > 0) {
                const newSessionRows = newDates.map((date, index) => {
                  const col = getDayColumn(date);
                  const daySched = form.schedules.find(s => s.day === col);
                  return {
                    class_id: editingClass.id,
                    class_name: form.name.trim(),
                    session_no: pastSessions.length + index + 1,
                    session_date: formatDateFull(date),
                    session_time: daySched?.startTime || null,
                    zoom_link: form.zoom_link || null,
                    status: "UPCOMING",
                  };
                });
                await supabase.from("sessions").insert(newSessionRows);
              }
            }
          }
        }
      }

      toast.success("Cập nhật lớp học thành công!");
      
      setClasses(prev => prev.map(c => 
        c.id === editingClass.id 
          ? { 
              ...c, 
              name: form.name.trim(),
              schedule: formatSchedule(form.schedules),
              total_sessions: form.total_sessions,
              status: form.status,
              teacher_name: teachers.find(t => t.id === form.teacher_id)?.full_name || null,
              student_count: selectedStudents.length,
            } 
          : c
      ));

      setCreateModalOpen(false);
      setEditingClass(null);
      setForm(EMPTY_FORM);
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
          <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
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
              <Link key={cls.id} href={`/academic-manager/classes/${encodeURIComponent(cls.name)}`}>
                <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-gray-900 leading-tight truncate flex-1">{cls.name}</h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEditModal(cls);
                          }}
                          className="p-1.5 rounded-lg border border-gray-200 hover:border-brand-300 hover:text-brand-600 bg-white shadow-sm shrink-0 transition-colors"
                          title="Chỉnh sửa lớp học"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{cls.teacher_name || "Chưa có giảng viên"}</p>
                      <div className="mt-2">
                        <Badge variant={statusVariant(cls.status)}>{statusLabel(cls.status)}</Badge>
                      </div>
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
                        className="h-full bg-sky-500 rounded-full transition-all"
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
        onClose={() => { setCreateModalOpen(false); setEditingClass(null); setForm(EMPTY_FORM); }}
        title={editingClass ? "Chỉnh sửa lớp học" : "Tạo Lớp Mới"}
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); if (editingClass) { handleEditClass(); } else { handleCreateClass(); } }} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">

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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Lương GV / giờ (VNĐ)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 text-right font-bold"
                    placeholder="VD: 150.000"
                    value={form.teacher_salary_per_hour ? new Intl.NumberFormat("vi-VN").format(form.teacher_salary_per_hour) : ""}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, "");
                      setForm(p => ({ ...p, teacher_salary_per_hour: Number(val) || null }));
                    }}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {form.teacher_salary_per_hour ? `Sẽ lưu: ${new Intl.NumberFormat("vi-VN").format(form.teacher_salary_per_hour)} VNĐ` : "Lương mỗi giờ dạy"}
                  </p>
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
                    const active = form.schedules.some(s => s.day === day);
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

              {form.schedules.length > 0 && (
                <div className="space-y-3 p-3 bg-white rounded-2xl border-2 border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Giờ học chi tiết</p>
                  <div className="grid grid-cols-1 gap-2">
                    {form.schedules.map(s => (
                      <ScheduleItem
                        key={s.day}
                        day={s.day}
                        label={DAY_LABELS[s.day]}
                        startTime={s.startTime}
                        endTime={s.endTime}
                        onUpdate={(f, v) => updateDaySchedule(s.day, f, v)}
                        onRemove={() => toggleDay(s.day)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày khai giảng (buổi đầu tiên)</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                    value={form.start_date || ""}
                    onChange={e => setForm(p => ({ ...p, start_date: e.target.value || null }))}
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

              {/* Rich schedule preview */}
              {previewDates.length > 0 ? (
                <div className="rounded-xl bg-brand-50 border-2 border-brand-200 p-4 space-y-3">
                  {previewDates.length !== form.total_sessions && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 mb-2">
                      <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-xs text-red-700 font-medium">
                        Chỉ tạo được {previewDates.length}/{form.total_sessions} buổi (thiếu {form.total_sessions - previewDates.length} buổi). Nguyên nhân: ngày khai giảng hoặc ngày nghỉ lễ trùng lịch học.
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    <p className="text-xs font-bold text-brand-700">
                      {formatSchedule(form.schedules)}
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
                    {form.schedules.length} buổi/tuần ·
                    ~{Math.ceil(previewDates.length / form.schedules.length)} tuần
                  </p>
                </div>
              ) : form.schedules.length > 0 && form.total_sessions > 0 && !form.start_date ? (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-2.5">
                  <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-amber-700 font-medium">Chọn ngày khai giảng và lịch học để xem lịch tự động</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Section 3: Cấu hình mặc định ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-bold text-gray-800">Cấu hình học phí & Trình độ mặc định</h3>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100">
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Trình độ đầu vào"
                  value={form.default_level_in}
                  onChange={e => setForm(p => ({ ...p, default_level_in: e.target.value }))}
                  placeholder="VD: 4.5"
                  className="bg-white"
                />
                <Input
                  label="Mục tiêu đầu ra"
                  value={form.default_level_out}
                  onChange={e => setForm(p => ({ ...p, default_level_out: e.target.value }))}
                  placeholder="VD: 6.5"
                  className="bg-white"
                />
                <Input
                  label="Học phí mặc định"
                  type="number"
                  value={form.default_tuition_fee || ""}
                  onChange={e => setForm(p => ({ ...p, default_tuition_fee: Math.round(Number(e.target.value)) || 0 }))}
                  placeholder="VD: 8000000"
                  className="bg-white"
                  hint={form.default_tuition_fee ? formatVND(form.default_tuition_fee) : "Vui lòng nhập số tiền"}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 italic text-center">
                * Các thông số này sẽ tự động áp dụng khi thêm học viên mới vào danh sách bên dưới.
              </p>
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
              <div className="space-y-4">
                {/* Selected Students Tags */}
                {selectedStudents.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                    {selectedStudents.map(s => (
                      <div key={s.student_id} className="flex flex-col gap-2">
                        <StudentTag
                          fullName={s.full_name}
                          studentCode={s.student_code}
                          isExpanded={expandedStudentId === s.student_id}
                          onToggle={() => setExpandedStudentId(p => p === s.student_id ? null : s.student_id)}
                          onRemove={() => setSelectedStudents(prev => prev.filter(st => st.student_id !== s.student_id))}
                        />
                        {expandedStudentId === s.student_id && (
                          <StudentFeeCard
                            details={{
                              levelIn: s.level_in,
                              levelOut: s.level_out,
                              tuitionFee: s.tuition_fee,
                              paidFee: s.paid_fee
                            }}
                            onUpdate={(f, v) => {
                              const fieldMap: Record<string, string> = {
                                levelIn: "level_in",
                                levelOut: "level_out",
                                tuitionFee: "tuition_fee",
                                paidFee: "paid_fee"
                              };
                              const realField = fieldMap[f] || f;
                              setSelectedStudents(prev => prev.map(st => 
                                st.student_id === s.student_id ? { ...st, [realField]: v } : st
                              ));
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

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
                  {selectedStudents.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-full">
                      {selectedStudents.length} đã chọn
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
                      const checked = selectedStudents.some(st => st.student_id === s.id);
                      const initials = s.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                      const hue = (s.full_name.charCodeAt(0) * 37 + s.full_name.charCodeAt(1) * 13) % 360;
                      
                      const handleToggle = () => {
                        if (checked) {
                          setSelectedStudents(prev => prev.filter(st => st.student_id !== s.id));
                        } else {
                          if (form.class_type === "1on1" && selectedStudents.length >= 1) {
                            toast.error("Lớp 1:1 chỉ được chọn tối đa 1 học viên");
                            return;
                          }
                          const newEnroll: StudentEnrollment = {
                            student_id: s.id,
                            full_name: s.full_name,
                            student_code: s.student_code,
                            email: s.email,
                            level_in: form.default_level_in,
                            level_out: form.default_level_out,
                            tuition_fee: form.default_tuition_fee,
                            paid_fee: 0,
                          };
                          setSelectedStudents(prev => [...prev, newEnroll]);
                          setExpandedStudentId(s.id); // Auto-expand when newly added
                        }
                      };

                      return (
                        <div
                          key={s.id}
                          onClick={handleToggle}
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
            <Button type="button" variant="secondary" className="flex-1" onClick={() => { setCreateModalOpen(false); setEditingClass(null); setForm(EMPTY_FORM); }}>
              Hủy
            </Button>
            <Button
              type="submit"
              loading={creating}
              className="flex-1 font-semibold shadow-sm shadow-brand-200"
            >
              {editingClass 
                ? "Lưu thay đổi" 
                : previewDates.length > 0
                  ? `Tạo lớp + ${previewDates.length} buổi${selectedStudents.length > 0 ? ` + ${selectedStudents.length} HV` : ""}`
                  : selectedStudents.length > 0
                    ? `Tạo lớp + ${selectedStudents.length} học viên`
                    : "Tạo lớp"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
