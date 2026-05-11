"use client";
import { cn } from "@/utils/cn";
import type { MockSkillQuestion } from "@/lib/mock-skill/types";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const TF_OPTIONS = ["True", "False", "Not Given"] as const;

interface QuestionRendererProps {
  question: MockSkillQuestion;
  value: string | number | undefined;
  onChange: (val: string | number) => void;
  flagged?: boolean;
  onFlag?: () => void;
  showResult?: boolean;
  expectedAnswer?: string;
  displayNo?: string | number;
}

function ChoiceOption({
  letter,
  text,
  selected,
  correct,
  wrong,
  onClick,
}: {
  letter: string;
  text: string;
  selected: boolean;
  correct?: boolean;
  wrong?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-150 cursor-pointer",
        "hover:border-brand-400 hover:bg-brand-50",
        selected && !correct && !wrong && "border-brand-500 bg-brand-50 shadow-sm",
        correct && "border-emerald-500 bg-emerald-50",
        wrong && "border-red-400 bg-red-50",
        !selected && !correct && !wrong && "border-gray-200 bg-white"
      )}
    >
      <span
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
          selected && !correct && !wrong && "border-brand-500 bg-brand-500 text-white",
          correct && "border-emerald-500 bg-emerald-500 text-white",
          wrong && "border-red-400 bg-red-400 text-white",
          !selected && !correct && !wrong && "border-gray-300 text-gray-500"
        )}
      >
        {letter}
      </span>
      <span className={cn("text-sm leading-relaxed pt-0.5", selected || correct || wrong ? "font-medium" : "text-gray-700")}>
        {text}
      </span>
    </button>
  );
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  flagged,
  onFlag,
  showResult,
  expectedAnswer,
  displayNo,
}: QuestionRendererProps) {
  const qNo = displayNo ?? question.display_no ?? question.id;

  return (
    <div
      id={`question-${question.id}`}
      className={cn(
        "rounded-2xl border-2 transition-all duration-200",
        flagged ? "border-amber-300 bg-amber-50/30" : "border-gray-100 bg-white",
        "p-4 sm:p-5 shadow-sm hover:shadow-md"
      )}
    >
      {/* Question header */}
      <div className="flex items-start gap-3 mb-4">
        <span
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
            value !== undefined ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"
          )}
        >
          {qNo}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-relaxed">{question.stem}</p>
        </div>
        {onFlag && (
          <button
            type="button"
            onClick={onFlag}
            className={cn(
              "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all",
              flagged ? "bg-amber-400 text-white" : "bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-500"
            )}
            title={flagged ? "Bỏ đánh dấu" : "Đánh dấu để xem lại"}
          >
            <FlagIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Answer inputs */}
      <div className="ml-11">
        {question.type === "text" && (
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nhập đáp án..."
            className={cn(
              "w-full sm:w-64 rounded-xl border-2 px-4 py-2.5 text-sm transition-all",
              "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500",
              showResult && expectedAnswer && value === expectedAnswer
                ? "border-emerald-400 bg-emerald-50"
                : showResult && value !== expectedAnswer
                ? "border-red-400 bg-red-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          />
        )}

        {question.type === "true_false_not_given" && (
          <div className="flex flex-wrap gap-2">
            {TF_OPTIONS.map((opt, idx) => {
              const isSelected = value === idx;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(idx)}
                  className={cn(
                    "rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-all",
                    isSelected
                      ? "border-brand-500 bg-brand-600 text-white shadow-sm"
                      : "border-gray-200 text-gray-600 hover:border-brand-300 hover:bg-brand-50"
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {question.type === "matching" && (
          <select
            value={value !== undefined ? String(value) : ""}
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              onChange(Number.isNaN(idx) ? e.target.value : idx);
            }}
            className="w-full sm:w-72 rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
          >
            <option value="">— Chọn đáp án —</option>
            {(question.options || []).map((k, idx) => (
              <option key={k} value={idx}>
                {k}{question.options_map?.[k] ? ` – ${question.options_map[k]}` : ""}
              </option>
            ))}
          </select>
        )}

        {(question.type === "single_choice" || question.type === "multiple_choice") && (
          <div className="space-y-2">
            {(question.options || []).map((opt, idx) => (
              <ChoiceOption
                key={idx}
                letter={OPTION_LETTERS[idx] || String(idx + 1)}
                text={opt}
                selected={value === idx}
                onClick={() => onChange(idx)}
              />
            ))}
          </div>
        )}

        {/* Result indicator */}
        {showResult && expectedAnswer !== undefined && question.type === "text" && (
          <p className="mt-2 text-xs font-medium">
            {String(value).toLowerCase() === String(expectedAnswer).toLowerCase() ? (
              <span className="text-emerald-600">✓ Đúng</span>
            ) : (
              <span className="text-red-600">✗ Đáp án: {expectedAnswer}</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 1a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 1 0V9.5h8.5a.5.5 0 0 0 .354-.854L9.207 6l3.147-2.646A.5.5 0 0 0 12 2.5H3.5V1.5A.5.5 0 0 0 3 1z" />
    </svg>
  );
}
