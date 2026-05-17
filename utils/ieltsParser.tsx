import React from "react";
import type { MockSkillQuestion } from "@/lib/mock-skill/types";
import { QuestionRenderer } from "@/components/exam/QuestionRenderer";

/**
 * IELTS Inline Markup Parser
 * 
 * Splits line text by:
 * 1. Blanks: (1) _____
 * 2. Highlight: ==text==
 * 3. Bold: **text**
 * 4. Italic: *text*
 */
export function parseInlineMarkup(
  text: string,
  answers: Record<string, string | number> = {},
  onChange?: (next: Record<string, string | number>) => void,
  questions: MockSkillQuestion[] = []
): React.ReactNode[] {
  if (!text) return [];
  
  const regex = /(\((\d+)\)(?:\s*(?:_+|…+|\.{3,}))?)|(==.*?==)|(\*\*.*?\*\*)|(\*.*?\*)|(\^[a-zA-Z0-9_*-]+\^)|(\^[0-9]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    const fullMatch = match[0];
    
    // Add text before match
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }
    
    if (fullMatch.startsWith("(") && match[2]) {
      // Input Blank
      const qNumStr = match[2];
      const question = questions.find(
        q => q.id === `l${qNumStr}` || String(q.display_no) === qNumStr || q.id === qNumStr
      );
      
      if (question && onChange) {
        const qId = question.id;
        const val = answers[qId] !== undefined ? String(answers[qId]) : "";
        parts.push(
          <span key={`input-${matchIndex}-${qId}`} className="inline-flex items-center gap-1 mx-1.5 align-baseline">
            <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-black text-[10px] flex items-center justify-center flex-shrink-0 select-none shadow-sm border border-brand-200">
              {qNumStr}
            </span>
            <input
              type="text"
              className="w-24 h-7 text-xs px-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-brand-500/20 focus:outline-none transition-all shadow-inner bg-gray-50 text-gray-800 font-medium"
              placeholder="..."
              value={val}
              onChange={(e) => onChange({ ...answers, [qId]: e.target.value })}
            />
          </span>
        );
      } else {
        // Non-interactive placeholder (Preview mode)
        parts.push(
          <span key={`blank-${matchIndex}`} className="inline-flex items-center gap-1 mx-1.5 align-baseline">
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-black text-[10px] flex items-center justify-center flex-shrink-0 select-none border border-amber-200">
              {qNumStr}
            </span>
            <span className="text-gray-400 font-mono text-xs select-none">_____</span>
          </span>
        );
      }
    } else if (fullMatch.startsWith("==")) {
      // Highlight style
      const content = fullMatch.slice(2, -2);
      parts.push(
        <mark key={`hl-${matchIndex}`} className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-semibold select-all">
          {content}
        </mark>
      );
    } else if (fullMatch.startsWith("**")) {
      // Bold style
      const content = fullMatch.slice(2, -2);
      parts.push(
        <strong key={`b-${matchIndex}`} className="font-extrabold text-gray-900">
          {content}
        </strong>
      );
    } else if (fullMatch.startsWith("*")) {
      // Italic style
      const content = fullMatch.slice(1, -1);
      parts.push(
        <em key={`i-${matchIndex}`} className="italic text-gray-600">
          {content}
        </em>
      );
    } else if (fullMatch.startsWith("^")) {
      // Superscript style
      const content = fullMatch.endsWith("^") && fullMatch.length > 2 
        ? fullMatch.slice(1, -1) 
        : fullMatch.slice(1);
      parts.push(
        <sup key={`sup-${matchIndex}`} className="text-[10px] font-bold text-emerald-600 ml-0.5 select-none align-super">
          {content}
        </sup>
      );
    }
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts;
}

