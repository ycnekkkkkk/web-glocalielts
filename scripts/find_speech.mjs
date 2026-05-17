import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

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
  
  const { data: subs, error: sErr } = await supabase
    .from("mock_skill_submissions")
    .select("id, status, is_released, scores");
    
  if (sErr || !subs) {
    console.error("Sub error:", sErr);
    return;
  }
  
  for (const s of subs) {
    console.log("-----------------------------------------");
    console.log("Sub ID:", s.id);
    console.log("Status:", s.status);
    console.log("Is Released:", s.is_released);
    if (s.scores?.speaking) {
      console.log("Speaking transcript:", s.scores.speaking.transcript);
      console.log("Speaking feedback:", JSON.stringify(s.scores.speaking.feedback, null, 2));
    }
  }
}

main().catch(console.error);
