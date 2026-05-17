-- supabase/migrations/066_add_monthly_eval_fields.sql
-- Migration 066: Add knowledge_learned, next_month_plan, test_result to monthly_student_evaluations table

ALTER TABLE public.monthly_student_evaluations
  ADD COLUMN IF NOT EXISTS knowledge_learned TEXT,
  ADD COLUMN IF NOT EXISTS next_month_plan TEXT,
  ADD COLUMN IF NOT EXISTS test_result TEXT;
