-- ============================================================
-- Migration 008: Fix RLS policies to support normalized schema
-- ============================================================
-- Problem: All original teacher/student RLS policies used the
-- legacy columns (teacher_name, classes_current, etc.).
-- Sessions, attendance and evaluations created via the new
-- normalized system have NULL teacher_name / class_id only,
-- so teachers/students couldn't see their own data.
-- Fix: Add OR clauses that resolve via the normalized tables.
-- ============================================================

-- ── 1. SESSIONS ─────────────────────────────────────────────

-- Teacher: legacy name match OR normalized class_id
DROP POLICY IF EXISTS "sessions_select_teacher" ON public.sessions;
CREATE POLICY "sessions_select_teacher" ON public.sessions
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND (
      teacher_name = public.get_my_name()
      OR class_id IN (
        SELECT id FROM public.classes WHERE teacher_id = auth.uid()
      )
    )
  );

-- Teacher: needs to UPDATE sessions (e.g. mark DONE after attendance)
DROP POLICY IF EXISTS "sessions_update_teacher" ON public.sessions;
CREATE POLICY "sessions_update_teacher" ON public.sessions
  FOR UPDATE USING (
    public.get_my_role() = 'teacher'
    AND (
      teacher_name = public.get_my_name()
      OR class_id IN (
        SELECT id FROM public.classes WHERE teacher_id = auth.uid()
      )
    )
  );

-- Student: legacy classes_current OR normalized enrollments
DROP POLICY IF EXISTS "sessions_select_student" ON public.sessions;
CREATE POLICY "sessions_select_student" ON public.sessions
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND (
      class_name IN (
        SELECT ten_lop FROM public.classes_current
        WHERE hoc_vien = public.get_my_name()
      )
      OR class_id IN (
        SELECT e.class_id
        FROM public.enrollments e
        JOIN public.students s ON s.id = e.student_id
        WHERE s.profile_id = auth.uid()
          AND e.status = 'active'
      )
    )
  );

-- ── 2. SESSION_ATTENDANCE ────────────────────────────────────

DROP POLICY IF EXISTS "session_attendance_select_teacher" ON public.session_attendance;
CREATE POLICY "session_attendance_select_teacher" ON public.session_attendance
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND (
      class_name IN (
        SELECT DISTINCT ten_lop FROM public.classes_current
        WHERE giao_vien = public.get_my_name()
      )
      OR class_name IN (
        SELECT name FROM public.classes WHERE teacher_id = auth.uid()
      )
    )
  );

-- ── 3. SESSION_CLASS_EVALUATION ──────────────────────────────

DROP POLICY IF EXISTS "sess_class_eval_select_teacher" ON public.session_class_evaluation;
CREATE POLICY "sess_class_eval_select_teacher" ON public.session_class_evaluation
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND (
      class_name IN (
        SELECT DISTINCT ten_lop FROM public.classes_current
        WHERE giao_vien = public.get_my_name()
      )
      OR class_name IN (
        SELECT name FROM public.classes WHERE teacher_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "sess_class_eval_select_student" ON public.session_class_evaluation;
CREATE POLICY "sess_class_eval_select_student" ON public.session_class_evaluation
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND (
      class_name IN (
        SELECT ten_lop FROM public.classes_current
        WHERE hoc_vien = public.get_my_name()
      )
      OR class_name IN (
        SELECT c.name
        FROM public.classes c
        JOIN public.enrollments e ON e.class_id = c.id
        JOIN public.students s ON s.id = e.student_id
        WHERE s.profile_id = auth.uid() AND e.status = 'active'
      )
    )
  );

-- ── 4. SESSION_STUDENT_EVALUATION ───────────────────────────

DROP POLICY IF EXISTS "sess_student_eval_select_teacher" ON public.session_student_evaluation;
CREATE POLICY "sess_student_eval_select_teacher" ON public.session_student_evaluation
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND (
      class_name IN (
        SELECT DISTINCT ten_lop FROM public.classes_current
        WHERE giao_vien = public.get_my_name()
      )
      OR class_name IN (
        SELECT name FROM public.classes WHERE teacher_id = auth.uid()
      )
    )
  );

-- ── 5. ATTENDANCE_MAKEUP ─────────────────────────────────────

DROP POLICY IF EXISTS "attendance_makeup_select_teacher" ON public.attendance_makeup;
CREATE POLICY "attendance_makeup_select_teacher" ON public.attendance_makeup
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND (
      session_ref IN (
        SELECT sa.session_ref FROM public.session_attendance sa
        WHERE sa.class_name IN (
          SELECT DISTINCT ten_lop FROM public.classes_current
          WHERE giao_vien = public.get_my_name()
        )
      )
      OR session_ref IN (
        SELECT sa.session_ref FROM public.session_attendance sa
        WHERE sa.class_name IN (
          SELECT name FROM public.classes WHERE teacher_id = auth.uid()
        )
      )
    )
  );
