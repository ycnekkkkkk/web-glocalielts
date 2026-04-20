-- ============================================
-- AG-preview - Schema theo file "AS - 2026 _ Quản lý chung.xlsx"
-- Chạy trong Supabase SQL Editor
-- ============================================
--
-- KIỂM TRA KHI DỮ LIỆU KHÔNG KHỚP APP:
-- 1. session_attendance.session_ref = class_name || '#' || session_no || '#' || session_date
--    (class_name phải trùng với classes_current.ten_lop, kể cả dấu – en-dash)
-- 2. session_attendance.class_name = classes_current.ten_lop (cùng chuỗi, trim khoảng trắng)
-- 3. session_date dạng dd/MM/yyyy (vd: 12/03/2026)
-- 4. student_name trong session_attendance = hoc_vien trong classes_current (tên HV)
--

-- Bảng profiles (auth users mở rộng)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student', 'organization')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 0. TIẾN ĐỘ CÁC LỚP (Class progress)
-- ============================================
CREATE TABLE IF NOT EXISTS public.class_progress (
  id SERIAL PRIMARY KEY,
  stt NUMERIC,
  phan_lop TEXT,
  ten_lop TEXT,
  hoc_vien TEXT,
  giao_vien TEXT,
  tro_giang TEXT,
  nhom_ph TEXT,
  tinh_trang TEXT,
  da_hoc NUMERIC,
  tong_so_buoi NUMERIC,
  test_t1 BOOLEAN,
  test_t2 BOOLEAN,
  test_t3 BOOLEAN,
  test_t4 BOOLEAN,
  test_t5 BOOLEAN,
  test_t6 BOOLEAN,
  dau_vao TEXT,
  dau_ra TEXT,
  cong_viec TEXT,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DATA TƯ VẤN (Consultation / Leads)
-- ============================================
CREATE TABLE IF NOT EXISTS public.data_tu_van (
  id SERIAL PRIMARY KEY,
  giai_doan TEXT,
  stt NUMERIC,
  hoc_vien TEXT,
  tinh_trang TEXT,
  nam_sinh NUMERIC,
  sdt TEXT,
  email TEXT,
  phu_huynh TEXT,
  sdt_phu_huynh TEXT,
  dia_chi TEXT,
  nguon TEXT,
  nguoi_lien_he TEXT,
  nhu_cau TEXT,
  tham_gia_lop TEXT,
  ghi_chu TEXT,
  hoc_phi NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 1. LỚP HIỆN TẠI (Current classes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.classes_current (
  id SERIAL PRIMARY KEY,
  stt NUMERIC,
  ten_lop TEXT NOT NULL,
  tinh_trang TEXT,
  hoc_vien TEXT,
  so_dien_thoai TEXT,
  email TEXT,
  thong_tin_phu_huynh TEXT,
  nhom_phu_huynh TEXT,
  nhom_lop TEXT,
  giao_vien TEXT,
  thoi_luong TEXT,
  bat_dau TIMESTAMPTZ,
  ket_thuc TEXT,
  hoc_phi_tong NUMERIC,
  so_dot_dong TEXT,
  hoc_phi_da_thu NUMERIC,
  hoc_phi_chua_thu NUMERIC,
  hinh_thuc TEXT,
  so_buoi TEXT,
  lich_hoc TEXT,
  dau_vao TEXT,
  dau_ra TEXT,
  luu_y TEXT,
  tinh_hinh_hien_tai TEXT,
  can_thu_hoc_phi TEXT,
  bao_cao_bchl TEXT,
  invoice TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. LỚP ĐÃ KẾT THÚC (Finished classes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.classes_finished (
  id SERIAL PRIMARY KEY,
  stt NUMERIC,
  ten_lop TEXT,
  quy_mo NUMERIC,
  hoc_vien TEXT,
  so_dien_thoai TEXT,
  email TEXT,
  giao_vien TEXT,
  thoi_luong TEXT,
  bat_dau TIMESTAMPTZ,
  ket_thuc TEXT,
  hoc_phi NUMERIC,
  tinh_trang_hoc_phi TEXT,
  hinh_thuc TEXT,
  lich_hoc TEXT,
  dau_vao TEXT,
  dau_ra TEXT,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Bảng hỗ trợ UI (financials, courses nếu cần)
-- ============================================
CREATE TABLE IF NOT EXISTS public.monthly_financials (
  id SERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  year INT DEFAULT 2026,
  revenue NUMERIC(12, 0) DEFAULT 0,
  expense NUMERIC(12, 0) DEFAULT 0,
  profit NUMERIC(12, 0) DEFAULT 0,
  UNIQUE(month, year)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_name TEXT,
  course_name TEXT,
  amount NUMERIC(12, 0),
  amount_display TEXT,
  type TEXT CHECK (type IN ('purchase', 'refund')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.top_courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  revenue_display TEXT,
  students INT DEFAULT 0,
  trend NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View: Lớp hiện tại dạng gọn cho UI (map với trang Classes)
CREATE OR REPLACE VIEW public.v_classes_ui AS
SELECT
  id,
  stt,
  ten_lop AS name,
  tinh_trang AS status,
  hoc_vien AS student_name,
  giao_vien AS teacher,
  CASE WHEN nhom_lop LIKE '%1:1%' OR (nhom_lop IS NULL AND ten_lop ~ '^[A-Z]+[0-9]+') THEN '1:1' ELSE 'Nhóm' END AS type,
  so_buoi AS sessions_display,
  lich_hoc AS schedule,
  dau_vao AS level_in,
  dau_ra AS level_out,
  bat_dau AS start_date,
  ket_thuc AS end_date,
  hoc_phi_da_thu,
  hoc_phi_chua_thu
FROM public.classes_current;

-- View: Học viên từ lớp hiện tại (1 row = 1 lớp, cột hoc_vien = tên học viên)
CREATE OR REPLACE VIEW public.v_students_from_classes AS
SELECT id, ten_lop, hoc_vien AS name, so_dien_thoai AS phone, email,
  thong_tin_phu_huynh AS parent_info, giao_vien, tinh_trang AS status,
  hoc_phi_tong AS tuition, hoc_phi_da_thu AS paid, hoc_phi_chua_thu AS debt
FROM public.classes_current
WHERE hoc_vien IS NOT NULL AND TRIM(hoc_vien) <> '';

-- ============================================
-- Bài nộp & Chấm điểm (liên kết GV – HV demo)
-- ============================================
CREATE TABLE IF NOT EXISTS public.assignment_grades (
  id SERIAL PRIMARY KEY,
  student_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  assignment_title TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'graded')),
  grade TEXT,
  score NUMERIC(5, 2),
  comment TEXT,
  graded_by TEXT,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dữ liệu mẫu: bài chờ chấm + đã chấm. Học viên demo = Trần Minh Khoa, GV demo = Nguyễn Thị Lan.
-- Khi GV chấm bài của "Trần Minh Khoa" → HV đăng nhập demo sẽ thấy điểm tại Dashboard.
INSERT INTO public.assignment_grades (student_name, course_name, assignment_title, submitted_at, status, grade, score, comment, graded_by, graded_at) VALUES
  ('Trần Minh Khoa', 'IELTS Nhóm – Band 7.0 (Tối)', 'Writing Task 2 – In-class (Discussion Essay)', NOW() - INTERVAL '1 hour', 'pending', NULL, NULL, NULL, NULL, NULL),
  ('Hoàng Thu Thảo', 'IELTS Nhóm – Band 7.0 (Tối)', 'Writing Task 2 – Advantages & Disadvantages Essay', NOW() - INTERVAL '2 hours', 'pending', NULL, NULL, NULL, NULL, NULL),
  ('Đinh Văn Khải', 'IELTS Nhóm – Band 7.0 (Tối)', 'Writing Task 1 – Line Graph Report', NOW() - INTERVAL '5 hours', 'pending', NULL, NULL, NULL, NULL, NULL),
  ('Trần Minh Khoa', 'IELTS Nhóm – Band 7.0 (Tối)', 'Full Mock Test #2 – Cambridge IELTS 17', NOW() - INTERVAL '1 day', 'graded', 'A', 87, 'Bài làm tốt, cần cải thiện phần Writing.', 'Nguyễn Thị Lan', NOW() - INTERVAL '1 day'),
  ('Trần Minh Khoa', 'IELTS Nhóm – Band 7.0 (Tối)', 'Listening Practice – Section 3 & 4', NOW() - INTERVAL '3 days', 'graded', 'B+', 82, 'Tiến bộ rõ so với tuần trước.', 'Nguyễn Thị Lan', NOW() - INTERVAL '3 days');

-- ============================================
-- Điểm danh buổi học (đầu slot) – tách riêng với đánh giá (cuối giờ)
-- attendance_status: on_time = đúng giờ, late = đi trễ, absent = vắng
-- ============================================
CREATE TABLE IF NOT EXISTS public.session_attendance (
  id SERIAL PRIMARY KEY,
  session_ref TEXT NOT NULL,
  class_name TEXT NOT NULL,
  session_no INT,
  session_date TEXT,
  student_name TEXT NOT NULL,
  attendance_status TEXT NOT NULL DEFAULT 'on_time' CHECK (attendance_status IN ('on_time', 'late', 'absent')),
  marked_by TEXT,
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_ref, student_name)
);

-- Migration: nếu bảng cũ có cột present thì chuyển sang attendance_status rồi xóa present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'session_attendance' AND column_name = 'present') THEN
    ALTER TABLE public.session_attendance ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT 'on_time';
    UPDATE public.session_attendance SET attendance_status = CASE WHEN present THEN 'on_time' ELSE 'absent' END WHERE attendance_status IS NULL OR attendance_status = '';
    ALTER TABLE public.session_attendance DROP COLUMN IF EXISTS present;
    ALTER TABLE public.session_attendance ALTER COLUMN attendance_status SET NOT NULL;
    ALTER TABLE public.session_attendance ALTER COLUMN attendance_status SET DEFAULT 'on_time';
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_attendance_attendance_status_check') THEN
      ALTER TABLE public.session_attendance ADD CONSTRAINT session_attendance_attendance_status_check CHECK (attendance_status IN ('on_time', 'late', 'absent'));
    END IF;
  END IF;
END $$;

-- session_ref format: class_name#session_no#session_date (dd/MM/yyyy). Dùng đúng format để app query khớp.
COMMENT ON COLUMN public.session_attendance.session_ref IS 'Format: class_name#session_no#session_date (vd: IELTS Nhóm – Band 7.0 (Tối)#14#12/03/2026). Không thêm khoảng trắng thừa.';

CREATE INDEX IF NOT EXISTS idx_session_attendance_session_ref ON public.session_attendance(session_ref);
CREATE INDEX IF NOT EXISTS idx_session_attendance_class_session ON public.session_attendance(class_name, session_no, session_date);

-- RPC: Tránh 400 Bad Request khi filter với ký tự đặc biệt ((), #, /, –) trong session_ref/class_name
CREATE OR REPLACE FUNCTION public.get_session_attendance_safe(
  p_session_ref TEXT DEFAULT NULL,
  p_class_name TEXT DEFAULT NULL,
  p_session_no INT DEFAULT NULL,
  p_session_date TEXT DEFAULT NULL
)
RETURNS TABLE (
  student_name TEXT,
  attendance_status TEXT,
  present BOOLEAN,
  session_ref TEXT,
  session_no INT,
  session_date TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sa.student_name, sa.attendance_status, NULL::boolean AS present, sa.session_ref, sa.session_no, sa.session_date
  FROM session_attendance sa
  WHERE (p_session_ref IS NOT NULL AND sa.session_ref = p_session_ref)
     OR (p_class_name IS NOT NULL AND p_session_no IS NOT NULL AND p_session_date IS NOT NULL
         AND sa.class_name = p_class_name AND sa.session_no = p_session_no AND sa.session_date = p_session_date)
  LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.get_session_attendance_by_classes(p_class_names TEXT[])
RETURNS TABLE (session_ref TEXT, student_name TEXT, attendance_status TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sa.session_ref, sa.student_name, sa.attendance_status
  FROM session_attendance sa
  WHERE sa.class_name = ANY(p_class_names)
  LIMIT 1000;
$$;

CREATE OR REPLACE FUNCTION public.get_session_class_eval_safe(p_session_ref TEXT DEFAULT NULL, p_class_name TEXT DEFAULT NULL, p_session_no INT DEFAULT NULL, p_session_date TEXT DEFAULT NULL)
RETURNS TABLE (rating NUMERIC, comment TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT rating, comment FROM session_class_evaluation
  WHERE (p_session_ref IS NOT NULL AND session_ref = p_session_ref)
     OR (p_class_name IS NOT NULL AND p_session_no IS NOT NULL AND p_session_date IS NOT NULL
         AND class_name = p_class_name AND session_no = p_session_no AND session_date = p_session_date)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_session_student_evals_safe(p_session_ref TEXT)
RETURNS TABLE (student_name TEXT, rating NUMERIC, comment TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT student_name, rating, comment FROM session_student_evaluation WHERE session_ref = p_session_ref LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.get_attendance_makeup_safe(p_session_ref TEXT)
RETURNS TABLE (student_name TEXT, makeup_type TEXT, target_session_ref TEXT, note TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT student_name, makeup_type, target_session_ref, note FROM attendance_makeup WHERE session_ref = p_session_ref LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.get_evaluated_session_refs(p_class_names TEXT[])
RETURNS TABLE (session_ref TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT session_ref FROM session_class_evaluation WHERE class_name = ANY(p_class_names) LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.get_students_by_classes(p_ten_lop TEXT[], p_giao_vien TEXT DEFAULT NULL)
RETURNS TABLE (hoc_vien TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT cc.hoc_vien FROM classes_current cc
  WHERE cc.ten_lop = ANY(p_ten_lop) AND cc.hoc_vien IS NOT NULL AND TRIM(cc.hoc_vien) <> ''
    AND (p_giao_vien IS NULL OR cc.giao_vien = p_giao_vien);
$$;

-- Mẫu: Trần Minh Khoa đúng giờ buổi 14, vắng buổi 13 (session_ref phải trùng format với app: ten_lop#no#date)
INSERT INTO public.session_attendance (session_ref, class_name, session_no, session_date, student_name, attendance_status, marked_by, marked_at) VALUES
  ('IELTS Nhóm – Band 7.0 (Tối)#14#12/03/2026', 'IELTS Nhóm – Band 7.0 (Tối)', 14, '12/03/2026', 'Trần Minh Khoa', 'on_time', 'Lê Thị Phương', NOW() - INTERVAL '2 days'),
  ('IELTS Nhóm – Band 7.0 (Tối)#13#10/03/2026', 'IELTS Nhóm – Band 7.0 (Tối)', 13, '10/03/2026', 'Trần Minh Khoa', 'absent', 'Lê Thị Phương', NOW() - INTERVAL '4 days')
ON CONFLICT (session_ref, student_name) DO NOTHING;

-- ============================================
-- Đánh giá buổi học: cả lớp + từng học viên (sau mỗi tiết)
-- ============================================
CREATE TABLE IF NOT EXISTS public.session_class_evaluation (
  id SERIAL PRIMARY KEY,
  session_ref TEXT NOT NULL UNIQUE,
  class_name TEXT NOT NULL,
  session_no INT,
  session_date TEXT,
  rating NUMERIC(2, 1) CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  evaluated_by TEXT,
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.session_student_evaluation (
  id SERIAL PRIMARY KEY,
  session_ref TEXT NOT NULL,
  student_name TEXT NOT NULL,
  rating NUMERIC(2, 1) CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  evaluated_by TEXT,
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_ref, student_name)
);

-- ============================================
-- Bù học (khi HV vắng, GV chấp nhận bù)
-- Lớp nhóm: bù vào lớp tương tự (chọn buổi) HOẶC bù vào buổi khác (ghi chú)
-- Lớp 1:1: chỉ bù vào buổi khác (ghi chú), không bù sang lớp 1:1 khác
-- ============================================
CREATE TABLE IF NOT EXISTS public.attendance_makeup (
  session_ref TEXT NOT NULL,
  student_name TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  makeup_type TEXT NOT NULL CHECK (makeup_type IN ('similar_group', 'other_session')),
  target_session_ref TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (session_ref, student_name)
);

COMMENT ON COLUMN public.attendance_makeup.makeup_type IS 'similar_group: bù vào lớp nhóm tương tự (chọn buổi); other_session: bù vào buổi khác (ghi chú)';
COMMENT ON COLUMN public.attendance_makeup.target_session_ref IS 'Chỉ dùng khi makeup_type = similar_group: buổi sẽ đi bù (class#no#date)';
COMMENT ON COLUMN public.attendance_makeup.note IS 'Ghi chú buổi bù, bắt buộc khi makeup_type = other_session hoặc bù 1:1';

-- ============================================
-- Buổi học (sessions) – Admin quản lý
-- ============================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id SERIAL PRIMARY KEY,
  class_name TEXT NOT NULL,
  session_no INT,
  session_date TEXT,
  session_time TEXT,
  topic TEXT,
  homework TEXT,
  status TEXT DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'DONE', 'CANCELLED')),
  teacher_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Hoá đơn (invoices)
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id SERIAL PRIMARY KEY,
  invoice_no TEXT UNIQUE,
  student_name TEXT,
  class_name TEXT,
  amount NUMERIC(12, 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng kỳ thi / bài kiểm tra (theo lớp – HV thấy thi của lớp mình)
CREATE TABLE IF NOT EXISTS public.student_exams (
  id SERIAL PRIMARY KEY,
  class_name TEXT NOT NULL,
  title TEXT NOT NULL,
  exam_date TEXT,
  difficulty TEXT DEFAULT 'Trung bình' CHECK (difficulty IN ('Dễ', 'Trung bình', 'Khó')),
  questions_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng thành tích học viên (admin/GV gán hoặc hệ thống tự cấp)
CREATE TABLE IF NOT EXISTS public.student_achievements (
  id SERIAL PRIMARY KEY,
  student_name TEXT NOT NULL,
  icon TEXT DEFAULT '🏆',
  label TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng teachers: danh sách giáo viên (admin thêm mới)
-- name phải khớp với giao_vien trong classes_current để hiển thị lớp trên trang giảng viên
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subject TEXT DEFAULT 'IELTS & Giao Tiếp',
  salary NUMERIC(12, 0) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC: Lấy danh sách tên GV (teachers + giao_vien từ classes_current)
CREATE OR REPLACE FUNCTION public.get_teacher_names()
RETURNS TABLE (name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT name FROM teachers WHERE name IS NOT NULL AND TRIM(name) <> ''
  UNION
  SELECT DISTINCT giao_vien FROM classes_current WHERE giao_vien IS NOT NULL AND TRIM(giao_vien) <> ''
  ORDER BY name;
$$;

-- View: Giáo viên (từ lớp hiện tại) – classes_count = số lớp (DISTINCT ten_lop)
CREATE OR REPLACE VIEW public.v_teachers AS
SELECT
  giao_vien AS name,
  COUNT(DISTINCT ten_lop) AS classes_count,
  STRING_AGG(DISTINCT ten_lop, ', ' ORDER BY ten_lop) AS classes
FROM public.classes_current
WHERE giao_vien IS NOT NULL AND TRIM(giao_vien) <> ''
GROUP BY giao_vien;

-- Seed: Financials (nếu chưa có dữ liệu)
INSERT INTO public.monthly_financials (month, year, revenue, expense, profit)
SELECT * FROM (VALUES
  ('T1', 2026, 42, 18, 24), ('T2', 2026, 55, 22, 33), ('T3', 2026, 48, 19, 29), ('T4', 2026, 70, 28, 42),
  ('T5', 2026, 65, 25, 40), ('T6', 2026, 88, 32, 56), ('T7', 2026, 95, 35, 60), ('T8', 2026, 82, 30, 52),
  ('T9', 2026, 110, 40, 70), ('T10', 2026, 98, 36, 62), ('T11', 2026, 125, 45, 80), ('T12', 2026, 142, 52, 90)
) AS v(month, year, revenue, expense, profit)
ON CONFLICT (month, year) DO NOTHING;

INSERT INTO public.transactions (id, user_name, course_name, amount, amount_display, type)
SELECT * FROM (VALUES
  ('TXN-001', 'Nguyễn Văn A', 'React Masterclass', 1200000, '+1.200.000đ', 'purchase'),
  ('TXN-002', 'Trần Thị B', 'Python Data Science', 1500000, '+1.500.000đ', 'purchase'),
  ('TXN-003', 'Lê Văn C', 'Refund: UI/UX Course', -900000, '-900.000đ', 'refund'),
  ('TXN-004', 'Phạm Thị D', 'Machine Learning', 2000000, '+2.000.000đ', 'purchase'),
  ('TXN-005', 'Hoàng Văn E', 'Digital Marketing', 800000, '+800.000đ', 'purchase'),
  ('TXN-006', 'Vũ Thị F', 'Business Strategy', 650000, '+650.000đ', 'purchase')
) AS v(id, user_name, course_name, amount, amount_display, type)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.top_courses (title, revenue_display, students, trend)
SELECT * FROM (VALUES
  ('React Masterclass', '45.6M', 234, 12), ('Python Data Science', '38.2M', 189, 8),
  ('Machine Learning', '32.0M', 156, 24), ('UI/UX Design', '28.4M', 143, -3), ('Digital Marketing', '22.1M', 119, 15)
) AS v(title, revenue_display, students, trend)
WHERE NOT EXISTS (SELECT 1 FROM public.top_courses LIMIT 1);

-- Seed: Mẫu hoá đơn (idempotent: chạy lại không trùng invoice_no)
INSERT INTO public.invoices (invoice_no, student_name, class_name, amount, status, due_date)
SELECT * FROM (VALUES
  ('INV-2026-001', 'Trần Minh Khoa', 'IELTS Nhóm – Band 7.0 (Tối)', 4500000::numeric, 'paid', '2026-01-15'::date),
  ('INV-2026-002', 'Phan Thị Mai Anh', 'IELTS Nhóm – Band 7.0 (Tối)', 4500000::numeric, 'pending', '2026-03-20'::date),
  ('INV-2026-003', 'Lê Hoàng Phúc', 'IELTS Nhóm – Band 6.5 (Sáng)', 2250000::numeric, 'overdue', '2026-02-28'::date)
) AS v(invoice_no, student_name, class_name, amount, status, due_date)
ON CONFLICT (invoice_no) DO NOTHING;

-- Seed: Mẫu buổi học (sessions) – Lịch T2, T4, T6 cho IELTS 7.0 – GV Nguyễn Thị Lan
INSERT INTO public.sessions (class_name, session_no, session_date, session_time, topic, homework, status, teacher_name)
SELECT * FROM (VALUES
  ('IELTS Nhóm – Band 7.0 (Tối)', 14, '11/03/2026', '19:30 – 21:00', 'Speaking Part 3 – Expressing Opinions', 'Luyện Speaking topics', 'DONE', 'Nguyễn Thị Lan'),
  ('IELTS Nhóm – Band 7.0 (Tối)', 15, '13/03/2026', '19:30 – 21:00', 'Writing Task 2 – Advantages & Disadvantages Essay', 'Viết Task 2 về Education Technology', 'UPCOMING', 'Nguyễn Thị Lan')
) AS v(class_name, session_no, session_date, session_time, topic, homework, status, teacher_name)
WHERE NOT EXISTS (SELECT 1 FROM public.sessions LIMIT 1);

-- Seed: Lớp cho tài khoản demo giáo viên "Nguyễn Thị Lan" (8 HV lớp IELTS 7.0 + 1 HV Giao Tiếp)
INSERT INTO public.classes_current (ten_lop, tinh_trang, hoc_vien, giao_vien, nhom_lop, so_buoi, lich_hoc, dau_vao, dau_ra, hoc_phi_tong, bat_dau, ket_thuc)
SELECT * FROM (VALUES
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Trần Minh Khoa', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026'),
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Nguyễn Minh Tuấn', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026'),
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Trần Thị Lan Anh', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026'),
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Lê Hoàng Phúc', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026'),
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Phan Thị Mai Anh', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026'),
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Đỗ Tuấn Kiệt', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026'),
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Vũ Thị Kim Ngân', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026'),
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Đinh Văn Khải', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026'),
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Hoàng Thu Thảo', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026'),
  ('Giao Tiếp Nhóm A1 – Chiều', 'Đang học', 'Đỗ Tuấn Kiệt', 'Nguyễn Thị Lan', 'Nhóm', '20', 'T3, T5 – 15:00', 'Starter', '–', 3200000::numeric, '2026-03-10'::timestamptz, '30/06/2026')
) AS v(ten_lop, tinh_trang, hoc_vien, giao_vien, nhom_lop, so_buoi, lich_hoc, dau_vao, dau_ra, hoc_phi_tong, bat_dau, ket_thuc)
WHERE NOT EXISTS (SELECT 1 FROM public.classes_current WHERE giao_vien = 'Nguyễn Thị Lan' LIMIT 1);

-- Thêm 5 học viên nữa vào lớp IELTS Nhóm – Band 7.0 (Tối) của cô Nguyễn Thị Lan (chỉ thêm nếu chưa có)
INSERT INTO public.classes_current (ten_lop, tinh_trang, hoc_vien, giao_vien, nhom_lop, so_buoi, lich_hoc, dau_vao, dau_ra, hoc_phi_tong, bat_dau, ket_thuc)
SELECT v.ten_lop, v.tinh_trang, v.hoc_vien, v.giao_vien, v.nhom_lop, v.so_buoi, v.lich_hoc, v.dau_vao, v.dau_ra, v.hoc_phi_tong, v.bat_dau, v.ket_thuc
FROM (VALUES
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Bùi Văn Hùng', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026'),
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Ngô Thị Hương', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026'),
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Trịnh Minh Đức', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026'),
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Lý Thị Thanh', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026'),
  ('IELTS Nhóm – Band 7.0 (Tối)', 'Đang học', 'Phùng Quốc Bảo', 'Nguyễn Thị Lan', 'Nhóm', '36', 'T2, T4, T6 – 19:30', 'IELTS 6.0–7.0', '7.0', 4500000::numeric, '2026-01-05'::timestamptz, '30/06/2026')
) AS v(ten_lop, tinh_trang, hoc_vien, giao_vien, nhom_lop, so_buoi, lich_hoc, dau_vao, dau_ra, hoc_phi_tong, bat_dau, ket_thuc)
WHERE NOT EXISTS (SELECT 1 FROM public.classes_current c WHERE c.ten_lop = v.ten_lop AND c.giao_vien = v.giao_vien AND c.hoc_vien = v.hoc_vien);
