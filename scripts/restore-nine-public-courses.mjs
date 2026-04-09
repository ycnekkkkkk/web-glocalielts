import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const JSON_TO_SLUG = {
  "Pronunciation.json": "pronunciation",
  "IELTS_Speaking.json": "ielts-speaking",
  "IELTS_Mentorship.json": "ielts-mentorship",
  "IELTS_Rocket.json": "ielts-rocket",
  "A_Plus_Teacher.json": "a-plus-teacher",
  "Bi_Kip_Hoc_Sinh_Luoi.json": "bi-kip-hoc-sinh-luoi",
  "Yearly_Reflection.json": "yearly-reflection",
  "Tu_Duy_Lam_It_Duoc_Nhieu.json": "tu-duy-lam-it-duoc-nhieu",
  "Series_Training_Intern.json": "series-training-intern",
};

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) throw new Error("Missing Supabase env vars");
  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const dir = path.resolve(process.cwd(), "khoa_hoc");
  const rows = [];
  for (const [file, slug] of Object.entries(JSON_TO_SLUG)) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const parsed = JSON.parse(raw);
    const item = Array.isArray(parsed) ? parsed[0] : parsed;
    rows.push({
      slug,
      title: String(item?.title || slug),
      short_description: item?.description ? String(item.description).slice(0, 220) : null,
      description: item?.description ? String(item.description) : null,
      demo_video_url: item?.introVideo ? String(item.introVideo) : null,
      demo_video_source: item?.introVideo ? "youtube" : null,
      price: Number(item?.price || 0),
      currency: "VND",
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const { error } = await supabase.from("public_courses").upsert(rows, { onConflict: "slug" });
  if (error) throw error;
  const { data, error: verifyErr } = await supabase.from("public_courses").select("slug,status").order("slug");
  if (verifyErr) throw verifyErr;
  console.log(`Total courses: ${data.length}`);
  for (const row of data) console.log(`- ${row.slug} (${row.status})`);
}

main().catch((e) => {
  console.error("Restore failed:", e.message);
  process.exit(1);
});
