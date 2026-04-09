import { createAdminClient } from "@/lib/supabase/admin";
import {
  driveFileWebViewUrl,
  getMockSkillDriveExamsFolderId,
  isDriveConfigured,
  uploadDriveJson,
} from "@/lib/google/drive";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const caller = await createServerSupabaseClient();
  const {
    data: { user },
    error: authErr,
  } = await caller.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await caller.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isDriveConfigured()) {
    return NextResponse.json({ error: "Drive chưa cấu hình" }, { status: 400 });
  }
  const examsFolderId = getMockSkillDriveExamsFolderId();
  if (!examsFolderId) {
    return NextResponse.json({ error: "Thiếu MOCK_SKILL_DRIVE_EXAMS_FOLDER_ID" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: exam, error } = await admin
    .from("mock_skill_exam_defs")
    .select("id, slug, title, description, content_public")
    .eq("id", id)
    .maybeSingle();
  if (error || !exam) {
    return NextResponse.json({ error: "Không tìm thấy đề" }, { status: 404 });
  }
  if (!exam.content_public) {
    return NextResponse.json({ error: "Đề không có content_public để chuyển" }, { status: 400 });
  }

  const filename = `exam-${exam.slug}.json`;
  const fileId = await uploadDriveJson(examsFolderId, filename, exam.content_public);
  const fileUrl = driveFileWebViewUrl(fileId);

  const { error: upErr } = await admin
    .from("mock_skill_exam_defs")
    .update({
      content_drive_file_id: fileId,
      content_drive_url: fileUrl,
      content_public: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fileId, fileUrl });
}
