-- ============================================================
-- Migration 020: Add editable display fields for public courses
-- ============================================================

ALTER TABLE public.public_courses
  ADD COLUMN IF NOT EXISTS objective_text TEXT,
  ADD COLUMN IF NOT EXISTS duration_text TEXT,
  ADD COLUMN IF NOT EXISTS certificate_text TEXT;
