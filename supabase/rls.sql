-- ============================================================
-- ROW LEVEL SECURITY (RLS) – Glocal IELTS LMS
-- Chạy file này SAU khi đã chạy schema_fixed.sql
-- ============================================================
-- Nguyên tắc:
--   admin       → đọc/ghi toàn bộ
--   teacher     → đọc lớp mình dạy, học viên lớp mình
--   student     → chỉ thấy data của chính mình
--   organization→ đọc như admin (báo cáo), không ghi
--   anon        → không có quyền gì (chặn hoàn toàn)
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER để tránh recursion)
-- ============================================================

-- Lấy role của user hiện tại từ profiles (bypass RLS để tránh vòng lặp)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Lấy full_name của user hiện tại (dùng để map với tên trong data)
CREATE OR REPLACE FUNCTION public.get_my_name()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name FROM public.profiles WHERE id = auth.uid();
$$;

-- Grant execute cho authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_name() TO authenticated;

-- ============================================================
-- GRANT quyền cho các role Supabase
-- (RLS sẽ lọc row, GRANT cho phép table-level access)
-- ============================================================

-- anon: không có quyền đọc data nhạy cảm
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- authenticated: được phép (RLS sẽ lọc)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================
-- 1. PROFILES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User thấy profile của chính mình
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Admin thấy tất cả profiles
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (public.get_my_role() = 'admin');

-- Organization thấy tất cả profiles (để báo cáo)
CREATE POLICY "profiles_select_org" ON public.profiles
  FOR SELECT USING (public.get_my_role() = 'organization');

-- User cập nhật profile của chính mình
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin cập nhật bất kỳ profile
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.get_my_role() = 'admin');

-- Admin insert profile (khi tạo user thủ công)
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

-- Admin xóa profile
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (public.get_my_role() = 'admin');

-- ============================================================
-- 2. CLASSES_CURRENT
-- ============================================================
ALTER TABLE public.classes_current ENABLE ROW LEVEL SECURITY;

-- Admin + org: thấy tất cả
CREATE POLICY "classes_current_select_admin_org" ON public.classes_current
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

-- Teacher: thấy các lớp mình dạy
CREATE POLICY "classes_current_select_teacher" ON public.classes_current
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND giao_vien = public.get_my_name()
  );

-- Student: thấy lớp mình học
CREATE POLICY "classes_current_select_student" ON public.classes_current
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND hoc_vien = public.get_my_name()
  );

-- Admin: ghi toàn bộ
CREATE POLICY "classes_current_insert_admin" ON public.classes_current
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "classes_current_update_admin" ON public.classes_current
  FOR UPDATE USING (public.get_my_role() = 'admin');

CREATE POLICY "classes_current_delete_admin" ON public.classes_current
  FOR DELETE USING (public.get_my_role() = 'admin');

-- ============================================================
-- 3. CLASSES_FINISHED
-- ============================================================
ALTER TABLE public.classes_finished ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classes_finished_select_admin_org" ON public.classes_finished
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

CREATE POLICY "classes_finished_select_teacher" ON public.classes_finished
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND giao_vien = public.get_my_name()
  );

CREATE POLICY "classes_finished_select_student" ON public.classes_finished
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND hoc_vien = public.get_my_name()
  );

CREATE POLICY "classes_finished_write_admin" ON public.classes_finished
  FOR ALL USING (public.get_my_role() = 'admin');

-- ============================================================
-- 4. SESSIONS (buổi học – admin quản lý)
-- ============================================================
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Admin + org: tất cả
CREATE POLICY "sessions_select_admin_org" ON public.sessions
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

-- Teacher: lớp mình dạy
CREATE POLICY "sessions_select_teacher" ON public.sessions
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND teacher_name = public.get_my_name()
  );

-- Student: lớp mình học
CREATE POLICY "sessions_select_student" ON public.sessions
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND class_name IN (
      SELECT ten_lop FROM public.classes_current
      WHERE hoc_vien = public.get_my_name()
    )
  );

CREATE POLICY "sessions_write_admin" ON public.sessions
  FOR ALL USING (public.get_my_role() = 'admin');

-- ============================================================
-- 5. SESSION_ATTENDANCE
-- ============================================================
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;

-- Admin + org: tất cả
CREATE POLICY "session_attendance_select_admin_org" ON public.session_attendance
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

-- Teacher: lớp mình dạy
CREATE POLICY "session_attendance_select_teacher" ON public.session_attendance
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND class_name IN (
      SELECT DISTINCT ten_lop FROM public.classes_current
      WHERE giao_vien = public.get_my_name()
    )
  );

-- Student: điểm danh của chính mình
CREATE POLICY "session_attendance_select_student" ON public.session_attendance
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND student_name = public.get_my_name()
  );

-- Admin + teacher: ghi điểm danh
CREATE POLICY "session_attendance_insert_admin_teacher" ON public.session_attendance
  FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));

CREATE POLICY "session_attendance_update_admin_teacher" ON public.session_attendance
  FOR UPDATE USING (public.get_my_role() IN ('admin', 'teacher'));

