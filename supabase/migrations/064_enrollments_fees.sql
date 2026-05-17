-- Migration 064: Add tuition and payment columns to enrollments
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS tuition_fee NUMERIC(12,0) DEFAULT 0;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,0) DEFAULT 0;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS level_in TEXT;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS level_out TEXT;

COMMENT ON COLUMN public.enrollments.tuition_fee IS 'Học phí riêng của học viên cho lớp này';
COMMENT ON COLUMN public.enrollments.paid_amount IS 'Số tiền học viên đã đóng cho lớp này';
COMMENT ON COLUMN public.enrollments.level_in IS 'Trình độ đầu vào của học viên';
COMMENT ON COLUMN public.enrollments.level_out IS 'Mục tiêu đầu ra của học viên';
