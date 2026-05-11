"use client";

import PublicPageShell from "@/components/layout/PublicPageShell";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MockSkillExamDef } from "@/types";
import { motion } from "framer-motion";
import { BookOpen, Clock, Filter, Headphones, Mic, PenLine, ScrollText, Search, Star, X, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// ── Skill icons config ────────────────────────────────────────────

const SKILL_ICONS = {
  Listening: { icon: Headphones, color: "from-blue-500 to-indigo-600" },
  Reading:   { icon: ScrollText, color: "from-emerald-500 to-teal-600" },
  Speaking:  { icon: Mic,        color: "from-violet-500 to-purple-600" },
  Writing:   { icon: PenLine,    color: "from-amber-500 to-orange-600" },
};

const ALL_SKILLS = Object.keys(SKILL_ICONS) as (keyof typeof SKILL_ICONS)[];

// ── Hero Section ──────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-800 to-indigo-900 text-white">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold text-indigo-200 mb-6">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered IELTS Practice
          </div>

          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
            Thi Thử IELTS
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-300">
              4 Kỹ Năng Đầy Đủ
            </span>
          </h1>

          <p className="text-lg text-indigo-200 max-w-2xl mx-auto leading-relaxed mb-8">
            Trải nghiệm kỳ thi IELTS thật sự. Chấm điểm Listening & Reading tức thì.
            Writing & Speaking được AI phân tích và gửi phản hồi qua email.
          </p>

          {/* Skill pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {ALL_SKILLS.map((skill) => {
              const { icon: Icon, color } = SKILL_ICONS[skill];
              return (
                <div
                  key={skill}
                  className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${color} px-4 py-2 text-sm font-semibold text-white shadow-md`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {skill}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────

function ExamCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 rounded-lg w-3/4" />
          <div className="h-4 bg-gray-100 rounded-lg w-full" />
          <div className="h-4 bg-gray-100 rounded-lg w-2/3" />
          <div className="flex gap-2 mt-2">
            <div className="h-6 w-20 bg-gray-100 rounded-full" />
            <div className="h-6 w-16 bg-gray-100 rounded-full" />
            <div className="h-6 w-24 bg-gray-100 rounded-full" />
          </div>
        </div>
        <div className="w-28 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
      </div>
    </div>
  );
}

// ── Exam Card ─────────────────────────────────────────────────────

function ExamCard({ exam, href }: { exam: MockSkillExamDef; href: string }) {
  const content = exam.content_public as Record<string, unknown> | null | undefined;

  // Detect how many skills are configured
  const skills = (["listening", "reading", "speaking", "writing"] as const).filter(
    (s) => content?.[s]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          <BookOpen className="w-6 h-6 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base leading-snug mb-1 truncate">
            {exam.title}
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">
            {exam.description || "Bài thi đầy đủ 4 kỹ năng IELTS: Listening, Reading, Speaking, Writing."}
          </p>

          {/* Meta chips */}
          <div className="flex flex-wrap items-center gap-2">
            {skills.map((s) => {
              const { icon: Icon, color } = SKILL_ICONS[s.charAt(0).toUpperCase() + s.slice(1) as keyof typeof SKILL_ICONS] || {};
              if (!Icon) return null;
              return (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${color} px-2.5 py-0.5 text-[11px] font-semibold text-white`}
                >
                  <Icon className="w-3 h-3" />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              );
            })}

            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-500 px-2.5 py-0.5 text-[11px] font-medium">
              <Clock className="w-3 h-3" />
              ~165 phút
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 text-[11px] font-medium">
              <Star className="w-3 h-3" />
              Academic
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex-shrink-0 self-center">
          <Link href={href}>
            <button
              type="button"
              className="rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white px-5 py-2.5 text-sm font-bold hover:opacity-90 transition-all shadow-sm hover:shadow-md whitespace-nowrap"
            >
              Bắt đầu
            </button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Empty State ───────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Search className="w-8 h-8 text-gray-300" />
      </div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">
        {query ? `Không tìm thấy kết quả cho "${query}"` : "Chưa có đề thi nào"}
      </h3>
      <p className="text-gray-400 text-sm max-w-xs mx-auto">
        {query
          ? "Hãy thử từ khóa khác hoặc bỏ bộ lọc."
          : "Các đề thi đang được chuẩn bị. Vui lòng quay lại sau."}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

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
    return exams.filter((e) =>
      e.title.toLowerCase().includes(q) || (e.description || "").toLowerCase().includes(q)
    );
  }, [exams, search]);

  return (
    <PublicPageShell>
      <div>
        <Hero />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          {/* Search & filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm đề thi..."
                className="w-full rounded-xl border-2 border-gray-200 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Stats bar */}
          {!loading && (
            <div className="flex items-center gap-2 mb-5">
              <span className="text-sm text-gray-500">
                {filtered.length} đề thi{search ? ` cho "${search}"` : ""}
              </span>
            </div>
          )}

          {/* Cards */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <ExamCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState query={search} />
          ) : (
            <div className="space-y-4">
              {filtered.map((exam) => (
                <ExamCard key={exam.id} exam={exam} href={`/thi-thu/${exam.slug}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicPageShell>
  );
}
