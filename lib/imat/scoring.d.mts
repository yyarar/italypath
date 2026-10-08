// lib/imat/scoring.mjs icin tipler (ayni modul hem Next hem Node betikleri tarafindan
// dogrudan ice aktarildigi icin JS olarak yazildi).
import type { ImatChoiceKey, ImatSection, ImatSectionBreakdown } from "./types";

export const EXAM_QUESTION_COUNT: 60;
export const EXAM_DURATION_MINUTES: 100;
export const POINTS_CORRECT: 1.5;
export const POINTS_WRONG: -0.4;
export const POINTS_BLANK: 0;
export const MAX_SCORE: 90;
export const CHOICE_KEYS: readonly ImatChoiceKey[];

/** Yalnizca verilen soru kimliklerine ait ve A-E harfi olan yanitlar kalir. */
export function normalizeAnswers(answers: unknown, questionIds: readonly string[]): Record<string, ImatChoiceKey>;

export interface ScorableQuestion {
  id: string;
  section: ImatSection;
  correctAnswer: ImatChoiceKey | null;
}

export interface ExamScore {
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  /** Iki ondalia yuvarlanmis sayi. */
  score: number;
  /** Bes bolumun her biri icin. */
  sectionBreakdown: Record<ImatSection, ImatSectionBreakdown>;
}

export function scoreExam(questions: readonly ScorableQuestion[], answers: unknown): ExamScore;

/** Teslim son tarihten sonraysa true; esitlik gec degildir. */
export function isLate(submittedAtIso: string, deadlineAtIso: string): boolean;
