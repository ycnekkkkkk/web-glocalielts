"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MockSkillExamDef, MockSkillSubmission } from "@/types";
import BackButton from "@/components/ui/BackButton";
import { 
  AlertCircle,
  Award,
  Bot, 
  Check, 
  BookOpen,
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  ExternalLink, 
  FileText, 
  FolderOpen, 
  Headphones,
  HelpCircle, 
  Loader2, 
  Mic,
  PenTool,
  Search, 
  Sparkles, 
  Trash2, 
  User,
  X, 
  XCircle 
} from "lucide-react";
import { use, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { rawScoreToBand } from "@/lib/mock-skill/band-mapping";

type Candidate = { full_name?: string; email?: string; phone?: string; birth_year?: string; hometown?: string };

type SkillScore = { correct?: number; total?: number; band?: number; items?: Array<{ id: string; expected: string; actual: string; ok: boolean }> };
type AIScore = {
  band?: number;
  criteria?: Record<string, number>;
  feedback?: {
    strengths?: string[];
    weaknesses?: string[];
    grammar_issues?: Array<{ original: string; suggestion: string; explanation: string; example?: string }>;
    vocabulary_suggestions?: Array<{ original: string; suggestion: string; explanation: string; example?: string }>;
    pronunciation_issues?: Array<{ word: string; correct_pronunciation: string; tip: string; example?: string }>;
    natural_suggestions?: Array<{ original: string; improved: string; explanation?: string; example?: string }>;
    improved_sample?: string;
  };
  transcript?: string;
  word_count?: number;
};
type SummaryScore = { overall_band?: number; level?: string; overview?: string; strengths?: string[]; weaknesses?: string[]; recommendations?: string[]; skill_balance?: string };
type Scores = { listening?: SkillScore; reading?: SkillScore; writing?: AIScore; speaking?: AIScore; summary?: SummaryScore };

type AnswersRaw = {
  listening?: Record<string, unknown>;
  reading?: Record<string, unknown>;
  writingText?: string;
  speakingDriveFileId?: string;
  speakingDriveUrl?: string;
  speakingAudios?: Array<{ key: string; name: string; driveFileId: string; driveUrl: string }>;
};

// ── Status helpers ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "danger" | "gray" | "info" }> = {
  pending:    { label: "Chờ chấm",    variant: "warning" },
  grading:    { label: "Đang chấm",   variant: "info" },
  graded:     { label: "Đã chấm",     variant: "success" },
  completed:  { label: "Hoàn thành",  variant: "success" },
  processing: { label: "Xử lý",       variant: "warning" },
  failed:     { label: "Lỗi",         variant: "danger" },
};

export function getSubmissionDisplayStatus(sub: MockSkillSubmission): { label: string; variant: "success" | "warning" | "danger" | "gray" | "info" } {
  const sc = (sub.scores || {}) as Scores;
  const raw = (sub.answers_raw || {}) as AnswersRaw;
  const hasWritingContent = Boolean(raw.writingText && raw.writingText.trim().length > 10);
  const hasSpeakingContent = Boolean((raw.speakingAudios && raw.speakingAudios.length > 0) || raw.speakingDriveUrl);

  if (sub.status === "failed") return { label: "Lỗi", variant: "danger" };
  if (sub.status === "grading") return { label: "Đang chấm", variant: "info" };

  const needWriting = hasWritingContent && !sc.writing;
  const needSpeaking = hasSpeakingContent && !sc.speaking;

  if (needWriting || needSpeaking) {
    const missing: string[] = [];
    if (needWriting) missing.push("Writing");
    if (needSpeaking) missing.push("Speaking");
    return { label: `Chờ chấm ${missing.join(" + ")}`, variant: "warning" };
  }

  if (sc.writing || sc.speaking || sc.listening || sc.reading) {
    return { label: "Đã chấm đủ", variant: "success" };
  }

  return STATUS_CONFIG[sub.status] || { label: sub.status, variant: "gray" };
}

