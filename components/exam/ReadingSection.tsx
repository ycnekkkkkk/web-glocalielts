"use client";
import { cn } from "@/utils/cn";
import type { MockSkillBlock, MockSkillListeningOrReading } from "@/lib/mock-skill/types";
import { QuestionRenderer } from "./QuestionRenderer";
import { QuestionPalette } from "./QuestionPalette";
import { useState, useMemo } from "react";

function ContentBlocks({ blocks }: { blocks: MockSkillBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        if (b.type === "text")
          return (
            <div
              key={i}
              className="prose prose-sm max-w-none text-gray-800 leading-[1.8] [&_p]:my-3 [&_h3]:font-bold [&_h3]:text-gray-900 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: b.html }}
            />
          );
        if (b.type === "image")
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={b.src} alt={b.alt || ""} className="max-w-full rounded-xl border border-gray-100 shadow-sm" />
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
}

export function ReadingSection({
  data,
  answers,
  flagged,
  onChange,
  onFlag,
}: ReadingSectionProps) {
  const [activeQId, setActiveQId] = useState<string | undefined>(data.questions[0]?.id);

  const handleJump = (id: string) => {
    setActiveQId(id);
    const el = document.getElementById(`question-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Check if there are passage blocks (text/image) vs audio only
  const passageBlocks = data.blocks.filter((b) => b.type === "text" || b.type === "image");
  const hasPassage = passageBlocks.length > 0;

  // Split layout for desktop when there's a passage
  if (hasPassage) {
    return (
      <div className="flex gap-0 lg:gap-6 min-h-0">
        {/* Passage — left panel, sticky scroll */}
        <div className="hidden lg:flex flex-col w-[48%] flex-shrink-0">
          <div className="sticky top-24 h-[calc(100vh-120px)] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reading Passage</span>
            </div>
            <ContentBlocks blocks={passageBlocks} />
          </div>
        </div>

        {/* Questions — right panel */}
        <div className="flex-1 min-w-0 flex gap-4">
          <div className="flex-1 min-w-0 space-y-4">
            {/* Mobile passage toggle */}
            <details className="lg:hidden">
              <summary className="cursor-pointer rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-800 list-none flex items-center gap-2">
                <span>📖</span> Xem bài đọc
              </summary>
              <div className="mt-2 rounded-xl border border-gray-100 bg-white p-4">
                <ContentBlocks blocks={passageBlocks} />
              </div>
            </details>

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
      </div>
    );
  }

  // No passage — single column
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
