"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MockSkillExamDef, MockSkillSubmission } from "@/types";
import { ArrowLeft, Bot, CheckCircle2, ChevronDown, ChevronUp, FolderOpen, Loader2, Trash2, X } from "lucide-react";
import Link from "next/link";
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
  updatingId,
  onToggle
}: {
  skill: "listening" | "reading";
  items: Array<{ id: string; expected: string; actual: string; ok: boolean }>;
  updatingId: string | null;
  onToggle: (skill: "listening" | "reading", id: string) => void;
}) {
  if (!items || !items.length) return <p className="text-gray-400 text-sm">Không có dữ liệu đáp án.</p>;
  return (
    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
      {items.map((x) => (
        <div key={x.id} 
             onClick={() => onToggle(skill, x.id)}
             className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg px-3 py-2 text-xs cursor-pointer transition-opacity border ${updatingId === x.id ? 'opacity-50' : 'hover:opacity-80'} ${x.ok ? "bg-emerald-50 border-emerald-100 hover:bg-emerald-100" : "bg-red-50 border-red-100 hover:bg-red-100"}`}>
          
          <div className="flex items-center gap-2 sm:w-16 shrink-0">
            <input 
              type="checkbox" 
              checked={x.ok} 
              readOnly
              className="w-3.5 h-3.5 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
            />
            <span className={`font-bold ${x.ok ? "text-emerald-700" : "text-red-700"}`}>
              #{x.id}
            </span>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-4">
            <div className="flex items-start gap-1">
              <span className="text-gray-500 shrink-0">HV:</span>
              <span className="text-gray-900 font-semibold break-all">{x.actual || "∅"}</span>
            </div>
            <div className="flex items-start gap-1">
              <span className="text-gray-500 shrink-0">Key:</span>
              <span className="text-brand-700 font-semibold break-all">{x.expected}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── AI Score Display ────────────────────────────────────────────
function AIScoreDisplay({ skill, score }: { skill: "writing" | "speaking"; score?: AIScore }) {
  if (!score) return null;
  const criteriaLabels: Record<string, string> = {
    task_achievement: "Task Achievement", coherence_cohesion: "Coherence & Cohesion",
    lexical_resource: "Lexical Resource", grammatical_range_accuracy: "Grammar",
    fluency_coherence: "Fluency & Coherence", pronunciation: "Pronunciation",
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl font-black text-brand-700">{score.band?.toFixed(1) ?? "—"}</span>
        <span className="text-sm font-semibold text-gray-500">Band Score</span>
      </div>

      {score.criteria && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Object.entries(score.criteria).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 shadow-sm">
              <p className="text-xs text-gray-500 font-medium truncate">{criteriaLabels[k] || k}</p>
              <p className="text-lg font-black text-gray-800 mt-0.5">{Number(v).toFixed(1)}</p>
            </div>
          ))}
        </div>
      )}

      {score.feedback && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(score.feedback.strengths || []).length > 0 && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-4">
                <p className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-1.5">✅ Điểm mạnh</p>
                <ul className="space-y-1.5">
                  {score.feedback.strengths!.map((s, i) => (
                    <li key={i} className="text-xs text-gray-700 leading-relaxed">• {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {(score.feedback.weaknesses || []).length > 0 && (
              <div className="rounded-xl border border-red-100 bg-red-50/20 p-4">
                <p className="text-sm font-bold text-red-800 mb-2 flex items-center gap-1.5">⚠️ Cần cải thiện</p>
                <ul className="space-y-1.5">
                  {score.feedback.weaknesses!.map((w, i) => (
                    <li key={i} className="text-xs text-gray-700 leading-relaxed">• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Detailed corrections: Grammar & Vocabulary for Writing */}
          {skill === "writing" && (
            <div className="space-y-4">
              {/* Grammar Issues */}
              {score.feedback.grammar_issues && score.feedback.grammar_issues.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">🔍 Chi tiết lỗi Ngữ pháp & Câu từ</h4>
                  <div className="space-y-3">
                    {(score.feedback.grammar_issues as any[]).map((item: any, i: number) => (
                      <div key={i} className="rounded-xl border border-rose-100 bg-white p-3.5 shadow-sm space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded shrink-0">Bản gốc</span>
                          <p className="text-xs text-gray-600 italic font-mono leading-relaxed break-words">{item.original}</p>
                        </div>
                        <div className="flex items-start gap-2 border-t border-dashed border-gray-100 pt-2">
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded shrink-0">Gợi ý sửa</span>
                          <p className="text-xs text-emerald-700 font-bold leading-relaxed break-words">{item.suggestion}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600 leading-relaxed">
                          <span className="font-bold text-gray-700 block mb-0.5">📖 Giải thích lỗi:</span>
                          {item.explanation}
                        </div>
                        {item.example && (
                          <div className="bg-blue-50/50 border border-blue-100/50 rounded-lg p-2.5 text-xs text-blue-800 leading-relaxed">
                            <span className="font-bold block mb-0.5">💡 Ví dụ thực tế:</span>
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
                  <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">🚀 Gợi ý nâng cấp Từ vựng</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(score.feedback.vocabulary_suggestions as any[]).map((item: any, i: number) => (
                      <div key={i} className="rounded-xl border border-indigo-100 bg-white p-3.5 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Từ đã dùng</span>
                          <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">Premium Alternatives</span>
                        </div>
                        <div className="flex items-center gap-2 justify-between">
                          <p className="text-xs text-gray-500 font-mono italic">{item.original}</p>
                          <p className="text-xs text-emerald-600 font-extrabold">{item.suggestion}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600 leading-relaxed">
                          <span className="font-bold text-gray-700 block mb-0.5">💡 Giải thích & Cách dùng:</span>
                          {item.explanation}
                        </div>
                        {item.example && (
                          <div className="bg-blue-50/50 border border-blue-100/50 rounded-lg p-2.5 text-xs text-blue-800 leading-relaxed">
                            <span className="font-bold block mb-0.5">💡 Ví dụ thực tế:</span>
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
                  <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">✍️ Bài viết mẫu nâng Band hoàn chỉnh</h4>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700 leading-relaxed font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {score.feedback.improved_sample}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Detailed corrections: Pronunciation & Natural phrasing for Speaking */}
          {skill === "speaking" && (
            <div className="space-y-4">
              {score.transcript && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">📝 Transcript</p>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto leading-relaxed">{score.transcript}</p>
                </div>
              )}

              {/* Pronunciation Issues */}
              {score.feedback.pronunciation_issues && score.feedback.pronunciation_issues.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">🗣️ Chi tiết lỗi Phát âm</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(score.feedback.pronunciation_issues as any[]).map((item: any, i: number) => (
                      <div key={i} className="rounded-xl border border-violet-100 bg-white p-3.5 shadow-sm space-y-2">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                          <p className="text-xs font-bold text-red-600">{item.word}</p>
                          <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded font-mono">{item.correct_pronunciation}</span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600 leading-relaxed">
                          <span className="font-bold text-gray-700 block mb-0.5">💡 Mẹo phát âm đúng:</span>
                          {item.tip}
                        </div>
                        {item.example && (
                          <div className="bg-blue-50/50 border border-blue-100/50 rounded-lg p-2.5 text-xs text-blue-800 leading-relaxed">
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
                      <div key={i} className="rounded-xl border border-emerald-100 bg-white p-3.5 shadow-sm space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded shrink-0">Bạn nói</span>
                          <p className="text-xs text-gray-600 italic font-mono leading-relaxed break-words">{item.original}</p>
                        </div>
                        <div className="flex items-start gap-2 border-t border-dashed border-gray-100 pt-2">
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded shrink-0">Native</span>
                          <p className="text-xs text-emerald-700 font-bold leading-relaxed break-words">{item.improved}</p>
                        </div>
                        {item.explanation && (
                          <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600 leading-relaxed">
                            <span className="font-bold text-gray-700 block mb-0.5">📖 Giải thích & Mẹo từ vựng:</span>
                            {item.explanation}
                          </div>
                        )}
                        {item.example && (
                          <div className="bg-blue-50/50 border border-blue-100/50 rounded-lg p-2.5 text-xs text-blue-800 leading-relaxed">
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

  async function grade(target: "writing" | "speaking" | "both" | "summary") {
    setGrading(target);
    try {
      const res = await fetch(`/api/admin/mock-skill-submissions/${sub.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const json = await res.json() as { ok?: boolean; scores?: Scores; status?: string; errors?: string[]; error?: string };
      if (!res.ok) { toast.error(json.error || "Chấm thất bại"); return; }
      if (json.errors?.length) toast.error(json.errors.join("; "));
      else toast.success("Chấm xong!");
      onUpdate({ ...sub, scores: json.scores as unknown as Record<string, unknown>, status: json.status || sub.status } as MockSkillSubmission);
    } catch { toast.error("Lỗi mạng"); }
    finally { setGrading(null); }
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
      
      // 2. Send notification ONLY when releasing (not un-releasing)
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
    { id: "listening" as const, label: `🎧 Listening (${scores.listening?.correct ?? "?"}/${scores.listening?.total ?? "?"})` },
    { id: "reading" as const, label: `📖 Reading (${scores.reading?.correct ?? "?"}/${scores.reading?.total ?? "?"})` },
    { id: "writing" as const, label: `✍️ Writing ${scores.writing ? "✓" : ""}` },
    { id: "speaking" as const, label: `🎤 Speaking ${scores.speaking ? "✓" : ""}` },
    { id: "summary" as const, label: `✨ Tổng hợp AI ${scores.summary ? "✓" : ""}` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900">{c.full_name || "—"}</p>
            <p className="text-xs text-gray-500">{c.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={(STATUS_CONFIG[sub.status]?.variant as "success") || "gray"}>{STATUS_CONFIG[sub.status]?.label || sub.status}</Badge>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 px-5 pt-3 border-b border-gray-100">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Listening tab */}
          {tab === "listening" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <BandPill label="Listening" band={scores.listening?.band} />
                {scores.listening && <span className="text-xs text-gray-500">{scores.listening.correct}/{scores.listening.total} câu đúng</span>}
              </div>
              <SkillAnswerReview skill="listening" items={scores.listening?.items || []} updatingId={updatingItemId} onToggle={toggleAnswer} />
            </div>
          )}

          {/* Reading tab */}
          {tab === "reading" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <BandPill label="Reading" band={scores.reading?.band} />
                {scores.reading && <span className="text-xs text-gray-500">{scores.reading.correct}/{scores.reading.total} câu đúng</span>}
              </div>
              <SkillAnswerReview skill="reading" items={scores.reading?.items || []} updatingId={updatingItemId} onToggle={toggleAnswer} />
            </div>
          )}

          {/* Writing tab */}
          {tab === "writing" && (
            <div className="space-y-4">
              {answersRaw.writingText ? (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">Bài viết ({answersRaw.writingText.trim().split(/\s+/).filter(Boolean).length} từ)</p>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">{answersRaw.writingText}</div>
                </div>
              ) : <p className="text-gray-400 text-sm">Không có bài viết.</p>}

              {scores.writing ? (
                <div className="space-y-3">
                  <AIScoreDisplay skill="writing" score={scores.writing} />
                  <div className="pt-2 border-t border-gray-100">
                    <Button variant="outline" size="sm" icon={<Bot className="w-3.5 h-3.5 text-gray-500" />}
                      loading={grading === "writing"} onClick={() => grade("writing")}>
                      Chấm lại Writing bằng AI
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="primary" size="sm" icon={<Bot className="w-3.5 h-3.5" />}
                  loading={grading === "writing"} onClick={() => grade("writing")}>
                  Chấm Writing bằng AI
                </Button>
              )}
            </div>
          )}

          {/* Speaking tab */}
          {tab === "speaking" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                {/* Audio Drive parent/folders link */}
                <div className="flex flex-wrap gap-3 items-center">
                  {answersRaw.speakingDriveUrl && (
                    <a href={answersRaw.speakingDriveUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-brand-600 text-xs font-semibold hover:underline bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100">
                      <FolderOpen className="w-3.5 h-3.5" /> Nghe file tổng hợp trên Drive
                    </a>
                  )}
                  {sub.drive_folder_url && (
                    <a href={sub.drive_folder_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                      <FolderOpen className="w-3.5 h-3.5" /> Mở folder Drive chứa tất cả file
                    </a>
                  )}
                </div>

                {/* Individual Question Audio files */}
                {answersRaw.speakingAudios && answersRaw.speakingAudios.length > 0 ? (
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <p className="text-xs font-bold text-gray-700">🎙️ Danh sách file ghi âm từng câu của học sinh:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {answersRaw.speakingAudios.map((audio, index) => (
                        <a key={index} href={audio.driveUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:bg-brand-50/50 hover:border-brand-200 shadow-sm transition-all text-left">
                          <span className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-black shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{audio.name || `Ghi âm phần ${index + 1}`}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Click để nghe trên Drive</p>
                          </div>
                          <FolderOpen className="w-4 h-4 text-gray-400 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : !answersRaw.speakingDriveUrl ? (
                  <p className="text-gray-400 text-sm">Chưa có audio Speaking.</p>
                ) : null}
              </div>

              {scores.speaking ? (
                <div className="space-y-3">
                  <AIScoreDisplay skill="speaking" score={scores.speaking} />
                  <div className="pt-2 border-t border-gray-100">
                    <Button variant="outline" size="sm" icon={<Bot className="w-3.5 h-3.5 text-gray-500" />}
                      loading={grading === "speaking"} onClick={() => grade("speaking")}>
                      Chấm lại Speaking bằng AI
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="primary" size="sm" icon={<Bot className="w-3.5 h-3.5" />}
                  loading={grading === "speaking"} onClick={() => grade("speaking")}>
                  Chấm Speaking bằng AI
                </Button>
              )}
            </div>
          )}

          {/* Summary tab */}
          {tab === "summary" && (
            <div className="space-y-4">
              {!scores.summary ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-brand-600 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Chưa có Nhận xét Tổng hợp AI</h4>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">Hệ thống AI sẽ tự động phân tích phổ điểm các kỹ năng và đưa ra nhận xét chung về điểm mạnh, điểm yếu & lộ trình ôn tập.</p>
                  </div>
                  <Button variant="primary" size="sm" icon={<Bot className="w-3.5 h-3.5" />}
                    loading={grading === "summary"} onClick={() => grade("summary")}>
                    Tổng hợp nhận xét bằng AI
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <span className="text-3xl font-black text-brand-700">{scores.summary.overall_band?.toFixed(1) || "—"}</span>
                      <p className="text-xs text-gray-500">Overall</p>
                    </div>
                    <div className="h-10 w-px bg-gray-200"></div>
                    <div>
                      <Badge variant="info">{scores.summary.level || "Unknown"}</Badge>
                      <p className="text-sm font-medium text-gray-600 mt-1 capitalize">{scores.summary.skill_balance?.replace("_", " ") || "Balanced"}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 bg-brand-50 p-3 rounded-xl border border-brand-100">{scores.summary.overview}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 mb-1">✅ Điểm mạnh tổng hợp</p>
                      <ul className="space-y-1">
                        {(scores.summary.strengths || []).map((s, i) => <li key={i} className="text-xs text-gray-600">• {s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-700 mb-1">⚠️ Cần cải thiện chung</p>
                      <ul className="space-y-1">
                        {(scores.summary.weaknesses || []).map((s, i) => <li key={i} className="text-xs text-gray-600">• {s}</li>)}
                      </ul>
                    </div>
                  </div>

                  {scores.summary.recommendations && scores.summary.recommendations.length > 0 && (
                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">💡 Lời khuyên & Lộ trình ôn tập</p>
                      <ul className="space-y-1.5">
                        {scores.summary.recommendations.map((r, i) => <li key={i} className="text-xs text-gray-600">👉 {r}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-medium">Nhận xét tổng hợp tự động bằng AI</span>
                    <Button variant="outline" size="sm" icon={<Bot className="w-3.5 h-3.5 text-gray-500" />}
                      loading={grading === "summary"} onClick={() => grade("summary")}>
                      Cập nhật tổng hợp nhận xét AI
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: Grade all & Release */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {["graded", "completed"].includes(sub.status) && (
              <Button 
                variant={sub.is_released ? "outline" : "primary"}
                className={!sub.is_released ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" : ""}
                size="sm" 
                icon={releasing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                loading={releasing}
                onClick={toggleRelease}
              >
                {sub.is_released ? "Hủy công khai" : "Công khai điểm"}
              </Button>
            )}
            {sub.is_released && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Đang hiển thị với học viên
              </span>
            )}
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
      <Link href="/admin/mock-skill-exams" className="inline-block mt-4"><Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Quay lại</Button></Link>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      {selectedSub && (
        <DetailPanel sub={selectedSub} exam={exam}
          onClose={() => setSelectedSub(null)} onUpdate={handleSubUpdate} />
      )}

      <div className="mb-6">
        <Link href="/admin/mock-skill-exams" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Danh sách đề
        </Link>
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
              const { label, variant } = STATUS_CONFIG[r.status] ?? { label: r.status, variant: "gray" as const };
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
