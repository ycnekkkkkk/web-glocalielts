import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExamContentPublic } from "@/lib/mock-skill/resolve-content";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mock_skill_exam_defs")
    .select(
      "id, slug, title, description, is_active, content_public, content_drive_file_id, content_drive_url, created_at, updated_at"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Không tìm thấy đề hoặc đề đã tắt" }, { status: 404 });
  }

  const content = await resolveExamContentPublic(data);
  if (!content) {
    return NextResponse.json({ error: "Đề chưa có nội dung" }, { status: 500 });
  }

  return NextResponse.json({
    exam: {
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description,
      is_active: data.is_active,
      content_public: content,
      content_drive_file_id: data.content_drive_file_id,
      content_drive_url: data.content_drive_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  });
}
