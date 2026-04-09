-- ============================================================
-- Migration 006: Fix RLS infinite recursion on classes/enrollments/students
-- Root cause: classes_student policy queries enrollments,
--             enrollments_teacher policy queries classes → infinite loop
-- Fix: use SECURITY DEFINER helper functions that bypass RLS
-- ============================================================

-- Helper: get class IDs the current student is enrolled in (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_enrolled_class_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(e.class_id), '{}')
  FROM enrollments e
  JOIN students s ON s.id = e.student_id
  WHERE s.profile_id = auth.uid();
$$;

-- Helper: get student IDs in classes taught by current teacher (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_teaching_student_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(e.student_id), '{}')
  FROM enrollments e
  JOIN classes c ON c.id = e.class_id
  WHERE c.teacher_id = auth.uid();
$$;

-- Helper: get enrollment class IDs for current teacher (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_teaching_class_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(id), '{}')
  FROM classes
  WHERE teacher_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_enrolled_class_ids()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_teaching_student_ids()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_teaching_class_ids()     TO authenticated;

-- ── Fix classes policies ─────────────────────────────────────
-- Drop the recursive policy and replace with SECURITY DEFINER helper
DROP POLICY IF EXISTS "classes_student" ON public.classes;
CREATE POLICY "classes_student" ON public.classes
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND id = ANY(public.get_my_enrolled_class_ids())
  );

-- ── Fix enrollments policies ─────────────────────────────────
-- Drop the recursive policy and replace with SECURITY DEFINER helper
DROP POLICY IF EXISTS "enrollments_teacher" ON public.enrollments;
CREATE POLICY "enrollments_teacher" ON public.enrollments
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND class_id = ANY(public.get_my_teaching_class_ids())
  );

-- ── Fix students policies ────────────────────────────────────
-- students_teacher queries enrollments+classes, same recursion risk
DROP POLICY IF EXISTS "students_teacher" ON public.students;
CREATE POLICY "students_teacher" ON public.students
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND id = ANY(public.get_my_teaching_student_ids())
  );
