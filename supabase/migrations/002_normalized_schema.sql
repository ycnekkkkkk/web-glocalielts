-- ============================================================
-- Migration 002: Normalized Schema
-- Run in Supabase SQL Editor in order
-- ============================================================

-- 1a. ORGANIZATIONS + ORGANIZATION_USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  plan        TEXT DEFAULT 'free' CHECK (plan IN ('free','starter','pro','enterprise')),
  owner_id    UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.organizations (name, slug)
VALUES ('Glocal IELTS', 'glocal-ielts')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.organization_users (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 1b. CLASSES — teacher_id FK only (no teacher_name column)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.classes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  name            TEXT NOT NULL,
  teacher_id      UUID REFERENCES auth.users(id),  -- JOIN profiles to get name
  schedule        TEXT,
  room            TEXT,
  level_in        TEXT,
  level_out       TEXT,
  total_sessions  INT DEFAULT 0,
  sessions_done   INT DEFAULT 0,
  tuition_fee     NUMERIC(12,0) DEFAULT 0,
  start_date      DATE,
  end_date        TEXT,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','upcoming','completed','cancelled')),
  class_type      TEXT DEFAULT 'group' CHECK (class_type IN ('group','1on1')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 1c. STUDENTS — unique email (null-safe partial index)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.students (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  profile_id      UUID REFERENCES auth.users(id),
  full_name       TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  parent_info     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index: allows multiple NULLs, but unique among non-null emails
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_email_unique
  ON public.students(email) WHERE email IS NOT NULL;

-- 1d. ENROLLMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enrollments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','completed','dropped')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- 1e. FIX SESSIONS — add class_id FK
-- ============================================================
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id);

CREATE INDEX IF NOT EXISTS idx_sessions_class_id ON public.sessions(class_id);

-- 1f. FIX SESSION_ATTENDANCE — add session_id + student_id FKs
-- ============================================================
ALTER TABLE public.session_attendance
  ADD COLUMN IF NOT EXISTS session_id INT REFERENCES public.sessions(id),
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id);

CREATE INDEX IF NOT EXISTS idx_att_session_id ON public.session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_att_student_id ON public.session_attendance(student_id);

-- 1g. FIX INVOICES — add enrollment_id FK + ensure note/created_at exist
-- ============================================================
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES public.enrollments(id),
  ADD COLUMN IF NOT EXISTS note         TEXT,
  ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_invoices_enrollment ON public.invoices(enrollment_id);

-- 1h. PAYMENT_HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_history (
  id              SERIAL PRIMARY KEY,
  invoice_id      INT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount          NUMERIC(12,0) NOT NULL,
  payment_method  TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash','transfer','card')),
  note            TEXT,
  collected_by    TEXT,
  paid_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_invoice ON public.payment_history(invoice_id);

-- 1i. V_INVOICE_STATUS — computed view (status never stored)
-- ============================================================
CREATE OR REPLACE VIEW public.v_invoice_status
WITH (security_invoker = true) AS
SELECT
  i.id,
  i.enrollment_id,
  i.student_name,
  i.class_name,
  i.amount,
  i.due_date,
  i.note,
  i.created_at,
  COALESCE(SUM(ph.amount), 0)             AS paid_total,
  i.amount - COALESCE(SUM(ph.amount), 0)  AS remaining,
  CASE
    WHEN COALESCE(SUM(ph.amount), 0) >= i.amount         THEN 'paid'
    WHEN i.due_date < CURRENT_DATE
     AND COALESCE(SUM(ph.amount), 0) < i.amount          THEN 'overdue'
    WHEN COALESCE(SUM(ph.amount), 0) > 0                 THEN 'partial'
    ELSE 'pending'
  END AS status
FROM public.invoices i
LEFT JOIN public.payment_history ph ON ph.invoice_id = i.id
GROUP BY i.id, i.enrollment_id, i.student_name, i.class_name, i.amount, i.due_date, i.note, i.created_at;

GRANT SELECT ON public.v_invoice_status TO authenticated;

-- 1j. AUDIT_LOGS — populated by DB triggers only
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID,
  user_name   TEXT,
  user_role   TEXT,
  action      TEXT NOT NULL,   -- 'INSERT' | 'UPDATE' | 'DELETE'
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- 1k. STAFF TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,
  department  TEXT,
  phone       TEXT,
  email       TEXT,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1l. CENTER_SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.center_settings (
  id          SERIAL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  value       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.center_settings (key, value) VALUES
  ('center_name',    'Glocal IELTS'),
  ('center_email',   'admin@glocalielts.edu.vn'),
  ('center_phone',   ''),
  ('center_address', '')
ON CONFLICT (key) DO NOTHING;

-- 1m. FIX STUDENT_ACHIEVEMENTS columns
-- ============================================================
ALTER TABLE public.student_achievements
  ADD COLUMN IF NOT EXISTS class_name TEXT,
  ADD COLUMN IF NOT EXISTS issued_at  TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 2. RLS POLICIES FOR ALL NEW TABLES
-- ============================================================

-- organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "org_admin_all"  ON public.organizations FOR ALL     USING (public.get_my_role() = 'admin');
  CREATE POLICY "org_auth_read"  ON public.organizations FOR SELECT  USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- organization_users
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "org_users_admin" ON public.organization_users FOR ALL    USING (public.get_my_role() = 'admin');
  CREATE POLICY "org_users_self"  ON public.organization_users FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "classes_admin_org"   ON public.classes FOR SELECT USING (public.get_my_role() IN ('admin','organization'));
  CREATE POLICY "classes_teacher"     ON public.classes FOR SELECT USING (
    public.get_my_role() = 'teacher' AND teacher_id = auth.uid()
  );
  CREATE POLICY "classes_student"     ON public.classes FOR SELECT USING (
    public.get_my_role() = 'student' AND id IN (
      SELECT e.class_id FROM public.enrollments e
      JOIN public.students s ON s.id = e.student_id WHERE s.profile_id = auth.uid()
    )
  );
  CREATE POLICY "classes_write_admin" ON public.classes FOR ALL    USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "students_admin_org"   ON public.students FOR SELECT USING (public.get_my_role() IN ('admin','organization'));
  CREATE POLICY "students_teacher"     ON public.students FOR SELECT USING (
    public.get_my_role() = 'teacher' AND id IN (
      SELECT e.student_id FROM public.enrollments e
      JOIN public.classes c ON c.id = e.class_id WHERE c.teacher_id = auth.uid()
    )
  );
  CREATE POLICY "students_self"        ON public.students FOR SELECT USING (profile_id = auth.uid());
  CREATE POLICY "students_write_admin" ON public.students FOR ALL    USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "enrollments_admin_org" ON public.enrollments FOR ALL    USING (public.get_my_role() IN ('admin','organization'));
  CREATE POLICY "enrollments_teacher"   ON public.enrollments FOR SELECT USING (
    public.get_my_role() = 'teacher' AND class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())
  );
  CREATE POLICY "enrollments_student"   ON public.enrollments FOR SELECT USING (
    public.get_my_role() = 'student' AND student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payment_history
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "payment_admin_org" ON public.payment_history FOR ALL USING (public.get_my_role() IN ('admin','organization'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- staff
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "staff_admin_all"  ON public.staff FOR ALL    USING (public.get_my_role() = 'admin');
  CREATE POLICY "staff_auth_read"  ON public.staff FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- center_settings
ALTER TABLE public.center_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "settings_admin_write" ON public.center_settings FOR ALL    USING (public.get_my_role() = 'admin');
  CREATE POLICY "settings_auth_read"   ON public.center_settings FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
