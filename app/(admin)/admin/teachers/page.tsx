"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  BookOpen, Calendar, CheckCircle, ChevronRight, Lock,
  Mail, Search, Trash2, UserPlus, Users, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

// ─── types ────────────────────────────────────────────────────────────────────

interface TeacherProfile {
  id: string;
  profile_code?: string | null;
  full_name: string;
  email: string | null;
  created_at: string | null;
}

interface MonthlyStat {
  month: string;
  session_count: number;
  hours: number;
  salary: number;
}

interface TeacherClass {
  id: string;
  name: string;
  status: string;
  class_type: string;
  schedule: string | null;
  total_sessions: number;
  sessions_done: number;
  student_count: number;
  teacher_salary_per_hour: number | null;
  schedule_time: string | null;
  schedule_end_time: string | null;
  monthly_stats: MonthlyStat[];
}

interface TeacherWithClasses extends TeacherProfile {
  classes: TeacherClass[];
  active_count: number;
  total_students: number;
}

const CLASS_STATUS: Record<string, { label: string; variant: "success" | "info" | "gray" | "danger" }> = {
  active:    { label: "Đang học",       variant: "success" },
  upcoming:  { label: "Sắp khai giảng", variant: "info"    },
  completed: { label: "Kết thúc",       variant: "gray"    },
  cancelled: { label: "Đã hủy",         variant: "danger"  },
};

// ─── component ────────────────────────────────────────────────────────────────

