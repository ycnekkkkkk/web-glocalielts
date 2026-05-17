import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const EXAM_ID = "74f227aa-0f7b-4c5a-ba9c-7c30113039cb";

async function main() {
  console.log("Starting full import for Exam ID:", EXAM_ID);
  
  // 1. Fetch current exam
  const { data: examData, error: examErr } = await supabase.from("mock_skill_exam_defs").select("*").eq("id", EXAM_ID).single();
  if (examErr) throw examErr;
  
  const content = examData.content_public;
  const answersObj = examData.answers;
  
  // ==========================================
  // READING
  // ==========================================
  const qData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Questions/Questions.json"), "utf8")).reading_test;
  const aData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Answer keys/Answer key.json"), "utf8")).sections;
  
  const p1Text = fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Passages/Passage_1.txt"), "utf8");
  const p2Text = fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Passages/Passage_2.txt"), "utf8");
  const p3Text = fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Passages/Passage_3.txt"), "utf8");
  
  const readingBlocks = [];
  const readingQuestions = [];
  const readingAnswersObj = {};

  function parsePassage(pKey, pText, secNum) {
    const pInfo = qData[pKey];
    const secId = `section_${secNum}`;
    const ansSec = aData.find(s => s.section_number === secNum).answers;
    
    // Add text block
    readingBlocks.push({
      type: "text",
      section: secId,
      html: `### ${pInfo.title}\n\n${pText}`
    });
    
    // Process questions
    let currentQIdx = 0;
    const ansKeys = Object.keys(ansSec).sort((a, b) => {
      const numA = parseInt(a.split('_')[0], 10);
      const numB = parseInt(b.split('_')[0], 10);
      return numA - numB;
    });

    pInfo.questions.forEach((qGroup) => {
      // Find the range of answers for this group based on IELTS conventions
      // e.g. matching_headings usually comes first
      if (qGroup.type === "matching_headings") {
        const pCount = (qGroup.paragraphs || []).length || Object.keys(ansSec).filter(k => isNaN(parseInt(k)) === false && ansSec[k].match(/^[ivxlcdm]+$/)).length;
        const qSubset = ansKeys.slice(currentQIdx, currentQIdx + pCount);
        
        let startQ = qSubset[0];
        let endQ = qSubset[qSubset.length - 1];
        
        readingBlocks.push({
          type: "text",
          section: secId,
          html: `#### Questions ${startQ}-${endQ}\n\n${qGroup.instructions}`
        });

        const optionsMap = {};
        qGroup.headings_list.forEach((heading) => {
          const match = heading.match(/^([ivx]+)\.\s*(.*)$/i);
          if (match) {
            optionsMap[match[1]] = match[2];
          } else {
            optionsMap[heading] = heading;
          }
        });
        
        readingBlocks.push({
          type: "text",
          section: secId,
          html: `[BOX: Headings]\n` + qGroup.headings_list.map(h => `- ${h}`).join("\n") + `\n\n[QUESTIONS: ${startQ}-${endQ}]`
        });

        qSubset.forEach((qKey, i) => {
          const paraLetter = qGroup.paragraphs ? qGroup.paragraphs[i] : String.fromCharCode(65 + i);
          readingQuestions.push({
            id: `r${qKey}`,
            display_no: parseInt(qKey, 10),
            section: secId,
            stem: `Paragraph ${paraLetter}`,
            type: "matching",
            options: Object.keys(optionsMap),
            options_map: optionsMap
          });
          readingAnswersObj[`r${qKey}`] = Object.keys(optionsMap).findIndex(k => k === ansSec[qKey]);
        });
        
        currentQIdx += pCount;
      } else if (qGroup.type === "short_answer") {
        const startQ = qGroup.items[0].id;
        const endQ = qGroup.items[qGroup.items.length - 1].id;
        readingBlocks.push({
          type: "text",
          section: secId,
          html: `#### Questions ${startQ}-${endQ}\n\n${qGroup.instructions}\n\n[QUESTIONS: ${startQ}-${endQ}]`
        });
        
        qGroup.items.forEach(item => {
          readingQuestions.push({
            id: `r${item.id}`,
            display_no: item.id,
            section: secId,
            stem: item.question,
            type: "text"
          });
          readingAnswersObj[`r${item.id}`] = ansSec[String(item.id)];
          currentQIdx++;
        });
      } else if (qGroup.type === "multiple_choice_selection") {
        // e.g. 12_13
        const keys = Object.keys(qGroup.options);
        const optionsText = keys.map(k => `${k}. ${qGroup.options[k]}`);
        
        // Let's assume the remaining questions are for this group
        const qSubset = ansKeys.slice(currentQIdx);
        // Find if it's a compound like 12_13
        let compoundKey = qSubset.find(k => k.includes("_"));
        if (compoundKey) {
          const parts = compoundKey.split("_");
          readingBlocks.push({
            type: "text",
            section: secId,
            html: `#### Questions ${parts[0]}-${parts[1]}\n\n${qGroup.instructions}\n\n[QUESTIONS: ${parts[0]}-${parts[1]}]`
          });
          parts.forEach((p, idx) => {
            readingQuestions.push({
              id: `r${p}`,
              display_no: parseInt(p, 10),
              section: secId,
              stem: `Select option ${idx + 1}`,
              type: "single_choice",
              options: optionsText
            });
            // The answer in JSON is { options: ["C", "E"], rule: "in either order" }
            readingAnswersObj[`r${p}`] = keys.indexOf(ansSec[compoundKey].options[idx]);
          });
          currentQIdx++; // it was one compound key
        } else {
           // fallback standard MCQ
        }
      } else if (qGroup.type === "note_completion" || qGroup.type === "summary_completion") {
        let qs = [];
        let htmlText = "";
        if (qGroup.sections) {
          qGroup.sections.forEach(sec => {
            htmlText += `[BOX: ${sec.researcher || "Notes"}]\n`;
            sec.notes.forEach(n => {
              htmlText += `- ${n.replace(/(\d+)\.{3,}/g, '($1) _____')}\n`;
              const match = n.match(/(\d+)\.{3,}/);
              if (match) qs.push(match[1]);
            });
            htmlText += "\n";
          });
        }
        
        let startQ = qs[0] || currentQIdx + 14;
        let endQ = qs[qs.length-1] || startQ + qs.length - 1;
        
        readingBlocks.push({
          type: "text",
          section: secId,
          html: `#### Questions ${startQ}-${endQ}\n\n${qGroup.instructions}\n\n${htmlText}`
        });
        
        qs.forEach(qNum => {
          readingQuestions.push({
            id: `r${qNum}`,
            display_no: parseInt(qNum, 10),
            section: secId,
            stem: `Note completion ${qNum}`,
            type: "text"
          });
          readingAnswersObj[`r${qNum}`] = ansSec[String(qNum)];
          currentQIdx++;
        });
      } else if (qGroup.type === "matching_terms") {
        const startQ = qGroup.items[0].id;
        const endQ = qGroup.items[qGroup.items.length-1].id;
        const styleKeys = Object.keys(qGroup.styles);
        const styleText = styleKeys.map(k => `${k}. ${qGroup.styles[k]}`);
        
        readingBlocks.push({
          type: "text",
          section: secId,
          html: `#### Questions ${startQ}-${endQ}\n\n${qGroup.instructions}\n\n[BOX: Options]\n` + styleText.map(s=>`- ${s}`).join("\n") + `\n\n[QUESTIONS: ${startQ}-${endQ}]`
        });
        
        qGroup.items.forEach(item => {
          readingQuestions.push({
            id: `r${item.id}`,
            display_no: item.id,
            section: secId,
            stem: item.statement,
            type: "matching",
            options: styleKeys,
            options_map: qGroup.styles
          });
          readingAnswersObj[`r${item.id}`] = styleKeys.indexOf(ansSec[String(item.id)]);
          currentQIdx++;
        });
      } else if (qGroup.type === "yes_no_not_given" || qGroup.type === "true_false_not_given") {
        const startQ = qGroup.items[0].id;
        const endQ = qGroup.items[qGroup.items.length-1].id;
        readingBlocks.push({
          type: "text",
          section: secId,
          html: `#### Questions ${startQ}-${endQ}\n\n${qGroup.instructions}\n\n[QUESTIONS: ${startQ}-${endQ}]`
        });
        
        qGroup.items.forEach(item => {
          readingQuestions.push({
            id: `r${item.id}`,
            display_no: item.id,
            section: secId,
            stem: item.statement,
            type: "true_false_not_given"
          });
          const aMap = { "TRUE": 0, "YES": 0, "FALSE": 1, "NO": 1, "NOT GIVEN": 2 };
          readingAnswersObj[`r${item.id}`] = aMap[ansSec[String(item.id)]];
          currentQIdx++;
        });
      }
    });
  }

  parsePassage("passage_1", p1Text, 1);
  parsePassage("passage_2", p2Text, 2);
  parsePassage("passage_3", p3Text, 3);
  
  content.reading = {
    title: "IELTS Academic Reading Test",
    blocks: readingBlocks,
    questions: readingQuestions
  };

  // ==========================================
  // SPEAKING
  // ==========================================
  const sData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scratch/test2_speaking_questions_clean.json"), "utf8"));
  
  const speakingParts = [];
  
  const p1Topics = sData.parts[0].topics.map(t => ({
    part: "1",
    type: t.topic,
    questions: t.questions
  }));
  
  speakingParts.push(...p1Topics);
  
  speakingParts.push({
    part: "2",
    type: "Task Card",
    task: sData.parts[1].task.title,
    cues: sData.parts[1].task.prompts
  });
  
  speakingParts.push({
    part: "3",
    type: "Discussion Topics",
    questions: sData.parts[2].questions
  });

  content.speaking = {
    title: "IELTS Speaking Practice Test 2",
    blocks: [],
    prompt: "Vui lòng làm theo hướng dẫn của giám khảo.",
    parts: speakingParts
  };

  // ==========================================
  // WRITING
  // ==========================================
  content.writing = {
    title: "IELTS Writing Practice Test 2",
    blocks: [],
    prompt: "",
    tasks: [
      {
        task: "1",
        instruction: "You should spend about 20 minutes on this task.",
        prompt: "The chart below shows information about student enrollment at a university over a five-year period.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
        minWords: 150,
        imageBlock: { src: "/images/test-2/writing_image1.png" }
      },
      {
        task: "2",
        instruction: "You should spend about 40 minutes on this task.",
        prompt: "Some people say it is more important to plant trees in the open spaces in towns and cities than to build more housing.\n\nTo what extent do you agree or disagree?",
        minWords: 250
      }
    ]
  };

  console.log("Reading blocks:", content.reading.blocks.length);
  console.log("Speaking parts:", content.speaking.parts.length);
  console.log("Writing tasks:", content.writing.tasks.length);
  // 4. Update DB
  const { error: updateError } = await supabase.from("mock_skill_exam_defs").update({ 
    title: "IELTS Practice Test 2",
    content_public: content
  }).eq("id", EXAM_ID);
  
  if (updateError) {
    console.error("UPDATE ERROR:", updateError);
    return;
  }
  
  const { error: ansError } = await supabase.from("mock_skill_exam_answers").upsert({
    exam_id: EXAM_ID,
    answers: { ...answersObj, ...readingAnswersObj }
  });
  
  if (ansError) {
    console.error("ANSWER UPDATE ERROR:", ansError);
  }
  
  console.log("🎉 SUCCESS! Updated Exam Title, Reading, Speaking, and Writing!");
}

main().catch(console.error);
