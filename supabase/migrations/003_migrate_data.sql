-- ============================================================
-- Migration 003: Data Migration from classes_current
-- Run AFTER 002_normalized_schema.sql
-- ============================================================

DO $$
DECLARE
  default_org_id UUID;
BEGIN
  SELECT id INTO default_org_id FROM public.organizations WHERE slug = 'glocal-ielts';

  -- --------------------------------------------------------
  -- Migrate unique classes
  -- teacher_id resolved via profiles.full_name match
  -- --------------------------------------------------------
  INSERT INTO public.classes (
    organization_id, name, teacher_id, schedule,
    level_in, level_out, tuition_fee, status, class_type
  )
  SELECT DISTINCT ON (cc.ten_lop)
    default_org_id,
    cc.ten_lop,
    (SELECT p.id FROM public.profiles p WHERE p.full_name = cc.giao_vien LIMIT 1),
    cc.lich_hoc,
    cc.dau_vao,
    cc.dau_ra,
    COALESCE(cc.hoc_phi_tong, 0),
    CASE
      WHEN cc.tinh_trang IN ('Đang học','Bình thường') THEN 'active'
      WHEN cc.tinh_trang = 'Sắp khai giảng'           THEN 'upcoming'
      WHEN cc.tinh_trang IN ('Kết thúc','Hoàn thành') THEN 'completed'
      ELSE 'active'
    END,
    CASE WHEN cc.nhom_lop LIKE '%1:1%' THEN '1on1' ELSE 'group' END
  FROM public.classes_current cc
  WHERE cc.ten_lop IS NOT NULL
  ORDER BY cc.ten_lop, cc.id
  ON CONFLICT DO NOTHING;

  -- --------------------------------------------------------
  -- Link sessions.class_id from new classes table
  -- --------------------------------------------------------
  UPDATE public.sessions ses
  SET class_id = c.id
  FROM public.classes c
  WHERE c.name = ses.class_name
    AND ses.class_id IS NULL;

  -- --------------------------------------------------------
  -- Migrate unique students (deduplicated by full_name)
  -- --------------------------------------------------------
  INSERT INTO public.students (
    organization_id, full_name, phone, email, parent_info, profile_id
  )
  SELECT DISTINCT ON (cc.hoc_vien)
    default_org_id,
    cc.hoc_vien,
    cc.so_dien_thoai,
    NULLIF(TRIM(cc.email), ''),
    cc.thong_tin_phu_huynh,
    (SELECT p.id FROM public.profiles p
     WHERE LOWER(p.email) = LOWER(NULLIF(TRIM(cc.email), ''))
     LIMIT 1)
  FROM public.classes_current cc
  WHERE cc.hoc_vien IS NOT NULL AND TRIM(cc.hoc_vien) <> ''
  ORDER BY cc.hoc_vien, cc.id
  ON CONFLICT DO NOTHING;

  -- --------------------------------------------------------
  -- Create enrollments (class ↔ student many-to-many)
  -- --------------------------------------------------------
  INSERT INTO public.enrollments (class_id, student_id)
  SELECT c.id, s.id
  FROM public.classes_current cc
  JOIN public.classes  c ON c.name      = cc.ten_lop
  JOIN public.students s ON s.full_name = cc.hoc_vien
  WHERE cc.hoc_vien IS NOT NULL AND TRIM(cc.hoc_vien) <> ''
  ON CONFLICT (class_id, student_id) DO NOTHING;

  -- --------------------------------------------------------
  -- Populate session_attendance.session_id FK
  -- --------------------------------------------------------
  UPDATE public.session_attendance sa
  SET session_id = s.id
  FROM public.sessions s
  WHERE s.class_name   = sa.class_name
    AND s.session_no   = sa.session_no
    AND s.session_date = sa.session_date
    AND sa.session_id IS NULL;

  -- --------------------------------------------------------
  -- Populate session_attendance.student_id FK
  -- --------------------------------------------------------
  UPDATE public.session_attendance sa
  SET student_id = st.id
  FROM public.students st
  WHERE st.full_name = sa.student_name
    AND sa.student_id IS NULL;

  -- --------------------------------------------------------
  -- Link invoices.enrollment_id FK
  -- --------------------------------------------------------
  UPDATE public.invoices inv
  SET enrollment_id = e.id
  FROM public.enrollments e
  JOIN public.students s ON s.id = e.student_id
  JOIN public.classes  c ON c.id = e.class_id
  WHERE s.full_name = inv.student_name
    AND c.name      = inv.class_name
    AND inv.enrollment_id IS NULL;

  -- --------------------------------------------------------
  -- Seed organization_users: link existing admin/teacher/org
  -- accounts to the default org
  -- --------------------------------------------------------
  INSERT INTO public.organization_users (organization_id, user_id, role)
  SELECT
    default_org_id,
    p.id,
    CASE p.role WHEN 'admin' THEN 'admin' ELSE 'member' END
  FROM public.profiles p
  WHERE p.role IN ('admin','teacher','organization')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

END $$;
