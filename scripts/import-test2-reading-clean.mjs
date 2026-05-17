import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EXAM_ID = "74f227aa-0f7b-4c5a-ba9c-7c30113039cb";

async function main() {
  console.log("Starting clean Reading import for Exam ID:", EXAM_ID);
  
  // 1. Fetch current exam
  const { data: examData, error: examErr } = await supabase.from("mock_skill_exam_defs").select("*").eq("id", EXAM_ID).single();
  if (examErr) throw examErr;
  
  const content = examData.content_public;
  
  // 2. Fetch current answers
  const { data: ansData, error: ansErr } = await supabase.from("mock_skill_exam_answers").select("*").eq("exam_id", EXAM_ID).single();
  let answersObj = {};
  if (!ansErr && ansData) {
    answersObj = ansData.answers || {};
  }
  
  // Clean all previous reading answers (keys starting with 'r')
  Object.keys(answersObj).forEach(k => {
    if (k.startsWith("r")) {
      delete answersObj[k];
    }
  });

  // 3. Load raw files
  const qData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Questions/Questions.json"), "utf8")).reading_test;
  const aData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Answer keys/Answer key.json"), "utf8")).sections;
  
  let p1Raw = fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Passages/Passage_1.txt"), "utf8");
  p1Raw = p1Raw.replace("probiotics1", "probiotics^1");
  p1Raw = p1Raw.replace("1 Probiotic = substance containing beneficial and intestine-friendly microorganisms", "---\n^1 Probiotic = substance containing beneficial and intestine-friendly microorganisms");
  
  const p2Raw = fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Passages/Passage_2.txt"), "utf8");
  const p3Raw = fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Passages/Passage_3.txt"), "utf8");
  
  // Helper to format passage text to clean Markdown
  function formatPassageMarkdown(title, rawText) {
    const paras = rawText
      .split(/\r?\n/)
      .map(p => p.trim())
      .filter(Boolean);
    
    return `#### ${title}\n\n${paras.join("\n\n")}`;
  }

  const readingBlocks = [
    {
      type: "text",
      section: "reading_passage_1",
      html: formatPassageMarkdown("Passage 1: The Magic of Kefir", p1Raw)
    },
    {
      type: "text",
      section: "reading_passage_2",
      html: formatPassageMarkdown("Passage 2: Edible Insects", p2Raw)
    },
    {
      type: "text",
      section: "reading_passage_3",
      html: formatPassageMarkdown("Passage 3: Love Stories", p3Raw)
    }
  ];

  const readingQuestions = [];

  // ==========================================
  // PASSAGE 1 QUESTIONS (1-13)
  // ==========================================
  const p1Ans = aData.find(s => s.section_number === 1).answers;
  const p1Info = qData.passage_1;

  // Q1-7: Matching Headings
  const p1HeadingsGroup = p1Info.questions.find(q => q.type === "matching_headings");
  const p1HeadingsList = p1HeadingsGroup.headings_list;
  
  const p1HeadingsOptionsMap = {};
  p1HeadingsList.forEach(h => {
    const match = h.match(/^([ivx]+)\.\s*(.*)$/i);
    if (match) {
      p1HeadingsOptionsMap[match[1].toLowerCase()] = h;
    }
  });

  const p1HeadingsOptions = Object.keys(p1HeadingsOptionsMap); // ["i", "ii", ...]

  for (let i = 1; i <= 7; i++) {
    const letter = String.fromCharCode(64 + i); // A, B, C...
    readingQuestions.push({
      id: `r${i}`,
      display_no: i,
      section: "reading_passage_1",
      stem: `Paragraph ${letter}`,
      type: "matching",
      options: p1HeadingsOptions,
      options_map: p1HeadingsOptionsMap
    });
    
    // Map answer
    const ansKey = p1Ans[String(i)].toLowerCase();
    const ansIdx = p1HeadingsOptions.indexOf(ansKey);
    answersObj[`r${i}`] = ansIdx;
  }

  // Q8-11: Short Answer Questions
  const p1ShortGroup = p1Info.questions.find(q => q.type === "short_answer");
  p1ShortGroup.items.forEach(item => {
    readingQuestions.push({
      id: `r${item.id}`,
      display_no: item.id,
      section: "reading_passage_1",
      stem: item.question,
      type: "text"
    });
    answersObj[`r${item.id}`] = p1Ans[String(item.id)];
  });

  // Q12-13: Multiple Choice Selection (Choose 2 of 5)
  // Options: A-E. We split this into two separate questions for simple layout
  const p1MCQGroup = p1Info.questions.find(q => q.type === "multiple_choice_selection");
  const p1MCQOptions = Object.keys(p1MCQGroup.options).map(k => `${k}. ${p1MCQGroup.options[k]}`);
  const p1MCQAnswers = p1Ans["12_13"].options; // ["C", "E"]
  
  for (let i = 12; i <= 13; i++) {
    readingQuestions.push({
      id: `r${i}`,
      display_no: i,
      section: "reading_passage_1",
      stem: `Which product is NOT mentioned as things which kefir can replace? (Choice ${i - 11} of 2)`,
      type: "single_choice",
      options: p1MCQOptions
    });
    
    const letterIdx = ["A", "B", "C", "D", "E"].indexOf(p1MCQAnswers[i - 12]);
    answersObj[`r${i}`] = letterIdx;
  }

  // ==========================================
  // PASSAGE 2 QUESTIONS (14-26)
  // ==========================================
  const p2Ans = aData.find(s => s.section_number === 2).answers;
  const p2Info = qData.passage_2;

  // Q14-21: Matching Headings
  const p2HeadingsGroup = p2Info.questions.find(q => q.type === "matching_headings");
  const p2HeadingsList = p2HeadingsGroup.headings_list;
  const p2HeadingsOptionsMap = {};
  p2HeadingsList.forEach(h => {
    const match = h.match(/^([ivx]+)\.\s*(.*)$/i);
    if (match) {
      p2HeadingsOptionsMap[match[1].toLowerCase()] = h;
    }
  });
  const p2HeadingsOptions = Object.keys(p2HeadingsOptionsMap);

  for (let i = 14; i <= 21; i++) {
    const letter = String.fromCharCode(65 + (i - 14)); // A, B, C...
    readingQuestions.push({
      id: `r${i}`,
      display_no: i,
      section: "reading_passage_2",
      stem: `Paragraph ${letter}`,
      type: "matching",
      options: p2HeadingsOptions,
      options_map: p2HeadingsOptionsMap
    });
    
    const ansKey = p2Ans[String(i)].toLowerCase();
    const ansIdx = p2HeadingsOptions.indexOf(ansKey);
    answersObj[`r${i}`] = ansIdx;
  }

  // Q22-26: Note Completion
  // Sentences extracted cleanly
  const p2Notes = [
    { id: 22, stem: "Van Huis notes: Insects use food intake economically in the production of protein as they waste less __________." },
    { id: 23, stem: "Durst notes: Traditional knowledge could be combined with modern methods for mass production instead of just covering __________." },
    { id: 24, stem: "Durst notes: This could help __________ people gain access to world markets." },
    { id: 25, stem: "Dunkel notes: Due to increased __________ (Question 25), more children in Mali are suffering from kwashiorkor (Question 26)." },
    { id: 26, stem: "Dunkel notes: Due to increased pesticide use (Question 25), more children in Mali are suffering from __________ (Question 26)." }
  ];

  p2Notes.forEach(note => {
    readingQuestions.push({
      id: `r${note.id}`,
      display_no: note.id,
      section: "reading_passage_2",
      stem: note.stem,
      type: "text"
    });
    answersObj[`r${note.id}`] = p2Ans[String(note.id)];
  });

  // ==========================================
  // PASSAGE 3 QUESTIONS (27-40)
  // ==========================================
  const p3Ans = aData.find(s => s.section_number === 3).answers;
  const p3Info = qData.passage_3;

  // Q27-34: Matching terms (Love Styles)
  const p3MatchingGroup = p3Info.questions.find(q => q.type === "matching_terms");
  const p3StylesMap = p3MatchingGroup.styles;
  const p3StylesKeys = Object.keys(p3StylesMap); // ["A", "B", ...]

  p3MatchingGroup.items.forEach(item => {
    readingQuestions.push({
      id: `r${item.id}`,
      display_no: item.id,
      section: "reading_passage_3",
      stem: item.statement,
      type: "matching",
      options: p3StylesKeys,
      options_map: p3StylesMap
    });
    
    const ansKey = p3Ans[String(item.id)]; // "A", "B", ...
    const ansIdx = p3StylesKeys.indexOf(ansKey);
    answersObj[`r${item.id}`] = ansIdx;
  });

  // Q35-40: Yes/No/Not Given
  const p3TFGroup = p3Info.questions.find(q => q.type === "yes_no_not_given");
  p3TFGroup.items.forEach(item => {
    readingQuestions.push({
      id: `r${item.id}`,
      display_no: item.id,
      section: "reading_passage_3",
      stem: item.statement,
      type: "true_false_not_given"
    });
    
    const ansVal = p3Ans[String(item.id)]; // "YES", "NO", "NOT GIVEN"
    const aMap = { "YES": 0, "NO": 1, "NOT GIVEN": 2 };
    answersObj[`r${item.id}`] = aMap[ansVal];
  });

  // 4. Set reading in content_public
  content.reading = {
    title: "IELTS Academic Reading Test",
    blocks: readingBlocks,
    questions: readingQuestions
  };

  // 5. Update DB (MockSkillExamDef)
  const { error: defErr } = await supabase
    .from("mock_skill_exam_defs")
    .update({ content_public: content })
    .eq("id", EXAM_ID);
  
  if (defErr) {
    console.error("DEF UPDATE ERROR:", defErr);
    return;
  }

  // 6. Update DB (MockSkillExamAnswers)
  const cleanListeningJsonPath = path.join(process.cwd(), "scratch", "test2_listening_questions_clean.json");
  const listeningAnswersObj = {};
  if (fs.existsSync(cleanListeningJsonPath)) {
    const rawListeningData = JSON.parse(fs.readFileSync(cleanListeningJsonPath, "utf8"));
    for (const s of rawListeningData.sections) {
      for (const q of s.questions) {
        listeningAnswersObj[`l${q.number}`] = q.answer;
      }
    }
  }

  const structuredAnswers = {
    listening: listeningAnswersObj,
    reading: answersObj
  };

  const { error: ansUpdateErr } = await supabase
    .from("mock_skill_exam_answers")
    .upsert({
      exam_id: EXAM_ID,
      answers: structuredAnswers
    }, { onConflict: "exam_id" });
  
  if (ansUpdateErr) {
    console.error("ANS UPDATE ERROR:", ansUpdateErr);
    return;
  }

  console.log("🎉 SUCCESS! Clean Reading section and answers imported successfully!");
}

main().catch(console.error);
