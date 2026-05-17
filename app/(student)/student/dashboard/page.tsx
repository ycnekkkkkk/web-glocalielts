"use client";
import PageWrapper from "@/components/layouts/PageWrapper";
import { Card } from "@/components/ui/Card";
import { createBrowserClient } from "@/lib/supabase/client";
import { SESSION_STATUS } from "@/lib/constants";
import { 
  Award, Banknote, BookOpen, Check, CheckCircle, ChevronRight, 
  GraduationCap, Headphones, Heart, Sparkles, TrendingUp 
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import type { Session, AssignmentGrade } from "@/types";
import type { PublicCourse } from "@/types/database";
import { AG_LANDING_VI as t } from "@/lib/ag-landing-vi";
import CourseCardSlider from "@/components/landing/CourseCardSlider";

type TabKey = "tab1" | "tab2" | "tab3";

interface StudentClass {
  id: string;
  name: string;
  status: string;
  total_sessions: number;
  sessions_done: number;
}

const COURSE_CATEGORIES = [
  "Pronunciation",
  "Speaking",
  "IELTS Mentorship",
  "IELTS Rocket",
  "A+ Teacher",
  "Practice IELTS with Native Teacher",
  "Exchange Culture with Local Mentor",
  "Hạ Hạ Mentoring Coaching",
  "[AG x HR] Series Training Intern",
] as const;

const PARTNER_LOGOS = ["/doitac/1.png", "/doitac/2.png", "/doitac/3.png", "/doitac/4.png", "/doitac/5.png", "/doitac/6.png", "/doitac/7.png"] as const;

const UPCOMING_EVENTS = [
  {
    title: "Workshop Listening 7.0+",
    date: "19:30 · 20/04/2026",
    mode: "Online Zoom",
    note: "Phân tích bẫy đề thật + chiến lược làm Part 2, Part 3.",
  },
  {
    title: "Mock Test 4 kỹ năng có chấm Speaking",
    date: "08:00 · 27/04/2026",
    mode: "Offline · TP.HCM",
    note: "Thi thử đầy đủ, trả band dự kiến và góp ý chi tiết.",
  },
  {
    title: "Q&A Du học + IELTS Pathway",
    date: "19:00 · 04/05/2026",
    mode: "Hybrid",
    note: "Lộ trình IELTS theo mục tiêu học bổng và hồ sơ du học.",
  },
] as const;

const CLIENT_FEEDBACKS = [
  {
    name: "Nguyễn Minh Anh",
    target: "IELTS 7.0",
    quote:
      "Mình thích nhất phần chữa Writing rất cụ thể theo từng tiêu chí. Sau 6 tuần, điểm task response tăng rõ rệt.",
  },
  {
    name: "Trần Hoàng Long",
    target: "IELTS 6.5",
    quote:
      "Thi thử mô phỏng sát đề thật, đặc biệt Speaking có nhận xét thẳng vào lỗi phát âm và ý tưởng nên tiến bộ nhanh.",
  },
  {
    name: "Lê Khánh Ngọc",
    target: "IELTS 7.5",
    quote:
      "Mentor theo sát từng giai đoạn, có lịch học linh hoạt. Mình vừa đi làm vừa ôn vẫn giữ được tiến độ.",
  },
] as const;

function detectCategory(course: PublicCourse): string {
  const raw =
    `${course.slug ?? ""} ${course.title} ${course.short_description ?? ""} ${course.description ?? ""}`.toLowerCase();
  const rawNoAccent = raw.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "d");

  const upper = `${course.slug ?? ""} ${course.title}`.toUpperCase();

  if (raw.includes("ielts mentorship")) return "IELTS Mentorship";

  if (
    upper.includes("CMO1") ||
    upper.includes("GIG1") ||
    upper.includes("GIO1") ||
    raw.includes("pronunciation")
  ) {
    return "Pronunciation";
  }

  if (upper.includes("CMG1") || upper.includes("SPG5") || raw.includes("speaking")) return "Speaking";
  if (
    upper.includes("IM01") ||
    upper.includes("IM02") ||
    upper.includes("IM03") ||
    upper.includes("IMO1") ||
    upper.includes("IMO2") ||
    upper.includes("IMO3") ||
    upper.includes("IMG") ||
    upper.includes("GIG2")
  )
    return "IELTS Mentorship";

  if (upper.includes("RIG") || upper.includes("RIO") || raw.includes("rocket")) return "IELTS Rocket";

  if (raw.includes("a+ teacher") || raw.includes("a plus teacher")) return "A+ Teacher";
  if (raw.includes("native teacher")) return "Practice IELTS with Native Teacher";
  if (raw.includes("exchange culture") || raw.includes("local mentor")) return "Exchange Culture with Local Mentor";
  if (raw.includes("hạ hạ") || raw.includes("ha ha") || raw.includes("mentoring coaching")) return "Hạ Hạ Mentoring Coaching";

  if (rawNoAccent.includes("tu duy lam it duoc nhieu")) return "Hạ Hạ Mentoring Coaching";
  if (rawNoAccent.includes("yearly reflection")) return "Hạ Hạ Mentoring Coaching";
  if (rawNoAccent.includes("bi kip gioi danh cho hoc sinh luoi")) return "Hạ Hạ Mentoring Coaching";
  if (raw.includes("[ag x hr]") || raw.includes("series training intern")) return "[AG x HR] Series Training Intern";
  return "Khác";
}

