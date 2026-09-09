import type { MockSkillAnswers, MockSkillScores } from "./types";

/**
 * Chuẩn hóa một chuỗi đáp án (xóa khoảng trắng thừa, chuyển chữ thường, loại bỏ dấu câu bao quanh)
 */
function cleanString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/^["'“”‘’]+|["'“”‘’\.]+$/g, "") // chỉ bỏ ngoặc kép và dấu chấm ngoài rìa
    .replace(/\s+/g, " "); // gộp khoảng trắng kép
}

/**
 * Tạo danh sách các biến thể tương đương từ chuỗi đáp án mẫu IELTS
 * Ví dụ: "(the) bus station / station" -> ["the bus station", "bus station", "station"]
 */
function expandExpectedVariants(expectedStr: string): string[] {
  const rawParts = expectedStr.split(/\s*[\/|]\s*|\s+or\s+/i);
  const variants = new Set<string>();

  for (const part of rawParts) {
    const cleaned = cleanString(part);
    if (!cleaned) continue;
    variants.add(cleaned);

    // Xử lý từ trong ngoặc đơn (optional word)
    // Ví dụ: "(the) bus" -> tạo cả "the bus" và "bus"
    if (cleaned.includes("(") && cleaned.includes(")")) {
      const withoutParens = cleaned.replace(/\((.*?)\)/g, "$1").replace(/\s+/g, " ").trim();
      const strippedOptional = cleaned.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
      if (withoutParens) variants.add(withoutParens);
      if (strippedOptional) variants.add(strippedOptional);
    }

    // Viết tắt chuẩn IELTS cho True / False / Not Given
    if (cleaned === "true" || cleaned === "t") { variants.add("true"); variants.add("t"); }
    if (cleaned === "false" || cleaned === "f") { variants.add("false"); variants.add("f"); }
    if (cleaned === "not given" || cleaned === "ng") { variants.add("not given"); variants.add("ng"); }
    if (cleaned === "yes" || cleaned === "y") { variants.add("yes"); variants.add("y"); }
    if (cleaned === "no" || cleaned === "n") { variants.add("no"); variants.add("n"); }
  }

  return Array.from(variants);
}

/**
 * Kiểm tra xem đáp án của thí sinh có khớp với đáp án mẫu IELTS hay không
 */
export function isAnswerMatch(expected: unknown, actual: unknown): boolean {
  if (expected == null || actual == null) return false;

  const expectedStr = String(expected).trim();
  const actualStr = cleanString(String(actual));

  if (!expectedStr || !actualStr) return false;

  const validVariants = expandExpectedVariants(expectedStr);

  // 1. Khớp trực tiếp với bất kỳ biến thể nào
  if (validVariants.includes(actualStr)) return true;

  // 2. Nếu đáp án dạng trắc nghiệm có tiền tố chữ cái (ví dụ: "A. The economy" vs "A")
  for (const variant of validVariants) {
    if (actualStr === variant) return true;
    // Thí sinh chọn "A" mà mẫu ghi "A. Something" hoặc ngược lại
    if (variant.startsWith(actualStr + ".") || variant.startsWith(actualStr + " ")) return true;
    if (actualStr.startsWith(variant + ".") || actualStr.startsWith(variant + " ")) return true;
  }

  return false;
}

export function scoreListeningReading(
  answersKey: MockSkillAnswers,
  listeningPicks: Record<string, string | number>,
  readingPicks: Record<string, string | number>
): MockSkillScores {
  const scores: MockSkillScores = {};

  const listenKeys = Object.keys(answersKey.listening || {});
  if (listenKeys.length) {
    let correct = 0;
    const items: Array<{ id: string; expected: string; actual: string; ok: boolean }> = [];
    for (const id of listenKeys) {
      const expected = String(answersKey.listening[id] ?? "").trim();
      const actual = String(listeningPicks[id] ?? "").trim();
      const ok = isAnswerMatch(expected, actual);
      if (ok) correct += 1;
      items.push({ id, expected, actual, ok });
    }
    scores.listening = { correct, total: listenKeys.length, items };
  }

  const readKeys = Object.keys(answersKey.reading || {});
  if (readKeys.length) {
    let correct = 0;
    const items: Array<{ id: string; expected: string; actual: string; ok: boolean }> = [];
    for (const id of readKeys) {
      const expected = String(answersKey.reading[id] ?? "").trim();
      const actual = String(readingPicks[id] ?? "").trim();
      const ok = isAnswerMatch(expected, actual);
      if (ok) correct += 1;
      items.push({ id, expected, actual, ok });
    }
    scores.reading = { correct, total: readKeys.length, items };
  }

  return scores;
}
