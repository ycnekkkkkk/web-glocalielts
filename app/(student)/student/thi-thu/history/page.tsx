"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import { createBrowserClient } from "@/lib/supabase/client";
import { getBandDescriptor } from "@/lib/mock-skill/band-mapping";
import { cn } from "@/utils/cn";
import BackButton from "@/components/ui/BackButton";
import { Calendar, ChevronRight, Clock, History, Bot, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface AIScore {
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
}

interface Submission {
  id: string;
  created_at: string;
  status: string;
  is_released: boolean;
  scores: {
    listening?: { correct: number; total: number; band?: number };
    reading?: { correct: number; total: number; band?: number };
    writing?: AIScore;
    speaking?: AIScore;
    summary?: {
      overall_band: number;
      level: string;
      overview: string;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
      skill_balance: string;
    };
  } | null;
  mock_skill_exam_defs: {
    title: string;
    slug: string;
  } | null;
}

function BandPill({ band, label }: { band: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={cn(
          "text-lg font-black",
          band >= 7 ? "text-emerald-700" :
          band >= 5 ? "text-blue-700" :
          band > 0 ? "text-amber-700" :
          "text-gray-400"
        )}
      >
        {band > 0 ? band.toFixed(1).replace(".0", "") : "—"}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: { label: "Hoàn thành", className: "bg-emerald-100 text-emerald-700" },
    processing: { label: "Đang xử lý", className: "bg-blue-100 text-blue-700" },
    failed: { label: "Lỗi", className: "bg-red-100 text-red-700" },
  };
  const c = config[status] || { label: status, className: "bg-gray-100 text-gray-500" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", c.className)}>
      {c.label}
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StudentAIScoreDisplay({ skill, score }: { skill: "writing" | "speaking"; score?: AIScore }) {
  if (!score) return null;
  const criteriaLabels: Record<string, string> = {
    task_achievement: "Task Achievement", coherence_cohesion: "Coherence & Cohesion",
    lexical_resource: "Lexical Resource", grammatical_range_accuracy: "Grammar",
    fluency_coherence: "Fluency & Coherence", pronunciation: "Pronunciation",
  };
  return (
    <div className="space-y-4 text-left">
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
                    {score.feedback.grammar_issues.map((item, i) => (
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {score.feedback.vocabulary_suggestions.map((item, i) => (
                      <div key={i} className="rounded-xl border border-sky-100 bg-white p-3.5 shadow-sm space-y-2">
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
              {/* Pronunciation Issues */}
              {score.feedback.pronunciation_issues && score.feedback.pronunciation_issues.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">🗣️ Chi tiết lỗi Phát âm</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {score.feedback.pronunciation_issues.map((item, i) => (
                      <div key={i} className="rounded-xl border border-sky-100 bg-white p-3.5 shadow-sm space-y-2">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                          <p className="text-xs font-bold text-red-600">{item.word}</p>
                          <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-mono">{item.correct_pronunciation}</span>
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
                    {score.feedback.natural_suggestions.map((item, i) => (
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

export default function TestHistoryPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subTabs, setSubTabs] = useState<Record<string, "writing" | "speaking" | "summary">>({});

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Bạn cần đăng nhập để xem lịch sử."); setLoading(false); return; }

      const { data, error: err } = await supabase
        .from("mock_skill_submissions")
        .select("id, created_at, status, is_released, scores, mock_skill_exam_defs(title, slug)")
        .eq("auth_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (err) { setError("Không thể tải lịch sử."); }
      else { setSubmissions((data as unknown as Submission[]) || []); }
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  return (
    <PageWrapper>
      <BackButton href="/student/thi-thu" label="Quay lại danh sách đề" className="mb-4" />
      <div className="mb-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-sky-600 flex items-center justify-center">
          <History className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Lịch sử thi thử</h1>
          <p className="text-sm text-gray-500">Tất cả các bài thi bạn đã nộp</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl border border-gray-100 bg-white animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Bạn chưa thi thử lần nào.</p>
          <a href="/student/thi-thu" className="mt-3 inline-block text-sm text-brand-600 font-semibold hover:underline">
            Bắt đầu thi thử ngay →
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => {
            const listeningBand = s.scores?.listening?.band ?? 0;
            const readingBand = s.scores?.reading?.band ?? 0;
            const writingBand = s.scores?.writing?.band ?? 0;
            const speakingBand = s.scores?.speaking?.band ?? 0;
            
            const summary = s.scores?.summary;
            const overallBand = summary?.overall_band ?? 0;
            const isExpanded = expandedId === s.id;

            return (
              <div
                key={s.id}
                className="block rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-all overflow-hidden"
              >
                <div 
                  className="p-4 sm:p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50"
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {s.mock_skill_exam_defs?.title || "Đề thi"}
                      </p>
                      <StatusBadge status={s.status} />
                      {!s.is_released && s.status === "completed" && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">
                          Chờ công khai điểm
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(s.created_at)}
                    </div>
                  </div>

                  {/* Score pills */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {s.is_released ? (
                        <>
                          <div className="hidden sm:flex items-center gap-4">
                            <BandPill band={listeningBand} label="L" />
                            <BandPill band={readingBand} label="R" />
                            <BandPill band={writingBand} label="W" />
                            <BandPill band={speakingBand} label="S" />
                          </div>
                          {overallBand > 0 && (
                            <div className="text-center">
                              <span className="text-2xl font-black text-brand-700">{overallBand.toFixed(1).replace(".0", "")}</span>
                              <p className="text-xs text-gray-400">Overall</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center px-4 py-1 bg-gray-100 rounded-xl">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Đang chờ</p>
                        </div>
                      )}
                      <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                </div>

                {isExpanded && s.is_released && summary && (
                  <div className="border-t border-gray-100 p-4 sm:p-5 bg-gray-50/30">
                    {/* Premium sub-tab navigation */}
                    <div className="flex border-b border-gray-200 mb-5 bg-gray-100/60 p-1 rounded-xl max-w-md mx-auto sm:mx-0">
                      <button
                        type="button"
                        onClick={() => setSubTabs(prev => ({ ...prev, [s.id]: "summary" }))}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                          (subTabs[s.id] || "summary") === "summary"
                            ? "bg-white text-brand-700 shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                        )}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-brand-500" /> Đánh giá Tổng hợp
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubTabs(prev => ({ ...prev, [s.id]: "writing" }))}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                          (subTabs[s.id] || "summary") === "writing"
                            ? "bg-white text-brand-700 shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                        )}
                      >
                        <Bot className="w-3.5 h-3.5 text-sky-500" /> Nhận xét Writing
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubTabs(prev => ({ ...prev, [s.id]: "speaking" }))}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                          (subTabs[s.id] || "summary") === "speaking"
                            ? "bg-white text-brand-700 shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                        )}
                      >
                        <Bot className="w-3.5 h-3.5 text-sky-500" /> Nhận xét Speaking
                      </button>
                    </div>

                    {/* Summary Tab */}
                    {(subTabs[s.id] || "summary") === "summary" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-black text-gray-900 flex items-center gap-2">
                            ✨ Nhận xét Tổng hợp từ AI
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                            {summary.level || "Unknown"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed bg-brand-50/40 p-3.5 rounded-xl border border-brand-100">{summary.overview}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/10 p-4">
                            <p className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-1.5">✅ Điểm mạnh</p>
                            <ul className="space-y-1.5 text-xs text-gray-600">
                              {(summary.strengths || []).map((str, i) => (
                                <li key={i}>• {str}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl border border-red-100 bg-red-50/10 p-4">
                            <p className="text-sm font-bold text-red-800 mb-2 flex items-center gap-1.5">⚠️ Cần cải thiện</p>
                            <ul className="space-y-1.5 text-xs text-gray-600">
                              {(summary.weaknesses || []).map((w, i) => (
                                <li key={i}>• {w}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {(summary.recommendations?.length ?? 0) > 0 && (
                          <div className="mt-4 border-t border-gray-100 pt-3.5">
                            <p className="text-sm font-bold text-brand-800 mb-2 flex items-center gap-1.5">💡 Lời khuyên ôn tập</p>
                            <ul className="space-y-1.5 text-xs text-gray-600">
                              {summary.recommendations.map((r, i) => (
                                <li key={i}>👉 {r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Writing Tab */}
                    {(subTabs[s.id] || "summary") === "writing" && (
                      <div className="space-y-4">
                        {s.scores?.writing ? (
                          <StudentAIScoreDisplay skill="writing" score={s.scores.writing as any} />
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-xs text-gray-400">
                            Chưa có nhận xét Writing từ AI.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Speaking Tab */}
                    {(subTabs[s.id] || "summary") === "speaking" && (
                      <div className="space-y-4">
                        {s.scores?.speaking ? (
                          <StudentAIScoreDisplay skill="speaking" score={s.scores.speaking as any} />
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-xs text-gray-400">
                            Chưa có nhận xét Speaking từ AI.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {isExpanded && s.is_released && !summary && (s.status === "completed" || s.status === "graded") && (
                  <div className="border-t border-gray-100 p-4 text-center text-sm text-gray-500">
                    Chưa có nhận xét tổng hợp.
                  </div>
                )}
                {isExpanded && (!s.is_released || (s.status !== "completed" && s.status !== "graded")) && (
                  <div className="border-t border-gray-100 p-8 text-center space-y-3 bg-gray-50/50">
                    <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto">
                      <Clock className="w-6 h-6 text-brand-600 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Kết quả đang được xử lý</p>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
                        Hệ thống đang chấm điểm hoặc chờ Admin phê duyệt. Bạn sẽ nhận được thông báo khi kết quả sẵn sàng!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
