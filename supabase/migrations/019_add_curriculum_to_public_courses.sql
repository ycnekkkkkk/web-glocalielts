-- ============================================================
-- Migration 019: Add curriculum JSON to public_courses
-- ============================================================

ALTER TABLE public.public_courses
  ADD COLUMN IF NOT EXISTS curriculum JSONB DEFAULT '[]'::jsonb;
