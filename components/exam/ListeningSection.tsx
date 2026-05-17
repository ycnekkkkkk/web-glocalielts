"use client";
import { cn } from "@/utils/cn";
import type { MockSkillBlock, MockSkillListeningOrReading, MockSkillQuestion } from "@/lib/mock-skill/types";
import { QuestionRenderer } from "./QuestionRenderer";
import { QuestionPalette } from "./QuestionPalette";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Volume2, SkipBack, SkipForward } from "lucide-react";
import { parseIeltsTextToHtml, renderIeltsTextToReact } from "@/utils/ieltsParser";

// ── Audio Player ──────────────────────────────────────────────────

let ytGlobal: ReturnType<typeof createYTPlayer> | null = null;

function createYTPlayer(
  elementId: string,
  videoId: string,
  onReady: () => void
) {
  if (!window.YT?.Player) return null;
  return new window.YT.Player(elementId, {
    height: "0",
    width: "0",
    videoId,
    playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0 },
    events: { onReady },
  });
}

declare global {
  interface Window {
    YT?: { Player: new (...a: unknown[]) => unknown };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;
function loadYTApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window.YT as { Player?: unknown } | undefined)?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((res) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); res(); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(s);
  });
  return ytApiPromise;
}

function extractYTVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "").trim();
  } catch { /* empty */ }
  return null;
}

interface AudioBlockPlayerProps {
  url: string;
  label?: string;
}

