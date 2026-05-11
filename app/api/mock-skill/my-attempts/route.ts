import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/mock-skill/my-attempts
 * Trả về số lần thi của user hiện tại cho từng exam.
 * Response: { counts: Record<examId, number> }
 */
export async function GET() {
  const serverSb = await createServerSupabaseClient();
  const { data: { user } } = await serverSb.auth.getUser();

  if (!user) {
    return NextResponse.json({ counts: {} });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mock_skill_submissions")
    .select("exam_id")
    .eq("auth_user_id", user.id);

  if (error || !data) {
    return NextResponse.json({ counts: {} });
  }

  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.exam_id) {
      counts[row.exam_id] = (counts[row.exam_id] || 0) + 1;
    }
  }

  return NextResponse.json({ counts });
}
