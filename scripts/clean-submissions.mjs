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
  
  // 1. Fetch all submissions for this exam
  const { data: subs, error } = await supabase
    .from("mock_skill_submissions")
    .select("id, scores, answers_raw")
    .eq("exam_id", EXAM_ID);
    
  if (error || !subs) {
    console.error("Error fetching submissions:", error);
    return;
  }
  
  console.log(`Found ${subs.length} submissions to verify.`);
  
  let repairedCount = 0;
  for (const sub of subs) {
    let changed = false;
    const scores = sub.scores || {};
    const answersRaw = sub.answers_raw || {};

    // A. Clean up scores.reading.items
    if (scores.reading && Array.isArray(scores.reading.items)) {
      const originalLength = scores.reading.items.length;
      scores.reading.items = scores.reading.items.filter(item => {
        return item.id.startsWith("r") && !isNaN(parseInt(item.id.slice(1)));
      });
      scores.reading.total = scores.reading.items.length;
      scores.reading.correct = scores.reading.items.filter(item => item.ok).length;

      if (scores.reading.items.length !== originalLength) {
        console.log(`Sub ID ${sub.id}: Cleaned reading items from ${originalLength} to ${scores.reading.items.length}`);
        changed = true;
      }
    }

    // B. Clean up answers_raw.reading
    if (answersRaw.reading) {
      const originalKeys = Object.keys(answersRaw.reading);
      const cleanReadingAnswers = {};
      for (const [k, v] of Object.entries(answersRaw.reading)) {
        if (k.startsWith("r") && !isNaN(parseInt(k.slice(1)))) {
          cleanReadingAnswers[k] = v;
        }
      }
      if (Object.keys(cleanReadingAnswers).length !== originalKeys.length) {
        answersRaw.reading = cleanReadingAnswers;
        console.log(`Sub ID ${sub.id}: Cleaned answers_raw.reading keys from ${originalKeys.length} to ${Object.keys(cleanReadingAnswers).length}`);
        changed = true;
      }
    }

    if (changed) {
      const { error: updateError } = await supabase
        .from("mock_skill_submissions")
        .update({ scores, answers_raw: answersRaw })
        .eq("id", sub.id);
        
      if (updateError) {
        console.error(`Error updating submission ${sub.id}:`, updateError);
      } else {
        repairedCount++;
      }
    }
  }
  
  console.log(`🎉 SUCCESS! Verified all submissions. Repaired ${repairedCount} submissions.`);
}

main().catch(console.error);
