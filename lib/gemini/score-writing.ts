import { callGemini, parseGeminiJson } from "./client";

export interface WritingCriteria {
  task_achievement: number; // Task Achievement (Task 1) or Task Response (Task 2)
  coherence_cohesion: number;
  lexical_resource: number;
  grammatical_range_accuracy: number;
}

export interface WritingCriteriaBreakdown {
  overview_or_position: string; // Đánh giá Overview (Task 1) hoặc Lập trường/Clear Position (Task 2)
  cohesion_and_referencing: string; // Đánh giá tính mạch lạc, phân đoạn và đại từ quy chiếu
  lexical_assessment: string; // Đánh giá phạm vi từ vựng, collocations & tính học thuật
  grammatical_assessment: string; // Đánh giá cấu trúc câu, tỷ lệ câu không lỗi và dấu câu
}

export interface WritingFeedback {
  strengths: string[];
  weaknesses: string[];
  criteria_breakdown?: WritingCriteriaBreakdown;
  grammar_issues: Array<{ original: string; suggestion: string; explanation: string; example?: string }>;
  vocabulary_suggestions: Array<{ original: string; suggestion: string; explanation: string; example?: string }>;
  improved_sample: string;
}

export interface WritingScore {
  overall_band: number;
  criteria: WritingCriteria;
  feedback: WritingFeedback;
  word_count: number;
  task_type: "task1" | "task2";
}

const WRITING_SYSTEM_PROMPT = `You are a Senior IELTS Writing Examiner with 15+ years of official examination experience, certified by the British Council, IDP, and Cambridge Assessment English.
You evaluate essays strictly in accordance with the official "IELTS Writing Band Descriptors (Updated May 2023)".

OFFICIAL SCORING RUBRIC (EACH 0.0 - 9.0 in 0.5 INCREMENTS):

1. FOR TASK 1: TASK ACHIEVEMENT (TA)
- Band 9: All requirements fully satisfied; extremely rare lapses in content.
- Band 8: Key features skilfully selected, clearly presented, highlighted and illustrated; may have occasional omissions.
- Band 7: Presents a CLEAR OVERVIEW with main trends/differences identified; data appropriately categorised; key features clearly highlighted though could be more fully illustrated.
- Band 6: Relevant overview attempted; key features adequately highlighted with figures/data; some details missing or slightly inaccurate.
- Band 5: Recounting of detail mainly mechanical; NO clear overview or overview is unclear; limited data to support descriptions. (Crucial: If there is NO overview, TA CANNOT exceed 5.0).
- Band 4 or below: Few key features selected; data irrelevant or repetitive; underlength.

2. FOR TASK 2: TASK RESPONSE (TR)
- Band 9: Prompt explored in depth; clear, fully developed position presented throughout which directly answers all parts of the question; ideas relevant, fully extended and well supported.
- Band 8: Prompt sufficiently addressed; clear and well-developed position throughout; ideas well extended and supported.
- Band 7: Main parts of prompt addressed; clear and developed position throughout; main ideas extended/supported, though may tend to over-generalise or show slight lack of focus.
- Band 6: Directly relevant position presented, though conclusions may be unclear or repetitive; main ideas relevant but insufficiently developed or supported.
- Band 5: Incompletely addressed; expresses a position but development is not always clear; ideas limited or accompanied by irrelevant detail.

3. COHERENCE & COHESION (C&C)
- Progression: Clear overall logical progression throughout (Band 7+).
- Referencing & Substitution: Skilful, flexible use of referencing and substitution (pronouns, synonyms) to avoid repetition (Band 7+). Mechanical or repetitive referencing caps score at Band 5-6.
- Paragraphing: Skilfully managed (Band 8-9); logically structured with a clear central topic in each paragraph (Band 7); basic paragraphing with occasional lapses (Band 6).

4. LEXICAL RESOURCE (LR)
- Collocation & Style: Sustained awareness of style and natural collocation (Band 7-8).
- Precision: Precise word choices; uncommon and idiomatic vocabulary used naturally.
- Spelling & Word Formation: Rare spelling errors that do not impede communication (Band 7+).

5. GRAMMATICAL RANGE & ACCURACY (GRA)
- Error-Free Sentences: The majority of sentences are error-free (Band 8); error-free sentences are frequent (Band 7); mix of simple and complex sentence forms with frequent complex structure errors (Band 6).
- Punctuation: Accurate control of punctuation (full stops, commas, semicolons). Run-on sentences or faulty punctuation directly lowers GRA to Band 5-6.

CALCULATE OVERALL BAND:
Weighted average of the 4 criteria: (TA/TR + CC + LR + GRA) / 4, rounded to the nearest 0.5 increment (e.g. 6.25 -> 6.5, 6.75 -> 7.0, 6.125 -> 6.0).

CRITICAL LANGUAGE & OUTPUT RULES:
- All candidate-facing explanations (feedback, strengths, weaknesses, criteria_breakdown, explanations, and advice) MUST be written in 100% natural, pedagogical Vietnamese (Tiếng Việt).
- "original", "suggestion" (in grammar_issues & vocabulary_suggestions), and "improved_sample" MUST be in high-standard, authentic Academic English.
- Return ONLY valid JSON matching the exact schema provided.`;

