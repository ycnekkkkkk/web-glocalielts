-- ============================================================
-- Migration 037: Debug & Fix Enrollment Issues
-- ============================================================
-- Vấn đề: Lớp RIG1 chỉ thêm được 3 học viên
-- Nguyên nhân có thể:
-- 1. Lớp thiếu organization_id
-- 2. RLS policy chặn enrollment insert
-- 3. Enrollment có constraint đặc biệt
-- ============================================================

-- 1. Kiểm tra organization_id của các lớp RIG
SELECT 'CLASSES CHECK' as info;
SELECT id, name, organization_id, status FROM classes WHERE name LIKE 'RIG%' OR name LIKE '%RIG%';

-- 2. Kiểm tra số enrollment của từng lớp
SELECT 'ENROLLMENTS COUNT' as info;
SELECT 
  c.name as class_name,
  c.id as class_id,
  COUNT(e.id) as enrollment_count
FROM classes c
LEFT JOIN enrollments e ON e.class_id = c.id AND e.status = 'active'
WHERE c.name LIKE 'RIG%' OR c.name LIKE '%NHOM%' OR c.name LIKE '%TEST%'
GROUP BY c.id, c.name
ORDER BY c.name;

-- 3. Kiểm tra xem có constraint nào không
SELECT 'CHECK CONSTRAINTS' as info;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'enrollments'::regclass;

-- 4. Nếu organization_id NULL, cập nhật cho lớp RIG1 (cần thay YOUR_ORG_ID bằng org đúng)
-- Chạy câu lệnh dưới với org_id đúng:
-- UPDATE classes SET organization_id = 'YOUR_ORG_ID_HERE' WHERE name = 'RIG1 - 260331';

-- 5. Kiểm tra RLS policies trên enrollments
SELECT 'RLS POLICIES' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'enrollments';

-- 6. Tạo view để debug enrollment
CREATE OR REPLACE VIEW debug_enrollment_status AS
SELECT 
  c.id as class_id,
  c.name as class_name,
  c.organization_id,
  c.status as class_status,
  e.id as enrollment_id,
  e.student_id,
  e.status as enrollment_status,
  s.full_name as student_name,
  CASE WHEN c.organization_id IS NULL THEN 'WARNING: No org_id' ELSE 'OK' END as status_check
FROM classes c
LEFT JOIN enrollments e ON e.class_id = c.id
LEFT JOIN students s ON s.id = e.student_id
WHERE c.name LIKE 'RIG%' OR c.name LIKE '%NHOM%' OR c.name LIKE '%TEST%'
ORDER BY c.name, e.id;

-- 7. Grant quyền cho academic_manager để debug
GRANT SELECT ON debug_enrollment_status TO authenticated;

-- ============================================================
-- FIX: Cập nhật organization_id cho lớp thiếu
-- Chạy câu lệnh sau để fix lớp RIG1:
-- UPDATE classes 
-- SET organization_id = (
--   SELECT organization_id FROM classes WHERE organization_id IS NOT NULL LIMIT 1
-- )
-- WHERE name = 'RIG1 - 260331' AND organization_id IS NULL;
-- ============================================================
