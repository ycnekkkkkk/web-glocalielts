export function extractDuration(text: string | null | undefined): string | null {
  const raw = text ?? "";
  const stripped = raw.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  if (!stripped) return null;

  // Normalize diacritics for matching (Vietnamese).
  const normalized = stripped.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  // Legacy/program header: "IELTS Mentorship" card
  if (normalized.startsWith("ielts mentorship")) return "28 Buổi";

  // Legacy override: for some courses the duration isn't present in text at all,
  // so we map it by course code.
  const courseCode = extractCourseCode(text);
  if (courseCode) {
    const durationByCode: Record<string, number> = {
      // IELTS Mentorship Program (per user spec)
      "IM01 - 240418": 67,
      "IM01 - 240718": 47,
      "IM01 - 250414": 67,
      "IM01 - 250414 - Clone": 67,
      "IM02 - 240821": 43,
      "IM02 - 250506": 67,
      "IM03 - 250721 - Hồng Tươi": 67,
      "IMG5 - 241219": 67,
      "IMG3 - 240703": 11,
      "GIG2 - 240313": 26,

      "IMG4 - 250911": 41,
      "IMG3 - 250712": 41,
      "IMG2 - 250712": 41,
      "IMG7 - 251119": 41,
      "IMG4 - 240904": 33,
      "IMG1 - 250418": 41,
      "IMG1 - 250618 - Clone": 41,
      "IMG1 - 240927": 41,
      "IMG1 - 250418 - Clone": 41,
    };
    const mapped = durationByCode[courseCode];
    if (mapped) return `${mapped} Buổi`;
  }

  // 1) Compute from "buoi/tuần" + "khoa/thoi luong XX thang" (preferred because
  // direct "X buoi" in legacy text may actually be per-week).
  const buoiPerWeekRaw =
    normalized.match(/(\d{1,2}(?:[.,]\d+)?)\s*buoi\s*\/\s*tuan/i)?.[1] ??
    normalized.match(/(\d{1,2}(?:[.,]\d+)?)\s*buoi\s*\/\s*thuan/i)?.[1] ??
    null;
  const buoiPerWeek = buoiPerWeekRaw ? Number(buoiPerWeekRaw.toString().replace(",", ".")) : null;

  const monthsKhoa =
    normalized.match(/khoa\s*(\d{1,2})\s*thang/i)?.[1] ??
    normalized.match(/khoa\s*(\d{1,2})\s*thang/i)?.[1] ??
    null;

  const monthsThoiLuong =
    normalized.match(/thoi\s*luong[^0-9]{0,40}(\d{1,2})\s*thang/i)?.[1] ??
    normalized.match(/thoi\s*luong[^0-9]{0,40}(\d{1,2})\s*thang/i)?.[1] ??
    null;

  const months = monthsKhoa ? Number(monthsKhoa) : monthsThoiLuong ? Number(monthsThoiLuong) : null;

  // Prefer month+buoi/tuần calculation when available.
  if (months && buoiPerWeek) {
    const effectiveWeeksPerMonth = monthsKhoa
      ? // Heuristic derived from legacy course text:
        // For "khoa XX thang" + "X buoi/tuan" we match business totals closely using:
        // effectiveWeeksPerMonth = 3.9166667 + 1.459*(3 - buoiPerWeek)
        3.9166667 + 1.459 * (3 - buoiPerWeek)
      : // For "thoi luong XX thang" we use a simpler constant.
        4.1;
    const total = Math.round(buoiPerWeek * months * effectiveWeeksPerMonth);
    if (Number.isFinite(total) && total > 0) return `${total} Buổi`;
  }

  // 2) Compute from "Thoi luong/khoa XX thang" using schedule inference:
  // count weekday occurrences like "thu 5", "thu 7".
  if (months) {
    const dayMatches = normalized.match(/thu\s*\d{1,2}/gi) ?? [];
    const inferredSessionsPerWeek = dayMatches.length ? Math.min(3, Math.max(1, dayMatches.length)) : 2;
    const effectiveWeeksPerMonth = monthsThoiLuong ? 4.1 : 4.1;
    const total = Math.round(inferredSessionsPerWeek * months * effectiveWeeksPerMonth);
    if (Number.isFinite(total) && total > 0) return `${total} Buổi`;
  }

  // 3) Direct total sessions, e.g. "28 Buổi"
  const direct = normalized.match(/(\d{1,3}(?:[.,]\d+)?)\s*buoi\b/i)?.[1];
  if (direct) {
    const n = Math.round(Number(direct.toString().replace(",", ".")));
    if (Number.isFinite(n) && n > 0) return `${n} Buổi`;
  }

  return null;
}

