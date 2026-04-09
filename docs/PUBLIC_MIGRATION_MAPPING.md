# Public Migration Mapping (Legacy -> New Web)

## Scope

- Public course catalog
- Public mock quizzes
- Quiz attempts for authenticated users only

## Course Mapping

| Legacy (MySQL) | New (Supabase) | Notes |
|---|---|---|
| `webinars.id` | `public_courses.legacy_webinar_id` | Unique source identifier |
| `webinars.slug` | `public_courses.slug` | Fallback slug generated if missing |
| `webinars.title` | `public_courses.title` | Required |
| `webinars.description` | `public_courses.description` | Full course content |
| `webinars.description` | `public_courses.short_description` | First ~220 chars |
| `webinars.image_cover` | `public_courses.thumbnail_url` | Optional |
| `webinars.price` | `public_courses.price` | Numeric |
| `webinars.status` | `public_courses.status` | `active -> published`, other -> `draft` |

## Mock Quiz Mapping

| Legacy (MySQL) | New (Supabase) | Notes |
|---|---|---|
| `quizzes.id` | `public_quizzes.legacy_quiz_id` | Unique source identifier |
| `quizzes.title` | `public_quizzes.title` | Required |
| `quizzes.description` | `public_quizzes.description` | Optional |
| `quizzes.time` | `public_quizzes.time_limit_minutes` | Optional |
| `quizzes.pass_mark` | `public_quizzes.pass_mark` | Numeric |
| `quizzes.total_mark` | `public_quizzes.total_mark` | Numeric |
| `quizzes.status` | `public_quizzes.is_active` | `active -> true` |

## Quiz Question Mapping

| Legacy (MySQL) | New (Supabase) | Notes |
|---|---|---|
| `quizzes_questions.id` | `public_quiz_questions.legacy_question_id` | Unique source identifier |
| `quizzes_questions.quiz_id` | `public_quiz_questions.quiz_id` | Mapped by `legacy_quiz_id` |
| `quizzes_questions.title` | `public_quiz_questions.question_text` | Required |
| `quizzes_questions.type` | `public_quiz_questions.question_type` | Default `single_choice` |
| `quizzes_questions.grade` | `public_quiz_questions.grade` | Default `1` |

## Quiz Option Mapping

| Legacy (MySQL) | New (Supabase) | Notes |
|---|---|---|
| `quizzes_questions_answers.id` | `public_quiz_options.legacy_answer_id` | Unique source identifier |
| `quizzes_questions_answers.question_id` | `public_quiz_options.question_id` | Mapped by `legacy_question_id` |
| `quizzes_questions_answers.title` | `public_quiz_options.option_text` | Required |
| `quizzes_questions_answers.correct` | `public_quiz_options.is_correct` | Boolean |

## Quiz Attempt Mapping (Only Authenticated)

| Legacy (MySQL) | New (Supabase) | Notes |
|---|---|---|
| `quizzes_results.quiz_id` | `public_quiz_attempts.quiz_id` | Mapped by `legacy_quiz_id` |
| `quizzes_results.user_id` | `public_quiz_attempts.user_id` | Insert only if user exists in `profiles.id` |
| `quizzes_results.user_grade` | `public_quiz_attempts.score` | Numeric |
| `quizzes_results.status` | `public_quiz_attempts.status` | `submitted/passed/failed` |
| `quizzes_results.results` | `public_quiz_attempts.answers` | JSON payload |

## Idempotency Rules

- Courses: upsert by `legacy_webinar_id`
- Quizzes: upsert by `legacy_quiz_id`
- Questions: upsert by `legacy_question_id`
- Options: upsert by `legacy_answer_id`
- Attempts: insert only (historical records)
