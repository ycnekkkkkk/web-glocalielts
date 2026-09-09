"use client";
import { cn } from "@/utils/cn";
import { Clock, Maximize2, Minimize2, Save, X } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

type ExamStep = "intro" | "listening" | "reading" | "speaking" | "writing" | "submitting" | "done";

const STEPS: { key: ExamStep; label: string; short: string; color: string }[] = [
  { key: "listening", label: "Listening", short: "L", color: "from-blue-500 to-indigo-600" },
  { key: "reading", label: "Reading", short: "R", color: "from-emerald-500 to-teal-600" },
  { key: "speaking", label: "Speaking", short: "S", color: "from-violet-500 to-purple-600" },
  { key: "writing", label: "Writing", short: "W", color: "from-amber-500 to-orange-600" },
];

const SKILL_STEPS = ["listening", "reading", "speaking", "writing"] as const;

interface ExamHeaderProps {
  examTitle: string;
  step: ExamStep;
  totalTimeMs?: number;
  startTimeMs?: number;
  answeredCount?: number;
  totalQuestions?: number;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onSaveExit?: () => void;
  saveStatus?: "saving" | "saved" | "idle";
  lastSavedTime?: string;
}

function formatTime(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExamHeader({
  examTitle,
  step,
  totalTimeMs,
  startTimeMs,
  answeredCount = 0,
  totalQuestions = 0,
  isFullscreen = false,
  onToggleFullscreen,
  onSaveExit,
  saveStatus = "idle",
  lastSavedTime,
}: ExamHeaderProps) {
  const [remainingMs, setRemainingMs] = useState<number | null>(
    totalTimeMs && startTimeMs ? totalTimeMs - (Date.now() - startTimeMs) : null
  );

  useEffect(() => {
    if (!totalTimeMs || !startTimeMs) return;
    const tick = () => {
      const elapsed = Date.now() - startTimeMs;
      setRemainingMs(Math.max(0, totalTimeMs - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [totalTimeMs, startTimeMs]);

  const progressPct = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const currentStepIndex = SKILL_STEPS.indexOf(step as typeof SKILL_STEPS[number]);
  const isWarning = remainingMs !== null && remainingMs < 5 * 60 * 1000;
  const isUrgent = remainingMs !== null && remainingMs < 2 * 60 * 1000;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="px-4 sm:px-6 py-3 flex items-center gap-4">
        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium hidden sm:block">IELTS Mock Test</p>
          <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate">{examTitle}</h1>
        </div>

        {/* Step indicators */}
        <div className="hidden md:flex items-center gap-1">
          {STEPS.map((s, i) => {
            const isActive = s.key === step;
            const isDone = currentStepIndex > i;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all",
                  isActive && `bg-gradient-to-r ${s.color} text-white shadow-sm`,
                  isDone && "bg-emerald-100 text-emerald-700",
                  !isActive && !isDone && "bg-gray-100 text-gray-500"
                )}
              >
                {isDone ? "✓" : s.short}
                <span className="hidden lg:inline">{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Timer */}
        {remainingMs !== null && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-mono font-bold transition-all",
              isUrgent ? "bg-red-100 text-red-700 animate-pulse" :
              isWarning ? "bg-amber-100 text-amber-700" :
              "bg-gray-100 text-gray-700"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            {formatTime(remainingMs)}
          </div>
        )}

        {/* Answer counter */}
        {totalQuestions > 0 && (
          <span className="hidden sm:block text-xs text-gray-500 font-medium whitespace-nowrap">
            {answeredCount}/{totalQuestions}
          </span>
        )}

        {/* Actions & Auto-save indicator */}
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Đang lưu...
            </span>
          )}
          {saveStatus === "saved" && lastSavedTime && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Đã lưu {lastSavedTime}
            </span>
          )}

          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
              title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
          {onSaveExit && (
            <button
              type="button"
              onClick={onSaveExit}
              className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              <Save className="w-3.5 h-3.5 text-gray-500" />
              Lưu & Thoát
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
