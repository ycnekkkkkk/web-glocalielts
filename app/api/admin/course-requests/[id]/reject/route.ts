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

// POST /api/admin/course-requests/[id]/reject
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const admin = await requireAdmin(supabase);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { admin_note } = (await req.json().catch(() => ({}))) as { admin_note?: string };

    const { data: reqRow, error: fetchErr } = await supabase
      .from("course_purchase_requests")
      .select("course_id,user_id,course_title")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const row = reqRow as { course_id: string; user_id: string; course_title: string | null };

    const { error } = await supabase
      .from("course_purchase_requests")
      .update({ status: "rejected", admin_note: admin_note ?? null, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: course } = await supabase
      .from("public_courses")
      .select("slug")
      .eq("id", row.course_id)
      .maybeSingle();

    await supabase.from("notifications").insert({
      user_id: row.user_id,
      title: "Yêu cầu mua khóa học bị từ chối",
      content: `Yêu cầu đăng ký khóa học "${row.course_title}" của bạn đã bị từ chối.${admin_note ? ` Lý do: ${admin_note}` : " Vui lòng liên hệ Admin để biết thêm chi tiết."}`,
      link_url: course ? `/student/online-courses/${course.slug}` : undefined,
    });

    if (admin_note && admin_note.trim()) {
      await supabase.from("course_messages").insert({
        course_id: row.course_id,
        user_id: row.user_id,
        sender_id: admin.id,
        sender_role: "admin",
        content: `[TỪ CHỐI KHÓA HỌC] ${admin_note.trim()}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
