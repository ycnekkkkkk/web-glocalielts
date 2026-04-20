-- ============================================================
-- Migration 033: Monthly Student Evaluations + Student Evaluations
-- ============================================================
-- 1. Bảng đánh giá học viên cuối tháng (monthly)
-- 2. Bảng đánh giá học viên (student_evaluations) - đơn giản
-- 3. RLS Policies cho cả 2 bảng
-- ============================================================

-- 1. Bảng đánh giá học viên cuối tháng (đã tồn tại, giữ nguyên)
CREATE TABLE IF NOT EXISTS public.monthly_student_evaluations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  evaluation_month TEXT NOT NULL,               -- Format: 'YYYY-MM' (ví dụ: '2026-04')
  academic_year   TEXT,                         -- Ví dụ: '2025-2026'
  rating          NUMERIC(2,1) CHECK (rating >= 1 AND rating <= 5), -- 1-5 sao
  performance     TEXT CHECK (performance IN ('excellent','good','average','below_average','poor')),
  attendance_rate NUMERIC(5,2),                 -- % điểm danh
  homework_score  NUMERIC(5,2),                 -- % bài tập
  midterm_score   NUMERIC(5,2),                 -- % giữa kỳ
  final_score     NUMERIC(5,2),                 -- % cuối kỳ
  teacher_comment TEXT,
  academic_comment TEXT,
  evaluated_by_teacher_id  UUID REFERENCES auth.users(id),
  evaluated_by_manager_id  UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id, evaluation_month)
);

CREATE INDEX IF NOT EXISTS idx_mse_class_id
  ON public.monthly_student_evaluations(class_id);
CREATE INDEX IF NOT EXISTS idx_mse_student_id
  ON public.monthly_student_evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_mse_month
  ON public.monthly_student_evaluations(evaluation_month);

-- 2. Bảng đánh giá học viên (student_evaluations) - đơn giản
CREATE TABLE IF NOT EXISTS public.student_evaluations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  month           TEXT NOT NULL,                  -- Format: 'YYYY-MM'
  year            INT NOT NULL,
  evaluation_text TEXT,
  teacher_id      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_se_student_id
  ON public.student_evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_se_class_id
  ON public.student_evaluations(class_id);

-- 3. RLS Policies cho monthly_student_evaluations
ALTER TABLE public.monthly_student_evaluations ENABLE ROW LEVEL SECURITY;

-- Teacher: Chỉ đọc & cập nhật đánh giá học viên trong lớp mình dạy
DO $$ BEGIN
  CREATE POLICY "mse_select_teacher" ON public.monthly_student_evaluations
    FOR SELECT USING (
      public.get_my_role() = 'teacher'
      AND class_id IN (
        SELECT id FROM public.classes WHERE teacher_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mse_insert_teacher" ON public.monthly_student_evaluations
    FOR INSERT WITH CHECK (
      public.get_my_role() = 'teacher'
      AND class_id IN (
        SELECT id FROM public.classes WHERE teacher_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mse_update_teacher" ON public.monthly_student_evaluations
    FOR UPDATE USING (
      public.get_my_role() = 'teacher'
      AND class_id IN (
        SELECT id FROM public.classes WHERE teacher_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Academic Manager: Đọc & cập nhật đánh giá trong lớp mình quản lý
DO $$ BEGIN
  CREATE POLICY "mse_select_academic_manager" ON public.monthly_student_evaluations
    FOR SELECT USING (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (
        SELECT class_id FROM public.get_my_academic_manager_class_ids()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mse_update_academic_manager" ON public.monthly_student_evaluations
    FOR UPDATE USING (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (
        SELECT class_id FROM public.get_my_academic_manager_class_ids()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mse_insert_academic_manager" ON public.monthly_student_evaluations
    FOR INSERT WITH CHECK (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (
        SELECT class_id FROM public.get_my_academic_manager_class_ids()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin: Full access
DO $$ BEGIN
  CREATE POLICY "mse_admin_all" ON public.monthly_student_evaluations
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. RLS Policies cho student_evaluations
ALTER TABLE public.student_evaluations ENABLE ROW LEVEL SECURITY;

-- Student: Chỉ được READ (SELECT) đánh giá của bản thân
DO $$ BEGIN
  CREATE POLICY "se_select_student" ON public.student_evaluations
    FOR SELECT USING (
      public.get_my_role() = 'student'
      AND student_id IN (
        SELECT id FROM public.students WHERE profile_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Teacher: ALL (INSERT, SELECT, UPDATE, DELETE) trên tất cả bản ghi trong lớp mình dạy
DO $$ BEGIN
  CREATE POLICY "se_all_teacher" ON public.student_evaluations
    FOR ALL USING (
      public.get_my_role() = 'teacher'
      AND class_id IN (
        SELECT id FROM public.classes WHERE teacher_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Academic Manager: ALL trên tất cả bản ghi trong lớp mình quản lý
DO $$ BEGIN
  CREATE POLICY "se_all_academic_manager" ON public.student_evaluations
    FOR ALL USING (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (
        SELECT class_id FROM public.get_my_academic_manager_class_ids()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin: Full access
DO $$ BEGIN
  CREATE POLICY "se_admin_all" ON public.student_evaluations
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. RPC: Get monthly evaluations for a class
CREATE OR REPLACE FUNCTION public.get_monthly_evaluations(
  p_class_id UUID
)
RETURNS TABLE(
  id                UUID,
  student_id        UUID,
  student_name      TEXT,
  evaluation_month  TEXT,
  rating            NUMERIC,
  performance       TEXT,
  attendance_rate   NUMERIC,
  homework_score    NUMERIC,
  midterm_score     NUMERIC,
  final_score       NUMERIC,
  teacher_comment   TEXT,
  academic_comment  TEXT,
  evaluated_by_teacher_name TEXT,
  evaluated_by_manager_name TEXT,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mse.id,
    mse.student_id,
    s.full_name        AS student_name,
    mse.evaluation_month,
    mse.rating,
    mse.performance,
    mse.attendance_rate,
    mse.homework_score,
    mse.midterm_score,
    mse.final_score,
    mse.teacher_comment,
    mse.academic_comment,
    tp.full_name        AS evaluated_by_teacher_name,
    mp.full_name        AS evaluated_by_manager_name,
    mse.created_at,
    mse.updated_at
  FROM public.monthly_student_evaluations mse
  JOIN public.students s ON s.id = mse.student_id
  LEFT JOIN public.profiles tp ON tp.id = mse.evaluated_by_teacher_id
  LEFT JOIN public.profiles mp ON mp.id = mse.evaluated_by_manager_id
  WHERE mse.class_id = p_class_id
  ORDER BY mse.evaluation_month DESC, mse.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_evaluations(UUID) TO authenticated;

-- 6. Triggers để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.update_monthly_eval_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mse_updated_at ON public.monthly_student_evaluations;
CREATE TRIGGER trg_mse_updated_at
  BEFORE UPDATE ON public.monthly_student_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_monthly_eval_updated_at();

DROP TRIGGER IF EXISTS trg_se_updated_at ON public.student_evaluations;
CREATE TRIGGER trg_se_updated_at
  BEFORE UPDATE ON public.student_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_monthly_eval_updated_at();

-- ============================================================
-- Kết thúc Migration 033
-- ============================================================
