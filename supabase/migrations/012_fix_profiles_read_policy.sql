-- ============================================================
-- Migration 012: Allow authenticated users to read teacher profiles
-- ============================================================
-- The profiles RLS only allowed users to see their own profile,
-- or admins/org to see all. Teachers and students couldn't see
-- each other's profiles, so teacher names appeared blank on
-- student-facing pages.
--
-- Fix: allow any authenticated user to read profiles where
-- role = 'teacher' (needed to display teacher names in class
-- listings and course detail pages).
-- Also allow reading any profile by authenticated users since
-- names are non-sensitive and needed throughout the app.

DO $$ BEGIN
  CREATE POLICY "profiles_select_authenticated"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
