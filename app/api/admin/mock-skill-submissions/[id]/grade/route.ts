import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { scoreWriting } from "@/lib/gemini/score-writing";
import { scoreSpeaking } from "@/lib/gemini/score-speaking";
import { RateLimitError } from "@/lib/gemini/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

type GradeTarget = "writing" | "speaking" | "both";

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
    const speakingDriveUrl = typeof answersRaw.speakingDriveFileId === "string"
      ? answersRaw.speakingDriveFileId
      : null;

    // Try to get audio from Drive if available
    if (speakingDriveUrl && sub.drive_folder_id) {
      const { getDriveFileContent } = await import("@/lib/google/drive");
      try {
        const { buffer, mimeType } = await getDriveFileContent(speakingDriveUrl);
        const base64 = buffer.toString("base64");
        const prompt = speakingSection?.prompt || speakingSection?.title || "IELTS Speaking";
        const result = await scoreSpeaking(base64, mimeType || "audio/webm", prompt);
        if (result) {
          newScores.speaking = {
            band: result.overall_band,
            criteria: result.criteria,
            transcript: result.transcript,
            feedback: result.feedback,
          };
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
  if (fullyGraded && !rateLimited) {
    try {
      const { generateSkillSummary } = await import("@/lib/gemini/score-summary");
      newScores.summary = await generateSkillSummary(newScores as any);
    } catch (e) {
      console.error("[grade] Summary AI error:", e);
      // Non-fatal
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
