-- Migration 050: Fix classes SELECT for RETURNING clause
-- When .select().single() is used, PostgREST runs INSERT...RETURNING *.
-- If no SELECT policy passes for the inserted row, the whole request returns 500.
-- Fix: Add an explicit "allow all authenticated" SELECT policy on classes

-- Drop existing SELECT policies first
DROP POLICY IF EXISTS "classes_select_all_authenticated" ON classes;
DROP POLICY IF EXISTS "classes_select_own" ON classes;
DROP POLICY IF EXISTS "classes_select_admin" ON classes;
DROP POLICY IF EXISTS "classes_select_org" ON classes;
DROP POLICY IF EXISTS "classes_select_own_teacher" ON classes;
DROP POLICY IF EXISTS "classes_academic_manager_select" ON classes;

-- Allow ANY authenticated user to SELECT all classes (needed for RETURNING clause)
CREATE POLICY "classes_select_all_authenticated" ON classes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Keep admin-only INSERT (authenticated users can create, but only admin can manage others)
-- Already set up in migration 048

-- Also fix get_my_role: it needs row_security = off inside the function body
-- so that it bypasses RLS even when called from WITH CHECK clauses
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, anon, postgres;

CREATE OR REPLACE FUNCTION public.get_my_name()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT full_name FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.get_my_name() TO authenticated, anon, postgres;
