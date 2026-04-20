-- Migration 042: EMERGENCY RESTORE - Fix broken RLS after migration 041
-- Root cause: SET role = postgres does not work reliably in Supabase
-- Fix: Use SECURITY DEFINER with direct SQL bypass, no SET ROLE

-- Step 1: Drop all broken policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_org" ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_academic_manager" ON profiles;

-- Step 2: Fix get_my_role() and get_my_name()
-- SECURITY DEFINER alone bypasses RLS. DO NOT use SET role.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_my_name()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name FROM public.profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, anon, postgres;
GRANT EXECUTE ON FUNCTION public.get_my_name() TO authenticated, anon, postgres;

-- Step 3: Recreate minimal profiles policies
-- This is the CRITICAL policy that allows EVERY authenticated user to read profiles
-- Without this, get_my_role() fails and cascades to all tables
DO $$
BEGIN
  CREATE POLICY "profiles_select_all_authenticated" ON profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "profiles_select_admin" ON profiles
    FOR SELECT USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "profiles_select_org" ON profiles
    FOR SELECT USING (public.get_my_role() = 'organization');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "profiles_update_admin" ON profiles
    FOR UPDATE USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "profiles_insert_admin" ON profiles
    FOR INSERT WITH CHECK (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "profiles_delete_admin" ON profiles
    FOR DELETE USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "profiles_update_academic_manager" ON profiles
    FOR UPDATE USING (
      public.get_my_role() = 'academic_manager'
      AND id IN (
        SELECT teacher_id FROM classes WHERE id IN (
          SELECT class_id FROM academic_manager_class_assignments WHERE manager_user_id = auth.uid()
        )
        UNION
        SELECT student_id FROM enrollments WHERE class_id IN (
          SELECT class_id FROM academic_manager_class_assignments WHERE manager_user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