function AudioBlockPlayer({ url, label }: AudioBlockPlayerProps) {
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const holderRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<{ playVideo: () => void; pauseVideo: () => void; getCurrentTime: () => number; getDuration: () => number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const videoId = extractYTVideoId(url);
  const isYT = Boolean(videoId);
  const holderId = `yt-${videoId || "player"}-${Math.random().toString(36).slice(2, 7)}`;

  useEffect(() => {
    if (!isYT) { setReady(true); return; }
    loadYTApi().then(() => {
      if (!window.YT?.Player || !holderRef.current) return;
      const player = createYTPlayer(holderId, videoId!, () => setReady(true)) as typeof ytPlayerRef.current;
      ytPlayerRef.current = player;
    });
    return () => {
      try { (ytPlayerRef.current as { destroy?: () => void })?.destroy?.(); } catch { /* empty */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    function tick() {
      if (isYT && ytPlayerRef.current) {
        const cur = ytPlayerRef.current.getCurrentTime();
        const dur = ytPlayerRef.current.getDuration();
        setProgress(dur > 0 ? cur / dur : 0);
      } else if (audioRef.current) {
        const { currentTime, duration } = audioRef.current;
        setProgress(duration > 0 ? currentTime / duration : 0);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, isYT]);

  function togglePlay() {
    if (!ready) return;
    if (isYT && ytPlayerRef.current) {
      if (playing) { ytPlayerRef.current.pauseVideo(); setPlaying(false); }
      else { ytPlayerRef.current.playVideo(); setPlaying(true); }
    } else if (audioRef.current) {
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { audioRef.current.play(); setPlaying(true); }
    }
  }

  return (
    <div className="rounded-2xl border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <Volume2 className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm font-semibold text-blue-900">{label || "Audio"}</p>
        {!ready && <span className="text-xs text-blue-500 animate-pulse">Đang tải...</span>}
      </div>

      {!isYT && <audio ref={audioRef} src={url} className="hidden" onEnded={() => setPlaying(false)} />}
      {isYT && <div ref={holderRef} id={holderId} className="w-0 h-0 overflow-hidden" />}

      {/* Progress bar */}
      <div className="h-1.5 bg-blue-200 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!ready}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
            ready
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              : "bg-blue-200 text-blue-400 cursor-not-allowed"
          )}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {playing ? "Tạm dừng" : "Phát audio"}
        </button>
        <span className="text-xs text-blue-600 font-medium">
          {!ready ? "Đang tải..." : playing ? "● Đang phát" : "Sẵn sàng"}
        </span>
      </div>
    </div>
  );
}

// ── Inline Blank Document Parser ──────────────────────────────────

function renderTextWithBlanks(
  htmlText: string,
  answers: Record<string, string | number>,
  onChange: (next: Record<string, string | number>) => void,
  questions: MockSkillQuestion[]
) {
  const compiledHtml = parseIeltsTextToHtml(htmlText);
  // Regex to match (1) followed by dots, underscores or spaces
  const regex = /\((\d+)\)(?:\s*(?:_+|…+|\.{3,}))?/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(compiledHtml)) !== null) {
    const matchIndex = match.index;
    const qNumStr = match[1];
    
    // Find the corresponding question in questions array
    const question = questions.find(
      q => q.id === `l${qNumStr}` || String(q.display_no) === qNumStr || q.id === qNumStr
    );
    
    // Add text before the match
    if (matchIndex > lastIndex) {
      parts.push(
        <span
          key={`txt-${matchIndex}`}
          dangerouslySetInnerHTML={{ __html: compiledHtml.substring(lastIndex, matchIndex) }}
        />
      );
    }
    
    if (question) {
      const qId = question.id;
      const val = answers[qId] !== undefined ? String(answers[qId]) : "";
      
      parts.push(
        <span key={`input-${qId}`} className="inline-flex items-center gap-1 mx-1.5 align-baseline">
          <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-black text-[10px] flex items-center justify-center flex-shrink-0 select-none shadow-sm border border-brand-200">
            {qNumStr}
          </span>
          <input
            type="text"
            value={val}
            placeholder="..."
            onChange={(e) => {
              onChange({
                ...answers,
                [qId]: e.target.value,
              });
            }}
            className="w-24 sm:w-32 rounded-lg border-2 border-brand-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 px-2 py-1 text-xs font-bold text-gray-900 shadow-sm focus:outline-none transition-all text-center bg-brand-50/10 hover:bg-white focus:bg-white"
          />
        </span>
      );
    } else {
      // If no question found, keep the text as is
      parts.push(<span key={`fail-${matchIndex}`}>{match[0]}</span>);
    }
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < htmlText.length) {
    parts.push(
      <span
        key={`txt-end`}
        dangerouslySetInnerHTML={{ __html: htmlText.substring(lastIndex) }}
      />
    );
  }
  
  if (parts.length === 0) {
    return <div dangerouslySetInnerHTML={{ __html: htmlText }} />;
  }
  
  return (
    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed [&_p]:my-2 whitespace-pre-wrap">
      {parts}
    </div>
  );
}

// ── Content Blocks ────────────────────────────────────────────────

interface ContentBlocksProps {
  blocks: MockSkillBlock[];
  questions?: MockSkillQuestion[];
  answers?: Record<string, string | number>;
  onChange?: (next: Record<string, string | number>) => void;
}

function ContentBlocks({
  blocks,
  questions = [],
  answers = {},
  onChange,
}: ContentBlocksProps) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        if (b.type === "text") {
          return (
            <div key={i} className="mb-4">
              {renderIeltsTextToReact(b.html, answers, onChange, questions)}
            </div>
          );
        }
        if (b.type === "image") {
          return (
            <div key={i} className="my-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.src}
                alt={b.alt || "Hình ảnh đề thi"}
                className="max-w-full max-h-[380px] rounded-2xl border border-gray-200/80 shadow-md object-contain hover:shadow-lg transition-shadow duration-300 bg-white p-1"
              />
            </div>
          );
        }
        if (b.type === "audio") {
          return <AudioBlockPlayer key={i} url={b.url} label={b.label} />;
        }
        return null;
      })}
    </div>
  );
}

// ── Listening Section ─────────────────────────────────────────────

interface ListeningSectionProps {
  data: MockSkillListeningOrReading;
  answers: Record<string, string | number>;
  flagged: string[];
  onChange: (next: Record<string, string | number>) => void;
  onFlag: (id: string) => void;
}

