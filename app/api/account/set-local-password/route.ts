import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fullName, phone, password } = await request.json();
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const { error: passErr } = await admin.auth.admin.updateUserById(user.id, {
      password: password.trim(),
    });
    if (passErr) throw passErr;

    const updates: { full_name?: string; has_local_password: boolean; updated_at: string } = {
      has_local_password: true,
      updated_at: new Date().toISOString(),
    };
    if (typeof fullName === "string" && fullName.trim()) {
      updates.full_name = fullName.trim();
    }

    const { error: profileErr } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    if (profileErr) throw profileErr;

    if (profile?.role === "student") {
      const studentUpdates: {
        full_name?: string;
        phone?: string;
        email?: string;
        updated_at: string;
      } = { updated_at: new Date().toISOString() };

      if (typeof fullName === "string" && fullName.trim()) {
        studentUpdates.full_name = fullName.trim();
      }
      if (typeof phone === "string" && phone.trim()) {
        studentUpdates.phone = phone.trim();
      }
      if (user.email) {
        studentUpdates.email = user.email.trim().toLowerCase();
      }

      await admin
        .from("students")
        .update(studentUpdates)
        .eq("profile_id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Có lỗi xảy ra" },
      { status: 500 }
    );
  }
}
