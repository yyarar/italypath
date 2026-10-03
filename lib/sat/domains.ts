import type { SatSection } from "@/lib/sat/types";

// Bolum basina alan sirasi (College Board sirasi). Okuma ve Yazma: plan 2026-10-03.
export const DOMAIN_ORDER: Record<SatSection, readonly string[]> = {
  math: [
    "Algebra",
    "Advanced Math",
    "Problem-Solving and Data Analysis",
    "Geometry and Trigonometry",
  ],
  "reading-writing": [
    "Information and Ideas",
    "Craft and Structure",
    "Expression of Ideas",
    "Standard English Conventions",
  ],
};

export function domainOrderIndex(section: SatSection, domain: string): number {
  const order = DOMAIN_ORDER[section];
  const i = order.indexOf(domain);
  return i === -1 ? order.length : i;
}

export function domainLabelKey(domain: string): string {
  switch (domain) {
    case "Algebra": return "domainAlgebra";
    case "Advanced Math": return "domainAdvancedMath";
    case "Problem-Solving and Data Analysis": return "domainProblemSolving";
    case "Geometry and Trigonometry": return "domainGeometry";
    case "Information and Ideas": return "domainInformationIdeas";
    case "Craft and Structure": return "domainCraftStructure";
    case "Expression of Ideas": return "domainExpressionIdeas";
    case "Standard English Conventions": return "domainStandardEnglish";
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
