import {
  EXPERT_FIELDS,
  EXPERT_STUDY_LEVELS,
  normalizeWhatsAppPhone,
  type ExpertField,
  type ExpertLeadSubmission,
  type ExpertStudyLevel,
} from "@/lib/mentor/expertLeads";

export type ExpertLeadField =
  | "submissionId"
  | "fullName"
  | "whatsappPhone"
  | "studyLevel"
  | "fieldOfInterest"
  | "targetIntake"
  | "helpRequest";

export type ExpertLeadValidationResult =
  | { kind: "valid"; value: ExpertLeadSubmission }
  | { kind: "invalid"; errors: Partial<Record<ExpertLeadField, string>> }
  | { kind: "honeypot" };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isExpertStudyLevel(value: string): value is ExpertStudyLevel {
  return (EXPERT_STUDY_LEVELS as readonly string[]).includes(value);
}

function isExpertField(value: string): value is ExpertField {
  return (EXPERT_FIELDS as readonly string[]).includes(value);
}

function isValidTargetIntake(value: string, now: Date): boolean {
  if (value === "undecided") return true;

  const match = /^(\d{4})-(\d{4})$/.exec(value);
  if (!match) return false;

  const start = Number(match[1]);
  const end = Number(match[2]);
  const currentYear = now.getUTCFullYear();
  return end === start + 1 && start >= currentYear - 1 && start <= currentYear + 4;
}

export function validateExpertLeadPayload(
  input: unknown,
  now = new Date(),
): ExpertLeadValidationResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {
      kind: "invalid",
      errors: { submissionId: "required" },
    };
  }

  const record = input as Record<string, unknown>;
  if (typeof record.website === "string" && record.website.trim() !== "") {
    return { kind: "honeypot" };
  }

  const submissionId = stringValue(record.submissionId).trim();
  const fullName = stringValue(record.fullName).trim();
  const whatsappPhone = stringValue(record.whatsappPhone).trim();
  const studyLevel = stringValue(record.studyLevel).trim();
  const fieldOfInterest = stringValue(record.fieldOfInterest).trim();
  const targetIntake = stringValue(record.targetIntake).trim();
  const helpRequest = stringValue(record.helpRequest).trim();
  const errors: Partial<Record<ExpertLeadField, string>> = {};

  if (!UUID_PATTERN.test(submissionId)) errors.submissionId = "invalid";

  if (fullName.length < 2) errors.fullName = "too_short";
  else if (fullName.length > 120) errors.fullName = "too_long";

  const normalizedPhone = normalizeWhatsAppPhone(whatsappPhone);
  if (!normalizedPhone) errors.whatsappPhone = "invalid";

  if (!isExpertStudyLevel(studyLevel)) errors.studyLevel = "invalid";
  if (!isExpertField(fieldOfInterest)) errors.fieldOfInterest = "invalid";
  if (!isValidTargetIntake(targetIntake, now)) errors.targetIntake = "invalid";

  if (helpRequest.length < 10) errors.helpRequest = "too_short";
  else if (helpRequest.length > 3000) errors.helpRequest = "too_long";

  if (Object.keys(errors).length > 0) {
    return { kind: "invalid", errors };
  }

  return {
    kind: "valid",
    value: {
      submissionId,
      fullName,
      whatsappPhone: normalizedPhone!,
      studyLevel: studyLevel as ExpertStudyLevel,
      fieldOfInterest: fieldOfInterest as ExpertField,
      targetIntake,
      helpRequest,
    },
  };
}
