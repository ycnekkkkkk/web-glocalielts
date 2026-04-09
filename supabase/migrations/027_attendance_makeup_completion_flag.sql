ALTER TABLE public.attendance_makeup
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by TEXT;

UPDATE public.attendance_makeup
SET is_completed = COALESCE(is_completed, FALSE)
WHERE is_completed IS NULL;
