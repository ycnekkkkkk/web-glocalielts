import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MockSkillContentPublic } from "@/lib/mock-skill/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const caller = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await caller.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await caller
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return user;
}

const emptyContent: MockSkillContentPublic = {
  version: 1,
  listening: { title: "IELTS Listening Test", blocks: [], questions: [] },
  reading: { title: "IELTS Academic Reading Test", blocks: [], questions: [] },
  speaking: { title: "IELTS Speaking Test", blocks: [], prompt: "" },
  writing: { title: "IELTS Writing Test", blocks: [], prompt: "", minWords: 250 },
};

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { title?: string; slug?: string; description?: string };
  try {
    body = (await request.json()) as { title?: string; slug?: string; description?: string };
  } catch {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const { title, slug, description } = body;
  if (!title?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: "Thiếu title hoặc slug" }, { status: 400 });
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug.trim())) {
    return NextResponse.json(
      { error: "Slug chỉ được dùng chữ thường, số và dấu gạch ngang" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mock_skill_exam_defs")
    .insert({
      title: title.trim(),
      slug: slug.trim(),
      description: description?.trim() || null,
      is_active: false,
      content_public: emptyContent as unknown as Record<string, unknown>,
    })
    .select("id, slug")
    .single();

  if (error) {
    const msg =
      error.code === "23505"
        ? "Slug này đã tồn tại, vui lòng chọn slug khác"
        : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, slug: data.slug });
}
