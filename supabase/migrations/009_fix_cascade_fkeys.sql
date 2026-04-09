-- ============================================================
-- Migration 009: Add ON DELETE CASCADE to FK constraints
-- ============================================================
-- Problem: Three FKs were added in migration 002 without
-- ON DELETE CASCADE, so deleting a class (or session/student)
-- raises a FK violation error.
-- Fix: Drop + re-add each constraint with ON DELETE CASCADE.
-- ============================================================

-- 1. sessions.class_id → classes(id)
--    Delete sessions when a class is deleted.
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_class_id_fkey;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_class_id_fkey
  FOREIGN KEY (class_id)
  REFERENCES public.classes(id)
  ON DELETE CASCADE;

-- 2. session_attendance.session_id → sessions(id)
--    Delete attendance records when a session is deleted.
ALTER TABLE public.session_attendance
  DROP CONSTRAINT IF EXISTS session_attendance_session_id_fkey;

ALTER TABLE public.session_attendance
  ADD CONSTRAINT session_attendance_session_id_fkey
  FOREIGN KEY (session_id)
  REFERENCES public.sessions(id)
  ON DELETE CASCADE;

-- 3. session_attendance.student_id → students(id)
--    Delete attendance records when a student is removed.
ALTER TABLE public.session_attendance
  DROP CONSTRAINT IF EXISTS session_attendance_student_id_fkey;

ALTER TABLE public.session_attendance
  ADD CONSTRAINT session_attendance_student_id_fkey
  FOREIGN KEY (student_id)
  REFERENCES public.students(id)
  ON DELETE CASCADE;
