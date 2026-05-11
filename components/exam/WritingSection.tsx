"use client";
import { cn } from "@/utils/cn";
import type { MockSkillWriting, MockSkillWritingTask } from "@/lib/mock-skill/types";
import { useMemo } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// ── Per-task values ───────────────────────────────────────────────
export type WritingValues = { task1: string; task2: string };

interface WritingSectionProps {
  data: MockSkillWriting;
  /** New: per-task values object */
  values: WritingValues;
  onChange: (values: WritingValues) => void;
  /** Legacy single-text fallback */
  value?: string;
  onChangeLegacy?: (text: string) => void;
}

// ── Word counter helpers ──────────────────────────────────────────
function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function countSentences(text: string) {
  return (text.match(/[.!?]+/g) || []).length;
}

// ── Single task textarea ──────────────────────────────────────────
function TaskEditor({
  task,
  text,
  onChange,
}: {
  task: MockSkillWritingTask;
  text: string;
  onChange: (t: string) => void;
}) {
  const minWords = task.minWords ?? (task.task === "1" ? 150 : 250);
  const words = useMemo(() => countWords(text), [text]);
  const sentences = useMemo(() => countSentences(text), [text]);

  const isOkay  = words >= minWords;
  const isNear  = words >= minWords - 20 && !isOkay;
  const wordCls = isOkay ? "text-emerald-700" : isNear ? "text-amber-700" : "text-red-600";
  const barCls  = isOkay ? "bg-emerald-500" : isNear ? "bg-amber-400" : "bg-red-400";

  const TASK_COLORS: Record<string, { border: string; bg: string; label: string; heading: string }> = {
    "1": { border: "border-sky-200",   bg: "bg-sky-50",   label: "text-sky-600",   heading: "text-sky-800" },
    "2": { border: "border-amber-200", bg: "bg-amber-50", label: "text-amber-600", heading: "text-amber-800" },
  };
  const tc = TASK_COLORS[task.task] ?? TASK_COLORS["2"];

  return (
    <div className="space-y-3">
      {/* Task prompt card */}
      <div className={cn("rounded-2xl border-2 p-5 space-y-3", tc.border, tc.bg)}>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-black uppercase tracking-wider", tc.label)}>
            Task {task.task}
          </span>
          {task.instruction && (
            <span className="text-xs text-gray-500 italic">{task.instruction}</span>
          )}
        </div>
        {task.prompt && (
          <p className={cn("font-medium leading-relaxed text-sm", tc.heading)}>{task.prompt}</p>
        )}
        {task.imageBlock && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={task.imageBlock.src}
            alt={task.imageBlock.alt || `Task ${task.task}`}
            className="max-w-full rounded-xl border border-white shadow-sm"
          />
        )}
        <p className={cn("text-xs font-semibold", tc.label)}>✱ Tối thiểu: {minWords} từ</p>
      </div>

      {/* Textarea */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white overflow-hidden focus-within:border-brand-400 transition-colors">
        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">Bài viết Task {task.task}</span>
          <div className="ml-auto flex items-center gap-4">
            <span className={cn("text-xs font-mono font-bold transition-colors", wordCls)}>
              {words} từ
            </span>
            <span className="text-xs text-gray-400 font-mono">{text.length} ký tự</span>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Viết Task ${task.task} tại đây...`}
          className="w-full px-5 py-4 text-sm text-gray-800 leading-[1.9] resize-none outline-none placeholder-gray-300"
          style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            minHeight: task.task === "1" ? "260px" : "380px",
          }}
          spellCheck
        />

        {/* Footer progress */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isOkay
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              : <AlertCircle className="w-4 h-4 text-amber-500" />}
            <div className="w-28 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-300", barCls)}
                style={{ width: `${Math.min(100, (words / minWords) * 100)}%` }}
              />
            </div>
            <span className={cn("text-xs font-medium", wordCls)}>
              {isOkay ? "Đủ từ ✓" : `Còn ${minWords - words} từ`}
            </span>
          </div>
          <span className="ml-auto text-xs text-gray-400">{sentences} câu</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export function WritingSection({ data, values, onChange }: WritingSectionProps) {
  const tasks = data.tasks || [];

  // Fallback: no tasks in DB → single textarea (legacy)
  if (tasks.length === 0) {
    const text = values.task1 || values.task2 || "";
    const minWords = data.minWords ?? 250;
    const words = countWords(text);
    const isOkay = words >= minWords;
    const isNear = words >= minWords - 20 && !isOkay;
    const wordCls = isOkay ? "text-emerald-700" : isNear ? "text-amber-700" : "text-red-600";

    return (
      <div className="max-w-3xl mx-auto space-y-5">
        {data.prompt && (
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Writing Task</p>
            <p className="text-gray-800 leading-relaxed">{data.prompt}</p>
          </div>
        )}
        {data.blocks.map((b, i) =>
          b.type === "text"
            ? <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: b.html }} />
            : b.type === "image"
            // eslint-disable-next-line @next/next/no-img-element
            ? <img key={i} src={b.src} alt={b.alt || ""} className="max-w-full rounded-xl border border-gray-100 shadow-sm" />
            : null
        )}
        <div className="rounded-2xl border-2 border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center">
            <span className="text-xs font-medium text-gray-500">Bài viết</span>
            <span className={cn("ml-auto text-xs font-mono font-bold", wordCls)}>{words} từ</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => onChange({ task1: e.target.value, task2: "" })}
            placeholder="Bắt đầu viết bài của bạn tại đây..."
            className="w-full px-5 py-4 text-sm text-gray-800 leading-[1.9] resize-none outline-none min-h-[360px] placeholder-gray-300"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            spellCheck
          />
        </div>
      </div>
    );
  }

  // Main: per-task textareas
  const taskValues: Record<string, string> = { "1": values.task1, "2": values.task2 };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Combined word count banner */}
      <div className="rounded-xl bg-white border border-gray-200 px-4 py-2.5 flex items-center gap-3">
        <span className="text-xs text-gray-500 font-medium">Tổng bài viết</span>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs font-mono font-bold text-gray-700">
            T1: <span className="text-sky-700">{countWords(values.task1)}</span> từ
          </span>
          <span className="text-xs font-mono font-bold text-gray-700">
            T2: <span className="text-amber-700">{countWords(values.task2)}</span> từ
          </span>
        </div>
      </div>

      {/* Task editors */}
      {tasks.map((task) => (
        <TaskEditor
          key={task.task}
          task={task}
          text={taskValues[task.task] ?? ""}
          onChange={(t) => {
            const key = task.task === "1" ? "task1" : "task2";
            onChange({ ...values, [key]: t });
          }}
        />
      ))}

      {/* Writing tips */}
      <details className="rounded-2xl border border-gray-100">
        <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-gray-600 hover:text-gray-800 list-none flex items-center gap-2">
          <span>💡</span>Mẹo viết bài tốt hơn
        </summary>
        <div className="px-4 pb-4 grid sm:grid-cols-2 gap-3 text-xs text-gray-600">
          <div className="space-y-1.5">
            <p className="font-semibold text-gray-700">Task 1 (≥150 từ)</p>
            <ul className="space-y-1">
              <li>• Intro: Paraphrase đề bài</li>
              <li>• Overview: Nêu xu hướng chính</li>
              <li>• Body: Chi tiết số liệu nổi bật</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-gray-700">Task 2 (≥250 từ)</p>
            <ul className="space-y-1">
              <li>• Introduction + thesis statement</li>
              <li>• Body 1 & 2: Luận điểm + ví dụ</li>
              <li>• Conclusion: Tóm tắt quan điểm</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-gray-700">Từ nối</p>
            <ul className="space-y-1">
              <li>• Furthermore, Moreover, In addition</li>
              <li>• However, Nevertheless, On the other hand</li>
              <li>• In conclusion, To summarize, Overall</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
