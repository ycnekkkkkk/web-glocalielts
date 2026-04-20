-- Migration 046: Fix audit_logs INSERT and classes policies
-- ROOT CAUSE of 500: audit_trigger_fn() is SECURITY DEFINER but tries to INSERT
-- into audit_logs which has RLS enabled. The INSERT has no policy, causing cascade error.
-- Fix: Add INSERT policy for audit_logs (via service role or bypass)

-- Fix get_my_role to handle NULL safely
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, anon, postgres;

-- ROOT FIX: audit_logs needs an INSERT policy for authenticated users (triggers write as definer)
-- The audit_trigger_fn uses SECURITY DEFINER so auth.uid() works, but RLS still blocks INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_insert_trigger'
  ) THEN
    CREATE POLICY "audit_logs_insert_trigger" ON audit_logs
      FOR INSERT WITH CHECK (true);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Drop and recreate classes policies with IF NOT EXISTS guards
DROP POLICY IF EXISTS "classes_insert_academic_manager" ON classes;
DROP POLICY IF EXISTS "classes_insert_authenticated" ON classes;

-- Academic manager: insert class (allow null org_id, or match their org)
CREATE POLICY "classes_insert_academic_manager" ON classes
  FOR INSERT WITH CHECK (
    public.get_my_role() = 'academic_manager'
    AND (
      organization_id IS NULL
      OR organization_id = (
        SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

-- Any authenticated user: insert class (fallback)
CREATE POLICY "classes_insert_authenticated" ON classes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure SELECT policies exist for academic_manager
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'classes' AND policyname = 'classes_academic_manager_select'
  ) THEN
    CREATE POLICY "classes_academic_manager_select" ON classes
      FOR SELECT USING (
        public.get_my_role() = 'academic_manager'
        AND (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          OR id IN (
            SELECT class_id FROM public.academic_manager_class_assignments
            WHERE manager_user_id = auth.uid()
          )
        )
      );
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Also add UPDATE/DELETE policies for academic_manager on classes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'classes' AND policyname = 'classes_update_academic_manager'
  ) THEN
    CREATE POLICY "classes_update_academic_manager" ON classes
      FOR UPDATE USING (
        public.get_my_role() = 'academic_manager'
        AND (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          OR id IN (
            SELECT class_id FROM public.academic_manager_class_assignments
            WHERE manager_user_id = auth.uid()
          )
        )
      );
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
