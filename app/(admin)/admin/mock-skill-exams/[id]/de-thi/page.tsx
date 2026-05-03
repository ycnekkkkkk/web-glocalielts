"use client";

import PageWrapper from "@/components/layouts/PageWrapper";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type {
  MockSkillBlock,
  MockSkillContentPublic,
  MockSkillQuestion,
  MockSkillQuestionType,
} from "@/lib/mock-skill/types";
import type { MockSkillExamDef } from "@/types";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Tab = "info" | "listening" | "reading" | "speaking" | "writing" | "answers";

const QUESTION_TYPE_LABELS: Record<MockSkillQuestionType, string> = {
  single_choice: "MCQ (Chọn 1)",
  text: "Điền từ / số",
  true_false_not_given: "True / False / Not Given",
  matching: "Matching (Nối)",
  multiple_choice: "Chọn nhiều",
};

const TF_OPTIONS = ["True", "False", "Not Given"];

function emptyContent(): MockSkillContentPublic {
  return {
    version: 1,
    listening: { title: "IELTS Listening Test", blocks: [], questions: [] },
    reading: { title: "IELTS Academic Reading Test", blocks: [], questions: [] },
    speaking: { title: "IELTS Speaking Test", blocks: [], prompt: "" },
    writing: { title: "IELTS Writing Test", blocks: [], prompt: "", minWords: 250 },
  };
}

