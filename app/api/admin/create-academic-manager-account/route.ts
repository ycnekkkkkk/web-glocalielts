import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    const { email, password, fullName } = await request.json();
    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: { full_name: fullName.trim(), role: "academic_manager" },
    });
    if (createErr) throw createErr;

    // Ensure profile is created with correct role (trigger should do it, but belt+suspenders)
    if (newUser.user) {
      await supabase
        .from("profiles")
        .upsert({
          id: newUser.user.id,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role: "academic_manager",
        }, { onConflict: "id" });
    }

    return NextResponse.json({ success: true, userId: newUser.user?.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Có lỗi xảy ra" },
      { status: 500 }
    );
  }
}
