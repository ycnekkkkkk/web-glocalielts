-- ============================================================
-- Migration 026: Mã định danh duy nhất để tránh trùng người
-- - profiles.profile_code: áp dụng cho tất cả role
-- - students.student_code: mã riêng cho học viên
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_code TEXT;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS student_code TEXT;

CREATE SEQUENCE IF NOT EXISTS public.profile_code_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS public.student_code_seq START 1001;

CREATE OR REPLACE FUNCTION public.next_profile_code(p_role TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix TEXT;
  v_no BIGINT;
BEGIN
  v_prefix := CASE p_role
    WHEN 'student' THEN 'STU'
    WHEN 'teacher' THEN 'TCH'
    WHEN 'academic_manager' THEN 'AMG'
    WHEN 'admin' THEN 'ADM'
    WHEN 'organization' THEN 'ORG'
    ELSE 'USR'
  END;
  v_no := nextval('public.profile_code_seq');
  RETURN v_prefix || '-' || LPAD(v_no::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_profile_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.profile_code IS NULL OR btrim(NEW.profile_code) = '' THEN
    NEW.profile_code := public.next_profile_code(NEW.role);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_set_code ON public.profiles;
CREATE TRIGGER trg_profiles_set_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_code();

CREATE OR REPLACE FUNCTION public.set_student_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_no BIGINT;
BEGIN
  IF NEW.student_code IS NULL OR btrim(NEW.student_code) = '' THEN
    v_no := nextval('public.student_code_seq');
    NEW.student_code := 'STU-' || LPAD(v_no::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_students_set_code ON public.students;
CREATE TRIGGER trg_students_set_code
BEFORE INSERT ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.set_student_code();

-- Backfill dữ liệu cũ
UPDATE public.profiles
SET profile_code = public.next_profile_code(role)
WHERE profile_code IS NULL OR btrim(profile_code) = '';

UPDATE public.students
SET student_code = 'STU-' || LPAD(nextval('public.student_code_seq')::TEXT, 6, '0')
WHERE student_code IS NULL OR btrim(student_code) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_profile_code_unique
  ON public.profiles(profile_code)
  WHERE profile_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_code_unique
  ON public.students(student_code)
  WHERE student_code IS NOT NULL;
