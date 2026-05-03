import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/student/course-requests/[courseId] — lấy trạng thái request của user
export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ data: null });

    const { data } = await supabase
      .from("course_purchase_requests")
      .select("id,status,admin_note,created_at,updated_at")
      .eq("course_id", courseId)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
