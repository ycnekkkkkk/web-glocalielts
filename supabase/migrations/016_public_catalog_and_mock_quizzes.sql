-- ============================================================
-- Migration 016: Public courses + public mock quizzes
-- ============================================================

-- Public course catalog (legacy webinars -> public listing)
CREATE TABLE IF NOT EXISTS public.public_courses (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_webinar_id BIGINT UNIQUE,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  short_description TEXT,
  description       TEXT,
  teacher_name      TEXT,
  thumbnail_url     TEXT,
  level             TEXT,
  price             NUMERIC(12,0) DEFAULT 0,
  currency          TEXT DEFAULT 'VND',
  status            TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
  published_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_courses_status ON public.public_courses(status);
CREATE INDEX IF NOT EXISTS idx_public_courses_published_at ON public.public_courses(published_at DESC);

-- Public quizzes (mock exams)
CREATE TABLE IF NOT EXISTS public.public_quizzes (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_quiz_id    BIGINT UNIQUE,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  description       TEXT,
  time_limit_minutes INT,
  pass_mark         NUMERIC(10,2) DEFAULT 0,
  total_mark        NUMERIC(10,2) DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_quizzes_active ON public.public_quizzes(is_active);

CREATE TABLE IF NOT EXISTS public.public_quiz_questions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id             UUID NOT NULL REFERENCES public.public_quizzes(id) ON DELETE CASCADE,
  legacy_question_id  BIGINT UNIQUE,
  question_text       TEXT NOT NULL,
  question_type       TEXT DEFAULT 'single_choice',
  grade               NUMERIC(10,2) DEFAULT 1,
  sort_order          INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_quiz_questions_quiz_id ON public.public_quiz_questions(quiz_id);

CREATE TABLE IF NOT EXISTS public.public_quiz_options (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id       UUID NOT NULL REFERENCES public.public_quiz_questions(id) ON DELETE CASCADE,
  legacy_answer_id  BIGINT UNIQUE,
  option_text       TEXT NOT NULL,
  is_correct        BOOLEAN DEFAULT FALSE,
  sort_order        INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_public_quiz_options_question_id ON public.public_quiz_options(question_id);

-- Attempt is stored only for authenticated users
CREATE TABLE IF NOT EXISTS public.public_quiz_attempts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id       UUID NOT NULL REFERENCES public.public_quizzes(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score         NUMERIC(10,2) DEFAULT 0,
  max_score     NUMERIC(10,2) DEFAULT 0,
  status        TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'passed', 'failed')),
  answers       JSONB DEFAULT '{}'::jsonb,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_quiz_attempts_quiz_id ON public.public_quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_public_quiz_attempts_user_id ON public.public_quiz_attempts(user_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.public_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_quiz_attempts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "public_courses_read_all" ON public.public_courses
    FOR SELECT USING (status = 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_courses_admin_all" ON public.public_courses
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_quizzes_read_all" ON public.public_quizzes
    FOR SELECT USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_quizzes_admin_all" ON public.public_quizzes
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_quiz_questions_read_all" ON public.public_quiz_questions
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.public_quizzes q
        WHERE q.id = quiz_id AND q.is_active = TRUE
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_quiz_questions_admin_all" ON public.public_quiz_questions
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_quiz_options_read_all" ON public.public_quiz_options
    FOR SELECT USING (
      EXISTS (
        SELECT 1
        FROM public.public_quiz_questions qq
        JOIN public.public_quizzes q ON q.id = qq.quiz_id
        WHERE qq.id = question_id AND q.is_active = TRUE
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_quiz_options_admin_all" ON public.public_quiz_options
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_quiz_attempts_insert_self" ON public.public_quiz_attempts
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_quiz_attempts_select_self" ON public.public_quiz_attempts
    FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_quiz_attempts_admin_all" ON public.public_quiz_attempts
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.public_courses TO anon, authenticated;
GRANT SELECT ON public.public_quizzes TO anon, authenticated;
GRANT SELECT ON public.public_quiz_questions TO anon, authenticated;
GRANT SELECT ON public.public_quiz_options TO anon, authenticated;
GRANT SELECT, INSERT ON public.public_quiz_attempts TO authenticated;
