export const DOMAIN_ORDER = [
  "Algebra",
  "Advanced Math",
  "Problem-Solving and Data Analysis",
  "Geometry and Trigonometry",
];

export function domainOrderIndex(domain: string): number {
  const i = DOMAIN_ORDER.indexOf(domain);
  return i === -1 ? DOMAIN_ORDER.length : i;
}

export function domainLabelKey(domain: string): string {
  switch (domain) {
    case "Algebra": return "domainAlgebra";
    case "Advanced Math": return "domainAdvancedMath";
    case "Problem-Solving and Data Analysis": return "domainProblemSolving";
    case "Geometry and Trigonometry": return "domainGeometry";
    default: return "domainOther";
  }
}

export type SatDifficultyFilter = "mixed" | 1 | 2 | 3;

export function filterQuestionsByDifficulty<T extends { difficulty: 1 | 2 | 3 }>(
  questions: T[],
  difficulty: SatDifficultyFilter
): T[] {
  if (difficulty === "mixed") return questions;
  return questions.filter((question) => question.difficulty === difficulty);
}
