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
  DAY_COLUMNS, DayColumn, generateSessionDates, formatDateFull, parseSessionDate,
} from "@/lib/scheduleUtils";
import { Class } from "@/types";
import { 
  GraduationCap, Pencil, Plus, Search, Trash2, Users, 
  CheckCircle2, Clock, XCircle, ArrowRight, BookOpen, UserCheck, 
  Calendar, Layers, Sparkles
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, Fragment, useRef } from "react";
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
  const map: Record<string, { v: "success"|"info"|"gray"|"danger"|"warning"; l: string; icon: any }> = {
    active:    { v: "success", l: "Đang học", icon: <CheckCircle2 className="w-3 h-3" /> },
    upcoming:  { v: "info",    l: "Sắp khai giảng", icon: <Clock className="w-3 h-3" /> },
    completed: { v: "gray",    l: "Kết thúc", icon: <CheckCircle2 className="w-3 h-3" /> },
    cancelled: { v: "danger",  l: "Đã hủy", icon: <XCircle className="w-3 h-3" /> },
  };
  const m = map[status] || { v: "gray" as const, l: status, icon: <Layers className="w-3 h-3" /> };
  return (
    <Badge variant={m.v} className="gap-1.5 py-1 px-3 shadow-sm border border-black/5">
      {m.icon}
      {m.l}
    </Badge>
  );
}

type FormData = Omit<Class, "id"|"created_at"|"updated_at"|"teacher"|"enrollments"> & { academic_manager_id?: string | null; teacher_salary_per_hour?: number | null; };

const EMPTY: FormData = {
  organization_id: null, name: "", teacher_id: null, academic_manager_id: null, schedule: "",
  schedule_days: [], schedule_time: "", schedule_end_time: "", teacher_salary_per_hour: null,
  room: "", level_in: "", level_out: "", total_sessions: 0, sessions_done: 0,
  tuition_fee: 0, start_date: null, end_date: "", status: "active", class_type: "group",
  zoom_link: null, created_by: null,
};

