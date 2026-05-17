"use client";

import { cn } from "@/utils/cn";
import type { ExamSession, ExamStep, MockSkillContentPublic } from "@/lib/mock-skill/types";
import type { MockSkillExamDef } from "@/types";
import { ExamHeader } from "./ExamHeader";
import { ExamIntro } from "./ExamIntro";
import { ListeningSection } from "./ListeningSection";
import { ReadingSection } from "./ReadingSection";
import { SpeakingSection, type QuestionAudio } from "./SpeakingSection";
import { WritingSection, type WritingValues } from "./WritingSection";
import { ExamSubmittedConfirmation } from "./ExamSubmittedConfirmation";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, ChevronLeft, Loader2, Lock, Upload } from "lucide-react";

// ── Session persistence ──────────────────────────────────────────

function sessionKey(slug: string) { return `exam-session-${slug}`; }

function loadSession(slug: string): Partial<ExamSession> | null {
  try {
    const raw = localStorage.getItem(sessionKey(slug));
    if (!raw) return null;
    const s = JSON.parse(raw) as ExamSession;
    if (Date.now() - s.lastSavedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(sessionKey(slug));
      return null;
    }
    return s;
  } catch { return null; }
}

function saveSession(slug: string, session: Partial<ExamSession>) {
  try {
    localStorage.setItem(sessionKey(slug), JSON.stringify({ ...session, lastSavedAt: Date.now() }));
  } catch { /* storage full */ }
}

function clearSession(slug: string) {
  try { localStorage.removeItem(sessionKey(slug)); } catch { /* empty */ }
}

// ── Wizard ───────────────────────────────────────────────────────

const STEP_ORDER: ExamStep[] = ["intro", "listening", "reading", "speaking", "writing", "submitting", "done"];

function nextStep(current: ExamStep): ExamStep {
  const idx = STEP_ORDER.indexOf(current);
  return idx >= 0 && idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : current;
}

function prevStep(current: ExamStep): ExamStep {
  const idx = STEP_ORDER.indexOf(current);
  return idx > 0 ? STEP_ORDER[idx - 1] : current;
}

const STEP_LABELS: Record<ExamStep, string> = {
  intro: "Giới thiệu",
  listening: "Listening",
  reading: "Reading",
  speaking: "Speaking",
  writing: "Writing",
  submitting: "Đang nộp bài...",
  done: "Hoàn thành",
};

interface ExamWizardProps {
  slug: string;
}

