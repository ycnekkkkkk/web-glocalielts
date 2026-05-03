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

// GET /api/admin/course-requests — lấy tất cả requests
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await requireAdmin(supabase);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // pending | approved | rejected | all

    let query = supabase
      .from("course_purchase_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
