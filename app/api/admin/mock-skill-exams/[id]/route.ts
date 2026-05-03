import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveExamContentPublic } from "@/lib/mock-skill/resolve-content";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const caller = await createServerSupabaseClient();
  const {
    data: { user },
    error: authErr,
  } = await caller.auth.getUser();
  if (authErr || !user) return null;
  const { data: profile } = await caller.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

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

  return NextResponse.json({
    exam: {
      ...data,
      content_public: content,
    },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  // Build update payload — only allow safe fields
  const update: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim();
  if (typeof body.slug === "string" && body.slug.trim()) {
    if (!/^[a-z0-9-]+$/.test(body.slug.trim())) {
      return NextResponse.json(
        { error: "Slug chỉ được dùng chữ thường, số và dấu gạch ngang" },
        { status: 400 }
      );
    }
    update.slug = body.slug.trim();
  }
  if ("description" in body) update.description = body.description ?? null;
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if (body.content_public !== undefined) update.content_public = body.content_public;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Không có trường nào được cập nhật" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("mock_skill_exam_defs")
    .update(update)
    .eq("id", id);

  if (error) {
    const msg = error.code === "23505" ? "Slug đã tồn tại" : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

