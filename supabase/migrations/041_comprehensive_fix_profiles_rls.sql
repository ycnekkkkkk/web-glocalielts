-- Migration 041: Comprehensive fix for profiles RLS recursion
-- Root cause: Many profiles policies call get_my_role(), which queries profiles (with RLS enabled),
-- causing infinite recursion. This migration:
-- 1. Drops all problematic policies on profiles
-- 2. Recreates them with recursion-safe logic
-- 3. Properly recreates get_my_role() and get_my_name() with SECURITY DEFINER + SET ROLE
-- ============================================================

-- Step 1: Drop all existing profiles policies to start clean
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_org" ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
DROP POLICY IF EXISTS "academic_manager_profiles_view" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_academic_manager" ON profiles;

-- Step 2: Recreate get_my_role() with SECURITY DEFINER + SET ROLE
-- SECURITY DEFINER + SET ROLE = postgres bypasses RLS while preserving auth.uid()
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET role = postgres
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN COALESCE(v_role, 'student');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_name()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET role = postgres
AS $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT p.full_name INTO v_name
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN COALESCE(v_name, '');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION PUBLIC.get_my_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO postgres;
GRANT EXECUTE ON FUNCTION public.get_my_name() TO postgres;

-- Step 3: Recreate all profiles RLS policies using get_my_role() (now recursion-safe)
-- SELECT policies
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_authenticated" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (public.get_my_role() = 'admin');

CREATE POLICY "profiles_select_org" ON profiles
  FOR SELECT USING (public.get_my_role() = 'organization');

-- UPDATE policies
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (public.get_my_role() = 'admin');

-- INSERT policies
CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

-- DELETE policies
CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (public.get_my_role() = 'admin');

-- Academic manager can update profiles of teachers and students in their classes
CREATE POLICY "profiles_update_academic_manager" ON profiles
  FOR UPDATE USING (
    public.get_my_role() = 'academic_manager'
    AND (
      -- Update teachers in their assigned classes
      (role = 'teacher' AND EXISTS (
        SELECT 1 FROM academic_manager_class_assignments amca
        JOIN classes c ON c.id = amca.class_id
        WHERE amca.manager_user_id = auth.uid() AND c.teacher_id = profiles.id
      ))
      OR
      -- Update students enrolled in their classes
      (role = 'student' AND EXISTS (
        SELECT 1 FROM academic_manager_class_assignments amca
        JOIN enrollments e ON e.class_id = amca.class_id
        WHERE amca.manager_user_id = auth.uid() AND e.student_id = profiles.id
      ))
      OR
      -- Update their own profile
      id = auth.uid()
    )
  );
