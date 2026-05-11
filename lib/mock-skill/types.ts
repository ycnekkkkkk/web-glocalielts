/** Nội dung đề công khai (lưu DB cột content_public) — không chứa đáp án */

export type MockSkillBlock =
  | { type: "text"; html: string; section?: string }
  | { type: "image"; src: string; alt?: string; section?: string }
  | { type: "audio"; url: string; label?: string; section?: string };

export type MockSkillQuestionType =
  | "single_choice"         // MCQ – chọn 1 trong nhiều options
  | "text"                  // Điền từ / số
  | "true_false_not_given"  // True / False / Not Given
  | "matching"              // Nối – chọn 1 key từ options_map
  | "multiple_choice";      // Chọn nhiều (checkboxes)

export type MockSkillQuestion = {
  id: string;
  stem: string;
  type: MockSkillQuestionType;
  /** Dùng cho single_choice, true_false_not_given, matching, multiple_choice */
  options?: string[];
  /** Dùng cho matching: map key → label hiển thị (e.g. { "A": "parents must supervise..." }) */
  options_map?: Record<string, string>;
  section?: string;
  display_no?: number;
};

export type MockSkillListeningOrReading = {
  title: string;
  blocks: MockSkillBlock[];
  questions: MockSkillQuestion[];
};

export type MockSkillSpeakingPart = {
  part: string;           // "1" | "2" | "3"
  type?: string;          // topic label e.g. "Work/Study & Mirror"
  questions?: string[];   // Part 1 & 3 questions
  task?: string;          // Part 2 main task card text
  cues?: string[];        // Part 2 bullet cues
  follow_up?: string;     // optional follow-up
};

export type MockSkillSpeaking = {
  title: string;
  blocks: MockSkillBlock[];
  prompt?: string;
  /** Structured part data — used to render TTS cards */
  parts?: MockSkillSpeakingPart[];
};

export type MockSkillWritingTask = {
  task: string;         // "1" | "2"
  instruction?: string;
  prompt?: string;
  minWords?: number;
  imageBlock?: { src: string; alt?: string };
};

export type MockSkillWriting = {
  title: string;
  blocks: MockSkillBlock[];
  prompt?: string;
  minWords?: number;
  /** Structured task list — used to render per-task textareas */
  tasks?: MockSkillWritingTask[];
};

export type MockSkillContentPublic = {
  version: number;
  listening: MockSkillListeningOrReading;
  reading: MockSkillListeningOrReading;
  speaking: MockSkillSpeaking;
  writing: MockSkillWriting;
};

/** Đáp án auto — chỉ server / admin */
export type MockSkillAnswers = {
  listening: Record<string, string | number>;
  reading: Record<string, string | number>;
};

export type MockSkillCandidate = {
  full_name: string;
  email: string;
  phone?: string;
  birth_year?: string;
  hometown?: string;
  notes?: string;
};

export type MockSkillScores = {
  listening?: {
    correct: number;
    total: number;
    band?: number;
    items?: Array<{ id: string; expected: string; actual: string; ok: boolean }>;
  };
  reading?: {
    correct: number;
    total: number;
    band?: number;
    items?: Array<{ id: string; expected: string; actual: string; ok: boolean }>;
  };
};

// ── AI Scoring Types ──────────────────────────────────────────────

export type WritingCriteriaScore = {
  task_achievement: number;
  coherence_cohesion: number;
  lexical_resource: number;
  grammatical_range_accuracy: number;
};

export type WritingGrammarIssue = {
  original: string;
  suggestion: string;
  explanation: string;
};

export type WritingVocabSuggestion = {
  word: string;
  better_alternatives: string[];
};

export type WritingAIScore = {
  overall_band: number;
  criteria: WritingCriteriaScore;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    grammar_issues: WritingGrammarIssue[];
    vocabulary_suggestions: WritingVocabSuggestion[];
    improved_sample: string;
  };
  word_count: number;
  task_type: "task1" | "task2";
};

export type SpeakingCriteriaScore = {
  fluency_coherence: number;
  lexical_resource: number;
  grammatical_range_accuracy: number;
  pronunciation: number;
};

export type SpeakingPronunciationIssue = {
  word: string;
  correct_pronunciation: string;
  tip: string;
};

export type SpeakingNaturalSuggestion = {
  original: string;
  improved: string;
};

export type SpeakingAIScore = {
  overall_band: number;
  criteria: SpeakingCriteriaScore;
  transcript: string;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    pronunciation_issues: SpeakingPronunciationIssue[];
    natural_suggestions: SpeakingNaturalSuggestion[];
  };
};

// ── Session / State ───────────────────────────────────────────────

export type ExamStep = "intro" | "listening" | "reading" | "speaking" | "writing" | "submitting" | "done";

export type ExamSession = {
  examSlug: string;
  step: ExamStep;
  listeningPicks: Record<string, string | number>;
  readingPicks: Record<string, string | number>;
  writingText: string;
  flaggedQuestions: string[];
  startedAt: number; // Date.now()
  lastSavedAt: number;
};