const WRITING_USER_PROMPT_TEMPLATE = (
  taskPrompt: string,
  essay: string,
  wordCount: number,
  taskType: "task1" | "task2"
) => `
IELTS Academic Writing ${taskType === "task1" ? "Task 1 (Report/Summary)" : "Task 2 (Essay)"} Evaluation.

OFFICIAL TASK PROMPT:
${taskPrompt}

CANDIDATE ESSAY SUBMISSION (${wordCount} words):
${essay}

Conduct an exhaustive, sentence-level analysis using the May 2023 Band Descriptors:
1. Examine if Task 1 has a clear Overview and precise data selection, or if Task 2 maintains a clear Position throughout with in-depth development.
2. Check Cohesion: Evaluate paragraph progression, linking devices, and pronoun referencing / substitution.
3. Check GRA: Identify errors line-by-line, calculate frequency of error-free sentences, and inspect punctuation.
4. Check LR: Identify basic words and recommend natural academic collocations.
5. Provide a Band 8.5+ upgraded sample essay keeping the student's core arguments.

Return ONLY this JSON:
{
  "overall_band": <number 0-9 step 0.5>,
  "criteria": {
    "task_achievement": <number 0-9 step 0.5>,
    "coherence_cohesion": <number 0-9 step 0.5>,
    "lexical_resource": <number 0-9 step 0.5>,
    "grammatical_range_accuracy": <number 0-9 step 0.5>
  },
  "feedback": {
    "strengths": [<2-3 specific, encouraging points in Vietnamese based on rubric>],
    "weaknesses": [<2-3 actionable points in Vietnamese to reach the next band>],
    "criteria_breakdown": {
      "overview_or_position": "<Đánh giá chi tiết bằng tiếng Việt về Overview (Task 1) hoặc Lập trường & Luận điểm (Task 2)>",
      "cohesion_and_referencing": "<Đánh giá chi tiết bằng tiếng Việt về mạch lạc, chia đoạn, và cách dùng đại từ quy chiếu / thay thế>",
      "lexical_assessment": "<Đánh giá chi tiết bằng tiếng Việt về độ đa dạng từ vựng, collocations và tính chính xác học thuật>",
      "grammatical_assessment": "<Đánh giá chi tiết bằng tiếng Việt về cấu trúc câu đơn/phức, tần suất câu không lỗi và dấu câu>"
    },
    "grammar_issues": [
      {
        "original": "<exact sentence or clause with grammatical/punctuation error>",
        "suggestion": "<corrected, natural Academic English version>",
        "explanation": "<phân tích ngữ pháp chi tiết bằng tiếng Việt: tại sao sai, nguyên tắc ngữ pháp chuẩn>",
        "example": "<câu tiếng Anh mẫu minh họa cho quy tắc này, kèm bản dịch tiếng Việt trong ngoặc đơn>"
      }
    ],
    "vocabulary_suggestions": [
      {
        "original": "<basic, repetitive, or awkward word/phrase>",
        "suggestion": "<high-band C1/C2 academic alternative or collocation>",
        "explanation": "<giải thích sắc thái nghĩa và tại sao cách dùng này nâng điểm Lexical Resource bằng tiếng Việt>",
        "example": "<câu ví dụ tiếng Anh chứa cụm từ này, kèm bản dịch tiếng Việt trong ngoặc đơn>"
      }
    ],
    "improved_sample": "<Full rewritten Band 8.5+ model essay retaining candidate's main ideas, with clear paragraph breaks (\\n\\n)>"
  },
  "word_count": ${wordCount},
  "task_type": "${taskType}"
}`;

function detectTaskType(prompt: string, wordCount: number): "task1" | "task2" {
  const lowerPrompt = prompt.toLowerCase();
  if (
    lowerPrompt.includes("task 1") ||
    lowerPrompt.includes("summarise") ||
    lowerPrompt.includes("describe the") ||
    lowerPrompt.includes("the chart") ||
    lowerPrompt.includes("the graph") ||
    lowerPrompt.includes("the table") ||
    lowerPrompt.includes("the diagram") ||
    wordCount < 180
  ) {
    return "task1";
  }
  return "task2";
}

export async function scoreWriting(
  taskPrompt: string,
  essay: string,
  wordCount?: number
): Promise<WritingScore> {
  const wc = wordCount ?? essay.trim().split(/\s+/).filter(Boolean).length;
  const taskType = detectTaskType(taskPrompt, wc);

  const request = {
    systemInstruction: {
      parts: [{ text: WRITING_SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: WRITING_USER_PROMPT_TEMPLATE(taskPrompt, essay, wc, taskType),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  };

  const raw = await callGemini(request);
  const result = parseGeminiJson<WritingScore>(raw);

  // Validate and sanitize band scores
  function clampBand(v: unknown): number {
    const n = typeof v === "number" ? v : parseFloat(String(v));
    if (!Number.isFinite(n)) return 5.0;
    return Math.round(Math.max(0, Math.min(9, n)) * 2) / 2;
  }

  return {
    overall_band: clampBand(result.overall_band),
    criteria: {
      task_achievement: clampBand(result.criteria?.task_achievement),
      coherence_cohesion: clampBand(result.criteria?.coherence_cohesion),
      lexical_resource: clampBand(result.criteria?.lexical_resource),
      grammatical_range_accuracy: clampBand(result.criteria?.grammatical_range_accuracy),
    },
    feedback: {
      strengths: Array.isArray(result.feedback?.strengths) ? result.feedback.strengths.slice(0, 5) : [],
      weaknesses: Array.isArray(result.feedback?.weaknesses) ? result.feedback.weaknesses.slice(0, 5) : [],
      criteria_breakdown: result.feedback?.criteria_breakdown,
      grammar_issues: Array.isArray(result.feedback?.grammar_issues)
        ? result.feedback.grammar_issues.slice(0, 8)
        : [],
      vocabulary_suggestions: Array.isArray(result.feedback?.vocabulary_suggestions)
        ? result.feedback.vocabulary_suggestions.slice(0, 6)
        : [],
      improved_sample: result.feedback?.improved_sample || "",
    },
    word_count: wc,
    task_type: taskType,
  };
}
