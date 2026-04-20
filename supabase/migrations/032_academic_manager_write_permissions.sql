-- ============================================================
-- Migration 032: Academic Manager WRITE Permissions
-- ============================================================
-- Mục tiêu: Cấp quyền Mở lớp mới, Thêm/Xóa/Sửa Học viên & Giáo viên
-- cho role 'academic_manager' (hiện tại chỉ có read-only).
-- Chỉ cho phép thao tác trên các lớp được gán qua academic_manager_class_assignments.
-- ============================================================

-- ── 1. CLASSES — WRITE (INSERT/UPDATE/DELETE) ───────────────────
-- Academic manager có thể INSERT lớp nếu họ thuộc organization đó.
-- Sau khi tạo, lớp sẽ được gán cho academic_manager qua assignments (bởi admin hoặc tự động).
DO $$ BEGIN
  CREATE POLICY "classes_insert_academic_manager" ON public.classes
    FOR INSERT WITH CHECK (
      public.get_my_role() = 'academic_manager'
      AND organization_id IN (
        SELECT organization_id FROM public.organization_users
        WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "classes_update_academic_manager" ON public.classes
    FOR UPDATE USING (
      public.get_my_role() = 'academic_manager'
      AND id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "classes_delete_academic_manager" ON public.classes
    FOR DELETE USING (
      public.get_my_role() = 'academic_manager'
      AND id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. ENROLLMENTS — Thêm/Xóa học viên vào lớp ───────────────────
-- Academic manager có thể thêm/xóa enrollment vào lớp họ quản lý.
DO $$ BEGIN
  CREATE POLICY "enrollments_insert_academic_manager" ON public.enrollments
    FOR INSERT WITH CHECK (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "enrollments_delete_academic_manager" ON public.enrollments
    FOR DELETE USING (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- UPDATE trên enrollments cho phép cập nhật status (active/completed/dropped)
DO $$ BEGIN
  CREATE POLICY "enrollments_update_academic_manager" ON public.enrollments
    FOR UPDATE USING (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. STUDENTS — Quản lý học viên (FULL CRUD) ─────────────────────────
-- Academic manager có thể CREATE, READ, UPDATE, DELETE học viên thuộc lớp mình quản lý.
-- Đọc đã có policies từ migration 008 & 013.
-- INSERT: Cho phép academic_manager tạo học viên mới (organization_id phải thuộc organization của họ)
DO $$ BEGIN
  CREATE POLICY "students_insert_academic_manager" ON public.students
    FOR INSERT WITH CHECK (
      public.get_my_role() = 'academic_manager'
      AND organization_id IN (
        SELECT organization_id FROM public.organization_users
        WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- UPDATE: Chỉ được sửa học viên thuộc lớp mình quản lý
DO $$ BEGIN
  CREATE POLICY "students_update_academic_manager" ON public.students
    FOR UPDATE USING (
      public.get_my_role() = 'academic_manager'
      AND id = ANY(public.get_my_academic_manager_student_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- DELETE: Chỉ được xóa học viên thuộc lớp mình quản lý
DO $$ BEGIN
  CREATE POLICY "students_delete_academic_manager" ON public.students
    FOR DELETE USING (
      public.get_my_role() = 'academic_manager'
      AND id = ANY(public.get_my_academic_manager_student_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. TEACHERS — Cấp toàn quyền quản lý giáo viên ───────────────────────
-- Academic manager có thể CREATE, READ, UPDATE, DELETE giáo viên.
DO $$ BEGIN
  CREATE POLICY "teachers_insert_academic_manager" ON public.teachers
    FOR INSERT WITH CHECK (public.get_my_role() = 'academic_manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "teachers_update_academic_manager" ON public.teachers
    FOR UPDATE USING (public.get_my_role() = 'academic_manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "teachers_delete_academic_manager" ON public.teachers
    FOR DELETE USING (public.get_my_role() = 'academic_manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 5. SESSIONS — Tạo & quản lý buổi học cho lớp mình quản lý ───────
-- Giúp academic manager tạo buổi học, cập nhật trạng thái, topic, homework.
DO $$ BEGIN
  CREATE POLICY "sessions_insert_academic_manager" ON public.sessions
    FOR INSERT WITH CHECK (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sessions_update_academic_manager" ON public.sessions
    FOR UPDATE USING (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sessions_delete_academic_manager" ON public.sessions
    FOR DELETE USING (
      public.get_my_role() = 'academic_manager'
      AND class_id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 6. SESSION_ATTENDANCE — Nhập điểm danh cho lớp mình quản lý ──────
-- Academic manager có thể INSERT/UPDATE điểm danh (giống giáo viên).
DO $$ BEGIN
  CREATE POLICY "session_attendance_insert_academic_manager" ON public.session_attendance
    FOR INSERT WITH CHECK (
      public.get_my_role() = 'academic_manager'
      AND class_name IN (
        SELECT c.name FROM public.classes c
        WHERE c.id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "session_attendance_update_academic_manager" ON public.session_attendance
    FOR UPDATE USING (
      public.get_my_role() = 'academic_manager'
      AND class_name IN (
        SELECT c.name FROM public.classes c
        WHERE c.id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 7. ATTENDANCE_MAKEUP — Quản lý học bù ───────────────────────────
-- Academic manager có thể tạo/xóa/sửa bản ghi học bù.
DO $$ BEGIN
  CREATE POLICY "attendance_makeup_insert_academic_manager" ON public.attendance_makeup
    FOR INSERT WITH CHECK (public.get_my_role() = 'academic_manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_makeup_update_academic_manager" ON public.attendance_makeup
    FOR UPDATE USING (public.get_my_role() = 'academic_manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_makeup_delete_academic_manager" ON public.attendance_makeup
    FOR DELETE USING (public.get_my_role() = 'academic_manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 8. PROFILES — Cập nhật profile user thuộc lớp mình quản lý ─────────
-- Academic manager có thể UPDATE profiles của học viên & giáo viên thuộc lớp mình.
DO $$ BEGIN
  CREATE POLICY "profiles_update_academic_manager" ON public.profiles
    FOR UPDATE USING (
      public.get_my_role() = 'academic_manager'
      AND id IN (
        SELECT s.profile_id FROM public.students s
        WHERE s.id = ANY(public.get_my_academic_manager_student_ids())
        UNION
        SELECT t.id FROM public.teachers t
        WHERE t.id IN (
          SELECT teacher_id FROM public.classes c
          WHERE c.id IN (SELECT class_id FROM public.get_my_academic_manager_class_ids())
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 9. AUDIT_LOGS — Ghi log cho academic_manager (nếu cần) ───────────
-- Cho phép đọc audit logs (nếu cần theo dõi hành động).
DO $$ BEGIN
  CREATE POLICY "audit_academic_manager_read" ON public.audit_logs
    FOR SELECT USING (public.get_my_role() = 'academic_manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Kết thúc Migration 032
-- ============================================================
