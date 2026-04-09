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

    const { email, password, fullName } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedName = String(fullName || "").trim();
    const normalizedPassword = String(password || "").trim();

    if (!normalizedEmail || !normalizedName || !normalizedPassword) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }
    if (normalizedPassword.length < 8) {
      return NextResponse.json({ error: "Mật khẩu tối thiểu 8 ký tự" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: normalizedPassword,
      email_confirm: true,
      user_metadata: { full_name: normalizedName, role: "admin" },
    });
    if (createErr) throw createErr;

    if (created.user) {
      const { error: upsertErr } = await supabase.from("profiles").upsert(
        {
          id: created.user.id,
          email: normalizedEmail,
          full_name: normalizedName,
          role: "admin",
        },
        { onConflict: "id" }
      );
      if (upsertErr) throw upsertErr;
    }

    return NextResponse.json({ success: true, userId: created.user?.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Có lỗi xảy ra" }, { status: 500 });
  }
}
