export type ProgramLanguage = "en" | "it";
export type ProgramLevel = "bachelor" | "master" | "single-cycle";
export type ProgramDurationYears = 1 | 2 | 3 | 4 | 5 | 6;

export interface ProgramSourceQuote {
  url: string;
  quote: string;
  field_refs: string[];
  retrieved_at: string;
}

export interface ProgramAdmissionDetails {
  officialProgramUrl: string;
  officialCallUrl?: string;
  tuitionOrFeesLink?: string;
  campus?: string;
  degreeClass?: string;
  admissionType?: string;
  academicRequirements?: string;
  languageRequirements?: string;
  applicationDeadlineEu?: string;
  applicationDeadlineNonEu?: string;
  requiredDocuments: string[];
  entryExamOrTest?: string;
  sourceQuotes: ProgramSourceQuote[];
  uncertain: string[];
  uncertaintyNotes: string[];
  rawTeachingLanguage: string;
}

export interface Department {
  id?: number;
  name: string;
  slug: string;
  languages: ProgramLanguage[];
  durationYears: ProgramDurationYears;
  level: ProgramLevel;
  admissionDetails?: ProgramAdmissionDetails;
}

export interface University {
  id: number;
  name: string;
  city: string;
  type: string;
  departments: Department[];
  fee: string;
  image: string;
  description: string;
  description_en?: string;
  website: string;
  features: string[];
  features_en?: string[];
}
