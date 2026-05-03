import AgHomeV2Landing from "@/components/landing/AgHomeV2Landing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDashboardForRole } from "@/lib/auth/rbac";
import { resolveUserRole } from "@/lib/auth/resolve-user-role";
import { redirect } from "next/navigation";
import type { PublicCourse } from "@/types/database";

export default async function LandingPage() {
  const supabase = await createServerSupabaseClient();
  
  // Check if user is already logged in
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (authUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .maybeSingle();
    
    const role = resolveUserRole(profile?.role, authUser);
    return redirect(getDashboardForRole(role));
  }

  const { data } = await supabase
    .from("public_courses")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(24);

  return <AgHomeV2Landing courses={(data as PublicCourse[]) ?? []} />;
}
