export type ImatSection = "reading-general" | "logic" | "biology" | "chemistry" | "physics-math";
export type ImatChoiceKey = "A" | "B" | "C" | "D" | "E";
export type ImatExamSet = "mock" | "bank";

export interface ImatQuestion {
  id: string;
  year: number;
  number: number;
  examSet: ImatExamSet;
  section: ImatSection;
  topic: string;
  topicSlug: string;
  prompt: string;
  choices: Record<ImatChoiceKey, string>;
  // Deneme yanitinda (?mock=) null; pratik ve review yanitinda harf.
  correctAnswer: ImatChoiceKey | null;
  figureUrl: string | null;
}

export interface ImatTopic {
  section: ImatSection;
  topic: string;
  topicSlug: string;
  questionCount: number;
  questionIds: string[];
}

export interface ImatMockSummary { year: number; questionCount: number }

export interface ImatSectionBreakdown { correct: number; wrong: number; blank: number }

export interface ImatExamSession {
  id: string;
  year: number;
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  draftAnswers: Record<string, ImatChoiceKey>;
  answers: Record<string, ImatChoiceKey> | null;
  correctCount: number | null;
  wrongCount: number | null;
  blankCount: number | null;
  score: number | null;
  sectionBreakdown: Record<ImatSection, ImatSectionBreakdown> | null;
}