// ── Band pill ───────────────────────────────────────────────────
function BandPill({ label, band }: { label: string; band?: number }) {
  if (!band) return <span className="text-gray-300 text-xs">{label}:—</span>;
  const cls = band >= 7 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : band >= 5 ? "text-blue-700 bg-blue-50 border-blue-200"
    : "text-amber-700 bg-amber-50 border-amber-200";
  return <span className={`inline-flex items-center border rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{label} {band}</span>;
}

// ── Skill Answer Review ───────────────────────────────────────────
function SkillAnswerReview({
  skill,
  items,
  band,
  correctCount,
  totalCount,
  updatingId,
  onToggle,
}: {
  skill: "listening" | "reading";
  items: Array<{ id: string; expected: string; actual: string; ok: boolean }>;
  band?: number;
  correctCount?: number;
  totalCount?: number;
  updatingId: string | null;
  onToggle: (skill: "listening" | "reading", id: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "incorrect" | "correct">("all");
  const [search, setSearch] = useState("");

  if (!items || !items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center bg-gray-50/50">
        <p className="text-gray-400 text-sm">Chưa có dữ liệu câu trả lời cho phần thi này.</p>
      </div>
    );
  }

  const correct = correctCount ?? items.filter((x) => x.ok).length;
  const total = totalCount ?? items.length;
  const incorrect = total - correct;
  const pct = Math.round((correct / (total || 1)) * 100);

  const filtered = items.filter((x) => {
    if (filter === "incorrect" && x.ok) return false;
    if (filter === "correct" && !x.ok) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const idMatches = x.id.toLowerCase().includes(q);
      const actualMatches = (x.actual || "").toLowerCase().includes(q);
      const expectedMatches = (x.expected || "").toLowerCase().includes(q);
      if (!idMatches && !actualMatches && !expectedMatches) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Performance Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200/80 shadow-xs">
        {/* Band */}
        <div className="flex items-center gap-3.5 border-b sm:border-b-0 sm:border-r border-gray-100 pb-3 sm:pb-0 sm:pr-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-brand-500/20 shrink-0">
            {band != null ? band.toFixed(1) : "—"}
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">IELTS Band</p>
            <p className="text-sm font-extrabold text-gray-900 capitalize">{skill === "listening" ? "Listening Score" : "Reading Score"}</p>
          </div>
        </div>

        {/* Accuracy Progress */}
        <div className="flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-gray-100 pb-3 sm:pb-0 sm:pr-4">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-gray-600">Độ chính xác:</span>
            <span className="text-brand-700">{correct} / {total} câu ({pct}%)</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Metric Badges */}
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl bg-emerald-50 border border-emerald-100 p-2 text-center">
            <p className="text-[11px] font-semibold text-emerald-600">Đúng</p>
            <p className="text-base font-black text-emerald-700">{correct}</p>
          </div>
          <div className="flex-1 rounded-xl bg-rose-50 border border-rose-100 p-2 text-center">
            <p className="text-[11px] font-semibold text-rose-600">Sai / Bỏ</p>
            <p className="text-base font-black text-rose-700">{incorrect}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Tất cả ({total})
          </button>
          <button
            type="button"
            onClick={() => setFilter("incorrect")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "incorrect" ? "bg-rose-600 text-white shadow-xs" : "text-gray-500 hover:text-rose-600"
            }`}
          >
            ❌ Câu sai ({incorrect})
          </button>
          <button
            type="button"
            onClick={() => setFilter("correct")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "correct" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-500 hover:text-emerald-600"
            }`}
          >
            ✅ Câu đúng ({correct})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Lọc câu, đáp án..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-44"
          />
        </div>
      </div>

      <p className="text-[11px] text-gray-400 italic">
        💡 Bạn có thể bấm vào thẻ câu bất kỳ bên dưới để đổi kết quả Đúng ↔ Sai nếu cần điều chỉnh điểm thủ công.
      </p>

      {/* Answers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[400px] overflow-y-auto pr-1">
        {filtered.map((x) => {
          const cleanNumber = x.id.replace(/^[lr]/i, "");
          return (
            <div
              key={x.id}
              onClick={() => onToggle(skill, x.id)}
              className={`group relative rounded-2xl p-3 border transition-all cursor-pointer select-none ${
                updatingId === x.id ? "opacity-50 pointer-events-none" : ""
              } ${
                x.ok
                  ? "bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                  : "bg-rose-50/40 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                      x.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                    }`}
                  >
                    {cleanNumber || x.id}
                  </span>
                  <span className="text-xs font-bold text-gray-700">Câu #{cleanNumber || x.id}</span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    x.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {x.ok ? "✓ ĐÚNG" : "✗ SAI"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-start justify-between bg-white/90 rounded-xl px-2.5 py-1.5 border border-gray-100">
                  <span className="text-gray-400 text-[11px] shrink-0 font-medium">Học viên:</span>
                  <span className={`font-bold ml-2 text-right break-all ${
                    x.actual ? (x.ok ? "text-emerald-700 font-extrabold" : "text-rose-700") : "text-gray-400 italic font-normal"
                  }`}>
                    {x.actual ? x.actual : "∅ (Bỏ trống)"}
                  </span>
                </div>
                <div className="flex items-start justify-between bg-white/90 rounded-xl px-2.5 py-1.5 border border-gray-100">
                  <span className="text-gray-400 text-[11px] shrink-0 font-medium">Đáp án chuẩn:</span>
                  <span className="font-bold text-brand-700 ml-2 text-right break-all">{x.expected}</span>
                </div>
              </div>

              <div className="mt-2 text-center border-t border-dashed border-gray-200/50 pt-1.5">
                <span className="text-[10px] text-gray-400 group-hover:text-brand-600 font-medium transition-colors">
                  Bấm để chuyển thành: <strong className={x.ok ? "text-rose-600" : "text-emerald-600"}>{x.ok ? "Sai" : "Đúng"}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-gray-400 text-xs py-8">Không tìm thấy câu hỏi nào phù hợp bộ lọc.</p>
      )}
    </div>
  );
}

// ── AI Score Display ────────────────────────────────────────────
function AIScoreDisplay({ skill, score }: { skill: "writing" | "speaking"; score?: AIScore }) {
  const [copiedSample, setCopiedSample] = useState(false);

  if (!score) return null;

  const criteriaLabels: Record<string, { label: string; desc: string }> = {
    task_achievement: { label: "Task Achievement / Response", desc: "Mức độ hoàn thành đề bài & phát triển luận điểm" },
    coherence_cohesion: { label: "Coherence & Cohesion", desc: "Tính liên kết, bố cục đoạn & logic lập luận" },
    lexical_resource: { label: "Lexical Resource", desc: "Vốn từ vựng, độ phong phú & chính xác ngữ cảnh" },
    grammatical_range_accuracy: { label: "Grammar Range & Accuracy", desc: "Độ đa dạng cấu trúc & độ chuẩn ngữ pháp" },
    fluency_coherence: { label: "Fluency & Coherence", desc: "Độ trôi chảy, nhịp điệu & mạch lạc nói" },
    pronunciation: { label: "Pronunciation", desc: "Phát âm, trọng âm, ngữ điệu & nối âm" },
  };

  const band = score.band ?? 0;
  const levelText = band >= 8 ? "Very Good User (C2)" : band >= 7 ? "Good User (C1)" : band >= 6 ? "Competent User (B2)" : band >= 5 ? "Modest User (B1)" : "Limited User";

  function copySample() {
    if (score?.feedback?.improved_sample) {
      navigator.clipboard.writeText(score.feedback.improved_sample);
      setCopiedSample(true);
      toast.success("Đã sao chép bài viết mẫu!");
      setTimeout(() => setCopiedSample(false), 2000);
    }
  }

  return (
    <div className="space-y-5">
      {/* Hero Band Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-50/80 via-white to-brand-50/30 border border-brand-100 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 text-white flex flex-col items-center justify-center shadow-lg shadow-brand-600/20 shrink-0">
              <span className="text-2xl font-black leading-none">{band ? band.toFixed(1) : "—"}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-80">Band</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-gray-900 uppercase tracking-wide">
                  {skill === "writing" ? "IELTS Writing" : "IELTS Speaking"}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
                  {levelText}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Chấm điểm theo tiêu chuẩn chính thống Cambridge / IDP Band Descriptors
              </p>
            </div>
          </div>
        </div>

        {/* 4 Criteria Grid */}
        {score.criteria && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-brand-100/60">
            {Object.entries(score.criteria).map(([k, v]) => {
              const info = criteriaLabels[k] || { label: k, desc: "" };
              const val = Number(v) || 0;
              const barWidth = Math.min(100, Math.round((val / 9) * 100));
              return (
                <div key={k} className="rounded-xl border border-gray-100 bg-white p-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-gray-700 truncate" title={info.label}>{info.label}</p>
                    <span className="text-sm font-black text-brand-700 shrink-0">{val.toFixed(1)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        val >= 7 ? "bg-emerald-500" : val >= 6 ? "bg-blue-500" : val >= 5 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  {info.desc && <p className="text-[10px] text-gray-400 mt-1 truncate">{info.desc}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Strengths & Weaknesses */}
      {score.feedback && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/40 to-white p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">✓</span>
              <h4 className="text-sm font-bold text-emerald-900">Điểm mạnh nổi bật</h4>
            </div>
            {(score.feedback.strengths || []).length > 0 ? (
              <ul className="space-y-2">
                {score.feedback.strengths!.map((s, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400 italic">Chưa ghi nhận điểm mạnh cụ thể.</p>
            )}
          </div>

          {/* Weaknesses */}
          <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/40 to-white p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">⚠️</span>
              <h4 className="text-sm font-bold text-amber-900">Điểm cần khắc phục</h4>
            </div>
            {(score.feedback.weaknesses || []).length > 0 ? (
              <ul className="space-y-2">
                {score.feedback.weaknesses!.map((w, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400 italic">Chưa ghi nhận điểm yếu.</p>
            )}
          </div>
        </div>
      )}

      {/* Writing Specific: Grammar & Vocab */}
      {skill === "writing" && score.feedback && (
        <div className="space-y-4">
          {/* Grammar Issues */}
          {score.feedback.grammar_issues && score.feedback.grammar_issues.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">
                  🔍 Chi tiết lỗi Ngữ pháp & Câu từ
                </h4>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                  {score.feedback.grammar_issues.length} lỗi cần sửa
                </span>
              </div>

              <div className="space-y-3">
                {(score.feedback.grammar_issues as any[]).map((item: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-rose-100 bg-white p-4 shadow-xs space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md shrink-0">Bản gốc</span>
                      <p className="text-xs text-rose-900 font-mono line-through leading-relaxed break-words">{item.original}</p>
                    </div>
                    <div className="flex items-start gap-2 border-t border-dashed border-gray-100 pt-2">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">Gợi ý sửa</span>
                      <p className="text-xs text-emerald-800 font-bold leading-relaxed break-words">{item.suggestion}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed">
                      <span className="font-bold text-gray-700 block mb-0.5">📖 Giải thích:</span>
                      {item.explanation}
                    </div>
                    {item.example && (
                      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 text-xs text-blue-900 leading-relaxed">
                        <span className="font-bold block mb-0.5">💡 Ví dụ áp dụng:</span>
                        {item.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vocabulary Suggestions */}
          {score.feedback.vocabulary_suggestions && score.feedback.vocabulary_suggestions.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">
                  🚀 Gợi ý nâng cấp Từ vựng (Band 8.0+)
                </h4>
                <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
                  {score.feedback.vocabulary_suggestions.length} từ nâng cấp
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(score.feedback.vocabulary_suggestions as any[]).map((item: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Từ hiện tại</span>
                      <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">Nâng cấp</span>
                    </div>
                    <div className="flex items-center gap-2 justify-between">
                      <p className="text-xs text-gray-500 font-mono italic">{item.original}</p>
                      <p className="text-xs text-emerald-700 font-extrabold">{item.suggestion}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed">
                      <span className="font-bold text-gray-700 block mb-0.5">💡 Hướng dẫn:</span>
                      {item.explanation}
                    </div>
                    {item.example && (
                      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 text-xs text-blue-900 leading-relaxed">
                        <span className="font-bold block mb-0.5">💡 Ví dụ câu:</span>
                        {item.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improved Sample */}
          {score.feedback.improved_sample && (
            <div className="space-y-2.5 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">
                  ✍️ Bài viết mẫu nâng Band hoàn chỉnh
                </h4>
                <Button size="sm" variant="outline" onClick={copySample} icon={<Copy className="w-3.5 h-3.5" />}>
                  {copiedSample ? "Đã chép" : "Sao chép bài mẫu"}
                </Button>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-4 text-xs text-gray-700 leading-relaxed font-serif whitespace-pre-wrap max-h-96 overflow-y-auto">
                {score.feedback.improved_sample}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Speaking Specific */}
      {skill === "speaking" && score.feedback && (
        <div className="space-y-4">
          {score.transcript && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-gray-500" /> Bản gỡ băng âm thanh (Transcript)
              </p>
              <p className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-3.5 max-h-48 overflow-y-auto leading-relaxed font-mono">
                {score.transcript}
              </p>
            </div>
          )}

          {/* Pronunciation Issues */}
          {score.feedback.pronunciation_issues && score.feedback.pronunciation_issues.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">🗣️ Chi tiết lỗi Phát âm</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(score.feedback.pronunciation_issues as any[]).map((item: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                      <p className="text-xs font-bold text-rose-600">{item.word}</p>
                      <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-mono">{item.correct_pronunciation}</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed">
                      <span className="font-bold text-gray-700 block mb-0.5">💡 Mẹo phát âm chuẩn:</span>
                      {item.tip}
                    </div>
                    {item.example && (
                      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 text-xs text-blue-900 leading-relaxed">
                        <span className="font-bold block mb-0.5">💡 Từ tương tự:</span>
                        {item.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Natural suggestions */}
          {score.feedback.natural_suggestions && score.feedback.natural_suggestions.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">💡 Đề xuất diễn đạt tự nhiên hơn</h4>
              <div className="space-y-3">
                {(score.feedback.natural_suggestions as any[]).map((item: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded shrink-0">Bạn nói</span>
                      <p className="text-xs text-gray-600 italic font-mono leading-relaxed break-words">{item.original}</p>
                    </div>
                    <div className="flex items-start gap-2 border-t border-dashed border-gray-100 pt-2">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">Native</span>
                      <p className="text-xs text-emerald-800 font-bold leading-relaxed break-words">{item.improved}</p>
                    </div>
                    {item.explanation && (
                      <div className="bg-gray-50 rounded-xl p-2.5 text-xs text-gray-600 leading-relaxed">
                        <span className="font-bold text-gray-700 block mb-0.5">📖 Giải thích:</span>
                        {item.explanation}
                      </div>
                    )}
                    {item.example && (
                      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 text-xs text-blue-900 leading-relaxed">
                        <span className="font-bold block mb-0.5">💡 Ví dụ thực tế:</span>
                        {item.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Detail Panel ────────────────────────────────────────────────
function DetailPanel({ sub, exam, onClose, onUpdate }: {
  sub: MockSkillSubmission; exam: MockSkillExamDef;
  onClose: () => void; onUpdate: (updated: MockSkillSubmission) => void;
}) {
  const c = sub.candidate as Candidate;
  const scores = (sub.scores || {}) as Scores;
  const answersRaw = (sub.answers_raw || {}) as AnswersRaw;
  const [tab, setTab] = useState<"listening" | "reading" | "writing" | "speaking" | "summary">("listening");
  const [grading, setGrading] = useState<"writing" | "speaking" | "both" | "summary" | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [copiedWriting, setCopiedWriting] = useState(false);

  // Status checks for missing AI parts
  const hasWritingText = Boolean(answersRaw.writingText && answersRaw.writingText.trim().length > 10);
  const hasSpeakingAudio = Boolean((answersRaw.speakingAudios && answersRaw.speakingAudios.length > 0) || answersRaw.speakingDriveUrl);
  const missingWriting = hasWritingText && !scores.writing;
  const missingSpeaking = hasSpeakingAudio && !scores.speaking;

  // Calculate Overall IELTS Band
  const overallBand = (() => {
    if (scores.summary?.overall_band != null) return scores.summary.overall_band;
    const bands = [
      scores.listening?.band,
      scores.reading?.band,
      scores.writing?.band,
      scores.speaking?.band,
    ].filter((b): b is number => typeof b === "number" && b > 0);
    if (bands.length === 0) return null;
    const avg = bands.reduce((acc, curr) => acc + curr, 0) / bands.length;
    return Math.round(avg * 2) / 2;
  })();

  const candidateInitials = (c.full_name || "HV")
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map(w => w[0]?.toUpperCase())
    .join("") || "HV";

  async function toggleAnswer(skill: "listening" | "reading", itemId: string) {
    if (!scores[skill] || !scores[skill].items) return;
    const oldItems = scores[skill].items!;
    const newItems = oldItems.map((x) => (x.id === itemId ? { ...x, ok: !x.ok } : x));
    const correctCount = newItems.filter((x) => x.ok).length;
    const total = scores[skill].total || newItems.length;
    const newBand = rawScoreToBand(correctCount, total, skill === "listening" ? "listening" : "reading_academic");

    const newSkillScore = { ...scores[skill], items: newItems, correct: correctCount, band: newBand };
    const newScores = { ...scores, [skill]: newSkillScore };

    setUpdatingItemId(itemId);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.from("mock_skill_submissions").update({ scores: newScores }).eq("id", sub.id);
      if (error) throw error;
      onUpdate({ ...sub, scores: newScores as unknown as Record<string, unknown> } as MockSkillSubmission);
      toast.success(`Đã cập nhật câu ${itemId} thành ${newItems.find(x => x.id === itemId)?.ok ? "Đúng" : "Sai"}`);
    } catch {
      toast.error("Lỗi cập nhật");
    } finally {
      setUpdatingItemId(null);
    }
  }

  const [actionError, setActionError] = useState<string | null>(null);

  async function grade(target: "writing" | "speaking" | "both" | "summary") {
    setGrading(target);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/mock-skill-submissions/${sub.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const json = await res.json() as { ok?: boolean; scores?: Scores; status?: string; errors?: string[]; error?: string; message?: string };
      if (!res.ok || !json.ok) {
        const errMsg = json.error || json.message || json.errors?.join("; ") || "Chấm thất bại";
        setActionError(errMsg);
        toast.error(errMsg);
        if (json.scores) {
          onUpdate({ ...sub, scores: json.scores as unknown as Record<string, unknown>, status: json.status || sub.status } as MockSkillSubmission);
        }
        return;
      }
      setActionError(null);
      toast.success("Chấm xong!");
      onUpdate({ ...sub, scores: json.scores as unknown as Record<string, unknown>, status: json.status || sub.status } as MockSkillSubmission);
    } catch {
      setActionError("Lỗi mạng khi kết nối server");
      toast.error("Lỗi mạng khi kết nối server");
    } finally {
      setGrading(null);
    }
  }
  
  const [releasing, setReleasing] = useState(false);
  async function toggleRelease() {
    if (!sub.id) return;
    const nextState = !sub.is_released;
    setReleasing(true);
    try {
      const supabase = createBrowserClient();
      
      // 1. Update is_released
      const { error: upError } = await supabase
        .from("mock_skill_submissions")
        .update({ is_released: nextState })
        .eq("id", sub.id);
        
      if (upError) throw upError;
      
      // 2. Send notification ONLY when releasing
      if (nextState && sub.auth_user_id) {
        const { error: notiError } = await supabase
          .from("notifications")
          .insert({
            user_id: sub.auth_user_id,
            title: "Đã có kết quả thi thử!",
            content: `Kết quả bài thi "${exam.title}" của bạn đã được chấm xong. Hãy vào xem ngay nhé!`,
            link_url: "/student/thi-thu/history"
          });
          
        if (notiError) console.error("Noti error:", notiError);
      }
      
      toast.success(nextState 
        ? (sub.auth_user_id ? "Đã công khai điểm & gửi thông báo!" : "Đã công khai điểm!") 
        : "Đã hủy công khai điểm");
      onUpdate({ ...sub, is_released: nextState });
    } catch (err: any) {
      console.error("Release toggle error:", err);
      toast.error(err.message || "Lỗi khi cập nhật trạng thái công khai.");
    } finally {
      setReleasing(false);
    }
  }

  const TABS = [
    { 
      id: "listening" as const, 
      label: "Listening", 
      icon: <Headphones className="w-3.5 h-3.5" />,
      badge: scores.listening?.band != null 
        ? `Band ${scores.listening.band.toFixed(1)}` 
        : `${scores.listening?.correct ?? "?"}/${scores.listening?.total ?? "?"}`,
      isDone: scores.listening?.band != null
    },
    { 
      id: "reading" as const, 
      label: "Reading", 
      icon: <BookOpen className="w-3.5 h-3.5" />,
      badge: scores.reading?.band != null 
        ? `Band ${scores.reading.band.toFixed(1)}` 
        : `${scores.reading?.correct ?? "?"}/${scores.reading?.total ?? "?"}`,
      isDone: scores.reading?.band != null
    },
    { 
      id: "writing" as const, 
      label: "Writing", 
      icon: <PenTool className="w-3.5 h-3.5" />,
      badge: scores.writing?.band != null 
        ? `Band ${scores.writing.band.toFixed(1)}` 
        : (hasWritingText ? "Chờ chấm" : "Trống"),
      isDone: Boolean(scores.writing?.band)
    },
    { 
      id: "speaking" as const, 
      label: "Speaking", 
      icon: <Mic className="w-3.5 h-3.5" />,
      badge: scores.speaking?.band != null 
        ? `Band ${scores.speaking.band.toFixed(1)}` 
        : (hasSpeakingAudio ? "Chờ chấm" : "Trống"),
      isDone: Boolean(scores.speaking?.band)
    },
    { 
      id: "summary" as const, 
      label: "Tổng hợp AI", 
      icon: <Sparkles className="w-3.5 h-3.5" />,
      badge: scores.summary ? "✓ Đã có" : "Chưa tạo",
      isDone: Boolean(scores.summary)
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 transition-opacity" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-black text-base shadow-md shadow-brand-500/20 shrink-0">
              {candidateInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-gray-900 leading-snug">{c.full_name || "Thí sinh tự do"}</h3>
                {(() => {
                  const displayStatus = getSubmissionDisplayStatus(sub);
                  return <Badge variant={displayStatus.variant as "success"}>{displayStatus.label}</Badge>;
                })()}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span>{c.email || "Chưa có email"}</span>
                {c.phone && <span>• {c.phone}</span>}
              </div>
            </div>
          </div>

          {/* Quick Score Ribbon & Close Button */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            {/* 4-Skill Band Matrix Pill Bar */}
            <div className="flex items-center gap-2 bg-gray-50/80 border border-gray-200/80 rounded-2xl p-1.5 text-xs shadow-xs">
              <div className="px-3 py-1 rounded-xl bg-brand-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xs">
                <span className="text-[10px] font-semibold opacity-80 uppercase tracking-wider">Overall</span>
                <span className="text-sm">{overallBand != null ? overallBand.toFixed(1) : "—"}</span>
              </div>
              <div className="flex items-center gap-2 px-2 text-[11px] font-bold text-gray-600">
                <span title="Listening">L: <strong className={scores.listening?.band != null ? "text-brand-700" : "text-gray-400"}>{scores.listening?.band != null ? scores.listening.band.toFixed(1) : "—"}</strong></span>
                <span className="text-gray-300">|</span>
                <span title="Reading">R: <strong className={scores.reading?.band != null ? "text-brand-700" : "text-gray-400"}>{scores.reading?.band != null ? scores.reading.band.toFixed(1) : "—"}</strong></span>
                <span className="text-gray-300">|</span>
                <span title="Writing">W: <strong className={scores.writing?.band != null ? "text-brand-700" : "text-gray-400"}>{scores.writing?.band != null ? scores.writing.band.toFixed(1) : "—"}</strong></span>
                <span className="text-gray-300">|</span>
                <span title="Speaking">S: <strong className={scores.speaking?.band != null ? "text-brand-700" : "text-gray-400"}>{scores.speaking?.band != null ? scores.speaking.band.toFixed(1) : "—"}</strong></span>
              </div>
            </div>

            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Error Banner if AI failed */}
        {actionError && (
          <div className="mx-6 mt-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <span className="font-bold text-sm shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-rose-800">Lỗi khi gọi AI chấm điểm:</p>
              <p className="mt-0.5 leading-relaxed">{actionError}</p>
            </div>
            <button type="button" onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-700 text-base font-bold leading-none">×</button>
          </div>
        )}

        {/* Modern Segmented Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2.5 bg-gray-50/70 border-b border-gray-100 overflow-x-auto no-scrollbar shrink-0">
          {TABS.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : t.isDone
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Listening tab */}
          {tab === "listening" && (
            <SkillAnswerReview 
              skill="listening" 
              items={scores.listening?.items || []} 
              band={scores.listening?.band}
              correctCount={scores.listening?.correct}
              totalCount={scores.listening?.total}
              updatingId={updatingItemId} 
              onToggle={toggleAnswer} 
            />
          )}

          {/* Reading tab */}
          {tab === "reading" && (
            <SkillAnswerReview 
              skill="reading" 
              items={scores.reading?.items || []} 
              band={scores.reading?.band}
              correctCount={scores.reading?.correct}
              totalCount={scores.reading?.total}
              updatingId={updatingItemId} 
              onToggle={toggleAnswer} 
            />
          )}

          {/* Writing tab */}
          {tab === "writing" && (
            <div className="space-y-5">
              {/* Student Essay Submission Box */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/20 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Bài làm của học viên
                    </h4>
                    {answersRaw.writingText && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                        {answersRaw.writingText.trim().split(/\s+/).filter(Boolean).length} từ
                      </span>
                    )}
                  </div>
                  {answersRaw.writingText && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-7 py-0"
                      onClick={() => {
                        navigator.clipboard.writeText(answersRaw.writingText || "");
                        setCopiedWriting(true);
                        toast.success("Đã sao chép bài viết của học viên!");
                        setTimeout(() => setCopiedWriting(false), 2000);
                      }}
                      icon={<Copy className="w-3 h-3" />}
                    >
                      {copiedWriting ? "Đã chép" : "Sao chép bài nộp"}
                    </Button>
                  )}
                </div>

                {answersRaw.writingText ? (
                  <div className="rounded-xl bg-white border border-amber-100 p-4 text-xs text-gray-800 font-serif leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto shadow-xs">
                    {answersRaw.writingText}
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs italic py-2">Thí sinh không nộp bài viết cho phần thi này.</p>
                )}
              </div>

              {/* AI Score Section */}
              {scores.writing ? (
                <div className="space-y-4">
                  <AIScoreDisplay skill="writing" score={scores.writing} />
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Đã chấm chi tiết bằng Vertex AI Gemini Flash</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      icon={<Bot className="w-3.5 h-3.5 text-gray-500" />}
                      loading={grading === "writing"} 
                      onClick={() => grade("writing")}
                    >
                      Chấm lại Writing bằng AI
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Phần Writing chưa được chấm điểm</h4>
                    <p className="text-xs text-gray-600 max-w-md mx-auto mt-1 leading-relaxed">
                      Bài viết đã được lưu trên hệ thống. Nhấn nút bên dưới để Vertex AI phân tích 4 tiêu chí chuẩn Cambridge: Task Response, Coherence & Cohesion, Lexical Resource, và Grammar.
                    </p>
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    icon={<Bot className="w-4 h-4" />}
                    loading={grading === "writing"} 
                    onClick={() => grade("writing")}
                  >
                    Chấm Writing bằng AI ngay
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Speaking tab */}
          {tab === "speaking" && (
            <div className="space-y-5">
              {/* Audio Files & Drive Links */}
              <div className="rounded-2xl border border-sky-100 bg-sky-50/30 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      File âm thanh của học viên (Google Drive)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {answersRaw.speakingDriveUrl && (
                      <a 
                        href={answersRaw.speakingDriveUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl border border-brand-200 transition-colors"
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> File gộp Audio Drive
                      </a>
                    )}
                    {sub.drive_folder_url && (
                      <a 
                        href={sub.drive_folder_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-600 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 transition-colors"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-amber-500" /> Folder bài thi trên Drive
                      </a>
                    )}
                  </div>
                </div>

                {answersRaw.speakingAudios && answersRaw.speakingAudios.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {answersRaw.speakingAudios.map((audio, index) => (
                      <a 
                        key={index} 
                        href={audio.driveUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200/80 bg-white hover:border-brand-300 hover:shadow-xs transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-50 group-hover:bg-brand-50 text-sky-700 group-hover:text-brand-700 flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate group-hover:text-brand-700 transition-colors">
                            {audio.name || `Ghi âm phần ${index + 1}`}
                          </p>
                          <p className="text-[10px] text-gray-400">Click để nghe trên Google Drive</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-600 shrink-0" />
                      </a>
                    ))}
                  </div>
                ) : !answersRaw.speakingDriveUrl ? (
                  <p className="text-gray-400 text-xs italic py-2">Thí sinh không nộp bản ghi âm Speaking.</p>
                ) : null}
              </div>

              {/* AI Score Section */}
              {scores.speaking ? (
                <div className="space-y-4">
                  <AIScoreDisplay skill="speaking" score={scores.speaking} />
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Đã chấm chi tiết bằng Vertex AI Gemini Flash</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      icon={<Bot className="w-3.5 h-3.5 text-gray-500" />}
                      loading={grading === "speaking"} 
                      onClick={() => grade("speaking")}
                    >
                      Chấm lại Speaking bằng AI
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50/40 p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto shadow-xs">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Phần Speaking chưa được chấm điểm</h4>
                    <p className="text-xs text-gray-600 max-w-md mx-auto mt-1 leading-relaxed">
                      Hệ thống sẽ đồng bộ file âm thanh từ Google Drive và gửi sang Vertex AI để phiên âm transcript, đánh giá phát âm, ngữ điệu, sự trôi chảy & chấm điểm Band.
                    </p>
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    icon={<Bot className="w-4 h-4" />}
                    loading={grading === "speaking"} 
                    onClick={() => grade("speaking")}
                  >
                    Chấm Speaking bằng AI ngay
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Summary tab */}
          {tab === "summary" && (
            <div className="space-y-5">
              {!scores.summary ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 shadow-xs">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Chưa có nhận xét tổng hợp 4 kỹ năng</h4>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 leading-relaxed">
                      AI sẽ tổng hợp tương quan giữa cả 4 kỹ năng (Listening, Reading, Writing, Speaking), phân tích điểm mạnh, điểm yếu cốt lõi và vạch ra lộ trình ôn tập cá nhân hóa.
                    </p>
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    icon={<Bot className="w-4 h-4" />}
                    loading={grading === "summary"} 
                    onClick={() => grade("summary")}
                  >
                    Tổng hợp nhận xét bằng AI
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Hero Summary Card */}
                  <div className="rounded-2xl bg-gradient-to-br from-brand-50 via-white to-purple-50/40 border border-brand-100 p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-purple-700 text-white flex flex-col items-center justify-center shadow-lg shadow-brand-600/20 shrink-0">
                          <span className="text-2xl font-black leading-none">
                            {scores.summary.overall_band?.toFixed(1) || (overallBand != null ? overallBand.toFixed(1) : "—")}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-80">Overall</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-gray-900">Đánh giá Năng lực Tổng quát</span>
                            <Badge variant="info">{scores.summary.level || "IELTS Candidate"}</Badge>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 capitalize">
                            Phân bố kỹ năng: <strong>{scores.summary.skill_balance?.replace("_", " ") || "Cân bằng"}</strong>
                          </p>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        icon={<Bot className="w-3.5 h-3.5 text-gray-500" />}
                        loading={grading === "summary"} 
                        onClick={() => grade("summary")}
                      >
                        Làm mới nhận xét
                      </Button>
                    </div>

                    {scores.summary.overview && (
                      <div className="mt-4 p-4 rounded-xl bg-white border border-brand-100/70 text-xs text-gray-700 leading-relaxed">
                        <span className="font-bold text-gray-900 block mb-1">📋 Nhận xét tổng quan:</span>
                        {scores.summary.overview}
                      </div>
                    )}
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Điểm mạnh nổi bật</span>
                      </div>
                      <ul className="space-y-2">
                        {(scores.summary.strengths || []).map((s, i) => (
                          <li key={i} className="text-xs text-emerald-950 bg-white/80 p-2.5 rounded-xl border border-emerald-100/60 leading-relaxed">
                            • {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>Kỹ năng cần ưu tiên cải thiện</span>
                      </div>
                      <ul className="space-y-2">
                        {(scores.summary.weaknesses || []).map((s, i) => (
                          <li key={i} className="text-xs text-rose-950 bg-white/80 p-2.5 rounded-xl border border-rose-100/60 leading-relaxed">
                            • {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {scores.summary.recommendations && scores.summary.recommendations.length > 0 && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 space-y-2.5">
                      <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>Lộ trình ôn tập gợi ý từ AI</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {scores.summary.recommendations.map((r, i) => (
                          <div key={i} className="p-3 bg-white rounded-xl border border-blue-100 text-xs text-blue-950 leading-relaxed">
                            <span className="font-bold text-blue-700 mr-1">#{i + 1}</span> {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: Quick Grade & Release */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Quick action to grade missing skills if any */}
            {(missingWriting || missingSpeaking) && (
              <Button
                variant="outline"
                size="sm"
                icon={<Bot className="w-4 h-4 text-brand-600" />}
                loading={grading === "both" || grading === "writing" || grading === "speaking"}
                onClick={() => grade(missingWriting && missingSpeaking ? "both" : missingWriting ? "writing" : "speaking")}
              >
                {missingWriting && missingSpeaking 
                  ? "Chấm tất cả bằng AI (W + S)" 
                  : missingWriting 
                    ? "Chấm Writing bằng AI" 
                    : "Chấm Speaking bằng AI"}
              </Button>
            )}

            {["graded", "completed"].includes(sub.status) && (
              <Button 
                variant={sub.is_released ? "outline" : "primary"}
                className={!sub.is_released ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white" : ""}
                size="sm" 
                icon={releasing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                loading={releasing}
                onClick={toggleRelease}
              >
                {sub.is_released ? "Hủy công khai" : "Công khai điểm cho học viên"}
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            {sub.is_released ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Đang hiển thị với học viên
              </span>
            ) : (
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-gray-300 rounded-full" /> Chưa công khai điểm
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────
export default function AdminMockSkillKetQuaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params);
  const [exam, setExam] = useState<MockSkillExamDef | null>(null);
  const [rows, setRows] = useState<MockSkillSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedSub, setSelectedSub] = useState<MockSkillSubmission | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createBrowserClient();
      const [{ data: examData }, { data: subData, error: e2 }] = await Promise.all([
        supabase.from("mock_skill_exam_defs").select("id,slug,title,description,is_active,created_at,updated_at,content_public").eq("id", examId).maybeSingle(),
        supabase.from("mock_skill_submissions").select("*").eq("exam_id", examId).order("submitted_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setExam(examData as MockSkillExamDef || null);
      if (e2) toast.error(e2.message);
      else setRows((subData as MockSkillSubmission[]) || []);
      setLoading(false);
    })().catch(console.error);
    return () => { cancelled = true; };
  }, [examId]);

  async function deleteSubmission(submissionId: string, label: string) {
    if (!confirm(`Xóa kết quả của "${label}"?`)) return;
    setDeletingId(submissionId);
    try {
      const res = await fetch(`/api/admin/mock-skill-submissions/${submissionId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) { toast.error(json.error || "Xóa thất bại"); return; }
      toast.success("Đã xóa");
      setRows((p) => p.filter((r) => r.id !== submissionId));
      if (selectedSub?.id === submissionId) setSelectedSub(null);
    } catch { toast.error("Lỗi mạng"); }
    finally { setDeletingId(null); }
  }

  function handleSubUpdate(updated: MockSkillSubmission) {
    setRows((p) => p.map((r) => r.id === updated.id ? updated : r));
    setSelectedSub(updated);
  }

  const STATUS_FILTERS = ["all", "pending", "grading", "graded", "completed", "failed"];
  const filtered = filterStatus === "all" ? rows : rows.filter((r) => r.status === filterStatus);

  if (loading) return <PageWrapper><div className="p-12 text-center text-gray-500">Đang tải…</div></PageWrapper>;
  if (!exam) return (
    <PageWrapper>
      <p className="text-gray-600">Không tìm thấy đề.</p>
      <div className="mt-4"><BackButton href="/admin/mock-skill-exams" label="Quay lại" variant="button" /></div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      {selectedSub && (
        <DetailPanel sub={selectedSub} exam={exam}
          onClose={() => setSelectedSub(null)} onUpdate={handleSubUpdate} />
      )}

      <div className="mb-6">
        <BackButton href="/admin/mock-skill-exams" label="Danh sách đề" variant="inline" className="mb-4" />
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="page-title">Kết quả — {exam.title}</h1>
            <p className="page-subtitle">{rows.length} lượt nộp · <span className="font-mono">{exam.slug}</span></p>
          </div>
          {/* Status filters */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((s) => {
              const count = s === "all" ? rows.length : rows.filter((r) => r.status === s).length;
              if (s !== "all" && count === 0) return null;
              return (
                <button key={s} type="button" onClick={() => setFilterStatus(s)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${filterStatus === s ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-200 hover:border-brand-300"}`}>
                  {STATUS_CONFIG[s]?.label || (s === "all" ? "Tất cả" : s)} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500 bg-gray-50/60 text-xs">
              <th className="py-3 px-4 font-semibold">Thí sinh</th>
              <th className="py-3 px-4 font-semibold">Email</th>
              <th className="py-3 px-4 font-semibold">Band L/R/W/S</th>
              <th className="py-3 px-4 font-semibold">Trạng thái</th>
              <th className="py-3 px-4 font-semibold">Công khai</th>
              <th className="py-3 px-4 font-semibold">Nộp lúc</th>
              <th className="py-3 px-4 font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => {
              const c = r.candidate as Candidate;
              const sc = (r.scores || {}) as Scores;
              const { label, variant } = getSubmissionDisplayStatus(r);
              return (
                <tr key={r.id} className="hover:bg-gray-50/80 align-middle">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900">{c?.full_name || "—"}</p>
                    {c?.hometown && <p className="text-xs text-gray-400">{c.hometown}</p>}
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{c?.email || "—"}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      <BandPill label="L" band={sc.listening?.band} />
                      <BandPill label="R" band={sc.reading?.band} />
                      <BandPill label="W" band={sc.writing?.band} />
                      <BandPill label="S" band={sc.speaking?.band} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {sc.listening?.correct != null && `L:${sc.listening.correct}/${sc.listening.total} `}
                      {sc.reading?.correct != null && `R:${sc.reading.correct}/${sc.reading.total}`}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={variant as "success"}>{label}</Badge>
                    {r.error_message && <p className="text-xs text-red-500 mt-0.5 max-w-[140px] truncate">{r.error_message}</p>}
                  </td>
                  <td className="py-3 px-4">
                    {r.is_released ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" /> Rồi
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-gray-400 italic">Chưa</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                    {r.submitted_at ? new Date(r.submitted_at).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setSelectedSub(r)}>
                        Chi tiết / Chấm
                      </Button>
                      <Button size="sm" variant="danger" loading={deletingId === r.id}
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => deleteSubmission(r.id, c?.full_name || c?.email || "Thí sinh")}>
                        Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-8 text-center text-gray-400">Không có dữ liệu.</p>}
      </Card>
    </PageWrapper>
  );
}
