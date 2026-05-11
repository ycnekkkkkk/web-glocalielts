// scripts/migrate-062-answers-raw.mjs
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Execute via RPC
const sql = `
ALTER TABLE public.mock_skill_submissions
  ADD COLUMN IF NOT EXISTS answers_raw JSONB,
  ADD COLUMN IF NOT EXISTS graded_at   TIMESTAMPTZ;

ALTER TABLE public.mock_skill_submissions
  DROP CONSTRAINT IF EXISTS mock_skill_submissions_status_check;

ALTER TABLE public.mock_skill_submissions
  ADD CONSTRAINT mock_skill_submissions_status_check
  CHECK (status IN ('pending', 'processing', 'grading', 'graded', 'completed', 'failed'));

CREATE INDEX IF NOT EXISTS idx_mock_skill_submissions_status
  ON public.mock_skill_submissions(status);

CREATE INDEX IF NOT EXISTS idx_mock_skill_submissions_auth_user
  ON public.mock_skill_submissions(auth_user_id) WHERE auth_user_id IS NOT NULL;

DO $$ BEGIN
  CREATE POLICY "mock_skill_submissions_own_select" ON public.mock_skill_submissions
    FOR SELECT USING (auth_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

const { error } = await supabase.rpc("exec_sql", { sql }).catch(() => ({ error: { message: "RPC not available" } }));
if (error) {
  console.error("RPC failed:", error.message);
  console.log("\nPlease run this SQL manually in your Supabase SQL editor:");
  console.log("-------------------------------------------------------");
  console.log(sql);
} else {
  console.log("Migration applied successfully!");
}
