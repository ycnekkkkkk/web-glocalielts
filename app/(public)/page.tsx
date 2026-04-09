import AgHomeV2Landing from "@/components/landing/AgHomeV2Landing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicCourse } from "@/types/database";

export default async function LandingPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("public_courses")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(24);

  return <AgHomeV2Landing courses={(data as PublicCourse[]) ?? []} />;
}
