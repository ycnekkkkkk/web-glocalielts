-- ============================================================
-- Migration 011: Link students.profile_id by matching email
-- ============================================================
-- Fixes cases where student accounts were created after initial
-- data migration, so their profile_id remained NULL.

-- 1. Link existing students by matching email to profiles
UPDATE public.students s
SET profile_id = p.id
FROM public.profiles p
WHERE LOWER(p.email) = LOWER(s.email)
  AND s.profile_id IS NULL
  AND p.role = 'student';

-- 2. Also match by full_name as fallback (for cases where email
--    was not set on the students record but name matches)
UPDATE public.students s
SET profile_id = p.id
FROM public.profiles p
WHERE LOWER(p.full_name) = LOWER(s.full_name)
  AND s.profile_id IS NULL
  AND p.role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM public.students s2
    WHERE s2.profile_id = p.id
  );
