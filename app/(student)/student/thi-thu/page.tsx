"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MockSkillExamDef } from "@/types";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, Clock, Headphones, Mic, PenLine, ScrollText, Search, Star, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const SKILL_ICONS = {
  listening: { icon: Headphones, color: "from-blue-500 to-sky-600", label: "Listening" },
  reading: { icon: ScrollText, color: "from-emerald-500 to-teal-600", label: "Reading" },
  speaking: { icon: Mic, color: "from-sky-500 to-sky-600", label: "Speaking" },
  writing: { icon: PenLine, color: "from-amber-500 to-orange-600", label: "Writing" },
} as const;

function ExamCard({ exam, attemptCount }: { exam: MockSkillExamDef; attemptCount: number }) {
  const content = exam.content_public as Record<string, unknown> | null | undefined;
  const skills = (["listening", "reading", "speaking", "writing"] as const).filter((s) => content?.[s]);
  const hasResume = typeof window !== "undefined" && Boolean(localStorage.getItem(`exam-session-${exam.slug}`));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-sky-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          <BookOpen className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-gray-900 text-base leading-snug">{exam.title}</h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {hasResume && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-bold">
                  ↺ Đang dở
                </span>
              )}
              {attemptCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-700 px-2.5 py-0.5 text-xs font-bold border border-sky-100">
                  <Trophy className="w-3 h-3" />
                  {attemptCount} lần thi
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-3 leading-relaxed line-clamp-2">
            {exam.description || "Bài thi đầy đủ 4 kỹ năng IELTS."}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => {
              const { icon: Icon, color, label } = SKILL_ICONS[s];
              return (
                <span key={s} className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${color} px-2.5 py-0.5 text-[11px] font-bold text-white`}>
                  <Icon className="w-3 h-3" />{label}
                </span>
              );
            })}
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-500 px-2.5 py-0.5 text-[11px] font-medium">
              <Clock className="w-3 h-3" />~165 phút
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 self-center">
          <Link href={`/student/thi-thu/${exam.slug}`}>
            <button
              type="button"
              className="rounded-xl bg-gradient-to-r from-brand-600 to-sky-600 text-white px-4 py-2 text-sm font-bold hover:opacity-90 transition-all shadow-sm whitespace-nowrap"
            >
              {hasResume ? "Tiếp tục" : attemptCount > 0 ? "Thi lại" : "Bắt đầu"}
            </button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function StudentMockSkillPage() {
  const [rows, setRows] = useState<MockSkillExamDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // Map examId → số lần thi
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();

      // Load exams
      const { data: exams } = await supabase
        .from("mock_skill_exam_defs")
        .select("id, slug, title, description, is_active, created_at, updated_at, content_public")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setRows((exams as MockSkillExamDef[]) || []);

      // Load attempt counts via API (bypasses RLS, uses server-side auth)
      try {
        const res = await fetch("/api/mock-skill/my-attempts");
        if (res.ok) {
          const json = await res.json() as { counts: Record<string, number> };
          setAttemptCounts(json.counts || {});
        }
      } catch {
        // silent — just won't show count
      }

      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.title.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-sky-600 flex items-center justify-center">
              <Star className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Thi Thử IELTS</h1>
          </div>
          <Link
            href="/student/thi-thu/history"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 hover:text-brand-700 hover:border-brand-300 transition-all shadow-sm"
          >
            <ScrollText className="w-4 h-4" />
            Lịch sử thi
          </Link>
        </div>
        <p className="text-sm text-gray-500 ml-10">
          Listening &amp; Reading chấm ngay. Writing &amp; Speaking AI chấm và gửi qua email.
        </p>
      </div>

      {/* Feature callouts */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {[
          { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50", title: "Chấm điểm tức thì", desc: "L/R tự động chấm" },
          { icon: Star, color: "text-sky-600 bg-sky-50", title: "AI chấm Writing", desc: "AI feedback" },
          { icon: Mic, color: "text-blue-600 bg-blue-50", title: "AI chấm Speaking", desc: "Phân tích phát âm" },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="rounded-xl border border-gray-100 bg-white p-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm đề thi..."
          className="w-full rounded-xl border-2 border-gray-200 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl border border-gray-100 bg-white animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">{search ? `Không tìm thấy kết quả cho "${search}"` : "Chưa có đề thi nào được kích hoạt."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              attemptCount={attemptCounts[exam.id] ?? 0}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
