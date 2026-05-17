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
    .select("*");
    
  if (sErr || !subs) {
    console.error("Sub error:", sErr);
    return;
  }
  
  console.log("Searching in", subs.length, "submissions...");
  for (const s of subs) {
    const fullStr = JSON.stringify(s);
    if (fullStr.toLowerCase().includes("currently working")) {
      console.log("MATCH FOUND in mock_skill_submissions!");
      console.log("Sub ID:", s.id);
      console.log("Scores:", JSON.stringify(s.scores, null, 2));
    }
  }
}

main().catch(console.error);
