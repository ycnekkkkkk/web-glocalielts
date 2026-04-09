import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Verify caller is authenticated admin
    const caller = await createServerSupabaseClient();
    const { data: { user: callerUser }, error: authErr } = await caller.auth.getUser();
    if (authErr || !callerUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: callerProfile } = await caller.from("profiles").select("role").eq("id", callerUser.id).single();
    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, password, fullName, phone } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    // 1. Create auth user
    const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password.trim(),
      email_confirm: true,
      user_metadata: { full_name: cleanName, role: "student" },
    });

    if (authError) throw authError;
    const newUserId = newUser.user?.id;
    if (!newUserId) throw new Error("Không tạo được tài khoản");

    // 2. Get default organization id
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", "glocal-ielts")
      .maybeSingle();
    const orgId = org?.id ?? null;

    // 3. Link or create students record
    // Check if a students record already exists with this email
    const { data: existingStudent } = await supabase
      .from("students")
      .select("id, profile_id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingStudent) {
      // Link existing student record to new auth user
      await supabase
        .from("students")
        .update({ profile_id: newUserId })
        .eq("id", existingStudent.id);
    } else {
      // Try to match by full_name (may have been in legacy data without email)
      const { data: studentByName } = await supabase
        .from("students")
        .select("id, profile_id")
        .eq("full_name", cleanName)
        .is("profile_id", null)
        .maybeSingle();

      if (studentByName) {
        await supabase
          .from("students")
          .update({ profile_id: newUserId, email: cleanEmail })
          .eq("id", studentByName.id);
      } else if (orgId) {
        // Create a brand new students record
        await supabase.from("students").insert({
          organization_id: orgId,
          full_name: cleanName,
          email: cleanEmail,
          phone: phone?.trim() ?? null,
          profile_id: newUserId,
        });
      }
    }

    return NextResponse.json({ success: true, userId: newUserId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Có lỗi xảy ra" }, { status: 500 });
  }
}