CREATE POLICY "session_attendance_delete_admin" ON public.session_attendance
  FOR DELETE USING (public.get_my_role() = 'admin');

-- ============================================================
-- 6. SESSION_CLASS_EVALUATION
-- ============================================================
ALTER TABLE public.session_class_evaluation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sess_class_eval_select_admin_org" ON public.session_class_evaluation
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

CREATE POLICY "sess_class_eval_select_teacher" ON public.session_class_evaluation
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND class_name IN (
      SELECT DISTINCT ten_lop FROM public.classes_current
      WHERE giao_vien = public.get_my_name()
    )
  );

CREATE POLICY "sess_class_eval_select_student" ON public.session_class_evaluation
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND class_name IN (
      SELECT ten_lop FROM public.classes_current
      WHERE hoc_vien = public.get_my_name()
    )
  );

CREATE POLICY "sess_class_eval_write_admin_teacher" ON public.session_class_evaluation
  FOR ALL USING (public.get_my_role() IN ('admin', 'teacher'));

-- ============================================================
-- 7. SESSION_STUDENT_EVALUATION
-- ============================================================
ALTER TABLE public.session_student_evaluation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sess_student_eval_select_admin_org" ON public.session_student_evaluation
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

CREATE POLICY "sess_student_eval_select_teacher" ON public.session_student_evaluation
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND session_ref IN (
      SELECT sce.session_ref FROM public.session_class_evaluation sce
      WHERE sce.class_name IN (
        SELECT DISTINCT ten_lop FROM public.classes_current
        WHERE giao_vien = public.get_my_name()
      )
    )
  );

CREATE POLICY "sess_student_eval_select_student" ON public.session_student_evaluation
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND student_name = public.get_my_name()
  );

CREATE POLICY "sess_student_eval_write_admin_teacher" ON public.session_student_evaluation
  FOR ALL USING (public.get_my_role() IN ('admin', 'teacher'));

-- ============================================================
-- 8. ATTENDANCE_MAKEUP
-- ============================================================
ALTER TABLE public.attendance_makeup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_makeup_select_admin_org" ON public.attendance_makeup
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

CREATE POLICY "attendance_makeup_select_teacher" ON public.attendance_makeup
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND session_ref IN (
      SELECT sa.session_ref FROM public.session_attendance sa
      WHERE sa.class_name IN (
        SELECT DISTINCT ten_lop FROM public.classes_current
        WHERE giao_vien = public.get_my_name()
      )
    )
  );

CREATE POLICY "attendance_makeup_select_student" ON public.attendance_makeup
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND student_name = public.get_my_name()
  );

CREATE POLICY "attendance_makeup_write_admin_teacher" ON public.attendance_makeup
  FOR ALL USING (public.get_my_role() IN ('admin', 'teacher'));

-- ============================================================
-- 9. ASSIGNMENT_GRADES
-- ============================================================
ALTER TABLE public.assignment_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignment_grades_select_admin_org" ON public.assignment_grades
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

-- Teacher: xem bài của học viên trong lớp mình
CREATE POLICY "assignment_grades_select_teacher" ON public.assignment_grades
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND course_name IN (
      SELECT DISTINCT ten_lop FROM public.classes_current
      WHERE giao_vien = public.get_my_name()
    )
  );

-- Student: chỉ xem bài của chính mình
CREATE POLICY "assignment_grades_select_student" ON public.assignment_grades
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND student_name = public.get_my_name()
  );

-- Teacher: chấm bài (insert/update)
CREATE POLICY "assignment_grades_insert_admin_teacher" ON public.assignment_grades
  FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));

CREATE POLICY "assignment_grades_update_admin_teacher" ON public.assignment_grades
  FOR UPDATE USING (public.get_my_role() IN ('admin', 'teacher'));

CREATE POLICY "assignment_grades_delete_admin" ON public.assignment_grades
  FOR DELETE USING (public.get_my_role() = 'admin');

-- ============================================================
-- 10. INVOICES
-- ============================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select_admin_org" ON public.invoices
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

-- Student: xem hoá đơn của chính mình
CREATE POLICY "invoices_select_student" ON public.invoices
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND student_name = public.get_my_name()
  );

CREATE POLICY "invoices_write_admin" ON public.invoices
  FOR ALL USING (public.get_my_role() = 'admin');

-- ============================================================
-- 11. STUDENT_EXAMS
-- ============================================================
ALTER TABLE public.student_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_exams_select_admin_org" ON public.student_exams
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

CREATE POLICY "student_exams_select_teacher" ON public.student_exams
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND class_name IN (
      SELECT DISTINCT ten_lop FROM public.classes_current
      WHERE giao_vien = public.get_my_name()
    )
  );

CREATE POLICY "student_exams_select_student" ON public.student_exams
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND class_name IN (
      SELECT ten_lop FROM public.classes_current
      WHERE hoc_vien = public.get_my_name()
    )
  );

CREATE POLICY "student_exams_write_admin_teacher" ON public.student_exams
  FOR ALL USING (public.get_my_role() IN ('admin', 'teacher'));

-- ============================================================
-- 12. STUDENT_ACHIEVEMENTS
-- ============================================================
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_achievements_select_admin_org" ON public.student_achievements
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

