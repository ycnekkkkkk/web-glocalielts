"use client";
import { cn } from "@/utils/cn";
import type { MockSkillQuestion } from "@/lib/mock-skill/types";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";

interface QuestionPaletteProps {
  questions: MockSkillQuestion[];
  answers: Record<string, string | number>;
  flagged: string[];
  currentQuestionId?: string;
  onJump?: (questionId: string) => void;
  skillLabel?: string;
  className?: string;
}

function getStatus(
  question: MockSkillQuestion,
  answers: Record<string, string | number>,
  flagged: string[]
): "answered" | "flagged" | "unanswered" {
  if (flagged.includes(question.id)) return "flagged";
  const v = answers[question.id];
  if (v !== undefined && v !== "") return "answered";
  return "unanswered";
}

const STATUS_STYLES = {
  answered: "bg-emerald-500 text-white border-emerald-500",
  flagged: "bg-amber-400 text-white border-amber-400",
  unanswered: "bg-white text-gray-500 border-gray-200 hover:border-brand-300",
};

export function QuestionPalette({
  questions,
  answers,
  flagged,
  currentQuestionId,
  onJump,
  skillLabel,
  className,
}: QuestionPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);

  const answered = questions.filter((q) => {
    const v = answers[q.id];
    return v !== undefined && v !== "";
  }).length;

  const flaggedCount = questions.filter((q) => flagged.includes(q.id)).length;

  const palette = (
    <div className="flex flex-col gap-3">
      {/* Stats */}
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-gray-600">{answered} đã trả lời</span>
        </span>
        {flaggedCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-400" />
            <span className="text-gray-600">{flaggedCount} đánh dấu</span>
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-gray-300" />
          <span className="text-gray-600">{questions.length - answered} còn lại</span>
        </span>
      </div>

      {/* Question grid */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q) => {
          const status = getStatus(q, answers, flagged);
          const isCurrent = q.id === currentQuestionId;
          const displayNo = typeof q.display_no === "number" ? q.display_no : q.id;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                onJump?.(q.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-8 h-8 rounded-lg border-2 text-xs font-bold transition-all duration-150",
                STATUS_STYLES[status],
                isCurrent && "ring-2 ring-brand-500 ring-offset-1 scale-110"
              )}
              title={`Câu ${displayNo} — ${status === "answered" ? "Đã trả lời" : status === "flagged" ? "Đánh dấu" : "Chưa trả lời"}`}
            >
              {displayNo}
            </button>
          );
        })}
      </div>

      {/* Progress text */}
      <p className="text-xs text-gray-500 text-center">
        {answered}/{questions.length} câu đã trả lời
      </p>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-brand-600 text-white px-4 py-2.5 shadow-lg text-sm font-semibold"
        >
          <span>{answered}/{questions.length}</span>
          <span className="text-brand-200">câu</span>
        </button>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div className="relative w-full bg-white rounded-t-3xl p-5 pb-8 shadow-xl max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">
                {skillLabel ? `${skillLabel} — ` : ""}Bảng câu hỏi
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {palette}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col gap-4 w-56 flex-shrink-0 sticky top-24 self-start",
          className
        )}
      >
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
            {skillLabel || "Bảng câu hỏi"}
          </h3>
          {palette}
        </div>
      </aside>
    </>
  );
}
