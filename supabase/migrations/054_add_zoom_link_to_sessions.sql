-- Migration 054: Add zoom_link column to sessions
-- Purpose: Admin/HV can set a default zoom link when creating a class,
-- and it auto-fills each session. Teachers & academic managers can edit per session.

-- Add zoom_link column to sessions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS zoom_link TEXT;
