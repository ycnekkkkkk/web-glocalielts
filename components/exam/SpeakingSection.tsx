"use client";
import { cn } from "@/utils/cn";
import type { MockSkillSpeaking, MockSkillSpeakingPart } from "@/lib/mock-skill/types";
import { WaveformBars } from "./ui/WaveformBars";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, RefreshCw, Square, Volume2, VolumeX } from "lucide-react";
import toast from "react-hot-toast";

export type QuestionAudio = { blob: Blob; url: string; duration: number };

interface SpeakingSectionProps {
  data: MockSkillSpeaking;
  audioBlob: Blob | null;
  onAudioBlob: (blob: Blob | null) => void;
  /** Lifted state — passed from ExamWizard to survive step navigation */
  audios?: Record<number, QuestionAudio | null>;
  onAudios?: React.Dispatch<React.SetStateAction<Record<number, QuestionAudio | null>>>;
}

function formatDuration(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ── TTS hook ─────────────────────────────────────────────────────
function useTTS() {
  const [playing, setPlaying] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((texts: string[]) => {
    if (!("speechSynthesis" in window)) { toast.error("Trình duyệt không hỗ trợ Text-to-Speech"); return; }
    if (playing) { window.speechSynthesis.cancel(); setPlaying(false); return; }
    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith("en") && !v.localService) || voices.find((v) => v.lang.startsWith("en"));

    // Chain utterances
    const speak1 = (idx: number) => {
      if (idx >= texts.length) { setPlaying(false); return; }
      const u = new SpeechSynthesisUtterance(texts[idx]);
      u.lang = "en-US"; u.rate = 0.85; u.pitch = 1;
      if (enVoice) u.voice = enVoice;
      u.onend = () => speak1(idx + 1);
      u.onerror = () => setPlaying(false);
      utterRef.current = u;
      window.speechSynthesis.speak(u);
    };
    setPlaying(true);
    speak1(0);
  }, [playing]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }, []);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  return { playing, speak, stop };
}

