-- Migration 063: Add is_released to mock_skill_submissions
-- Cho phép Admin kiểm soát việc hiển thị điểm cho học viên

ALTER TABLE public.mock_skill_submissions 
ADD COLUMN IF NOT EXISTS is_released BOOLEAN DEFAULT FALSE;

-- Index để lọc nhanh các bài đã/chưa công khai
CREATE INDEX IF NOT EXISTS idx_mock_skill_submissions_released 
ON public.mock_skill_submissions(is_released);
