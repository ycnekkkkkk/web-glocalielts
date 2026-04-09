import { trashDriveFile } from "@/lib/google/drive";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await context.params;
  if (!submissionId?.trim()) {
    return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  }

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
  const { data: row } = await admin
    .from("mock_skill_submissions")
    .select("id, drive_folder_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Không tìm thấy bài nộp" }, { status: 404 });
  }

  const folderId = row.drive_folder_id as string | null;
  const { error: delErr } = await admin.from("mock_skill_submissions").delete().eq("id", submissionId);
  if (delErr) {
    console.error(delErr);
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  if (folderId) {
    void trashDriveFile(folderId);
  }

  return NextResponse.json({ ok: true });
}
