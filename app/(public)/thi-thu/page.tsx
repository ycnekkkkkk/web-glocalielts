"use client";

import PublicPageShell from "@/components/layout/PublicPageShell";
import { Card } from "@/components/ui/Card";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MockSkillExamDef } from "@/types";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  BookOpen,
  BookOpenCheck,
  CheckCircle,
  Clock,
  Headphones,
  Laptop,
  LineChart,
  Mail,
  Mic,
  PenLine,
  ScrollText,
  Search,
  Star,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const SKILL_ICONS = {
  Listening: { icon: Headphones, color: "from-blue-500 to-sky-600" },
  Reading: { icon: ScrollText, color: "from-emerald-500 to-teal-600" },
  Speaking: { icon: Mic, color: "from-amber-500 to-orange-600" },
  Writing: { icon: PenLine, color: "from-purple-500 to-violet-600" },
};

const ALL_SKILLS = Object.keys(SKILL_ICONS) as (keyof typeof SKILL_ICONS)[];

// ── Hero Section ──────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="relative overflow-hidden pt-[72px]"
      style={{
        height: 350,
        background: "linear-gradient(135deg, #6C63FF 0%, #8B5CF6 50%, #A78BFA 100%)",
      }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-6 right-32 w-44 h-44 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-10 left-1/3 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center">
        {/* Left: text content */}
        <div className="flex-1 max-w-xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold text-white mb-5">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered IELTS Practice
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight mb-3">
            IELTS Mock Test
          </h1>

          {/* Subheading */}
          <p className="text-sm text-white/80 leading-relaxed mb-4 max-w-lg">
            Mô phỏng bài thi IELTS thực tế với đầy đủ 4 kỹ năng:{" "}
            <span className="font-semibold text-white">Listening, Speaking, Reading và Writing.</span>
          </p>

          <p className="text-xs text-white/60 leading-relaxed mb-5">
            Listening & Reading được chấm điểm tự động. Speaking & Writing được AI phân tích chi tiết và gửi kết
            quả sau khi hoàn thành.
          </p>

          {/* Feature stats */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {[
              { label: "4 kỹ năng đầy đủ", highlight: false },
              { label: "165 phút", highlight: false },
              { label: "AI chấm Speaking & Writing", highlight: false },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-1.5 text-white/90">
                <div className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: premium 3D illustration */}
        <div className="hidden lg:flex items-center justify-center w-64 shrink-0">
          <div className="relative w-56 h-44">
            {/* ── LAPTOP (center, 60%) ── */}
            {/* Base/keyboard */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{
                width: 100,
                height: 6,
                borderRadius: "0 0 4px 4px",
                background: "rgba(255,255,255,0.25)",
              }}
            />
            {/* Screen outer */}
            <div
              className="absolute bottom-5 left-1/2 -translate-x-1/2"
              style={{
                width: 90,
                height: 58,
                borderRadius: "8px 8px 0 0",
                background: "rgba(255,255,255,0.15)",
                border: "1.5px solid rgba(255,255,255,0.35)",
              }}
            >
              {/* Screen inner */}
              <div
                className="absolute inset-1 rounded-md overflow-hidden"
                style={{
                  background: "rgba(10,10,30,0.45)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {/* Score label */}
                <div
                  className="text-center text-white/40 text-[6px] font-semibold tracking-widest pt-1"
                  style={{ fontFamily: "monospace" }}
                >
                  OVERALL BAND SCORE
                </div>
                {/* Score */}
                <div
                  className="text-center text-white font-black"
                  style={{ fontSize: 20, lineHeight: 1 }}
                >
                  7.0
                </div>
                {/* Good user */}
                <div className="text-center text-white/40 text-[5px]">Good User</div>
                {/* Divider */}
                <div className="mx-2 border-t border-white/10 my-0.5" />
                {/* Skills breakdown */}
                <div className="px-2 pt-0.5 space-y-px">
                  {[
                    { label: "Listening", score: "7.5" },
                    { label: "Reading", score: "6.5" },
                    { label: "Speaking", score: "6.5" },
                    { label: "Writing", score: "6.0" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="text-white/40 text-[5px]">{s.label}</span>
                      <span className="text-white/70 text-[5px] font-mono">{s.score}</span>
                    </div>
                  ))}
                </div>
                {/* AI Feedback */}
                <div className="mx-2 border-t border-white/10 mt-px" />
                <div className="text-center text-brand-300/80 text-[5px] py-px">AI Feedback</div>
              </div>
            </div>

            {/* ── HEADPHONE (left of laptop) ── */}
            <div
              className="absolute bottom-7 left-0"
              style={{ width: 22, height: 28 }}
            >
              {/* Left ear cup */}
              <div
                className="absolute left-0 bottom-0 rounded-full"
                style={{
                  width: 14,
                  height: 14,
                  background: "rgba(255,255,255,0.25)",
                  border: "1px solid rgba(255,255,255,0.4)",
                }}
              />
              {/* Right ear cup */}
              <div
                className="absolute right-0 bottom-0 rounded-full"
                style={{
                  width: 14,
                  height: 14,
                  background: "rgba(255,255,255,0.25)",
                  border: "1px solid rgba(255,255,255,0.4)",
                }}
              />
              {/* Headband arc */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 rounded-t-full"
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderBottom: "none",
                }}
              />
            </div>

            {/* ── BOOK STACK (right of laptop) ── */}
            <div className="absolute bottom-5 right-0 flex flex-col gap-px">
              {/* IELTS */}
              <div
                className="rounded-sm"
                style={{
                  width: 26,
                  height: 7,
                  background: "linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
              />
              {/* Practice */}
              <div
                className="rounded-sm"
                style={{
                  width: 26,
                  height: 8,
                  background: "linear-gradient(135deg, #8B5CF6 0%, #6C63FF 100%)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
              />
              {/* Mock Tests */}
              <div
                className="rounded-sm"
                style={{
                  width: 26,
                  height: 7,
                  background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
              />
            </div>

            {/* ── SMALL PLANT (behind books) ── */}
            <div className="absolute bottom-14 right-3" style={{ width: 10, height: 16 }}>
              {/* Stem */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2"
                style={{ width: 2, height: 8, background: "rgba(255,255,255,0.4)", borderRadius: 1 }}
              />
              {/* Leaves */}
              <div
                className="absolute top-0 left-0 rounded-full"
                style={{
                  width: 7,
                  height: 7,
                  background: "rgba(134,239,172,0.6)",
                }}
              />
              <div
                className="absolute top-1 right-0 rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: "rgba(107,210,139,0.5)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────

function ExamCardSkeleton() {
  return (
    <div className="h-80 rounded-2xl border border-gray-100 bg-white shadow-(--shadow-card) animate-pulse" />
  );
}

// ── Main Featured Test Card ──────────────────────────────────────

function FeaturedTestCard({ exam, href }: { exam: MockSkillExamDef; href: string }) {
  const content = exam.content_public as Record<string, unknown> | null | undefined;
  const skills = (
    ["listening", "reading", "speaking", "writing"] as const
  ).filter((s) => content?.[s]);

  const skillsMeta = [
    { name: "Listening", duration: "30 phút", questions: "40 câu hỏi" },
    { name: "Reading", duration: "60 phút", questions: "40 câu hỏi" },
    { name: "Speaking", duration: "11-14 phút", questions: "3 phần thi" },
    { name: "Writing", duration: "60 phút", questions: "2 bài viết" },
  ];

  return (
    <Card className="overflow-hidden border-brand-100/50 shadow-(--shadow-card)">
      <div className="flex flex-col lg:flex-row">
        {/* Left: cover visual */}
        <div className="relative w-full lg:w-72 shrink-0 aspect-video lg:aspect-auto overflow-hidden"
          style={{ background: "linear-gradient(135deg, #6C63FF 0%, #8B5CF6 50%, #A78BFA 100%)" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <Laptop className="w-14 h-14 opacity-80" />
            <div className="text-xs font-bold tracking-widest opacity-70">IELTS</div>
            <div className="text-xs opacity-60">Academic</div>
          </div>
          <div className="absolute top-3 left-3">
            <span className="bg-white text-brand-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              Academic
            </span>
          </div>
        </div>

        {/* Center: info */}
        <div className="flex-1 p-6 lg:p-8">
          <div className="mb-1">
            <span className="text-xs font-semibold text-brand-600 tracking-wide uppercase">Practice Test 02</span>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-3 leading-tight">
            {exam.title}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-5 max-w-md">
            Bài thi đầy đủ 4 kỹ năng theo format IELTS Academic mới nhất.
            <br />
            Kết quả chi tiết cùng đánh giá cá nhân hóa sẽ được gửi qua email sau khi hoàn thành.
          </p>

          {/* Skills grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {skillsMeta.map((skill) => {
              const cfg = SKILL_ICONS[skill.name as keyof typeof SKILL_ICONS];
              if (!cfg) return null;
              const Icon = cfg.icon;
              return (
                <div
                  key={skill.name}
                  className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-center"
                >
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mx-auto mb-2 shadow-sm">
                    <Icon className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="text-xs font-bold text-gray-800 mb-0.5">{skill.name}</div>
                  <div className="text-[10px] text-gray-400 leading-tight">{skill.duration}</div>
                  <div className="text-[10px] text-gray-400 leading-tight">{skill.questions}</div>
                </div>
              );
            })}
          </div>

          {/* Statistics */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Tổng thời gian: <span className="font-semibold text-gray-700">165 phút</span>
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpenCheck className="w-3.5 h-3.5 text-gray-400" />
              Hình thức: <span className="font-semibold text-gray-700">4 kỹ năng</span>
            </span>
            <span className="flex items-center gap-1.5">
              <LineChart className="w-3.5 h-3.5 text-gray-400" />
              Độ khó: <span className="font-semibold text-gray-700">Trung bình – Khó</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
              Đã tham gia: <span className="font-semibold text-gray-700">1.245 lượt thi</span>
            </span>
          </div>
        </div>

        {/* Right: CTA */}
        <div className="flex flex-col items-center justify-center gap-3 p-6 lg:p-8 border-t lg:border-t-0 lg:border-l border-gray-100 bg-gray-50/30 lg:min-w-[200px]">
          <Link href={href}>
            <button
              type="button"
              className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 text-sm font-bold transition-colors shadow-md cursor-pointer whitespace-nowrap"
            >
              Bắt đầu thi ngay
            </button>
          </Link>
          <p className="text-[10px] text-gray-400 text-center leading-relaxed px-2">
            Kết quả được lưu tự động sau khi hoàn thành.
          </p>
        </div>
      </div>
    </Card>
  );
}

// ── Exam Card (compact, fallback) ────────────────────────────────

function ExamCard({ exam, href }: { exam: MockSkillExamDef; href: string }) {
  const content = exam.content_public as Record<string, unknown> | null | undefined;
  const skills = (
    ["listening", "reading", "speaking", "writing"] as const
  ).filter((s) => content?.[s]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-brand-500 to-sky-600 shrink-0 group-hover:scale-105 transition-transform">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base leading-snug mb-1 truncate">{exam.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">
            {exam.description || "Bài thi đầy đủ 4 kỹ năng IELTS."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {skills.map((s) => {
              const cfg = SKILL_ICONS[s.charAt(0).toUpperCase() + s.slice(1) as keyof typeof SKILL_ICONS];
              if (!cfg) return null;
              const Icon = cfg.icon;
              return (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1 rounded-full bg-linear-to-r ${cfg.color} px-2.5 py-0.5 text-[11px] font-semibold text-white`}
                >
                  <Icon className="w-3 h-3" />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              );
            })}
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-500 px-2.5 py-0.5 text-[11px] font-medium">
              <Clock className="w-3 h-3" />~165 phút
            </span>
          </div>
        </div>
        <div className="shrink-0 self-center">
          <Link href={href}>
            <button
              type="button"
              className="rounded-xl bg-linear-to-r from-brand-600 to-sky-600 text-white px-5 py-2.5 text-sm font-bold hover:opacity-90 transition-all shadow-sm hover:shadow-md whitespace-nowrap cursor-pointer"
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
        {query ? "Hãy thử từ khóa khác hoặc bỏ bộ lọc." : "Các đề thi đang được chuẩn bị. Vui lòng quay lại sau."}
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
        .select(
          "id, slug, title, description, is_active, created_at, updated_at, content_public"
        )
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
      {/* Hero */}
      <Hero />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Section title */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-1">
            <span>📖</span> Bài thi IELTS hoàn chỉnh
          </h2>
          <p className="text-sm text-gray-500">
            Trải nghiệm bài thi đầy đủ 4 kỹ năng theo format IELTS thực tế.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm đề thi..."
            className="w-full rounded-xl border-2 border-gray-200 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors bg-white shadow-(--shadow-card)"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            <ExamCardSkeleton />
            {[1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white shadow-(--shadow-card) animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState query={search} />
        ) : (
          <>
            {/* Featured test card */}
            {featured && (
              <div className="mb-6">
                <FeaturedTestCard exam={featured} href={`/thi-thu/${featured.slug}`} />
              </div>
            )}

            {/* Rest of exams */}
            {rest.length > 0 && (
              <div className="space-y-4 mb-10">
                {rest.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} href={`/thi-thu/${exam.slug}`} />
                ))}
              </div>
            )}

            {/* ── Benefits Section ── */}
            <section className="mb-8">
              <Card className="p-8 border-brand-100/50 shadow-(--shadow-card)">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
                  {[
                    {
                      icon: <BrainCircuit className="w-7 h-7" />,
                      title: "AI chấm điểm thông minh",
                      desc: "Phân tích Speaking & Writing với độ chính xác cao.",
                    },
                    {
                      icon: <LineChart className="w-7 h-7" />,
                      title: "Báo cáo chi tiết",
                      desc: "Phân tích điểm mạnh, điểm yếu và lộ trình cải thiện.",
                    },
                    {
                      icon: <CheckCircle className="w-7 h-7" />,
                      title: "Mô phỏng sát thực tế",
                      desc: "Giao diện và thời gian chuẩn như bài thi thật.",
                    },
                    {
                      icon: <Mail className="w-7 h-7" />,
                      title: "Kết quả qua email",
                      desc: "Nhận kết quả và phản hồi chi tiết ngay sau khi thi.",
                    },
                  ].map((b) => (
                    <div key={b.title} className="flex flex-col items-center text-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                        {b.icon}
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">{b.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{b.desc}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            {/* ── Final CTA ── */}
            <section
              className="rounded-2xl overflow-hidden text-white text-center py-12 px-6"
              style={{
                background: "linear-gradient(135deg, #6C63FF 0%, #8B5CF6 50%, #A78BFA 100%)",
              }}
            >
              {/* Background blobs */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-white/5 blur-3xl" />
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 leading-tight">
                  Sẵn sàng chinh phục mục tiêu IELTS của bạn?
                </h2>
                <p className="text-white/80 text-sm mb-6 max-w-md mx-auto">
                  Hãy bắt đầu bài thi và kiểm tra trình độ ngay hôm nay.
                </p>
                {featured && (
                  <Link href={`/thi-thu/${featured.slug}`}>
                    <button
                      type="button"
                      className="rounded-xl bg-white text-brand-600 px-8 py-3 text-sm font-bold hover:bg-white/90 transition-colors shadow-lg cursor-pointer"
                    >
                      Bắt đầu thi ngay
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
