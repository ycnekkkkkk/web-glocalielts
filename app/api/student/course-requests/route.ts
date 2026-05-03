import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/student/course-requests — gửi yêu cầu mua khóa học
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { course_id, note } = body as { course_id: string; note?: string };
    if (!course_id) return NextResponse.json({ error: "course_id required" }, { status: 400 });

    // Lấy thông tin course và user
    const [{ data: course }, { data: profile }] = await Promise.all([
      supabase.from("public_courses").select("id,title").eq("id", course_id).maybeSingle(),
      supabase.from("profiles").select("full_name,email").eq("id", authData.user.id).maybeSingle(),
    ]);

    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("course_purchase_requests")
      .upsert(
        {
          course_id,
          user_id: authData.user.id,
          user_name: (profile as { full_name: string | null } | null)?.full_name ?? null,
          user_email: (profile as { email: string | null } | null)?.email ?? authData.user.email ?? null,
          course_title: (course as { title: string }).title,
          status: "pending",
          note: note ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "course_id,user_id" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Tự động đẩy note vào trong hệ thống chat để Admin dễ dàng theo dõi chung 1 luồng
    if (note && note.trim()) {
      await supabase.from("course_messages").insert({
        course_id,
        user_id: authData.user.id,
        sender_id: authData.user.id,
        sender_role: "user",
        content: `[YÊU CẦU MUA KHÓA HỌC] ${note.trim()}`,
      });
    }

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
