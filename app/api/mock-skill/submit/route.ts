import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendMockSkillConfirmationEmail } from "@/lib/mock-skill/email";
import {
  createDriveFolder,
  driveFolderWebViewUrl,
  getMockSkillDriveParentFolderId,
  isDriveConfigured,
  uploadDriveFile,
} from "@/lib/google/drive";
import { formatDriveSubmissionFolderName } from "@/lib/mock-skill/format-drive-folder-name";
import { resolveExamContentPublic } from "@/lib/mock-skill/resolve-content";
import { scoreListeningReading } from "@/lib/mock-skill/score";
import type { MockSkillAnswers, MockSkillContentPublic } from "@/lib/mock-skill/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const MAX_SPEAKING_BYTES = 24 * 1024 * 1024;

const candidateSchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional(),
  birth_year: z.string().trim().max(4).optional(),
  hometown: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function parsePicks(raw: unknown): Record<string, number> {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "number" && Number.isInteger(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function parseMixedAnswers(raw: unknown): Record<string, string | number> {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "number" && Number.isInteger(v)) out[k] = v;
      if (typeof v === "string") out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

function validateMcqPicks(
  questions: { id: string; type?: string; options?: string[] }[] | undefined,
  picks: Record<string, string | number>
): string | null {
  if (!questions?.length) return null;
  const CHOICE_TYPES = new Set(["single_choice", "true_false_not_given", "matching", "multiple_choice"]);
  for (const q of questions) {
    if (!q.type || !CHOICE_TYPES.has(q.type)) continue; // text questions — skip
    const opts = q.options || [];
    const v = picks[q.id];
    if (v === undefined) continue;
    if (typeof v === "number" && (v < 0 || v >= opts.length)) {
      return `Đáp án không hợp lệ ở câu: ${q.id}`;
    }
  }
  return null;
}

function validateListeningAnswers(
  questions: Array<{ id: string; type: string; options?: string[] }> | undefined,
  picks: Record<string, string | number>
): string | null {
  if (!questions?.length) return null;
  const CHOICE_TYPES = new Set(["single_choice", "true_false_not_given", "matching", "multiple_choice"]);
  for (const q of questions) {
    const v = picks[q.id];
    if (v === undefined) continue;
    if (q.type === "text") {
      if (typeof v !== "string") {
        return `Đáp án không hợp lệ ở câu: ${q.id}`;
      }
      continue;
    }
    if (CHOICE_TYPES.has(q.type)) {
      const opts = q.options || [];
      if (typeof v === "number" && (v < 0 || v >= opts.length)) {
        return `Đáp án không hợp lệ ở câu: ${q.id}`;
      }
    }
  }
  return null;
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const examSlug = String(form.get("examSlug") || "").trim();
  if (!examSlug) {
    return NextResponse.json({ error: "Thiếu mã đề (examSlug)" }, { status: 400 });
  }

  const candidateRaw = typeof form.get("candidate") === "string" ? (form.get("candidate") as string) : "";
  let candidateJson: unknown;
  try {
    candidateJson = candidateRaw.trim() ? JSON.parse(candidateRaw) : {};
  } catch {
    return NextResponse.json({ error: "Dữ liệu thí sinh không phải JSON hợp lệ" }, { status: 400 });
  }

  const listeningPicks = parseMixedAnswers(form.get("listeningAnswers"));
  const readingPicks = parseMixedAnswers(form.get("readingAnswers"));
  const writingText = String(form.get("writingText") || "");
  const speakingFile = form.get("speakingAudio");

  const serverSb = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSb.auth.getUser();
  const admin = createAdminClient();

  const candidateSeed =
    candidateJson && typeof candidateJson === "object" && !Array.isArray(candidateJson)
      ? (candidateJson as Record<string, unknown>)
      : {};

  let candidateInput: Record<string, unknown> = {
    full_name: typeof candidateSeed.full_name === "string" ? candidateSeed.full_name : "",
    email: typeof candidateSeed.email === "string" ? candidateSeed.email : "",
    phone: typeof candidateSeed.phone === "string" ? candidateSeed.phone : undefined,
    birth_year: typeof candidateSeed.birth_year === "string" ? candidateSeed.birth_year : undefined,
    hometown: typeof candidateSeed.hometown === "string" ? candidateSeed.hometown : undefined,
    notes: typeof candidateSeed.notes === "string" ? candidateSeed.notes : undefined,
  };

  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    const { data: student } = await admin
      .from("students")
      .select("phone, date_of_birth, current_address")
      .eq("profile_id", user.id)
      .maybeSingle();

    const resolvedBirthYear = student?.date_of_birth ? String(student.date_of_birth).slice(0, 4) : undefined;

    candidateInput = {
      ...candidateInput,
      full_name:
        profile?.full_name ||
        (typeof user.user_metadata?.full_name === "string" ? String(user.user_metadata.full_name) : "") ||
        String(candidateInput.full_name || "").trim() ||
        "Học viên",
      email: profile?.email || user.email || String(candidateInput.email || "").trim(),
      phone: student?.phone || candidateInput.phone,
      birth_year: resolvedBirthYear || candidateInput.birth_year,
      hometown: student?.current_address || candidateInput.hometown,
    };
  }

  const parsedCandidate = candidateSchema.safeParse(candidateInput);
  if (!parsedCandidate.success) {
    const details = parsedCandidate.error.issues.map((i) => `${i.path.join(".") || "form"}: ${i.message}`).join("; ");
    return NextResponse.json({ error: "Thông tin thí sinh không hợp lệ", details }, { status: 400 });
  }
  const candidate = parsedCandidate.data;

  const { data: exam, error: examErr } = await admin
    .from("mock_skill_exam_defs")
    .select("id, slug, title, content_public, content_drive_file_id")
    .eq("slug", examSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (examErr || !exam) {
    return NextResponse.json({ error: "Không tìm thấy đề hoặc đề đã tắt" }, { status: 404 });
  }

  const content = (await resolveExamContentPublic(exam)) as MockSkillContentPublic | null;
  if (!content?.listening || !content?.reading || !content?.speaking || !content?.writing) {
    return NextResponse.json({ error: "Nội dung đề không hợp lệ" }, { status: 500 });
  }

  const listenErr = validateListeningAnswers(content.listening.questions, listeningPicks);
  if (listenErr) return NextResponse.json({ error: listenErr }, { status: 400 });
  const readErr = validateMcqPicks(content.reading.questions, readingPicks);
  if (readErr) return NextResponse.json({ error: readErr }, { status: 400 });

  const wc = countWords(writingText);

  if (speakingFile instanceof File && speakingFile.size > MAX_SPEAKING_BYTES) {
    return NextResponse.json({ error: "File ghi âm quá lớn" }, { status: 400 });
  }

  const { data: answerRow } = await admin
    .from("mock_skill_exam_answers")
    .select("answers")
    .eq("exam_id", exam.id)
    .maybeSingle();

  const answerKey = (answerRow?.answers || {}) as unknown as MockSkillAnswers;
  // Convert selection indices → option text for ALL choice-based questions
  const CHOICE_TYPES = new Set(["single_choice", "true_false_not_given", "matching", "multiple_choice"]);

  const listeningForScore: Record<string, string | number> = {};
  for (const q of content.listening.questions || []) {
    const raw = listeningPicks[q.id];
    if (CHOICE_TYPES.has(q.type) && typeof raw === "number") {
      listeningForScore[q.id] = q.options?.[raw] ?? "";
    } else {
      listeningForScore[q.id] = typeof raw === "string" ? raw : "";
    }
  }

  const readingForScore: Record<string, string | number> = {};
  for (const q of content.reading.questions || []) {
    const raw = readingPicks[q.id];
    if (CHOICE_TYPES.has(q.type) && typeof raw === "number") {
      readingForScore[q.id] = q.options?.[raw] ?? "";
    } else {
      readingForScore[q.id] = typeof raw === "string" ? raw : "";
    }
  }

  const scores = scoreListeningReading(
    {
      listening: answerKey.listening || {},
      reading: answerKey.reading || {},
    },
    listeningForScore,
    readingForScore
  );

  const { data: inserted, error: insErr } = await admin
    .from("mock_skill_submissions")
    .insert({
      exam_id: exam.id,
      auth_user_id: user?.id ?? null,
      candidate: candidate as unknown as Record<string, unknown>,
      status: "processing",
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error(insErr);
    return NextResponse.json({ error: "Không lưu được bài nộp" }, { status: 500 });
  }

  const submissionId = inserted.id;
  const submittedAt = new Date();
  const driveFolderLabel = formatDriveSubmissionFolderName(
    candidate.full_name,
    candidate.email,
    submittedAt,
    submissionId
  );
  const skipDrive = process.env.MOCK_SKILL_SKIP_DRIVE === "true";
  let driveFolderId: string | null = null;
  let driveFolderUrl: string | null = null;
  let errorMessage: string | null = null;

  const manifest = {
    examSlug,
    examTitle: exam.title,
    submissionId,
    submittedAt: submittedAt.toISOString(),
    driveFolderLabel,
    candidate,
    authUserId: user?.id ?? null,
    listeningAnswers: listeningForScore,
    readingAnswers: readingPicks,
    scores,
    writingText,
    writingWordCount: wc,
  };

  if (!skipDrive && isDriveConfigured()) {
    const parentId = getMockSkillDriveParentFolderId()!;
    try {
      driveFolderId = await createDriveFolder(parentId, driveFolderLabel);
      driveFolderUrl = driveFolderWebViewUrl(driveFolderId);

      await uploadDriveFile(
        driveFolderId,
        "submission.json",
        "application/json",
        Buffer.from(JSON.stringify(manifest, null, 2), "utf8")
      );
      await uploadDriveFile(driveFolderId, "writing.txt", "text/plain; charset=utf-8", Buffer.from(writingText, "utf8"));

      if (speakingFile instanceof File && speakingFile.size > 0) {
        const buf = Buffer.from(await speakingFile.arrayBuffer());
        const mime = speakingFile.type || "audio/webm";
        const ext = mime.includes("mp4") ? "m4a" : mime.includes("mpeg") ? "mp3" : "webm";
        await uploadDriveFile(driveFolderId, `speaking.${ext}`, mime || "audio/webm", buf);
      } else {
        await uploadDriveFile(
          driveFolderId,
          "speaking-placeholder.txt",
          "text/plain; charset=utf-8",
          Buffer.from("(Không có file ghi âm đính kèm)", "utf8")
        );
      }
    } catch (e) {
      console.error("[mock-skill] Drive upload failed:", e);
      errorMessage = e instanceof Error ? e.message : "Drive upload failed";
    }
  } else if (!skipDrive && !isDriveConfigured()) {
    errorMessage =
      "Drive chưa cấu hình OAuth. Cần GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (hoặc GOOGLE_SECRET), GOOGLE_REFRESH_TOKEN, và GOOGLE_DRIVE_FOLDER_ID hoặc MOCK_SKILL_DRIVE_PARENT_FOLDER_ID. Xem web/docs/GOOGLE_DRIVE_OAUTH_SETUP.md. Hoặc MOCK_SKILL_SKIP_DRIVE=true khi dev.";
  }

  const finalStatus = skipDrive || driveFolderId !== null ? "completed" : "failed";

  await admin
    .from("mock_skill_submissions")
    .update({
      drive_folder_id: driveFolderId,
      drive_folder_url: driveFolderUrl,
      scores: scores as unknown as Record<string, unknown>,
      status: finalStatus,
      error_message: errorMessage,
    })
    .eq("id", submissionId);

  if (finalStatus === "completed") {
    void sendMockSkillConfirmationEmail(candidate.email, { examTitle: exam.title });
  }

  return NextResponse.json({
    ok: true,
    submissionId,
    status: finalStatus,
    message:
      finalStatus === "completed"
        ? "Đã nộp bài. Kết quả chi tiết sẽ được gửi về email của bạn trong vài giờ."
        : errorMessage || "Nộp bài thất bại",
  });
}