export function parseMarkdownInsideHtml(html: string): string {
  if (!html) return "";
  let res = html;
  
  // 1. Headings: #### Title or ### Title or ## Title
  res = res.replace(/(?:^|\n|<p>)(?:####|###|##)\s+(.*?)(?:\n|<\/p>|$)/g, (_, p1) => {
    return `<h4 class="text-gray-800 font-extrabold text-base mt-6 mb-2 select-none border-l-4 border-brand-500 pl-2">${p1}</h4>`;
  });
  
  // 2. Highlight: ==text==
  res = res.replace(/==(.*?)==/g, '<mark class="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-semibold select-all">$1</mark>');
  
  // 3. Bold: **text**
  res = res.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-gray-900">$1</strong>');
  
  // 4. Italic: *text*
  res = res.replace(/\*(.*?)\*/g, '<em class="italic text-gray-600">$1</em>');
  
  // 5. Superscript: ^text^ or ^number
  res = res.replace(/\^([a-zA-Z0-9_*-]+)\^/g, '<sup class="text-[10px] font-bold text-emerald-600 ml-0.5 select-none align-super">$1</sup>');
  res = res.replace(/\^([0-9]+)/g, '<sup class="text-[10px] font-bold text-emerald-600 ml-0.5 select-none align-super">$1</sup>');
  
  return res;
}

/**
 * Main Visual Text-to-React compiler.
 * Keeps everything 100% inline, preventing dashes and blank circles from wrapping awkwardly.
 */