// ─────────────────────────────────────────────
// Block Editor – một block (text/audio/image)
// ─────────────────────────────────────────────
function BlockEditor({
  block,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  block: MockSkillBlock;
  onChange: (b: MockSkillBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {block.type === "text" ? "📝 Text" : block.type === "audio" ? "🎵 Audio" : "🖼 Image"}
        </span>
        <div className="flex gap-1">
          <button type="button" onClick={onMoveUp} className="p-1 rounded hover:bg-gray-100" title="Lên"><ChevronUp className="w-4 h-4" /></button>
          <button type="button" onClick={onMoveDown} className="p-1 rounded hover:bg-gray-100" title="Xuống"><ChevronDown className="w-4 h-4" /></button>
          <button type="button" onClick={onRemove} className="p-1 rounded hover:bg-red-50 text-red-500" title="Xóa"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Section label (common) */}
      <label className="block text-xs">
        <span className="text-gray-500">Section (nhãn nhóm, tùy chọn)</span>
        <input
          className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
          placeholder="VD: Section 1, Passage 1"
          value={(block as { section?: string }).section || ""}
          onChange={(e) => onChange({ ...block, section: e.target.value } as MockSkillBlock)}
        />
      </label>

      {block.type === "text" && (
        <label className="block text-xs">
          <span className="text-gray-500">Nội dung HTML</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs font-mono min-h-[100px]"
            placeholder="<p>Nội dung bài đọc / hướng dẫn...</p>"
            value={block.html}
            onChange={(e) => onChange({ ...block, html: e.target.value })}
          />
        </label>
      )}

      {block.type === "audio" && (
        <div className="space-y-2">
          <label className="block text-xs">
            <span className="text-gray-500">URL Audio (YouTube hoặc file path)</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs font-mono"
              placeholder="VD: /audio/test1/section1.m4a  hoặc  https://youtu.be/..."
              value={block.url}
              onChange={(e) => onChange({ ...block, url: e.target.value })}
            />
          </label>
          <label className="block text-xs">
            <span className="text-gray-500">Nhãn</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
              placeholder="VD: Section 1"
              value={block.label || ""}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
            />
          </label>
        </div>
      )}

      {block.type === "image" && (
        <div className="space-y-2">
          <label className="block text-xs">
            <span className="text-gray-500">URL Ảnh</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs font-mono"
              placeholder="VD: /images/chart-task1.png  hoặc  https://..."
              value={block.src}
              onChange={(e) => onChange({ ...block, src: e.target.value })}
            />
          </label>
          <label className="block text-xs">
            <span className="text-gray-500">Alt text</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
              placeholder="Mô tả ảnh"
              value={block.alt || ""}
              onChange={(e) => onChange({ ...block, alt: e.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Question Editor – một câu hỏi
// ─────────────────────────────────────────────
function QuestionEditor({
  q,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  q: MockSkillQuestion;
  onChange: (next: MockSkillQuestion) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  function setOptions(opts: string[]) {
    onChange({ ...q, options: opts });
  }

  function addOption() { setOptions([...(q.options || []), ""]); }
  function removeOption(idx: number) { setOptions((q.options || []).filter((_, i) => i !== idx)); }
  function updateOption(idx: number, val: string) {
    const opts = [...(q.options || [])];
    opts[idx] = val;
    setOptions(opts);
  }

  function handleTypeChange(type: MockSkillQuestionType) {
    const next: MockSkillQuestion = { ...q, type };
    if (type === "true_false_not_given") {
      next.options = TF_OPTIONS;
      next.options_map = undefined;
    } else if (type === "text") {
      next.options = undefined;
      next.options_map = undefined;
    } else if (type === "matching") {
      next.options = next.options || ["A", "B", "C", "D", "E", "F", "G", "H"];
    } else {
      next.options = next.options || [];
      next.options_map = undefined;
    }
    onChange(next);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-500">Câu hỏi</span>
        <div className="flex gap-1">
          <button type="button" onClick={onMoveUp} className="p-1 rounded hover:bg-gray-200" title="Lên"><ChevronUp className="w-4 h-4" /></button>
          <button type="button" onClick={onMoveDown} className="p-1 rounded hover:bg-gray-200" title="Xuống"><ChevronDown className="w-4 h-4" /></button>
          <button type="button" onClick={onRemove} className="p-1 rounded hover:bg-red-50 text-red-500" title="Xóa"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* ID / Display No / Type / Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <label className="block">
          <span className="text-gray-500">ID câu *</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 font-mono"
            placeholder="1"
            value={q.id}
            onChange={(e) => onChange({ ...q, id: e.target.value.trim() })}
          />
        </label>
        <label className="block">
          <span className="text-gray-500">Số hiển thị</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1"
            type="number"
            placeholder="1"
            value={q.display_no ?? ""}
            onChange={(e) => onChange({ ...q, display_no: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </label>
        <label className="block">
          <span className="text-gray-500">Loại câu hỏi</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 bg-white"
            value={q.type}
            onChange={(e) => handleTypeChange(e.target.value as MockSkillQuestionType)}
          >
            {(Object.entries(QUESTION_TYPE_LABELS) as [MockSkillQuestionType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-gray-500">Section</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1"
            placeholder="VD: Section 1"
            value={q.section || ""}
            onChange={(e) => onChange({ ...q, section: e.target.value || undefined })}
          />
        </label>
      </div>

      {/* Stem */}
      <label className="block text-xs">
        <span className="text-gray-500">Đề bài (stem) *</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-sm min-h-[60px]"
          placeholder="Nội dung câu hỏi..."
          value={q.stem}
          onChange={(e) => onChange({ ...q, stem: e.target.value })}
        />
      </label>

      {/* Options (MCQ / Multiple choice) */}
      {(q.type === "single_choice" || q.type === "multiple_choice") && (
        <div className="space-y-2 text-xs">
          <span className="text-gray-500">Các đáp án</span>
          {(q.options || []).map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-gray-400 w-5 shrink-0">{String.fromCharCode(65 + idx)}.</span>
              <input
                className="flex-1 rounded-lg border border-gray-200 px-2 py-1"
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                placeholder={`Đáp án ${String.fromCharCode(65 + idx)}`}
              />
              <button type="button" onClick={() => removeOption(idx)} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addOption} className="text-brand-600 hover:text-brand-700 flex items-center gap-1 text-xs">
            <Plus className="w-3 h-3" /> Thêm đáp án
          </button>
        </div>
      )}

      {/* True/False/Not Given — readonly options */}
      {q.type === "true_false_not_given" && (
        <div className="flex gap-2 text-xs">
          {TF_OPTIONS.map((o) => (
            <span key={o} className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{o}</span>
          ))}
        </div>
      )}

      {/* Matching */}
      {q.type === "matching" && (
        <div className="space-y-2 text-xs">
          <span className="text-gray-500">Keys (các lựa chọn, VD: A, B, C...)</span>
          <div className="flex flex-wrap gap-1">
            {(q.options || []).map((k) => (
              <span key={k} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{k}</span>
            ))}
          </div>
          <input
            className="w-full rounded-lg border border-gray-200 px-2 py-1 font-mono"
            placeholder="VD: A,B,C,D,E,F,G,H"
            value={(q.options || []).join(",")}
            onChange={(e) => setOptions(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          />
          <div className="space-y-1">
            <span className="text-gray-500 block">Options Map (mỗi dòng: KEY: mô tả)</span>
            <textarea
              className="w-full rounded-lg border border-gray-200 px-2 py-1 font-mono text-xs min-h-[80px]"
              placeholder={"A: Parents must supervise their children\nB: There are new things to see\nC: It is closed today"}
              value={Object.entries(q.options_map || {}).map(([k, v]) => `${k}: ${v}`).join("\n")}
              onChange={(e) => {
                const map: Record<string, string> = {};
                e.target.value.split("\n").forEach((line) => {
                  const sep = line.indexOf(":");
                  if (sep > 0) map[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
                });
                onChange({ ...q, options_map: map });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Skill Editor – blocks + questions
// ─────────────────────────────────────────────
function SkillEditor({
  title,
  blocks,
  questions,
  onTitle,
  onBlocks,
  onQuestions,
  showPrompt,
  prompt,
  onPrompt,
  showMinWords,
  minWords,
  onMinWords,
}: {
  title: string;
  blocks: MockSkillBlock[];
  questions?: MockSkillQuestion[];
  onTitle: (t: string) => void;
  onBlocks: (b: MockSkillBlock[]) => void;
  onQuestions?: (q: MockSkillQuestion[]) => void;
  showPrompt?: boolean;
  prompt?: string;
  onPrompt?: (p: string) => void;
  showMinWords?: boolean;
  minWords?: number;
  onMinWords?: (n: number) => void;
}) {
  function moveBlock(idx: number, dir: -1 | 1) {
    const next = [...blocks];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onBlocks(next);
  }

  function addBlock(type: MockSkillBlock["type"]) {
    const base = { section: "" } as { section: string };
    if (type === "text") onBlocks([...blocks, { ...base, type, html: "" }]);
    else if (type === "audio") onBlocks([...blocks, { ...base, type, url: "", label: "" }]);
    else onBlocks([...blocks, { ...base, type: "image", src: "", alt: "" }]);
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    if (!questions || !onQuestions) return;
    const next = [...questions];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onQuestions(next);
  }

  function addQuestion() {
    if (!questions || !onQuestions) return;
    const nextId = String((questions.length || 0) + 1);
    onQuestions([
      ...questions,
      { id: nextId, stem: "", type: "single_choice", options: ["", "", ""] },
    ]);
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <label className="block text-sm">
        <span className="font-medium text-gray-700">Tiêu đề phần thi</span>
        <input
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
        />
      </label>

      {/* Prompt (Speaking / Writing) */}
      {showPrompt && (
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Đề bài / Prompt</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[100px]"
            placeholder="Nhập nội dung đề bài..."
            value={prompt ?? ""}
            onChange={(e) => onPrompt?.(e.target.value)}
          />
        </label>
      )}

      {/* Min words (Writing only) */}
      {showMinWords && (
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Số từ tối thiểu</span>
          <input
            type="number"
            className="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={minWords ?? 250}
            onChange={(e) => onMinWords?.(Number(e.target.value))}
          />
        </label>
      )}

      {/* Blocks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Nội dung (Blocks)</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => addBlock("text")} className="text-xs text-brand-600 hover:text-brand-700 border border-brand-200 rounded-lg px-2 py-1 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Text
            </button>
            <button type="button" onClick={() => addBlock("audio")} className="text-xs text-brand-600 hover:text-brand-700 border border-brand-200 rounded-lg px-2 py-1 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Audio
            </button>
            <button type="button" onClick={() => addBlock("image")} className="text-xs text-brand-600 hover:text-brand-700 border border-brand-200 rounded-lg px-2 py-1 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Ảnh
            </button>
          </div>
        </div>
        {blocks.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
            Chưa có block nào. Thêm Text / Audio / Ảnh ở trên.
          </p>
        )}
        {blocks.map((b, i) => (
          <BlockEditor
            key={i}
            block={b}
            onChange={(nb) => { const next = [...blocks]; next[i] = nb; onBlocks(next); }}
            onRemove={() => onBlocks(blocks.filter((_, idx) => idx !== i))}
            onMoveUp={() => moveBlock(i, -1)}
            onMoveDown={() => moveBlock(i, 1)}
          />
        ))}
      </div>

      {/* Questions (Listening / Reading only) */}
      {questions !== undefined && onQuestions && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Câu hỏi ({questions.length})</span>
            <button type="button" onClick={addQuestion} className="text-xs text-brand-600 hover:text-brand-700 border border-brand-200 rounded-lg px-2 py-1 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Thêm câu hỏi
            </button>
          </div>
          {questions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
              Chưa có câu hỏi.
            </p>
          )}
          {questions.map((q, i) => (
            <QuestionEditor
              key={i}
              q={q}
              onChange={(nq) => { const next = [...questions]; next[i] = nq; onQuestions(next); }}
              onRemove={() => onQuestions(questions.filter((_, idx) => idx !== i))}
              onMoveUp={() => moveQuestion(i, -1)}
              onMoveDown={() => moveQuestion(i, 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Answer Key Editor
// ─────────────────────────────────────────────
function AnswerKeyEditor({
  content,
  answers,
  onChange,
}: {
  content: MockSkillContentPublic;
  answers: { listening: Record<string, string>; reading: Record<string, string> };
  onChange: (a: typeof answers) => void;
}) {
  function set(skill: "listening" | "reading", id: string, val: string) {
    onChange({ ...answers, [skill]: { ...answers[skill], [id]: val } });
  }

  function renderQuestionAnswer(q: MockSkillQuestion, skill: "listening" | "reading") {
    const val = answers[skill][q.id] || "";
    if (q.type === "text") {
      return (
        <input
          className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm"
          placeholder="Nhập đáp án đúng..."
          value={val}
          onChange={(e) => set(skill, q.id, e.target.value)}
        />
      );
    }
    if (q.type === "true_false_not_given") {
      return (
        <select
          className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm bg-white"
          value={val}
          onChange={(e) => set(skill, q.id, e.target.value)}
        >
          <option value="">— chọn —</option>
          {TF_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (q.type === "matching") {
      return (
        <select
          className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm bg-white"
          value={val}
          onChange={(e) => set(skill, q.id, e.target.value)}
        >
          <option value="">— chọn —</option>
          {(q.options || []).map((k) => (
            <option key={k} value={k}>{k}{q.options_map?.[k] ? ` – ${q.options_map[k]}` : ""}</option>
          ))}
        </select>
      );
    }
    // single_choice / multiple_choice
    return (
      <select
        className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm bg-white"
        value={val}
        onChange={(e) => set(skill, q.id, e.target.value)}
      >
        <option value="">— chọn —</option>
        {(q.options || []).map((o, i) => (
          <option key={i} value={o}>{String.fromCharCode(65 + i)}. {o}</option>
        ))}
      </select>
    );
  }

  return (
    <div className="space-y-8">
      {/* Listening answers */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          🎧 Đáp án Listening ({content.listening.questions.length} câu)
        </h3>
        {content.listening.questions.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có câu hỏi Listening.</p>
        ) : (
          <div className="space-y-2">
            {content.listening.questions.map((q) => (
              <div key={q.id} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-500 w-10 shrink-0">Q {q.display_no ?? q.id}</span>
                <span className="text-xs text-gray-600 flex-1 truncate">{q.stem}</span>
                <div className="w-48 shrink-0">
                  {renderQuestionAnswer(q, "listening")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reading answers */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          📖 Đáp án Reading ({content.reading.questions.length} câu)
        </h3>
        {content.reading.questions.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có câu hỏi Reading.</p>
        ) : (
          <div className="space-y-2">
            {content.reading.questions.map((q) => (
              <div key={q.id} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-500 w-10 shrink-0">Q {q.display_no ?? q.id}</span>
                <span className="text-xs text-gray-600 flex-1 truncate">{q.stem}</span>
                <div className="w-48 shrink-0">
                  {renderQuestionAnswer(q, "reading")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function AdminMockSkillEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [exam, setExam] = useState<MockSkillExamDef | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAnswers, setSavingAnswers] = useState(false);

  // Editable state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [content, setContent] = useState<MockSkillContentPublic>(emptyContent());
  const [answerKey, setAnswerKey] = useState<{ listening: Record<string, string>; reading: Record<string, string> }>({
    listening: {},
    reading: {},
  });

  // Load exam & answers
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [examRes, answerRes] = await Promise.all([
        fetch(`/api/admin/mock-skill-exams/${examId}`),
        fetch(`/api/admin/mock-skill-exams/${examId}/answers`),
      ]);
      const examJson = (await examRes.json().catch(() => ({}))) as { exam?: MockSkillExamDef; error?: string };
      const answerJson = (await answerRes.json().catch(() => ({}))) as {
        answers?: { listening: Record<string, string>; reading: Record<string, string> };
      };
      if (cancelled) return;

      if (!examRes.ok || !examJson.exam) {
        toast.error(examJson.error || "Không tải được đề");
        setLoading(false);
        return;
      }
      const e = examJson.exam;
      setExam(e);
      setTitle(e.title);
      setSlug(e.slug);
      setDescription(e.description ?? "");
      setIsActive(e.is_active);
      const c = (e.content_public as unknown as MockSkillContentPublic) || emptyContent();
      setContent({
        version: c.version ?? 1,
        listening: c.listening ?? { title: "IELTS Listening Test", blocks: [], questions: [] },
        reading: c.reading ?? { title: "IELTS Academic Reading Test", blocks: [], questions: [] },
        speaking: c.speaking ?? { title: "IELTS Speaking Test", blocks: [], prompt: "" },
        writing: c.writing ?? { title: "IELTS Writing Test", blocks: [], prompt: "", minWords: 250 },
      });
      if (answerJson.answers) setAnswerKey(answerJson.answers);
      setLoading(false);
    }
    load().catch(console.error);
    return () => { cancelled = true; };
  }, [examId]);

  const saveContent = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/mock-skill-exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          is_active: isActive,
          content_public: content,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) { toast.error(json.error || "Lưu thất bại"); return; }
      toast.success("Đã lưu đề!");
    } catch {
      toast.error("Lỗi mạng");
    } finally {
      setSaving(false);
    }
  }, [examId, title, slug, description, isActive, content]);

  const saveAnswers = useCallback(async () => {
    setSavingAnswers(true);
    try {
      const res = await fetch(`/api/admin/mock-skill-exams/${examId}/answers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answerKey),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) { toast.error(json.error || "Lưu đáp án thất bại"); return; }
      toast.success("Đã lưu đáp án!");
    } catch {
      toast.error("Lỗi mạng");
    } finally {
      setSavingAnswers(false);
    }
  }, [examId, answerKey]);

  // ─── Tab definitions ───
  const TABS: { id: Tab; label: string }[] = [
    { id: "info", label: "Thông tin" },
    { id: "listening", label: `🎧 Listening (${content.listening.questions.length})` },
    { id: "reading", label: `📖 Reading (${content.reading.questions.length})` },
    { id: "speaking", label: "🎤 Speaking" },
    { id: "writing", label: "✍️ Writing" },
    { id: "answers", label: "🔑 Đáp án" },
  ];

  if (loading) {
    return (
      <PageWrapper>
        <div className="p-10 text-center text-gray-500">Đang tải đề…</div>
      </PageWrapper>
    );
  }

  if (!exam) {
    return (
      <PageWrapper>
        <Link href="/admin/mock-skill-exams">
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Quay lại</Button>
        </Link>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <Link href="/admin/mock-skill-exams" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-brand-700 mb-2">
            <ArrowLeft className="w-4 h-4" /> Danh sách đề
          </Link>
          <h1 className="page-title">{title || exam.title}</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">/thi-thu/{slug}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/thi-thu/${exam.slug}`} target="_blank">
            <Button variant="ghost" size="sm">Xem trang thí sinh ↗</Button>
          </Link>
          {activeTab === "answers" ? (
            <Button variant="primary" size="sm" loading={savingAnswers} onClick={saveAnswers} id="btn-save-answers">
              Lưu đáp án
            </Button>
          ) : (
            <Button variant="primary" size="sm" loading={saving} onClick={saveContent} id="btn-save-content">
              Lưu đề
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              id={`tab-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <Card className="p-5 sm:p-6">

        {/* ── Info Tab ── */}
        {activeTab === "info" && (
          <div className="space-y-5 max-w-xl">
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Tên đề *</span>
              <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Slug *</span>
              <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Mô tả</span>
              <textarea className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[72px]" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-sm">
              <input type="checkbox" className="w-4 h-4 rounded" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} id="toggle-active" />
              <span className="font-medium text-gray-700">Hiển thị cho thí sinh (is_active)</span>
            </label>
          </div>
        )}

        {/* ── Listening Tab ── */}
        {activeTab === "listening" && (
          <SkillEditor
            title={content.listening.title}
            blocks={content.listening.blocks}
            questions={content.listening.questions}
            onTitle={(t) => setContent((c) => ({ ...c, listening: { ...c.listening, title: t } }))}
            onBlocks={(b) => setContent((c) => ({ ...c, listening: { ...c.listening, blocks: b } }))}
            onQuestions={(q) => setContent((c) => ({ ...c, listening: { ...c.listening, questions: q } }))}
          />
        )}

        {/* ── Reading Tab ── */}
        {activeTab === "reading" && (
          <SkillEditor
            title={content.reading.title}
            blocks={content.reading.blocks}
            questions={content.reading.questions}
            onTitle={(t) => setContent((c) => ({ ...c, reading: { ...c.reading, title: t } }))}
            onBlocks={(b) => setContent((c) => ({ ...c, reading: { ...c.reading, blocks: b } }))}
            onQuestions={(q) => setContent((c) => ({ ...c, reading: { ...c.reading, questions: q } }))}
          />
        )}

        {/* ── Speaking Tab ── */}
        {activeTab === "speaking" && (
          <SkillEditor
            title={content.speaking.title}
            blocks={content.speaking.blocks}
            showPrompt
            prompt={content.speaking.prompt}
            onTitle={(t) => setContent((c) => ({ ...c, speaking: { ...c.speaking, title: t } }))}
            onBlocks={(b) => setContent((c) => ({ ...c, speaking: { ...c.speaking, blocks: b } }))}
            onPrompt={(p) => setContent((c) => ({ ...c, speaking: { ...c.speaking, prompt: p } }))}
          />
        )}

        {/* ── Writing Tab ── */}
        {activeTab === "writing" && (
          <SkillEditor
            title={content.writing.title}
            blocks={content.writing.blocks}
            showPrompt
            prompt={content.writing.prompt}
            showMinWords
            minWords={content.writing.minWords}
            onTitle={(t) => setContent((c) => ({ ...c, writing: { ...c.writing, title: t } }))}
            onBlocks={(b) => setContent((c) => ({ ...c, writing: { ...c.writing, blocks: b } }))}
            onPrompt={(p) => setContent((c) => ({ ...c, writing: { ...c.writing, prompt: p } }))}
            onMinWords={(n) => setContent((c) => ({ ...c, writing: { ...c.writing, minWords: n } }))}
          />
        )}

        {/* ── Answers Tab ── */}
        {activeTab === "answers" && (
          <AnswerKeyEditor content={content} answers={answerKey} onChange={setAnswerKey} />
        )}
      </Card>
    </PageWrapper>
  );
}
