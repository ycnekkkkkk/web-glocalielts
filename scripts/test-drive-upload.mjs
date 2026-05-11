import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("dotenv").config({ path: ".env.local" });

const { google } = await import("googleapis");
const { Readable } = await import("stream");

const id = process.env.GOOGLE_CLIENT_ID?.trim();
const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const refresh = process.env.GOOGLE_REFRESH_TOKEN?.trim();
const parent = process.env.MOCK_SKILL_DRIVE_PARENT_FOLDER_ID?.trim() || process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();

console.log("Config:", { id: id?.slice(0,12)+"...", secretOk: !!secret, refreshOk: !!refresh, parent });

const oauth2 = new google.auth.OAuth2(id, secret, "https://developers.google.com/oauthplayground");
oauth2.setCredentials({ refresh_token: refresh });
const drive = google.drive({ version: "v3", auth: oauth2 });

try {
  // Test: tạo folder
  const folder = await drive.files.create({
    requestBody: { name: "TEST_UPLOAD_" + Date.now(), mimeType: "application/vnd.google-apps.folder", parents: [parent] },
    fields: "id",
    supportsAllDrives: true,
  });
  console.log("✓ Created folder:", folder.data.id);

  // Test: upload file text
  const file = await drive.files.create({
    requestBody: { name: "test.txt", parents: [folder.data.id] },
    media: { mimeType: "text/plain", body: Readable.from(Buffer.from("test speaking upload ok")) },
    fields: "id",
    supportsAllDrives: true,
  });
  console.log("✓ Uploaded file:", file.data.id);
  console.log("✓ Drive upload works correctly!");
} catch (err) {
  console.error("✗ Drive upload FAILED:");
  console.error(err?.message || err);
  if (err?.errors) console.error("Errors:", JSON.stringify(err.errors, null, 2));
}
