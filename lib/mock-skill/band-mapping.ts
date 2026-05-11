/**
 * Official IELTS Band Score Conversion Tables
 * Source: British Council / IDP IELTS Band Descriptors
 *
 * Listening: 40 questions
 * Reading Academic: 40 questions
 * Reading General Training: 40 questions (slightly different table)
 */

// Listening: raw score (0-40) → band (0-9)
const LISTENING_BAND_TABLE: [number, number][] = [
  [39, 9.0],
  [37, 8.5],
  [35, 8.0],
  [32, 7.5],
  [30, 7.0],
  [26, 6.5],
  [23, 6.0],
  [18, 5.5],
  [16, 5.0],
  [13, 4.5],
  [10, 4.0],
  [8,  3.5],
  [6,  3.0],
  [4,  2.5],
  [0,  0],
];

// Reading Academic: raw score (0-40) → band (0-9)
const READING_ACADEMIC_BAND_TABLE: [number, number][] = [
  [39, 9.0],
  [37, 8.5],
  [35, 8.0],
  [33, 7.5],
  [30, 7.0],
  [27, 6.5],
  [23, 6.0],
  [19, 5.5],
  [15, 5.0],
  [13, 4.5],
  [10, 4.0],
  [8,  3.5],
  [6,  3.0],
  [4,  2.5],
  [0,  0],
];

// Reading General Training: raw score (0-40) → band (0-9)
const READING_GENERAL_BAND_TABLE: [number, number][] = [
  [40, 9.0],
  [39, 8.5],
  [37, 8.0],
  [36, 7.5],
  [34, 7.0],
  [32, 6.5],
  [30, 6.0],
  [27, 5.5],
  [23, 5.0],
  [19, 4.5],
  [15, 4.0],
  [12, 3.5],
  [9,  3.0],
  [6,  2.5],
  [0,  0],
];

function lookupBand(table: [number, number][], rawScore: number): number {
  const clamped = Math.max(0, Math.min(40, Math.round(rawScore)));
  for (const [minScore, band] of table) {
    if (clamped >= minScore) return band;
  }
  return 0;
}

export type SkillType = "listening" | "reading_academic" | "reading_general";

/**
 * Convert raw score to IELTS band
 * @param correct Number of correct answers
 * @param total Total number of questions
 * @param skill Skill type (affects which table is used)
 */
export function rawScoreToBand(
  correct: number,
  total: number,
  skill: SkillType = "listening"
): number {
  if (total === 0) return 0;

  // If not 40 questions, scale to 40
  let scaledCorrect = correct;
  if (total !== 40) {
    scaledCorrect = Math.round((correct / total) * 40);
  }

  switch (skill) {
    case "listening":
      return lookupBand(LISTENING_BAND_TABLE, scaledCorrect);
    case "reading_academic":
      return lookupBand(READING_ACADEMIC_BAND_TABLE, scaledCorrect);
    case "reading_general":
      return lookupBand(READING_GENERAL_BAND_TABLE, scaledCorrect);
    default:
      return lookupBand(LISTENING_BAND_TABLE, scaledCorrect);
  }
}

/**
 * Calculate overall IELTS band from 4 skills
 * Formula: average of all 4, rounded to nearest 0.5
 */
export function calculateOverallBand(bands: {
  listening?: number;
  reading?: number;
  writing?: number;
  speaking?: number;
}): number {
  const values = Object.values(bands).filter((v) => typeof v === "number" && v > 0) as number[];
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 2) / 2;
}

/**
 * Get band color class for styling
 */
export function getBandColorClass(band: number): {
  bg: string;
  text: string;
  border: string;
  ring: string;
} {
  if (band >= 8) return { bg: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-300", ring: "ring-emerald-400" };
  if (band >= 7) return { bg: "bg-green-500", text: "text-green-700", border: "border-green-300", ring: "ring-green-400" };
  if (band >= 6) return { bg: "bg-blue-500", text: "text-blue-700", border: "border-blue-300", ring: "ring-blue-400" };
  if (band >= 5) return { bg: "bg-amber-500", text: "text-amber-700", border: "border-amber-300", ring: "ring-amber-400" };
  if (band >= 4) return { bg: "bg-orange-500", text: "text-orange-700", border: "border-orange-300", ring: "ring-orange-400" };
  return { bg: "bg-red-500", text: "text-red-700", border: "border-red-300", ring: "ring-red-400" };
}

/**
 * Human-readable band descriptor
 */
export function getBandDescriptor(band: number): string {
  if (band >= 9) return "Expert User";
  if (band >= 8) return "Very Good User";
  if (band >= 7) return "Good User";
  if (band >= 6) return "Competent User";
  if (band >= 5) return "Modest User";
  if (band >= 4) return "Limited User";
  if (band >= 3) return "Extremely Limited User";
  if (band > 0) return "Intermittent User";
  return "Non User";
}
