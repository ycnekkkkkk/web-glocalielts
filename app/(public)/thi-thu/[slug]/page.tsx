"use client";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PublicPageShell from "@/components/layout/PublicPageShell";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MockSkillBlock, MockSkillContentPublic, MockSkillQuestion } from "@/lib/mock-skill/types";
import type { MockSkillExamDef } from "@/types";
import { ArrowLeft, CheckCircle2, Mic, Square } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

type Step = "form" | "listening" | "reading" | "speaking" | "writing" | "done";

declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string, options: Record<string, unknown>) => {
        playVideo: () => void;
        pauseVideo: () => void;
        stopVideo: () => void;
        destroy?: () => void;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytScriptLoading: Promise<void> | null = null;
function ensureYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytScriptLoading) return ytScriptLoading;
  ytScriptLoading = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(s);
  });
  return ytScriptLoading;
}

function YouTubeAudioOnly({
  url,
  label,
}: {
  url: string;
  label: string;
}) {
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<{ playVideo: () => void; pauseVideo: () => void; stopVideo: () => void; destroy?: () => void } | null>(null);
  const holderRef = useRef<HTMLDivElement | null>(null);

  const videoId = useMemo(() => {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
      if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "").trim();
    } catch {
      return null;
    }
    return null;
  }, [url]);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    ensureYouTubeApi()
      .then(() => {
        if (cancelled || !window.YT?.Player || !holderRef.current) return;
        const player = new window.YT.Player(holderRef.current.id, {
          height: "0",
          width: "0",
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: () => setReady(true),
          },
        });
        playerRef.current = player;
      })
      .catch(() => {
        setReady(false);
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
  }, [videoId]);

  function play() {
    try {
      playerRef.current?.playVideo();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  function pause() {
    try {
      playerRef.current?.pauseVideo();
      setPlaying(false);
    } catch {
      setPlaying(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 p-3 bg-gray-50">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-sm font-medium text-gray-800">{label}</p>
      </div>
      <div ref={holderRef} id={`yt-audio-${videoId || "x"}`} className="w-0 h-0 overflow-hidden" />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="primary" onClick={play} disabled={!ready}>
          Phát audio
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={pause} disabled={!ready}>
          Tạm dừng
        </Button>
        <span className="text-xs text-gray-500">
          {!ready ? "Đang tải audio..." : playing ? "Đang phát" : "Đã dừng"}
        </span>
      </div>
    </div>
  );
}

function Blocks({ blocks }: { blocks: MockSkillBlock[] }) {
  function getYoutubeEmbedUrl(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube.com")) {
        const id = u.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.hostname.includes("youtu.be")) {
        const id = u.pathname.replace("/", "").trim();
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    } catch {
      return null;
    }
    return null;
  }

  return (
    <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === "text") {
          return (
            <div
              key={i}
              className="prose prose-sm max-w-none text-gray-700 [&_p]:my-2"
              dangerouslySetInnerHTML={{ __html: b.html }}
            />
          );
        }
        return (
          b.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={b.src}
              alt={b.alt || ""}
              className="max-w-full rounded-xl border border-gray-100 shadow-sm"
            />
          ) : (() => {
              const embed = getYoutubeEmbedUrl(b.url);
              return (
                <div key={i} className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-sm font-medium text-gray-800">{b.label || "Nghe audio"}</p>
                  </div>
                  {embed ? (
                    <YouTubeAudioOnly url={b.url} label={b.label || "Nghe audio"} />
                  ) : (
                    <audio controls className="w-full">
                      <source src={b.url} />
                    </audio>
                  )}
                </div>
              );
            })()
        );
      })}
    </div>
  );
}

const TF_OPTIONS = ["True", "False", "Not Given"];