export default function StudentDashboard() {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [grades, setGrades] = useState<AssignmentGrade[]>([]);
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [publicCourses, setPublicCourses] = useState<PublicCourse[]>([]);
  const [tab, setTab] = useState<TabKey>("tab1");

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

      // Fetch active classes, sessions, grades
      if (studentRec) {
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
        }
      }

      // Also fetch public published courses for discovery slider
      const { data: pubCourses } = await supabase
        .from("public_courses")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(24);
      
      setPublicCourses((pubCourses as PublicCourse[]) || []);
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

  const groupedCourses = useMemo(() => {
    const map = new Map<string, PublicCourse[]>();
    for (const c of publicCourses) {
      const cat = detectCategory(c);
      const existing = map.get(cat) ?? [];
      existing.push(c);
      map.set(cat, existing);
    }
    return map;
  }, [publicCourses]);

  const categoryOrder = useMemo(() => {
    const ordered = COURSE_CATEGORIES.filter((c) => (groupedCourses.get(c) ?? []).length > 0);
    return ordered;
  }, [groupedCourses]);

  const orderedCourses = useMemo(() => {
    return categoryOrder.flatMap((cat) => groupedCourses.get(cat) ?? []);
  }, [categoryOrder, groupedCourses]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center py-32">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* 🚀 Welcome Hero Banner (Executive Warm-Light Style) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 border border-slate-200/80 p-6 sm:p-8 shadow-sm mb-6">
        {/* Soft elegant radial blur */}
        <div className="absolute right-0 top-0 w-72 h-72 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-72 h-72 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100/50 text-indigo-700 border border-indigo-200/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Chương trình học thuật cá nhân hóa
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Xin chào, {studentName || "Học viên"}!
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm max-w-xl leading-relaxed font-semibold">
              Chúc bạn một ngày học tập hiệu quả. Hãy cùng xem qua tiến trình học tập hôm nay để tiếp tục hành trình nâng cao band điểm IELTS của mình nhé!
            </p>
          </div>
          
          <div className="flex gap-5 bg-white border border-slate-200/60 rounded-2xl p-4 shrink-0 shadow-sm">
            <div className="text-center min-w-16">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">Buổi đã xong</p>
              <p className="text-xl font-black text-indigo-650 mt-0.5">{completedSessions}/{sessions.length || 0}</p>
              <p className="text-[9px] text-slate-500 font-semibold mt-0.5">buổi học lớp</p>
            </div>
            <div className="w-px bg-slate-200 self-stretch" />
            <div className="text-center min-w-16">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">Điểm TB</p>
              <p className="text-xl font-black text-emerald-600 mt-0.5">{avgScore || "–"}</p>
              <p className="text-[9px] text-slate-500 font-semibold mt-0.5">bài tập về nhà</p>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 Premium Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            title: "Khóa học đang học",
            value: classes.length,
            icon: GraduationCap,
            iconColor: "text-indigo-600",
            iconBg: "bg-indigo-50 border-indigo-100",
            label: "chương trình hoạt động",
          },
          {
            title: "Buổi hoàn thành",
            value: completedSessions,
            icon: CheckCircle,
            iconColor: "text-emerald-600",
            iconBg: "bg-emerald-50 border-emerald-100",
            label: "buổi học trực tiếp",
          },
          {
            title: "Điểm TB Bài tập",
            value: avgScore || "–",
            icon: TrendingUp,
            iconColor: "text-sky-600",
            iconBg: "bg-sky-50 border-sky-100",
            label: "trên thang điểm 100",
          },
          {
            title: "Bài tập đã chấm",
            value: gradedCount,
            icon: Award,
            iconColor: "text-amber-600",
            iconBg: "bg-amber-50 border-amber-100",
            label: "bài đã đánh giá",
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/70 p-4 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{item.title}</p>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{item.value}</p>
                  <p className="text-[10px] text-slate-500 mt-2.5 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {item.label}
                  </p>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.iconBg}`}>
                  <Icon className={`w-4 h-4 ${item.iconColor} group-hover:scale-105 transition-transform duration-300`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 📚 Student Learning Hub Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Left Column: My Courses (spanning 2 cols on wide screen) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/70 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Khóa Học Của Tôi</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Danh sách các lớp học bạn đang tham gia trực tiếp</p>
              </div>
              <Link 
                href="/student/my-courses" 
                className="inline-flex items-center gap-1 text-[10px] text-brand-600 hover:text-brand-700 font-extrabold transition-all bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl border border-brand-100/50"
              >
                Xem tất cả
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            
            <div className="space-y-3">
              {classes.slice(0, 4).map(c => {
                const progress = c.total_sessions > 0
                  ? Math.min(100, (c.sessions_done / c.total_sessions) * 100) : 0;
                return (
                  <Link key={c.id} href={`/student/my-courses/${encodeURIComponent(c.id)}`} className="block">
                    <div className="group relative flex items-center gap-4 p-3 rounded-2xl bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-200/60 shadow-[0_2px_8px_rgb(0,0,0,0.01)] hover:shadow-md transition-all duration-300 cursor-pointer">
                      <div className="w-10 h-10 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                        <GraduationCap className="w-5 h-5 text-sky-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate">{c.name}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex-1 bg-slate-200/70 rounded-full h-1.5 max-w-[200px] overflow-hidden">
                            <div className="bg-gradient-to-r from-sky-400 to-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[9px] font-bold text-slate-500">{c.sessions_done}/{c.total_sessions} buổi</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Đang học
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
              {classes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-400 font-semibold">Bạn chưa có khóa học trực tiếp nào</p>
                  <Link href="/student/browse" className="text-[10px] text-brand-600 font-extrabold hover:underline mt-1">Khám phá khóa học ngay</Link>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column: AI Mock Test & Upcoming Session */}
        <div className="space-y-6">
          
          {/* AI Mock Test premium card (Executive Light Amber Style) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-5 text-slate-900 shadow-sm border border-amber-200/70">
            <div className="absolute right-0 bottom-0 w-32 h-32 rounded-full bg-amber-200/10 blur-2xl" />
            <div className="relative z-10 space-y-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200 tracking-wider">
                Hỗ trợ học thuật nâng cao
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Thi Thử IELTS 4 Kỹ Năng</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Luyện tập với hệ thống thi thử mô phỏng sát đề thi thật, chấm điểm tự động tích hợp công nghệ trí tuệ nhân tạo (AI) độc quyền của Glocal.
                </p>
              </div>
              <div className="pt-1">
                <Link href="/student/thi-thu" className="inline-flex items-center justify-center w-full gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold py-2.5 shadow-sm transition-all duration-300">
                  <Headphones className="w-3.5 h-3.5" />
                  Bắt đầu làm bài thi
                </Link>
              </div>
            </div>
          </div>
          
          {/* Upcoming Session */}
          <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/70 p-5 shadow-sm">
            <h3 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-3.5">Buổi học kế tiếp</h3>
            {upcomingSessions.slice(0, 1).map(s => (
              <div key={s.id} className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{s.class_name}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Buổi #{s.session_no} · {s.topic || "–"}</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Ngày học</p>
                    <p className="font-bold text-slate-700 mt-0.5 text-[11px]">{s.session_date}</p>
                  </div>
                  <div className="w-px bg-slate-200 self-stretch" />
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Thời gian</p>
                    <p className="font-bold text-brand-600 mt-0.5 text-[11px]">{s.session_time}</p>
                  </div>
                </div>
              </div>
            ))}
            {upcomingSessions.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6 font-semibold">Không có buổi học sắp tới</p>
            )}
          </div>
          
        </div>
      </div>

      {/* Kết quả bài tập */}
      {grades.filter(g => g.status === "graded").length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/70 p-5 shadow-sm mb-6">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">Kết Quả Bài Tập Gần Đây</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {grades.filter(g => g.status === "graded").slice(0, 4).map(g => (
              <div key={g.id} className="bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm rounded-2xl p-3.5 transition-all duration-300">
                <p className="text-[9px] font-bold text-slate-400 uppercase truncate mb-1">{g.class_name}</p>
                <p className="text-xs font-bold text-slate-800 truncate">{g.assignment_name}</p>
                <div className="flex items-end justify-between mt-3">
                  <span className="text-2xl font-black text-brand-600 leading-none">{g.grade}</span>
                  <span className="text-[10px] font-bold text-slate-400">{g.score}/100</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KHÁM PHÁ & HỖ TRỢ HỌC TẬP (Discovery & Public Landing content integrated) */}
      <div className="mt-8 border-t border-slate-200/60 pt-6">
        <div className="mb-5">
          <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-505" />
            <span>Khám phá & Hỗ trợ học tập</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Các chương trình đặc quyền và lộ trình hỗ trợ học viên từ Glocal</p>
        </div>

        {/* 1. IDP/BC Registration Support - Light Professional Style */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50/40 via-slate-50 to-slate-50 border border-slate-200/80 rounded-3xl p-5 sm:p-6 mb-6 shadow-sm">
          <h3 className="text-base font-extrabold tracking-tight relative z-10 leading-snug text-slate-900">
            <span className="text-indigo-600">{t.support}</span> {t.for_ielts_exam_registration}{" "}
            <span className="text-slate-800 font-semibold">{t.with_idp_or_british_council}</span>
          </h3>
          
          <div className="grid md:grid-cols-3 gap-4 mt-5 relative z-10">
            {[
              { title: t.convenient, text: t.conten01, icon: Sparkles, color: "text-indigo-600", bg: "bg-indigo-50/50 border-indigo-100" },
              { title: t.expense, text: t.conten02, icon: Banknote, color: "text-emerald-600", bg: "bg-emerald-50/50 border-emerald-100" },
              { title: t.tam, text: t.content03 ?? t.conten03, icon: Heart, color: "text-rose-600", bg: "bg-rose-50/50 border-rose-100" }
            ].map((card, cidx) => {
              const CardIcon = card.icon;
              return (
                <div key={cidx} className="p-4 rounded-2xl bg-white border border-slate-200/60 hover:shadow-sm transition-all duration-300 flex flex-col items-center text-center">
                  <div className={`w-8 h-8 mb-2 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
                    <CardIcon className={`w-4 h-4 ${card.color}`} />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-800 mb-1">{card.title}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-bold">{card.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Upcoming Events & Workshops - Styled with vertical glass accents */}
        <div className="mb-6">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
            <span className="w-1 h-3 bg-brand-600 rounded" />
            Sự kiện & Workshop sắp diễn ra
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {UPCOMING_EVENTS.map((event) => (
              <div key={event.title} className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/60 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-l-full group-hover:w-1.5 transition-all" />
                <div className="pl-1.5">
                  <span className="inline-flex items-center text-[9px] font-extrabold tracking-wider text-brand-600 uppercase bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
                    {event.mode}
                  </span>
                  <h4 className="mt-2 text-xs font-bold text-slate-900 leading-snug group-hover:text-brand-600 transition-colors line-clamp-1">{event.title}</h4>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500">{event.date}</p>
                  <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed line-clamp-2">{event.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Discover Courses (CourseCardSlider) */}
        {orderedCourses.length > 0 && (
          <div className="mb-6 bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1 h-3 bg-sky-600 rounded" />
                Khóa học IELTS mới nhất
              </h3>
            </div>
            <CourseCardSlider courses={orderedCourses} />
          </div>
        )}

        {/* 4. Visa & Study Abroad support tabs */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-5 mb-6 shadow-sm">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <span className="w-1 h-3 bg-violet-600 rounded" />
            HÀNH TRÌNH ĐỊNH HƯỚNG & DU HỌC TRỌN GÓI
          </h3>
          
          <div className="grid lg:grid-cols-5 gap-6 items-stretch">
            {/* Left Content column: Tabs & custom list cards */}
            <div className="lg:col-span-3 flex flex-col justify-between space-y-4">
              <div>
                <div className="inline-flex bg-slate-100 rounded-2xl p-1 border border-slate-200/30 mb-4 shadow-inner">
                  {(
                    [
                      { id: "tab1" as TabKey, label: t.tab_study_abroad_consulting },
                      { id: "tab2" as TabKey, label: t.tab_study_abroad_support },
                      { id: "tab3" as TabKey, label: t.tab_doVisa },
                    ] as const
                  ).map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setTab(x.id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        tab === x.id
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                      }`}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2.5">
                  {tab === "tab1" && (
                    <>
                      <h4 className="text-xs font-extrabold text-slate-850 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-650" />
                        {t.tab_study_abroad_consulting}
                      </h4>
                      {[t.content26, t.content27, t.content28].map((text, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-150/40 rounded-xl hover:bg-white hover:border-slate-250 transition-all duration-250">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-emerald-600" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 leading-relaxed">{text}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {tab === "tab2" && (
                    <>
                      <h4 className="text-xs font-extrabold text-slate-850 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-650" />
                        {t.tab_study_abroad_support}
                      </h4>
                      {[t.content08, t.content09, t.content10].map((text, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-150/40 rounded-xl hover:bg-white hover:border-slate-250 transition-all duration-250">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-emerald-600" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 leading-relaxed">{text}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {tab === "tab3" && (
                    <>
                      <h4 className="text-xs font-extrabold text-slate-850 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-650" />
                        {t.tab_doVisa}
                      </h4>
                      {[t.understand_visa_law, t.well_groomed_and_professional, t.canada_usa_australia_new_zealand].map((text, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-150/40 rounded-xl hover:bg-white hover:border-slate-250 transition-all duration-250">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-emerald-600" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 leading-relaxed">{text}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Showcase column: Framed Canvas Image */}
            <div className="lg:col-span-2 flex items-center">
              <div className="relative w-full group overflow-hidden rounded-3xl border border-slate-200/50 bg-white p-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-500">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
                  <Image
                    src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80"
                    alt="Mentor hỗ trợ lộ trình học và du học"
                    fill
                    className="object-cover object-center group-hover:scale-103 transition-transform duration-500"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Client Testimonials & Partner logos */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Left card: Testimonials with sleek animated feedback slide style */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm flex flex-col justify-between min-h-[280px]">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <span className="w-1 h-3 bg-brand-500 rounded" />
              {t.feeling} {t.client}
            </h3>
            <div className="space-y-3.5 my-auto">
              {CLIENT_FEEDBACKS.slice(0, 2).map((item, fidx) => (
                <div key={fidx} className="p-3.5 bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-slate-200 rounded-2xl transition-all duration-300 shadow-sm relative group">
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                    ))}
                  </div>
                  <p className="text-slate-600 text-xs italic leading-relaxed">
                    {"“"}{item.quote}{"”"}
                  </p>
                  <div className="flex items-center justify-between mt-3 border-t border-slate-150/40 pt-2">
                    <span className="text-[11px] font-extrabold text-slate-800">{item.name}</span>
                    <span className="text-[9px] font-extrabold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100/50">
                      Mục tiêu: {item.target}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right card: Partner logos with beautiful clean deck style */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm flex flex-col justify-between min-h-[280px]">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <span className="w-1 h-3 bg-sky-500 rounded" />
              {t.partner}
            </h3>
            <div className="grid grid-cols-3 gap-3 my-auto">
              {PARTNER_LOGOS.slice(0, 6).map((src, idx) => (
                <div key={src} className="group/logo relative p-2 border border-slate-200/50 rounded-2xl flex items-center justify-center bg-white aspect-[3/2] shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
                  <Image
                    src={src}
                    alt={`Đối tác ${idx + 1}`}
                    fill
                    sizes="120px"
                    className="object-contain p-2 group-hover/logo:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
