// scripts/migrate-066-add-monthly-eval-fields.mjs
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
ALTER TABLE public.monthly_student_evaluations
  ADD COLUMN IF NOT EXISTS knowledge_learned TEXT,
  ADD COLUMN IF NOT EXISTS next_month_plan TEXT,
  ADD COLUMN IF NOT EXISTS test_result TEXT;
`;

console.log("Applying database migration to add monthly evaluation fields...");
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
