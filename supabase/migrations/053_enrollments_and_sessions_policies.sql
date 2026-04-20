-- Migration 053: Comprehensive RLS fixes for academic_manager
-- Fixes: enrollments, sessions, students, profiles, periodic_tests,
-- session_attendance, attendance_makeup, monthly_student_evaluations

-- ── 0. Add created_by column to classes ──────────────────────────
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

UPDATE public.classes SET created_by = teacher_id WHERE created_by IS NULL AND teacher_id IS NOT NULL;
UPDATE public.classes SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;

-- ── ENROLLMENTS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "enrollments_insert_academic_manager" ON enrollments;
CREATE POLICY "enrollments_insert_academic_manager" ON enrollments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.get_my_role() = 'admin'
      OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = enrollments.class_id AND c.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.academic_manager_class_assignments amca WHERE amca.class_id = enrollments.class_id AND amca.manager_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "enrollments_insert_admin" ON enrollments;
CREATE POLICY "enrollments_insert_admin" ON enrollments
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "enrollments_select_academic_manager" ON enrollments;
CREATE POLICY "enrollments_select_academic_manager" ON enrollments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.academic_manager_class_assignments amca WHERE amca.class_id = enrollments.class_id AND amca.manager_user_id = auth.uid())
    OR public.get_my_role() IN ('admin', 'organization')
    OR (public.get_my_role() = 'teacher' AND class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()))
    OR (public.get_my_role() = 'student' AND student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid()))
  );

DROP POLICY IF EXISTS "enrollments_delete_academic_manager" ON enrollments;
CREATE POLICY "enrollments_delete_academic_manager" ON enrollments
  FOR DELETE USING (
    public.get_my_role() = 'admin'
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = enrollments.class_id AND c.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.academic_manager_class_assignments amca WHERE amca.class_id = enrollments.class_id AND amca.manager_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "enrollments_update_academic_manager" ON enrollments;
CREATE POLICY "enrollments_update_academic_manager" ON enrollments
  FOR UPDATE USING (
    public.get_my_role() = 'admin'
    OR EXISTS (SELECT 1 FROM public.academic_manager_class_assignments amca WHERE amca.class_id = enrollments.class_id AND amca.manager_user_id = auth.uid())
  );

-- ── SESSIONS ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sessions_insert_academic_manager" ON sessions;
CREATE POLICY "sessions_insert_academic_manager" ON sessions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.get_my_role() = 'admin'
      OR EXISTS (SELECT 1 FROM public.classes c WHERE c.name = sessions.class_name AND (c.created_by = auth.uid() OR c.teacher_id = auth.uid()))
      OR EXISTS (SELECT 1 FROM public.academic_manager_class_assignments amca JOIN public.classes c ON c.id = amca.class_id WHERE c.name = sessions.class_name AND amca.manager_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "sessions_insert_admin" ON sessions;
CREATE POLICY "sessions_insert_admin" ON sessions
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "sessions_insert_teacher" ON sessions;
CREATE POLICY "sessions_insert_teacher" ON sessions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.classes c WHERE c.name = sessions.class_name AND c.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "sessions_select_academic_manager" ON sessions;
CREATE POLICY "sessions_select_academic_manager" ON sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.academic_manager_class_assignments amca JOIN public.classes c ON c.id = amca.class_id WHERE c.name = sessions.class_name AND amca.manager_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.name = sessions.class_name AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid()))
    OR public.get_my_role() IN ('admin', 'organization')
  );

DROP POLICY IF EXISTS "sessions_update_academic_manager" ON sessions;
CREATE POLICY "sessions_update_academic_manager" ON sessions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.academic_manager_class_assignments amca JOIN public.classes c ON c.id = amca.class_id WHERE c.name = sessions.class_name AND amca.manager_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.name = sessions.class_name AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid()))
    OR public.get_my_role() = 'admin'
  );

-- ── STUDENTS ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "students_select_academic_manager" ON students;
CREATE POLICY "students_select_academic_manager" ON students
  FOR SELECT USING (
    public.get_my_role() IN ('admin', 'academic_manager', 'organization')
    OR profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "students_insert_admin" ON students;
CREATE POLICY "students_insert_admin" ON students
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

-- ── PROFILES ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_teacher" ON profiles;
CREATE POLICY "profiles_select_teacher" ON profiles
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (role = 'teacher' OR public.get_my_role() IN ('admin', 'academic_manager', 'organization'))
  );

