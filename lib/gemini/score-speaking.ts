import { callGemini, parseGeminiJson } from "./client";

export interface SpeakingCriteria {
  fluency_coherence: number;
  lexical_resource: number;
  grammatical_range_accuracy: number;
  pronunciation: number;
}

export interface SpeakingFeedback {
  strengths: string[];
  weaknesses: string[];
  pronunciation_issues: Array<{ word: string; correct_pronunciation: string; tip: string; example?: string }>;
  natural_suggestions: Array<{ original: string; improved: string; explanation?: string; example?: string }>;
}

export interface SpeakingScore {
  overall_band: number;
  criteria: SpeakingCriteria;
  transcript: string;
  feedback: SpeakingFeedback;
}

const SPEAKING_SYSTEM_PROMPT = `You are an expert IELTS Speaking examiner certified by the British Council.
You will receive an audio recording of a candidate's IELTS Speaking response.

Your job:
1. Transcribe the audio accurately (keep concise, max 300 words)
2. Score on 4 criteria (0-9 scale, 0.5 increments):
   - Fluency & Coherence: Pace, hesitation, topic development, logical sequencing
   - Lexical Resource: Vocabulary range, paraphrasing ability, idiomatic language
   - Grammatical Range & Accuracy: Complex structures, tense accuracy, clause variety
   - Pronunciation: Intelligibility, individual sounds, word stress, intonation
3. overall_band = average of 4 criteria, rounded to nearest 0.5
4. Provide concise, actionable feedback

CRITICAL LANGUAGE REQUIREMENT:
You MUST write all candidate-facing evaluation details (feedback, strengths, weaknesses, tips, explanations, and advice) ENTIRELY in Vietnamese (Tiếng Việt). Do not mix English and Vietnamese in these explanation fields.
However, "word" in pronunciation_issues, "original" in natural_suggestions, and "improved" in natural_suggestions MUST ALWAYS BE WRITTEN IN NATIVE ENGLISH (Tiếng Anh), because they represent the original English speech of the candidate and the upgraded natural native English phrasing suggestions. DO NOT translate these specific fields to Vietnamese.

Respond with ONLY valid JSON, no text outside JSON.`;

const SPEAKING_PROMPT_TEMPLATE = (examPrompt: string) => `
The candidate was asked: "${examPrompt}"

Your job is to act as an extremely rigorous, detailed, and encouraging expert IELTS examiner. 
Listen closely to all candidate audio files. For EACH grammatical error, pronunciation slip, awkward phrasing, or vocabulary gap, provide highly detailed feedback. Avoid generic or high-level observations; focus on pointing out the exact spoken sentence, explaining the grammar/pronunciation rules in detail in Vietnamese, and giving concrete examples.

Analyze the audio and respond ONLY with this JSON (no markdown):
{
  "overall_band": <number 0-9 step 0.5>,
  "criteria": {
    "fluency_coherence": <number>,
    "lexical_resource": <number>,
    "grammatical_range_accuracy": <number>,
    "pronunciation": <number>
  },
  "transcript": "<concise transcription of their speaking response, max 300 words>",
  "feedback": {
    "strengths": [<2-3 specific, encouraging points in Vietnamese>],
    "weaknesses": [<2-3 actionable areas to improve in Vietnamese>],
    "pronunciation_issues": [
      {
        "word": "<the specific English word mispronounced, MUST BE IN ENGLISH>",
        "correct_pronunciation": "<the standard IPA pronunciation of the word>",
        "tip": "<highly detailed, easy-to-understand Vietnamese tip on mouth/tongue shape, ending sounds, and how to fix this common pronunciation mistake>",
        "example": "<another English word sharing the exact same phonetic sound, followed by its IPA in parentheses>"
      }
    ],
    "natural_suggestions": [
      {
        "original": "<the exact awkward, repetitive, or grammatically incorrect English phrase they spoke, MUST BE IN ENGLISH>",
        "improved": "<the corrected, professional, and natural native speaker version in NATIVE ENGLISH. NEVER translate this field to Vietnamese>",
        "explanation": "<detailed Vietnamese explanation of what was awkward or incorrect, what the grammar/idiomatic rule is, and why this alternative elevates their band score>",
        "example": "<sample English sentence showing this natural alternative in a new context, followed by its Vietnamese translation in parentheses>"
      }
    ]
  }
}`;

