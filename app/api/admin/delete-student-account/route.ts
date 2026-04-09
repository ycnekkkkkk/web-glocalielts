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

    const { studentId } = await request.json();
    if (!studentId || typeof studentId !== "string") {
      return NextResponse.json({ error: "Thiếu studentId" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: student, error: studentErr } = await supabase
      .from("students")
      .select("id, profile_id")
      .eq("id", studentId)
      .maybeSingle();
    if (studentErr) throw studentErr;
    if (!student) {
      return NextResponse.json({ error: "Không tìm thấy học viên" }, { status: 404 });
    }

    // Delete app-level student profile first (removes FK blocker to auth.users).
    const { error: delStudentErr } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId);
    if (delStudentErr) throw delStudentErr;

    let authDeleted = false;
    if (student.profile_id) {
      const { error: delUserErr } = await supabase.auth.admin.deleteUser(student.profile_id);
      if (delUserErr) {
        return NextResponse.json(
          {
            error: "Đã xóa hồ sơ học viên nhưng không xóa được tài khoản đăng nhập.",
            details: delUserErr.message,
          },
          { status: 500 }
        );
      }
      authDeleted = true;
    }

    return NextResponse.json({ success: true, authDeleted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Có lỗi xảy ra" },
      { status: 500 }
    );
  }
}
