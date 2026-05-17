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
  
  // 1. Fetch current answers
  const { data, error } = await supabase
    .from("mock_skill_exam_answers")
    .select("answers")
    .eq("exam_id", EXAM_ID)
    .single();
    
  if (error || !data) {
    console.error("Error fetching answers:", error);
    return;
  }
  
  const originalAnswers = data.answers;
  console.log("Original reading keys count:", Object.keys(originalAnswers.reading || {}).length);
  console.log("Original reading keys:", Object.keys(originalAnswers.reading || {}));

  // 2. Clean reading answers object: KEEP ONLY keys starting with 'r'
  const cleanReading = {};
  if (originalAnswers.reading) {
    for (const [k, v] of Object.entries(originalAnswers.reading)) {
      if (k.startsWith("r") && !isNaN(parseInt(k.slice(1)))) {
        cleanReading[k] = v;
      }
    }
  }

  // 3. Clean listening answers object: KEEP ONLY keys starting with 'l'
  const cleanListening = {};
  if (originalAnswers.listening) {
    for (const [k, v] of Object.entries(originalAnswers.listening)) {
      if (k.startsWith("l") && !isNaN(parseInt(k.slice(1)))) {
        cleanListening[k] = v;
      }
    }
  }

  const structuredAnswers = {
    listening: cleanListening,
    reading: cleanReading
  };

  console.log("Cleaned reading keys count:", Object.keys(structuredAnswers.reading).length);
  console.log("Cleaned reading keys:", Object.keys(structuredAnswers.reading));
  console.log("Cleaned listening keys count:", Object.keys(structuredAnswers.listening).length);

  // 4. Update Supabase
  const { error: updateError } = await supabase
    .from("mock_skill_exam_answers")
    .update({ answers: structuredAnswers })
    .eq("exam_id", EXAM_ID);

  if (updateError) {
    console.error("Error updating answers:", updateError);
  } else {
    console.log("🎉 SUCCESS! Database exam answers cleaned successfully!");
  }
}

main().catch(console.error);
