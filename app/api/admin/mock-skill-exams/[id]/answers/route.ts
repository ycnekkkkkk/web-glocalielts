import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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

/** GET /api/admin/mock-skill-exams/[id]/answers — lấy đáp án */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("mock_skill_exam_answers")
    .select("answers")
    .eq("exam_id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ answers: data?.answers ?? { listening: {}, reading: {} } });
}

/** PUT /api/admin/mock-skill-exams/[id]/answers — lưu / cập nhật đáp án */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;

  let body: { listening?: Record<string, string>; reading?: Record<string, string> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const answers = {
    listening: body.listening ?? {},
    reading: body.reading ?? {},
  };

  const admin = createAdminClient();

  // Upsert — nếu chưa có thì insert, đã có thì update
  const { error } = await admin
    .from("mock_skill_exam_answers")
    .upsert(
      { exam_id: id, answers: answers as unknown as Record<string, unknown> },
      { onConflict: "exam_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