CREATE POLICY "student_achievements_select_student" ON public.student_achievements
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND student_name = public.get_my_name()
  );

CREATE POLICY "student_achievements_write_admin_teacher" ON public.student_achievements
  FOR ALL USING (public.get_my_role() IN ('admin', 'teacher'));

-- ============================================================
-- 13. TEACHERS
-- ============================================================
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Admin: tất cả
CREATE POLICY "teachers_select_admin_org" ON public.teachers
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

-- Teacher: thấy thông tin của chính mình
CREATE POLICY "teachers_select_own" ON public.teachers
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND name = public.get_my_name()
  );

CREATE POLICY "teachers_write_admin" ON public.teachers
  FOR ALL USING (public.get_my_role() = 'admin');

-- ============================================================
-- 14. MONTHLY_FINANCIALS (chỉ admin + org)
-- ============================================================
ALTER TABLE public.monthly_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_financials_select_admin_org" ON public.monthly_financials
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

CREATE POLICY "monthly_financials_write_admin" ON public.monthly_financials
  FOR ALL USING (public.get_my_role() = 'admin');

-- ============================================================
-- 15. TRANSACTIONS (chỉ admin + org)
-- ============================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_admin_org" ON public.transactions
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

CREATE POLICY "transactions_write_admin" ON public.transactions
  FOR ALL USING (public.get_my_role() = 'admin');

-- ============================================================
-- 16. TOP_COURSES (chỉ admin + org)
-- ============================================================
ALTER TABLE public.top_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "top_courses_select_admin_org" ON public.top_courses
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

CREATE POLICY "top_courses_write_admin" ON public.top_courses
  FOR ALL USING (public.get_my_role() = 'admin');

-- ============================================================
-- 17. CLASS_PROGRESS
-- ============================================================
ALTER TABLE public.class_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_progress_select_admin_org" ON public.class_progress
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

CREATE POLICY "class_progress_select_teacher" ON public.class_progress
  FOR SELECT USING (
    public.get_my_role() = 'teacher'
    AND giao_vien = public.get_my_name()
  );

CREATE POLICY "class_progress_select_student" ON public.class_progress
  FOR SELECT USING (
    public.get_my_role() = 'student'
    AND hoc_vien = public.get_my_name()
  );

CREATE POLICY "class_progress_write_admin" ON public.class_progress
  FOR ALL USING (public.get_my_role() = 'admin');

-- ============================================================
-- 18. DATA_TU_VAN (chỉ admin + org – data tư vấn nhạy cảm)
-- ============================================================
ALTER TABLE public.data_tu_van ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_tu_van_select_admin_org" ON public.data_tu_van
  FOR SELECT USING (public.get_my_role() IN ('admin', 'organization'));

CREATE POLICY "data_tu_van_write_admin" ON public.data_tu_van
  FOR ALL USING (public.get_my_role() = 'admin');

-- ============================================================
-- 19. VIEWS – Bảo vệ bằng security_invoker = true
-- Views sẽ kiểm tra RLS của user gọi (không bypass như mặc định)
-- ============================================================

-- v_classes_ui
CREATE OR REPLACE VIEW public.v_classes_ui
WITH (security_invoker = true)
AS
SELECT
  id, stt,
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

-- v_students_from_classes
CREATE OR REPLACE VIEW public.v_students_from_classes
WITH (security_invoker = true)
AS
SELECT
  id, ten_lop,
  hoc_vien AS name,
  so_dien_thoai AS phone,
  email,
  thong_tin_phu_huynh AS parent_info,
  giao_vien,
  tinh_trang AS status,
  hoc_phi_tong AS tuition,
  hoc_phi_da_thu AS paid,
  hoc_phi_chua_thu AS debt
FROM public.classes_current
WHERE hoc_vien IS NOT NULL AND TRIM(hoc_vien) <> '';

-- v_teachers
CREATE OR REPLACE VIEW public.v_teachers
WITH (security_invoker = true)
AS
SELECT
  giao_vien AS name,
  COUNT(DISTINCT ten_lop) AS classes_count,
  STRING_AGG(DISTINCT ten_lop, ', ' ORDER BY ten_lop) AS classes
FROM public.classes_current
WHERE giao_vien IS NOT NULL AND TRIM(giao_vien) <> ''
GROUP BY giao_vien;

-- Grant views cho authenticated users
GRANT SELECT ON public.v_classes_ui TO authenticated;
GRANT SELECT ON public.v_students_from_classes TO authenticated;
GRANT SELECT ON public.v_teachers TO authenticated;

-- ============================================================
-- KIỂM TRA (chạy sau để xác nhận RLS đã bật)
-- ============================================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- Tất cả bảng phải có rowsecurity = true

-- ============================================================
-- GHI CHÚ VỀ RPC FUNCTIONS:
-- Các hàm SECURITY DEFINER (get_session_attendance_safe, v.v.)
-- chạy với quyền postgres, bypass RLS.
-- Chúng đã được thiết kế để filter theo param – an toàn.
-- Nếu muốn strict hơn, đổi thành SECURITY INVOKER.
-- ============================================================
