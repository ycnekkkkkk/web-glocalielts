import type { MockSkillAnswers, MockSkillScores } from "./types";

function normalizeAnswer(v: unknown): string {
  if (v == null) return "";
  return String(v).trim().toLowerCase();
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
      const expected = normalizeAnswer(answersKey.listening[id]);
      const actual = normalizeAnswer(listeningPicks[id]);
      const ok = expected !== "" && actual === expected;
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
      const expected = normalizeAnswer(answersKey.reading[id]);
      const actual = normalizeAnswer(readingPicks[id]);
      const ok = expected !== "" && actual === expected;
      if (ok) correct += 1;
      items.push({ id, expected, actual, ok });
    }
    scores.reading = { correct, total: readKeys.length, items };
  }

  return scores;
}
