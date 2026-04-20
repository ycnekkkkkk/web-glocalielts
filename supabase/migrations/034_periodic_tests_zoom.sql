-- ============================================================
-- Migration 034: Periodic Tests & Zoom Integration
-- ============================================================
-- 1. Thêm trường zoom_link vào bảng classes
-- 2. Tạo bảng periodic_tests (quản lý kỳ thi định kỳ)
-- 3. Tạo bảng periodic_test_submissions (kết quả học viên)
-- 4. RLS policies + RPC functions
-- 5. Fix RIG1 bug: Đảm bảo khi tạo lớp, các bản ghi bổ trợ được khởi tạo
-- ============================================================

-- ============================================================
-- 1. ZOOM LINK — thêm vào classes
-- ============================================================
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS zoom_link TEXT;

CREATE INDEX IF NOT EXISTS idx_classes_zoom_link
  ON public.classes(zoom_link)
  WHERE zoom_link IS NOT NULL;

-- ============================================================
-- 2. PERIODIC_TESTS — quản lý kỳ thi định kỳ
-- ============================================================
CREATE TABLE IF NOT EXISTS public.periodic_tests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  test_name       TEXT NOT NULL,
  test_date       DATE,
  test_type       TEXT CHECK (test_type IN ('midterm','final','regular','mock')),
  max_score       NUMERIC(5,2) DEFAULT 100,
  passing_score   NUMERIC(5,2) DEFAULT 50,
  description     TEXT,
  test_material_link TEXT,                     -- Link tài liệu thi / đề thi
  zoom_link       TEXT,                         -- Link Zoom buổi test (nếu thi online)
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_periodic_tests_class_id
  ON public.periodic_tests(class_id);
CREATE INDEX IF NOT EXISTS idx_periodic_tests_date
  ON public.periodic_tests(test_date);

