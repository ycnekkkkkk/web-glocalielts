import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const KEEP_SLUGS = [
  "pronunciation",
  "ielts-speaking",
  "ielts-mentorship",
  "ielts-rocket",
  "a-plus-teacher",
  "bi-kip-hoc-sinh-luoi",
  "yearly-reflection",
  "tu-duy-lam-it-duoc-nhieu",
  "series-training-intern",
];

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) throw new Error("Missing Supabase env vars");

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const inList = `(${KEEP_SLUGS.map((s) => `"${s}"`).join(",")})`;
  const { error: deleteError } = await supabase.from("public_courses").delete().not("slug", "in", inList);
  if (deleteError) throw deleteError;

  const { data, error: readError } = await supabase.from("public_courses").select("slug").order("slug");
  if (readError) throw readError;

  console.log(`Remaining courses: ${data.length}`);
  for (const row of data) console.log(`- ${row.slug}`);
}

main().catch((e) => {
  console.error("Delete failed:", e.message);
  process.exit(1);
});