export default function AdminTeachersPage() {
  const [teachers, setTeachers]         = useState<TeacherWithClasses[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [showCreate, setShowCreate]     = useState(false);
  const [form, setForm]                 = useState({ name: "", email: "", password: "demo123456" });
  const [creating, setCreating]         = useState(false);
  const [detailTeacher, setDetailTeacher] = useState<TeacherWithClasses | null>(null);
  const [modalTab, setModalTab] = useState<"classes" | "salary">("classes");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    if (!detailTeacher) return;
    const now = new Date();
    const currentMonthStr = `Tháng ${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    
    const allMonths = Array.from(new Set(
      detailTeacher.classes.flatMap(c => c.monthly_stats.map(st => st.month))
    ));
    
    if (allMonths.includes(currentMonthStr)) {
      setSelectedMonth(currentMonthStr);
    } else if (allMonths.length > 0) {
      allMonths.sort((a, b) => {
        const [am, ay] = a.replace("Tháng ", "").split("/").map(Number);
        const [bm, by] = b.replace("Tháng ", "").split("/").map(Number);
        if (ay !== by) return ay - by;
        return am - bm;
      });
      setSelectedMonth(allMonths[allMonths.length - 1]);
    } else {
      setSelectedMonth(currentMonthStr);
    }
  }, [detailTeacher]);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resettingTeacher, setResettingTeacher] = useState<TeacherWithClasses | null>(null);

  // ── load ───────────────────────────────────────────────────────────────────
  const loadTeachers = useCallback(async () => {
      const supabase = createBrowserClient();

      // 1) Try load teacher profiles by role (fallback if this fails/empty)
      const { data: profilesByRole, error: pErr } = await supabase
        .from("profiles")
        .select("id, profile_code, full_name, email, created_at")
        .eq("role", "teacher")
        .order("full_name");

      if (pErr) {
        console.error("[AdminTeachersPage] profiles(role=teacher) error:", pErr);
        // Không return ngay để fallback theo classes.teacher_id
      }

      // 2) Also load teacher ids from classes.teacher_id (most reliable for "teacher has classes")
      const { data: teacherIdRows, error: cTeacherErr } = await supabase
        .from("classes")
        .select("teacher_id");

      if (cTeacherErr) {
        console.error("[AdminTeachersPage] classes select teacher_id error:", cTeacherErr);
      }

      const roleTeacherIds = (profilesByRole || []).map((p: { id: string }) => p.id);
      const classTeacherIds = (teacherIdRows || [])
        .map((r: { teacher_id: string | null }) => r.teacher_id)
        .filter(Boolean) as string[];

      const teacherIdSet = new Set<string>([...roleTeacherIds, ...classTeacherIds]);
      const teacherIds = [...teacherIdSet];

      if (teacherIds.length === 0) {
        setTeachers([]);
        setLoading(false);
        toast.error("Không tìm thấy giáo viên trong `profiles` hoặc `classes.teacher_id`.");
        return;
      }

      // 3) Fetch profiles for those ids
      const { data: profilesByIds } = await supabase
        .from("profiles")
        .select("id, profile_code, full_name, email, created_at")
        .in("id", teacherIds);

      // 4) Fetch classes for those ids
      const { data: classesRaw } = await supabase
        .from("classes")
        .select("id, name, status, class_type, schedule, total_sessions, sessions_done, teacher_id, teacher_salary_per_hour, schedule_time, schedule_end_time")
        .in("teacher_id", teacherIds);

      const classIds = (classesRaw || []).map((c: { id: string }) => c.id);

      // Fetch all DONE sessions for these classes to calculate monthly salary & hours
      let sessionsData: any[] = [];
      if (classIds.length > 0) {
        const { data: sess } = await supabase
          .from("sessions")
          .select("class_id, session_date, session_time, status")
          .in("class_id", classIds)
          .eq("status", "DONE");
        sessionsData = sess || [];
      }

      // 5) Enrollment counts per class
      const enrollCountMap: Record<string, number> = {};
      if (classIds.length > 0) {
        const { data: enrolls } = await supabase
          .from("enrollments")
          .select("class_id")
          .in("class_id", classIds)
          .eq("status", "active");
        for (const e of enrolls || []) {
          enrollCountMap[e.class_id] = (enrollCountMap[e.class_id] || 0) + 1;
        }
      }

      // 6) Merge
      const teacherMap = new Map<string, TeacherWithClasses>();
      for (const p of profilesByIds || []) {
        teacherMap.set(p.id, {
          id: p.id,
          full_name: p.full_name || "",
          email: p.email,
          created_at: p.created_at,
          classes: [],
          active_count: 0,
          total_students: 0,
        });
      }

      // Helper function to calculate duration in hours
      function calculateSessionDurationInHours(startTime: string | null, endTime: string | null): number {
        if (!startTime || !endTime) return 1.5;
        try {
          const [startH, startM] = startTime.split(":").map(Number);
          const [endH, endM] = endTime.split(":").map(Number);
          const diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
          if (diffMinutes > 0) return diffMinutes / 60;
        } catch (e) {
          console.error(e);
        }
        return 1.5;
      }

      // Helper function to parse month-year
      function parseMonthYear(dateStr: string | null): string {
        if (!dateStr) return "Chưa rõ tháng";
        if (dateStr.includes("/")) {
          const parts = dateStr.split("/");
          if (parts.length >= 2) {
            return `${parts[1]}/${parts[2]}`; // MM/YYYY
          }
        } else if (dateStr.includes("-")) {
          const parts = dateStr.split("-");
          if (parts.length >= 2) {
            if (parts[0].length === 4) {
              return `${parts[1]}/${parts[0]}`; // YYYY-MM-DD -> MM/YYYY
            } else {
              return `${parts[1]}/${parts[2]}`; // DD-MM-YYYY -> MM/YYYY
            }
          }
        }
        return "Chưa rõ tháng";
      }

      for (const c of classesRaw || []) {
        if (!c.teacher_id) continue;
        const t = teacherMap.get(c.teacher_id);
        if (!t) continue;
        const sc = enrollCountMap[c.id] || 0;
        
        // Filter DONE sessions of this class
        const classSessions = sessionsData.filter(s => s.class_id === c.id);
        
        // Group by month
        const monthlyGroups: Record<string, number> = {};
        for (const s of classSessions) {
          const m = parseMonthYear(s.session_date);
          monthlyGroups[m] = (monthlyGroups[m] ?? 0) + 1;
        }

        const duration = calculateSessionDurationInHours(c.schedule_time, c.schedule_end_time);
        const hourlyRate = Number(c.teacher_salary_per_hour) || 0;

        const monthlyStats = Object.entries(monthlyGroups).map(([month, sessionCount]) => {
          const hours = sessionCount * duration;
          const salary = hours * hourlyRate;
          return {
            month: `Tháng ${month}`,
            session_count: sessionCount,
            hours,
            salary,
          };
        }).sort((a, b) => {
          const [am, ay] = a.month.replace("Tháng ", "").split("/").map(Number);
          const [bm, by] = b.month.replace("Tháng ", "").split("/").map(Number);
          if (ay !== by) return ay - by;
          return am - bm;
        });

        t.classes.push({
          id: c.id,
          name: c.name,
          status: c.status,
          class_type: c.class_type,
          schedule: c.schedule,
          total_sessions: c.total_sessions || 0,
          sessions_done: Math.max(c.sessions_done ?? 0, classSessions.length),
          student_count: sc,
          teacher_salary_per_hour: hourlyRate || null,
          schedule_time: c.schedule_time || null,
          schedule_end_time: c.schedule_end_time || null,
          monthly_stats: monthlyStats,
        });
        t.total_students += sc;
        if (c.status === "active") t.active_count += 1;
      }

      // ensure stable ordering by name
      setTeachers([...teacherMap.values()].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")));
      setLoading(false);
  }, []);

  useEffect(() => {
    loadTeachers().catch(console.error);
  }, [loadTeachers]);

  const filtered = useMemo(() =>
    teachers.filter(t =>
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.email || "").toLowerCase().includes(search.toLowerCase())
    ),
  [teachers, search]);

  // ── create teacher ─────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/create-teacher-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: form.name, email: form.email, password: form.password }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Tạo tài khoản giáo viên thành công!");
      await loadTeachers();
      setShowCreate(false);
      setForm({ name: "", email: "", password: "demo123456" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteTeacher(teacher: TeacherWithClasses) {
    if (!confirm(`Xóa giáo viên "${teacher.full_name}"?\nThao tác này sẽ xóa luôn tài khoản khỏi DB.`)) return;
    setDeletingTeacherId(teacher.id);
    try {
      const res = await fetch("/api/admin/delete-teacher-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: teacher.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Xóa giáo viên thất bại");
      toast.success("Đã xóa giáo viên khỏi hệ thống");
      if (detailTeacher?.id === teacher.id) {
        setDetailTeacher(null);
      }
      await loadTeachers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setDeletingTeacherId(null);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resettingTeacher || !resetPw) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/reset-user-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resettingTeacher.id, newPassword: resetPw }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Đã đổi mật khẩu cho ${resettingTeacher.full_name}`);
      setShowResetModal(false);
      setResetPw("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setCreating(false);
    }
  }


  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      {/* Header */}
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Quản Lý Giáo Viên</h1>
          <p className="page-subtitle">{teachers.length} giáo viên · {teachers.reduce((s, t) => s + t.active_count, 0)} lớp đang dạy</p>
        </div>
        <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Thêm giáo viên</Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center">
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{teachers.length}</p>
            <p className="text-xs text-gray-500">Tổng giáo viên</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{teachers.reduce((s, t) => s + t.active_count, 0)}</p>
            <p className="text-xs text-gray-500">Lớp đang dạy</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{teachers.reduce((s, t) => s + t.classes.length, 0)}</p>
            <p className="text-xs text-gray-500">Tổng lớp phụ trách</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{teachers.reduce((s, t) => s + t.total_students, 0)}</p>
            <p className="text-xs text-gray-500">Tổng học viên</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4 mb-5">
        <Input placeholder="Tìm theo tên, email giáo viên..." value={search}
          onChange={e => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
      </Card>

      {/* Teacher cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(t => (
            <Card key={t.id} hover className="p-5 flex flex-col">
              {/* Top: Avatar + Name */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={t.full_name} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {t.profile_code ? `[${t.profile_code}] ` : ""}{t.full_name}
                  </p>
                  {t.email && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 truncate mt-0.5">
                      <Mail className="w-3 h-3 shrink-0" />{t.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center bg-brand-50 rounded-xl py-2">
                  <p className="text-lg font-bold text-brand-700">{t.classes.length}</p>
                  <p className="text-[10px] text-brand-500">Tổng lớp</p>
                </div>
                <div className="text-center bg-emerald-50 rounded-xl py-2">
                  <p className="text-lg font-bold text-emerald-700">{t.active_count}</p>
                  <p className="text-[10px] text-emerald-500">Đang dạy</p>
                </div>
                <div className="text-center bg-sky-50 rounded-xl py-2">
                  <p className="text-lg font-bold text-sky-700">{t.total_students}</p>
                  <p className="text-[10px] text-sky-500">Học viên</p>
                </div>
              </div>

              {/* Class list preview (up to 3) */}
              {t.classes.length > 0 ? (
                <div className="space-y-1.5 mb-4 flex-1">
                  {t.classes.slice(0, 3).map(c => {
                    const st = CLASS_STATUS[c.status] || { label: c.status, variant: "gray" as const };
                    return (
                      <div key={c.id} className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                        <span className="flex-1 text-gray-700 truncate">{c.name}</span>
                        <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                      </div>
                    );
                  })}
                  {t.classes.length > 3 && (
                    <p className="text-xs text-gray-400 pl-3.5">+{t.classes.length - 3} lớp khác...</p>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center py-3 mb-4">
                  <p className="text-xs text-gray-400 italic">Chưa được phân lớp nào</p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    icon={<Lock className="w-3.5 h-3.5" />}
                    onClick={() => { setResettingTeacher(t); setResetPw(""); setShowResetModal(true); }}
                  >
                    Reset PW
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    icon={<ChevronRight className="w-3.5 h-3.5" />}
                    onClick={() => { setDetailTeacher(t); setModalTab("classes"); }}
                  >
                    Chi tiết
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    loading={deletingTeacherId === t.id}
                    onClick={() => handleDeleteTeacher(t)}
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Không tìm thấy giáo viên nào</p>
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal ── */}
      <Modal open={!!detailTeacher} onClose={() => setDetailTeacher(null)}
        title={detailTeacher?.full_name || "Chi tiết giáo viên"} size="lg">
        {detailTeacher && (
          <div className="space-y-4">
            {/* Profile info */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 p-4 bg-gray-50 rounded-2xl">
              <Avatar name={detailTeacher.full_name} size="xl" />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-semibold text-gray-900 text-lg">
                  {detailTeacher.profile_code ? `[${detailTeacher.profile_code}] ` : ""}{detailTeacher.full_name}
                </p>
                {detailTeacher.email && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />{detailTeacher.email}
                  </p>
                )}
                {detailTeacher.created_at && (
                  <p className="text-xs text-gray-400">
                    Tham gia: {new Date(detailTeacher.created_at).toLocaleDateString("vi-VN")}
                  </p>
                )}
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-brand-50 rounded-xl py-3">
                <p className="text-2xl font-bold text-brand-700">{detailTeacher.classes.length}</p>
                <p className="text-xs text-brand-500 mt-0.5 whitespace-nowrap">Tổng lớp</p>
              </div>
              <div className="text-center bg-emerald-50 rounded-xl py-3">
                <p className="text-2xl font-bold text-emerald-700">{detailTeacher.active_count}</p>
                <p className="text-xs text-emerald-500 mt-0.5 whitespace-nowrap">Đang dạy</p>
              </div>
              <div className="text-center bg-sky-50 rounded-xl py-3">
                <p className="text-2xl font-bold text-sky-700">{detailTeacher.total_students}</p>
                <p className="text-xs text-sky-500 mt-0.5 whitespace-nowrap">Học viên</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 p-0.5 bg-gray-50 rounded-xl">
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  modalTab === "classes"
                    ? "bg-white text-brand-600 shadow-sm border border-gray-100 font-black cursor-pointer"
                    : "text-gray-500 hover:text-gray-900 cursor-pointer font-medium"
                }`}
                onClick={() => setModalTab("classes")}
              >
                Lớp phụ trách ({detailTeacher.classes.length})
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  modalTab === "salary"
                    ? "bg-white text-brand-600 shadow-sm border border-gray-100 font-black cursor-pointer"
                    : "text-gray-500 hover:text-gray-900 cursor-pointer font-medium"
                }`}
                onClick={() => setModalTab("salary")}
              >
                Lương & Giờ dạy
              </button>
            </div>

            {modalTab === "classes" ? (
              /* Class list */
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-brand-500" />
                  Danh sách lớp phụ trách ({detailTeacher.classes.length})
                </p>
                {detailTeacher.classes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Chưa được phân công lớp nào</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {detailTeacher.classes.map(c => {
                      const st = CLASS_STATUS[c.status] || { label: c.status, variant: "gray" as const };
                      const progress = c.total_sessions > 0
                        ? Math.min(100, Math.round((c.sessions_done / c.total_sessions) * 100))
                        : 0;
                      return (
                        <div key={c.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-gray-500">
                                <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                                  <Users className="w-3.5 h-3.5 shrink-0" />{c.student_count} học viên
                                </span>
                                {c.schedule && (
                                  <span className="flex items-center gap-1 min-w-0">
                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{c.schedule}</span>
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-200 text-gray-600 shrink-0 whitespace-nowrap">
                                  {c.class_type === "1-1" ? "1:1" : "Nhóm"}
                                </span>
                              </div>
                            </div>
                            <Badge variant={st.variant}>{st.label}</Badge>
                          </div>
                          {/* Progress */}
                          <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />Tiến độ
                              </span>
                              <span>{c.sessions_done}/{c.total_sessions} buổi ({progress}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className="bg-brand-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Salary Report */
              <div className="space-y-4">
                {(() => {
                  const uniqueMonths = Array.from(new Set(
                    detailTeacher.classes.flatMap(c => c.monthly_stats.map(st => st.month))
                  )).sort((a, b) => {
                    const [am, ay] = a.replace("Tháng ", "").split("/").map(Number);
                    const [bm, by] = b.replace("Tháng ", "").split("/").map(Number);
                    if (ay !== by) return ay - by;
                    return am - bm;
                  });

                  const activeMonth = selectedMonth || (uniqueMonths.length > 0 ? uniqueMonths[uniqueMonths.length - 1] : `Tháng ${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear()}`);

                  let selectedMonthHours = 0;
                  let selectedMonthSalary = 0;

                  for (const c of detailTeacher.classes) {
                    const stat = c.monthly_stats.find(st => st.month === activeMonth);
                    if (stat) {
                      selectedMonthHours += stat.hours;
                      selectedMonthSalary += stat.salary;
                    }
                  }

                  return (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-brand-500" />
                          Báo cáo Lương & Giờ dạy
                        </p>
                        {uniqueMonths.length > 0 && (
                          <select
                            className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                            value={activeMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                          >
                            {uniqueMonths.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {detailTeacher.classes.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Chưa có lớp nào được phân công</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {detailTeacher.classes.map(c => {
                            const activeStat = c.monthly_stats.find(st => st.month === activeMonth);

                            return (
                              <div key={c.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                <div className="flex justify-between items-start">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-gray-900 truncate">{c.name}</p>
                                    <p className="text-[10px] text-gray-500 font-bold mt-0.5">
                                      Lương/giờ: {c.teacher_salary_per_hour ? `${new Intl.NumberFormat("vi-VN").format(c.teacher_salary_per_hour)} VNĐ/g` : "Chưa cấu hình"}
                                    </p>
                                  </div>
                                  <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                                    {c.schedule_time && c.schedule_end_time ? `${c.schedule_time}-${c.schedule_end_time}` : "1.5h/b"}
                                  </span>
                                </div>

                                {!activeStat ? (
                                  <p className="text-xs text-gray-400 italic py-1 pl-1">Không có buổi học nào trong {activeMonth}</p>
                                ) : (
                                  <div className="bg-white rounded-lg border border-gray-100 overflow-hidden divide-y divide-gray-100">
                                    <div className="flex justify-between items-center p-2 text-xs">
                                      <div className="font-semibold text-gray-700">{activeMonth}</div>
                                      <div className="text-right space-y-0.5">
                                        <div className="text-gray-600 font-bold">
                                          {activeStat.session_count} buổi ({activeStat.hours.toFixed(1)}g)
                                        </div>
                                        <div className="text-brand-600 font-black">
                                          {new Intl.NumberFormat("vi-VN").format(activeStat.salary)} VNĐ
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Dynamic monthly totals card */}
                      {detailTeacher.classes.length > 0 && (
                        <div className="p-4 bg-gradient-to-br from-brand-600 to-sky-600 rounded-2xl text-white shadow-md shadow-brand-100 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] text-brand-100 font-black uppercase tracking-wider">Tổng thu nhập {activeMonth}</p>
                            <p className="text-xs text-brand-50/80 mt-0.5">Tất cả các lớp cộng dồn (Tháng được chọn)</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black leading-none">
                              {new Intl.NumberFormat("vi-VN").format(selectedMonthSalary)} VNĐ
                            </p>
                            <p className="text-[10px] text-brand-100 font-bold mt-1">
                              Tổng giờ: {selectedMonthHours.toFixed(1)}g
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            <div className="pt-2">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="danger"
                  className="w-full"
                  loading={deletingTeacherId === detailTeacher.id}
                  onClick={() => handleDeleteTeacher(detailTeacher)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Xóa giáo viên
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => setDetailTeacher(null)}>
                  <X className="w-4 h-4 mr-1" />Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create Modal ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo tài khoản giáo viên">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Họ tên *" value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <Input label="Email *" type="email" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          <Input label="Mật khẩu tạm *" value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
          <div className="p-3 bg-amber-50 rounded-xl">
            <p className="text-xs text-amber-700">
              Sau khi tạo, giáo viên có thể đăng nhập bằng email + mật khẩu tạm và đổi mật khẩu trong hồ sơ.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button type="submit" loading={creating} className="flex-1">Tạo tài khoản</Button>
          </div>
        </form>
      </Modal>
      {/* Reset Password Modal */}
      <Modal open={showResetModal} onClose={() => setShowResetModal(false)} title={`Đặt lại mật khẩu – ${resettingTeacher?.full_name}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-gray-500">
            Đặt lại mật khẩu mới cho giáo viên. Người dùng sẽ dùng mật khẩu này để đăng nhập ngay lập tức.
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
            <Button type="submit" loading={creating} className="flex-1">Cập nhật mật khẩu</Button>
          </div>
        </form>
      </Modal>

    </PageWrapper>
  );
}
