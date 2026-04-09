-- ============================================================
-- Migration 021: Access control for public course learning page
-- ============================================================

CREATE TABLE IF NOT EXISTS public.public_course_access (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id  UUID NOT NULL REFERENCES public.public_courses(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_public_course_access_course ON public.public_course_access(course_id);
CREATE INDEX IF NOT EXISTS idx_public_course_access_user ON public.public_course_access(user_id);

ALTER TABLE public.public_course_access ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "public_course_access_select_self" ON public.public_course_access
    FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_course_access_admin_all" ON public.public_course_access
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.public_course_access TO authenticated;
