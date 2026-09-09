"use client";

import PublicPageShell from "@/components/layout/PublicPageShell";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MockSkillExamDef } from "@/types";
import {
  ArrowRight,
  Award,
  BookOpen,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Headphones,
  Laptop,
  LineChart,
  Mic,
  PenLine,
  ScrollText,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const SKILL_ICONS = {
  Listening: { icon: Headphones, bg: "bg-sky-50 text-sky-700 border-sky-100" },
  Reading: { icon: ScrollText, bg: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  Speaking: { icon: Mic, bg: "bg-amber-50 text-amber-700 border-amber-100" },
  Writing: { icon: PenLine, bg: "bg-indigo-50 text-indigo-700 border-indigo-100" },
};

// ── 1. Modern Academic Hero ──────────────────────────────────────────

function Hero() {
  return (
    <section className="relative bg-slate-50/70 border-b border-slate-200/80 py-12 lg:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Institutional Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold mb-4 shadow-2xs">
          <Target className="w-3.5 h-3.5 text-brand-600" />
          <span>HỆ THỐNG KHẢO THÍ 4 KỸ NĂNG CHUẨN CAMBRIDGE</span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Phòng Thi Thử IELTS{" "}
          <span className="bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-600 bg-clip-text text-transparent">
            4 Kỹ Năng Trực Tuyến
          </span>
        </h1>

        {/* Subheading */}
        <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Mô phỏng 100% đề thi thực tế IDP & British Council từ Cam 15–19. Đánh giá tức thì điểm số Listening & Reading, phân tích tiêu chí chi tiết Writing & Speaking theo đúng 4 tiêu chí chấm thi quốc tế.
        </p>

        {/* Feature Points */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Đầy đủ 4 kỹ năng: Nghe, Nói, Đọc, Viết</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Thời gian thực & giao diện sát bài thi thật</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Báo cáo điểm & nhận xét chuyên sâu</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 2. Featured Test Card (Thiết kế tinh gọn, vừa vặn, không hiển thị số phút) ──

function FeaturedTestCard({ exam, href }: { exam: MockSkillExamDef; href: string }) {
  const skillsMeta = [
    { name: "Listening", sub: "40 câu hỏi", icon: Headphones, bg: "bg-sky-50 text-sky-700 border-sky-200/70" },
    { name: "Reading", sub: "40 câu hỏi", icon: ScrollText, bg: "bg-emerald-50 text-emerald-700 border-emerald-200/70" },
    { name: "Speaking", sub: "3 phần thi", icon: Mic, bg: "bg-amber-50 text-amber-700 border-amber-200/70" },
    { name: "Writing", sub: "2 bài viết", icon: PenLine, bg: "bg-indigo-50 text-indigo-700 border-indigo-200/70" },
  ];

  return (
    <div className="rounded-2xl border-2 border-brand-500/25 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-brand-500/40 transition-all relative group">
      {/* Top badges row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Đề thi Tiêu biểu</span>
        </span>
        <div className="text-xs text-slate-500 font-medium">
          Trực tuyến 100%
        </div>
      </div>

      {/* Main title & short description */}
      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors leading-snug">
          {exam.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1 line-clamp-2 max-w-3xl">
          {exam.description || "Mô phỏng 100% bài thi IELTS Academic với đầy đủ 4 kỹ năng Nghe, Nói, Đọc, Viết. Chấm điểm tự động và gửi bảng phân tích chi tiết về Cổng học viên."}
        </p>
      </div>

      {/* 4 Skills Compact Chips Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {skillsMeta.map((skill) => {
          const Icon = skill.icon;
          return (
            <div
              key={skill.name}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${skill.bg}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold block leading-none">{skill.name}</span>
                <span className="text-[10px] opacity-75 mt-0.5 block leading-none">{skill.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer: Trust point & CTA Button */}
      <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Đánh giá khách quan theo 4 tiêu chí chuẩn quốc tế IDP & British Council</span>
        </div>

        <Link href={href} className="shrink-0">
          <button
            type="button"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer whitespace-nowrap"
          >
            <span>Vào thi ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
    </div>
  );
}

// ── 3. Exam Card (Standard List) ────────────────────────────────────

function ExamCard({ exam, href }: { exam: MockSkillExamDef; href: string }) {
  const content = exam.content_public as Record<string, unknown> | null | undefined;
  const skills = (
    ["listening", "reading", "speaking", "writing"] as const
  ).filter((s) => content?.[s]);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-brand-200 transition-all group">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-brand-600 transition-colors">
              {exam.title}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mt-1 mb-2.5 max-w-xl">
              {exam.description || "Bài thi 4 kỹ năng Listening, Reading, Speaking & Writing theo chuẩn khảo thí quốc tế."}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {skills.map((s) => {
                const name = s.charAt(0).toUpperCase() + s.slice(1);
                const cfg = SKILL_ICONS[name as keyof typeof SKILL_ICONS];
                return (
                  <span
                    key={s}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${cfg ? cfg.bg : "bg-slate-100 text-slate-600"}`}
                  >
                    {name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="shrink-0 sm:self-center">
          <Link href={href}>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-600 hover:text-white rounded-xl transition-all border border-brand-200/70 hover:border-transparent cursor-pointer shadow-2xs"
            >
              <span>Vào thi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── 4. Main Page Component ──────────────────────────────────────────

export default function ThiThuKyNangPage() {
  const [exams, setExams] = useState<MockSkillExamDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("mock_skill_exam_defs")
        .select("id, slug, title, description, is_active, created_at, updated_at, content_public")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setExams((data as MockSkillExamDef[]) || []);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return exams;
    const q = search.trim().toLowerCase();
    return exams.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q)
    );
  }, [exams, search]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <PublicPageShell hero={null}>
      {/* Hero Banner */}
      <Hero />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full">
        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpenCheck className="w-5 h-5 text-brand-600" />
              <span>Danh sách đề thi IELTS chuẩn hóa</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Trải nghiệm bài thi đầy đủ 4 kỹ năng theo đúng quy trình và thời gian thực tế.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm đề thi..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-xs animate-pulse" />
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl border border-slate-200 bg-white shadow-xs animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <p className="text-slate-500 text-sm">
              {search ? `Không tìm thấy đề thi phù hợp với từ khóa "${search}".` : "Hiện chưa có đề thi nào trên hệ thống."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-3 text-xs font-bold text-brand-600 hover:text-brand-700 underline cursor-pointer"
              >
                Xem tất cả đề thi
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Featured Test Card */}
            {featured && (
              <div className="mb-8">
                <FeaturedTestCard exam={featured} href={`/thi-thu/${featured.slug}`} />
              </div>
            )}

            {/* Rest of Exams List */}
            {rest.length > 0 && (
              <div className="mb-12">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4">
                  Các đề thi thử khác ({rest.length})
                </h3>
                <div className="space-y-4">
                  {rest.map((exam) => (
                    <ExamCard key={exam.id} exam={exam} href={`/thi-thu/${exam.slug}`} />
                  ))}
                </div>
              </div>
            )}

            {/* ── 5. Core Academic Evaluation Benefits ── */}
            <section className="mb-12">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs">
                <div className="text-center max-w-xl mx-auto mb-8">
                  <h3 className="text-lg font-bold text-slate-900">Quy trình khảo thí & Chấm điểm chuẩn Cambridge</h3>
                  <p className="text-xs text-slate-500 mt-1">Đảm bảo độ tin cậy và phản ánh chính xác năng lực thực tế của học viên trước kỳ thi chính thức.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                  {[
                    {
                      icon: <Award className="w-6 h-6 text-brand-600" />,
                      title: "Chấm điểm chuẩn Cambridge",
                      desc: "Đánh giá chi tiết 4 tiêu chí Task Achievement, Coherence, Lexical và Grammar.",
                    },
                    {
                      icon: <LineChart className="w-6 h-6 text-brand-600" />,
                      title: "Báo cáo phân tích chuyên sâu",
                      desc: "Bóc tách lỗi sai cụ thể, cung cấp bài mẫu band cao và gợi ý từ vựng nâng cấp.",
                    },
                    {
                      icon: <Clock className="w-6 h-6 text-brand-600" />,
                      title: "Mô phỏng 100% phòng thi thật",
                      desc: "Đồng hồ đếm ngược, giao diện làm bài tương đương thi trên máy tính của IDP & BC.",
                    },
                    {
                      icon: <CheckCircle2 className="w-6 h-6 text-brand-600" />,
                      title: "Lưu trữ & Theo dõi tiến độ",
                      desc: "Kết quả được tự động lưu vào Cổng học viên để theo dõi biểu đồ tăng điểm.",
                    },
                  ].map((b) => (
                    <div key={b.title} className="flex flex-col items-center text-center gap-3 p-4 rounded-xl bg-slate-50/60 border border-slate-100">
                      <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                        {b.icon}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{b.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {b.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── 6. Final Clean Academic CTA ── */}
            <section className="rounded-3xl bg-slate-900 text-white p-8 sm:p-12 border border-slate-800 relative overflow-hidden text-center shadow-xl mb-6">
              {/* Subtle ambient lighting */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

              <div className="relative z-10 max-w-xl mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-brand-200 text-xs font-bold uppercase tracking-wider mb-4 border border-white/15">
                  <Sparkles className="w-3.5 h-3.5 text-brand-300" />
                  <span>SẴN SÀNG KIỂM TRA TRÌNH ĐỘ</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 leading-tight">
                  Bắt đầu làm bài thi thử IELTS ngay hôm nay
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
                  Đánh giá toàn diện năng lực 4 kỹ năng và nhận tư vấn lộ trình học tập cá nhân hóa từ chuyên gia.
                </p>
                {featured && (
                  <Link href={`/thi-thu/${featured.slug}`}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-8 py-3.5 text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg cursor-pointer"
                    >
                      <span>Vào phòng thi ngay</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </PublicPageShell>
  );
}
