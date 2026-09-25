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
  DAY_COLUMNS, DayColumn, generateSessionDates, formatDateFull, parseSessionDate, getDayColumn
} from "@/lib/scheduleUtils";
import { Class } from "@/types";
import { 
  GraduationCap, Pencil, Plus, Search, Trash2, Users, 
  CheckCircle2, Clock, XCircle, ArrowRight, BookOpen, UserCheck, 
  Calendar, Layers, Sparkles, DollarSign, LayoutGrid, List
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, Fragment, useRef, useMemo } from "react";
import toast from "react-hot-toast";

// New Components
import ScheduleItem from "@/components/classes/ScheduleItem";
import StudentTag from "@/components/classes/StudentTag";
import StudentFeeCard from "@/components/classes/StudentFeeCard";

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

const DAY_LABELS: Record<DayColumn, string> = {
  T2: "Thứ 2", T3: "Thứ 3", T4: "Thứ 4", T5: "Thứ 5",
  T6: "Thứ 6", T7: "Thứ 7", CN: "Chủ nhật",
};

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    active:    { bg: "bg-emerald-50 border-emerald-200/60", text: "text-emerald-700", dot: "bg-emerald-500", label: "Đang học" },
    upcoming:  { bg: "bg-sky-50 border-sky-200/60",         text: "text-sky-700",     dot: "bg-sky-500",     label: "Sắp tới" },
    completed: { bg: "bg-slate-100 border-slate-200/60",     text: "text-slate-600",   dot: "bg-slate-400",   label: "Kết thúc" },
    cancelled: { bg: "bg-rose-50 border-rose-200/60",       text: "text-rose-700",    dot: "bg-rose-500",    label: "Đã hủy" },
  };
  const m = map[status] || { bg: "bg-slate-100 border-slate-200/60", text: "text-slate-600", dot: "bg-slate-400", label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap shrink-0 ${m.bg} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.dot}`} />
      <span className="whitespace-nowrap">{m.label}</span>
    </span>
  );
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

type FormData = Omit<Class, "id"|"created_at"|"updated_at"|"teacher"|"enrollments"|"schedule_days"|"schedule_time"|"schedule_end_time"|"room"|"level_in"|"level_out"|"tuition_fee"> & { 
  academic_manager_id?: string | null; 
  teacher_salary_per_hour?: number | null; 
  schedules: ClassScheduleItem[];
  default_level_in: string;
  default_level_out: string;
  default_tuition_fee: number;
};

const EMPTY: FormData = {
  organization_id: null, 
  name: "", 
  teacher_id: null, 
  academic_manager_id: null, 
  schedule: "",
  schedules: [],
  teacher_salary_per_hour: null,
  total_sessions: 0, 
  sessions_done: 0,
  start_date: null, 
  end_date: "", 
  status: "active", 
  class_type: "group",
  zoom_link: null, 
  created_by: null,
  default_level_in: "",
  default_level_out: "",
  default_tuition_fee: 0,
};

export default function AdminClassesPage() {
  const { classes, loading, error: classesError, createClass, updateClass, deleteClass } = useClasses();
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [managers, setManagers] = useState<TeacherOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [modal, setModal] = useState<null | "create" | "edit" | "delete">(null);
  const [selected, setSelected] = useState<Class | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [generatingSessions, setGeneratingSessions] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<StudentEnrollment[]>([]);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  // Prevent duplicate session creation within same submit
  const sessionsCreatedRef = useRef(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.from("profiles").select("id,profile_code,full_name,email").eq("role", "teacher").order("full_name")
      .then((res: { data: TeacherOption[] | null; error: unknown }) => {
        if (res.error) console.error("[teachers ERROR]", res.error);
        setTeachers(res.data || []);
      });
    supabase.from("profiles").select("id,profile_code,full_name,email").eq("role", "academic_manager").order("full_name")
      .then((res: { data: TeacherOption[] | null; error: unknown }) => {
        if (res.error) console.error("[managers ERROR]", res.error);
        setManagers(res.data || []);
      });
    supabase.from("students").select("id,student_code,full_name,email").order("full_name")
      .then((res: { data: StudentOption[] | null; error: unknown }) => {
        if (res.error) console.error("[students ERROR]", res.error);
        setStudents(res.data || []);
      });
  }, []);

  async function loadEnrollments(classId: string) {
    const { data, error } = await createBrowserClient()
      .from("enrollments")
      .select("student_id, students(full_name, student_code, email), level_in, level_out, tuition_fee, paid_amount")
      .eq("class_id", classId)
      .eq("status", "active");
    
    if (error) {
      console.error("[loadEnrollments ERROR]", error);
      return;
    }

    setSelectedStudents((data || []).map((e: any) => ({
      student_id: e.student_id,
      full_name: e.students?.full_name || "Unknown",
      student_code: e.students?.student_code,
      email: e.students?.email,
      level_in: e.level_in || "",
      level_out: e.level_out || "",
      tuition_fee: e.tuition_fee || 0,
      paid_fee: e.paid_amount || 0,
    })));
  }

  const stats = useMemo(() => {
    return {
      total: classes.length,
      active: classes.filter(c => c.status === "active").length,
      upcoming: classes.filter(c => c.status === "upcoming").length,
      completed: classes.filter(c => c.status === "completed").length,
      totalStudents: classes.reduce((acc, c) => acc + (c.enrollments?.[0]?.count ?? 0), 0),
    };
  }, [classes]);

  const filtered = useMemo(() => {
    return classes.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.teacher?.full_name || "").toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      return true;
    });
  }, [classes, search, statusFilter]);

  function openCreate() {
    setForm(EMPTY);
    setSelected(null);
    setSelectedStudents([]);
    setExpandedStudentId(null);
    setStudentSearch("");
    sessionsCreatedRef.current = false;
    setModal("create");
  }

  function openEdit(cls: Class) {
    setSelected(cls);
    setForm({
      organization_id: cls.organization_id, 
      name: cls.name, 
      teacher_id: cls.teacher_id, 
      academic_manager_id: null,
      schedule: cls.schedule || "",
      schedules: cls.schedule_days?.map((day: any) => ({
        day: day as DayColumn,
        startTime: cls.schedule_time || "18:00",
        endTime: cls.schedule_end_time || "20:00"
      })) || [],
      teacher_salary_per_hour: cls.teacher_salary_per_hour || null,
      total_sessions: cls.total_sessions, 
      sessions_done: cls.sessions_done,
      start_date: cls.start_date, 
      end_date: cls.end_date || "",
      status: cls.status, 
      class_type: cls.class_type,
      zoom_link: cls.zoom_link, 
      created_by: cls.created_by,
      default_level_in: (cls as any).level_in || "",
      default_level_out: (cls as any).level_out || "",
      default_tuition_fee: (cls as any).tuition_fee || 0,
    });
    setStudentSearch("");
    setSelectedStudents([]);
    setExpandedStudentId(null);
    loadEnrollments(cls.id);
    
    // Load academic manager
    createBrowserClient()
      .from("academic_manager_class_assignments")
      .select("manager_user_id")
      .eq("class_id", cls.id)
      .maybeSingle()
      .then((res: { data: any }) => {
        setForm(prev => ({ ...prev, academic_manager_id: res.data?.manager_user_id || null }));
      });
      
    setModal("edit");
  }

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
    if (!form.schedules?.length || !form.start_date || form.total_sessions <= 0) return [];
    return generateSessionDates(form.start_date, form.schedules.map(s => s.day), form.total_sessions);
  }, [form.schedules, form.start_date, form.total_sessions]);

  const classFeeSummary = useMemo(() => {
    const total = selectedStudents.reduce((acc, s) => acc + s.tuition_fee, 0);
    const paid = selectedStudents.reduce((acc, s) => acc + s.paid_fee, 0);
    return { total, paid, remaining: total - paid };
  }, [selectedStudents]);

  const filteredStudents = useMemo(() => {
    return students.filter(s =>
      s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.student_code || "").toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [students, studentSearch]);

  // Handle class type change: if 1on1, keep only the first student
  useEffect(() => {
    if (form.class_type === "1on1" && selectedStudents.length > 1) {
      setSelectedStudents(prev => prev.slice(0, 1));
      toast.error("Đã chuyển về lớp 1:1 (chỉ giữ lại 1 học viên)");
    }
  }, [form.class_type, selectedStudents.length]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên lớp học");
      return;
    }
    // Prevent double-click / race condition
    if (saving || generatingSessions) return;
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.");
        setSaving(false);
        return;
      }
      console.log("[handleSave] session.user.id:", session.user.id);

      const payload = {
        ...form,
        teacher_id: form.teacher_id || null,
        schedule: formatSchedule(form.schedules),
        schedule_days: form.schedules.length ? form.schedules.map(s => s.day) : null,
        schedule_time: form.schedules[0]?.startTime || null,
        schedule_end_time: form.schedules[0]?.endTime || null,
        teacher_salary_per_hour: form.teacher_salary_per_hour || null,
        tuition_fee: classFeeSummary.total, // sum of student fees
        end_date: form.end_date || null,
        zoom_link: form.zoom_link || null,
      };

      // Remove Room, LevelIn, LevelOut from class-level payload as they are now student-specific
      delete (payload as any).room;
      delete (payload as any).level_in;
      delete (payload as any).level_out;
      delete (payload as any).schedules;

      const academicManagerId = payload.academic_manager_id;
      delete (payload as any).academic_manager_id;
      delete (payload as any).default_level_in;
      delete (payload as any).default_level_out;
      delete (payload as any).default_tuition_fee;

      if (modal === "create") {
        const newClass = await createClass(payload as any).catch((err) => {
          console.error("[createClass ERROR]", err);
          toast.error("Tạo lớp thất bại: " + (err instanceof Error ? err.message : String(err)));
          throw err;
        });
        if (!newClass) return;
        toast.success("Tạo lớp thành công!");

        // ── SYNC: Insert into classes_current (legacy table) ──────────────
        // Get teacher name for classes_current.giao_vien
        let teacherName: string | null = null;
        if (form.teacher_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", form.teacher_id)
            .maybeSingle();
          teacherName = profile?.full_name ?? null;
        }
        const tinhTrang: Record<string, string> = {
          active: "Đang học", upcoming: "Sắp khai giảng",
          completed: "Kết thúc", cancelled: "Đã hủy",
        };
        const statusLabel = tinhTrang[form.status] || form.status;
        const { error: syncErr } = await supabase.from("classes_current").insert({
          ten_lop: newClass.name,
          lich_hoc: form.schedule || null,
          giao_vien: teacherName,
          bat_dau: form.start_date ? new Date(form.start_date + "T00:00:00Z") : null,
          so_buoi: String(form.total_sessions),
          hoc_phi_tong: classFeeSummary.total || null,
          tinh_trang: statusLabel,
          created_at: new Date().toISOString(),
        });
        if (syncErr) {
          console.error("[SYNC classes_current ERROR]", syncErr);
        }

        // Enroll selected students with fees and levels
        if (selectedStudents.length > 0) {
          const enrollRows = selectedStudents.map(s => ({
            class_id: newClass.id,
            student_id: s.student_id,
            status: "active",
            level_in: s.level_in || null,
            level_out: s.level_out || null,
            tuition_fee: s.tuition_fee,
            paid_amount: s.paid_fee,
          }));
          const { data: enrolls, error: enrollErr } = await supabase
            .from("enrollments")
            .upsert(enrollRows, { onConflict: "class_id,student_id" })
            .select("id, student_id, paid_amount");

          if (enrollErr) {
            toast.error(`Thêm học viên lỗi: ${enrollErr.message}`);
          } else {
            // Create payment history records for students who paid initially
            if (enrolls && enrolls.length > 0) {
              const initialPayments = enrolls
                .filter((e: any) => Number(e.paid_amount) > 0)
                .map((e: any) => ({
                  enrollment_id: e.id,
                  amount: e.paid_amount,
                  note: "Nộp phí ban đầu (lúc tạo lớp)"
                }));
              
              if (initialPayments.length > 0) {
                await supabase.from("enrollment_payments").insert(initialPayments);
              }
            }
            toast.success(`Đã thêm ${selectedStudents.length} học viên!`);
          }
        }

        // Auto-generate sessions with day-specific times
        if (newClass && previewDates.length > 0 && !sessionsCreatedRef.current) {
          sessionsCreatedRef.current = true;
          setGeneratingSessions(true);
          console.log(`[createClass] previewDates.length=${previewDates.length}, form.total_sessions=${form.total_sessions}`);
          const sessionRows = previewDates.map((date, i) => {
            const col = getDayColumn(date);
            const daySched = form.schedules.find(s => s.day === col);
            return {
              class_id: newClass.id,
              class_name: newClass.name,
              session_no: i + 1,
              session_date: formatDateFull(date),
              session_time: daySched?.startTime || null,
              zoom_link: form.zoom_link || null,
              status: "UPCOMING",
            };
          });
          console.log(`[createClass] inserting ${sessionRows.length} sessions`);
          const { error } = await supabase.from("sessions").insert(sessionRows);
          if (error) {
            toast.error(`Tạo lớp OK nhưng lỗi tạo buổi học: ${error.message}`);
          } else {
            toast.success(`Đã tạo ${previewDates.length} buổi học!`);
          }
          setGeneratingSessions(false);
        }

        if (academicManagerId) {
          const { error: amErr } = await supabase.from("academic_manager_class_assignments").insert({
            class_id: newClass.id,
            manager_user_id: academicManagerId,
            assigned_by: session.user.id
          });
          if (amErr) console.error("[amca INSERT ERROR]", amErr);
        }

      } else if (modal === "edit" && selected) {
        await updateClass(selected.id, payload as any);
        toast.success("Cập nhật lớp thành công!");

        const oldName = selected.name;
        const newName = form.name.trim();

        if (newName !== oldName) {
          // Update class_name in sessions
          await supabase
            .from("sessions")
            .update({ class_name: newName })
            .eq("class_id", selected.id);

          // Fetch session IDs of this class to update session_attendance and evaluations
          const { data: classSess } = await supabase
            .from("sessions")
            .select("id")
            .eq("class_id", selected.id);

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

        // ── SYNC: Update classes_current (legacy table) ────────────────────
        await supabase.from("academic_manager_class_assignments").delete().eq("class_id", selected.id);
        if (academicManagerId) {
          const { error: amErr } = await supabase.from("academic_manager_class_assignments").insert({
            class_id: selected.id,
            manager_user_id: academicManagerId,
            assigned_by: session.user.id
          });
          if (amErr) console.error("[amca UPDATE ERROR]", amErr);
        }

        let teacherName: string | null = null;
        if (form.teacher_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", form.teacher_id)
            .maybeSingle();
          teacherName = profile?.full_name ?? null;
        }
        const tinhTrang: Record<string, string> = {
          active: "Đang học", upcoming: "Sắp khai giảng",
          completed: "Kết thúc", cancelled: "Đã hủy",
        };
        const statusLabel = tinhTrang[form.status] || form.status;
        await supabase.from("classes_current")
          .update({
            ten_lop: form.name,
            lich_hoc: form.schedule || null,
            giao_vien: teacherName,
            bat_dau: form.start_date ? new Date(form.start_date + "T00:00:00Z") : null,
            so_buoi: String(form.total_sessions),
            hoc_phi_tong: classFeeSummary.total || null,
            tinh_trang: statusLabel,
          })
          .eq("ten_lop", selected.name); // Match by original name (before rename)
        // Sync enrollments
        const { data: existing } = await supabase
          .from("enrollments")
          .select("student_id")
          .eq("class_id", selected.id)
          .eq("status", "active");
        
        const existingIds = (existing || []).map((e: { student_id: string }) => e.student_id);
        const toAdd = selectedStudents.filter(s => !existingIds.includes(s.student_id));
        const toRemove = existingIds.filter((id: string) => !selectedStudents.some(s => s.student_id === id));
        const toUpdate = selectedStudents.filter(s => existingIds.includes(s.student_id));

        if (toAdd.length > 0) {
          await supabase.from("enrollments").insert(
            toAdd.map(s => ({
              class_id: selected.id,
              student_id: s.student_id,
              status: "active",
              level_in: s.level_in || null,
              level_out: s.level_out || null,
              tuition_fee: s.tuition_fee,
              paid_amount: s.paid_fee,
            }))
          );
        }
        if (toUpdate.length > 0) {
          for (const s of toUpdate) {
            await supabase.from("enrollments")
              .update({
                level_in: s.level_in || null,
                level_out: s.level_out || null,
                tuition_fee: s.tuition_fee,
                paid_amount: s.paid_fee,
              })
              .eq("class_id", selected.id)
              .eq("student_id", s.student_id);
          }
        }
        if (toRemove.length > 0) {
          await supabase.from("enrollments")
            .update({ status: "dropped" })
            .eq("class_id", selected.id)
            .in("student_id", toRemove);
        }
        if (toAdd.length > 0 || toRemove.length > 0 || toUpdate.length > 0) {
          toast.success(`Đã cập nhật danh sách học viên!`);
        }

        // Update zoom_link for all sessions of this class
        if (form.zoom_link !== selected.zoom_link) {
          const { error: zoomErr } = await supabase
            .from("sessions")
            .update({ zoom_link: form.zoom_link || null })
            .eq("class_id", selected.id);
          if (zoomErr) {
            console.error("[Update zoom_link ERROR]", zoomErr);
          }
        }

        // --- Cập nhật lại lịch học cho các buổi CHƯA HỌC (UPCOMING) ---
        const { data: allSessions } = await supabase.from("sessions").select("*").eq("class_id", selected.id).order("session_no");
        if (allSessions) {
          const pastSessions = allSessions.filter((s: any) => s.status !== "UPCOMING");
          const upcomingSessions = allSessions.filter((s: any) => s.status === "UPCOMING");
          
          let scheduleChanged = false;
          // check if schedules changed
          const oldSchedules = JSON.stringify(selected.schedule_days || []);
          const newSchedules = JSON.stringify(form.schedules.map(s => s.day));
          if (oldSchedules !== newSchedules) scheduleChanged = true;
          
          // check if times changed (simplified check: compare first day's time or whole array)
          const oldTime = selected.schedule_time;
          const newTime = form.schedules[0]?.startTime;
          if (oldTime !== newTime) scheduleChanged = true;

          // check if total_sessions changed
          if (selected.total_sessions !== form.total_sessions) scheduleChanged = true;
          // check if start_date changed
          if (selected.start_date !== form.start_date) scheduleChanged = true;
          
          if (scheduleChanged) {
            // Xóa tất cả các buổi chưa học
            if (upcomingSessions.length > 0) {
              const upcomingIds = upcomingSessions.map((s: any) => s.id);
              await supabase.from("sessions").delete().in("id", upcomingIds);
            }
            
            // Generate new sessions
            const remainingCount = form.total_sessions - pastSessions.length;
            if (remainingCount > 0 && form.schedules.length > 0) {
              let nextStartDateStr = form.start_date;
              if (pastSessions.length > 0) {
                // Sắp xếp lại pastSessions theo ngày để lấy ngày lớn nhất
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
                      class_id: selected.id,
                      class_name: form.name,
                      session_no: pastSessions.length + index + 1,
                      session_date: formatDateFull(date),
                      session_time: daySched?.startTime || null,
                      zoom_link: form.zoom_link || null,
                      status: "UPCOMING",
                    };
                  });
                  await supabase.from("sessions").insert(newSessionRows);
                  toast.success(`Đã cập nhật lại lịch cho ${remainingCount} buổi chưa học!`);
                }
              }
            }
          }
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


  return (
    <PageWrapper>
      {/* ── Page Header: Compact title & primary action ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý lớp học</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              {classes.length} lớp
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi danh sách lớp học, phân công giáo viên, lịch học và tiến độ đào tạo
          </p>
        </div>

        <Button 
          variant="primary"
          onClick={openCreate}
          icon={<Plus className="w-4 h-4" />}
          className="rounded-xl text-xs font-semibold px-4 py-2 shadow-sm bg-brand-600 hover:bg-brand-700"
        >
          Tạo lớp mới
        </Button>
      </div>

      {/* ── Metrics Strip: Low-profile stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-3 flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-400 truncate">Tổng lớp học</p>
            <p className="text-lg font-bold text-slate-900 leading-tight">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-3 flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-400 truncate">Đang học</p>
            <p className="text-lg font-bold text-emerald-600 leading-tight">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-3 flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-400 truncate">Sắp khai giảng</p>
            <p className="text-lg font-bold text-sky-600 leading-tight">{stats.upcoming}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-3 flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-400 truncate">Tổng học viên</p>
            <p className="text-lg font-bold text-slate-900 leading-tight">{stats.totalStudents}</p>
          </div>
        </div>
      </div>

      {classesError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Lỗi tải danh sách lớp: {classesError}
        </div>
      )}

      {/* ── Control Toolbar: Search + Quick Status Filter Tabs + View Mode Toggle ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        {/* Left: Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm tên lớp, giáo viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-brand-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Center / Right: Status Filter Tabs + View Switcher */}
        <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">
          {/* Status Pills */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5">
            {[
              { key: "all", label: "Tất cả", count: stats.total },
              { key: "active", label: "Đang học", count: stats.active },
              { key: "upcoming", label: "Sắp tới", count: stats.upcoming },
              { key: "completed", label: "Kết thúc", count: stats.completed },
            ].map((tab) => {
              const isSelected = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-brand-600 text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1 rounded-full ${
                      isSelected
                        ? "bg-brand-700 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-200 shrink-0 hidden sm:block mx-1" />

          {/* View Mode Toggle: Grid vs Table */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="Dạng lưới thẻ"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="Dạng bảng danh sách"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content: Compact Grid or Dense Table ── */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6">
          <SkeletonTable />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 text-center py-16 px-4">
          <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Không tìm thấy lớp học</h3>
          <p className="text-slate-400 mt-1 text-xs max-w-xs mx-auto">
            Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filtered.map((cls) => {
            const count = cls.enrollments?.[0]?.count ?? 0;
            const pct = cls.total_sessions ? Math.round(((cls.sessions_done || 0) / cls.total_sessions) * 100) : 0;

            return (
              <div
                key={cls.id}
                className="bg-white rounded-xl border border-slate-200/80 p-3.5 hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {statusBadge(cls.status)}
                      {cls.class_type === "1on1" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 leading-none">
                          1:1
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                      {cls.sessions_done || 0}/{cls.total_sessions || 0} buổi
                    </span>
                  </div>

                  {/* Class Title */}
                  <Link
                    href={`/admin/classes/${encodeURIComponent(cls.name)}`}
                    className="block font-bold text-slate-900 text-sm hover:text-brand-600 transition-colors line-clamp-1 mb-2.5"
                    title={cls.name}
                  >
                    {cls.name}
                  </Link>

                  {/* Compact Metadata Box */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium text-slate-700" title={cls.teacher?.full_name || "Chưa có GV"}>
                        {cls.teacher?.full_name || "(Chưa có GV)"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-500" title={cls.schedule || "Chưa có lịch"}>
                        {cls.schedule || "Chưa có lịch"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-slate-500">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{count} học viên</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">{pct}%</span>
                    </div>

                    <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-brand-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action Row */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                  <Link
                    href={`/admin/classes/${encodeURIComponent(cls.name)}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    <span>Xem chi tiết</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(cls)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                      title="Chỉnh sửa lớp"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelected(cls); setModal("delete"); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Xóa lớp"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs min-w-[840px] border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[180px]">Tên lớp</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[120px]">Trạng thái</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[140px]">Giáo viên</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[80px]">Học viên</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[180px]">Lịch học</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[120px]">Tiến độ</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap min-w-[120px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((cls) => {
                  const count = cls.enrollments?.[0]?.count ?? 0;
                  const pct = cls.total_sessions ? Math.round(((cls.sessions_done || 0) / cls.total_sessions) * 100) : 0;
                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Link
                          href={`/admin/classes/${encodeURIComponent(cls.name)}`}
                          className="font-bold text-slate-900 hover:text-brand-600 transition-colors inline-block"
                        >
                          {cls.name}
                        </Link>
                        {cls.class_type === "1on1" && (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 inline-block align-middle">
                            1:1
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">{statusBadge(cls.status)}</td>
                      <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                        {cls.teacher?.full_name || "(Chưa có GV)"}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{count} HV</td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap" title={cls.schedule || ""}>
                        {cls.schedule || "—"}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 font-medium shrink-0 whitespace-nowrap">
                            {cls.sessions_done || 0}/{cls.total_sessions || 0}
                          </span>
                          <div className="w-14 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                            <div className="bg-brand-600 h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                          <Link
                            href={`/admin/classes/${encodeURIComponent(cls.name)}`}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-600 hover:bg-brand-50 transition-colors inline-flex items-center whitespace-nowrap"
                          >
                            Chi tiết
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(cls)}
                            className="p-1 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelected(cls); setModal("delete"); }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)}
        title={modal === "create" ? "Tạo lớp mới" : "Chỉnh sửa lớp học"}
        size="lg">
        <form onSubmit={handleSave} className="space-y-6">

          {/* ── Section 1: Thông tin cơ bản ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-brand-500" />
              <h3 className="text-sm font-bold text-gray-800">Thông tin lớp</h3>
            </div>
            <div className="bg-gray-50/70 rounded-xl p-4 space-y-3 border border-gray-100">
              <Input
                label="Tên lớp"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="VD: IELTS Nhóm Band 7.0 – T4/2026"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Loại lớp</label>
                  <Select value={form.class_type} onChange={e => setForm(p => ({ ...p, class_type: e.target.value as "group"|"1on1" }))} options={TYPE_OPTIONS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Trạng thái</label>
                  <Select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Class["status"] }))} options={STATUS_OPTIONS} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Giáo viên</label>
                  <select
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Học vụ (Academic Manager)</label>
                  <select
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors"
                    value={form.academic_manager_id || ""}
                    onChange={e => setForm(p => ({ ...p, academic_manager_id: e.target.value || null }))}
                  >
                    <option value="">– Chưa phân công –</option>
                    {managers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.profile_code ? `[${t.profile_code}] ` : ""}{t.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Lương GV / giờ (VNĐ)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.teacher_salary_per_hour ? new Intl.NumberFormat("vi-VN").format(form.teacher_salary_per_hour) : ""}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, "");
                      setForm(p => ({ ...p, teacher_salary_per_hour: Number(val) || null }));
                    }}
                    placeholder="VD: 150.000"
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors text-right font-bold"
                  />
                  <p className="text-[10px] text-gray-400 ml-1">
                    {form.teacher_salary_per_hour ? `Sẽ lưu: ${new Intl.NumberFormat("vi-VN").format(form.teacher_salary_per_hour)} VNĐ` : "Nhập số tiền lương mỗi giờ"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-amber-500" />
              <h3 className="text-sm font-bold text-gray-800">Lịch học & Thời gian</h3>
            </div>
            <div className="bg-gray-50/70 rounded-xl p-4 space-y-4 border border-gray-100">
              {modal === "edit" && form.sessions_done > 0 && (
                <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-200/60 p-4 shadow-sm">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 self-start">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-amber-900 uppercase tracking-wide">💡 Lưu ý cập nhật lịch học</p>
                    <p className="text-xs text-amber-700 leading-relaxed font-semibold">
                      Lớp học này đã hoàn thành <span className="font-black text-amber-900 underline">{form.sessions_done} buổi</span> học trước đó.
                    </p>
                    <ul className="list-disc list-inside text-[11px] text-amber-800/80 space-y-1.5 pl-1 font-medium">
                      <li>Các buổi học đã học ({form.sessions_done} buổi) sẽ được <span className="font-bold text-amber-900">giữ nguyên tuyệt đối</span> lịch sử và thông tin điểm danh.</li>
                      <li>Chỉ có <span className="font-bold text-amber-900">{Math.max(0, form.total_sessions - form.sessions_done)} buổi học chưa học còn lại</span> mới được dời và sắp xếp lại theo lịch học mới.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Weekday picker */}
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
                        key={day} type="button"
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

              {/* Time + sessions on same row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày khai giảng</label>
                  <Input
                    type="date"
                    value={form.start_date || ""}
                    onChange={e => setForm(p => ({ ...p, start_date: e.target.value || null }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tổng số buổi</label>
                  <Input
                    type="number"
                    value={form.total_sessions || ""}
                    onChange={e => setForm(p => ({ ...p, total_sessions: Number(e.target.value) || 0 }))}
                    placeholder="VD: 30"
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
                    <p className="text-xs font-bold text-brand-700">{formatSchedule(form.schedules)}</p>
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
                  <p className="text-xs text-amber-700 font-medium">Chọn ngày khai giảng để xem lịch tự động tạo</p>
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
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Học phí mặc định (VNĐ)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.default_tuition_fee ? new Intl.NumberFormat("vi-VN").format(form.default_tuition_fee) : ""}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, "");
                      setForm(p => ({ ...p, default_tuition_fee: Number(val) || 0 }));
                    }}
                    placeholder="VD: 8.000.000"
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors text-right font-bold"
                  />
                  {form.default_tuition_fee > 0 && (
                    <p className="text-[10px] text-gray-400 ml-1">
                      Mức phí này sẽ được áp dụng cho mỗi học viên mới được thêm
                    </p>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 italic text-center">
                * Các thông số này sẽ tự động áp dụng khi thêm học viên mới vào danh sách bên dưới.
              </p>
            </div>
          </div>

          {/* ── Section 3b: Zoom & Liên kết ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-sky-500" />
              <h3 className="text-sm font-bold text-gray-800">Zoom & Liên kết</h3>
            </div>
            <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100">
              <Input
                label="Link Zoom buổi học"
                value={form.zoom_link || ""}
                onChange={e => setForm(p => ({ ...p, zoom_link: e.target.value || null }))}
                placeholder="https://zoom.us/j/..."
                hint="Chia sẻ link Zoom cho học viên tham gia lớp học online"
              />
            </div>
          </div>

          {/* ── Section 4: Học viên ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-sky-500" />
              <h3 className="text-sm font-bold text-gray-800">Học viên</h3>
            </div>
            
            {/* Selected Students Tags */}
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                {selectedStudents.map(s => (
                  <div key={s.student_id} className="flex flex-col gap-2 w-full">
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
            <div className="max-h-60 overflow-y-auto rounded-xl border-2 border-gray-200 bg-white divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Không tìm thấy học viên phù hợp</p>
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
                      setExpandedStudentId(s.id);
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
                        {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t-2 border-gray-100">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(null)}>Hủy</Button>
            <Button type="submit" loading={saving || generatingSessions} className="flex-1 font-semibold shadow-sm shadow-brand-200">
              {modal === "create"
                ? previewDates.length > 0
                  ? `Tạo lớp + ${previewDates.length} buổi${selectedStudents.length > 0 ? ` + ${selectedStudents.length} HV` : ""}`
                  : selectedStudents.length > 0
                    ? `Tạo lớp + ${selectedStudents.length} học viên`
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
