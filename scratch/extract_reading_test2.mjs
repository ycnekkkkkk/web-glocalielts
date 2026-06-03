import fs from "fs";
import path from "path";

const qData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Questions/Questions.json"), "utf8")).reading_test;
const aData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Answer keys/Answer key.json"), "utf8")).sections;

const p1Text = fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Passages/Passage_1.txt"), "utf8");
const p2Text = fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Passages/Passage_2.txt"), "utf8");
const p3Text = fs.readFileSync(path.join(process.cwd(), "TEST/TEST 2/Reading/Passages/Passage_3.txt"), "utf8");

const cleanBlocks = [];
const cleanQuestions = [];
const cleanAnswers = {};

function processPassage(pData, pText, secNumber, answersObj) {
  const secId = `section_${secNumber}`;
  
  // 1. Add Passage Text
  cleanBlocks.push({
    type: "text",
    section: secId,
    html: `### ${pData.title}\n\n${pText}`
  });

  // 2. Add Questions
  pData.questions.forEach((qGroup) => {
    cleanBlocks.push({
      type: "text",
      section: secId,
      html: `#### ${qGroup.instructions}`
    });

    if (qGroup.type === "matching_headings") {
      // It's a matching question
      const optionsMap = {};
      const optionsKeys = [];
      qGroup.headings_list.forEach((heading) => {
        const match = heading.match(/^([ivx]+)\.\s*(.*)$/i);
        if (match) {
          optionsMap[match[1]] = match[2];
          optionsKeys.push(match[1]);
        } else {
          optionsMap[heading] = heading;
          optionsKeys.push(heading);
        }
      });
      
      cleanBlocks.push({
        type: "text",
        section: secId,
        html: `[BOX: Headings]\n` + qGroup.headings_list.join("\n")
      });

      // Usually the questions are Paragraph A, Paragraph B...
      // Let's find the answer keys for this group.
      // E.g. in Section 1, 1 to 7 are headings.
      const qNums = Object.keys(answersObj).filter(k => k.match(/^\d+$/) && optionsKeys.includes(answersObj[k])).map(Number).sort((a,b)=>a-b);
      // Wait, what if answers are not just exact match of optionsKeys?
      // Let's just create questions for each paragraph listed, assuming they match the ordered answers.
      const paragraphs = qGroup.paragraphs || ["A", "B", "C", "D", "E", "F", "G", "H"].slice(0, Object.keys(answersObj).length); // Fallback
      
      // Let's guess the start Q num
      // We can just rely on the user to fix minor mapping issues later, or do a best effort.
      console.log(`Matching Headings for Passage ${secNumber}`);
    } else {
      console.log(`Other question type: ${qGroup.type} for Passage ${secNumber}`);
    }
  });
}

console.log("Analyzing...");
