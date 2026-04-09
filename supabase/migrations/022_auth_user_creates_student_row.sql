-- ============================================================
-- Migration 022: Khi tạo auth user (Google OAuth hoặc đăng ký),
-- tự tạo / liên kết bản ghi public.students để admin thấy trong
-- danh sách học viên và có thể gán lớp.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_email text;
  v_full_name text;
  v_org_id uuid;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  IF v_role NOT IN ('admin', 'teacher', 'student', 'organization', 'academic_manager') THEN
    v_role := 'student';
  END IF;

  v_email := NULLIF(lower(trim(COALESCE(NEW.email, ''))), '');

  v_full_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    v_email,
    'Học viên'
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    v_email,
    v_full_name,
    v_role
  );

  IF v_role = 'student' THEN
    SELECT id INTO v_org_id
    FROM public.organizations
    WHERE slug = 'glocal-ielts'
    LIMIT 1;

    IF v_email IS NOT NULL THEN
      UPDATE public.students s
      SET
        profile_id = NEW.id,
        full_name = COALESCE(NULLIF(trim(s.full_name), ''), v_full_name),
        email = COALESCE(s.email, v_email),
        updated_at = NOW()
      WHERE s.profile_id IS NULL
        AND s.email IS NOT NULL
        AND lower(trim(s.email)) = v_email;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.students WHERE profile_id = NEW.id) THEN
      INSERT INTO public.students (organization_id, profile_id, full_name, email)
      VALUES (v_org_id, NEW.id, v_full_name, v_email);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Backfill: học viên đã đăng nhập Google trước đó (chỉ profiles, chưa có students) ──

UPDATE public.students s
SET
  profile_id = p.id,
  full_name = COALESCE(
    NULLIF(trim(s.full_name), ''),
    NULLIF(trim(p.full_name), ''),
    s.email,
    p.email,
    'Học viên'
  ),
  updated_at = NOW()
FROM public.profiles p
WHERE p.role = 'student'
  AND s.profile_id IS NULL
  AND s.email IS NOT NULL
  AND p.email IS NOT NULL
  AND lower(trim(s.email)) = lower(trim(p.email));

INSERT INTO public.students (organization_id, profile_id, full_name, email)
SELECT o.id,
       p.id,
       COALESCE(NULLIF(trim(p.full_name), ''), NULLIF(trim(p.email), ''), 'Học viên'),
       CASE WHEN p.email IS NOT NULL THEN lower(trim(p.email)) ELSE NULL END
FROM public.profiles p
CROSS JOIN LATERAL (
  SELECT id FROM public.organizations WHERE slug = 'glocal-ielts' LIMIT 1
) o
WHERE p.role = 'student'
  AND NOT EXISTS (SELECT 1 FROM public.students s WHERE s.profile_id = p.id);
