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

export type MockSkillSpeaking = {
  title: string;
  blocks: MockSkillBlock[];
  prompt?: string;
};

export type MockSkillWriting = {
  title: string;
  blocks: MockSkillBlock[];
  prompt?: string;
  minWords?: number;
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
    items?: Array<{ id: string; expected: string; actual: string; ok: boolean }>;
  };
  reading?: {
    correct: number;
    total: number;
    items?: Array<{ id: string; expected: string; actual: string; ok: boolean }>;
  };
};
