-- ============================================================
-- Migration 029: Mock skill exams (4 kỹ năng) + submissions
-- Đáp án Listening/Reading tách bảng mock_skill_exam_answers (RLS admin-only).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mock_skill_exam_defs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  description       TEXT,
  content_public    JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mock_skill_exam_defs_active
  ON public.mock_skill_exam_defs(is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS public.mock_skill_exam_answers (
  exam_id           UUID PRIMARY KEY REFERENCES public.mock_skill_exam_defs(id) ON DELETE CASCADE,
  answers           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mock_skill_submissions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id           UUID NOT NULL REFERENCES public.mock_skill_exam_defs(id) ON DELETE CASCADE,
  auth_user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  candidate         JSONB NOT NULL DEFAULT '{}'::jsonb,
  drive_folder_id   TEXT,
  drive_folder_url  TEXT,
  scores            JSONB,
  status            TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  error_message     TEXT,
  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mock_skill_submissions_exam_id ON public.mock_skill_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_skill_submissions_submitted_at ON public.mock_skill_submissions(submitted_at DESC);

ALTER TABLE public.mock_skill_exam_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_skill_exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_skill_submissions ENABLE ROW LEVEL SECURITY;

-- Đề thi: ai cũng đọc được bản active (không có đáp án trong bảng này)
DO $$ BEGIN
  CREATE POLICY "mock_skill_exam_defs_select_active" ON public.mock_skill_exam_defs
    FOR SELECT USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mock_skill_exam_defs_admin_all" ON public.mock_skill_exam_defs
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Đáp án: chỉ admin
DO $$ BEGIN
  CREATE POLICY "mock_skill_exam_answers_admin_all" ON public.mock_skill_exam_answers
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Bài nộp: chỉ admin (insert qua service role / API)
DO $$ BEGIN
  CREATE POLICY "mock_skill_submissions_admin_all" ON public.mock_skill_submissions
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_skill_exam_defs TO authenticated;
GRANT SELECT ON public.mock_skill_exam_defs TO anon;
-- Admin xem đáp án & bài nộp qua RLS (get_my_role() = 'admin')
GRANT SELECT ON public.mock_skill_exam_answers TO authenticated;
GRANT SELECT ON public.mock_skill_submissions TO authenticated;

-- Seed: đề mẫu (có thể thay bằng dữ liệu trích từ DOCX)
INSERT INTO public.mock_skill_exam_defs (slug, title, description, content_public, is_active)
VALUES (
  'ielts-full-mock-1',
  'IELTS — Thi thử 4 kỹ năng (mẫu)',
  'Làm Listening, Reading, Speaking (ghi âm), Writing. Kết quả chi tiết sẽ được gửi qua email sau.',
  $json$
{
  "version": 1,
  "listening": {
    "title": "Listening",
    "blocks": [
      { "type": "text", "html": "<p>Nghe và chọn đáp án đúng cho từng câu.</p>" }
    ],
    "questions": [
      {
        "id": "l1",
        "stem": "Trong IELTS Listening, mỗi đoạn ghi âm thường được phát bao nhiêu lần?",
        "type": "single_choice",
        "options": ["Một lần", "Hai lần", "Ba lần", "Không giới hạn"]
      },
      {
        "id": "l2",
        "stem": "Khi đề bài ghi ONE WORD ONLY, bạn nên làm gì?",
        "type": "single_choice",
        "options": [
          "Viết tối đa một từ",
          "Có thể thêm số bất kỳ",
          "Dùng cụm từ ngắn",
          "Bỏ qua câu hỏi"
        ]
      }
    ]
  },
  "reading": {
    "title": "Reading",
    "blocks": [
      { "type": "text", "html": "<p>Đọc kỹ và chọn đáp án phù hợp.</p>" }
    ],
    "questions": [
      {
        "id": "r1",
        "stem": "Dạng True/False/Not Given chủ yếu kiểm tra điều gì?",
        "type": "single_choice",
        "options": [
          "Kiến thức chung của bạn",
          "Thông tin có trong bài đọc",
          "Ước đoán cá nhân",
          "Ngữ pháp nâng cao"
        ]
      },
      {
        "id": "r2",
        "stem": "Skimming (đọc lướt) trước khi làm bài giúp bạn:",
        "type": "single_choice",
        "options": [
          "Nắm chủ đề và cấu trúc chung",
          "Dịch từng từ",
          "Nhớ hết từ vựng",
          "Viết outline dài"
        ]
      }
    ]
  },
  "speaking": {
    "title": "Speaking",
    "blocks": [
      {
        "type": "text",
        "html": "<p>Ghi âm một đoạn khoảng <strong>1–2 phút</strong>. Cho phép trình duyệt dùng micro.</p>"
      }
    ],
    "prompt": "Giới thiệu ngắn về bản thân, một sở thích và một kế hoạch trong tháng tới."
  },
  "writing": {
    "title": "Writing",
    "blocks": [
      { "type": "text", "html": "<p>Viết bài luận ngắn bằng tiếng Anh.</p>" }
    ],
    "prompt": "Theo bạn, học trực tuyến hay học trực tiếp hiệu quả hơn? Giải thích ngắn gọn.",
    "minWords": 120
  }
}
$json$::jsonb,
  TRUE
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  content_public = EXCLUDED.content_public,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO public.mock_skill_exam_answers (exam_id, answers)
SELECT d.id,
  '{"listening":{"l1":0,"l2":0},"reading":{"r1":1,"r2":0}}'::jsonb
FROM public.mock_skill_exam_defs d
WHERE d.slug = 'ielts-full-mock-1'
ON CONFLICT (exam_id) DO UPDATE SET
  answers = EXCLUDED.answers,
  updated_at = NOW();
