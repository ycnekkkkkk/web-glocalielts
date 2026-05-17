"use client";
import { cn } from "@/utils/cn";
import type { MockSkillBlock, MockSkillListeningOrReading } from "@/lib/mock-skill/types";
import { QuestionRenderer } from "./QuestionRenderer";
import { QuestionPalette } from "./QuestionPalette";
import { useState, useMemo } from "react";
import { renderIeltsTextToReact } from "@/utils/ieltsParser";

function ContentBlocks({ blocks }: { blocks: MockSkillBlock[] }) {
  return (
    <div className="space-y-4 prose prose-emerald max-w-none text-gray-800 leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === "text")
          return (
            <div key={i} className="mb-6 ielts-passage-content">
              {renderIeltsTextToReact(b.html)}
            </div>
          );
        if (b.type === "image")
          return (
            <div key={i} className="my-6 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.src}
                alt={b.alt || "Hình ảnh đề thi"}
                className="max-w-full max-h-[380px] rounded-2xl border border-gray-200/80 shadow-md object-contain hover:shadow-lg transition-shadow duration-300 bg-white p-1"
              />
            </div>
          );
        return null;
      })}
    </div>
  );
}

interface ReadingSectionProps {
  data: MockSkillListeningOrReading;
  answers: Record<string, string | number>;
  flagged: string[];
  onChange: (next: Record<string, string | number>) => void;
  onFlag: (id: string) => void;
  examSlug?: string;
}

