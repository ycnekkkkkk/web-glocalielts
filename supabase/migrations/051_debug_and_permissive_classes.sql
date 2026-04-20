-- Migration 051: Make classes table fully permissive for any authenticated user
-- Fixes: INSERT/SELECT policies so class creation works
-- Run this AFTER migrations 050

-- First, drop existing permissive policies (in case 050 created some)
DROP POLICY IF EXISTS "classes_all_authenticated" ON classes;
DROP POLICY IF EXISTS "classes_select_all_authenticated" ON classes;

-- Recreate: ANY authenticated user can do ALL operations on classes
CREATE POLICY "classes_all_authenticated" ON classes
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Also make sure profiles and students have SELECT policies so joins work
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
CREATE POLICY "profiles_select_all_authenticated" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "students_select_all_authenticated" ON students;
CREATE POLICY "students_select_all_authenticated" ON students
  FOR SELECT USING (auth.uid() IS NOT NULL);
