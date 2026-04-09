-- ============================================================
-- Migration 024: Hồ sơ học viên lần đầu đăng nhập
-- - Thêm các trường thông tin cá nhân
-- - Cho phép học viên tự cập nhật hồ sơ của chính mình
-- ============================================================

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS current_address TEXT,
  ADD COLUMN IF NOT EXISTS current_status TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Không làm gián đoạn user cũ: đánh dấu đã hoàn tất cho dữ liệu hiện hữu.
UPDATE public.students
SET profile_completed = TRUE
WHERE created_at < NOW();

-- Học viên tự cập nhật hồ sơ của bản thân.
DO $$
BEGIN
  CREATE POLICY "students_self_update"
    ON public.students
    FOR UPDATE
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