// ── Mini Recorder ─────────────────────────────────────────────────
function useRecorder(onDone: (a: QuestionAudio) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [duration, setDuration] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durRef = useRef(0);

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => { });
    if (timerRef.current) clearInterval(timerRef.current);
    setAnalyser(null);
  }, []);
  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async (blocked: boolean) => {
    if (blocked || isRecording) return;
    window.speechSynthesis?.cancel();
    setRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const ctx = new AudioContext(); ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser(); an.fftSize = 128;
      src.connect(an); setAnalyser(an);

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";

      chunksRef.current = [];
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mediaRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        onDone({ blob, url: URL.createObjectURL(blob), duration: durRef.current });
        cleanup();
        setIsRecording(false);
      };
      rec.start(250);
      setRequesting(false);
      setIsRecording(true);
      durRef.current = 0; setDuration(0);
      timerRef.current = setInterval(() => { durRef.current += 1; setDuration(durRef.current); }, 1000);
    } catch {
      setRequesting(false);
      toast.error("Không thể truy cập microphone.");
    }
  }, [isRecording, onDone, cleanup]);

  const stop = useCallback(() => {
    const rec = mediaRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return { isRecording, requesting, duration, analyser, start, stop };
}

// ── Recorder UI ───────────────────────────────────────────────────
function RecorderUI({
  id,
  color,
  blocked,
  globalRecordingId,
  onStartRecording,
  onStopRecording,
  audio,
  onAudio,
}: {
  id: number;
  color: string;
  blocked: boolean;
  globalRecordingId: number | null;
  onStartRecording: (id: number) => void;
  onStopRecording: () => void;
  audio: QuestionAudio | null;
  onAudio: (a: QuestionAudio | null) => void;
}) {
  const isRecording = globalRecordingId === id;
  const isBlocked = blocked || (globalRecordingId !== null && !isRecording);

  const MIC_COLOR: Record<string, string> = {
    blue: "bg-blue-600 hover:bg-blue-700",
    violet: "bg-violet-600 hover:bg-violet-700",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
  };

  const { isRecording: recActive, requesting, duration, analyser, start, stop } = useRecorder(
    useCallback((a: QuestionAudio) => { onAudio(a); onStopRecording(); }, [onAudio, onStopRecording])
  );

  // Sync external isRecording state
  useEffect(() => {
    if (recActive && !isRecording) onStartRecording(id);
  }, [recActive, isRecording, onStartRecording, id]);

  function retryRec() {
    if (audio?.url) URL.revokeObjectURL(audio.url);
    onAudio(null);
  }

  if (audio) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-700 font-semibold bg-emerald-100 rounded-full px-2.5 py-0.5">✓ {formatDuration(audio.duration)}</span>
        </div>
        <audio controls src={audio.url} className="w-full h-9 rounded-lg" />
        <button type="button" onClick={retryRec} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors">
          <RefreshCw className="w-3 h-3" /> Ghi âm lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Mic */}
      <button
        type="button"
        onClick={isRecording ? stop : () => start(isBlocked)}
        disabled={requesting || isBlocked}
        title={isBlocked ? "Đang ghi âm phần khác" : isRecording ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
        className={cn(
          "relative w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 shadow",
          isRecording && "bg-red-500 hover:bg-red-600 scale-110",
          requesting && "bg-gray-300 cursor-wait",
          isBlocked && "bg-gray-200 cursor-not-allowed opacity-50",
          !isRecording && !requesting && !isBlocked && cn(MIC_COLOR[color] ?? MIC_COLOR.violet, "text-white cursor-pointer hover:scale-105")
        )}
      >
        {isRecording && <span className="absolute inset-0 rounded-full bg-red-400 opacity-25 animate-ping" />}
        {requesting ? <MicOff className="w-4 h-4 text-gray-500" />
          : isRecording ? <Square className="w-4 h-4 text-white" />
            : <Mic className="w-4 h-4 text-white" />}
      </button>

      {/* Timer */}
      {isRecording && (
        <span className="text-sm font-mono font-bold text-red-600 animate-pulse min-w-[48px]">
          ● {formatDuration(duration)}
        </span>
      )}

      {/* Waveform */}
      <div className="flex-1 h-9">
        <WaveformBars
          isActive={isRecording}
          analyserNode={isRecording ? analyser : null}
          barCount={28}
          color={isRecording ? "#ef4444" : "#e5e7eb"}
          className="w-full h-full"
        />
      </div>

      {isBlocked && <p className="text-xs text-gray-400 shrink-0">Đợi phần khác xong</p>}
    </div>
  );
}

