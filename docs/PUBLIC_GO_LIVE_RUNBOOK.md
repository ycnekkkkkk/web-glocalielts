# Public Migration Go-live Runbook

## 1) Preconditions

- Migration SQL applied: `web/supabase/migrations/016_public_catalog_and_mock_quizzes.sql`
- Environment variables ready for ETL script:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `LEGACY_DB_HOST`
  - `LEGACY_DB_PORT`
  - `LEGACY_DB_USER`
  - `LEGACY_DB_PASSWORD`
  - `LEGACY_DB_NAME`

## 2) Snapshot and Backup

1. Export current Supabase data snapshot for rollback.
2. Keep legacy MySQL dump immutable for replay.
3. Record baseline counts:
   - `public_courses`
   - `public_quizzes`
   - `public_quiz_questions`
   - `public_quiz_options`
   - `public_quiz_attempts`

## 3) Execute Migration

Run from `web`:

```bash
npm run migrate:public
```

Then validate counts and sample rows per table.

## 4) UAT Checklist

- Landing page `/` renders introduction and `Đăng nhập` / `Đăng ký`.
- Public user can view `/courses` and `/courses/[slug]`.
- Guest submission shows score but does not persist history.
- Logged-in submission persists to `public_quiz_attempts`.

## 5) Rollback

If critical mismatch:

1. Disable traffic to affected routes (temporary maintenance).
2. Restore Supabase snapshot.
3. Re-run ETL after fixing mapping issues.
4. Repeat UAT before opening traffic.

## 6) Post Go-live Monitoring

- Track API/db errors for public course and mock test pages.
- Verify no anonymous inserts into `public_quiz_attempts`.
- Compare daily attempt totals with expected traffic pattern.