-- ============================================================
-- 3. PERIODIC_TEST_SUBMISSIONS — kết quả học viên
-- ============================================================
CREATE TABLE IF NOT EXISTS public.periodic_test_submissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id         UUID NOT NULL REFERENCES public.periodic_tests(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score           NUMERIC(5,2),
  status          TEXT CHECK (status IN ('not_taken','in_progress','submitted','graded','absent')),
  submitted_at    TIMESTAMPTZ,
  graded_by      UUID REFERENCES auth.users(id),
  graded_at      TIMESTAMPTZ,
  teacher_comment TEXT,
  student_note    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(test_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_pts_test_id
  ON public.periodic_test_submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_pts_student_id
  ON public.periodic_test_submissions(student_id);

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- periodic_tests
ALTER TABLE public.periodic_tests ENABLE ROW LEVEL SECURITY;

-- Teacher: quản lý test trong lớp mình dạy
DO $$ BEGIN
  CREATE POLICY "pt_select_teacher" ON public.periodic_tests
    FOR SELECT USING (
      public.get_my_role() = 'teacher'
      AND class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pt_insert_teacher" ON public.periodic_tests
    FOR INSERT WITH CHECK (
      public.get_my_role() = 'teacher'
      AND class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pt_update_teacher" ON public.periodic_tests
    FOR UPDATE USING (
      public.get_my_role() = 'teacher'
      AND class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pt_delete_teacher" ON public.periodic_tests
    FOR DELETE USING (
      public.get_my_role() = 'teacher'
      AND class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Academic Manager: quản lý test trong lớp mình quản lý
DO $$ BEGIN
  CREATE POLICY "pt_select_academic_manager" ON public.periodic_tests
    FOR SELECT USING (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pt_insert_academic_manager" ON public.periodic_tests
    FOR INSERT WITH CHECK (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pt_update_academic_manager" ON public.periodic_tests
    FOR UPDATE USING (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pt_delete_academic_manager" ON public.periodic_tests
    FOR DELETE USING (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin: full access
DO $$ BEGIN
  CREATE POLICY "pt_admin_all" ON public.periodic_tests
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- periodic_test_submissions
ALTER TABLE public.periodic_test_submissions ENABLE ROW LEVEL SECURITY;

-- Teacher: đọc & cập nhật kết quả học viên trong lớp mình
DO $$ BEGIN
  CREATE POLICY "pts_select_teacher" ON public.periodic_test_submissions
    FOR SELECT USING (
      public.get_my_role() = 'teacher'
      AND test_id IN (
        SELECT pt.id FROM public.periodic_tests pt
        JOIN public.classes c ON c.id = pt.class_id
        WHERE c.teacher_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pts_update_teacher" ON public.periodic_test_submissions
    FOR UPDATE USING (
      public.get_my_role() = 'teacher'
      AND test_id IN (
        SELECT pt.id FROM public.periodic_tests pt
        JOIN public.classes c ON c.id = pt.class_id
        WHERE c.teacher_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Academic Manager: đọc & cập nhật kết quả trong lớp mình quản lý
DO $$ BEGIN
  CREATE POLICY "pts_select_academic_manager" ON public.periodic_test_submissions
    FOR SELECT USING (
      public.get_my_role() = 'academic_manager'
      AND test_id IN (
        SELECT pt.id FROM public.periodic_tests pt
        WHERE pt.class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pts_update_academic_manager" ON public.periodic_test_submissions
    FOR UPDATE USING (
      public.get_my_role() = 'academic_manager'
      AND test_id IN (
        SELECT pt.id FROM public.periodic_tests pt
        WHERE pt.class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin: full access
DO $$ BEGIN
  CREATE POLICY "pts_admin_all" ON public.periodic_test_submissions
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Student: chỉ đọc kết quả của mình
DO $$ BEGIN
  CREATE POLICY "pts_select_student" ON public.periodic_test_submissions
    FOR SELECT USING (
      public.get_my_role() = 'student'
      AND student_id IN (
        SELECT id FROM public.students WHERE profile_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 5. RPC FUNCTIONS
-- ============================================================

-- Get periodic tests for a class
CREATE OR REPLACE FUNCTION public.get_periodic_tests(p_class_id UUID)
RETURNS TABLE(
  id                UUID,
  test_name         TEXT,
  test_date         DATE,
  test_type         TEXT,
  max_score         NUMERIC,
  passing_score     NUMERIC,
  description       TEXT,
  test_material_link TEXT,
  zoom_link         TEXT,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pt.id,
    pt.test_name,
    pt.test_date,
    pt.test_type,
    pt.max_score,
    pt.passing_score,
    pt.description,
    pt.test_material_link,
    pt.zoom_link,
    pt.created_at,
    pt.updated_at
  FROM public.periodic_tests pt
  WHERE pt.class_id = p_class_id
  ORDER BY pt.test_date DESC NULLS LAST, pt.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_periodic_tests(UUID) TO authenticated;

-- Get test submissions with student names
CREATE OR REPLACE FUNCTION public.get_test_submissions(p_test_id UUID)
RETURNS TABLE(
  id                UUID,
  student_id        UUID,
  student_name      TEXT,
  student_code      TEXT,
  score             NUMERIC,
  status            TEXT,
  submitted_at      TIMESTAMPTZ,
  graded_at         TIMESTAMPTZ,
  teacher_comment   TEXT,
  student_note      TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pts.id,
    pts.student_id,
    s.full_name      AS student_name,
    s.student_code   AS student_code,
    pts.score,
    pts.status,
    pts.submitted_at,
    pts.graded_at,
    pts.teacher_comment,
    pts.student_note
  FROM public.periodic_test_submissions pts
  JOIN public.students s ON s.id = pts.student_id
  WHERE pts.test_id = p_test_id
  ORDER BY s.full_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_test_submissions(UUID) TO authenticated;

-- ============================================================
-- 6. TRIGGERS cho updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_periodic_test_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pt_updated_at ON public.periodic_tests;
CREATE TRIGGER trg_pt_updated_at
  BEFORE UPDATE ON public.periodic_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_periodic_test_updated_at();

CREATE OR REPLACE FUNCTION public.update_test_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pts_updated_at ON public.periodic_test_submissions;
CREATE TRIGGER trg_pts_updated_at
  BEFORE UPDATE ON public.periodic_test_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_test_submission_updated_at();

-- ============================================================
-- 7. FIX RIG1 BUG: Tự động khởi tạo bản ghi bổ trợ khi tạo lớp mới
-- ============================================================
-- Problem: Lớp RIG1 không hiển thị điểm danh vì thiếu bản ghi bổ trợ
-- Solution: Tạo trigger tự động tạo session_attendance cho mỗi session
--            và/hoặc attendance_makeup khi enrollment được tạo.

-- Trigger: Khi tạo enrollment mới, tự động tạo bản ghi attendance_makeup (nếu cần)
-- Hoặc đảm bảo mỗi session có session_attendance cho tất cả học viên.

-- Tạo function tự động tạo session_attendance cho học viên khi có session mới
CREATE OR REPLACE FUNCTION public.auto_create_session_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- Tạo session_attendance cho tất cả học viên trong lớp
  INSERT INTO public.session_attendance (session_id, student_id, session_date, class_name, status)
  SELECT
    NEW.id AS session_id,
    s.id AS student_id,
    NEW.session_date,
    NEW.class_name,
    'present' AS status  -- default status
  FROM public.enrollments e
  JOIN public.students s ON s.id = e.student_id
  WHERE e.class_id = NEW.class_id
  ON CONFLICT (session_id, student_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tạo trigger trên sessions
DROP TRIGGER IF EXISTS trg_auto_create_attendance ON public.sessions;
CREATE TRIGGER trg_auto_create_attendance
  AFTER INSERT ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_session_attendance();

-- ============================================================
-- Kết thúc Migration 034
-- ============================================================
