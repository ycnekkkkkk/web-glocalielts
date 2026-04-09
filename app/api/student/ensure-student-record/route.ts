import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Đảm bảo mỗi tài khoản có role student đều có bản ghi public.students
 * (Google OAuth không đi qua flow tạo học viên thủ công trên admin).
 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .single();

    if (profErr || !profile || profile.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("students")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({ ok: true, created: false });
    }

    const email = (user.email || profile.email || "").trim().toLowerCase();
    const fullName = (profile.full_name || email || "Học viên").trim();

    if (email) {
      const { data: orphan } = await admin
        .from("students")
        .select("id")
        .eq("email", email)
        .is("profile_id", null)
        .maybeSingle();

      if (orphan?.id) {
        const { error: upErr } = await admin
          .from("students")
          .update({
            profile_id: user.id,
            full_name: fullName,
            email,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orphan.id);
        if (upErr) throw upErr;
        return NextResponse.json({ ok: true, created: false, linked: true });
      }
    }

    const { data: org } = await admin.from("organizations").select("id").eq("slug", "glocal-ielts").maybeSingle();

    const { error: insErr } = await admin.from("students").insert({
      organization_id: org?.id ?? null,
      profile_id: user.id,
      full_name: fullName,
      email: email || null,
    });

    if (insErr) throw insErr;
    return NextResponse.json({ ok: true, created: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
