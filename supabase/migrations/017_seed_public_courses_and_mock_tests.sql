-- ============================================================
-- Migration 017: Seed public courses + mock tests (no MySQL)
-- ============================================================

-- Public course seed
INSERT INTO public.public_courses
  (legacy_webinar_id, slug, title, short_description, description, teacher_name, level, price, currency, status, published_at)
VALUES
  (
    900001,
    'ielts-foundation-5-0',
    'IELTS Foundation 5.0',
    'Khoi dong IELTS tu nen tang co ban, tap trung nghe-doc-viet co he thong.',
    'Khoa hoc giup hoc vien xay dung nen tang tu vung, ngu phap va chien luoc lam bai IELTS. Lo trinh phu hop nguoi moi bat dau va can muc tieu 5.0+.',
    'Co Lan Nguyen',
    'Beginner',
    3200000,
    'VND',
    'published',
    NOW()
  ),
  (
    900002,
    'ielts-intensive-6-5',
    'IELTS Intensive 6.5',
    'Tang toc ky nang lam de va chien luoc toi uu diem so IELTS 6.5.',
    'Chu trong ky nang lam de theo tung dang bai, sua bai chi tiet, va luyen de dinh ky. Phu hop hoc vien da co nen tang va muon dat 6.5 nhanh.',
    'Thay Minh Tran',
    'Intermediate',
    4500000,
    'VND',
    'published',
    NOW()
  ),
  (
    900003,
    'ielts-speaking-writing-7-0',
    'IELTS Speaking & Writing 7.0',
    'Luyen chuyen sau 2 ky nang kho nhat de dat band 7.0.',
    'Tap trung vao phan hoi logic, tu vung hoc thuat, coherence/cohesion va cach mo rong y trong Speaking Part 2-3 va Writing Task 2.',
    'Co Hanh Pham',
    'Upper-Intermediate',
    3900000,
    'VND',
    'published',
    NOW()
  )
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  teacher_name = EXCLUDED.teacher_name,
  level = EXCLUDED.level,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at,
  updated_at = NOW();

-- Public mock quiz seed
INSERT INTO public.public_quizzes
  (legacy_quiz_id, slug, title, description, time_limit_minutes, pass_mark, total_mark, is_active)
VALUES
  (
    800001,
    'mock-test-listening-basic',
    'Mock Test Listening Basic',
    'De thi thu Listening co ban gom 5 cau trac nghiem.',
    20,
    6,
    10,
    TRUE
  ),
  (
    800002,
    'mock-test-reading-basic',
    'Mock Test Reading Basic',
    'De thi thu Reading co ban gom 5 cau trac nghiem.',
    25,
    6,
    10,
    TRUE
  )
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  time_limit_minutes = EXCLUDED.time_limit_minutes,
  pass_mark = EXCLUDED.pass_mark,
  total_mark = EXCLUDED.total_mark,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Questions for quiz 1
WITH q AS (
  SELECT id FROM public.public_quizzes WHERE slug = 'mock-test-listening-basic' LIMIT 1
)
INSERT INTO public.public_quiz_questions
  (legacy_question_id, quiz_id, question_text, question_type, grade, sort_order)
SELECT *
FROM (
  SELECT 700001::bigint, (SELECT id FROM q), 'In IELTS Listening, you hear each recording how many times?', 'single_choice', 2::numeric, 1
  UNION ALL SELECT 700002, (SELECT id FROM q), 'What should you write if the instruction says ONE WORD ONLY?', 'single_choice', 2, 2
  UNION ALL SELECT 700003, (SELECT id FROM q), 'Which section is usually the most difficult in Listening?', 'single_choice', 2, 3
  UNION ALL SELECT 700004, (SELECT id FROM q), 'Spelling mistakes in answers can affect score?', 'single_choice', 2, 4
  UNION ALL SELECT 700005, (SELECT id FROM q), 'Best strategy before audio starts is?', 'single_choice', 2, 5
) AS seed(legacy_question_id, quiz_id, question_text, question_type, grade, sort_order)
ON CONFLICT (legacy_question_id) DO UPDATE
SET
  quiz_id = EXCLUDED.quiz_id,
  question_text = EXCLUDED.question_text,
  question_type = EXCLUDED.question_type,
  grade = EXCLUDED.grade,
  sort_order = EXCLUDED.sort_order;

-- Questions for quiz 2
WITH q AS (
  SELECT id FROM public.public_quizzes WHERE slug = 'mock-test-reading-basic' LIMIT 1
)
INSERT INTO public.public_quiz_questions
  (legacy_question_id, quiz_id, question_text, question_type, grade, sort_order)
SELECT *
FROM (
  SELECT 700101::bigint, (SELECT id FROM q), 'Skimming is mainly used to?', 'single_choice', 2::numeric, 1
  UNION ALL SELECT 700102, (SELECT id FROM q), 'Scanning helps you find?', 'single_choice', 2, 2
  UNION ALL SELECT 700103, (SELECT id FROM q), 'For TRUE/FALSE/NOT GIVEN, you should rely on?', 'single_choice', 2, 3
  UNION ALL SELECT 700104, (SELECT id FROM q), 'If no exact synonym appears, you should?', 'single_choice', 2, 4
  UNION ALL SELECT 700105, (SELECT id FROM q), 'Time management in IELTS Reading means?', 'single_choice', 2, 5
) AS seed(legacy_question_id, quiz_id, question_text, question_type, grade, sort_order)
ON CONFLICT (legacy_question_id) DO UPDATE
SET
  quiz_id = EXCLUDED.quiz_id,
  question_text = EXCLUDED.question_text,
  question_type = EXCLUDED.question_type,
  grade = EXCLUDED.grade,
  sort_order = EXCLUDED.sort_order;

