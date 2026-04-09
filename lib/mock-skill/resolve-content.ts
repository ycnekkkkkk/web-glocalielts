import { readDriveJson } from "@/lib/google/drive";
import type { MockSkillContentPublic } from "./types";

export type MockSkillExamRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_active: boolean;
  content_public: Record<string, unknown> | null;
  content_drive_file_id: string | null;
  content_drive_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function resolveExamContentPublic(
  exam: Pick<MockSkillExamRecord, "content_public" | "content_drive_file_id">
): Promise<MockSkillContentPublic | null> {
  if (exam.content_drive_file_id) {
    try {
      return await readDriveJson<MockSkillContentPublic>(exam.content_drive_file_id);
    } catch (e) {
      console.error("[mock-skill] readDriveJson failed:", e);
      return (exam.content_public as MockSkillContentPublic | null) || null;
    }
  }
  return (exam.content_public as MockSkillContentPublic | null) || null;
}
