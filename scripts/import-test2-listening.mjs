import fs from "node:fs";
import path from "node:path";
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
  const root = process.cwd();
  const cleanJsonPath = path.join(root, "scratch", "test2_listening_questions_clean.json");
  
  if (!fs.existsSync(cleanJsonPath)) {
    throw new Error(`Clean JSON file not found at: ${cleanJsonPath}`);
  }
  
  const rawData = JSON.parse(fs.readFileSync(cleanJsonPath, "utf8"));
  
  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
  
  console.log(`Starting import for Exam ID: ${EXAM_ID}...`);
  
  const blocks = [];
  const questions = [];
  const answers = {};
  
  // Section index mapping for audios
  const audioUrls = {
    "Section 1": "/audio/test-2/Listening Test 2 Section 1.m4a",
    "Section 2": "/audio/test-2/Listening Test 2 Section 2.m4a",
    "Section 3": "/audio/test-2/Listening Test 2 Section 3.m4a",
    "Section 4": "/audio/test-2/Listening Test 2 Section 4.m4a",
  };
  
  for (const s of rawData.sections) {
    const secName = s.section; // "Section 1", etc.
    const secId = secName.toLowerCase().replace(/\s+/g, "_");
    
    // 1. Add introductory instruction text block
    blocks.push({
      type: "text",
      section: secId,
      html: `### ${s.title}\n${s.instructions}`
    });
    
    // 2. Add Section audio block
    if (audioUrls[secName]) {
      blocks.push({
        type: "audio",
        section: secId,
        url: audioUrls[secName],
        label: `Nghe Audio ${secName}`
      });
    }
    
    // 3. Compile all layout blocks into structured visual plain text
    if (secName === "Section 2") {
      // Split into MCQ text block with inline Questions 11-14, Map instruction text block, actual Image block, and Map questions block
      blocks.push({
        type: "text",
        section: secId,
        html: `#### Questions 11-14\n\nChoose the correct letter, A, B or C.\n\n[QUESTIONS: 11-14]`
      });
      
      blocks.push({
        type: "text",
        section: secId,
        html: `#### Questions 15-20\n\nLabel the map below.\nWrite the correct letter, A-F, next to questions 15-20.`
      });
      
      blocks.push({
        type: "image",
        section: secId,
        src: "/images/test-2/listening_map.png",
        alt: "Leisure Complex Plan"
      });

      blocks.push({
        type: "text",
        section: secId,
        html: `[QUESTIONS: 15-20]`
      });
    } else if (secName === "Section 3") {
      // Split into MCQs and Matching questions inline
      blocks.push({
        type: "text",
        section: secId,
        html: `#### Questions 21-25\n\nChoose the correct letter, A, B or C.\n\n[QUESTIONS: 21-25]\n\n#### Questions 26-30\n\nWhat task has been given to each person? Choose FIVE answers from the box and write the correct letter, A-G, next to questions 26-30.\n\n[BOX: Tasks Available]\nA. Abstract\nB. Acknowledgement\nC. Methodology\nD. Bibliography\nE. Literature review\nF. Results\nG. Discussion\n\n[QUESTIONS: 26-30]`
      });
    } else {
      let plainText = "";
      
      for (const b of s.layout_blocks) {
        if (b.type === "heading") {
          plainText += `#### ${b.text}\n\n`;
        } else if (b.type === "paragraph") {
          plainText += `${b.text}\n\n`;
        } else if (b.type === "inline_blank") {
          plainText += `${b.text}\n\n`;
        } else if (b.type === "group") {
          plainText += `[BOX: ${b.title}]\n`;
          if (b.items && b.items.length > 0) {
            plainText += b.items.map(item => `${item}`).join("\n") + "\n";
          }
          plainText += "\n";
        } else if (b.type === "map") {
          plainText += `[MAP: ${b.map_title} | Hướng đi: North ở phía ${b.orientation.north || "trên"}. Cổng vào ở phía ${b.orientation.entrances?.[0] || "dưới"}.]\n`;
          if (b.locations && b.locations.length > 0) {
            plainText += b.locations.map(loc => `${loc.label}: ${loc.description}`).join("\n") + "\n";
          }
          plainText += "\n";
        }
      }
      
      plainText = plainText.trim();
      if (plainText) {
        blocks.push({ type: "text", section: secId, html: plainText });
      }
    }
    
    // 4. Add Section grading questions to questions array
    for (const q of s.questions) {
      const qId = `l${q.number}`;
      const qNo = q.number;
      
      let stem = "";
      let qType = q.type;
      let options = undefined;
      let options_map = undefined;
      
      if (secName === "Section 1") {
        stem = `Question ${qNo}`;
        qType = "text";
      } else if (secName === "Section 2") {
        if (qNo >= 11 && qNo <= 14) {
          // MCQ
          const layoutQ = s.layout_blocks.find(lb => lb.type === "options" && lb.question_number === qNo);
          stem = layoutQ?.question || `Question ${qNo}`;
          qType = "single_choice";
          options = layoutQ?.choices || ["A", "B", "C"];
        } else {
          // Map matching
          const mapBlock = s.layout_blocks.find(lb => lb.type === "map");
          stem = s.layout_blocks.find(lb => lb.type === "matching_group")?.items?.find(it => it.question_number === qNo)?.label || `Question ${qNo}`;
          qType = "matching";
          // Options are choices A, B, C, D, E, F
          options = mapBlock?.locations?.map(l => l.label) || ["A", "B", "C", "D", "E", "F"];
          options_map = mapBlock?.locations?.reduce((acc, curr) => {
            acc[curr.label] = curr.description;
            return acc;
          }, {});
        }
      } else if (secName === "Section 3") {
        if (qNo >= 21 && qNo <= 25) {
          // MCQ
          const layoutQ = s.layout_blocks.find(lb => lb.type === "options" && lb.question_number === qNo);
          stem = layoutQ?.question || `Question ${qNo}`;
          qType = "single_choice";
          options = layoutQ?.choices || ["A", "B", "C"];
        } else {
          // Task matching
          const taskBlock = s.layout_blocks.find(lb => lb.type === "group" && lb.title === "Tasks Available");
          stem = s.layout_blocks.find(lb => lb.type === "matching_group")?.items?.find(it => it.question_number === qNo)?.label || `Question ${qNo}`;
          qType = "matching";
          options = taskBlock?.items || [];
        }
      } else if (secName === "Section 4") {
        stem = `Question ${qNo}`;
        qType = "text";
      }
      
      questions.push({
        id: qId,
        stem,
        type: qType,
        options,
        options_map,
        section: secId,
        display_no: qNo
      });
      
      // Populate answers
      answers[qId] = q.answer;
    }
  }
  
  // Reconstruct exam content public def
  const contentPublic = {
    version: 1,
    listening: {
      title: "IELTS Listening Practice Test 2",
      blocks,
      questions
    },
    reading: {
      title: "IELTS Academic Reading Test 2",
      blocks: [],
      questions: []
    },
    speaking: {
      title: "IELTS Speaking Practice Test 2",
      blocks: [],
      prompt: ""
    },
    writing: {
      title: "IELTS Writing Practice Test 2",
      blocks: [],
      prompt: "",
      minWords: 250
    }
  };
  
  console.log(`Inserting/Upserting Exam Def to Database...`);
  
  const { error: defErr } = await supabase
    .from("mock_skill_exam_defs")
    .upsert({
      id: EXAM_ID,
      title: "IELTS Listening Practice Test 2",
      slug: "ielts-listening-practice-test-2",
      description: "Đề thi thử IELTS Listening Test 2 phiên bản High-Fidelity Hybrid Section System chuyên nghiệp.",
      is_active: true,
      content_public: contentPublic,
      updated_at: new Date().toISOString()
    });
    
  if (defErr) {
    throw new Error(`Failed to upsert exam def: ${defErr.message}`);
  }
  
  console.log(`Inserting/Upserting Exam Answers to Database...`);
  
  const { error: ansErr } = await supabase
    .from("mock_skill_exam_answers")
    .upsert({
      exam_id: EXAM_ID,
      answers: {
        listening: answers,
        reading: {}
      },
      updated_at: new Date().toISOString()
    }, { onConflict: "exam_id" });
    
  if (ansErr) {
    throw new Error(`Failed to upsert exam answers: ${ansErr.message}`);
  }
  
  console.log(`🎉 SUCCESS! Successfully uploaded IELTS Listening Test 2 to Supabase DB!`);
}

main().catch((e) => {
  console.error("❌ IMPORT ERROR:", e);
  process.exit(1);
});