-- ── PERIODIC TESTS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "periodic_tests_insert_academic_manager" ON periodic_tests;
CREATE POLICY "periodic_tests_insert_academic_manager" ON periodic_tests
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.get_my_role() = 'admin'
      OR EXISTS (SELECT 1 FROM public.academic_manager_class_assignments amca WHERE amca.class_id = periodic_tests.class_id AND amca.manager_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = periodic_tests.class_id AND (c.created_by = auth.uid() OR c.teacher_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "periodic_tests_select_academic_manager" ON periodic_tests;
CREATE POLICY "periodic_tests_select_academic_manager" ON periodic_tests
  FOR SELECT USING (
    public.get_my_role() = 'admin'
    OR EXISTS (SELECT 1 FROM public.academic_manager_class_assignments amca WHERE amca.class_id = periodic_tests.class_id AND amca.manager_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = periodic_tests.class_id AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid()))
    OR public.get_my_role() = 'organization'
  );

-- ── PERIODIC TEST SUBMISSIONS ─────────────────────────────────────
DROP POLICY IF EXISTS "periodic_test_submissions_select_academic_manager" ON periodic_test_submissions;
CREATE POLICY "periodic_test_submissions_select_academic_manager" ON periodic_test_submissions
  FOR SELECT USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.periodic_tests pt
      JOIN public.academic_manager_class_assignments amca ON amca.class_id = pt.class_id
      WHERE pt.id = periodic_test_submissions.test_id AND amca.manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.periodic_tests pt
      JOIN public.classes c ON c.id = pt.class_id
      WHERE pt.id = periodic_test_submissions.test_id AND c.teacher_id = auth.uid()
    )
    OR public.get_my_role() IN ('student', 'organization')
  );

DROP POLICY IF EXISTS "periodic_test_submissions_insert_academic_manager" ON periodic_test_submissions;
CREATE POLICY "periodic_test_submissions_insert_academic_manager" ON periodic_test_submissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "periodic_test_submissions_update_academic_manager" ON periodic_test_submissions;
CREATE POLICY "periodic_test_submissions_update_academic_manager" ON periodic_test_submissions
  FOR UPDATE USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.periodic_tests pt
      JOIN public.academic_manager_class_assignments amca ON amca.class_id = pt.class_id
      WHERE pt.id = periodic_test_submissions.test_id AND amca.manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.periodic_tests pt
      JOIN public.classes c ON c.id = pt.class_id
      WHERE pt.id = periodic_test_submissions.test_id AND c.teacher_id = auth.uid()
    )
    OR public.get_my_role() = 'student'
  );

-- ── MONTHLY STUDENT EVALUATIONS ───────────────────────────────────
-- Note: uses class_id (UUID) not class_name
DROP POLICY IF EXISTS "monthly_student_evaluations_select_academic_manager" ON monthly_student_evaluations;
CREATE POLICY "monthly_student_evaluations_select_academic_manager" ON monthly_student_evaluations
  FOR SELECT USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.academic_manager_class_assignments amca
      WHERE amca.class_id = monthly_student_evaluations.class_id
        AND amca.manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = monthly_student_evaluations.class_id
        AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR public.get_my_role() IN ('teacher', 'organization')
  );

DROP POLICY IF EXISTS "monthly_student_evaluations_insert_academic_manager" ON monthly_student_evaluations;
CREATE POLICY "monthly_student_evaluations_insert_academic_manager" ON monthly_student_evaluations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.get_my_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.academic_manager_class_assignments amca
        WHERE amca.class_id = monthly_student_evaluations.class_id
          AND amca.manager_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = monthly_student_evaluations.class_id
          AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "monthly_student_evaluations_update_academic_manager" ON monthly_student_evaluations;
CREATE POLICY "monthly_student_evaluations_update_academic_manager" ON monthly_student_evaluations
  FOR UPDATE USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.academic_manager_class_assignments amca
      WHERE amca.class_id = monthly_student_evaluations.class_id
        AND amca.manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = monthly_student_evaluations.class_id
        AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- ── SESSION ATTENDANCE ────────────────────────────────────────────
-- Note: uses class_name (TEXT) - join via sessions table
DROP POLICY IF EXISTS "session_attendance_select_academic_manager" ON session_attendance;
CREATE POLICY "session_attendance_select_academic_manager" ON session_attendance
  FOR SELECT USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.academic_manager_class_assignments amca
      JOIN public.classes c ON c.id = amca.class_id
      WHERE c.name = session_attendance.class_name AND amca.manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.name = session_attendance.class_name
        AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR public.get_my_role() IN ('teacher', 'organization')
  );

DROP POLICY IF EXISTS "session_attendance_insert_academic_manager" ON session_attendance;
CREATE POLICY "session_attendance_insert_academic_manager" ON session_attendance
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.get_my_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.academic_manager_class_assignments amca
        JOIN public.classes c ON c.id = amca.class_id
        WHERE c.name = session_attendance.class_name AND amca.manager_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.name = session_attendance.class_name
          AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "session_attendance_update_academic_manager" ON session_attendance;
CREATE POLICY "session_attendance_update_academic_manager" ON session_attendance
  FOR UPDATE USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.academic_manager_class_assignments amca
      JOIN public.classes c ON c.id = amca.class_id
      WHERE c.name = session_attendance.class_name AND amca.manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.name = session_attendance.class_name
        AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- ── ATTENDANCE MAKEUP ─────────────────────────────────────────────
