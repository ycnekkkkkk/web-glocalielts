-- ============================================================
-- Migration 014: Ensure admin has full access to all tables
-- Fixes: admin sessions page and students page showing no data
-- Root cause: admin SELECT policies for sessions/attendance/etc
-- were only in rls.sql (initial setup), not in migration files.
-- ============================================================

-- ── sessions ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "sessions_select_admin_org" ON public.sessions
    FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sessions_write_admin" ON public.sessions
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── session_attendance ────────────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "session_attendance_admin" ON public.session_attendance
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── session_class_evaluation ──────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "sess_class_eval_admin" ON public.session_class_evaluation
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── session_teacher_evaluation ────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "sess_teacher_eval_admin" ON public.session_teacher_evaluation
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── session_student_evaluation ────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "sess_student_eval_admin" ON public.session_student_evaluation
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── attendance_makeup ─────────────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "attendance_makeup_admin" ON public.attendance_makeup
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── invoices ──────────────────────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "invoices_admin" ON public.invoices
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── students ──────────────────────────────────────────────────
-- Admin already has students_write_admin (FOR ALL) from 002,
-- but add SELECT explicitly as safety net
DO $$ BEGIN
  CREATE POLICY "students_select_admin" ON public.students
    FOR SELECT USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── profiles ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── teachers ──────────────────────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "teachers_admin_all" ON public.teachers
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── enrollments ───────────────────────────────────────────────
-- Already has enrollments_admin_org from 002 (FOR ALL), this is redundant
-- but safe due to EXCEPTION handler
DO $$ BEGIN
  CREATE POLICY "enrollments_select_admin" ON public.enrollments
    FOR SELECT USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
