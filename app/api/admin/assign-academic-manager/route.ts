import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST: gán manager cho lớp
export async function POST(request: Request) {
  try {
    const caller = await createServerSupabaseClient();
    const { data: { user: callerUser }, error: authErr } = await caller.auth.getUser();
    if (authErr || !callerUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: callerProfile } = await caller
      .from("profiles")
      .select("role")
      .eq("id", callerUser.id)
      .single();
    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { class_id, manager_user_id } = await request.json();
    if (!class_id || !manager_user_id) {
      return NextResponse.json({ error: "Thiếu class_id hoặc manager_user_id" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error: insertErr } = await supabase
      .from("academic_manager_class_assignments")
      .upsert({ class_id, manager_user_id, assigned_by: callerUser.id }, { onConflict: "class_id,manager_user_id" });
    if (insertErr) throw insertErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Có lỗi xảy ra" },
      { status: 500 }
    );
  }
}

// DELETE: gỡ gán manager khỏi lớp
export async function DELETE(request: Request) {
  try {
    const caller = await createServerSupabaseClient();
    const { data: { user: callerUser }, error: authErr } = await caller.auth.getUser();
    if (authErr || !callerUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: callerProfile } = await caller
      .from("profiles")
      .select("role")
      .eq("id", callerUser.id)
      .single();
    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { class_id, manager_user_id } = await request.json();
    if (!class_id || !manager_user_id) {
      return NextResponse.json({ error: "Thiếu class_id hoặc manager_user_id" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error: delErr } = await supabase
      .from("academic_manager_class_assignments")
      .delete()
      .eq("class_id", class_id)
      .eq("manager_user_id", manager_user_id);
    if (delErr) throw delErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Có lỗi xảy ra" },
      { status: 500 }
    );
  }
}
