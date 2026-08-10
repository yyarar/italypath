export const EXPERT_LEAD_STATUSES = ["new", "contacted", "completed"] as const;
export type ExpertLeadStatus = (typeof EXPERT_LEAD_STATUSES)[number];

export const EXPERT_STUDY_LEVELS = ["bachelor", "master", "undecided"] as const;
export type ExpertStudyLevel = (typeof EXPERT_STUDY_LEVELS)[number];

export const EXPERT_FIELDS = [
  "engineering-tech",
  "medicine-health",
  "business-economics",
  "design-architecture",
  "natural-sciences",
  "social-humanities",
  "arts-fashion",
  "law-politics",
  "undecided",
] as const;
export type ExpertField = (typeof EXPERT_FIELDS)[number];

export interface ExpertLeadDraft {
  submissionId: string;
  fullName: string;
  whatsappPhone: string;
  studyLevel: string;
  fieldOfInterest: string;
  targetIntake: string;
  helpRequest: string;
  website: string;
}

export interface ExpertLeadSubmission {
  submissionId: string;
  fullName: string;
  whatsappPhone: string;
  studyLevel: ExpertStudyLevel;
  fieldOfInterest: ExpertField;
  targetIntake: string;
  helpRequest: string;
}

export function buildTargetIntakeOptions(now = new Date()): string[] {
  const year = now.getUTCFullYear();
  return [
    `${year}-${year + 1}`,
    `${year + 1}-${year + 2}`,
    `${year + 2}-${year + 3}`,
    "undecided",
  ];
}

export function normalizeWhatsAppPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\+[0-9\s()-]+$/.test(trimmed)) return null;
  const digits = trimmed.slice(1).replace(/[\s()-]/g, "");
  if (!/^\d{8,15}$/.test(digits)) return null;
  return `+${digits}`;
}

export function buildWhatsAppHref(value: string): string | null {
  const normalized = normalizeWhatsAppPhone(value);
  return normalized ? `https://wa.me/${normalized.slice(1)}` : null;
}