const TEXT_FALLBACK_SYSTEM = `You are an expert IELTS Speaking examiner.
Given a transcript of a speaking response, analyze it and provide IELTS Speaking scores.
Note: pronunciation scoring is limited without audio — give a reasonable estimate.

CRITICAL LANGUAGE REQUIREMENT:
You MUST write all candidate-facing evaluation details (feedback, strengths, weaknesses, tips, explanations, and advice) ENTIRELY in Vietnamese (Tiếng Việt). Do not mix English and Vietnamese in these explanation fields.
However, "word" in pronunciation_issues, "original" in natural_suggestions, and "improved" in natural_suggestions MUST ALWAYS BE WRITTEN IN NATIVE ENGLISH (Tiếng Anh), because they represent the original English speech of the candidate and the upgraded natural native English phrasing suggestions. DO NOT translate these specific fields to Vietnamese.

Respond with ONLY valid JSON.`;

export async function scoreSpeaking(
  audioBase64: string,
  mimeType: string,
  examPrompt: string
): Promise<SpeakingScore> {
  // Primary: multimodal audio analysis
  try {
    const request = {
      systemInstruction: {
        parts: [{ text: SPEAKING_SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: audioBase64,
              },
            },
            {
              text: SPEAKING_PROMPT_TEMPLATE(examPrompt),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 3000,
        responseMimeType: "application/json",
      },
    };

    const raw = await callGemini(request);
    return sanitizeSpeakingScore(parseGeminiJson<SpeakingScore>(raw));
  } catch (err) {
    // Fallback: text-only scoring if audio fails (model not support multimodal, etc.)
    console.error("[score-speaking] Multimodal failed, trying text fallback:", err);
    return getFallbackSpeakingScore(examPrompt);
  }
}

export interface SpeakingAudioItem {
  base64: string;
  mimeType: string;
  name: string;
}

export async function scoreSpeakingMulti(
  audios: SpeakingAudioItem[],
  examPrompt: string
): Promise<SpeakingScore> {
  if (audios.length === 0) {
    return getFallbackSpeakingScore(examPrompt);
  }

  try {
    const request = {
      systemInstruction: {
        parts: [{ text: SPEAKING_SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [
            ...audios.map((a) => ({
              inline_data: {
                mime_type: a.mimeType,
                data: a.base64,
              },
            })),
            {
              text: `Here are the multiple audio recordings from the candidate for the IELTS Speaking test.
The recordings correspond to:
${audios.map((a, idx) => `- Audio ${idx + 1}: part/question "${a.name}"`).join("\n")}

Please listen to all of these recordings collectively, analyze the candidate's pronunciation, fluency, grammar, and vocabulary range across all these parts, and produce a unified, comprehensive IELTS Speaking band score.
Your job is to act as an extremely rigorous, detailed, and encouraging expert IELTS examiner. 
For EACH grammatical error, pronunciation slip, awkward phrasing, or vocabulary gap across all audio recordings, provide highly detailed feedback. Avoid generic or high-level observations; focus on pointing out the exact spoken sentence, explaining the grammar/pronunciation rules in detail in Vietnamese, and giving concrete examples.

The candidate was asked the following prompt/topic: "${examPrompt}"

Analyze the audios collectively and respond ONLY with this JSON (no markdown):
{
  "overall_band": <number 0-9 step 0.5>,
  "criteria": {
    "fluency_coherence": <number>,
    "lexical_resource": <number>,
    "grammatical_range_accuracy": <number>,
    "pronunciation": <number>
  },
  "transcript": "<unified, concise transcription of the main points across the audios, max 400 words>",
  "feedback": {
    "strengths": [<2-3 specific, encouraging points in Vietnamese>],
    "weaknesses": [<2-3 actionable areas to improve in Vietnamese>],
    "pronunciation_issues": [
      {
        "word": "<the specific English word mispronounced>",
        "correct_pronunciation": "<the standard IPA pronunciation of the word>",
        "tip": "<highly detailed, easy-to-understand Vietnamese tip on mouth/tongue shape, ending sounds, and how to fix this common pronunciation mistake>",
        "example": "<another English word sharing the exact same phonetic sound, followed by its IPA in parentheses>"
      }
    ],
    "natural_suggestions": [
      {
        "original": "<the exact awkward, repetitive, or grammatically incorrect phrase they spoke>",
        "improved": "<the corrected, professional, and natural native speaker version>",
        "explanation": "<detailed Vietnamese explanation of what was awkward or incorrect, what the grammar/idiomatic rule is, and why this alternative elevates their band score>",
        "example": "<sample English sentence showing this natural alternative in a new context, followed by its Vietnamese translation in parentheses>"
      }
    ]
  }
}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 3000,
        responseMimeType: "application/json",
      },
    };

    const raw = await callGemini(request);
    return sanitizeSpeakingScore(parseGeminiJson<SpeakingScore>(raw));
  } catch (err) {
    console.error("[score-speaking-multi] Multimodal failed, trying text fallback:", err);
    return getFallbackSpeakingScore(examPrompt);
  }
}

export async function scoreSpeakingFromTranscript(
  transcript: string,
  examPrompt: string
): Promise<SpeakingScore> {
  const prompt = `
The candidate was asked: "${examPrompt}"
Their response (transcript): "${transcript.slice(0, 1500).replace(/"/g, '\\"')}"

Score this speaking response (pronunciation estimate only — no audio available).
Respond ONLY with this JSON (no markdown):
{
  "overall_band": <number>,
  "criteria": {
    "fluency_coherence": <number>,
    "lexical_resource": <number>,
    "grammatical_range_accuracy": <number>,
    "pronunciation": <number>
  },
  "transcript": "${transcript.slice(0, 200).replace(/"/g, '\\"')}...",
  "feedback": {
    "strengths": [<2-3 specific points in Vietnamese>],
    "weaknesses": [<2-3 actionable points in Vietnamese>],
    "pronunciation_issues": [],
    "natural_suggestions": [
      {
        "original": "<awkward phrase>",
        "improved": "<natural phrasing>",
        "explanation": "<detailed Vietnamese explanation>",
        "example": "<sample English sentence, followed by Vietnamese translation in parentheses>"
      }
    ]
  }
}`;

  const request = {
    systemInstruction: { parts: [{ text: TEXT_FALLBACK_SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  const raw = await callGemini(request);
  return sanitizeSpeakingScore(parseGeminiJson<SpeakingScore>(raw));
}

function getFallbackSpeakingScore(examPrompt: string): SpeakingScore {
  console.warn("[score-speaking] Using fallback score for prompt:", examPrompt.slice(0, 50));
  return {
    overall_band: 0,
    criteria: { fluency_coherence: 0, lexical_resource: 0, grammatical_range_accuracy: 0, pronunciation: 0 },
    transcript: "(Audio could not be processed — manual review required)",
    feedback: {
      strengths: [],
      weaknesses: ["Audio processing failed — please retry or contact support"],
      pronunciation_issues: [],
      natural_suggestions: [],
    },
  };
}

function sanitizeSpeakingScore(result: SpeakingScore): SpeakingScore {
  function clampBand(v: unknown): number {
    const n = typeof v === "number" ? v : parseFloat(String(v));
    if (!Number.isFinite(n)) return 5.0;
    return Math.round(Math.max(0, Math.min(9, n)) * 2) / 2;
  }

  return {
    overall_band: clampBand(result.overall_band),
    criteria: {
      fluency_coherence: clampBand(result.criteria?.fluency_coherence),
      lexical_resource: clampBand(result.criteria?.lexical_resource),
      grammatical_range_accuracy: clampBand(result.criteria?.grammatical_range_accuracy),
      pronunciation: clampBand(result.criteria?.pronunciation),
    },
    transcript: typeof result.transcript === "string" ? result.transcript.slice(0, 2000) : "",
    feedback: {
      strengths: Array.isArray(result.feedback?.strengths) ? result.feedback.strengths.slice(0, 5) : [],
      weaknesses: Array.isArray(result.feedback?.weaknesses) ? result.feedback.weaknesses.slice(0, 5) : [],
      pronunciation_issues: Array.isArray(result.feedback?.pronunciation_issues)
        ? result.feedback.pronunciation_issues.slice(0, 8).map(item => ({
            word: String(item.word || ""),
            correct_pronunciation: String(item.correct_pronunciation || ""),
            tip: String(item.tip || ""),
            example: item.example ? String(item.example) : undefined,
          }))
        : [],
      natural_suggestions: Array.isArray(result.feedback?.natural_suggestions)
        ? result.feedback.natural_suggestions.slice(0, 8).map(item => ({
            original: String(item.original || ""),
            improved: String(item.improved || ""),
            explanation: item.explanation ? String(item.explanation) : undefined,
            example: item.example ? String(item.example) : undefined,
          }))
        : [],
    },
  };
}
