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
  pronunciation_issues: Array<{ word: string; correct_pronunciation: string; tip: string }>;
  natural_suggestions: Array<{ original: string; improved: string }>;
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

BAND REFERENCE:
- 9: Expert | 8: Very good | 7: Good | 6: Competent | 5: Modest | 4-: Limited

Respond with ONLY valid JSON, no text outside JSON.`;

const SPEAKING_PROMPT_TEMPLATE = (examPrompt: string) => `
The candidate was asked: "${examPrompt}"

Analyze the audio and respond ONLY with this JSON (no markdown):
{
  "overall_band": <number 0-9 step 0.5>,
  "criteria": {
    "fluency_coherence": <number>,
    "lexical_resource": <number>,
    "grammatical_range_accuracy": <number>,
    "pronunciation": <number>
  },
  "transcript": "<concise transcription, max 300 words>",
  "feedback": {
    "strengths": [<2-3 short strings>],
    "weaknesses": [<2-3 short strings>],
    "pronunciation_issues": [
      {"word": "<word>", "correct_pronunciation": "<IPA or desc>", "tip": "<1 sentence>"}
    ],
    "natural_suggestions": [
      {"original": "<what said>", "improved": "<better version>"}
    ]
  }
}`;

const TEXT_FALLBACK_SYSTEM = `You are an expert IELTS Speaking examiner.
Given a transcript of a speaking response, analyze it and provide IELTS Speaking scores.
Note: pronunciation scoring is limited without audio — give a reasonable estimate.
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
    "strengths": [<2-3 short strings>],
    "weaknesses": [<2-3 short strings>],
    "pronunciation_issues": [],
    "natural_suggestions": [
      {"original": "<phrase>", "improved": "<better version>"}
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
        ? result.feedback.pronunciation_issues.slice(0, 6)
        : [],
      natural_suggestions: Array.isArray(result.feedback?.natural_suggestions)
        ? result.feedback.natural_suggestions.slice(0, 5)
        : [],
    },
  };
}
