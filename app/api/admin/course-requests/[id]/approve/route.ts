import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if ((profile as { role: string } | null)?.role !== "admin") return null;
  return authData.user;
}

// POST /api/admin/course-requests/[id]/approve
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const admin = await requireAdmin(supabase);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { admin_note } = (await req.json().catch(() => ({}))) as { admin_note?: string };

    // Lấy request để biết course_id và user_id
    const { data: reqRow, error: fetchErr } = await supabase
      .from("course_purchase_requests")
      .select("id,course_id,user_id,status,course_title")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const row = reqRow as { id: string; course_id: string; user_id: string; status: string; course_title: string | null };

    // Update status → approved
    const { error: updateErr } = await supabase
      .from("course_purchase_requests")
      .update({ status: "approved", admin_note: admin_note ?? null, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // Grant course access
    const { error: grantErr } = await supabase
      .from("public_course_access")
      .upsert(
        { course_id: row.course_id, user_id: row.user_id, granted_by: admin.id },
        { onConflict: "course_id,user_id" }
      );

    if (grantErr) return NextResponse.json({ error: grantErr.message }, { status: 500 });

    const { data: course } = await supabase
      .from("public_courses")
      .select("slug")
      .eq("id", row.course_id)
      .maybeSingle();

    await supabase.from("notifications").insert({
      user_id: row.user_id,
      title: "Yêu cầu mua khóa học được duyệt",
      content: `Yêu cầu mua khóa học "${row.course_title}" của bạn đã được duyệt. Bạn có thể vào học ngay bây giờ.${admin_note ? ` Lời nhắn: ${admin_note}` : ""}`,
      link_url: course ? `/student/online-courses/${course.slug}` : undefined,
    });

    if (admin_note && admin_note.trim()) {
      await supabase.from("course_messages").insert({
        course_id: row.course_id,
        user_id: row.user_id,
        sender_id: admin.id,
        sender_role: "admin",
        content: `[ĐÃ DUYỆT KHÓA HỌC] ${admin_note.trim()}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
