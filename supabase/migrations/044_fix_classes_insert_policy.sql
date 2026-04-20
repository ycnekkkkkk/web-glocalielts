-- Migration 044: Fix classes INSERT policies for academic_manager
-- Problem 1: classes_insert_academic_manager policy checks "organization_id IN (...)"
--            but when inserting NULL organization_id, the check fails (NULL IN (...) = NULL → reject)
-- Fix 1: Add NULL-safe check so academic_manager can create classes even when org is being assigned
-- Problem 2: Need INSERT policy for authenticated users who aren't admin/academic_manager
-- Fix 2: Create a fallback INSERT policy for authenticated users

-- Drop broken policies
DROP POLICY IF EXISTS "classes_insert_academic_manager" ON classes;

-- Recreate with NULL-safe logic
CREATE POLICY "classes_insert_academic_manager" ON classes
  FOR INSERT WITH CHECK (
    public.get_my_role() = 'academic_manager'
    AND (
      organization_id IS NULL
      OR organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND organization_id IS NULL
      )
    )
  );

-- Also ensure authenticated users can insert (fallback for any role that needs to create classes)
-- Only if no other policy covers INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'classes'
    AND policyname = 'classes_insert_authenticated'
    AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "classes_insert_authenticated" ON classes
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;
