-- ============================================================
-- Migration 023: Cho phép xóa user trong Supabase Auth
-- khi vẫn còn bản ghi public.students (profile_id trỏ tới user).
--
-- Lỗi trước đây:
--   violates foreign key constraint "students_profile_id_fkey" (23503)
-- Fix: ON DELETE SET NULL — giữ hàng students (enrollments, v.v.),
--      chỉ gỡ liên kết tài khoản đăng nhập.
-- ============================================================

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_profile_id_fkey;

ALTER TABLE public.students
  ADD CONSTRAINT students_profile_id_fkey
  FOREIGN KEY (profile_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
