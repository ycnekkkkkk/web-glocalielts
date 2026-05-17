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
  
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("email", "ycnqe180047@fpt.edu.vn")
    .maybeSingle();
    
  if (pErr || !profiles) {
    console.error("Profile error:", pErr);
    return;
  }
  
  const { data: subs, error: sErr } = await supabase
    .from("mock_skill_submissions")
    .select("id, status, scores")
    .eq("auth_user_id", profiles.id)
    .order("created_at", { ascending: false });
    
  if (sErr || !subs || subs.length === 0) {
    console.error("Sub error:", sErr);
    return;
  }
  
  console.log("Found submissions:", subs.length);
  for (const s of subs) {
    console.log("Sub ID:", s.id);
    console.log("Status:", s.status);
    console.log("Scores keys:", Object.keys(s.scores || {}));
    if (s.scores?.speaking) {
      console.log("Speaking feedback:", JSON.stringify(s.scores.speaking.feedback, null, 2));
    }
  }
}

main().catch(console.error);
