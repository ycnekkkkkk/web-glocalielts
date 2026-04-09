import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveExamContentPublic } from "@/lib/mock-skill/resolve-content";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
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

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mock_skill_exam_defs")
    .select(
      "id, slug, title, description, is_active, content_public, content_drive_file_id, content_drive_url, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Không tìm thấy đề" }, { status: 404 });
  }

  const content = await resolveExamContentPublic(data);
  if (!content) {
    return NextResponse.json({ error: "Đề chưa có nội dung" }, { status: 500 });
  }

  return NextResponse.json({
    exam: {
      ...data,
      content_public: content,
    },
  });
}
