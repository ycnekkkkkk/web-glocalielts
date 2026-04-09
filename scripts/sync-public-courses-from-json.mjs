import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

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

function toCurriculum(lessons) {
  if (!Array.isArray(lessons)) return [];
  return lessons.map((lesson) => ({
    name: String(lesson?.name || "").trim(),
    topics: Array.isArray(lesson?.topics)
      ? lesson.topics.map((topic) => ({
          title: String(topic?.title || "").trim(),
          video: topic?.video ? String(topic.video) : null,
        }))
      : [],
    assignments: Array.isArray(lesson?.assignments)
      ? lesson.assignments.map((x) => String(x))
      : [],
  }));
}

async function main() {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const coursesDir = path.resolve(process.cwd(), "khoa_hoc");
  const upsertRows = [];
  const keepSlugs = [];

  for (const [filename, slug] of Object.entries(JSON_TO_SLUG)) {
    const filePath = path.join(coursesDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing expected course file: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const item = Array.isArray(parsed) ? parsed[0] : parsed;

    upsertRows.push({
      slug,
      title: String(item?.title || slug),
      short_description: item?.description ? String(item.description).slice(0, 220) : null,
      description: item?.description ? String(item.description) : null,
      demo_video_url: item?.introVideo ? String(item.introVideo) : null,
      demo_video_source: item?.introVideo ? "youtube" : null,
      curriculum: toCurriculum(item?.lessons),
      price: Number(item?.price || 0),
      currency: "VND",
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    keepSlugs.push(slug);
  }

  const { error: upsertError } = await supabase
    .from("public_courses")
    .upsert(upsertRows, { onConflict: "slug" });
  if (upsertError) throw upsertError;

  const { data: allRows, error: readError } = await supabase
    .from("public_courses")
    .select("id,slug,status");
  if (readError) throw readError;

  const extras = (allRows || []).filter((row) => row?.slug && !keepSlugs.includes(row.slug));
  for (const row of extras) {
    const { error } = await supabase
      .from("public_courses")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw error;
  }

  console.log(`Synced courses: ${upsertRows.length}`);
  console.log(`Archived extra courses: ${extras.length}`);
  console.log("Done.");
}

main().catch((error) => {
  console.error("Sync failed:", error.message);
  process.exit(1);
});
