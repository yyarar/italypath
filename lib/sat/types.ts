export type SatSection = "math" | "reading-writing";
export type SatQuestionType = "mcq" | "spr";
export type SatDifficulty = 1 | 2 | 3;
export type SatChoiceKey = "A" | "B" | "C" | "D";

export interface SatQuestion {
  id: string;
  section: SatSection;
  domain: string;
  skill: string;
  skillSlug: string;
  difficulty: SatDifficulty;
  questionType: SatQuestionType;
  prompt: string;
  choices: Record<SatChoiceKey, string> | null;
  correctAnswer: string[];
  figureUrl: string | null;
}

export interface SatTopic {
  section: SatSection;
  domain: string;
  skill: string;
  skillSlug: string;
  questionCount: number;
  difficultyCounts: Record<SatDifficulty, number>;
  // Konu satirinda kullanici ilerlemesini (attempts ile kesisim) hesaplamak icin.
  // Id listesi kucuktur (~8 bayt/soru); egress acisindan kabul edilebilir.
  questionIds: string[];
}