-- Options for all seeded questions
INSERT INTO public.public_quiz_options
  (legacy_answer_id, question_id, option_text, is_correct, sort_order)
SELECT *
FROM (
  -- 700001
  SELECT 600001::bigint, q.id, 'One time', FALSE, 1 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700001
  UNION ALL SELECT 600002, q.id, 'Two times', FALSE, 2 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700001
  UNION ALL SELECT 600003, q.id, 'Three times', FALSE, 3 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700001
  UNION ALL SELECT 600004, q.id, 'Only one time', TRUE, 4 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700001
  -- 700002
  UNION ALL SELECT 600005, q.id, 'You can write a short sentence', FALSE, 1 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700002
  UNION ALL SELECT 600006, q.id, 'Exactly one word', TRUE, 2 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700002
  UNION ALL SELECT 600007, q.id, 'Any format is fine', FALSE, 3 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700002
  UNION ALL SELECT 600008, q.id, 'Two words are accepted', FALSE, 4 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700002
  -- 700003
  UNION ALL SELECT 600009, q.id, 'Section 1', FALSE, 1 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700003
  UNION ALL SELECT 600010, q.id, 'Section 2', FALSE, 2 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700003
  UNION ALL SELECT 600011, q.id, 'Section 4', TRUE, 3 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700003
  UNION ALL SELECT 600012, q.id, 'All sections are equal', FALSE, 4 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700003
  -- 700004
  UNION ALL SELECT 600013, q.id, 'No, spelling does not matter', FALSE, 1 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700004
  UNION ALL SELECT 600014, q.id, 'Yes, spelling can reduce score', TRUE, 2 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700004
  UNION ALL SELECT 600015, q.id, 'Only in Section 1', FALSE, 3 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700004
  UNION ALL SELECT 600016, q.id, 'Only for names', FALSE, 4 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700004
  -- 700005
  UNION ALL SELECT 600017, q.id, 'Read questions quickly and predict answers', TRUE, 1 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700005
  UNION ALL SELECT 600018, q.id, 'Skip all instructions', FALSE, 2 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700005
  UNION ALL SELECT 600019, q.id, 'Wait without looking at questions', FALSE, 3 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700005
  UNION ALL SELECT 600020, q.id, 'Memorize dictionary', FALSE, 4 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700005
  -- 700101
  UNION ALL SELECT 600101, q.id, 'Read every word carefully', FALSE, 1 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700101
  UNION ALL SELECT 600102, q.id, 'Get general idea quickly', TRUE, 2 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700101
  UNION ALL SELECT 600103, q.id, 'Translate to Vietnamese', FALSE, 3 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700101
  UNION ALL SELECT 600104, q.id, 'Learn grammar rules', FALSE, 4 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700101
  -- 700102
  UNION ALL SELECT 600105, q.id, 'Main idea only', FALSE, 1 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700102
  UNION ALL SELECT 600106, q.id, 'Specific information', TRUE, 2 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700102
  UNION ALL SELECT 600107, q.id, 'Writer mood', FALSE, 3 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700102
  UNION ALL SELECT 600108, q.id, 'Paragraph order', FALSE, 4 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700102
  -- 700103
  UNION ALL SELECT 600109, q.id, 'Your personal opinion', FALSE, 1 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700103
  UNION ALL SELECT 600110, q.id, 'Exact meaning in passage', TRUE, 2 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700103
  UNION ALL SELECT 600111, q.id, 'Title of article', FALSE, 3 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700103
  UNION ALL SELECT 600112, q.id, 'Previous exams', FALSE, 4 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700103
  -- 700104
  UNION ALL SELECT 600113, q.id, 'Give up immediately', FALSE, 1 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700104
  UNION ALL SELECT 600114, q.id, 'Look for paraphrase/synonym in context', TRUE, 2 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700104
  UNION ALL SELECT 600115, q.id, 'Guess random answer', FALSE, 3 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700104
  UNION ALL SELECT 600116, q.id, 'Skip whole text', FALSE, 4 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700104
  -- 700105
  UNION ALL SELECT 600117, q.id, 'Spend 40 minutes on one passage', FALSE, 1 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700105
  UNION ALL SELECT 600118, q.id, 'Allocate time and move on when needed', TRUE, 2 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700105
  UNION ALL SELECT 600119, q.id, 'Read dictionary during exam', FALSE, 3 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700105
  UNION ALL SELECT 600120, q.id, 'Do easiest section only', FALSE, 4 FROM public.public_quiz_questions q WHERE q.legacy_question_id = 700105
) AS seed(legacy_answer_id, question_id, option_text, is_correct, sort_order)
ON CONFLICT (legacy_answer_id) DO UPDATE
SET
  question_id = EXCLUDED.question_id,
  option_text = EXCLUDED.option_text,
  is_correct = EXCLUDED.is_correct,
  sort_order = EXCLUDED.sort_order;
