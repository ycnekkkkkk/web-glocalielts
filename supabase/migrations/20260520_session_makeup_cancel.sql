-- Migration: Session-level makeup & cancel
-- Date: 2026-05-20
-- 
-- Thay đổi:
-- 1. Thêm cột makeup_original_date vào sessions (lưu ngày gốc khi buổi được chuyển học bù)
-- 2. Thêm cột makeup_note vào sessions (hiển thị "Học bù từ ngày X → Y")
-- 3. Thêm cột cancelled_note, cancelled_by, cancelled_at vào sessions
-- 4. Migrate: attendance_status 'late' → 'on_time' (backward compat)

-- 1. Thêm cột cho sessions
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS makeup_original_date TEXT,
  ADD COLUMN IF NOT EXISTS makeup_note TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_note TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 2. Migrate: bỏ 'late' → 'on_time' (giữ dữ liệu cũ nhất quán)
UPDATE public.session_attendance
  SET attendance_status = 'on_time'
  WHERE attendance_status = 'late';

-- 3. Verify
SELECT 
  'sessions' as tbl,
  COUNT(*) FILTER (WHERE makeup_original_date IS NOT NULL) as makeup_sessions,
  COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL) as cancelled_sessions
FROM public.sessions;
