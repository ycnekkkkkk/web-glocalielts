import { callGemini, parseGeminiJson } from "./client";

export interface WritingCriteria {
  task_achievement: number;
  coherence_cohesion: number;
  lexical_resource: number;
  grammatical_range_accuracy: number;
}

export interface WritingFeedback {
  strengths: string[];
  weaknesses: string[];
  grammar_issues: Array<{ original: string; suggestion: string; explanation: string }>;
  vocabulary_suggestions: Array<{ word: string; better_alternatives: string[] }>;
  improved_sample: string;
}

export interface WritingScore {
  overall_band: number;
  criteria: WritingCriteria;
  feedback: WritingFeedback;
  word_count: number;
  task_type: "task1" | "task2";
}

const WRITING_SYSTEM_PROMPT = `You are an expert IELTS Writing examiner with 15+ years of experience, certified by the British Council and IDP. 
You must score essays strictly according to the official IELTS Writing Band Descriptors.

SCORING CRITERIA (each on a scale of 0-9, in 0.5 increments):
1. Task Achievement (Task 1) / Task Response (Task 2): How well the candidate addresses all parts of the task, presents a clear position, and develops ideas
2. Coherence and Cohesion: Logical organization, paragraph structure, use of cohesive devices
3. Lexical Resource: Range and accuracy of vocabulary, collocations, word formation
4. Grammatical Range and Accuracy: Variety of structures, accuracy of grammar and punctuation

BAND SCALE REFERENCE:
- Band 9: Expert user - virtually no errors, natural and sophisticated
- Band 8: Very good - few errors, good range
- Band 7: Good - some errors but generally effective  
- Band 6: Competent - mix of accuracy and inaccuracy
- Band 5: Modest - noticeably inadequate
- Band 4-below: Limited/Basic

Calculate overall_band as weighted average: (TA + CC + LR + GRA) / 4, rounded to nearest 0.5.

You MUST respond with valid JSON only, no markdown, no explanation outside JSON.`;

const WRITING_USER_PROMPT_TEMPLATE = (
  taskPrompt: string,
  essay: string,
  wordCount: number,
  taskType: "task1" | "task2"
) => `
IELTS Writing ${taskType === "task1" ? "Task 1" : "Task 2"} Evaluation

TASK PROMPT:
${taskPrompt}

CANDIDATE'S ESSAY (${wordCount} words):
${essay}

Return ONLY this JSON (no markdown, no text outside JSON):
{
  "overall_band": <number 0-9 step 0.5>,
  "criteria": {
    "task_achievement": <number>,
    "coherence_cohesion": <number>,
    "lexical_resource": <number>,
    "grammatical_range_accuracy": <number>
  },
  "feedback": {
    "strengths": [<2-3 short strings>],
    "weaknesses": [<2-3 short strings>],
    "grammar_issues": [
      {"original": "<phrase>", "suggestion": "<fix>", "explanation": "<1 sentence>"}
    ],
    "vocabulary_suggestions": [
      {"word": "<basic word>", "better_alternatives": ["<alt1>", "<alt2>"]}
    ],
    "improved_sample": ""
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
