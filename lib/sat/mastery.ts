export const DAILY_GOAL = 10;

export type MasteryTier = "none" | "weak" | "bronze" | "silver" | "gold";

export function accuracyPct(correct: number, solved: number): number {
  if (solved <= 0) return 0;
  return Math.round((correct / solved) * 100);
}

export function masteryTier(solved: number, correct: number, total: number): MasteryTier {
  if (solved <= 0) return "none";
  const acc = correct / solved;
  const coverage = total > 0 ? solved / total : 0;
  if (acc >= 0.9 && coverage >= 0.8) return "gold";
  if (acc >= 0.7) return "silver";
  if (acc >= 0.5) return "bronze";
  return "weak";
}

export function readinessPct(progressList: { correctCount: number; questionCount: number }[]): number {
  const totalQuestions = progressList.reduce((sum, progress) => sum + progress.questionCount, 0);
  const totalCorrect = progressList.reduce((sum, progress) => sum + progress.correctCount, 0);
  if (totalQuestions <= 0) return 0;
  return Math.round((totalCorrect / totalQuestions) * 100);
}
