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
import { rawScoreToBand } from "@/lib/mock-skill/band-mapping";
import type { MockSkillAnswers, MockSkillContentPublic } from "@/lib/mock-skill/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_SPEAKING_BYTES = 24 * 1024 * 1024;

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
      if (typeof v !== "string") return `Đáp án không hợp lệ ở câu: ${q.id}`;
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
  // ── Auth: bắt buộc đăng nhập ────────────────────────────────
  const serverSb = await createServerSupabaseClient();
  const { data: { user } } = await serverSb.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập để nộp bài thi." },
      { status: 401 }
    );
  }

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

  const listeningPicks = parseMixedAnswers(form.get("listeningAnswers"));
  const readingPicks   = parseMixedAnswers(form.get("readingAnswers"));
  const writingTask1   = String(form.get("writingTask1") || "");
  const writingTask2   = String(form.get("writingTask2") || "");
  // Combined text (from legacy or combined field)
  const writingText    = String(form.get("writingText") || "") ||
    (writingTask1 || writingTask2 ? `TASK 1:\n${writingTask1}\n\nTASK 2:\n${writingTask2}` : "");
  const speakingFile   = form.get("speakingAudio");

  const admin = createAdminClient();

  // ── Resolve user profile ──────────────────────────────────────
  const { data: profile } = await admin
    .from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
  const { data: student } = await admin
    .from("students").select("phone, date_of_birth, current_address").eq("profile_id", user.id).maybeSingle();

  const candidate = {
    full_name:
      profile?.full_name ||
      (typeof user.user_metadata?.full_name === "string" ? String(user.user_metadata.full_name) : "") ||
      "Học viên",
    email: profile?.email || user.email || "",
    phone: student?.phone || undefined,
    birth_year: student?.date_of_birth ? String(student.date_of_birth).slice(0, 4) : undefined,
    hometown: student?.current_address || undefined,
  };

  if (!candidate.email) {
    return NextResponse.json({ error: "Không lấy được email từ tài khoản" }, { status: 400 });
  }

  // ── Load exam ─────────────────────────────────────────────────
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

  const audioKeysRaw = form.get("speakingAudioKeys");
  const audioKeys: string[] = typeof audioKeysRaw === "string" ? JSON.parse(audioKeysRaw) : [];

  let totalSpeakingSize = 0;
  for (const key of audioKeys) {
    const file = form.get(key);
    if (file instanceof File) {
      totalSpeakingSize += file.size;
    }
  }

  if (totalSpeakingSize > MAX_SPEAKING_BYTES) {
    return NextResponse.json({ error: "Tổng dung lượng file ghi âm quá lớn (tối đa 24MB)" }, { status: 400 });
  }

  // ── Auto-score L/R ────────────────────────────────────────────
  const { data: answerRow } = await admin
    .from("mock_skill_exam_answers")
    .select("answers")
    .eq("exam_id", exam.id)
    .maybeSingle();

  const answerKey = (answerRow?.answers || {}) as unknown as MockSkillAnswers;

  const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"];

  function getMatchedActualValue(
    q: { type: string; options?: string[] },
    rawStudentPick: unknown,
    expectedAnswer: unknown
  ): string | number {
    if (rawStudentPick === undefined || rawStudentPick === null) return "";

    if (q.type === "text" || q.type === "true_false_not_given") {
      return typeof rawStudentPick === "number" ? rawStudentPick : String(rawStudentPick).trim();
    }

    const options = q.options || [];
    if (typeof rawStudentPick === "number" && rawStudentPick >= 0 && rawStudentPick < options.length) {
      const optionText = options[rawStudentPick];
      const letter = OPTION_LETTERS[rawStudentPick] || "";
      const normExpected = String(expectedAnswer ?? "").trim().toLowerCase();
      
      // Match index format (e.g. 2 or "2")
      if (normExpected === String(rawStudentPick)) {
        return expectedAnswer as string | number;
      }
      // Match letter key (e.g. "c")
      if (letter && normExpected === letter.toLowerCase()) {
        return expectedAnswer as string | number;
      }
      // Match full option string
      if (normExpected === optionText.trim().toLowerCase()) {
        return expectedAnswer as string | number;
      }
      // Match option prefix
      if (optionText.trim().toLowerCase().startsWith(normExpected + ".")) {
        return expectedAnswer as string | number;
      }
      
      return optionText;
    }

    return typeof rawStudentPick === "string" ? rawStudentPick.trim() : "";
  }

  const listeningForScore: Record<string, string | number> = {};
  for (const q of content.listening.questions || []) {
    const raw = listeningPicks[q.id];
    const expected = (answerKey.listening || {})[q.id];
    listeningForScore[q.id] = getMatchedActualValue(q, raw, expected);
  }

  const readingForScore: Record<string, string | number> = {};
  for (const q of content.reading.questions || []) {
    const raw = readingPicks[q.id];
    const expected = (answerKey.reading || {})[q.id];
    readingForScore[q.id] = getMatchedActualValue(q, raw, expected);
  }

  const rawScores = scoreListeningReading(
    { listening: answerKey.listening || {}, reading: answerKey.reading || {} },
    listeningForScore,
    readingForScore
  );

  const lrScores = {
    listening: rawScores.listening
      ? {
          ...rawScores.listening,
          band: rawScoreToBand(rawScores.listening.correct, rawScores.listening.total, "listening"),
        }
      : undefined,
    reading: rawScores.reading
      ? {
          ...rawScores.reading,
          band: rawScoreToBand(rawScores.reading.correct, rawScores.reading.total, "reading_academic"),
        }
      : undefined,
  };

  // ── Insert submission ─────────────────────────────────────────
  const submittedAt = new Date();

  // answers_raw: lưu toàn bộ bài làm thô
  const answersRaw: Record<string, unknown> = {
    listening: listeningForScore,
    reading: readingForScore,
    writingText,
    writingTask1,
    writingTask2,
    speakingMimeType: audioKeys.length > 0 ? (form.get(audioKeys[0]) as File)?.type : null,
    speakingSize: totalSpeakingSize,
  };

  const { data: inserted, error: insErr } = await admin
    .from("mock_skill_submissions")
    .insert({
      exam_id: exam.id,
      auth_user_id: user.id,
      candidate: candidate as unknown as Record<string, unknown>,
      scores: lrScores as unknown as Record<string, unknown>,
      answers_raw: answersRaw,
      status: "pending",
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("[submit] Insert error:", insErr);
    return NextResponse.json({ error: "Không lưu được bài nộp" }, { status: 500 });
  }

  const submissionId = inserted.id;

  // ── Drive upload (non-blocking best-effort) ───────────────────
  const skipDrive = process.env.MOCK_SKILL_SKIP_DRIVE === "true";
  let driveFolderId: string | null = null;
  let driveFolderUrl: string | null = null;
  const driveFolderLabel = formatDriveSubmissionFolderName(
    candidate.full_name,
    candidate.email,
    submittedAt,
    submissionId
  );

  if (!skipDrive && isDriveConfigured()) {
    const parentId = getMockSkillDriveParentFolderId()!;
    console.log("[submit] Drive upload start. speakingFile:", {
      isFile: speakingFile instanceof File,
      size: speakingFile instanceof File ? speakingFile.size : 0,
      type: speakingFile instanceof File ? speakingFile.type : "n/a",
    });
    try {
      driveFolderId = await createDriveFolder(parentId, driveFolderLabel);
      driveFolderUrl = driveFolderWebViewUrl(driveFolderId);
      console.log("[submit] Drive folder created:", driveFolderId);

      const manifest = {
        examSlug,
        examTitle: exam.title,
        submissionId,
        submittedAt: submittedAt.toISOString(),
        candidate,
        authUserId: user.id,
        lrScores,
        listeningAnswers: listeningForScore,
        readingAnswers: readingForScore,
        writingWordCount: writingText.trim().split(/\s+/).filter(Boolean).length,
      };

      await uploadDriveFile(
        driveFolderId, "submission.json", "application/json",
        Buffer.from(JSON.stringify(manifest, null, 2), "utf8")
      );
      await uploadDriveFile(
        driveFolderId, "writing.txt", "text/plain; charset=utf-8",
        Buffer.from(writingText, "utf8")
      );
      console.log("[submit] submission.json + writing.txt uploaded");

      const uploadedAudios: Array<{ key: string; name: string; driveFileId: string; driveUrl: string }> = [];

      if (audioKeys.length > 0) {
        for (const key of audioKeys) {
          const file = form.get(key);
          if (file instanceof File && file.size > 0) {
            const buf = Buffer.from(await file.arrayBuffer());
            const mime = file.type || "audio/webm";
            const fileName = file.name;
            console.log(`[submit] Uploading speaking audio [${key}]:`, { size: buf.length, mime, fileName });
            
            const driveFileId = await uploadDriveFile(driveFolderId, fileName, mime, buf);
            const driveUrl = `https://drive.google.com/file/d/${driveFileId}/view`;
            uploadedAudios.push({
              key,
              name: fileName,
              driveFileId,
              driveUrl
            });
          }
        }
      }

      if (uploadedAudios.length > 0) {
        // Save all Drive audio details into answers_raw
        await admin.from("mock_skill_submissions").update({
          answers_raw: {
            ...answersRaw,
            speakingAudios: uploadedAudios,
            // Fallback for legacy fields
            speakingDriveFileId: uploadedAudios[0].driveFileId,
            speakingDriveUrl: uploadedAudios[0].driveUrl,
            speakingFileName: uploadedAudios[0].name,
          },
        }).eq("id", submissionId);
      } else {
        console.log("[submit] No speaking audio uploaded — uploading placeholder");
        await uploadDriveFile(
          driveFolderId, "speaking-placeholder.txt", "text/plain; charset=utf-8",
          Buffer.from("(Không có file ghi âm)", "utf8")
        );
      }

      // Update drive info + keep status pending
      await admin.from("mock_skill_submissions").update({
        drive_folder_id: driveFolderId,
        drive_folder_url: driveFolderUrl,
      }).eq("id", submissionId);
      console.log("[submit] Drive upload complete ✓");

    } catch (e) {
      console.error("[mock-skill] Drive upload FAILED:", e instanceof Error ? e.message : e);
      if (e instanceof Error && e.stack) console.error(e.stack.split("\n").slice(0,5).join("\n"));
    }
  } else {
    console.log("[submit] Drive skipped. skipDrive:", skipDrive, "isDriveConfigured:", isDriveConfigured());
  }

  // ── Send confirmation email ───────────────────────────────────
  void sendMockSkillConfirmationEmail(candidate.email, { examTitle: exam.title });

  return NextResponse.json({
    ok: true,
    submissionId,
    status: "pending",
    message: "Kết quả của bạn sẽ được cập nhật trên trang cá nhân và gửi về email của bạn trong vài giờ.",
  });
}