export default function AdminClassesPage() {
  const { classes, loading, error: classesError, createClass, updateClass, deleteClass } = useClasses();
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [managers, setManagers] = useState<TeacherOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "create" | "edit" | "delete">(null);
  const [selected, setSelected] = useState<Class | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [generatingSessions, setGeneratingSessions] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
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
    sessionsCreatedRef.current = false;
    setModal("create");
  }

  function openEdit(cls: Class) {
    setSelected(cls);
    setForm({
      organization_id: cls.organization_id, name: cls.name, teacher_id: cls.teacher_id, academic_manager_id: null,
      schedule: cls.schedule || "",
      schedule_days: cls.schedule_days || [],
      schedule_time: cls.schedule_time || "",
      schedule_end_time: cls.schedule_end_time || "",
      teacher_salary_per_hour: cls.teacher_salary_per_hour || null,
      room: cls.room || "", level_in: cls.level_in || "",
      level_out: cls.level_out || "", total_sessions: cls.total_sessions, sessions_done: cls.sessions_done,
      tuition_fee: cls.tuition_fee, start_date: cls.start_date, end_date: cls.end_date || "",
      status: cls.status, class_type: cls.class_type,
      zoom_link: cls.zoom_link, created_by: cls.created_by,
    });
    setStudentSearch("");
    setSelectedStudentIds([]);
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
        schedule: form.schedule || null,
        schedule_days: form.schedule_days?.length ? form.schedule_days : null,
        schedule_time: form.schedule_time || null,
        schedule_end_time: form.schedule_end_time || null,
        teacher_salary_per_hour: form.teacher_salary_per_hour || null,
        room: form.room || null,
        level_in: form.level_in || null,
        level_out: form.level_out || null,
        end_date: form.end_date || null,
        zoom_link: form.zoom_link || null,
      };

      const academicManagerId = payload.academic_manager_id;
      delete (payload as any).academic_manager_id;

      if (modal === "create") {
        const newClass = await createClass(payload).catch((err) => {
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
          hoc_phi_tong: form.tuition_fee || null,
          tinh_trang: statusLabel,
          created_at: new Date().toISOString(),
        });
        if (syncErr) {
          console.error("[SYNC classes_current ERROR]", syncErr);
        }

        // Enroll selected students (upsert để bỏ qua học viên đã tồn tại trong lớp)
        if (selectedStudentIds.length > 0) {
          const enrollRows = selectedStudentIds.map(sid => ({
            class_id: newClass.id,
            student_id: sid,
            status: "active",
          }));
          const { error: enrollErr } = await supabase
            .from("enrollments")
            .upsert(enrollRows, { onConflict: "class_id,student_id", ignoreDuplicates: true });
          if (enrollErr) {
            toast.error(`Thêm học viên lỗi: ${enrollErr.message}`);
          } else {
            toast.success(`Đã thêm ${selectedStudentIds.length} học viên!`);
          }
        }

        // Auto-generate sessions when weekdays + start_date + total_sessions are set
        if (newClass && previewDates.length > 0 && !sessionsCreatedRef.current) {
          sessionsCreatedRef.current = true; // Prevent duplicate creation
          setGeneratingSessions(true);
          const sessionRows = previewDates.map((date, i) => ({
            class_id: newClass.id,
            class_name: newClass.name,
            session_no: i + 1,
            session_date: formatDateFull(date),
            session_time: form.schedule_time || null,
            zoom_link: form.zoom_link || null,
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

        // ── SYNC: Update classes_current (legacy table) ────────────────────
        const supabase = createBrowserClient();

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
            hoc_phi_tong: form.tuition_fee || null,
            tinh_trang: statusLabel,
          })
          .eq("ten_lop", selected.name); // Match by original name (before rename)
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
          // check if schedule_days changed
          const oldDays = JSON.stringify(selected.schedule_days || []);
          const newDays = JSON.stringify(form.schedule_days || []);
          if (oldDays !== newDays) scheduleChanged = true;
          // check if time changed
          if (selected.schedule_time !== form.schedule_time) scheduleChanged = true;
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
            if (remainingCount > 0 && form.schedule_days && form.schedule_days.length > 0) {
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
                const newDates = generateSessionDates(nextStartDateStr, form.schedule_days as DayColumn[], remainingCount);
                if (newDates.length > 0) {
                  const newSessionRows = newDates.map((date, index) => ({
                    class_id: selected.id,
                    class_name: form.name,
                    session_no: pastSessions.length + index + 1,
                    session_date: formatDateFull(date),
                    session_time: form.schedule_time || null,
                    zoom_link: form.zoom_link || null,
                    status: "UPCOMING",
                  }));
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
      {/* Premium Hero Header - Mobile optimized */}
      <div className="relative mb-6 md:mb-8 p-5 md:p-8 rounded-[2rem] md:rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 overflow-hidden shadow-2xl shadow-brand-200/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-400/20 rounded-full -ml-24 -mb-24 blur-2xl opacity-50" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-inner border border-white/20">
              <GraduationCap className="w-6 h-6 md:w-9 md:h-9 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black text-white tracking-tight leading-none mb-1 md:mb-2">Quản lý lớp học</h1>
              <div className="flex items-center gap-2 text-brand-100/80 text-[10px] md:text-sm font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                <span>Smart Education System</span>
              </div>
            </div>
          </div>
          <Button 
            className="w-full sm:w-auto bg-white text-brand-700 hover:bg-brand-50 border-none shadow-xl hover:scale-105 active:scale-95 transition-all py-5 md:py-7 px-8 rounded-2xl font-black text-sm md:text-base"
            icon={<Plus className="w-5 h-5" />} 
            onClick={openCreate}
          >
            Tạo lớp mới
          </Button>
        </div>
      </div>

      {/* Stats Summary - Responsive Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: "Tổng lớp học", val: classes.length, icon: Layers, color: "brand" },
          { label: "Đang hoạt động", val: classes.filter(c => c.status === 'active').length, icon: CheckCircle2, color: "emerald" },
          { label: "Sắp khai giảng", val: classes.filter(c => c.status === 'upcoming').length, icon: Clock, color: "sky" },
          { label: "Tổng học viên", val: classes.reduce((acc, c) => acc + (c.enrollments?.[0]?.count ?? 0), 0), icon: Users, color: "indigo" },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all group overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-16 h-16 bg-${stat.color}-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500`} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
            <div className="flex items-end justify-between relative">
              <h3 className={`text-2xl md:text-3xl font-black text-gray-900 group-hover:text-${stat.color}-600 transition-colors`}>{stat.val}</h3>
              <div className={`p-2.5 bg-${stat.color}-50 rounded-xl group-hover:rotate-12 transition-transform`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {classesError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Lỗi tải danh sách lớp: {classesError}
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden mb-12">
        <div className="p-5 md:p-8 border-b border-gray-100 bg-gray-50/20 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="relative group">
              <Input
                placeholder="Tìm tên lớp, giáo viên hoặc trình độ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                icon={<Search className="w-5 h-5 text-gray-400 group-focus-within:text-brand-600 transition-colors" />}
                className="pl-12 py-5 md:py-6 rounded-2xl border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 shadow-sm"
              />
            </div>
          </div>
          <div className="flex items-center self-end md:self-auto gap-2 text-[11px] font-black text-gray-500 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            {filtered.length} KẾT QUẢ
          </div>
        </div>

        {loading ? (
          <div className="p-8"><SkeletonTable /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 md:py-32 px-6">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <GraduationCap className="w-12 h-12 text-gray-200" />
            </div>
            <h3 className="text-xl font-black text-gray-900">Không có dữ liệu phù hợp</h3>
            <p className="text-gray-500 mt-2 max-w-xs mx-auto text-sm">Thử điều chỉnh bộ lọc hoặc tạo một lớp học mới để bắt đầu.</p>
          </div>
        ) : (
          <div className="p-4 md:p-8 bg-gray-50/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
              {filtered.map((cls) => {
                const count = cls.enrollments?.[0]?.count ?? 0;
                return (
                  <div 
                    key={cls.id} 
                    className="group relative bg-white rounded-[2rem] border border-gray-100 p-5 md:p-7 shadow-sm hover:shadow-2xl hover:shadow-brand-100/40 hover:-translate-y-2 transition-all duration-500 ease-out"
                  >
                    {/* Status Badge */}
                    <div className="absolute top-5 right-5 md:top-7 md:right-7 scale-90 md:scale-100">
                      {statusBadge(cls.status)}
                    </div>

                    <div className="flex items-start gap-4 mb-6 md:mb-8">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-100 shrink-0 group-hover:rotate-6 transition-transform">
                        <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-white" />
                      </div>
                      <div className="min-w-0 pr-20 md:pr-24">
                        <h3 className="text-base md:text-xl font-black text-gray-900 leading-tight mb-2 truncate group-hover:text-brand-600 transition-colors">
                          {cls.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="purple" className="text-[9px] font-black uppercase tracking-tighter px-2 bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {cls.level_in || "ALL LEVELS"}
                          </Badge>
                          {cls.class_type === "1on1" && (
                            <Badge variant="warning" className="text-[9px] font-black uppercase tracking-tighter px-2 bg-amber-50 text-amber-700 border border-amber-100">1:1 SOLO</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
                      <div className="bg-gray-50 rounded-2xl p-3 md:p-4 border border-gray-100 group-hover:bg-brand-50/30 transition-colors">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                          <Users className="w-3 h-3" />
                          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Học viên</span>
                        </div>
                        <p className="text-sm md:text-lg font-black text-gray-900">{count} <span className="text-[10px] font-bold text-gray-400">HV</span></p>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-3 md:p-4 border border-gray-100 group-hover:bg-brand-50/30 transition-colors">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Lịch học</span>
                        </div>
                        <p className="text-[10px] md:text-[12px] font-black text-gray-900 truncate" title={cls.schedule || "Chưa có lịch"}>
                          {cls.schedule || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6 md:mb-8 group-hover:border-brand-100 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                          {cls.teacher?.full_name ? (
                            <div className="bg-gradient-to-br from-brand-50 to-brand-100 w-full h-full flex items-center justify-center text-brand-700 font-black text-sm uppercase">
                              {cls.teacher.full_name.charAt(0)}
                            </div>
                          ) : (
                            <Users className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mb-0.5">Giảng viên</p>
                          <p className="text-xs md:text-sm font-black text-gray-800 truncate leading-none">{cls.teacher?.full_name || "Chưa phân công"}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mb-0.5">Tiến độ</p>
                        <p className="text-xs md:text-sm font-black text-gray-900 leading-none">
                          {cls.sessions_done || 0}/{cls.total_sessions || 0}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/admin/classes/${encodeURIComponent(cls.name)}`} className="flex-1">
                        <Button 
                          variant="primary" 
                          size="lg" 
                          className="w-full justify-center rounded-2xl font-black text-xs md:text-sm bg-brand-600 hover:bg-brand-700 shadow-xl shadow-brand-100 border-none py-4 md:py-6"
                        >
                          Chi tiết
                        </Button>
                      </Link>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="subtle" 
                          size="md" 
                          icon={<Pencil className="w-4 h-4 md:w-5 md:h-5" />} 
                          onClick={() => openEdit(cls)} 
                          className="rounded-2xl border border-gray-200 hover:border-brand-200 hover:text-brand-600 bg-white p-3 md:p-4" 
                        />
                        <Button 
                          variant="subtle" 
                          size="md" 
                          icon={<Trash2 className="w-4 h-4 md:w-5 md:h-5" />} 
                          onClick={() => { setSelected(cls); setModal("delete"); }} 
                          className="rounded-2xl border border-gray-200 hover:border-red-200 hover:text-red-600 text-red-500 bg-white p-3 md:p-4" 
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
              <div className="grid grid-cols-2 gap-3">
                <Input label="Phòng học" value={form.room || ""} onChange={e => setForm(p => ({ ...p, room: e.target.value }))} placeholder="Phòng A1" />
                <Input label="Lương GV / giờ (VNĐ)" type="number" value={form.teacher_salary_per_hour || ""} onChange={e => setForm(p => ({ ...p, teacher_salary_per_hour: Number(e.target.value) || null }))} placeholder="VD: 150000" />
              </div>
            </div>
          </div>

          {/* ── Section 2: Lịch học ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-amber-500" />
              <h3 className="text-sm font-bold text-gray-800">Lịch học & Thời gian</h3>
            </div>
            <div className="bg-gray-50/70 rounded-xl p-4 space-y-4 border border-gray-100">

              {/* Weekday picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày học trong tuần
                  <span className="text-xs font-normal text-gray-400 ml-1.5">(chọn một hoặc nhiều thứ)</span>
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {DAY_COLUMNS.map(day => {
                    const active = (form.schedule_days || []).includes(day);
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
                  label="Tổng số buổi"
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
                <div className="rounded-xl bg-brand-50 border-2 border-brand-200 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    <p className="text-xs font-bold text-brand-700">{form.schedule}</p>
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
                    {(form.schedule_days || []).length} buổi/tuần ·
                    ~{Math.ceil(previewDates.length / (form.schedule_days || []).length)} tuần
                    {form.schedule_time && ` · ${form.schedule_time}${form.schedule_end_time ? `–${form.schedule_end_time}` : ""}`}
                  </p>
                </div>
              ) : (form.schedule_days || []).length > 0 && form.total_sessions > 0 && !form.start_date ? (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-2.5">
                  <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-amber-700 font-medium">Chọn ngày khai giảng để xem lịch tự động tạo</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Section 3: Học thuật & Tài chính ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-bold text-gray-800">Học thuật & Học phí</h3>
            </div>
            <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100">
              <div className="grid grid-cols-3 gap-3">
                <Input label="Trình độ đầu vào" value={form.level_in || ""} onChange={e => setForm(p => ({ ...p, level_in: e.target.value }))} placeholder="VD: 4.5" />
                <Input label="Mục tiêu đầu ra" value={form.level_out || ""} onChange={e => setForm(p => ({ ...p, level_out: e.target.value }))} placeholder="VD: 6.5" />
                <Input
                  label="Học phí (VNĐ)"
                  type="number"
                  value={form.tuition_fee || ""}
                  onChange={e => setForm(p => ({ ...p, tuition_fee: Number(e.target.value) }))}
                  placeholder="VD: 8.000.000"
                  hint={form.tuition_fee ? new Intl.NumberFormat("vi-VN").format(form.tuition_fee) + " đ" : undefined}
                />
              </div>
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
                      <label
                        key={s.id}
                        onClick={(e) => { e.preventDefault(); toggleStudent(s.id); }}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                          checked ? "bg-brand-50 border-l-2 border-l-brand-500" : "hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStudent(s.id)}
                          className="sr-only"
                        />
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
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t-2 border-gray-100">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(null)}>Hủy</Button>
            <Button type="submit" loading={saving || generatingSessions} className="flex-1 font-semibold shadow-sm shadow-brand-200">
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
