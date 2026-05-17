// scripts/migrate-067-update-get-monthly-evaluations-rpc.mjs
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
DROP FUNCTION IF EXISTS public.get_monthly_evaluations(UUID);

CREATE OR REPLACE FUNCTION public.get_monthly_evaluations(
  p_class_id UUID
)
RETURNS TABLE(
  id                UUID,
  student_id        UUID,
  student_name      TEXT,
  evaluation_month  TEXT,
  rating            NUMERIC,
  performance       TEXT,
  attendance_rate   NUMERIC,
  homework_score    NUMERIC,
  midterm_score     NUMERIC,
  final_score       NUMERIC,
  teacher_comment   TEXT,
  academic_comment  TEXT,
  knowledge_learned TEXT,
  next_month_plan   TEXT,
  test_result       TEXT,
  evaluated_by_teacher_name TEXT,
  evaluated_by_manager_name TEXT,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mse.id,
    mse.student_id,
    s.full_name        AS student_name,
    mse.evaluation_month,
    mse.rating,
    mse.performance,
    mse.attendance_rate,
    mse.homework_score,
    mse.midterm_score,
    mse.final_score,
    mse.teacher_comment,
    mse.academic_comment,
    mse.knowledge_learned,
    mse.next_month_plan,
    mse.test_result,
    tp.full_name        AS evaluated_by_teacher_name,
    mp.full_name        AS evaluated_by_manager_name,
    mse.created_at,
    mse.updated_at
  FROM public.monthly_student_evaluations mse
  JOIN public.students s ON s.id = mse.student_id
  LEFT JOIN public.profiles tp ON tp.id = mse.evaluated_by_teacher_id
  LEFT JOIN public.profiles mp ON mp.id = mse.evaluated_by_manager_id
  JOIN public.enrollments e ON e.student_id = mse.student_id AND e.class_id = p_class_id
  WHERE e.status = 'active'
  ORDER BY s.full_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_evaluations(UUID) TO authenticated;
`;

console.log("Applying database migration to update get_monthly_evaluations RPC...");
try {
  const { error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.error("RPC failed:", error.message);
    console.log("\nPlease run this SQL manually in your Supabase SQL editor:");
    console.log("-------------------------------------------------------");
    console.log(sql);
  } else {
    console.log("Migration applied successfully!");
  }
} catch (err) {
  console.error("RPC failed with error:", err.message || err);
  console.log("\nPlease run this SQL manually in your Supabase SQL editor:");
  console.log("-------------------------------------------------------");
  console.log(sql);
}
