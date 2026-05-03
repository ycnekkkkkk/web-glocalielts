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

type Params = { params: Promise<{ courseId: string; userId: string }> };

// GET — admin lấy messages của một user cụ thể trong một course
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { courseId, userId } = await params;
    const supabase = await createServerSupabaseClient();
    const admin = await requireAdmin(supabase);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("course_messages")
      .select("id,sender_id,sender_role,content,created_at")
      .eq("course_id", courseId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — admin gửi reply cho user
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { courseId, userId } = await params;
    const supabase = await createServerSupabaseClient();
    const admin = await requireAdmin(supabase);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { content } = await req.json() as { content: string };
    if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

    const { data, error } = await supabase
      .from("course_messages")
      .insert({
        course_id: courseId,
        user_id: userId,
        sender_id: admin.id,
        sender_role: "admin",
        content: content.trim(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Tạo notification cho user
    const { data: course } = await supabase
      .from("public_courses")
      .select("title, slug")
      .eq("id", courseId)
      .maybeSingle();

    if (course) {
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Tin nhắn mới từ Admin",
        content: `Admin đã trả lời bạn trong khóa học "${course.title}": ${content.trim()}`,
        link_url: `/student/online-courses/${course.slug}`,
      });
    }

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
