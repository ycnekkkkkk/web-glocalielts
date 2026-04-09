import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

dotenv.config({ path: ".env.local" });
dotenv.config();

function requiredEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing env: ${name}`);
  return v.trim();
}

function getDrive() {
  const id = requiredEnv("GOOGLE_CLIENT_ID");
  const secret = (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET || "").trim();
  const refresh = requiredEnv("GOOGLE_REFRESH_TOKEN");
  const redirect = (process.env.GOOGLE_OAUTH_REDIRECT_URI || "https://developers.google.com/oauthplayground").trim();
  if (!secret) throw new Error("Missing GOOGLE_CLIENT_SECRET (or GOOGLE_SECRET)");
  const oauth2 = new google.auth.OAuth2(id, secret, redirect);
  oauth2.setCredentials({ refresh_token: refresh });
  return google.drive({ version: "v3", auth: oauth2 });
}

async function uploadJson(drive, folderId, name, payload) {
  const { Readable } = await import("stream");
  const res = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: {
      mimeType: "application/json",
      body: Readable.from(Buffer.from(JSON.stringify(payload, null, 2), "utf8")),
    },
    fields: "id",
    supportsAllDrives: true,
  });
  return res.data.id;
}

async function main() {
  const supabase = createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const folderId = (process.env.MOCK_SKILL_DRIVE_EXAMS_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID || process.env.MOCK_SKILL_DRIVE_PARENT_FOLDER_ID || "").trim();
  if (!folderId) throw new Error("Missing MOCK_SKILL_DRIVE_EXAMS_FOLDER_ID or GOOGLE_DRIVE_FOLDER_ID");

  const drive = getDrive();

  const { data: exams, error } = await supabase
    .from("mock_skill_exam_defs")
    .select("id, slug, content_public, content_drive_file_id")
    .order("created_at");
  if (error) throw error;

  const candidates = (exams || []).filter((x) => !x.content_drive_file_id && x.content_public);
  console.log(`Found ${candidates.length} exams to migrate`);

  for (const exam of candidates) {
    const fileId = await uploadJson(drive, folderId, `exam-${exam.slug}.json`, exam.content_public);
    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
    const { error: upErr } = await supabase
      .from("mock_skill_exam_defs")
      .update({
        content_drive_file_id: fileId,
        content_drive_url: fileUrl,
        content_public: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", exam.id);
    if (upErr) throw upErr;
    console.log(`Migrated ${exam.slug} -> ${fileId}`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