export function extractCertificate(text: string | null | undefined): string | null {
  const raw = text ?? "";
  const t = raw.replace(/<[^>]*>/g, " ").toLowerCase();
  if (!t.trim()) return null;

  const hasLabel = t.includes("chứng chỉ") || t.includes("certificate") || t.includes("cert");

  // 1) Prefer explicit "Chứng chỉ" lines when present.
  if (hasLabel) {
    const chungChiBlock = t.match(/chứng chỉ[^:\n]{0,80}[:\-]?\s*([^\n<]{0,120})/i)?.[1] ?? "";
    const c = (chungChiBlock || "").toLowerCase();
    if (c.includes("ielts")) return "IELTS";
    if (c.includes("toefl")) return "TOEFL";
    if (c.includes("cambridge")) return "Cambridge";
    return null;
  }

  // 2) Fallback: only infer certificate from "IELTS Overall x.y" (avoid
  // false-positive from "Khoá học: IELTS Mentorship" which has no overall).
  if (t.includes("ielts") && t.includes("overall")) return "IELTS";
  if (t.includes("toefl") && t.includes("overall")) return "TOEFL";
  if (t.includes("cambridge") && t.includes("overall")) return "Cambridge";

  return null;
}

export function extractObjective(text: string | null | undefined): string | null {
  const raw = text ?? "";
  const stripped = raw.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  if (!stripped) return null;

  const normalized = stripped.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  // Legacy override: some course objectives are not reliably present in text,
  // so we map by course code.
  const courseCode = extractCourseCode(text);
  if (courseCode) {
    const blankObjectiveByCode = new Set<string>([
      // Per user spec: these should render empty "Đối tượng"
      "GIG2 - 240313",
      "IMG4 - 250911",
      "IMG3 - 250712",
      "IMG2 - 250712",
      "IMG7 - 251119",
      "IMG4 - 240904",
      "IMG1 - 250418",
      "IMG1 - 250618 - Clone",
      "IMG1 - 240927",
      "IMG1 - 250418 - Clone",
    ]);

    if (blankObjectiveByCode.has(courseCode)) return null;

    const objectiveByCode: Record<string, string> = {
      // IELTS Mentorship Program (per user spec)
      "IM01 - 240418": "Advanced",
      "IM01 - 250414": "Advanced",
      "IM01 - 250414 - Clone": "Advanced",
      "IM02 - 250506": "Advanced",
      "IM02 - 240821": "Intermediate",
      "IM01 - 240718": "Intermediate",
      "IM03 - 250721 - Hồng Tươi": "Advanced",
      "IMG5 - 241219": "Advanced",
      "IMG3 - 240703": "Intermediate",
    };
    const mapped = objectiveByCode[courseCode];
    if (mapped) return mapped;
  }

  // Direct keyword mapping
  if (normalized.includes("advanced") || normalized.includes("nang cao") || normalized.includes("cao cap")) return "Advanced";
  if (normalized.includes("intermediate") || normalized.includes("trung cap")) return "Intermediate";
  if (normalized.includes("beginner") || normalized.includes("so cap") || normalized.includes("co ban") || normalized.includes("can ban"))
    return "Beginner";

  // Fallback: derive from IELTS score.
  // Try "Overall x.y" first, then "IELTS ... x.y" (some legacy descriptions miss the word "overall").
  const overallMatch =
    normalized.match(/overall\s*([0-9](?:[.,][0-9])?)/i)?.[1] ??
    normalized.match(/ielts[^0-9]{0,50}([0-9](?:[.,][0-9])?)/i)?.[1] ??
    null;
  if (overallMatch) {
    const v = Number(overallMatch.toString().replace(",", "."));
    if (!Number.isFinite(v)) return null;
    if (v >= 7.0) return "Advanced";
    if (v >= 6.0) return "Intermediate";
    return "Beginner";
  }

  return null;
}

export function extractCourseCode(text: string | null | undefined): string | null {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;

  // Example: CM01 - 241112, GIG1 - 240910, IM01 - 250414 - Clone, IM03 - 250721 - Hồng Tươi
  const m = t.match(
    /\b([A-Z]{1,3}\d{1,2}\s*-\s*\d{6}(?:\s*-\s*[A-Za-zÀ-ỹ0-9]+(?:\s+[A-Za-zÀ-ỹ0-9]+)*)?)\b/
  );

  if (!m?.[1]) return null;

  // Normalize common OCR/encoding issues so UI matches business codes.
  // Example: "CMO1 - 241112" (letter O) => "CM01 - 241112"
  let code = m[1].replace(/\s*-\s*/g, " - ").trim();
  code = code.replace(/\bCMO(\d+)\b/g, "CM0$1");
  code = code.replace(/\bIMO(\d+)\b/g, "IM0$1");

  return code;
}

