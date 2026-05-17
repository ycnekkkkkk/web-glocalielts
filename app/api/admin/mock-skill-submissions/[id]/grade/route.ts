import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { scoreWriting } from "@/lib/gemini/score-writing";
import { scoreSpeaking } from "@/lib/gemini/score-speaking";
import { RateLimitError } from "@/lib/gemini/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

type GradeTarget = "writing" | "speaking" | "both" | "summary";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth: admin only ──────────────────────────────────────────
  const serverSb = await createServerSupabaseClient();
  const { data: { user } } = await serverSb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const { id: submissionId } = await params;
  const body = (await request.json().catch(() => ({}))) as { target?: GradeTarget };
  const target: GradeTarget = body.target ?? "both";

  // ── Load submission ───────────────────────────────────────────
  const { data: sub, error: subErr } = await admin
    .from("mock_skill_submissions")
    .select("id, exam_id, scores, answers_raw, status, candidate, drive_folder_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (subErr || !sub) {
    return NextResponse.json({ error: "Không tìm thấy submission" }, { status: 404 });
  }

  // ── Load exam content for prompts ────────────────────────────
  const { data: exam } = await admin
    .from("mock_skill_exam_defs")
    .select("id, title, content_public")
    .eq("id", sub.exam_id)
    .maybeSingle();

  const content = exam?.content_public as Record<string, unknown> | undefined;
  const writingSection = content?.writing as { prompt?: string; title?: string } | undefined;
  const speakingSection = content?.speaking as { prompt?: string; title?: string } | undefined;

  const answersRaw = (sub.answers_raw || {}) as Record<string, unknown>;
  const existingScores = (sub.scores || {}) as Record<string, unknown>;

  // ── Mark as grading ───────────────────────────────────────────
  await admin.from("mock_skill_submissions").update({ status: "grading" }).eq("id", submissionId);

  const newScores: Record<string, unknown> = { ...existingScores };
  const errors: string[] = [];
  let rateLimited = false;

  // ── Grade Writing ─────────────────────────────────────────────
  if (target === "writing" || target === "both") {
    const writingText = typeof answersRaw.writingText === "string" ? answersRaw.writingText : "";
    const wc = writingText.trim().split(/\s+/).filter(Boolean).length;

    if (writingText.trim() && wc >= 10) {
      const prompt = writingSection?.prompt || writingSection?.title || "IELTS Writing";
      try {
        const result = await scoreWriting(prompt, writingText, wc);
        if (result) {
          newScores.writing = {
            band: result.overall_band,
            criteria: result.criteria,
            feedback: result.feedback,
            word_count: wc,
          };
        }
      } catch (e) {
        console.error("[grade] Writing AI error:", e);
        if (e instanceof RateLimitError) {
          errors.push("Writing: Gemini quota exceeded — thử lại sau vài phút");
          rateLimited = true;
        } else {
          errors.push("Writing AI chấm thất bại");
        }
      }
    } else {
      errors.push("Không có bài viết hoặc quá ngắn");
    }
  }

  // ── Grade Speaking ────────────────────────────────────────────
  if (target === "speaking" || target === "both") {
    // Try to get audios from Drive if available
    const speakingAudios = answersRaw.speakingAudios as Array<{ key: string; name: string; driveFileId: string; driveUrl: string }> | undefined;
    const legacyDriveFileId = typeof answersRaw.speakingDriveFileId === "string" ? answersRaw.speakingDriveFileId : null;

    if ((Array.isArray(speakingAudios) && speakingAudios.length > 0 || legacyDriveFileId) && sub.drive_folder_id) {
      const { getDriveFileContent } = await import("@/lib/google/drive");
      const { scoreSpeakingMulti } = await import("@/lib/gemini/score-speaking");
      
      try {
        const audiosToScore: Array<{ base64: string; mimeType: string; name: string }> = [];
        
        if (Array.isArray(speakingAudios) && speakingAudios.length > 0) {
          console.log(`[grade] Fetching ${speakingAudios.length} speaking audios from Drive...`);
          for (const audio of speakingAudios) {
            try {
              const { buffer, mimeType } = await getDriveFileContent(audio.driveFileId);
              audiosToScore.push({
                base64: buffer.toString("base64"),
                mimeType: mimeType || "audio/webm",
                name: audio.name
              });
            } catch (err) {
              console.error(`[grade] Failed to fetch audio ${audio.name} (${audio.driveFileId}):`, err);
            }
          }
        } else if (legacyDriveFileId) {
          console.log(`[grade] Fetching legacy speaking audio (${legacyDriveFileId}) from Drive...`);
          const { buffer, mimeType } = await getDriveFileContent(legacyDriveFileId);
          audiosToScore.push({
            base64: buffer.toString("base64"),
            mimeType: mimeType || "audio/webm",
            name: String(answersRaw.speakingFileName || "speaking.webm")
          });
        }

        if (audiosToScore.length > 0) {
          let speakingExamPrompt = "";
          if (speakingSection) {
            speakingExamPrompt += `Exam Title: ${speakingSection.title || "IELTS Speaking"}\n`;
            if (speakingSection.prompt) {
              speakingExamPrompt += `General Instructions: ${speakingSection.prompt}\n`;
            }
            const parts = (speakingSection as any).parts;
            if (Array.isArray(parts)) {
              speakingExamPrompt += "\nEXAM STRUCTURE & QUESTIONS:\n";
              const partCounters: Record<string, number> = { "1": 0, "2": 0, "3": 0 };
              parts.forEach((p, index) => {
                const currentPart = p.part || String(index + 1);
                speakingExamPrompt += `\nPart ${currentPart} (${p.type || "General Topic"}):\n`;
                if (p.task) {
                  speakingExamPrompt += `- Cue Card/Task: ${p.task}\n`;
                  if (Array.isArray(p.cues) && p.cues.length > 0) {
                    speakingExamPrompt += `  Cues: ${p.cues.join(" | ")}\n`;
                  }
                }
                if (Array.isArray(p.questions) && p.questions.length > 0) {
                  speakingExamPrompt += "- Questions:\n";
                  p.questions.forEach((q: string) => {
                    partCounters[currentPart] = (partCounters[currentPart] || 0) + 1;
                    const qNo = partCounters[currentPart];
                    speakingExamPrompt += `  * Q${qNo} (filename matches "speaking_part${currentPart}_q${qNo}"): ${q}\n`;
                  });
                }
              });
            }
          }
          if (!speakingExamPrompt) {
            speakingExamPrompt = speakingSection?.prompt || speakingSection?.title || "IELTS Speaking";
          }

          console.log(`[grade] Calling scoreSpeakingMulti with ${audiosToScore.length} audios...`);
          const result = await scoreSpeakingMulti(audiosToScore, speakingExamPrompt);
          if (result) {
            newScores.speaking = {
              band: result.overall_band,
              criteria: result.criteria,
              transcript: result.transcript,
              feedback: result.feedback,
            };
          }
        } else {
          errors.push("Speaking AI chấm thất bại — không tải được tệp tin âm thanh nào từ Drive");
        }
      } catch (e) {
        console.error("[grade] Speaking AI error:", e);
        if (e instanceof RateLimitError) {
          errors.push("Speaking: Gemini quota exceeded — thử lại sau vài phút");
          rateLimited = true;
        } else {
          errors.push("Speaking AI chấm thất bại — kiểm tra audio Drive");
        }
      }
    } else {
      errors.push("Không có audio Speaking (chưa upload Drive)");
    }
  }

  // ── Determine new status ──────────────────────────────────────
  const hasWriting = Boolean(newScores.writing);
  const hasSpeaking = Boolean(newScores.speaking);
  const hasLR = Boolean(existingScores.listening || existingScores.reading);
  const fullyGraded = hasLR && hasWriting && hasSpeaking;
  // If rate-limited and nothing new was scored, revert to pending so admin can retry
  const newStatus = rateLimited && !hasWriting && !hasSpeaking
    ? "pending"
    : errors.length === 0 || fullyGraded ? "graded" : (errors.length < 2 ? "graded" : "pending");

  // ── Generate AI Summary ───────────────────────────────────────
  // Only run when explicitly requested via target "summary" or fully grading "both"
  if ((target === "summary" || target === "both") && !rateLimited) {
    try {
      const { generateSkillSummary } = await import("@/lib/gemini/score-summary");
      newScores.summary = await generateSkillSummary(newScores as any);
    } catch (e) {
      console.error("[grade] Summary AI error:", e);
      errors.push("Nhận xét tổng hợp: AI chấm thất bại");
    }
  }

  // ── Update DB ─────────────────────────────────────────────────
  await admin.from("mock_skill_submissions").update({
    scores: newScores,
    status: newStatus,
    graded_at: new Date().toISOString(),
    error_message: errors.length > 0 ? errors.join("; ") : null,
  }).eq("id", submissionId);

  return NextResponse.json({
    ok: !rateLimited,
    rateLimited,
    status: newStatus,
    scores: newScores,
    errors: errors.length > 0 ? errors : undefined,
    message: rateLimited
      ? "Gemini API quota tạm hết. Bài đã về trạng thái 'pending', thử lại sau vài phút."
      : undefined,
  });
}
