"use client";
import { cn } from "@/utils/cn";
import { getBandDescriptor } from "@/lib/mock-skill/band-mapping";
import { BandScoreRing } from "./ui/BandScoreRing";
import { SkillBadge } from "./ui/SkillBadge";
import { CheckCircle2, ChevronDown, ChevronUp, Home, List, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { MockSkillScores } from "@/lib/mock-skill/types";

interface ExamResultDashboardProps {
  examTitle: string;
  candidateName: string;
  email: string;
  scores: MockSkillScores;
  thiThuRoot: string;
  doneHomeHref: string;
}

const SKILL_LABELS = {
  listening: "Listening",
  reading: "Reading",
  speaking: "Speaking",
  writing: "Writing",
} as const;

function BandBar({ band, maxBand = 9 }: { band: number; maxBand?: number }) {
  const pct = (band / maxBand) * 100;
  const color =
    band >= 7 ? "from-emerald-400 to-emerald-600" :
    band >= 5.5 ? "from-blue-400 to-blue-600" :
    band >= 4 ? "from-amber-400 to-amber-600" :
    "from-red-400 to-red-600";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-1000`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-bold text-gray-800">{band > 0 ? band : "—"}</span>
    </div>
  );
}

function ScoreCard({
  skill,
  band,
  correct,
  total,
}: {
  skill: "listening" | "reading" | "speaking" | "writing";
  band: number;
  correct?: number;
  total?: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center gap-3">
      <SkillBadge skill={skill} variant="icon" size="sm" />
      <p className="text-xs font-semibold text-gray-500">{SKILL_LABELS[skill]}</p>
      <div className="text-3xl font-black text-gray-900">
        {band > 0 ? band.toFixed(1).replace(".0", "") : "—"}
      </div>
      {typeof correct === "number" && typeof total === "number" && total > 0 && (
        <p className="text-xs text-gray-500">
          {correct}/{total} câu đúng
        </p>
      )}
      <p className="text-xs text-center text-gray-400">{band > 0 ? getBandDescriptor(band) : "Chờ chấm"}</p>
    </div>
  );
}

function AnswerReviewSection({
  skill,
  items,
}: {
  skill: string;
  items: Array<{ id: string; expected: string; actual: string; ok: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const wrong = items.filter((i) => !i.ok);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-all"
      >
        <div className="flex items-center gap-3">
          <SkillBadge skill={skill as "listening" | "reading"} variant="icon" size="sm" />
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900">{SKILL_LABELS[skill as keyof typeof SKILL_LABELS]} — Chi tiết đáp án</p>
            <p className="text-xs text-gray-500">{wrong.length > 0 ? `${wrong.length} câu sai` : "Tất cả đúng"}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4">
          <div className="grid gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                  item.ok ? "bg-emerald-50" : "bg-red-50"
                )}
              >
                <span className={cn("font-bold w-12", item.ok ? "text-emerald-600" : "text-red-600")}>
                  {item.ok ? "✓" : "✗"} #{item.id}
                </span>
                <span className="text-gray-600 flex-1">
                  Đáp án của bạn: <strong>{item.actual || "(bỏ trống)"}</strong>
                </span>
                {!item.ok && (
                  <span className="text-emerald-700 font-semibold">→ {item.expected}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ExamResultDashboard({
  examTitle,
  candidateName,
  email,
  scores,
  thiThuRoot,
  doneHomeHref,
}: ExamResultDashboardProps) {
  const listeningBand = scores.listening?.band ?? 0;
  const readingBand = scores.reading?.band ?? 0;

  // Calculate partial overall (L+R only since W+S are pending)
  const knownBands = [listeningBand, readingBand].filter((b) => b > 0);
  const partialOverall = knownBands.length > 0
    ? Math.round((knownBands.reduce((a, b) => a + b, 0) / knownBands.length) * 2) / 2
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Success header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black text-gray-900">Đã nhận bài thành công!</h1>
        <p className="text-gray-500">
          Xin cảm ơn <strong>{candidateName}</strong>. Kết quả đầy đủ sẽ được gửi tới{" "}
          <strong>{email}</strong>.
        </p>
      </div>

      {/* Email notice */}
      <div className="rounded-2xl border-2 border-brand-200 bg-brand-50 p-4 flex items-start gap-3">
        <Mail className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-brand-800">Kết quả Writing & Speaking qua email</p>
          <p className="text-sm text-brand-700 mt-0.5">
            Kết quả phần Writing và Speaking sẽ được AI chấm và gửi đến hộp thư của bạn trong vài giờ làm việc. Vui lòng kiểm tra cả thư mục Spam.
          </p>
        </div>
      </div>

      {/* Score overview */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Kết quả ngay lập tức</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ScoreCard
            skill="listening"
            band={listeningBand}
            correct={scores.listening?.correct}
            total={scores.listening?.total}
          />
          <ScoreCard
            skill="reading"
            band={readingBand}
            correct={scores.reading?.correct}
            total={scores.reading?.total}
          />
          <ScoreCard skill="speaking" band={0} />
          <ScoreCard skill="writing" band={0} />
        </div>
      </div>

      {/* Band bars */}
      {(listeningBand > 0 || readingBand > 0) && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">Điểm đã có</h2>
          {listeningBand > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Listening</span>
                <span>{getBandDescriptor(listeningBand)}</span>
              </div>
              <BandBar band={listeningBand} />
            </div>
          )}
          {readingBand > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Reading</span>
                <span>{getBandDescriptor(readingBand)}</span>
              </div>
              <BandBar band={readingBand} />
            </div>
          )}
          {partialOverall > 0 && (
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">Điểm trung bình (L+R)</span>
              <span className="text-2xl font-black text-brand-700">{partialOverall.toFixed(1).replace(".0", "")}</span>
            </div>
          )}
        </div>
      )}

      {/* Answer review */}
      {scores.listening?.items && scores.listening.items.length > 0 && (
        <AnswerReviewSection skill="listening" items={scores.listening.items} />
      )}
      {scores.reading?.items && scores.reading.items.length > 0 && (
        <AnswerReviewSection skill="reading" items={scores.reading.items} />
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href={thiThuRoot} className="flex-1">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-white text-gray-700 py-3.5 font-semibold text-sm hover:border-brand-300 hover:text-brand-700 transition-all"
          >
            <List className="w-4 h-4" />
            Về danh sách đề thi
          </button>
        </Link>
        <Link href={doneHomeHref} className="flex-1">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-sky-600 text-white py-3.5 font-semibold text-sm hover:opacity-90 transition-all shadow-md"
          >
            <Home className="w-4 h-4" />
            Trang chủ
          </button>
        </Link>
      </div>
    </div>
  );
}
