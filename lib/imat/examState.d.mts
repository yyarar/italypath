// lib/imat/examState.mjs icin tipler (ayni modul hem Next hem Node betikleri tarafindan
// dogrudan ice aktarildigi icin JS olarak yazildi).
import type { ImatChoiceKey } from "./types";

export interface ExamState {
  sessionId: string;
  questionIds: string[];
  /** 0 ile questionIds.length - 1 arasi. */
  index: number;
  answers: Record<string, ImatChoiceKey>;
  /** Yalniz isaretli sorular (deger her zaman true). */
  flags: Record<string, boolean>;
}

export type ExamAction =
  | { type: "answer"; questionId: string; letter: ImatChoiceKey }
  | { type: "clear"; questionId: string }
  | { type: "toggleFlag"; questionId: string }
  | { type: "goto"; index: number }
  | { type: "next" }
  | { type: "prev" }
  | { type: "hydrate"; answers: unknown; flags: unknown };

export interface ExamDraft {
  answers: Record<string, ImatChoiceKey>;
  /** Kaydetme zamani (ms); buyuk olan taslak kazanir. */
  savedAt: number;
}

export function createExamState(init: { sessionId: string; questionIds: readonly string[] }): ExamState;

/** Saf; degisiklikte yeni nesne, gecersiz aksiyonda ayni durumu dondurur. */
export function examReducer(state: ExamState, action: ExamAction): ExamState;

/** savedAt buyuk olan taslak kazanir, esitse yerel; eksik taraf yoksayilir. */
export function mergeDrafts(local: ExamDraft | null | undefined, server: ExamDraft | null | undefined): ExamDraft;

export function unansweredCount(questionIds: readonly string[], answers: unknown): number;

/** `imatExam:<sessionId>` */
export function localStorageKey(sessionId: string): string;
