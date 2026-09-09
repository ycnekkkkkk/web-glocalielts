import { callGemini, parseGeminiJson } from "./client";

export interface SpeakingCriteria {
  fluency_coherence: number;
  lexical_resource: number;
  grammatical_range_accuracy: number;
  pronunciation: number;
}

export interface PhonologyAnalysis {
  intonation_and_stress: string; // Đánh giá ngữ điệu và trọng âm câu
  chunking_and_connected_speech: string; // Đánh giá ngắt cụm, nối âm và nhịp điệu (rhythm)
  fluency_hesitation_analysis: string; // Phân tích ngập ngừng: tìm ý (content) vs tìm từ (language)
}

export interface SpeakingFeedback {
  strengths: string[];
  weaknesses: string[];
  phonology_analysis?: PhonologyAnalysis;
  pronunciation_issues: Array<{ word: string; correct_pronunciation: string; tip: string; example?: string }>;
  natural_suggestions: Array<{ original: string; improved: string; explanation?: string; example?: string }>;
}

export interface SpeakingScore {
  overall_band: number;
  criteria: SpeakingCriteria;
  transcript: string;
  feedback: SpeakingFeedback;
}

const SPEAKING_SYSTEM_PROMPT = `You are a certified IELTS Speaking Examiner with 15+ years of testing experience with IDP, the British Council, and Cambridge English.
You evaluate spoken recordings strictly following the official "IELTS Speaking Band Descriptors".

OFFICIAL SPEAKING RUBRIC ACROSS 4 CRITERIA (EACH 0.0 - 9.0 in 0.5 INCREMENTS):

1. FLUENCY AND COHERENCE (FC):
- Band 9: Fluent with only very occasional repetition or self-correction; any hesitation is strictly CONTENT-RELATED (to formulate ideas, not to search for vocabulary or grammar); fully coherent topic development.
- Band 8: Fluent, occasional repetition/self-correction; hesitation is predominantly content-related; coherent and appropriate topic extension.
- Band 7: Readily produces long turns without noticeable effort; some language-related hesitation or self-correction mid-sentence, but DOES NOT affect overall coherence; flexible use of spoken discourse markers and connectives.
- Band 6: Willing to produce long turns, but coherence may be lost at times due to hesitation, repetition, or self-correction; uses a range of discourse markers though not always appropriately.
- Band 5: Relies on slow speech, repetition, or self-correction; frequent mid-sentence searches for basic vocabulary and grammar; more complex speech causes disfluency.

2. LEXICAL RESOURCE (LR):
- Band 9: Total flexibility and precision; sustained idiomatic language and natural collocations.
- Band 8: Wide resource flexibly used; skilful use of less common and idiomatic items despite rare inaccuracies; effective paraphrasing.
- Band 7: Resource flexibly used across topics; demonstrates ability to use less common lexis and awareness of style/collocation; effective paraphrasing.
- Band 6: Sufficient to discuss topics at length; meaning is generally clear despite inappropriate word choices; generally able to paraphrase.

3. GRAMMATICAL RANGE AND ACCURACY (GRA):
- Band 9: Precise and accurate structures at all times, with only native-like slips.
- Band 8: Wide range of structures flexibly used; majority of sentences are error-free; occasional non-systematic errors.
- Band 7: Range of structures flexibly used; error-free sentences are frequent; both simple and complex sentences used effectively despite some basic errors persisting.
- Band 6: Mix of simple and complex sentence forms with limited flexibility; complex structures frequently contain errors, though these rarely impede communication.

4. PRONUNCIATION (PR):
- Full Range of Phonological Features: Intonation, word stress, sentence stress, rhythm, chunking, and connected speech (linking, elision).
- Band 9: Full range of phonological features; flexible connected speech sustained; accent has no effect on intelligibility; effortlessly understood.
- Band 8: Sustains appropriate rhythm; flexible use of stress and intonation across long utterances; accent has minimal effect; easily understood.
- Band 7: Displays all positive features of Band 6 and some features of Band 8; clear vowel/consonant sounds with generally appropriate intonation and chunking.
- Band 6: Appropriate chunking, though rhythm may be affected by lack of stress-timing or uneven speech rate; some effective intonation/stress; individual mispronounced words rarely obscure clarity.
- Band 5: Displays features of Band 4 and some of Band 6; frequent lapses in rhythm and individual phonemes.

OVERALL BAND CALCULATION:
Average of the 4 criteria: (FC + LR + GRA + PR) / 4, rounded to the nearest 0.5.

CRITICAL LANGUAGE & OUTPUT RULES:
- All candidate-facing explanations (feedback, strengths, weaknesses, phonology_analysis, tips, explanations) MUST be written in 100% natural, supportive Vietnamese (Tiếng Việt).
- "word", "original", and "improved" MUST be in authentic English.
- Return ONLY valid JSON matching the exact schema.`;

const SPEAKING_PROMPT_TEMPLATE = (examPrompt: string) => `
The candidate was asked the following IELTS Speaking prompt/questions:
"${examPrompt}"

Listen attentively to the audio recordings. Conduct an in-depth examiner evaluation using the official Speaking Band Descriptors:
1. Assess Fluency & Coherence: Distinguish whether pauses are for idea formulation or searching for words/grammar.
2. Assess Lexical Resource: Identify idiomatic usage vs basic vocabulary.
3. Assess Grammar: Evaluate sentence complexity and error-free frequency.
4. Assess Pronunciation: Analyze Intonation, Word/Sentence Stress, Chunking, and individual phonetic slips.

Respond ONLY with this JSON:
{
  "overall_band": <number 0-9 step 0.5>,
  "criteria": {
    "fluency_coherence": <number 0-9 step 0.5>,
    "lexical_resource": <number 0-9 step 0.5>,
    "grammatical_range_accuracy": <number 0-9 step 0.5>,
    "pronunciation": <number 0-9 step 0.5>
  },
  "transcript": "<accurate transcription of the candidate's spoken response, max 350 words>",
  "feedback": {
    "strengths": [<2-3 encouraging points in Vietnamese based on descriptors>],
    "weaknesses": [<2-3 actionable areas to reach the next band in Vietnamese>],
    "phonology_analysis": {
      "intonation_and_stress": "<Nhận xét chi tiết bằng tiếng Việt về ngữ điệu lên xuống và trọng âm từ/câu của thí sinh>",
      "chunking_and_connected_speech": "<Nhận xét chi tiết bằng tiếng Việt về khả năng ngắt nhịp (chunking), nối âm và tốc độ nói>",
      "fluency_hesitation_analysis": "<Phân tích chi tiết bằng tiếng Việt về độ lưu loát và kiểu ngập ngừng (tìm ý hay tìm từ)>"
    },
    "pronunciation_issues": [
      {
        "word": "<specific mispronounced English word>",
        "correct_pronunciation": "<standard IPA transcription>",
        "tip": "<hướng dẫn sửa khẩu hình, âm cuối hoặc trọng âm bằng tiếng Việt>",
        "example": "<từ tiếng Anh khác có cùng âm hoặc ngữ cảnh minh họa, kèm IPA>"
      }
    ],
    "natural_suggestions": [
      {
        "original": "<awkward or grammatically incorrect phrase spoken by candidate>",
        "improved": "<natural, high-band native speaker alternative in English>",
        "explanation": "<giải thích lý do và cách dùng nâng band bằng tiếng Việt>",
        "example": "<câu ví dụ tiếng Anh minh họa, kèm bản dịch tiếng Việt trong ngoặc đơn>"
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
      phonology_analysis: result.feedback?.phonology_analysis,
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
