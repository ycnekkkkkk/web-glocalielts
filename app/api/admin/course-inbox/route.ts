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

// GET /api/admin/course-inbox
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await requireAdmin(supabase);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("admin_course_inbox_view")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