export function ListeningSection({
  data,
  answers,
  flagged,
  onChange,
  onFlag,
}: ListeningSectionProps) {
  const [activeQId, setActiveQId] = useState<string | undefined>(data.questions[0]?.id);

  function getDisplayNo(q: MockSkillQuestion): string {
    if (typeof q.display_no === "number") return String(q.display_no);
    const n = Number(String(q.id).replace(/\D+/g, ""));
    return Number.isFinite(n) && n > 0 ? String(n) : q.id;
  }

  // Group by section
  const sectionOrder = useMemo(() => {
    return Array.from(
      new Set(data.blocks.filter((b) => b.section).map((b) => b.section as string))
    );
  }, [data.blocks]);

  const hasSection = sectionOrder.length > 0 && data.questions.some((q) => q.section);

  const handleJump = (id: string) => {
    setActiveQId(id);
    const el = document.getElementById(`question-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const questionContent = hasSection ? (
    sectionOrder.map((section) => {
      const sBlocks = data.blocks.filter((b) => b.section === section);
      const sQs = data.questions.filter((q) => q.section === section);

      // Find which questions are already rendered inline in this section
      const inlineQuestionIds = new Set<string>();
      const inlineRegex = /\((\d+)\)/g;
      const blockRegex = /\[QUESTIONS:\s*(\d+)\s*-\s*(\d+)\]/gi;

      sBlocks.forEach(b => {
        if (b.type === "text") {
          let match;
          inlineRegex.lastIndex = 0;
          while ((match = inlineRegex.exec(b.html)) !== null) {
            const qNumStr = match[1];
            const foundQ = sQs.find(
              q => q.id === `l${qNumStr}` || String(q.display_no) === qNumStr || q.id === qNumStr
            );
            if (foundQ) {
              inlineQuestionIds.add(foundQ.id);
            }
          }

          let blockMatch;
          blockRegex.lastIndex = 0;
          while ((blockMatch = blockRegex.exec(b.html)) !== null) {
            const startNum = parseInt(blockMatch[1], 10);
            const endNum = parseInt(blockMatch[2], 10);
            if (Number.isInteger(startNum) && Number.isInteger(endNum)) {
              for (let num = startNum; num <= endNum; num++) {
                const foundQ = sQs.find(
                  q => q.id === `l${num}` || String(q.display_no) === String(num) || q.id === String(num)
                );
                if (foundQ) {
                  inlineQuestionIds.add(foundQ.id);
                }
              }
            }
          }
        }
      });

      return (
        <div key={section} className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 sm:p-5">
          {sBlocks.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <ContentBlocks
                blocks={sBlocks}
                questions={sQs}
                answers={answers}
                onChange={onChange}
              />
            </div>
          )}
          
          {sQs.filter(q => !inlineQuestionIds.has(q.id)).length > 0 && (
            <div className="space-y-4">
              {sQs
                .filter(q => !inlineQuestionIds.has(q.id))
                .map((q) => (
                  <QuestionRenderer
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    onChange={(v) => { onChange({ ...answers, [q.id]: v }); setActiveQId(q.id); }}
                    flagged={flagged.includes(q.id)}
                    onFlag={() => onFlag(q.id)}
                    displayNo={getDisplayNo(q)}
                  />
                ))}
            </div>
          )}
        </div>
      );
    })
  ) : (
    <div className="space-y-4">
      {data.questions.map((q) => (
        <QuestionRenderer
          key={q.id}
          question={q}
          value={answers[q.id]}
          onChange={(v) => { onChange({ ...answers, [q.id]: v }); setActiveQId(q.id); }}
          flagged={flagged.includes(q.id)}
          onFlag={() => onFlag(q.id)}
          displayNo={getDisplayNo(q)}
        />
      ))}
    </div>
  );

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 space-y-6">
        {/* Audio blocks not in sections */}
        {!hasSection && data.blocks.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
            <ContentBlocks blocks={data.blocks} />
          </div>
        )}
        {questionContent}
      </div>
      <QuestionPalette
        questions={data.questions}
        answers={answers}
        flagged={flagged}
        currentQuestionId={activeQId}
        onJump={handleJump}
        skillLabel="Listening"
      />
    </div>
  );
}
