"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card, StatsCard } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createBrowserClient } from "@/lib/supabase/client";
import { SESSION_STATUS } from "@/lib/constants";
import { Award, BookOpen, CheckCircle, GraduationCap, Headphones, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session, AssignmentGrade } from "@/types";

interface StudentClass {
  id: string;
  name: string;
  status: string;
  total_sessions: number;
  sessions_done: number;
}

export default function StudentDashboard() {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [grades, setGrades] = useState<AssignmentGrade[]>([]);
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        await fetch("/api/student/ensure-student-record", { method: "POST" });
      } catch {
        /* bỏ qua */
      }
      const supabase = createBrowserClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", authSession.user.id)
        .single();
      const name = profile?.full_name || "";
      setStudentName(name);

      // Find student record by profile_id
      const { data: studentRec } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", authSession.user.id)
        .maybeSingle();

      if (studentRec) {
        // Normalized path: enrollments → classes
        const { data: enrollData } = await supabase
          .from("enrollments")
          .select("class_id, classes(id, name, status, total_sessions, sessions_done)")
          .eq("student_id", studentRec.id)
          .eq("status", "active");

        const normalizedClasses: StudentClass[] = ((enrollData || []) as unknown as {
          classes: StudentClass | null
        }[]).filter(r => r.classes).map(r => r.classes!);

        if (normalizedClasses.length > 0) {
          setClasses(normalizedClasses);
          const classIds = normalizedClasses.map(c => c.id);
          const [sessRes, gradeRes] = await Promise.all([
            supabase.from("sessions").select("*").in("class_id", classIds).order("session_date"),
            supabase.from("assignment_grades").select("*").eq("student_name", name),
          ]);
          setSessions((sessRes.data as Session[]) || []);
          setGrades((gradeRes.data as AssignmentGrade[]) || []);
          setLoading(false);
          return;
        }
      }

      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  const upcomingSessions = sessions
    .filter(s => s.status === SESSION_STATUS.UPCOMING)
    .sort((a, b) => {
      const dateA = a.session_date + " " + (a.session_time || "");
      const dateB = b.session_date + " " + (b.session_time || "");
      return dateA.localeCompare(dateB);
    })
    .slice(0, 4);
  const completedSessions = sessions.filter(s => s.status === SESSION_STATUS.DONE).length;
  const gradedCount = grades.filter(g => g.status === "graded").length;
  const avgScore = gradedCount > 0
    ? Math.round(grades.filter(g => g.score).reduce((s, g) => s + (g.score || 0), 0) / gradedCount)
    : 0;

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="page-header">
        <h1 className="page-title">Xin chào, {studentName || "Học viên"}!</h1>
        <p className="page-subtitle">Tiến độ học tập của bạn hôm nay</p>
      </div>

      <div className="stats-grid">
        <StatsCard title="Khóa học đang học" value={classes.length} icon={GraduationCap} iconColor="text-sky-600" iconBg="bg-sky-50" trendLabel="khóa" />
        <StatsCard title="Buổi đã hoàn thành" value={completedSessions} icon={CheckCircle} iconColor="text-emerald-600" iconBg="bg-emerald-50" trendLabel="buổi" />
        <StatsCard title="Điểm TB bài tập" value={avgScore || "–"} icon={TrendingUp} iconColor="text-brand-600" iconBg="bg-brand-50" trendLabel="/ 100" />
        <StatsCard title="Bài tập đã chấm" value={gradedCount} icon={Award} iconColor="text-purple-600" iconBg="bg-purple-50" trendLabel="bài" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Khóa học */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Khóa Học Của Tôi</h3>
            <Link href="/student/my-courses" className="text-xs text-brand-600 hover:text-brand-700 font-medium">Xem tất cả</Link>
          </div>
          <div className="space-y-3">
            {classes.slice(0, 4).map(c => {
              const progress = c.total_sessions > 0
                ? Math.min(100, (c.sessions_done / c.total_sessions) * 100) : 0;
              return (
                <Link key={c.id} href={`/student/my-courses/${encodeURIComponent(c.id)}`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5 text-sky-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-24">
                          <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{c.sessions_done}/{c.total_sessions} buổi</span>
                      </div>
                    </div>
                    <Badge variant={c.status === "active" ? "success" : c.status === "upcoming" ? "info" : "gray"}>
                      {c.status === "active" ? "Đang học" : c.status === "upcoming" ? "Sắp học" : "Kết thúc"}
                    </Badge>
                  </div>
                </Link>
              );
            })}
            {classes.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Chưa đăng ký khóa học nào</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Thi thử 4 kỹ năng</h3>
            <Link href="/student/thi-thu" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              Xem đề thi
            </Link>
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5 text-brand-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Làm bài Listening, Reading, Speaking, Writing</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Bạn đã đăng nhập nên có thể bắt đầu làm bài ngay, hệ thống tự dùng thông tin tài khoản để lưu kết quả.
                </p>
                <div className="mt-3">
                  <Link href="/student/thi-thu">
                    <span className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700">
                      Bắt đầu thi thử
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Buổi học sắp tới */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Buổi Học Sắp Tới</h3>
          </div>
          <div className="space-y-3">
            {upcomingSessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 hover:bg-sky-100 transition-colors">
                <div className="w-10 h-10 bg-sky-200 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-sky-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.class_name}</p>
                  <p className="text-xs text-gray-500">Buổi #{s.session_no} · {s.topic || "–"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-sky-700">{s.session_date}</p>
                  <p className="text-xs text-gray-400">{s.session_time}</p>
                </div>
              </div>
            ))}
            {upcomingSessions.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Không có buổi học sắp tới</p>
            )}
          </div>
        </Card>
      </div>

      {/* Kết quả bài tập */}
      {grades.filter(g => g.status === "graded").length > 0 && (
        <Card className="p-5 mt-5">
          <h3 className="section-title">Kết Quả Bài Tập Gần Đây</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {grades.filter(g => g.status === "graded").slice(0, 4).map(g => (
              <div key={g.id} className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 truncate mb-1">{g.class_name}</p>
                <p className="text-sm font-medium text-gray-800 truncate">{g.assignment_name}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-2xl font-bold text-brand-600">{g.grade}</span>
                  <span className="text-xs text-gray-500">{g.score}/100</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageWrapper>
  );
}
