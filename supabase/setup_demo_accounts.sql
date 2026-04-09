-- ============================================================
-- SETUP DEMO ACCOUNTS
-- Chạy file này trong Supabase SQL Editor
-- SAU KHI đã tạo 3 user trong Authentication > Users:
--   admin@glocalielts.edu.vn    / demo123456
--   teacher@glocalielts.edu.vn  / demo123456
--   student@glocalielts.edu.vn  / demo123456
-- ============================================================

-- Bước 1: Gán role + tên đầy đủ cho 3 tài khoản demo
UPDATE public.profiles
SET role = 'admin',
    full_name = 'Quản trị viên',
    updated_at = NOW()
WHERE email = 'admin@glocalielts.edu.vn';

UPDATE public.profiles
SET role = 'teacher',
    full_name = 'Nguyễn Thị Lan',
    updated_at = NOW()
WHERE email = 'teacher@glocalielts.edu.vn';

UPDATE public.profiles
SET role = 'student',
    full_name = 'Trần Minh Khoa',
    updated_at = NOW()
WHERE email = 'student@glocalielts.edu.vn';

-- ============================================================
-- Bước 2: Kiểm tra kết quả
-- ============================================================
SELECT email, full_name, role, created_at
FROM public.profiles
WHERE email IN (
  'admin@glocalielts.edu.vn',
  'teacher@glocalielts.edu.vn',
  'student@glocalielts.edu.vn'
)
ORDER BY role;

-- Kết quả mong đợi:
-- admin@glocalielts.edu.vn   | Quản trị viên | admin
-- teacher@glocalielts.edu.vn | Nguyễn Thị Lan | teacher
-- student@glocalielts.edu.vn | Trần Minh Khoa | student

-- ============================================================
-- LƯU Ý: Nếu UPDATE không có dòng nào (0 rows affected)
-- → profile chưa được tạo tự động → chạy đoạn này để tạo thủ công:
-- ============================================================
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  CASE u.email
    WHEN 'admin@glocalielts.edu.vn'   THEN 'Quản trị viên'
    WHEN 'teacher@glocalielts.edu.vn' THEN 'Nguyễn Thị Lan'
    WHEN 'student@glocalielts.edu.vn' THEN 'Trần Minh Khoa'
  END,
  CASE u.email
    WHEN 'admin@glocalielts.edu.vn'   THEN 'admin'
    WHEN 'teacher@glocalielts.edu.vn' THEN 'teacher'
    WHEN 'student@glocalielts.edu.vn' THEN 'student'
  END
FROM auth.users u
WHERE u.email IN (
  'admin@glocalielts.edu.vn',
  'teacher@glocalielts.edu.vn',
  'student@glocalielts.edu.vn'
)
ON CONFLICT (id) DO UPDATE
  SET full_name  = EXCLUDED.full_name,
      role       = EXCLUDED.role,
      updated_at = NOW();

-- Kiểm tra lần cuối
SELECT email, full_name, role FROM public.profiles
WHERE email IN (
  'admin@glocalielts.edu.vn',
  'teacher@glocalielts.edu.vn',
  'student@glocalielts.edu.vn'
)
ORDER BY role;
