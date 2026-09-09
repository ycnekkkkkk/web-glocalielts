"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import Badge from "@/components/ui/Badge";
import { createBrowserClient } from "@/lib/supabase/client";
import { SESSION_STATUS } from "@/lib/constants";
import type { AssignmentGrade, Session } from "@/types";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  GraduationCap,
  Headphones,
  Mic,
  PenTool,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface StudentClass {
  id: string;
  name: string;
  status: string;
  total_sessions: number;
  sessions_done: number;
  schedule?: string | null;
}

interface MockSubmissionSummary {
  id: string;
  exam_id: string;
  status: string;
  is_released: boolean;
  scores?: {
    listening?: { band?: number; correct?: number; total?: number };
    reading?: { band?: number; correct?: number; total?: number };
    writing?: { band?: number };
    speaking?: { band?: number };
    summary?: { overall_band?: number };
  };
  created_at: string;
  exam?: { id: string; title: string; slug: string };
}

export default function StudentDashboard() {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [grades, setGrades] = useState<AssignmentGrade[]>([]);
  const [mockSubmissions, setMockSubmissions] = useState<MockSubmissionSummary[]>([]);
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        await fetch("/api/student/ensure-student-record", { method: "POST" });
      } catch {
        /* ignore */
      }
      const supabase = createBrowserClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.user) {
        setLoading(false);
        return;
      }

      const userId = authSession.user.id;
      const userEmail = authSession.user.email || "";

      // Load Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();
      const name = profile?.full_name || authSession.user.user_metadata?.full_name || "";
      setStudentName(name);

      // Find student record
      const { data: studentRec } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();

      // Parallel Data Fetching
      const promises: Promise<any>[] = [];

      // 1. Enrolled Classes & Sessions
      if (studentRec) {
        promises.push(
          supabase
            .from("enrollments")
            .select("class_id, classes(id, name, status, total_sessions, sessions_done, schedule)")
            .eq("student_id", studentRec.id)
            .eq("status", "active")
        );
        promises.push(
          supabase
            .from("assignment_grades")
            .select("*")
            .eq("student_name", name)
            .order("created_at", { ascending: false })
            .limit(5)
        );
      } else {
        promises.push(Promise.resolve({ data: [] }));
        promises.push(Promise.resolve({ data: [] }));
      }

      // 2. Mock Test Submissions
      promises.push(
        supabase
          .from("mock_skill_submissions")
          .select("id, exam_id, status, is_released, scores, created_at, mock_skill_exams(id, title, slug)")
          .or(`auth_user_id.eq.${userId},candidate->>email.eq.${userEmail}`)
          .order("created_at", { ascending: false })
          .limit(5)
      );

      const [enrollRes, gradeRes, mockRes] = await Promise.all(promises);

      // Process Classes & Sessions
      const normalizedClasses: StudentClass[] = ((enrollRes.data || []) as unknown as {
        classes: StudentClass | null;
      }[]).filter(r => r.classes).map(r => r.classes!);

      setClasses(normalizedClasses);

      if (normalizedClasses.length > 0) {
        const classIds = normalizedClasses.map(c => c.id);
        const { data: sessData } = await supabase
          .from("sessions")
          .select("*")
          .in("class_id", classIds)
          .order("session_date", { ascending: true });
        setSessions((sessData as Session[]) || []);
      }

      setGrades((gradeRes.data as AssignmentGrade[]) || []);

      // Process Mock Submissions
      const processedMocks: MockSubmissionSummary[] = (mockRes.data || []).map((m: any) => ({
        id: m.id,
        exam_id: m.exam_id,
        status: m.status,
        is_released: m.is_released,
        scores: m.scores,
        created_at: m.created_at,
        exam: m.mock_skill_exams,
      }));
      setMockSubmissions(processedMocks);

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
    });

  const nextSession = upcomingSessions[0] || null;
  const completedSessions = sessions.filter(s => s.status === SESSION_STATUS.DONE).length;
  const gradedCount = grades.filter(g => g.status === "graded").length;
  const avgScore = gradedCount > 0
    ? Math.round(grades.filter(g => g.score).reduce((s, g) => s + (g.score || 0), 0) / gradedCount)
    : 0;

  // Latest mock band calculation
  const latestMock = mockSubmissions[0] || null;
  const latestOverallBand = (() => {
    if (!latestMock?.scores) return null;
    if (latestMock.scores.summary?.overall_band != null) return latestMock.scores.summary.overall_band;
    const bands = [
      latestMock.scores.listening?.band,
      latestMock.scores.reading?.band,
      latestMock.scores.writing?.band,
      latestMock.scores.speaking?.band,
    ].filter((b): b is number => typeof b === "number" && b > 0);
    if (bands.length === 0) return null;
    return Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2;
  })();

  // Skills breakdown
  const skillsMap = (() => {
    let listeningBand: number | null = null;
    let readingBand: number | null = null;
    let writingBand: number | null = null;
    let speakingBand: number | null = null;

    for (const m of mockSubmissions) {
      if (!m.scores) continue;
      if (listeningBand === null && m.scores.listening?.band != null) listeningBand = m.scores.listening.band;
      if (readingBand === null && m.scores.reading?.band != null) readingBand = m.scores.reading.band;
      if (writingBand === null && m.scores.writing?.band != null) writingBand = m.scores.writing.band;
      if (speakingBand === null && m.scores.speaking?.band != null) speakingBand = m.scores.speaking.band;
    }

    return {
      listening: listeningBand ?? 6.5,
      reading: readingBand ?? 6.5,
      writing: writingBand ?? 6.0,
      speaking: speakingBand ?? 6.0,
      hasRealData: listeningBand !== null || readingBand !== null || writingBand !== null || speakingBand !== null,
    };
  })();

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  })();

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Đang đồng bộ dữ liệu học tập cá nhân hóa...</p>
        </div>
      </PageWrapper>
    );
  }

  const targetBand = 7.0;
  const currentBandDisplay = latestOverallBand ?? 6.5;
  const bandProgressPct = Math.min(100, Math.round((currentBandDisplay / 9.0) * 100));

  return (
    <PageWrapper>
      {/* 🌟 Top Academic Hero Command Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-brand-950/10 mb-8">
        {/* Subtle Decorative Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-brand-200 backdrop-blur-md border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-brand-300" />
              <span>Lộ trình IELTS 7.0+ Chuẩn Cambridge</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              {greeting}, {studentName || "Học viên"}! 👋
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-normal">
              Duy trì thói quen luyện đề 30 phút mỗi ngày là chìa khóa đạt Target. Bạn đã sẵn sàng chinh phục mục tiêu hôm nay chưa?
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/student/thi-thu"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-brand-50 text-brand-900 text-xs font-extrabold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Headphones className="w-4 h-4 text-brand-700" />
                <span>Thi thử 4 kỹ năng AI</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-700 ml-0.5" />
              </Link>
              <Link
                href="/student/schedule"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-sm transition-all"
              >
                <Calendar className="w-4 h-4 text-slate-300" />
                <span>Xem lịch học tuần này</span>
              </Link>
            </div>
          </div>

          {/* Right Bento Box: Target Band Milestone Roadmap */}
          <div className="bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-5 min-w-[280px] sm:min-w-[320px] shrink-0 space-y-4 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Mục tiêu IELTS</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Target {targetBand.toFixed(1)}
              </span>
            </div>

            {/* Band Compare Widget */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Band hiện tại (ước tính)</p>
                <p className="text-2xl font-black text-white mt-0.5">
                  {latestOverallBand != null ? latestOverallBand.toFixed(1) : "6.5*"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Khoảng cách tới đích</p>
                <p className="text-sm font-extrabold text-emerald-300 mt-0.5 flex items-center justify-end gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>
                    {latestOverallBand != null && latestOverallBand >= targetBand
                      ? "Đã đạt mục tiêu!"
                      : `Còn ${(targetBand - (latestOverallBand ?? 6.5)).toFixed(1)} Band`}
                  </span>
                </p>
              </div>
            </div>

            {/* Target Milestone Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-400 via-amber-300 to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${bandProgressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-300">
                <span>Band 5.0</span>
                <span>Band 6.5</span>
                <span className="text-amber-300 font-extrabold">Band 7.0 🎯</span>
                <span>Band 9.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 4 Core Academic Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            title: "Khóa học đang học",
            value: classes.length,
            unit: classes.length > 0 ? `${completedSessions}/${sessions.length || 0} buổi đã xong` : "Chưa đăng ký lớp",
            icon: GraduationCap,
            iconColor: "text-brand-600",
            iconBg: "bg-brand-50 border-brand-100",
            link: "/student/my-courses",
          },
          {
            title: "Buổi học hoàn thành",
            value: completedSessions,
            unit: sessions.length > 0 ? `${Math.round((completedSessions / sessions.length) * 100)}% toàn khóa` : "Theo lộ trình",
            icon: CheckCircle2,
            iconColor: "text-emerald-600",
            iconBg: "bg-emerald-50 border-emerald-100",
            link: "/student/schedule",
          },
          {
            title: "Điểm TB Bài tập",
            value: avgScore ? `${avgScore}/100` : "—",
            unit: gradedCount > 0 ? `${gradedCount} bài đã chấm` : "Chưa có bài chấm",
            icon: TrendingUp,
            iconColor: "text-blue-600",
            iconBg: "bg-blue-50 border-blue-100",
            link: "/student/exams",
          },
          {
            title: "IELTS Mock Test",
            value: latestOverallBand != null ? `Band ${latestOverallBand.toFixed(1)}` : `${mockSubmissions.length} đề`,
            unit: mockSubmissions.length > 0 ? `${mockSubmissions.length} lần thi gần nhất` : "Chưa làm bài thi",
            icon: Trophy,
            iconColor: "text-amber-600",
            iconBg: "bg-amber-50 border-amber-100",
            link: "/student/thi-thu",
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              href={item.link}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-brand-300 hover:shadow-md transition-all group block"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {item.title}
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {item.value}
                  </p>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1 group-hover:text-brand-600 transition-colors pt-1">
                    <span>{item.unit}</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${item.iconBg}`}>
                  <Icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 🎯 IELTS 4-Skills Mastery Radar Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs mb-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-4 bg-brand-600 rounded-full" />
              Năng lực 4 Kỹ năng IELTS (Target 7.0+)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Đánh giá chi tiết từng kỹ năng dựa trên kết quả thi thử Cambridge và bài tập gần nhất.
            </p>
          </div>
          <Link
            href="/student/thi-thu"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-colors shrink-0 self-start sm:self-auto"
          >
            <span>Thi thử đầy đủ 4 kỹ năng</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Listening */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3 hover:border-brand-300 hover:bg-white transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Listening</h3>
                  <p className="text-[10px] text-slate-400">Section 1 - 4</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-indigo-100 text-indigo-800">
                Band {skillsMap.listening.toFixed(1)}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                <span>Mục tiêu 7.5</span>
                <span>{(skillsMap.listening / 9.0 * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${(skillsMap.listening / 9.0) * 100}%` }}
                />
              </div>
            </div>
            <Link
              href="/student/thi-thu"
              className="block text-center text-xs font-bold text-indigo-600 hover:text-indigo-800 pt-1 group-hover:underline"
            >
              Luyện đề Nghe →
            </Link>
          </div>

          {/* Reading */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3 hover:border-brand-300 hover:bg-white transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Reading</h3>
                  <p className="text-[10px] text-slate-400">Passage 1 - 3</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-sky-100 text-sky-800">
                Band {skillsMap.reading.toFixed(1)}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                <span>Mục tiêu 7.5</span>
                <span>{(skillsMap.reading / 9.0 * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-sky-600 rounded-full"
                  style={{ width: `${(skillsMap.reading / 9.0) * 100}%` }}
                />
              </div>
            </div>
            <Link
              href="/student/thi-thu"
              className="block text-center text-xs font-bold text-sky-600 hover:text-sky-800 pt-1 group-hover:underline"
            >
              Luyện đề Đọc →
            </Link>
          </div>

          {/* Writing */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3 hover:border-brand-300 hover:bg-white transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Writing</h3>
                  <p className="text-[10px] text-slate-400">Task 1 & Task 2</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-purple-100 text-purple-800">
                Band {skillsMap.writing.toFixed(1)}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                <span>Mục tiêu 6.5</span>
                <span>{(skillsMap.writing / 9.0 * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full"
                  style={{ width: `${(skillsMap.writing / 9.0) * 100}%` }}
                />
              </div>
            </div>
            <Link
              href="/student/thi-thu"
              className="block text-center text-xs font-bold text-purple-600 hover:text-purple-800 pt-1 group-hover:underline"
            >
              Luyện đề Viết →
            </Link>
          </div>

          {/* Speaking */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3 hover:border-brand-300 hover:bg-white transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Speaking</h3>
                  <p className="text-[10px] text-slate-400">Part 1 - 3 (AI Audio)</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-800">
                Band {skillsMap.speaking.toFixed(1)}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                <span>Mục tiêu 6.5</span>
                <span>{(skillsMap.speaking / 9.0 * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${(skillsMap.speaking / 9.0) * 100}%` }}
                />
              </div>
            </div>
            <Link
              href="/student/thi-thu"
              className="block text-center text-xs font-bold text-amber-600 hover:text-amber-800 pt-1 group-hover:underline"
            >
              Luyện đề Nói AI →
            </Link>
          </div>
        </div>
      </div>

      {/* 📚 2-Column Academic Learning Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols): Next Session & Active Courses & Mock Results */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Next Upcoming Session Widget */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-4 bg-brand-600 rounded-full" />
                Buổi học kế tiếp
              </h3>
              <Link
                href="/student/schedule"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
              >
                Xem toàn bộ lịch học <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {nextSession ? (
              <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/60 via-white to-brand-50/30 p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-brand-700 bg-brand-100/90 px-3 py-1 rounded-full">
                        {nextSession.session_date}
                      </span>
                      {nextSession.session_time && (
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 bg-white border border-slate-200/80 px-2.5 py-1 rounded-full">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> {nextSession.session_time}
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900 pt-1">
                      {nextSession.topic || "Buổi học theo lịch trình lớp"}
                    </h4>
                    {nextSession.homework && (
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        📝 Chuẩn bị: {nextSession.homework}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <Link
                      href="/student/schedule"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold shadow-md shadow-brand-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span>Vào phòng học</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center bg-slate-50/60 space-y-2">
                <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">Không có lịch học trực tiếp hôm nay</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto font-medium">
                  Hãy dành 30 phút luyện một đề Cambridge Listening hoặc Reading để duy trì phản xạ tiếng Anh nhé!
                </p>
                <Link
                  href="/student/thi-thu"
                  className="inline-block mt-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-brand-700 hover:bg-brand-50 transition-colors shadow-xs"
                >
                  Luyện đề Cambridge ngay
                </Link>
              </div>
            )}
          </div>

          {/* 2. My Enrolled Classes Progress */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-4 bg-emerald-600 rounded-full" />
                Khóa học đang tham gia
              </h3>
              <Link
                href="/student/my-courses"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
              >
                Quản lý lớp học ({classes.length}) <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {classes.length > 0 ? (
              <div className="space-y-3.5">
                {classes.map((c) => {
                  const pct = c.total_sessions > 0 ? Math.round((c.sessions_done / c.total_sessions) * 100) : 0;
                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 hover:border-brand-300 hover:shadow-sm transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{c.name}</h4>
                          {c.schedule && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" /> {c.schedule}
                            </p>
                          )}
                        </div>
                        <Badge variant="success">Đang học</Badge>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-500">Tiến độ khóa học:</span>
                          <span className="text-brand-700 font-extrabold">{c.sessions_done} / {c.total_sessions} buổi ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-600 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50 space-y-2">
                <GraduationCap className="w-9 h-9 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">Bạn chưa ghi danh vào lớp trực tiếp nào</h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Tham gia các khóa học IELTS online chất lượng cao để bắt đầu lộ trình ngay.
                </p>
                <Link
                  href="/student/online-courses"
                  className="inline-block mt-2 px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-xs"
                >
                  Khám phá khóa online
                </Link>
              </div>
            )}
          </div>

          {/* 3. IELTS Mock Test Scorecard Snapshot */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-4 bg-amber-600 rounded-full" />
                Kết quả thi thử Cambridge 4 kỹ năng gần nhất
              </h3>
              <Link
                href="/student/thi-thu"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
              >
                Vào phòng thi thử <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {mockSubmissions.length > 0 ? (
              <div className="space-y-3.5">
                {mockSubmissions.map((sub) => {
                  const sc = sub.scores || {};
                  const overall = sc.summary?.overall_band != null
                    ? sc.summary.overall_band
                    : latestOverallBand;

                  return (
                    <div
                      key={sub.id}
                      className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/40 via-white to-slate-50/20 p-5 space-y-3.5 shadow-xs hover:border-brand-200 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                            {sub.exam?.title || "Cambridge IELTS Mock Test"}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 font-medium">
                            Ngày nộp bài: {new Date(sub.created_at).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                        {sub.is_released ? (
                          <Badge variant="success">Đã có kết quả chính thức</Badge>
                        ) : (
                          <Badge variant="warning">Đang xử lý chấm điểm</Badge>
                        )}
                      </div>

                      {/* 4-Skill Matrix Pill Bar */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <div className="px-3.5 py-1.5 rounded-xl bg-brand-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xs">
                          <span className="text-[10px] font-semibold opacity-85 uppercase tracking-wider">Overall</span>
                          <span>{overall != null ? overall.toFixed(1) : "—"}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1 text-xs font-bold text-slate-600">
                          <span>L: <strong className={sc.listening?.band != null ? "text-brand-700 font-extrabold" : "text-slate-400"}>{sc.listening?.band != null ? sc.listening.band.toFixed(1) : "—"}</strong></span>
                          <span className="text-slate-300">|</span>
                          <span>R: <strong className={sc.reading?.band != null ? "text-brand-700 font-extrabold" : "text-slate-400"}>{sc.reading?.band != null ? sc.reading.band.toFixed(1) : "—"}</strong></span>
                          <span className="text-slate-300">|</span>
                          <span>W: <strong className={sc.writing?.band != null ? "text-brand-700 font-extrabold" : "text-slate-400"}>{sc.writing?.band != null ? sc.writing.band.toFixed(1) : "—"}</strong></span>
                          <span className="text-slate-300">|</span>
                          <span>S: <strong className={sc.speaking?.band != null ? "text-brand-700 font-extrabold" : "text-slate-400"}>{sc.speaking?.band != null ? sc.speaking.band.toFixed(1) : "—"}</strong></span>
                        </div>

                        <Link
                          href={`/student/thi-thu`}
                          className="ml-auto text-xs font-extrabold text-brand-600 hover:text-brand-800 transition-colors"
                        >
                          Xem chi tiết & luyện tiếp →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/20 p-8 text-center space-y-3">
                <Trophy className="w-9 h-9 text-amber-500 mx-auto" />
                <h4 className="text-xs font-bold text-slate-800">Bạn chưa tham gia bài thi thử nào</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium">
                  Làm thử bài thi 4 kỹ năng chuẩn đề thi thật Cambridge để AI và giảng viên phân tích điểm mạnh, điểm yếu của bạn.
                </p>
                <Link
                  href="/student/thi-thu"
                  className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-extrabold shadow-md shadow-brand-600/20 hover:bg-brand-700 transition-all"
                >
                  Bắt đầu bài thi thử ngay
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Homework & Quick Action Shortcuts */}
        <div className="space-y-8">
          
          {/* 1. Homework / Assignments */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-4 bg-blue-600 rounded-full" />
                Bài tập & Nhận xét
              </h3>
              <Link
                href="/student/exams"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
              >
                Tất cả ({grades.length}) <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {grades.length > 0 ? (
              <div className="space-y-3">
                {grades.map((g) => (
                  <div
                    key={g.id}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{g.assignment_name}</p>
                      {g.status === "graded" ? (
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0 border border-emerald-100">
                          {g.score}/100
                        </span>
                      ) : (
                        <Badge variant="warning">Chờ chấm</Badge>
                      )}
                    </div>
                    {g.feedback && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic bg-white/80 p-2 rounded-xl border border-slate-100">
                        "{g.feedback}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center bg-slate-50/50 space-y-1.5">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Tất cả bài tập đã hoàn thành!</p>
                <p className="text-[11px] text-slate-400">Bạn đang duy trì tiến độ học rất tốt.</p>
              </div>
            )}
          </div>

          {/* 2. Quick Navigation Shortcuts */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-4 bg-indigo-600 rounded-full" />
              Lối tắt học tập
            </h3>
            
            <div className="space-y-2.5">
              <Link
                href="/student/thi-thu"
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-brand-100 bg-brand-50/40 hover:bg-brand-50 hover:border-brand-200 transition-all text-slate-800 font-bold text-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Headphones className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 group-hover:text-brand-700 transition-colors">Thi thử 4 kỹ năng</p>
                  <p className="text-[10px] text-slate-500 font-medium">Chấm AI tức thì L, R, W, S</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 shrink-0" />
              </Link>

              <Link
                href="/student/schedule"
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-brand-200 hover:shadow-xs transition-all text-slate-800 font-bold text-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 group-hover:text-brand-700 transition-colors">Lịch học tuần này</p>
                  <p className="text-[10px] text-slate-500 font-medium">Theo dõi các buổi học trực tiếp</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 shrink-0" />
              </Link>

              <Link
                href="/student/my-online-courses"
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-brand-200 hover:shadow-xs transition-all text-slate-800 font-bold text-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 group-hover:text-brand-700 transition-colors">Khóa học online đã mua</p>
                  <p className="text-[10px] text-slate-500 font-medium">Video & bài giảng trực tuyến</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 shrink-0" />
              </Link>

              <Link
                href="/student/certificates"
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-brand-200 hover:shadow-xs transition-all text-slate-800 font-bold text-xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 group-hover:text-brand-700 transition-colors">Chứng chỉ của tôi</p>
                  <p className="text-[10px] text-slate-500 font-medium">Hồ sơ hoàn thành khóa học</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 shrink-0" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}
