"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import { createBrowserClient } from "@/lib/supabase/client";
import { getBandDescriptor } from "@/lib/mock-skill/band-mapping";
import { cn } from "@/utils/cn";
import { ArrowLeft, Calendar, ChevronRight, Clock, History } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Submission {
  id: string;
  created_at: string;
  status: string;
  is_released: boolean;
  scores: {
    listening?: { correct: number; total: number; band?: number };
    reading?: { correct: number; total: number; band?: number };
    writing?: { band?: number };
    speaking?: { band?: number };
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

export default function TestHistoryPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      <Link href="/student/thi-thu" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-brand-700 transition-colors mb-4 bg-gray-50 px-3 py-1 rounded-full w-fit">
        <ArrowLeft className="w-3.5 h-3.5" /> Quay lại danh sách đề
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center">
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
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        ✨ Nhận xét từ AI
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                        {summary.level || "Unknown"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-4">{summary.overview}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 mb-1.5">✅ Điểm mạnh</p>
                        <ul className="space-y-1 text-sm text-gray-600">
                          {(summary.strengths || []).map((str, i) => (
                            <li key={i}>• {str}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-red-700 mb-1.5">⚠️ Cần cải thiện</p>
                        <ul className="space-y-1 text-sm text-gray-600">
                          {(summary.weaknesses || []).map((w, i) => (
                            <li key={i}>• {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {(summary.recommendations?.length ?? 0) > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-3">
                        <p className="text-xs font-semibold text-brand-700 mb-1.5">💡 Lời khuyên ôn tập</p>
                        <ul className="space-y-1 text-sm text-gray-600">
                          {summary.recommendations.map((r, i) => (
                            <li key={i}>👉 {r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {isExpanded && s.is_released && !summary && s.status === "completed" && (
                  <div className="border-t border-gray-100 p-4 text-center text-sm text-gray-500">
                    Chưa có nhận xét tổng hợp.
                  </div>
                )}
                {isExpanded && (!s.is_released || s.status !== "completed") && (
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
