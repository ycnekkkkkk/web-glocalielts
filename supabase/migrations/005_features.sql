-- ============================================================
-- Migration 005: Feature Enhancements
-- - schedule_days / schedule_time / schedule_end_time on classes
-- - end_time / note on sessions/session_attendance
-- - class_name/session_no/session_date on session_student_evaluation
-- - New table: session_teacher_evaluation
-- - RPC: check_teacher_conflict, get_class_evaluations, get_makeup_status
-- ============================================================

-- 1. Weekday-based scheduling on classes
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS schedule_days TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS schedule_time  TEXT,
  ADD COLUMN IF NOT EXISTS schedule_end_time TEXT;

-- 2. Note field on session_attendance (if not already present)
ALTER TABLE public.session_attendance
  ADD COLUMN IF NOT EXISTS note TEXT;

-- 3. Enrich session_student_evaluation for class-level queries
ALTER TABLE public.session_student_evaluation
  ADD COLUMN IF NOT EXISTS class_name   TEXT,
  ADD COLUMN IF NOT EXISTS session_no   INT,
  ADD COLUMN IF NOT EXISTS session_date TEXT;

CREATE INDEX IF NOT EXISTS idx_sse_class_name
  ON public.session_student_evaluation(class_name);

-- 4. Student evaluates teacher per session (new table)
CREATE TABLE IF NOT EXISTS public.session_teacher_evaluation (
  id           SERIAL PRIMARY KEY,
  session_ref  TEXT NOT NULL,
  class_name   TEXT NOT NULL,
  session_no   INT,
  session_date TEXT,
  student_name TEXT NOT NULL,
  rating       NUMERIC(2,1) CHECK (rating >= 1 AND rating <= 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_ref, student_name)
);

CREATE INDEX IF NOT EXISTS idx_ste_class_name
  ON public.session_teacher_evaluation(class_name);
CREATE INDEX IF NOT EXISTS idx_ste_session_ref
  ON public.session_teacher_evaluation(session_ref);

-- RLS for session_teacher_evaluation
ALTER TABLE public.session_teacher_evaluation ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ste_select_admin_org" ON public.session_teacher_evaluation
    FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ste_select_teacher" ON public.session_teacher_evaluation
    FOR SELECT USING (
      public.get_my_role() = 'teacher'
      AND class_name IN (
        SELECT DISTINCT ten_lop FROM public.classes_current
        WHERE giao_vien = public.get_my_name()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ste_student_select" ON public.session_teacher_evaluation
    FOR SELECT USING (
      public.get_my_role() = 'student'
      AND student_name = public.get_my_name()
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ste_student_insert" ON public.session_teacher_evaluation
    FOR INSERT WITH CHECK (
      public.get_my_role() = 'student'
      AND student_name = public.get_my_name()
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ste_student_update" ON public.session_teacher_evaluation
    FOR UPDATE USING (
      public.get_my_role() = 'student'
      AND student_name = public.get_my_name()
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. RPC: check_teacher_conflict
--    Trả về các buổi học bị xung đột khi cùng teacher + date + time
CREATE OR REPLACE FUNCTION public.check_teacher_conflict(
  p_teacher_id        UUID,
  p_session_date      TEXT,
  p_session_time      TEXT,
  p_exclude_session_id INT DEFAULT NULL
)
RETURNS TABLE(class_name TEXT, session_no INT, session_time TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.class_name,
    s.session_no,
    s.session_time
  FROM sessions s
  JOIN classes c ON c.id = s.class_id
  WHERE s.session_date   = p_session_date
    AND s.session_time   = p_session_time
    AND c.teacher_id     = p_teacher_id
    AND s.status        != 'CANCELLED'
    AND (p_exclude_session_id IS NULL OR s.id != p_exclude_session_id)
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.check_teacher_conflict(UUID, TEXT, TEXT, INT) TO authenticated;

-- 6. RPC: get_class_evaluations
--    Trả về tổng hợp: GV đánh giá lớp + HV đánh giá GV
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_class_evaluations(TEXT) TO authenticated;

-- 7. RPC: get_makeup_status
--    Trả về học viên vắng + trạng thái đã/chưa xếp bù
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_makeup_status(TEXT) TO authenticated;
