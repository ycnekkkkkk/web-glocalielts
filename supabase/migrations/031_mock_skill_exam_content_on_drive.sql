-- ============================================================
-- Migration 031: Store mock exam content on Drive
-- Supabase keeps lightweight metadata/index only.
-- ============================================================

ALTER TABLE public.mock_skill_exam_defs
  ADD COLUMN IF NOT EXISTS content_drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS content_drive_url TEXT;

-- Allow clearing local content after migrated to Drive.
ALTER TABLE public.mock_skill_exam_defs
  ALTER COLUMN content_public DROP NOT NULL;
