import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const caller = await createServerSupabaseClient();
    const {
      data: { user: callerUser },
      error: authErr,
    } = await caller.auth.getUser();
    if (authErr || !callerUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: callerProfile } = await caller.from("profiles").select("role").eq("id", callerUser.id).single();
    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { adminId } = await request.json();
    if (!adminId || typeof adminId !== "string") {
      return NextResponse.json({ error: "Thiếu adminId" }, { status: 400 });
    }
    if (adminId === callerUser.id) {
      return NextResponse.json({ error: "Không thể tự thu hồi quyền admin của chính mình" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { count, error: countErr } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw countErr;
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "Hệ thống phải luôn có ít nhất 1 admin" }, { status: 400 });
    }

    const { error: updateErr } = await supabase.from("profiles").update({ role: "student" }).eq("id", adminId);
    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Có lỗi xảy ra" }, { status: 500 });
  }
}