export function ReadingSection({
  data,
  answers,
  flagged,
  onChange,
  onFlag,
  examSlug,
}: ReadingSectionProps) {
  const [activeQId, setActiveQId] = useState<string | undefined>(data.questions[0]?.id);
  const [activePassage, setActivePassage] = useState<string>("reading_passage_1");

  // Synchronized jump from Palette
  const handleJump = (id: string) => {
    setActiveQId(id);
    const q = data.questions.find(x => x.id === id);
    if (q && q.section) {
      setActivePassage(q.section);
      setTimeout(() => {
        const el = document.getElementById(`question-${id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    } else {
      const el = document.getElementById(`question-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Synchronized switch when clicking left tabs
  const handlePassageTabClick = (sec: string) => {
    setActivePassage(sec);
    const firstQ = data.questions.find(q => q.section === sec);
    if (firstQ) {
      setActiveQId(firstQ.id);
      setTimeout(() => {
        const el = document.getElementById(`question-${firstQ.id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    }
  };

  const passageBlocks = data.blocks.filter((b) => b.type === "text" || b.type === "image");
  const hasPassage = passageBlocks.length > 0;

  // Group blocks by section
  const p1Blocks = passageBlocks.filter((b) => b.section === "reading_passage_1");
  const p2Blocks = passageBlocks.filter((b) => b.section === "reading_passage_2");
  const p3Blocks = passageBlocks.filter((b) => b.section === "reading_passage_3");

  const hasStructuredPassages = p1Blocks.length > 0 || p2Blocks.length > 0 || p3Blocks.length > 0;

  // Active blocks for left panel
  const activeBlocks = useMemo(() => {
    if (!hasStructuredPassages) return passageBlocks;
    if (activePassage === "reading_passage_1") return p1Blocks;
    if (activePassage === "reading_passage_2") return p2Blocks;
    return p3Blocks;
  }, [activePassage, passageBlocks, p1Blocks, p2Blocks, p3Blocks, hasStructuredPassages]);

  // Active questions for right panel (Only show questions of active passage!)
  const activeQuestions = useMemo(() => {
    if (!hasStructuredPassages) return data.questions;
    return data.questions.filter((q) => q.section === activePassage);
  }, [activePassage, data.questions, hasStructuredPassages]);

  // Keep track of section headers
  let currentGroupSection = "";

  if (hasPassage) {
    return (
      <div className="flex gap-0 lg:gap-6 min-h-0 w-full">
        {/* Passage — left panel, sticky scroll (50/50 split) */}
        <div className="hidden lg:flex flex-col w-[50%] flex-shrink-0">
          <div className="sticky top-24 h-[calc(100vh-120px)] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col">
            {/* Passage Switcher Tabs */}
            {hasStructuredPassages && (
              <div className="flex gap-2 p-1.5 bg-gray-100/80 rounded-2xl border border-gray-200/60 mb-6 shrink-0">
                {(["reading_passage_1", "reading_passage_2", "reading_passage_3"] as const).map((sec) => {
                  const label = sec === "reading_passage_1" ? "Passage 1" : sec === "reading_passage_2" ? "Passage 2" : "Passage 3";
                  const isActive = activePassage === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => handlePassageTabClick(sec)}
                      className={cn(
                        "flex-1 py-2 text-xs font-black rounded-xl transition-all duration-300",
                        isActive
                          ? "bg-white text-emerald-700 shadow-sm border border-gray-200/50"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            {!hasStructuredPassages && (
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reading Passage</span>
              </div>
            )}

            {/* Passage Content */}
            <div className="flex-1 overflow-y-auto pr-1">
              <ContentBlocks blocks={activeBlocks} />
            </div>
          </div>
        </div>

        {/* Questions — right panel */}
        <div className="flex-1 min-w-0 flex gap-4">
          <div className="flex-1 min-w-0 space-y-4">
            {/* Mobile passage toggle with passage selector */}
            <details className="lg:hidden mb-4">
              <summary className="cursor-pointer rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-800 list-none flex items-center justify-between">
                <span className="flex items-center gap-2">📖 Xem bài đọc: {activePassage === "reading_passage_1" ? "Passage 1" : activePassage === "reading_passage_2" ? "Passage 2" : "Passage 3"}</span>
                <span className="text-xs">Chạm để đóng/mở</span>
              </summary>
              <div className="mt-2 rounded-xl border border-gray-100 bg-white p-4 space-y-4">
                {hasStructuredPassages && (
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                    {(["reading_passage_1", "reading_passage_2", "reading_passage_3"] as const).map((sec) => {
                      const label = sec === "reading_passage_1" ? "Passage 1" : sec === "reading_passage_2" ? "Passage 2" : "Passage 3";
                      const isActive = activePassage === sec;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setActivePassage(sec)}
                          className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                            isActive ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <ContentBlocks blocks={activeBlocks} />
              </div>
            </details>

            {/* Questions List with Section Headers */}
            <div className="space-y-4">
              {(() => {
                const elements: React.ReactNode[] = [];
                let skipUntilId = "";

                for (let idx = 0; idx < activeQuestions.length; idx++) {
                  const q = activeQuestions[idx];

                  if (skipUntilId) {
                    if (q.id === skipUntilId) {
                      skipUntilId = "";
                    }
                    continue;
                  }

                  const showHeader = q.section && q.section !== currentGroupSection;
                  if (showHeader) {
                    currentGroupSection = q.section || "";
                  }
                  const isSelected = activeQId === q.id;

                  // Check if it's the start of Passage 2 Note Completion questions (r22)
                  if (q.id === "r22" && (examSlug === "ielts-practice-test-2" || examSlug === "test-2")) {
                    skipUntilId = "r26"; // skip rendering r23 to r26 individually

                    elements.push(
                      <div key="note-completion-block" className="space-y-4">
                        {showHeader && (
                          <div className="pt-6 pb-2 first:pt-0">
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50/30 text-emerald-800 rounded-xl border border-emerald-100/60 font-black text-xs uppercase tracking-wider shadow-sm">
                              <span>📝</span> CÁC CÂU HỎI CỦA: Passage 2
                            </div>
                          </div>
                        )}

                        <div className="rounded-3xl border-2 border-emerald-100 bg-emerald-50/10 p-5 sm:p-6 shadow-sm space-y-5">
                          {/* Heading & Instruction */}
                          <div>
                            <h4 className="text-base font-black text-gray-900">Questions 22-26</h4>
                            <p className="text-xs text-gray-500 italic mt-1 leading-relaxed">
                              Complete the notes below. Choose <strong className="text-gray-700">NO MORE THAN THREE WORDS</strong> from the passage for each answer.
                            </p>
                          </div>

                          {/* Notes content */}
                          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5 text-sm text-gray-700 leading-relaxed shadow-sm">

                            {/* Van Huis */}
                            <div className="space-y-2">
                              <h5 className="font-bold text-gray-950 border-l-4 border-emerald-500 pl-2 text-sm uppercase tracking-wide">Van Huis</h5>
                              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                                <li>Insects are cleaner & do not release as many harmful gases</li>
                                <li className="leading-loose">
                                  <span>Insects use food intake economically in the production of protein as they waste less </span>
                                  <span className="inline-flex items-center gap-1 mx-1 align-middle">
                                    <span className="font-extrabold text-emerald-600 text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">22</span>
                                    <input
                                      type="text"
                                      value={answers["r22"] || ""}
                                      onChange={(e) => onChange({ ...answers, r22: e.target.value })}
                                      placeholder="..."
                                      className="w-40 sm:w-48 rounded-xl border-2 border-gray-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-emerald-900 text-center placeholder:font-normal bg-emerald-50/10 hover:border-gray-300 transition-colors"
                                    />
                                  </span>
                                </li>
                              </ul>
                            </div>

                            {/* Durst */}
                            <div className="space-y-2 pt-3 border-t border-gray-100">
                              <h5 className="font-bold text-gray-950 border-l-4 border-emerald-500 pl-2 text-sm uppercase tracking-wide">Durst</h5>
                              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                                <li className="leading-loose">
                                  <span>Traditional knowledge could be combined with modern methods for mass production instead of just covering </span>
                                  <span className="inline-flex items-center gap-1 mx-1 align-middle">
                                    <span className="font-extrabold text-emerald-600 text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">23</span>
                                    <input
                                      type="text"
                                      value={answers["r23"] || ""}
                                      onChange={(e) => onChange({ ...answers, r23: e.target.value })}
                                      placeholder="..."
                                      className="w-40 sm:w-48 rounded-xl border-2 border-gray-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-emerald-900 text-center placeholder:font-normal bg-emerald-50/10 hover:border-gray-300 transition-colors"
                                    />
                                  </span>
                                </li>
                                <li className="leading-loose">
                                  <span>This could help </span>
                                  <span className="inline-flex items-center gap-1 mx-1 align-middle">
                                    <span className="font-extrabold text-emerald-600 text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">24</span>
                                    <input
                                      type="text"
                                      value={answers["r24"] || ""}
                                      onChange={(e) => onChange({ ...answers, r24: e.target.value })}
                                      placeholder="..."
                                      className="w-32 sm:w-36 rounded-xl border-2 border-gray-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-emerald-900 text-center placeholder:font-normal bg-emerald-50/10 hover:border-gray-300 transition-colors"
                                    />
                                  </span>
                                  <span> people gain access to world markets.</span>
                                </li>
                              </ul>
                            </div>

                            {/* Dunkel */}
                            <div className="space-y-2 pt-3 border-t border-gray-100">
                              <h5 className="font-bold text-gray-950 border-l-4 border-emerald-500 pl-2 text-sm uppercase tracking-wide">Dunkel</h5>
                              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                                <li className="leading-loose">
                                  <span>Due to increased </span>
                                  <span className="inline-flex items-center gap-1 mx-1 align-middle">
                                    <span className="font-extrabold text-emerald-600 text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">25</span>
                                    <input
                                      type="text"
                                      value={answers["r25"] || ""}
                                      onChange={(e) => onChange({ ...answers, r25: e.target.value })}
                                      placeholder="..."
                                      className="w-36 sm:w-40 rounded-xl border-2 border-gray-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-emerald-900 text-center placeholder:font-normal bg-emerald-50/10 hover:border-gray-300 transition-colors"
                                    />
                                  </span>
                                  <span>, more children in Mali are suffering from </span>
                                  <span className="inline-flex items-center gap-1 mx-1 align-middle">
                                    <span className="font-extrabold text-emerald-600 text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">26</span>
                                    <input
                                      type="text"
                                      value={answers["r26"] || ""}
                                      onChange={(e) => onChange({ ...answers, r26: e.target.value })}
                                      placeholder="..."
                                      className="w-36 sm:w-40 rounded-xl border-2 border-gray-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-emerald-900 text-center placeholder:font-normal bg-emerald-50/10 hover:border-gray-300 transition-colors"
                                    />
                                  </span>
                                </li>
                              </ul>
                            </div>

                          </div>
                        </div>
                      </div>
                    );

                    continue;
                  }

                  elements.push(
                    <div key={q.id} className="space-y-4">
                      {showHeader && (
                        <div className="pt-6 pb-2 first:pt-0">
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50/30 text-emerald-800 rounded-xl border border-emerald-100/60 font-black text-xs uppercase tracking-wider shadow-sm">
                            <span>📝</span> CÁC CÂU HỎI CỦA: {q.section === "reading_passage_1" ? "Passage 1" : q.section === "reading_passage_2" ? "Passage 2" : "Passage 3"}
                          </div>
                        </div>
                      )}
                      <div
                        className={cn(
                          "transition-all duration-300 rounded-2xl border",
                          isSelected
                            ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/10"
                            : "border-transparent"
                        )}
                      >
                        <QuestionRenderer
                          question={q}
                          value={answers[q.id]}
                          onChange={(v) => {
                            onChange({ ...answers, [q.id]: v });
                            setActiveQId(q.id);
                          }}
                          flagged={flagged.includes(q.id)}
                          onFlag={() => onFlag(q.id)}
                          displayNo={typeof q.display_no === "number" ? q.display_no : q.id}
                        />
                      </div>
                    </div>
                  );
                }

                return elements;
              })()}
            </div>
          </div>

          <QuestionPalette
            questions={data.questions}
            answers={answers}
            flagged={flagged}
            currentQuestionId={activeQId}
            onJump={handleJump}
            skillLabel="Reading"
          />
        </div>
      </div>
    );
  }

  // Fallback for single column layout when no passage exists
  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 space-y-4">
        {data.questions.map((q) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(v) => { onChange({ ...answers, [q.id]: v }); setActiveQId(q.id); }}
            flagged={flagged.includes(q.id)}
            onFlag={() => onFlag(q.id)}
            displayNo={typeof q.display_no === "number" ? q.display_no : q.id}
          />
        ))}
      </div>
      <QuestionPalette
        questions={data.questions}
        answers={answers}
        flagged={flagged}
        currentQuestionId={activeQId}
        onJump={handleJump}
        skillLabel="Reading"
      />
    </div>
  );
}
