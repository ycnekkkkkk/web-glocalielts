-- ============================================================
-- Migration 018: Add demo video fields to public_courses
-- ============================================================

ALTER TABLE public.public_courses
  ADD COLUMN IF NOT EXISTS demo_video_url TEXT,
  ADD COLUMN IF NOT EXISTS demo_video_source TEXT;
