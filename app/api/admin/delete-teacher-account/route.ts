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

    const { teacherId } = await request.json();
    if (!teacherId || typeof teacherId !== "string") {
      return NextResponse.json({ error: "Thiếu teacherId" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", teacherId)
      .maybeSingle();
    if (profileErr) throw profileErr;
    if (!profile) {
      return NextResponse.json({ error: "Không tìm thấy giáo viên" }, { status: 404 });
    }
    if (profile.role !== "teacher") {
      return NextResponse.json({ error: "Tài khoản này không phải giáo viên" }, { status: 400 });
    }

    const { error: delUserErr } = await supabase.auth.admin.deleteUser(teacherId);
    if (delUserErr) throw delUserErr;

    return NextResponse.json({ success: true, deletedTeacherId: teacherId, deletedTeacherName: profile.full_name });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Có lỗi xảy ra" }, { status: 500 });
  }
}