// ── Part 2 — single card, single TTS, single recorder ────────────
function Part2Block({
  part,
  globalRecordingId,
  onStartRecording,
  onStopRecording,
  audio,
  onAudio,
  recorderId,
}: {
  part: MockSkillSpeakingPart;
  globalRecordingId: number | null;
  onStartRecording: (id: number) => void;
  onStopRecording: () => void;
  audio: QuestionAudio | null;
  onAudio: (a: QuestionAudio | null) => void;
  recorderId: number;
}) {
  // Combine all Part 2 text into one read sequence
  const allTexts: string[] = [];
  if (part.task) allTexts.push(part.task);
  (part.cues || []).forEach((c) => allTexts.push(c));
  if (part.follow_up) allTexts.push(part.follow_up);

  const { playing, speak, stop: stopTTS } = useTTS();

  return (
    <div className={cn("rounded-2xl border-2 border-violet-200 bg-violet-50 p-5 space-y-4",
      globalRecordingId === recorderId && "ring-2 ring-red-400 ring-offset-1"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
        <div className="flex-1">
          <p className="font-bold text-violet-800 text-sm">Part 2 — Long Turn</p>
          {part.type && <p className="text-xs text-violet-600">{part.type}</p>}
        </div>

        {/* Single TTS button reads ALL questions */}
        <button
          type="button"
          onClick={() => playing ? stopTTS() : speak(allTexts)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
            playing
              ? "bg-red-100 text-red-600 border border-red-200 animate-pulse"
              : "bg-white border border-violet-200 text-violet-700 hover:bg-violet-100"
          )}
        >
          {playing ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          {playing ? "Dừng" : "Nghe đề bài"}
        </button>
      </div>

      <p className="text-xs text-violet-700">Nghe toàn bộ đề bài, chuẩn bị 1 phút rồi nói 1–2 phút liên tục.</p>

      {/* Single recorder */}
      <RecorderUI
        id={recorderId}
        color="violet"
        blocked={false}
        globalRecordingId={globalRecordingId}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        audio={audio}
        onAudio={onAudio}
      />
    </div>
  );
}

// ── Single question item (Part 1 / Part 3) ───────────────────────
function QuestionItem({
  idx, number, questionText, color, qBorderClass,
  globalRecordingId, onStartRecording, onStopRecording, audio, onAudio,
}: {
  idx: number; number: number; questionText: string; color: string; qBorderClass: string;
  globalRecordingId: number | null; onStartRecording: (id: number) => void;
  onStopRecording: () => void; audio: QuestionAudio | null;
  onAudio: (a: QuestionAudio | null) => void;
}) {
  const { playing, speak, stop: stopTTS } = useTTS();
  return (
    <div className={cn("rounded-xl border bg-white p-3 space-y-2.5", qBorderClass)}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{number}.</span>
        <button
          type="button"
          onClick={() => playing ? stopTTS() : speak([questionText])}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all",
            playing
              ? "bg-red-100 text-red-600 border border-red-200 animate-pulse"
              : "bg-gray-50 border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700"
          )}
        >
          {playing ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          {playing ? "Dừng" : "Nghe câu hỏi"}
        </button>
        {audio && (
          <span className="ml-auto text-xs text-emerald-600 font-semibold bg-emerald-50 rounded-full px-2 py-0.5">
            ✓ {formatDuration(audio.duration)}
          </span>
        )}
      </div>
      <RecorderUI
        id={idx} color={color} blocked={false}
        globalRecordingId={globalRecordingId}
        onStartRecording={onStartRecording} onStopRecording={onStopRecording}
        audio={audio} onAudio={onAudio}
      />
    </div>
  );
}

// ── Part 1 / Part 3 — per-question ────────────────────────────────
function PartBlock({
  part,
  color,
  label,
  questions,
  globalRecordingId,
  onStartRecording,
  onStopRecording,
  audios,
  onAudio,
  startIndex,
}: {
  part: MockSkillSpeakingPart;
  color: string;
  label: string;
  questions: string[];
  globalRecordingId: number | null;
  onStartRecording: (id: number) => void;
  onStopRecording: () => void;
  audios: Record<number, QuestionAudio | null>;
  onAudio: (idx: number, a: QuestionAudio | null) => void;
  startIndex: number;
}) {
  const BADGE: Record<string, string> = { blue: "bg-blue-600", violet: "bg-violet-600", emerald: "bg-emerald-600" };
  const HEADING: Record<string, string> = { blue: "text-blue-800", violet: "text-violet-800", emerald: "text-emerald-800" };
  const BORDER: Record<string, string> = { blue: "border-blue-200 bg-blue-50", violet: "border-violet-200 bg-violet-50", emerald: "border-emerald-200 bg-emerald-50" };
  const Q_BORDER: Record<string, string> = { blue: "border-blue-100", violet: "border-violet-100", emerald: "border-emerald-100" };

  return (
    <div className={cn("rounded-2xl border-2 p-5 space-y-4", BORDER[color] ?? BORDER.violet)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className={cn("w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0", BADGE[color] ?? BADGE.violet)}>
          {part.part}
        </span>
        <div>
          <p className={cn("font-bold text-sm", HEADING[color] ?? HEADING.violet)}>{label}</p>
          {part.type && <p className="text-xs text-gray-500">{part.type}</p>}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, i) => (
          <QuestionItem
            key={startIndex + i}
            idx={startIndex + i}
            number={i + 1}
            questionText={q}
            color={color}
            qBorderClass={Q_BORDER[color] ?? Q_BORDER.violet}
            globalRecordingId={globalRecordingId}
            onStartRecording={onStartRecording}
            onStopRecording={onStopRecording}
            audio={audios[startIndex + i] ?? null}
            onAudio={(a) => onAudio(startIndex + i, a)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export function SpeakingSection({ data, audioBlob, onAudioBlob, audios: audiosFromParent, onAudios }: SpeakingSectionProps) {
  // Use lifted state from parent if provided (survives step navigation), else local state
  const [localAudios, setLocalAudios] = useState<Record<number, QuestionAudio | null>>({});
  const audios = audiosFromParent ?? localAudios;
  const setAudios = onAudios ?? setLocalAudios;

  const [globalRecordingId, setGlobalRecordingId] = useState<number | null>(null);

  // Merge all per-question blobs → one blob for submit
  useEffect(() => {
    const blobs = Object.values(audios).filter(Boolean).map((a) => a!.blob);
    if (blobs.length === 0) { onAudioBlob(null); return; }
    onAudioBlob(new Blob(blobs, { type: blobs[0].type }));
  }, [audios, onAudioBlob]);


  const parts = data.parts || [];

  // Assign recorder IDs:
  // Part 2 gets ONE id, Part 1/3 get per-question ids
  let idCounter = 0;
  const sectionDefs = parts.map((p) => {
    if (p.part === "2") {
      const id = idCounter++;
      return { part: p, type: "part2" as const, recorderId: id };
    }
    const questions = p.questions || [];
    const startIndex = idCounter;
    idCounter += questions.length;
    const colorMap: Record<string, string> = { "1": "blue", "3": "emerald" };
    const labelMap: Record<string, string> = { "1": "Part 1 — Interview", "3": "Part 3 — Discussion" };
    return { part: p, type: "perq" as const, questions, startIndex, color: colorMap[p.part] ?? "violet", label: labelMap[p.part] ?? `Part ${p.part}` };
  });

  const totalRecorders = idCounter;
  const doneCount = Object.values(audios).filter(Boolean).length;

  if (parts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl border-2 border-violet-200 bg-violet-50 p-5">
        <p className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-2">Speaking Prompt</p>
        {data.prompt && <p className="text-gray-800 font-medium leading-relaxed">{data.prompt}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Progress bar */}
      <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 flex items-center gap-3">
        <Volume2 className="w-4 h-4 text-violet-500 shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-gray-500">
            Nhấn <strong>"Nghe câu hỏi"</strong> để nghe, sau đó nhấn 🎤 để ghi âm câu trả lời.
          </p>
          <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${totalRecorders > 0 ? (doneCount / totalRecorders) * 100 : 0}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-bold text-gray-600 shrink-0">{doneCount}/{totalRecorders}</span>
      </div>

      {/* Part sections */}
      {sectionDefs.map((s) => {
        if (s.type === "part2") {
          return (
            <Part2Block
              key="p2"
              part={s.part}
              globalRecordingId={globalRecordingId}
              onStartRecording={(id) => setGlobalRecordingId(id)}
              onStopRecording={() => setGlobalRecordingId(null)}
              audio={audios[s.recorderId] ?? null}
              onAudio={(a) => setAudios((prev) => ({ ...prev, [s.recorderId]: a }))}
              recorderId={s.recorderId}
            />
          );
        }
        return (
          <PartBlock
            key={s.part.part}
            part={s.part}
            color={(s as { color?: string }).color ?? "violet"}
            label={(s as { label?: string }).label ?? `Part ${s.part.part}`}
            questions={(s as { questions?: string[] }).questions ?? []}
            globalRecordingId={globalRecordingId}
            onStartRecording={(id) => setGlobalRecordingId(id)}
            onStopRecording={() => setGlobalRecordingId(null)}
            audios={audios}
            onAudio={(idx, a) => setAudios((prev) => ({ ...prev, [idx]: a }))}
            startIndex={(s as { startIndex?: number }).startIndex ?? 0}
          />
        );
      })}

      {/* Tips */}
      {/* <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tips</p>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>• <strong>Part 1 & 3:</strong> Nhấn nghe từng câu, trả lời 2–3 câu mỗi câu hỏi</li>
          <li>• <strong>Part 2:</strong> Nghe toàn bộ đề bài, chuẩn bị 1 phút, nói 1–2 phút liên tục</li>
          <li>• Chỉ ghi âm được 1 phần tại một thời điểm</li>
          <li>• Dùng cụm từ nối: <em>"Furthermore", "However", "In my opinion..."</em></li>
        </ul>
      </div> */}
    </div>
  );
}
