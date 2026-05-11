-- ============================================================
-- Migration 062: Mock skill submissions — thêm answers_raw, cập nhật status
-- ============================================================

-- Thêm cột answers_raw để lưu toàn bộ bài làm thô (không có đáp án tham chiếu)
ALTER TABLE public.mock_skill_submissions
  ADD COLUMN IF NOT EXISTS answers_raw JSONB,
  ADD COLUMN IF NOT EXISTS graded_at   TIMESTAMPTZ;

-- Cập nhật status constraint để hỗ trợ: pending | grading | graded | failed
-- (giữ lại processing/completed để backward compat)
ALTER TABLE public.mock_skill_submissions
  DROP CONSTRAINT IF EXISTS mock_skill_submissions_status_check;

ALTER TABLE public.mock_skill_submissions
  ADD CONSTRAINT mock_skill_submissions_status_check
  CHECK (status IN ('pending', 'processing', 'grading', 'graded', 'completed', 'failed'));

-- Index mới
CREATE INDEX IF NOT EXISTS idx_mock_skill_submissions_status
  ON public.mock_skill_submissions(status);

CREATE INDEX IF NOT EXISTS idx_mock_skill_submissions_auth_user
  ON public.mock_skill_submissions(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- RLS: Student xem bài nộp của mình
DO $$ BEGIN
  CREATE POLICY "mock_skill_submissions_own_select" ON public.mock_skill_submissions
    FOR SELECT USING (auth_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
