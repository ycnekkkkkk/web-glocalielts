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
import { 
  ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2, 
  AlignLeft, Headphones, Image as ImageIcon, GripVertical, Settings, Save, Eye, FileText, CheckCircle2,
  Mic, PenTool, BookOpen, Upload, Loader2
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ListeningSection } from "@/components/exam/ListeningSection";
import { ReadingSection } from "@/components/exam/ReadingSection";
import { SpeakingSection } from "@/components/exam/SpeakingSection";
import { WritingSection } from "@/components/exam/WritingSection";
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
    <div className="group relative rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-brand-300 transition-all duration-300 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-gray-200 to-gray-300 group-hover:from-brand-400 group-hover:to-indigo-500 transition-all" />
      
      <div className="p-4 pl-6 space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${block.type === "text" ? "bg-blue-50 text-blue-600" : block.type === "audio" ? "bg-purple-50 text-purple-600" : "bg-emerald-50 text-emerald-600"}`}>
              {block.type === "text" ? <AlignLeft className="w-4 h-4" /> : block.type === "audio" ? <Headphones className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
            </div>
            <span className="text-sm font-bold text-gray-800 capitalize">{block.type} Block</span>
          </div>
          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={onMoveUp} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Lên"><ChevronUp className="w-4 h-4" /></button>
            <button type="button" onClick={onMoveDown} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Xuống"><ChevronDown className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button type="button" onClick={onRemove} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Xóa"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Section (Nhãn nhóm)</label>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              placeholder="VD: Passage 1"
              value={(block as { section?: string }).section || ""}
              onChange={(e) => onChange({ ...block, section: e.target.value } as MockSkillBlock)}
            />
          </div>

          <div className="md:col-span-9 space-y-3">
            {block.type === "text" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nội dung Text (Sẽ tự động giữ nguyên định dạng xuống dòng, hoặc nhập HTML)</label>
                <textarea
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono min-h-[120px] focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50/50"
                  placeholder="Nội dung bài đọc / hướng dẫn..."
                  value={block.html}
                  onChange={(e) => onChange({ ...block, html: e.target.value })}
                />
              </div>
            )}

            {block.type === "audio" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">URL Audio hoặc Tải lên</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                      placeholder="/audio/... hoặc https://youtu.be/..."
                      value={block.url}
                      onChange={(e) => onChange({ ...block, url: e.target.value })}
                    />
                    <label className="flex-shrink-0 cursor-pointer bg-brand-50 hover:bg-brand-100 text-brand-600 px-3 py-2 rounded-xl flex items-center justify-center transition-colors border border-brand-200" title="Tải file lên máy chủ">
                      <Upload className="w-4 h-4" />
                      <input 
                        type="file" 
                        accept="audio/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const toastId = toast.loading("Đang tải lên...");
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            
                            const res = await fetch("/api/admin/upload", {
                              method: "POST",
                              body: formData
                            });
                            
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || "Lỗi tải lên");
                            
                            onChange({ ...block, url: data.url });
                            toast.success("Tải lên thành công!", { id: toastId });
                          } catch (err: any) {
                            toast.error(err.message, { id: toastId });
                          } finally {
                            // Reset input
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Tiêu đề Audio (Label)</label>
                  <input
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all mt-0"
                    placeholder="VD: Section 1"
                    value={block.label || ""}
                    onChange={(e) => onChange({ ...block, label: e.target.value })}
                  />
                </div>
              </div>
            )}

            {block.type === "image" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">URL Ảnh hoặc Tải lên</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                      placeholder="/images/..."
                      value={block.src}
                      onChange={(e) => onChange({ ...block, src: e.target.value })}
                    />
                    <label className="flex-shrink-0 cursor-pointer bg-brand-50 hover:bg-brand-100 text-brand-600 px-3 py-2 rounded-xl flex items-center justify-center transition-colors border border-brand-200" title="Tải ảnh lên máy chủ">
                      <Upload className="w-4 h-4" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const toastId = toast.loading("Đang tải lên...");
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            
                            const res = await fetch("/api/admin/upload", {
                              method: "POST",
                              body: formData
                            });
                            
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || "Lỗi tải lên");
                            
                            onChange({ ...block, src: data.url });
                            toast.success("Tải lên thành công!", { id: toastId });
                          } catch (err: any) {
                            toast.error(err.message, { id: toastId });
                          } finally {
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Alt text</label>
                  <input
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    placeholder="Mô tả ảnh"
                    value={block.alt || ""}
                    onChange={(e) => onChange({ ...block, alt: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
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
  answerValue,
  onAnswerChange,
}: {
  q: MockSkillQuestion;
  onChange: (next: MockSkillQuestion) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  answerValue?: any;
  onAnswerChange?: (val: any) => void;
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
    <div className="group relative rounded-2xl border border-gray-200 bg-[#fbfbfd] shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-300">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gray-100/50 flex flex-col items-center justify-center border-r border-gray-200/60 rounded-l-2xl opacity-60 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-gray-400 mb-2 cursor-grab" />
        <span className="text-[10px] font-bold text-gray-400 rotate-180" style={{ writingMode: 'vertical-rl' }}>Q{q.display_no ?? q.id}</span>
      </div>

      <div className="p-4 pl-12 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex gap-4 items-center">
            <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
              ID: {q.id}
            </span>
            <select
              className="text-sm font-semibold text-brand-700 bg-brand-50 border-none rounded-lg focus:ring-0 cursor-pointer pr-8"
              value={q.type}
              onChange={(e) => handleTypeChange(e.target.value as MockSkillQuestionType)}
            >
              {(Object.entries(QUESTION_TYPE_LABELS) as [MockSkillQuestionType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={onMoveUp} className="p-1.5 rounded bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 shadow-sm" title="Lên"><ChevronUp className="w-4 h-4" /></button>
            <button type="button" onClick={onMoveDown} className="p-1.5 rounded bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 shadow-sm" title="Xuống"><ChevronDown className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-gray-300 mx-1 self-center" />
            <button type="button" onClick={onRemove} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Xóa"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Config grid */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ID (Unique)</label>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-brand-500/20"
              value={q.id}
              onChange={(e) => onChange({ ...q, id: e.target.value.trim() })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Số thứ tự hiển thị</label>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500/20"
              type="number"
              placeholder="Ví dụ: 1"
              value={q.display_no ?? ""}
              onChange={(e) => onChange({ ...q, display_no: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Section (Nhóm)</label>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500/20"
              placeholder="Ví dụ: Part 1"
              value={q.section || ""}
              onChange={(e) => onChange({ ...q, section: e.target.value || undefined })}
            />
          </div>
        </div>

        {/* Stem */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Đề bài (Stem) <span className="text-red-500">*</span></label>
          <textarea
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm min-h-[80px] focus:ring-2 focus:ring-brand-500/20 bg-white"
            placeholder="Nội dung câu hỏi..."
            value={q.stem}
            onChange={(e) => onChange({ ...q, stem: e.target.value })}
          />
        </div>

        {/* Options (MCQ / Multiple choice) */}
        {(q.type === "single_choice" || q.type === "multiple_choice") && (
          <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Lựa chọn Đáp án</span>
            {(q.options || []).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-500 shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <input
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500/20"
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Lựa chọn ${String.fromCharCode(65 + idx)}`}
                />
                <button type="button" onClick={() => removeOption(idx)} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addOption} className="mt-2 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition-colors">
              <Plus className="w-3.5 h-3.5" /> Thêm lựa chọn mới
            </button>
          </div>
        )}

        {/* True/False/Not Given — readonly options */}
        {q.type === "true_false_not_given" && (
          <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex gap-2">
            {TF_OPTIONS.map((o) => (
              <span key={o} className="px-3 py-1 rounded-full bg-white text-blue-700 border border-blue-200 text-xs font-bold shadow-sm">{o}</span>
            ))}
          </div>
        )}

        {/* Matching */}
        {q.type === "matching" && (
          <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Keys (Các mục nối)</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 font-mono text-sm focus:ring-2 focus:ring-brand-500/20"
                placeholder="Ví dụ: A, B, C, D, E"
                value={(q.options || []).join(", ")}
                onChange={(e) => setOptions(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Options Map (Tùy chọn hiển thị)</label>
              <textarea
                className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs min-h-[100px] focus:ring-2 focus:ring-brand-500/20 bg-gray-50"
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
              <p className="text-[10px] text-gray-500 mt-1">Định dạng: <code>KEY: Mô tả tương ứng</code> (Mỗi mục một dòng)</p>
            </div>
          </div>
        )}

        {/* Answer Key Input */}
        {onAnswerChange && (
          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 mt-4">
            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1.5">Đáp án đúng (Answer Key)</label>
            
            {q.type === "text" && (
              <input
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Nhập đáp án đúng..."
                value={String(answerValue ?? "")}
                onChange={(e) => onAnswerChange(e.target.value.trim().toLowerCase())}
              />
            )}
            
            {q.type === "true_false_not_given" && (
              <select
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20"
                value={typeof answerValue === "number" ? String(answerValue) : (answerValue === "" || answerValue == null ? "" : String(Number(answerValue)))}
                onChange={(e) => onAnswerChange(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="">— chọn đáp án —</option>
                <option value="0">True / Yes</option>
                <option value="1">False / No</option>
                <option value="2">Not Given</option>
              </select>
            )}

            {q.type === "matching" && (
              <select
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20"
                value={String(answerValue ?? "")}
                onChange={(e) => onAnswerChange(e.target.value)}
              >
                <option value="">— chọn đáp án —</option>
                {(q.options || []).map((k) => (
                  <option key={k} value={k}>{k}{q.options_map?.[k] ? ` – ${q.options_map[k]}` : ""}</option>
                ))}
              </select>
            )}

            {(q.type === "single_choice" || q.type === "multiple_choice") && (
              <select
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20"
                multiple={true}
                size={Math.min(4, Math.max(2, (q.options || []).length))}
                value={Array.isArray(answerValue) ? answerValue : (answerValue ? [String(answerValue)] : [])}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, o => o.value);
                  onAnswerChange(selected.length === 1 ? selected[0] : selected);
                }}
              >
                {(q.options || []).map((o, i) => (
                  <option key={i} value={o}>{String.fromCharCode(65 + i)}. {o}</option>
                ))}
              </select>
            )}
            
            {(q.type === "single_choice" || q.type === "multiple_choice") && (
              <p className="text-[10px] text-emerald-600 mt-1">Ctrl+Click (hoặc Cmd+Click) để chọn/bỏ chọn nhiều đáp án.</p>
            )}
          </div>
        )}
      </div>
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
  answers,
  onAnswerChange,
  skillType,
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
  answers?: Record<string, any>;
  onAnswerChange?: (qId: string, val: any) => void;
  skillType: "listening" | "reading" | "speaking" | "writing";
}) {
  const [previewSection, setPreviewSection] = useState<string | null>(null);
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

  const allSections = Array.from(
    new Set([
      ...blocks.map((b) => b.section),
      ...(questions || []).map((q) => q.section),
    ].filter(Boolean))
  ) as string[];

  const globalBlocks = blocks.map((b, i) => ({ b, i })).filter((x) => !x.b.section);
  const globalQuestions = (questions || []).map((q, i) => ({ q, i })).filter((x) => !x.q.section);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Title & Metadata */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Tiêu đề hiển thị</label>
          <input
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-lg font-bold text-gray-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50/50"
            value={title}
            onChange={(e) => onTitle(e.target.value)}
          />
        </div>

        {showPrompt && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Đề bài (Prompt)</label>
            <textarea
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base min-h-[120px] focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white shadow-inner"
              placeholder="Nhập nội dung đề bài (Dùng cho Writing/Speaking)..."
              value={prompt ?? ""}
              onChange={(e) => onPrompt?.(e.target.value)}
            />
          </div>
        )}

        {showMinWords && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Số từ tối thiểu</label>
            <div className="relative w-48">
              <input
                type="number"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                value={minWords ?? 250}
                onChange={(e) => onMinWords?.(Number(e.target.value))}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">Từ</span>
            </div>
          </div>
        )}
      </div>

      {/* Global Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-brand-50/50 border border-brand-100">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-brand-800">Thêm Nội dung:</span>
          <div className="flex gap-2 bg-white p-1 rounded-xl border border-brand-100 shadow-sm">
            <button type="button" onClick={() => addBlock("text")} className="text-xs font-semibold text-brand-700 hover:text-brand-900 hover:bg-brand-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" /> Text
            </button>
            <button type="button" onClick={() => addBlock("audio")} className="text-xs font-semibold text-brand-700 hover:text-brand-900 hover:bg-brand-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" /> Audio
            </button>
            <button type="button" onClick={() => addBlock("image")} className="text-xs font-semibold text-brand-700 hover:text-brand-900 hover:bg-brand-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" /> Ảnh
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {questions !== undefined && onQuestions && (
            <button type="button" onClick={addQuestion} className="text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm shadow-brand-500/20">
              <Plus className="w-4 h-4" /> Thêm câu hỏi
            </button>
          )}
          {!["speaking", "writing"].includes(skillType) && (
            <button
              type="button"
              onClick={() => setPreviewSection("__all__")}
              className="text-sm font-bold bg-white border border-brand-300 text-brand-700 hover:bg-brand-50 px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm"
            >
              <Eye className="w-4 h-4" /> Xem Preview toàn bộ
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {/* Render Global Items (Không có section) */}
        {(globalBlocks.length > 0 || globalQuestions.length > 0) && (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-gray-800 border-b border-gray-200 pb-2 mb-4 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><FileText className="w-5 h-5 text-gray-400" /> Phần chung (Không thuộc Section nào)</span>
              {!["speaking", "writing"].includes(skillType) && (
                <button
                  type="button"
                  onClick={() => setPreviewSection("__global__")}
                  className="text-xs font-bold bg-white border border-brand-200 text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> Xem Preview
                </button>
              )}
            </h3>
            
            {globalBlocks.map(({ b, i }) => (
              <BlockEditor
                key={`b-${i}`} block={b}
                onChange={(nb) => { const next = [...blocks]; next[i] = nb; onBlocks(next); }}
                onRemove={() => onBlocks(blocks.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveBlock(i, -1)} onMoveDown={() => moveBlock(i, 1)}
              />
            ))}

            {globalQuestions.map(({ q, i }) => (
              <QuestionEditor
                key={`q-${i}`} q={q}
                onChange={(nq) => { const next = [...questions!]; next[i] = nq; onQuestions!(next); }}
                onRemove={() => onQuestions!(questions!.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveQuestion(i, -1)} onMoveDown={() => moveQuestion(i, 1)}
                answerValue={answers?.[q.id]}
                onAnswerChange={onAnswerChange ? (val) => onAnswerChange(q.id, val) : undefined}
              />
            ))}
          </div>
        )}

        {/* Render Grouped Sections */}
        {allSections.map(sec => {
          const secBlocks = blocks.map((b, i) => ({ b, i })).filter((x) => x.b.section === sec);
          const secQs = (questions || []).map((q, i) => ({ q, i })).filter((x) => x.q.section === sec);

          return (
            <div key={sec} className="p-5 bg-white rounded-2xl border-2 border-brand-100 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-400" />
              <h3 className="text-lg font-black text-brand-800 border-b border-gray-100 pb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-brand-100 text-brand-700 px-2.5 py-1 rounded-lg text-sm">Section:</span> 
                  {sec}
                </div>
                {!["speaking", "writing"].includes(skillType) && (
                  <button
                    type="button"
                    onClick={() => setPreviewSection(sec)}
                    className="text-xs font-bold bg-white border border-brand-200 text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" /> Xem Preview
                  </button>
                )}
              </h3>

              <div className="space-y-4">
                {secBlocks.map(({ b, i }) => (
                  <BlockEditor
                    key={`b-${i}`} block={b}
                    onChange={(nb) => { const next = [...blocks]; next[i] = nb; onBlocks(next); }}
                    onRemove={() => onBlocks(blocks.filter((_, idx) => idx !== i))}
                    onMoveUp={() => moveBlock(i, -1)} onMoveDown={() => moveBlock(i, 1)}
                  />
                ))}

                {secQs.map(({ q, i }) => (
                  <QuestionEditor
                    key={`q-${i}`} q={q}
                    onChange={(nq) => { const next = [...questions!]; next[i] = nq; onQuestions!(next); }}
                    onRemove={() => onQuestions!(questions!.filter((_, idx) => idx !== i))}
                    onMoveUp={() => moveQuestion(i, -1)} onMoveDown={() => moveQuestion(i, 1)}
                    answerValue={answers?.[q.id]}
                    onAnswerChange={onAnswerChange ? (val) => onAnswerChange(q.id, val) : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Section Preview Modal */}
      {previewSection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setPreviewSection(null)} />
          
          <div className="relative bg-white w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 text-brand-600 rounded-xl">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-lg">
                    Xem trước: {previewSection === "__all__" ? "Toàn bộ" : previewSection === "__global__" ? "Phần chung" : previewSection}
                  </h4>
                  <p className="text-xs text-gray-500">Hiển thị tương ứng với giao diện người thi</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewSection(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45 text-gray-400" />
              </button>
            </div>

            {/* Modal Content - The Real Renderer */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {(() => {
                // Resolve which blocks/questions to preview
                const secBlocks =
                  previewSection === "__all__"
                    ? blocks
                    : previewSection === "__global__"
                    ? blocks.filter(b => !b.section)
                    : blocks.filter(b => b.section === previewSection);

                const secQs =
                  previewSection === "__all__"
                    ? (questions || [])
                    : previewSection === "__global__"
                    ? (questions || []).filter(q => !q.section)
                    : (questions || []).filter(q => q.section === previewSection);

                const mockData: any = {
                  title,
                  blocks: secBlocks,
                  questions: secQs,
                };

                if (skillType === "listening")
                  return <ListeningSection data={mockData} answers={{}} flagged={[]} onChange={() => {}} onFlag={() => {}} />;

                if (skillType === "reading")
                  return <ReadingSection data={mockData} answers={{}} flagged={[]} onChange={() => {}} onFlag={() => {}} />;

                // Speaking & Writing have complex props — show a simple visual preview
                if (skillType === "speaking") {
                  return (
                    <div className="space-y-6">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 font-medium">
                        ⚠️ Preview Speaking chỉ hiển thị Blocks nội dung. Phần ghi âm cần chạy trên trang thi thật.
                      </div>
                      {secBlocks.map((b, idx) => (
                        <div key={idx} className="rounded-xl border border-gray-200 p-4">
                          {b.type === "text" && <div className="prose prose-sm max-w-none whitespace-pre-wrap">{b.html}</div>}
                          {b.type === "audio" && (
                            <div className="space-y-1">
                              {b.label && <p className="text-sm font-semibold text-gray-700">{b.label}</p>}
                              {b.url && <audio controls src={b.url} className="w-full mt-1" />}
                            </div>
                          )}
                          {b.type === "image" && b.src && (
                            <div className="space-y-1 text-center">
                              {b.alt && <p className="text-xs text-gray-500">{b.alt}</p>}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={b.src} alt={b.alt || ""} className="max-w-full mx-auto rounded-lg border" />
                            </div>
                          )}
                        </div>
                      ))}
                      {prompt && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Đề bài (Prompt)</p>
                          <p className="text-sm text-blue-900 whitespace-pre-wrap">{prompt}</p>
                        </div>
                      )}
                    </div>
                  );
                }

                if (skillType === "writing") {
                  return (
                    <div className="space-y-6">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 font-medium">
                        ⚠️ Preview Writing chỉ hiển thị nội dung đề. Phần nhập bài cần chạy trên trang thi thật.
                      </div>
                      {secBlocks.map((b, idx) => (
                        <div key={idx} className="rounded-xl border border-gray-200 p-4">
                          {b.type === "text" && <div className="prose prose-sm max-w-none whitespace-pre-wrap">{b.html}</div>}
                          {b.type === "image" && b.src && (
                            <div className="text-center space-y-1">
                              {b.alt && <p className="text-xs text-gray-500">{b.alt}</p>}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={b.src} alt={b.alt || ""} className="max-w-full mx-auto rounded-lg border" />
                            </div>
                          )}
                        </div>
                      ))}
                      {prompt && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Đề bài (Prompt)</p>
                          <p className="text-sm text-blue-900 whitespace-pre-wrap">{prompt}</p>
                        </div>
                      )}
                      {minWords && (
                        <p className="text-xs text-gray-500">Số từ tối thiểu: <strong>{minWords}</strong></p>
                      )}
                    </div>
                  );
                }

                return <p className="text-gray-400">Không tìm thấy renderer cho: {skillType}</p>;
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setPreviewSection(null)}
                className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// (Removed AnswerKeyEditor completely)

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
  const [answerKey, setAnswerKey] = useState<{ listening: Record<string, any>; reading: Record<string, any> }>({
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
        answers?: { listening: Record<string, any>; reading: Record<string, any> };
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

  const saveContentAndAnswers = useCallback(async () => {
    setSaving(true);
    try {
      const p1 = fetch(`/api/admin/mock-skill-exams/${examId}`, {
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

      const p2 = fetch(`/api/admin/mock-skill-exams/${examId}/answers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answerKey),
      });

      const [res1, res2] = await Promise.all([p1, p2]);
      
      if (!res1.ok || !res2.ok) {
        toast.error("Lưu thất bại! Hãy kiểm tra lại."); 
        return; 
      }
      toast.success("Đã lưu Đề thi và Bộ đáp án thành công!");
    } catch {
      toast.error("Lỗi mạng");
    } finally {
      setSaving(false);
    }
  }, [examId, title, slug, description, isActive, content, answerKey]);

  // ─── Tab definitions ───
  const TABS: { id: Tab; label: string; icon?: React.ReactNode }[] = [
    { id: "info", label: "Cấu hình chung", icon: <Settings className="w-4 h-4" /> },
    { id: "listening", label: `Listening (${content.listening.questions.length})`, icon: <Headphones className="w-4 h-4" /> },
    { id: "reading", label: `Reading (${content.reading.questions.length})`, icon: <BookOpen className="w-4 h-4" /> },
    { id: "speaking", label: "Speaking", icon: <Mic className="w-4 h-4" /> },
    { id: "writing", label: "Writing", icon: <PenTool className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">Đang nạp dữ liệu đề thi...</p>
        </div>
      </PageWrapper>
    );
  }

  if (!exam) {
    return (
      <PageWrapper>
        <div className="max-w-md mx-auto mt-20 text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <Settings className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Không tìm thấy đề thi</h2>
          <p className="text-gray-500">Đề thi này không tồn tại hoặc bạn không có quyền truy cập.</p>
          <Link href="/admin/mock-skill-exams">
            <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />}>Quay lại danh sách</Button>
          </Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* Premium Header */}
      <div className="relative mb-8 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-brand-50 to-transparent rounded-bl-full pointer-events-none opacity-60" />
        <div className="absolute bottom-0 right-32 w-32 h-32 bg-gradient-to-tl from-indigo-50 to-transparent rounded-tl-full pointer-events-none opacity-60" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1">
            <Link href="/admin/mock-skill-exams" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-brand-700 transition-colors mb-3 bg-gray-50 px-3 py-1 rounded-full w-fit">
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại danh sách
            </Link>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight mb-2">
              {title || exam.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-mono rounded-lg border border-gray-200">
                {slug}
              </span>
              {isActive ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Đang phát hành
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" /> Tạm đóng
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 shrink-0">

            <Button variant="primary" className="shadow-md shadow-brand-500/20" loading={saving} onClick={saveContentAndAnswers} icon={<Save className="w-4 h-4" />}>
              Lưu Đề Thi & Đáp Án
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Segmented Control Tabs */}
      <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <nav className="flex items-center gap-2 min-w-max p-1.5 bg-gray-100/80 rounded-2xl border border-gray-200/60 backdrop-blur-sm">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                activeTab === t.id
                  ? "bg-white text-brand-700 shadow-sm border border-gray-200/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content area */}
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
            answers={answerKey.listening}
            onAnswerChange={(qId, val) => setAnswerKey((prev) => ({ ...prev, listening: { ...prev.listening, [qId]: val } }))}
            skillType="listening"
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
            answers={answerKey.reading}
            onAnswerChange={(qId, val) => setAnswerKey((prev) => ({ ...prev, reading: { ...prev.reading, [qId]: val } }))}
            skillType="reading"
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
            skillType="speaking"
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
            skillType="writing"
          />
        )}

      </Card>
    </PageWrapper>
  );
}