-- Note: attendance_makeup uses session_ref (TEXT format: "ClassName#session_no#date")
-- We extract class_name from session_ref by splitting on '#'
DROP POLICY IF EXISTS "attendance_makeup_select_academic_manager" ON attendance_makeup;
CREATE POLICY "attendance_makeup_select_academic_manager" ON attendance_makeup
  FOR SELECT USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.academic_manager_class_assignments amca
      JOIN public.classes c ON c.id = amca.class_id
      WHERE c.name = split_part(attendance_makeup.session_ref, '#', 1)
        AND amca.manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.name = split_part(attendance_makeup.session_ref, '#', 1)
        AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR public.get_my_role() IN ('teacher', 'organization')
  );

DROP POLICY IF EXISTS "attendance_makeup_insert_academic_manager" ON attendance_makeup;
CREATE POLICY "attendance_makeup_insert_academic_manager" ON attendance_makeup
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.get_my_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.academic_manager_class_assignments amca
        JOIN public.classes c ON c.id = amca.class_id
        WHERE c.name = split_part(attendance_makeup.session_ref, '#', 1)
          AND amca.manager_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.name = split_part(attendance_makeup.session_ref, '#', 1)
          AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "attendance_makeup_update_academic_manager" ON attendance_makeup;
CREATE POLICY "attendance_makeup_update_academic_manager" ON attendance_makeup
  FOR UPDATE USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.academic_manager_class_assignments amca
      JOIN public.classes c ON c.id = amca.class_id
      WHERE c.name = split_part(attendance_makeup.session_ref, '#', 1)
        AND amca.manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.name = split_part(attendance_makeup.session_ref, '#', 1)
        AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- ── SESSION CLASS EVALUATION ──────────────────────────────────────
-- Note: uses class_name (TEXT)
DROP POLICY IF EXISTS "session_class_evaluation_select_academic_manager" ON session_class_evaluation;
CREATE POLICY "session_class_evaluation_select_academic_manager" ON session_class_evaluation
  FOR SELECT USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.academic_manager_class_assignments amca
      JOIN public.classes c ON c.id = amca.class_id
      WHERE c.name = session_class_evaluation.class_name AND amca.manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.name = session_class_evaluation.class_name
        AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR public.get_my_role() IN ('teacher', 'organization')
  );

DROP POLICY IF EXISTS "session_class_evaluation_insert_academic_manager" ON session_class_evaluation;
CREATE POLICY "session_class_evaluation_insert_academic_manager" ON session_class_evaluation
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.get_my_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.academic_manager_class_assignments amca
        JOIN public.classes c ON c.id = amca.class_id
        WHERE c.name = session_class_evaluation.class_name AND amca.manager_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.name = session_class_evaluation.class_name
          AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "session_class_evaluation_update_academic_manager" ON session_class_evaluation;
CREATE POLICY "session_class_evaluation_update_academic_manager" ON session_class_evaluation
  FOR UPDATE USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.academic_manager_class_assignments amca
      JOIN public.classes c ON c.id = amca.class_id
      WHERE c.name = session_class_evaluation.class_name AND amca.manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.name = session_class_evaluation.class_name
        AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- ── SESSION STUDENT EVALUATION ─────────────────────────────────────
-- Note: uses class_name (TEXT)
DROP POLICY IF EXISTS "session_student_evaluation_select_academic_manager" ON session_student_evaluation;
CREATE POLICY "session_student_evaluation_select_academic_manager" ON session_student_evaluation
  FOR SELECT USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.academic_manager_class_assignments amca
      JOIN public.classes c ON c.id = amca.class_id
      WHERE c.name = session_student_evaluation.class_name AND amca.manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.name = session_student_evaluation.class_name
        AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR public.get_my_role() IN ('teacher', 'student', 'organization')
  );

DROP POLICY IF EXISTS "session_student_evaluation_insert_academic_manager" ON session_student_evaluation;
CREATE POLICY "session_student_evaluation_insert_academic_manager" ON session_student_evaluation
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.get_my_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.academic_manager_class_assignments amca
        JOIN public.classes c ON c.id = amca.class_id
        WHERE c.name = session_student_evaluation.class_name AND amca.manager_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.name = session_student_evaluation.class_name
          AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
      )
      OR public.get_my_role() = 'student'
    )
  );

DROP POLICY IF EXISTS "session_student_evaluation_update_academic_manager" ON session_student_evaluation;
CREATE POLICY "session_student_evaluation_update_academic_manager" ON session_student_evaluation
  FOR UPDATE USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.academic_manager_class_assignments amca
      JOIN public.classes c ON c.id = amca.class_id
      WHERE c.name = session_student_evaluation.class_name AND amca.manager_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.name = session_student_evaluation.class_name
        AND (c.teacher_id = auth.uid() OR c.created_by = auth.uid())
    )
  );