export function ExamWizard({ slug }: ExamWizardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const inStudentPortal = pathname.startsWith("/student/");
  const thiThuRoot = inStudentPortal ? "/student/thi-thu" : "/thi-thu";
  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;

  const [exam, setExam] = useState<MockSkillExamDef | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [candidateName, setCandidateName] = useState("");

  const [step, setStep] = useState<ExamStep>("intro");
  const [submitting, setSubmitting] = useState(false);

  const [listeningPicks, setListeningPicks] = useState<Record<string, string | number>>({});
  const [readingPicks, setReadingPicks]     = useState<Record<string, string | number>>({});
  const [writingValues, setWritingValues] = useState<WritingValues>({ task1: "", task2: "" });
  const [audioBlob, setAudioBlob]           = useState<Blob | null>(null);
  const [speakingAudios, setSpeakingAudios] = useState<Record<number, QuestionAudio | null>>({});
  const [flagged, setFlagged]               = useState<string[]>([]);

  const [startTimeMs] = useState(() => Date.now());
  const [hasResume, setHasResume] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const examRef = useRef<MockSkillExamDef | null>(null);
  const content = exam?.content_public as unknown as MockSkillContentPublic | undefined;

  // ── Auth check ────────────────────────────────────────────────

  useEffect(() => {
    async function checkAuth() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoggedIn(false);
        setAuthChecked(true);
        return;
      }
      setIsLoggedIn(true);
      // Prefill candidate name for display
      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setCandidateName(
        profile?.full_name ||
        String(user.user_metadata?.full_name || "").trim() ||
        "Học viên"
      );
      setAuthChecked(true);
    }
    checkAuth().catch(console.error);
  }, []);

  // ── Load exam ─────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/mock-skill/exams/${slug}`);
      const json = (await res.json().catch(() => ({}))) as { exam?: MockSkillExamDef };
      setExam(json.exam || null);
      examRef.current = json.exam || null;
      setLoading(false);
    }
    load().catch(console.error);
  }, [slug]);

  // ── Resume detection ──────────────────────────────────────────

  useEffect(() => {
    const saved = loadSession(slug);
    if (saved && saved.step && saved.step !== "done") {
      setHasResume(true);
    }
  }, [slug]);

  // ── Auto-save session ─────────────────────────────────────────

  useEffect(() => {
    if (step === "done" || step === "submitting" || step === "intro") return;
    saveSession(slug, { examSlug: slug, step, listeningPicks, readingPicks, writingText: JSON.stringify(writingValues), flaggedQuestions: flagged, startedAt: startTimeMs, lastSavedAt: Date.now() });
  }, [step, listeningPicks, readingPicks, writingValues, flagged, slug, startTimeMs]);

  // ── Anti-refresh warning ──────────────────────────────────────

  useEffect(() => {
    if (step === "intro" || step === "done") return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step]);

  // ── Fullscreen ────────────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Flag toggle ───────────────────────────────────────────────

  const toggleFlag = useCallback((id: string) => {
    setFlagged((f) => f.includes(id) ? f.filter((x) => x !== id) : [...f, id]);
  }, []);

  // ── Resume ────────────────────────────────────────────────────

  const handleResume = useCallback(() => {
    const saved = loadSession(slug);
    if (!saved) return;
    if (saved.listeningPicks) setListeningPicks(saved.listeningPicks);
    if (saved.readingPicks) setReadingPicks(saved.readingPicks);
    if (saved.writingText) {
      try { setWritingValues(JSON.parse(saved.writingText) as WritingValues); } catch { setWritingValues({ task1: saved.writingText, task2: "" }); }
    }
    if (saved.flaggedQuestions) setFlagged(saved.flaggedQuestions);
    if (saved.step) setStep(saved.step);
    setHasResume(false);
    toast.success("Đã khôi phục bài làm còn dang dở!");
  }, [slug]);

  // ── Submit ────────────────────────────────────────────────────

  async function submitAll() {
    if (!exam || !content) return;
    setStep("submitting");
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("examSlug", exam.slug);
      fd.append("listeningAnswers", JSON.stringify(listeningPicks));
      fd.append("readingAnswers", JSON.stringify(readingPicks));
      fd.append("writingTask1", writingValues.task1);
      fd.append("writingTask2", writingValues.task2);
      fd.append("writingText", `TASK 1:\n${writingValues.task1}\n\nTASK 2:\n${writingValues.task2}`);

      // Build descriptive list of audio files using unified part-specific counters
      const audioKeys: string[] = [];
      const partCounters: Record<string, number> = { "1": 0, "2": 0, "3": 0 };
      let idCounter = 0;

      (content.speaking.parts || []).forEach((p) => {
        const currentPart = p.part || "1";
        if (currentPart === "2") {
          const audio = speakingAudios[idCounter];
          if (audio && audio.blob && audio.blob.size > 0) {
            const ext = audio.blob.type.includes("mp4") ? "m4a" : "webm";
            const key = `speakingAudio_part2`;
            fd.append(key, new File([audio.blob], `speaking_part2.${ext}`, { type: audio.blob.type }));
            audioKeys.push(key);
          }
          idCounter++;
        } else {
          (p.questions || []).forEach((q) => {
            partCounters[currentPart] = (partCounters[currentPart] || 0) + 1;
            const qNo = partCounters[currentPart];
            const audio = speakingAudios[idCounter];
            if (audio && audio.blob && audio.blob.size > 0) {
              const ext = audio.blob.type.includes("mp4") ? "m4a" : "webm";
              const key = `speakingAudio_part${currentPart}_q${qNo}`;
              fd.append(key, new File([audio.blob], `speaking_part${currentPart}_q${qNo}.${ext}`, { type: audio.blob.type }));
              audioKeys.push(key);
            }
            idCounter++;
          });
        }
      });
      fd.append("speakingAudioKeys", JSON.stringify(audioKeys));

      const res = await fetch("/api/mock-skill/submit", { method: "POST", body: fd });
      const json = await res.json() as { ok?: boolean; error?: string; message?: string; status?: string };

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
          router.push(loginHref);
          return;
        }
        toast.error(json.error || "Gửi bài thất bại");
        setStep("writing");
        return;
      }

      clearSession(slug);
      setStep("done");
      toast.success("Đã nộp bài thành công!");
    } catch {
      toast.error("Lỗi mạng khi nộp bài. Vui lòng thử lại.");
      setStep("writing");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading states ────────────────────────────────────────────

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  // ── Auth gate ─────────────────────────────────────────────────

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50/30 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-xl font-black text-gray-900">Đăng nhập để làm bài</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Bạn cần đăng nhập để tham gia bài thi. Kết quả sẽ được lưu về tài khoản của bạn và gửi qua email sau khi chấm.
          </p>
          <a
            href={loginHref}
            className="block w-full rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white py-3.5 font-bold text-sm hover:opacity-90 transition-all shadow-md"
          >
            Đăng nhập / Tạo tài khoản
          </a>
          <a href={thiThuRoot} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600">
            <ChevronLeft className="w-4 h-4" /> Quay lại danh sách đề
          </a>
        </div>
      </div>
    );
  }

  if (!exam || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-gray-600 mb-4">Đề này chưa cấu hình đầy đủ 4 kỹ năng. Vui lòng liên hệ admin.</p>
          <a href={thiThuRoot} className="inline-flex items-center gap-1.5 text-brand-600 font-semibold text-sm hover:underline">
            <ChevronLeft className="w-4 h-4" />Quay lại danh sách
          </a>
        </div>
      </div>
    );
  }

  const hasFullContent = Boolean(content.listening && content.reading && content.speaking && content.writing);
  if (!hasFullContent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Đề thi chưa đầy đủ nội dung.</p>
          <a href={thiThuRoot} className="text-brand-600 font-semibold text-sm hover:underline">← Quay lại danh sách</a>
        </div>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gray-50">
        <ExamSubmittedConfirmation
          examTitle={exam.title}
          candidateName={candidateName}
          thiThuRoot={thiThuRoot}
        />
      </div>
    );
  }

  // ── Submitting ────────────────────────────────────────────────

  if (step === "submitting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
        <p className="font-bold text-gray-700 text-lg">Đang nộp bài...</p>
        <p className="text-sm text-gray-500">Vui lòng không đóng trình duyệt</p>
      </div>
    );
  }

  // ── Intro ─────────────────────────────────────────────────────

  if (step === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
        <ExamIntro
          examTitle={exam.title}
          examDescription={exam.description || undefined}
          content={content}
          candidateName={candidateName}
          onStart={() => setStep("listening")}
          hasResume={hasResume}
          onResume={handleResume}
        />
      </div>
    );
  }

  // ── Skill steps ───────────────────────────────────────────────

  const allQuestions = step === "listening"
    ? content.listening.questions
    : step === "reading"
    ? content.reading.questions
    : [];

  const allAnswers = step === "listening" ? listeningPicks : step === "reading" ? readingPicks : {};
  const answeredCount = Object.keys(allAnswers).filter((k) => allAnswers[k] !== undefined && allAnswers[k] !== "").length;

  const isFirstSkillStep = step === "listening";
  const isLastSkillStep = step === "writing";

  function handleBack() {
    const prev = prevStep(step);
    setStep(prev !== "intro" ? prev as ExamStep : "intro");
  }

  function handleNext() {
    if (isLastSkillStep) { submitAll(); }
    else { setStep(nextStep(step) as ExamStep); }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ExamHeader
        examTitle={exam.title}
        step={step}
        answeredCount={answeredCount}
        totalQuestions={allQuestions.length}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onSaveExit={() => {
          saveSession(slug, { examSlug: slug, step, listeningPicks, readingPicks, writingText: JSON.stringify(writingValues), flaggedQuestions: flagged, startedAt: startTimeMs, lastSavedAt: Date.now() });
          toast.success("Đã lưu bài. Bạn có thể tiếp tục sau.");
          window.location.href = thiThuRoot;
        }}
      />

      <main className={cn("flex-1 mx-auto w-full px-4 sm:px-6 py-6 transition-all duration-300", step === "reading" ? "max-w-[1440px]" : "max-w-6xl")}>
        {/* Step heading */}
        <div className="mb-6">
          <a href={thiThuRoot} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600 mb-3 transition-colors">
            <ArrowLeft className="w-3 h-3" /> {exam.title}
          </a>
          <h2 className="text-xl font-black text-gray-900">{STEP_LABELS[step]}</h2>
        </div>

        {step === "listening" && (
          <ListeningSection data={content.listening} answers={listeningPicks} flagged={flagged} onChange={setListeningPicks} onFlag={toggleFlag} />
        )}
        {step === "reading" && (
          <ReadingSection data={content.reading} answers={readingPicks} flagged={flagged} onChange={setReadingPicks} onFlag={toggleFlag} examSlug={slug} />
        )}
        {/* Speaking — always mounted to preserve recording state */}
          <div className={cn(step !== "speaking" && "hidden")}>
            <SpeakingSection
              data={content.speaking}
              audioBlob={audioBlob}
              onAudioBlob={setAudioBlob}
              audios={speakingAudios}
              onAudios={setSpeakingAudios}
            />
          </div>
        {step === "writing" && (
          <WritingSection data={content.writing} values={writingValues} onChange={setWritingValues} />
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between gap-4 pb-8">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {isFirstSkillStep ? "Quay lại giới thiệu" : "Phần trước"}
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all shadow-sm",
              isLastSkillStep
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 shadow-md"
                : "bg-gradient-to-r from-brand-600 to-indigo-600 text-white hover:opacity-90",
              submitting && "opacity-60 cursor-not-allowed"
            )}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Đang nộp...</>
            ) : isLastSkillStep ? (
              <><Upload className="w-4 h-4" />Nộp bài</>
            ) : (
              <>Phần tiếp theo<ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
