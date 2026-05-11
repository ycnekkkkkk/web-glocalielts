import { callGemini, parseGeminiJson } from "./client";

export interface SkillSummaryInput {
  listening?: { band: number; correct?: number; total?: number };
  reading?: { band: number; correct?: number; total?: number };
  writing?: { band: number; criteria?: Record<string, number>; feedback?: { strengths?: string[]; weaknesses?: string[] } };
  speaking?: { band: number; criteria?: Record<string, number>; feedback?: { strengths?: string[]; weaknesses?: string[] } };
}

export interface SkillSummary {
  overall_band: number;
  level: string; // "B2", "C1", etc.
  overview: string; // 2-3 câu tổng quan
  strengths: string[]; // 2-3 điểm mạnh
  weaknesses: string[]; // 2-3 điểm yếu
  recommendations: string[]; // 3-4 lời khuyên cụ thể
  skill_balance: "balanced" | "receptive_strong" | "productive_strong" | "inconsistent";
}

const SUMMARY_SYSTEM = `You are an expert IELTS counselor. Given a candidate's scores across 4 skills, generate a holistic evaluation and actionable study recommendations. 
CRITICAL: You MUST write the evaluation (overview, strengths, weaknesses, recommendations) entirely in Vietnamese.
Respond with ONLY valid JSON.`;

function buildPrompt(scores: SkillSummaryInput): string {
  const bands = {
    Listening: scores.listening?.band ?? null,
    Reading: scores.reading?.band ?? null,
    Writing: scores.writing?.band ?? null,
    Speaking: scores.speaking?.band ?? null,
  };

  const available = Object.entries(bands).filter(([, v]) => v !== null);
  const validBands = available.map(([, v]) => v as number);
  const avgBand = validBands.length > 0
    ? Math.round((validBands.reduce((a, b) => a + b, 0) / validBands.length) * 2) / 2
    : 0;

  const skillLines = available.map(([k, v]) => {
    const score = scores[k.toLowerCase() as keyof SkillSummaryInput] as { criteria?: Record<string, number>; feedback?: { strengths?: string[]; weaknesses?: string[] } } | undefined;
    let line = `- ${k}: Band ${v}`;
    if (score?.criteria) {
      line += ` (${Object.entries(score.criteria).map(([ck, cv]) => `${ck}: ${cv}`).join(", ")})`;
    }
    if (score?.feedback?.weaknesses?.length) {
      line += ` | Weaknesses: ${score.feedback.weaknesses.slice(0, 2).join("; ")}`;
    }
    return line;
  });

  return `
Candidate IELTS Scores (estimated overall: ${avgBand}):
${skillLines.join("\n")}

${validBands.length < 4 ? `Note: Only ${validBands.length}/4 skills have been scored so far.` : ""}

Generate a comprehensive evaluation IN VIETNAMESE. Return ONLY this JSON:
{
  "overall_band": <weighted average, 0.5 increments>,
  "level": "<CEFR level: A1/A2/B1/B2/C1/C2>",
  "overview": "<2-3 sentence holistic evaluation of the candidate's English ability (IN VIETNAMESE)>",
  "strengths": [<2-3 specific strengths based on the scores (IN VIETNAMESE)>],
  "weaknesses": [<2-3 specific areas needing improvement (IN VIETNAMESE)>],
  "recommendations": [<3-4 concrete, actionable study tips tailored to their weak areas (IN VIETNAMESE)>],
  "skill_balance": "<one of: balanced|receptive_strong|productive_strong|inconsistent>"
}`;
}

function bandToCEFR(band: number): string {
  if (band >= 8.5) return "C2";
  if (band >= 7.0) return "C1";
  if (band >= 5.5) return "B2";
  if (band >= 4.0) return "B1";
  if (band >= 3.0) return "A2";
  return "A1";
}

export async function generateSkillSummary(scores: SkillSummaryInput): Promise<SkillSummary> {
  const validBands = [scores.listening?.band, scores.reading?.band, scores.writing?.band, scores.speaking?.band]
    .filter((b): b is number => b !== undefined && b > 0);

  if (validBands.length === 0) {
    throw new Error("No skill scores available to summarize");
  }

  const avgBand = Math.round((validBands.reduce((a, b) => a + b, 0) / validBands.length) * 2) / 2;

  const request = {
    systemInstruction: { parts: [{ text: SUMMARY_SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: buildPrompt(scores) }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  try {
    const raw = await callGemini(request);
    const result = parseGeminiJson<SkillSummary>(raw);

    return {
      overall_band: typeof result.overall_band === "number" && result.overall_band > 0
        ? Math.round(Math.max(0, Math.min(9, result.overall_band)) * 2) / 2
        : avgBand,
      level: result.level || bandToCEFR(avgBand),
      overview: result.overview || "",
      strengths: Array.isArray(result.strengths) ? result.strengths.slice(0, 4) : [],
      weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses.slice(0, 4) : [],
      recommendations: Array.isArray(result.recommendations) ? result.recommendations.slice(0, 5) : [],
      skill_balance: result.skill_balance || "inconsistent",
    };
  } catch (err) {
    console.error("[score-summary] AI summary failed:", err);
    // Trả về summary cơ bản dựa trên toán học
    return {
      overall_band: avgBand,
      level: bandToCEFR(avgBand),
      overview: `Thí sinh đạt band trung bình ${avgBand} với ${validBands.length}/4 kỹ năng đã chấm.`,
      strengths: [],
      weaknesses: [],
      recommendations: ["Luyện tập đều các kỹ năng Nghe, Đọc, Viết và Nói mỗi ngày."],
      skill_balance: "inconsistent",
    };
  }
}
