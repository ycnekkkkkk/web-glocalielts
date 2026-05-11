"use client";
import { cn } from "@/utils/cn";
import type { MockSkillBlock, MockSkillListeningOrReading, MockSkillQuestion } from "@/lib/mock-skill/types";
import { QuestionRenderer } from "./QuestionRenderer";
import { QuestionPalette } from "./QuestionPalette";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Volume2, SkipBack, SkipForward } from "lucide-react";

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

// ── Content Blocks ────────────────────────────────────────────────

function ContentBlocks({ blocks }: { blocks: MockSkillBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        if (b.type === "text") {
          return (
            <div
              key={i}
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed [&_p]:my-2 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: b.html }}
            />
          );
        }
        if (b.type === "image") {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={b.src}
              alt={b.alt || ""}
              className="max-w-full rounded-xl border border-gray-100 shadow-sm"
            />
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
      return (
        <div key={section} className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 sm:p-5">
          {sBlocks.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <ContentBlocks blocks={sBlocks} />
            </div>
          )}
          <div className="space-y-4">
            {sQs.map((q) => (
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
