import { Readable } from "node:stream";
import { google } from "googleapis";

/** Scope khi xin refresh token (phải khớp lúc bạn authorize) */
export const GOOGLE_DRIVE_OAUTH_SCOPE = "https://www.googleapis.com/auth/drive";

function getClientSecret(): string | null {
  return (
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_SECRET?.trim() ||
    null
  );
}

/** Thư mục gốc trên Drive (đề bài / bài nộp tạo folder con bên trong) */
export function getMockSkillDriveParentFolderId(): string | null {
  const a = process.env.MOCK_SKILL_DRIVE_PARENT_FOLDER_ID?.trim();
  const b = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  return a || b || null;
}

/** Folder chứa JSON định nghĩa đề thi thử */
export function getMockSkillDriveExamsFolderId(): string | null {
  return process.env.MOCK_SKILL_DRIVE_EXAMS_FOLDER_ID?.trim() || getMockSkillDriveParentFolderId();
}

/**
 * OAuth refresh: Client ID + Secret + Refresh token + thư mục gốc.
 * Redirect URI phải trùng bước bạn dùng để lấy refresh token (OAuth Playground → mặc định bên dưới).
 */
export function isDriveConfigured(): boolean {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = getClientSecret();
  const refresh = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  const parent = getMockSkillDriveParentFolderId();
  return Boolean(id && secret && refresh && parent);
}

/** Redirect mặc định khi token lấy qua OAuth 2.0 Playground + “Use your own OAuth credentials” */
export function getOAuthRedirectUri(): string {
  return (
    process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ||
    "https://developers.google.com/oauthplayground"
  );
}

export function getDriveClient() {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = getClientSecret();
  const refresh = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  if (!id || !secret || !refresh) return null;

  const oauth2Client = new google.auth.OAuth2(id, secret, getOAuthRedirectUri());
  oauth2Client.setCredentials({ refresh_token: refresh });
  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function createDriveFolder(parentId: string, name: string): Promise<string> {
  const drive = getDriveClient();
  if (!drive) throw new Error("Drive client not configured");
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  const id = res.data.id;
  if (!id) throw new Error("Drive folder create returned no id");
  return id;
}

export async function uploadDriveFile(
  folderId: string,
  name: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const drive = getDriveClient();
  if (!drive) throw new Error("Drive client not configured");
  const res = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id",
    supportsAllDrives: true,
  });
  const id = res.data.id;
  if (!id) throw new Error("Drive upload returned no id");
  return id;
}

export async function uploadDriveJson(
  folderId: string,
  name: string,
  payload: unknown
): Promise<string> {
  const data = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  return uploadDriveFile(folderId, name, "application/json", data);
}

export async function readDriveJson<T = unknown>(fileId: string): Promise<T> {
  const drive = getDriveClient();
  if (!drive) throw new Error("Drive client not configured");
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "text" }
  );
  const raw = String(res.data || "");
  return JSON.parse(raw) as T;
}

export function driveFolderWebViewUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export function driveFileWebViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/** Đưa file/folder vào thùng rác Drive (best-effort, không throw). */
export async function trashDriveFile(fileId: string): Promise<void> {
  const drive = getDriveClient();
  if (!drive) return;
  try {
    await drive.files.update({
      fileId,
      requestBody: { trashed: true },
      supportsAllDrives: true,
    });
  } catch (e) {
    console.warn("[drive] trashDriveFile failed:", fileId, e);
  }
}

/** Download file content from Drive as Buffer (for audio grading etc.) */
export async function getDriveFileContent(fileId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const drive = getDriveClient();
  if (!drive) throw new Error("Drive client not configured");

  // Get metadata for mimeType
  const meta = await drive.files.get({ fileId, fields: "mimeType", supportsAllDrives: true });
  const mimeType = meta.data.mimeType || "application/octet-stream";

  // Download content
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  const buffer = Buffer.from(res.data as ArrayBuffer);
  return { buffer, mimeType };
}
