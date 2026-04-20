-- ============================================================
-- Migration 055: Fix attendance auto-creation bug
--
-- BUG: Khi tạo buổi học mới, trigger tự động tạo attendance record
-- với attendance_status = 'on_time' cho tất cả học viên.
-- Kết quả: Lớp mới tạo chưa học buổi nào nhưng tiến độ = 100%
--
-- FIX:
--   1. Trigger mới: attendance_status = NULL (chưa điểm danh)
--   2. Đổi tên trigger cũ để tránh conflict
-- ============================================================

-- BƯỚC 1: Drop trigger cũ
DROP TRIGGER IF EXISTS trg_auto_create_session_attendance ON public.sessions;
DROP FUNCTION IF EXISTS public.auto_create_session_attendance();

-- BƯỚC 2: Tạo trigger mới với attendance_status = NULL
CREATE OR REPLACE FUNCTION public.auto_create_session_attendance_v2()
RETURNS TRIGGER AS $$
BEGIN
  -- Chỉ tạo attendance record khi buổi học đã hoàn thành (DONE)
  -- Hoặc đang điểm danh (nếu muốn tạo trước)
  -- Để tránh bug 100%, KHÔNG set attendance_status mặc định
  INSERT INTO public.session_attendance
    (session_id, session_ref, student_id, session_date, class_name, student_name, attendance_status)
  SELECT
    NEW.id,
    COALESCE(NEW.class_name, '') || '#' || COALESCE(NEW.session_no::text, '') || '#' || COALESCE(NEW.session_date, '') AS session_ref,
    e.student_id,
    NEW.session_date,
    NEW.class_name,
    s.full_name,
    NULL  -- NULL = chưa điểm danh, không phải 'on_time'
  FROM public.enrollments e
  JOIN public.students s ON s.id = e.student_id
  WHERE e.class_id = NEW.class_id
  ON CONFLICT (session_ref, student_name) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_create_session_attendance_v2
  AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_session_attendance_v2();

-- BƯỚC 3: Cập nhật attendance_status = NULL cho các record được tạo tự động
-- (những buổi chưa thực sự điểm danh mà có status = 'on_time')
-- Chỉ áp dụng cho các session có status != 'DONE' (chưa hoàn thành)
UPDATE public.session_attendance
SET attendance_status = NULL
WHERE attendance_status = 'on_time'
  AND session_id IN (
    SELECT id FROM public.sessions WHERE status != 'DONE'
  );

-- ============================================================
-- Kết thúc Migration 055
-- ============================================================