function renderQuestionInput(
  q: MockSkillQuestion,
  value: Record<string, string | number>,
  onChange: (next: Record<string, string | number>) => void
) {
  if (q.type === "text") {
    return (
      <input
        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        value={typeof value[q.id] === "string" ? String(value[q.id]) : ""}
        onChange={(e) => onChange({ ...value, [q.id]: e.target.value })}
        placeholder="Nhập đáp án"
      />
    );
  }
  if (q.type === "true_false_not_given") {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {TF_OPTIONS.map((opt, idx) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50">
            <input
              type="radio"
              name={q.id}
              checked={value[q.id] === idx}
              onChange={() => onChange({ ...value, [q.id]: idx })}
            />
            <span className="text-sm text-gray-800">{opt}</span>
          </label>
        ))}
      </div>
    );
  }
  if (q.type === "matching") {
    const keys = q.options || [];
    return (
      <select
        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
        value={typeof value[q.id] === "number" ? String(value[q.id]) : (value[q.id] as string) || ""}
        onChange={(e) => {
          const idx = parseInt(e.target.value);
          onChange({ ...value, [q.id]: Number.isNaN(idx) ? e.target.value : idx });
        }}
      >
        <option value="">— Chọn —</option>
        {keys.map((k, idx) => (
          <option key={k} value={idx}>
            {k}{q.options_map?.[k] ? ` – ${q.options_map[k]}` : ""}
          </option>
        ))}
      </select>
    );
  }
  // single_choice / multiple_choice (render as radio for simplicity)
  return (
    <div className="mt-3 space-y-2">
      {(q.options || []).map((opt, idx) => (
        <label key={idx} className="flex items-start gap-3 cursor-pointer rounded-lg px-2 py-2 hover:bg-gray-50">
          <input
            type="radio"
            name={q.id}
            className="mt-1"
            checked={value[q.id] === idx}
            onChange={() => onChange({ ...value, [q.id]: idx })}
          />
          <span className="text-sm text-gray-800">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function McqSection({
  title,
  blocks,
  questions,
  value,
  onChange,
}: {
  title: string;
  blocks: MockSkillBlock[];
  questions: MockSkillQuestion[];
  value: Record<string, string | number>;
  onChange: (next: Record<string, string | number>) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <Blocks blocks={blocks} />
      <div className="space-y-6 pt-2">
        {questions.map((q) => (
          <fieldset key={q.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <legend className="px-1 text-sm font-semibold text-gray-900">{q.stem}</legend>
            {renderQuestionInput(q, value, onChange)}
          </fieldset>
        ))}
      </div>
    </div>
  );
}

function ListeningSection({
  title,
  blocks,
  questions,
  value,
  onChange,
}: {
  title: string;
  blocks: MockSkillBlock[];
  questions: MockSkillQuestion[];
  value: Record<string, string | number>;
  onChange: (next: Record<string, string | number>) => void;
}) {
  function getDisplayNo(q: MockSkillQuestion): string {
    if (typeof q.display_no === "number") return String(q.display_no);
    const n = Number(String(q.id).replace(/\D+/g, ""));
    return Number.isFinite(n) && n > 0 ? String(n) : q.id;
  }

  const sectionOrder = Array.from(
    new Set((blocks || []).map((b) => ("section" in b ? b.section : undefined)).filter(Boolean))
  ) as string[];
  const hasSection = sectionOrder.length > 0 && questions.some((q) => q.section);

  if (!hasSection) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <Blocks blocks={blocks} />
        <div className="space-y-6 pt-2">
          {questions.map((q) => (
            <fieldset key={q.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <legend className="px-1 text-sm font-semibold text-gray-900">
                Question {getDisplayNo(q)}. {q.stem}
              </legend>
              {renderQuestionInput(q, value, onChange)}
            </fieldset>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {sectionOrder.map((section) => {
        const sectionBlocks = blocks.filter((b) => ("section" in b ? b.section : undefined) === section);
        const sectionQuestions = questions.filter((q) => q.section === section);
        return (
          <div key={section} className="space-y-6 rounded-2xl border border-gray-200 p-4 sm:p-5 bg-white">
            <Blocks blocks={sectionBlocks} />
            <div className="space-y-5 pt-1">
              {sectionQuestions.map((q) => (
                <fieldset key={q.id} className="rounded-xl border border-gray-200 bg-gray-50/40 p-4">
                  <legend className="px-1 text-sm font-semibold text-gray-900">
                    Question {getDisplayNo(q)}. {q.stem}
                  </legend>
                  {renderQuestionInput(q, value, onChange)}
                </fieldset>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Wizard({ slug }: { slug: string }) {
  const pathname = usePathname();
  const [exam, setExam] = useState<MockSkillExamDef | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [hometown, setHometown] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);

  const [listeningPicks, setListeningPicks] = useState<Record<string, string | number>>({});
  const [readingPicks, setReadingPicks] = useState<Record<string, string | number>>({});
  const [writingText, setWritingText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);

  const content = exam?.content_public as unknown as MockSkillContentPublic | undefined;
  const inStudentPortal = pathname.startsWith("/student/");
  const thiThuRoot = inStudentPortal ? "/student/thi-thu" : "/thi-thu";
  const doneHomeHref = inStudentPortal ? "/student/dashboard" : "/";
  const hasFullExamContent = Boolean(
    content?.listening && content?.reading && content?.speaking && content?.writing
  );

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/mock-skill/exams/${slug}`);
      const json = (await res.json().catch(() => ({}))) as { exam?: MockSkillExamDef };
      setExam(json.exam || null);
      setLoading(false);
    }
    load().catch(console.error);
  }, [slug]);

  useEffect(() => {
    async function prefill() {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setIsLoggedIn(true);
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
      const resolvedFullName = profile?.full_name || String(user.user_metadata?.full_name || "").trim() || "Học viên";
      const resolvedEmail = profile?.email || user.email || "";
      setFullName(resolvedFullName);
      setEmail(resolvedEmail);
      const { data: student } = await supabase.from("students").select("phone, date_of_birth, current_address").eq("profile_id", user.id).maybeSingle();
      if (student?.phone) setPhone(student.phone);
      if (student?.date_of_birth) {
        const y = String(student.date_of_birth).slice(0, 4);
        if (y.length === 4) setBirthYear(y);
      }
      if (student?.current_address) setHometown(student.current_address);
      setConsent(true);
      setStep("listening");
    }
    prefill().catch(console.error);
  }, []);

  const minWords = content?.writing?.minWords ?? 0;
  const wordCount = useMemo(() => writingText.trim().split(/\s+/).filter(Boolean).length, [writingText]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        setAudioBlob(blob);
      };
      rec.start();
      setRecording(true);
    } catch {
      toast.error("Không truy cập được micro. Kiểm tra quyền trình duyệt.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    setRecording(false);
    mediaRecorderRef.current = null;
  }, []);

  async function submitAll() {
    if (!exam || !content) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("examSlug", exam.slug);
      fd.append(
        "candidate",
        JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          birth_year: birthYear.trim() || undefined,
          hometown: hometown.trim() || undefined,
          notes: notes.trim() || undefined,
        })
      );
      fd.append("listeningAnswers", JSON.stringify(listeningPicks));
      fd.append("readingAnswers", JSON.stringify(readingPicks));
      fd.append("writingText", writingText);
      if (audioBlob && audioBlob.size > 0) {
        const ext = audioBlob.type.includes("mp4") ? "m4a" : "webm";
        fd.append("speakingAudio", new File([audioBlob], `speaking.${ext}`, { type: audioBlob.type }));
      }

      const res = await fetch("/api/mock-skill/submit", { method: "POST", body: fd });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        details?: string;
        message?: string;
        status?: string;
      };
      if (!res.ok) {
        const msg = json.details ? `${json.error || "Lỗi"} — ${json.details}` : json.error || "Gửi bài thất bại";
        toast.error(msg);
        return;
      }
      if (json.status === "failed") {
        toast.error(json.message || "Lưu Drive thất bại — vẫn có thể lưu điểm trên hệ thống. Liên hệ admin.");
      }
      setStep("done");
      toast.success(json.message || "Đã nộp bài");
    } catch {
      toast.error("Lỗi mạng khi nộp bài");
    } finally {
      setSubmitting(false);
    }
  }

  function goFormNext() {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Vui lòng nhập họ tên và email.");
      return;
    }
    if (!consent) {
      toast.error("Vui lòng đồng ý cho phép lưu thông tin để chấm bài.");
      return;
    }
    setStep("listening");
  }

  if (loading) {
    const contentNode = (
      <div className="max-w-3xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
    if (inStudentPortal) return contentNode;
    return <PublicPageShell>{contentNode}</PublicPageShell>;
  }

  if (!exam || !content || !hasFullExamContent) {
    const contentNode = (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">
          Đề này chưa cấu hình đầy đủ 4 kỹ năng (Listening/Reading/Speaking/Writing). Vui lòng liên hệ admin để cập nhật đề.
        </p>
        <Link href={thiThuRoot} className="inline-block mt-4 text-brand-600 font-medium">
          ← Quay lại danh sách
        </Link>
      </div>
    );
    if (inStudentPortal) return contentNode;
    return <PublicPageShell>{contentNode}</PublicPageShell>;
  }

  if (step === "done") {
    const contentNode = (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Đã nhận bài làm</h1>
        <p className="text-gray-600 mt-3 leading-relaxed">
          Cảm ơn bạn, <strong>{fullName.trim()}</strong>. Kết quả chi tiết sẽ được gửi về{" "}
          <strong>{email.trim()}</strong> trong vài giờ làm việc — vui lòng kiểm tra cả hộp thư Spam.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={thiThuRoot}>
            <Button variant="outline">Về danh sách đề</Button>
          </Link>
          <Link href={doneHomeHref}>
            <Button variant="primary">Trang chủ</Button>
          </Link>
        </div>
      </div>
    );
    if (inStudentPortal) return contentNode;
    return <PublicPageShell>{contentNode}</PublicPageShell>;
  }

  const contentNode = (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
        <Link href={thiThuRoot} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-brand-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Thi thử 4 kỹ năng
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{exam.title}</h1>
        <p className="text-sm text-gray-500 mt-1 mb-8">
          Bước:{" "}
          {step === "form" && !isLoggedIn
            ? "Thông tin"
            : step === "listening"
              ? "Listening"
              : step === "reading"
                ? "Reading"
                : step === "speaking"
                  ? "Speaking"
                  : "Writing"}
        </p>

        <Card className="p-5 sm:p-6">
          {step === "form" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Nếu bạn chưa đăng nhập, vui lòng điền thông tin để chúng tôi gửi kết quả và liên hệ khi cần.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Họ và tên *</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Email *</span>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Số điện thoại</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Năm sinh</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    placeholder="VD: 2002"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-gray-700">Quê quán / địa chỉ</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={hometown}
                    onChange={(e) => setHometown(e.target.value)}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-gray-700">Ghi chú thêm</span>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[72px]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
              </div>
              <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>Tôi đồng ý để trung tâm lưu thông tin và bài làm nhằm chấm điểm và liên hệ theo chính sách bảo mật.</span>
              </label>
              <Button variant="primary" className="w-full sm:w-auto" onClick={goFormNext}>
                Bắt đầu làm bài
              </Button>
            </div>
          )}

          {step === "listening" && (
            <>
              <ListeningSection
                title={content.listening.title}
                blocks={content.listening.blocks}
                questions={content.listening.questions}
                value={listeningPicks}
                onChange={setListeningPicks}
              />
              <div className="mt-8 flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => setStep("reading")}
                >
                  Tiếp theo: Reading
                </Button>
              </div>
            </>
          )}

          {step === "reading" && (
            <>
              <McqSection
                title={content.reading.title}
                blocks={content.reading.blocks}
                questions={content.reading.questions}
                value={readingPicks}
                onChange={setReadingPicks}
              />
              <div className="mt-8 flex justify-between gap-3">
                <Button variant="outline" onClick={() => setStep("listening")}>
                  Quay lại
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setStep("speaking")}
                >
                  Tiếp theo: Speaking
                </Button>
              </div>
            </>
          )}

          {step === "speaking" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">{content.speaking.title}</h2>
              <Blocks blocks={content.speaking.blocks} />
              {content.speaking.prompt && (
                <p className="text-sm font-medium text-gray-800 bg-brand-50/80 rounded-xl p-4 border border-brand-100">
                  {content.speaking.prompt}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {!recording ? (
                  <Button type="button" variant="primary" icon={<Mic className="w-4 h-4" />} onClick={startRecording}>
                    Bắt đầu ghi âm
                  </Button>
                ) : (
                  <Button type="button" variant="danger" icon={<Square className="w-4 h-4" />} onClick={stopRecording}>
                    Dừng ghi
                  </Button>
                )}
                {audioBlob && audioBlob.size > 0 && !recording && (
                  <span className="text-sm text-emerald-700">Đã có bản ghi — có thể ghi lại bằng cách bấm &quot;Bắt đầu ghi âm&quot;.</span>
                )}
              </div>
              <div className="flex justify-between gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("reading")}>
                  Quay lại
                </Button>
                <Button variant="primary" onClick={() => setStep("writing")}>
                  Tiếp theo: Writing
                </Button>
              </div>
            </div>
          )}

          {step === "writing" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">{content.writing.title}</h2>
              <Blocks blocks={content.writing.blocks} />
              {content.writing.prompt && (
                <p className="text-sm font-medium text-gray-800 bg-amber-50/90 rounded-xl p-4 border border-amber-100">
                  {content.writing.prompt}
                </p>
              )}
              <label className="block text-sm">
                <span className="font-medium text-gray-700">Bài viết của bạn</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[200px] font-sans"
                  value={writingText}
                  onChange={(e) => setWritingText(e.target.value)}
                  placeholder="Viết bài tại đây..."
                />
              </label>
              <p className="text-xs text-gray-500">
                Số từ: {wordCount}
                {minWords > 0 ? ` / tối thiểu ${minWords}` : ""}
              </p>
              <div className="flex justify-between gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep("speaking")}>
                  Quay lại
                </Button>
                <Button variant="primary" loading={submitting} onClick={submitAll}>
                  Nộp bài
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
  );
  if (inStudentPortal) return contentNode;
  return <PublicPageShell>{contentNode}</PublicPageShell>;
}

export default function ThiThuSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <Wizard slug={slug} />;
}
