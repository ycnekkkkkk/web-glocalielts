-- ============================================================
-- Migration 013: Academic Manager Role & Portal
-- ============================================================
-- 1. Thêm role `academic_manager` vào check constraint profiles.role
-- 2. Tạo bảng academic_manager_class_assignments
-- 3. Helper function get_my_academic_manager_class_ids()
-- 4. RLS policies cho academic_manager
-- 5. Cập nhật RPC get_class_evaluations / get_makeup_status
-- ============================================================

-- ── 1. Role constraint update ────────────────────────────────
-- Xóa constraint cũ rồi tạo lại với thêm 'academic_manager'
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'teacher', 'student', 'organization', 'academic_manager'));

-- ── 2. Bảng gán academic_manager → lớp ───────────────────────
CREATE TABLE IF NOT EXISTS public.academic_manager_class_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  manager_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by     UUID REFERENCES auth.users(id),
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, manager_user_id)
);

CREATE INDEX IF NOT EXISTS idx_amca_manager ON public.academic_manager_class_assignments(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_amca_class   ON public.academic_manager_class_assignments(class_id);

-- RLS cho bảng assignments
ALTER TABLE public.academic_manager_class_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "amca_admin_all" ON public.academic_manager_class_assignments
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "amca_manager_select" ON public.academic_manager_class_assignments
    FOR SELECT USING (manager_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Helper function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_academic_manager_class_ids()
RETURNS TABLE(class_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.class_id
  FROM public.academic_manager_class_assignments a
  WHERE a.manager_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_academic_manager_class_ids() TO authenticated;

-- Học viên thuộc lớp do academic_manager quản lý (bypass RLS enrollments — tránh đệ quy với students_academic_manager)
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

GRANT EXECUTE ON FUNCTION public.get_my_academic_manager_student_ids() TO authenticated;

-- ── 4. RLS policies cho bảng đọc ────────────────────────────

-- classes
DO $$ BEGIN
  CREATE POLICY "classes_academic_manager" ON public.classes
    FOR SELECT USING (
      public.get_my_role() = 'academic_manager'
      AND id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- sessions
DO $$ BEGIN
  CREATE POLICY "sessions_academic_manager" ON public.sessions
    FOR SELECT USING (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- session_attendance
DO $$ BEGIN
  CREATE POLICY "session_attendance_academic_manager" ON public.session_attendance
    FOR SELECT USING (
      public.get_my_role() = 'academic_manager'
      AND class_name IN (
        SELECT c.name FROM public.classes c
        WHERE c.id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- session_class_evaluation
DO $$ BEGIN
  CREATE POLICY "sess_class_eval_academic_manager" ON public.session_class_evaluation
    FOR SELECT USING (
      public.get_my_role() = 'academic_manager'
      AND class_name IN (
        SELECT c.name FROM public.classes c
        WHERE c.id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- session_student_evaluation
DO $$ BEGIN
  CREATE POLICY "sess_student_eval_academic_manager" ON public.session_student_evaluation
    FOR SELECT USING (
      public.get_my_role() = 'academic_manager'
      AND class_name IN (
        SELECT c.name FROM public.classes c
        WHERE c.id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- session_teacher_evaluation (students evaluate teachers)
DO $$ BEGIN
  CREATE POLICY "sess_teacher_eval_academic_manager" ON public.session_teacher_evaluation
    FOR SELECT USING (
      public.get_my_role() = 'academic_manager'
      AND class_name IN (
        SELECT c.name FROM public.classes c
        WHERE c.id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- attendance_makeup
DO $$ BEGIN
  CREATE POLICY "attendance_makeup_academic_manager" ON public.attendance_makeup
    FOR SELECT USING (
      public.get_my_role() = 'academic_manager'
      AND session_ref IN (
        SELECT sa.session_ref FROM public.session_attendance sa
        WHERE sa.class_name IN (
          SELECT c.name FROM public.classes c
          WHERE c.id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- profiles: đọc teacher profile (cần xem tên GV)
-- Policy profiles_select_authenticated đã có từ migration 012, không cần thêm.

-- enrollments
DO $$ BEGIN
  CREATE POLICY "enrollments_academic_manager" ON public.enrollments
    FOR SELECT USING (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- students (KHÔNG subquery trực tiếp vào enrollments — gây infinite recursion với enrollments_student)
DO $$ BEGIN
  CREATE POLICY "students_academic_manager" ON public.students
    FOR SELECT USING (
      public.get_my_role() = 'academic_manager'
      AND id = ANY(public.get_my_academic_manager_student_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 5. Cập nhật RPC get_class_evaluations để enforce quyền ───
-- academic_manager chỉ thấy lớp của mình (SECURITY DEFINER nên cần check thủ công)
CREATE OR REPLACE FUNCTION public.get_class_evaluations(p_class_name TEXT)
RETURNS TABLE(
  eval_type    TEXT,
  session_no   INT,
  session_date TEXT,
  session_ref  TEXT,
  rater_name   TEXT,
  student_name TEXT,
  rating       NUMERIC,
  comment      TEXT,
  created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_class_id UUID;
BEGIN
  v_role := public.get_my_role();

  -- academic_manager: chỉ cho xem lớp được gán
  IF v_role = 'academic_manager' THEN
    SELECT c.id INTO v_class_id FROM public.classes c WHERE c.name = p_class_name LIMIT 1;
    IF v_class_id IS NULL THEN RETURN; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.academic_manager_class_assignments a
      WHERE a.class_id = v_class_id AND a.manager_user_id = auth.uid()
    ) THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  SELECT
    'class_eval'::TEXT,
    sce.session_no,
    sce.session_date,
    sce.session_ref,
    sce.evaluated_by,
    NULL::TEXT,
    sce.rating,
    sce.comment,
    sce.created_at
  FROM session_class_evaluation sce
  WHERE sce.class_name = p_class_name

  UNION ALL

  SELECT
    'teacher_eval'::TEXT,
    ste.session_no,
    ste.session_date,
    ste.session_ref,
    ste.student_name,
    ste.student_name,
    ste.rating,
    ste.comment,
    ste.created_at
  FROM session_teacher_evaluation ste
  WHERE ste.class_name = p_class_name

  ORDER BY session_no DESC, created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_class_evaluations(TEXT) TO authenticated;

-- ── 6. Cập nhật RPC get_makeup_status để enforce quyền ───────
CREATE OR REPLACE FUNCTION public.get_makeup_status(p_class_name TEXT)
RETURNS TABLE(
  student_name        TEXT,
  session_ref         TEXT,
  session_no          INT,
  session_date        TEXT,
  has_makeup          BOOLEAN,
  makeup_type         TEXT,
  target_session_ref  TEXT,
  note                TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_class_id UUID;
BEGIN
  v_role := public.get_my_role();

  -- academic_manager: chỉ cho xem lớp được gán
  IF v_role = 'academic_manager' THEN
    SELECT c.id INTO v_class_id FROM public.classes c WHERE c.name = p_class_name LIMIT 1;
    IF v_class_id IS NULL THEN RETURN; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.academic_manager_class_assignments a
      WHERE a.class_id = v_class_id AND a.manager_user_id = auth.uid()
    ) THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  SELECT
    sa.student_name,
    sa.session_ref,
    sa.session_no,
    sa.session_date,
    (am.session_ref IS NOT NULL),
    am.makeup_type,
    am.target_session_ref,
    am.note
  FROM session_attendance sa
  LEFT JOIN attendance_makeup am
    ON am.session_ref = sa.session_ref
   AND am.student_name = sa.student_name
  WHERE sa.class_name        = p_class_name
    AND sa.attendance_status = 'absent'
  ORDER BY sa.session_no DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_makeup_status(TEXT) TO authenticated;
