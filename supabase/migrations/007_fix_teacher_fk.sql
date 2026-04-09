-- ============================================================
-- Migration 007: Fix classes.teacher_id FK → public.profiles
-- ============================================================
-- Problem: classes.teacher_id originally references auth.users(id).
-- PostgREST cannot join classes → profiles using profiles!teacher_id
-- because no FK from classes → profiles exists.
-- Fix: re-point the FK to public.profiles(id) so PostgREST can
-- resolve the relationship and the useClasses hook query works.
-- profiles.id is always equal to auth.users.id (1-to-1), so this
-- is a safe no-data-change migration.
-- ============================================================

-- Drop old FK to auth.users
ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;

-- Add new FK to public.profiles
ALTER TABLE public.classes
  ADD CONSTRAINT classes_teacher_id_fkey
  FOREIGN KEY (teacher_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;
