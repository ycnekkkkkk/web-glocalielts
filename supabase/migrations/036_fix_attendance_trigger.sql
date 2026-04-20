-- ============================================================
-- Migration 036: Fix sessions table + trigger
-- Nguyên nhân gốc: Bang sessions trong schema gốc không có class_id.
-- Nhiều code (teacher/admin/student) query bằng class_id (UUID)
-- nhưng bảng chỉ có class_name (TEXT). Trigger cũng dùng sai.
--
-- Bug gốc (migration 034):
--   1. Dùng "status" thay vì "attendance_status"
--   2. ON CONFLICT (session_id, student_id) nhưng constraint thực tế
--      là (session_ref, student_name)
--   3. Thiếu student_name → vi phạm NOT NULL
--   4. Dùng NEW.class_id nhưng column không tồn tại → NULL
-- ============================================================

-- ============================================================
-- BƯỚC 0: Thêm RLS policies còn thiếu
-- ============================================================

-- classes: thêm INSERT policy cho admin (hiện chỉ có academic_manager)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'classes' AND policyname = 'classes_insert_admin'
  ) THEN
    CREATE POLICY "classes_insert_admin" ON public.classes
      FOR INSERT WITH CHECK (public.get_my_role() = 'admin');
  END IF;
END $$;

-- sessions: thêm INSERT/UPDATE policies cho admin + academic_manager
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'sessions_insert_admin'
  ) THEN
    CREATE POLICY "sessions_insert_admin" ON public.sessions
      FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'academic_manager'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'sessions_update_admin'
  ) THEN
    CREATE POLICY "sessions_update_admin" ON public.sessions
      FOR UPDATE USING (public.get_my_role() IN ('admin', 'academic_manager'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'sessions_delete_admin'
  ) THEN
    CREATE POLICY "sessions_delete_admin" ON public.sessions
      FOR DELETE USING (public.get_my_role() = 'admin');
  END IF;
END $$;

-- ============================================================
-- BƯỚC 1: Thêm cột class_id (KHÔNG dùng REFERENCES vội -
--   nếu có sessions cũ không khớp class → ADD COLUMN sẽ fail)
-- ============================================================
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS class_id UUID;

CREATE INDEX IF NOT EXISTS idx_sessions_class_id ON public.sessions(class_id);

-- ============================================================
-- BƯỚC 2: Backfill class_id cho sessions hiện có
--   Dựa trên class_name = classes.name để tìm class.id
-- ============================================================
UPDATE public.sessions s
SET class_id = c.id
FROM public.classes c
WHERE s.class_name = c.name
  AND s.class_id IS NULL;

-- ============================================================
-- BƯỚC 3: Thêm FK sau backfill (giờ tất cả class_id đều khớp)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sessions_class_id_fkey'
      AND table_name = 'sessions'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_class_id_fkey
      FOREIGN KEY (class_id) REFERENCES public.classes(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- BƯỚC 4: Drop old trigger(s) + function trước khi tạo mới
-- Có thể có trigger cũ tên khác (trg_auto_create_attendance)
-- ============================================================
DROP TRIGGER IF EXISTS trg_auto_create_attendance ON public.sessions;
DROP TRIGGER IF EXISTS trg_auto_create_session_attendance ON public.sessions;
DROP FUNCTION IF EXISTS public.auto_create_session_attendance();

CREATE OR REPLACE FUNCTION public.auto_create_session_attendance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.session_attendance
    (session_id, session_ref, student_id, session_date, class_name, student_name, attendance_status)
  SELECT
    NEW.id,
    COALESCE(NEW.class_name, '') || '#' || COALESCE(NEW.session_no::text, '') || '#' || COALESCE(NEW.session_date, '') AS session_ref,
    e.student_id,
    NEW.session_date,
    NEW.class_name,
    s.full_name,
    'on_time'
  FROM public.enrollments e
  JOIN public.students s ON s.id = e.student_id
  WHERE e.class_id = NEW.class_id
  ON CONFLICT (session_ref, student_name) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_create_session_attendance
  AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_session_attendance();

-- ============================================================
-- Kết thúc Migration 036
-- ============================================================
