import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const EXAM_ID = "74f227aa-0f7b-4c5a-ba9c-7c30113039cb";

function requiredEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing env: ${name}`);
  return v.trim();
}

async function main() {
  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
  
  const { data, error } = await supabase
    .from("mock_skill_exam_answers")
    .select("answers")
    .eq("exam_id", EXAM_ID)
    .single();
    
  if (error) {
    console.error("Error fetching answers:", error);
    return;
  }
  
  console.log("SUCCESS! Answers:");
  console.log(JSON.stringify(data.answers, null, 2));
}

main().catch(console.error);
