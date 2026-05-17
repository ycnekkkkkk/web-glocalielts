import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nbdaxrfqdlezdmnhbtjz.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iZGF4cmZxZGxlemRtbmhidGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mzc5NSwiZXhwIjoyMDkwMzQ5Nzk1fQ.87DY474yliLrK71QiIC_q3gka6JM-6fz8jji4AvAR3s";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const classId = "e07ff2a0-bcde-4524-bbca-518b403136ad";
  
  const { data, error } = await supabase
    .from("monthly_student_evaluations")
    .select(`
      id,
      student_id,
      evaluation_month,
      rating,
      performance,
      attendance_rate,
      homework_score,
      midterm_score,
      final_score,
      teacher_comment,
      academic_comment,
      knowledge_learned,
      next_month_plan,
      test_result,
      created_at,
      updated_at,
      students:students!inner(full_name),
      tp:profiles!evaluated_by_teacher_id(full_name),
      mp:profiles!evaluated_by_manager_id(full_name)
    `)
    .eq("class_id", classId);

  if (error) {
    console.error("Direct query failed:", error);
  } else {
    console.log("Direct query succeeded! Total rows fetched:", data.length);
    console.log("Sample row:", JSON.stringify(data[0], null, 2));
  }
}

run().catch(console.error);
