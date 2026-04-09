-- ============================================================
-- Migration 015: Fix infinite recursion on enrollments ↔ students
-- ============================================================
-- Root cause (migration 013):
--   Policy "students_academic_manager" contained
--     SELECT ... FROM public.enrollments e ...
--   Policy "enrollments_student" (002) contains
--     student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
--   PostgreSQL evaluates policies together → enrollments → students → enrollments → …
--
-- Fix: SECURITY DEFINER helpers that read enrollments/students without RLS.
-- Also ensure get_my_role / get_my_name bypass profiles RLS (same pattern as rls.sql).
-- ============================================================

-- ── Helpers: đọc students / enrollments mà không kích hoạt RLS lồng nhau ──

CREATE OR REPLACE FUNCTION public.get_my_enrolled_student_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(s.id), '{}')
  FROM public.students s
  WHERE s.profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_academic_manager_student_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT e.student_id), '{}')
  FROM public.enrollments e
  INNER JOIN public.academic_manager_class_assignments a
    ON a.class_id = e.class_id AND a.manager_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_enrolled_student_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_academic_manager_student_ids() TO authenticated;

-- Đảm bảo helper role/name luôn bypass RLS trên profiles (tránh đệ quy với profiles_admin_all)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_name()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_name() TO authenticated;

-- ── enrollments_student: không subquery trực tiếp bảng students qua RLS ──
DROP POLICY IF EXISTS "enrollments_student" ON public.enrollments;
CREATE POLICY "enrollments_student" ON public.enrollments
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND student_id = ANY(public.get_my_enrolled_student_ids())
  );

-- ── students_academic_manager: không subquery trực tiếp bảng enrollments qua RLS ──
DROP POLICY IF EXISTS "students_academic_manager" ON public.students;
CREATE POLICY "students_academic_manager" ON public.students
  FOR SELECT USING (
    public.get_my_role() = 'academic_manager'
    AND id = ANY(public.get_my_academic_manager_student_ids())
  );
