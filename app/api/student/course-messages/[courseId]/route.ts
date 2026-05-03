import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET — lấy messages của user cho course
export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("course_messages")
      .select("id,sender_id,sender_role,content,created_at")
      .eq("course_id", courseId)
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — user gửi message
export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content } = await req.json() as { content: string };
    if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

    const { data, error } = await supabase
      .from("course_messages")
      .insert({
        course_id: courseId,
        user_id: authData.user.id,
        sender_id: authData.user.id,
        sender_role: "user",
        content: content.trim(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