export function renderIeltsTextToReact(
  text: string,
  answers: Record<string, string | number> = {},
  onChange?: (next: Record<string, string | number>) => void,
  questions: MockSkillQuestion[] = []
): React.ReactNode {
  if (!text) return null;
  
  // Backwards compatibility for raw HTML legacy string rows
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(text);
  if (hasHtml) {
    const parsed = parseMarkdownInsideHtml(text);
    return <div dangerouslySetInnerHTML={{ __html: parsed }} />;
  }
  
  const lines = text.split("\n");
  const children: React.ReactNode[] = [];
  
  let inBox: { title: string; items: React.ReactNode[][] } | null = null;
  let inMap: { title: string; direction: string; items: Array<{ label: string; desc: React.ReactNode[] }> } | null = null;
  let inNote: { title: string; items: React.ReactNode[] } | null = null;

  const closeBox = (key: string | number) => {
    if (inBox) {
      children.push(
        <div key={`box-${key}`} className="my-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-sm">
          <strong className="text-slate-900 block mb-2 text-sm font-bold">
            {parseInlineMarkup(inBox.title, answers, onChange, questions)}
          </strong>
          <ul className="list-none pl-0 m-0 space-y-1.5">
            {inBox.items.map((itemParts, idx) => (
              <li key={idx} className="text-gray-700 text-sm flex items-start gap-2 leading-relaxed">
                <span className="text-slate-400 select-none mt-0.5">•</span>
                <span className="flex-1">{itemParts}</span>
              </li>
            ))}
          </ul>
        </div>
      );
      inBox = null;
    }
  };

  const closeMap = (key: string | number) => {
    if (inMap) {
      children.push(
        <div key={`map-${key}`} className="my-5 p-4 bg-blue-50/50 border border-blue-200 rounded-2xl shadow-inner">
          <h4 className="m-0 mb-2 text-blue-800 flex items-center gap-1.5 text-sm font-bold">
            🗺️ {parseInlineMarkup(inMap.title, answers, onChange, questions)}
          </h4>
          <p className="text-[11px] text-blue-700 m-0 mb-3 font-medium">
            Hướng đi: {parseInlineMarkup(inMap.direction, answers, onChange, questions)}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {inMap.items.map((loc, idx) => (
              <div key={idx} className="p-2 bg-white rounded-xl border border-blue-200/60 text-xs font-semibold text-center shadow-sm">
                <span className="text-blue-600 font-bold text-sm mr-1">{loc.label}</span>: <span className="text-gray-700 font-medium">{loc.desc}</span>
              </div>
            ))}
          </div>
        </div>
      );
      inMap = null;
    }
  };

  const closeNote = (key: string | number) => {
    if (inNote) {
      children.push(
        <div key={`note-${key}`} className="my-5 p-4 bg-amber-50/20 border border-dashed border-amber-200 rounded-2xl">
          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 select-none">
            💡 {parseInlineMarkup(inNote.title, answers, onChange, questions)}
          </div>
          <div className="space-y-1.5 text-[11px] text-gray-600 font-medium leading-relaxed">
            {inNote.items.map((itemParts, idx) => (
              <div key={idx} className="pl-2 border-l border-amber-200">
                {itemParts}
              </div>
            ))}
          </div>
        </div>
      );
      inNote = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) {
      closeBox(i);
      closeMap(i);
      closeNote(i);
      continue;
    }

    // Horizontal Rule: --- or ___
    if (/^[-_]{3,}$/.test(trimmed)) {
      closeBox(i);
      closeMap(i);
      closeNote(i);
      children.push(<hr key={`hr-${i}`} className="w-24 border-t border-gray-300 my-4" />);
      continue;
    }
    
    // Headings
    if (trimmed.startsWith("#### ") || trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
      closeBox(i);
      closeMap(i);
      closeNote(i);
      const title = trimmed.replace(/^#+\s+/, "");
      children.push(
        <h4 key={`h-${i}`} className="text-gray-800 font-extrabold text-base mt-6 mb-2 select-none border-l-4 border-brand-500 pl-2">
          {parseInlineMarkup(title, answers, onChange, questions)}
        </h4>
      );
      continue;
    }
    
    // BOX match
    const boxMatch = trimmed.match(/^\[BOX:\s*(.*?)\]$/i);
    if (boxMatch) {
      closeBox(i);
      closeMap(i);
      closeNote(i);
      inBox = { title: boxMatch[1].trim(), items: [] };
      continue;
    }
    
    // MAP match
    const mapMatch = trimmed.match(/^\[MAP:\s*(.*?)(?:\s*\|\s*(.*?))?\]$/i);
    if (mapMatch) {
      closeBox(i);
      closeMap(i);
      closeNote(i);
      inMap = {
        title: mapMatch[1].trim(),
        direction: mapMatch[2] ? mapMatch[2].trim() : "North ở phía trên. Cổng vào ở phía dưới.",
        items: []
      };
      continue;
    }

    // NOTE match
    const noteMatch = trimmed.match(/^\[NOTE:\s*(.*?)\]$/i);
    if (noteMatch) {
      closeBox(i);
      closeMap(i);
      closeNote(i);
      inNote = { title: noteMatch[1].trim(), items: [] };
      continue;
    }
    
    // Inside BOX list items
    if (inBox) {
      const itemText = trimmed.replace(/^-\s+/, "");
      inBox.items.push(parseInlineMarkup(itemText, answers, onChange, questions));
      continue;
    }
    
    // Inside MAP locations
    if (inMap) {
      const colonParts = trimmed.split(":");
      if (colonParts.length >= 2) {
        inMap.items.push({
          label: colonParts[0].trim(),
          desc: parseInlineMarkup(colonParts.slice(1).join(":").trim(), answers, onChange, questions)
        });
      } else {
        inMap.items.push({
          label: "?",
          desc: parseInlineMarkup(trimmed, answers, onChange, questions)
        });
      }
      continue;
    }

    // Inside NOTE lines
    if (inNote) {
      inNote.items.push(parseInlineMarkup(trimmed, answers, onChange, questions));
      continue;
    }
    
    // QUESTIONS matching: [QUESTIONS: 11-14]
    const questionsMatch = trimmed.match(/^\[QUESTIONS:\s*(\d+)\s*-\s*(\d+)\]$/i);
    if (questionsMatch) {
      closeBox(i);
      closeMap(i);
      closeNote(i);
      const startNum = parseInt(questionsMatch[1], 10);
      const endNum = parseInt(questionsMatch[2], 10);
      if (Number.isInteger(startNum) && Number.isInteger(endNum)) {
        const rangeQs: MockSkillQuestion[] = [];
        for (let num = startNum; num <= endNum; num++) {
          const question = questions.find(
            q => q.id === `l${num}` || String(q.display_no) === String(num) || q.id === String(num)
          );
          if (question) rangeQs.push(question);
        }
        if (rangeQs.length > 0) {
          children.push(
            <div key={`inline-qs-${i}`} className="my-5 space-y-4 animate-in fade-in duration-200">
              {rangeQs.map((q) => {
                const getDisplayNo = (q: MockSkillQuestion): string => {
                  if (typeof q.display_no === "number") return String(q.display_no);
                  const n = Number(String(q.id).replace(/\D+/g, ""));
                  return Number.isFinite(n) && n > 0 ? String(n) : q.id;
                };
                return (
                  <QuestionRenderer
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    onChange={(v) => { if (onChange) onChange({ ...answers, [q.id]: v }); }}
                    displayNo={getDisplayNo(q)}
                  />
                );
              })}
            </div>
          );
        }
      }
      continue;
    }

    // Standard paragraph
    children.push(
      <p key={`p-${i}`} className="my-2 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
        {parseInlineMarkup(trimmed, answers, onChange, questions)}
      </p>
    );
  }

  closeBox("end");
  closeMap("end");
  closeNote("end");

  return <>{children}</>;
}

// Deprecated string helper kept only for backwards compatibility with raw html fields
export function parseIeltsTextToHtml(text: string): string {
  if (!text) return "";
  if (text.includes("<h4") || text.includes("<div") || text.includes("<p")) return text;
  
  const lines = text.split("\n");
  let html = "";
  let inBox: { title: string; items: string[] } | null = null;
  let inMap: { title: string; direction: string; items: Array<{ label: string; desc: string }> } | null = null;

  const closeBox = () => {
    if (inBox) {
      html += `<div style="margin: 12px 0; padding: 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
        <strong style="color: #0f172a; display: block; margin-bottom: 6px; font-size: 14px; font-weight: 700;">${inBox.title}</strong>
        <ul style="list-style-type: none; padding-left: 0; margin: 0;">
          ${inBox.items.map(item => `<li style="margin-bottom: 4px; color: #4b5563; font-size: 14px; line-height: 1.6;">${item}</li>`).join("")}
        </ul>
      </div>`;
      inBox = null;
    }
  };

  const closeMap = () => {
    if (inMap) {
      html += `<div style="margin: 16px 0; padding: 14px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px;">
        <h4 style="margin: 0 0 8px 0; color: #1e40af; display: flex; items: center; gap: 6px; font-size: 14px; font-weight: 700;">🗺️ ${inMap.title}</h4>
        <p style="font-size: 12px; color: #1e3a8a; margin-bottom: 10px;">Hướng đi: ${inMap.direction}</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px;">
          ${inMap.items.map(loc => `<div style="padding: 6px; background-color: #ffffff; border-radius: 6px; border: 1px solid #bfdbfe; font-size: 13px; font-weight: 600; text-align: center;"><span style="color: #1d4ed8; font-size: 14px; margin-right: 4px;">${loc.label}</span>: ${loc.desc}</div>`).join("")}
        </div>
      </div>`;
      inMap = null;
    }
  };

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { closeBox(); closeMap(); continue; }
    if (trimmed.startsWith("#### ") || trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
      closeBox(); closeMap();
      html += `<h4 style="color: #1f2937; margin-top: 16px; margin-bottom: 8px; font-weight: 700; font-size: 15px;">${trimmed.replace(/^#+\s+/, "")}</h4>`;
      continue;
    }
    const boxMatch = trimmed.match(/^\[BOX:\s*(.*?)\]$/i);
    if (boxMatch) { closeBox(); closeMap(); inBox = { title: boxMatch[1].trim(), items: [] }; continue; }
    const mapMatch = trimmed.match(/^\[MAP:\s*(.*?)(?:\s*\|\s*(.*?))?\]$/i);
    if (mapMatch) { closeBox(); closeMap(); inMap = { title: mapMatch[1].trim(), direction: mapMatch[2] ? mapMatch[2].trim() : "North ở phía trên.", items: [] }; continue; }
    
    if (inBox) { inBox.items.push(trimmed.replace(/^-\s+/, "")); continue; }
    if (inMap) {
      const parts = trimmed.split(":");
      inMap.items.push(parts.length >= 2 ? { label: parts[0].trim(), desc: parts.slice(1).join(":").trim() } : { label: "?", desc: trimmed });
      continue;
    }
    html += `<p style="margin: 6px 0; color: #374151; font-size: 14px; line-height: 1.6;">${trimmed}</p>`;
  }
  closeBox(); closeMap();
  return html;
}
