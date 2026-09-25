"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createBrowserClient } from "@/lib/supabase/client";
import { SESSION_STATUS } from "@/lib/constants";
import { getSessionState, getSessionDateTime } from "@/lib/sessionStatus";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  GraduationCap,
  Layers,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@/types";

interface TeacherClass {
  id: string;
  name: string;
  status: string;
  schedule: string | null;
  student_count: number;
}

export default function InstructorDashboard() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [teacherName, setTeacherName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setTeacherName(profile?.full_name || "");

      // Classes from table
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, status, schedule")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      const classIds = (classData || []).map((c: { id: string }) => c.id);
      const classNames = (classData || []).map((c: { name: string }) => c.name).filter(Boolean);

      // Sessions and enrollment counts in parallel
      const [sessRes, enrollRes] = await Promise.all([
        classIds.length > 0
          ? supabase
              .from("sessions")
              .select("*")
              .or(`class_id.in.(${classIds.join(",")}),class_name.in.(${classNames.map((n: string) => `"${n}"`).join(",")})`)
              .order("session_date", { ascending: true })
          : Promise.resolve({ data: [] }),
        classIds.length > 0
          ? supabase
              .from("enrollments")
              .select("class_id")
              .in("class_id", classIds)
              .eq("status", "active")
          : Promise.resolve({ data: [] }),
      ]);

      const countMap: Record<string, number> = {};
      ((enrollRes.data as { class_id: string }[]) || []).forEach((e) => {
        countMap[e.class_id] = (countMap[e.class_id] || 0) + 1;
      });

      setClasses(
        (classData || []).map((c: Omit<TeacherClass, "student_count">) => ({ ...c, student_count: countMap[c.id] || 0 }))
      );
      setSessions((sessRes.data as Session[]) || []);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  const totalStudents = classes.reduce((sum, c) => sum + c.student_count, 0);
  const doneSessions = sessions.filter((s) => s.status === SESSION_STATUS.DONE).length;

  // Outstanding attendance sessions (sessions that have passed but are not yet DONE)
  const pendingAttendanceSessions = sessions
    .filter((s) => getSessionState(s).isPendingAttendance)
    .sort((a, b) => {
      const tA = getSessionDateTime(a.session_date, a.session_time)?.getTime() ?? 0;
      const tB = getSessionDateTime(b.session_date, b.session_time)?.getTime() ?? 0;
      return tA - tB;
    });

  // Next upcoming slot per class
  const classNextSlots = classes.map((cls) => {
    const classSessions = sessions.filter(
      (s) => s.class_id === cls.id || s.class_name === cls.name
    );
    const upcoming = classSessions
      .filter((s) => getSessionState(s).isUpcoming)
      .sort((a, b) => {
        const tA = getSessionDateTime(a.session_date, a.session_time)?.getTime() ?? 0;
        const tB = getSessionDateTime(b.session_date, b.session_time)?.getTime() ?? 0;
        return tA - tB;
      });

    return {
      cls,
      nextSession: upcoming[0] || null,
      totalSessions: classSessions.length,
      doneSessions: classSessions.filter((s) => s.status === SESSION_STATUS.DONE).length,
    };
  });

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* ── 1. PREMIUM HERO HEADER ── */}
      <div className="relative mb-6 md:mb-8 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-sky-800 overflow-hidden shadow-xl shadow-brand-200/40">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-400/20 rounded-full -ml-24 -mb-24 blur-2xl opacity-50 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-inner border border-white/20 shrink-0">
              <GraduationCap className="w-8 h-8 md:w-9 md:h-9 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black text-white tracking-tight leading-tight mb-1.5">
                Xin chào, {teacherName || "Giáo viên"}!
              </h1>
              <div className="flex items-center gap-2 text-brand-100/90 text-xs md:text-sm font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Smart Education System · Cổng giảng viên</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/teacher/schedule">
              <button className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm backdrop-blur-md transition-all border border-white/20 shadow-sm">
                <Calendar className="w-4 h-4" />
                Lịch dạy
              </button>
            </Link>
            <Link href="/teacher/courses">
              <button className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-brand-700 hover:bg-brand-50 font-bold text-sm shadow-lg hover:shadow-xl transition-all">
                <BookOpen className="w-4 h-4" />
                Khóa học của tôi
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. STATS SUMMARY ROW ── */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8">
        {[
          { label: "Tổng lớp học", val: classes.length, icon: Layers, color: "brand" },
          { label: "Đang hoạt động", val: classes.filter(c => c.status === "active").length, icon: CheckCircle2, color: "emerald" },
          { label: "Tổng học viên", val: totalStudents, icon: Users, color: "sky" },
          {
            label: pendingAttendanceSessions.length > 0 ? "Cần điểm danh" : "Buổi đã dạy",
            val: pendingAttendanceSessions.length > 0 ? pendingAttendanceSessions.length : doneSessions,
            icon: pendingAttendanceSessions.length > 0 ? AlertTriangle : CheckCircle2,
            color: pendingAttendanceSessions.length > 0 ? "amber" : "emerald",
            isAlert: pendingAttendanceSessions.length > 0,
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`bg-white p-4 md:p-5 rounded-2xl border ${stat.isAlert ? "border-amber-200 bg-amber-50/20" : "border-gray-100"} shadow-xs hover:shadow-md transition-all relative overflow-hidden group`}
          >
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
            <div className="flex items-end justify-between relative">
              <h3 className={`text-2xl md:text-3xl font-black ${stat.isAlert ? "text-amber-600" : "text-gray-900"} group-hover:text-brand-600 transition-colors`}>
                {stat.val}
              </h3>
              <div className={`p-2.5 rounded-xl ${stat.isAlert ? "bg-amber-100 text-amber-600" : "bg-gray-50 text-gray-600 group-hover:text-brand-600 group-hover:bg-brand-50"} transition-all`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. MAIN SECTION: 2 BALANCED CARDS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* CARD TRÁI: NHIỆM VỤ CẦN ĐIỂM DANH */}
        <Card className="p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${pendingAttendanceSessions.length > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Cần điểm danh</h3>
                  <p className="text-xs text-gray-500">Các buổi học đã qua chưa lưu điểm danh</p>
                </div>
              </div>

              {pendingAttendanceSessions.length > 0 ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                  {pendingAttendanceSessions.length} buổi tồn
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành tốt
                </span>
              )}
            </div>

            {pendingAttendanceSessions.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Tất cả buổi học đã được điểm danh!</p>
                <p className="text-xs text-gray-400 mt-1">Không có buổi học nào bị chậm trễ điểm danh.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAttendanceSessions.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-gray-50/70 hover:bg-gray-100/80 border border-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0">
                        #{s.session_no}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{s.class_name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                          <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{s.session_date}</span>
                          {s.session_time && <span>· {s.session_time}</span>}
                        </p>
                      </div>
                    </div>

                    <Link href={`/teacher/courses/${encodeURIComponent(s.class_name)}`}>
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-xs whitespace-nowrap">
                        Điểm danh <ArrowRight className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {pendingAttendanceSessions.length > 5 && (
            <div className="mt-4 pt-3 border-t border-gray-100 text-center">
              <Link href="/teacher/schedule" className="text-xs text-brand-600 font-bold hover:underline">
                Xem thêm {pendingAttendanceSessions.length - 5} buổi nữa trên lịch dạy →
              </Link>
            </div>
          )}
        </Card>

        {/* CARD PHẢI: SLOT HỌC TIẾP THEO THEO TỪNG LỚP */}
        <Card className="p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Buổi học tiếp theo</h3>
                  <p className="text-xs text-gray-500">Slot học kế tiếp của từng lớp đang phụ trách</p>
                </div>
              </div>

              <Link href="/teacher/schedule" className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1 shrink-0">
                Xem lịch tuần <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {classNextSlots.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <p className="text-sm">Chưa có lớp học nào được phân công</p>
              </div>
            ) : (
              <div className="space-y-3">
                {classNextSlots.slice(0, 5).map(({ cls, nextSession }) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-gray-50/70 hover:bg-gray-100/80 border border-gray-100 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link
                          href={`/teacher/courses/${encodeURIComponent(cls.name)}`}
                          className="text-sm font-bold text-gray-900 hover:text-brand-600 truncate"
                        >
                          {cls.name}
                        </Link>
                      </div>

                      {nextSession ? (
                        <p className="text-xs text-gray-600 flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                            Buổi #{nextSession.session_no}
                          </span>
                          <span className="text-gray-400">·</span>
                          <span className="whitespace-nowrap">{nextSession.session_date}</span>
                          {nextSession.session_time && <span className="whitespace-nowrap">({nextSession.session_time})</span>}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Đã xong toàn bộ các buổi học</p>
                      )}
                    </div>

                    {nextSession?.zoom_link && (
                      <a
                        href={nextSession.zoom_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs shrink-0 transition-colors whitespace-nowrap"
                        title={nextSession.zoom_link}
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Phòng học</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {classNextSlots.length > 5 && (
            <div className="mt-4 pt-3 border-t border-gray-100 text-center">
              <Link href="/teacher/courses" className="text-xs text-brand-600 font-bold hover:underline">
                Xem tất cả {classNextSlots.length} lớp học →
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* ── 4. DANH SÁCH LỚP HỌC CỦA TÔI (THEO CHUẨN DESIGN SYSTEM ADMIN/CLASSES) ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Lớp học của tôi</h2>
            <p className="text-xs text-gray-500">Các lớp học bạn đang trực tiếp giảng dạy</p>
          </div>
          <Link href="/teacher/courses" className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1">
            Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {classes.map((cls) => {
            const statusMap: Record<string, { label: string; variant: "success" | "info" | "gray" | "danger" }> = {
              active:    { label: "Đang học",       variant: "success" },
              upcoming:  { label: "Sắp khai giảng", variant: "info"    },
              completed: { label: "Kết thúc",       variant: "gray"    },
              cancelled: { label: "Đã hủy",         variant: "danger"  },
            };
            const s = statusMap[cls.status] || { label: cls.status, variant: "gray" as const };
            const classSessions = sessions.filter(x => x.class_id === cls.id || x.class_name === cls.name);
            const doneCount = classSessions.filter(x => x.status === SESSION_STATUS.DONE).length;
            const totalCount = classSessions.length;

            return (
              <div
                key={cls.id}
                className="group relative bg-white rounded-3xl border border-gray-100 p-5 shadow-xs hover:shadow-xl hover:border-brand-200 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Header: Icon + Name + Status Badge */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-sky-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-brand-100 shrink-0 group-hover:scale-105 transition-transform">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/teacher/courses/${encodeURIComponent(cls.name)}`}
                        className="text-base font-black text-gray-900 group-hover:text-brand-600 transition-colors block truncate"
                        title={cls.name}
                      >
                        {cls.name}
                      </Link>
                      <div className="mt-1">
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Info 2-Column Grid: Học viên & Lịch học */}
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100/80">
                      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Học viên</span>
                      </div>
                      <p className="text-sm font-black text-gray-900 whitespace-nowrap">
                        {cls.student_count} <span className="text-xs font-normal text-gray-500">HV</span>
                      </p>
                    </div>

                    <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100/80">
                      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Lịch học</span>
                      </div>
                      <p className="text-xs font-bold text-gray-800 truncate" title={cls.schedule || "Chưa có lịch"}>
                        {cls.schedule || "Chưa xếp"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer: Tiến độ + Link vào lớp */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    <span>Tiến độ: </span>
                    <span className="font-bold text-gray-800">{doneCount}/{totalCount || "–"} buổi</span>
                  </div>
                  <Link
                    href={`/teacher/courses/${encodeURIComponent(cls.name)}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-800 group-hover:translate-x-0.5 transition-transform"
                  >
                    Vào lớp <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}

          {classes.length === 0 && (
            <div className="col-span-full bg-white p-8 rounded-3xl border border-gray-100 text-center text-gray-400">
              <p className="text-sm">Hiện chưa có lớp học nào được phân công cho bạn.</p>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
