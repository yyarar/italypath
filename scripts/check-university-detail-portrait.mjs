import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const failures = [];

function read(path) {
  const absolutePath = resolve(process.cwd(), path);
  if (!existsSync(absolutePath)) {
    failures.push(`${path} is missing`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function requireTokens(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) {
      failures.push(`${label} must include ${token}`);
    }
  }
}

function forbidTokens(label, source, tokens) {
  for (const token of tokens) {
    if (source.includes(token)) {
      failures.push(`${label} still contains forbidden detail token ${token}`);
    }
  }
}

const universityPage = read("app/universities/[id]/page.tsx");
const programPage = read("app/universities/[id]/departments/[deptSlug]/page.tsx");
const universityDetailClient = read("components/university-details/UniversityDetailClient.tsx");
const departmentDetailClient = read("components/university-details/DepartmentDetailClient.tsx");

const portraitFiles = [
  "components/university-details/DetailMentorPrompt.tsx",
  "components/university-details/ProgramAdmissionDetailsPanel.tsx",
  "components/university-details/ProgramTransitionEntry.tsx",
  "components/university-details/ProgramDirectory.tsx",
  "components/university-details/UniversityPortraitMasthead.tsx",
  "components/university-details/UniversityHighlights.tsx",
  "components/university-details/ProgramMetaStrip.tsx",
  "components/university-details/ProgramPortraitHeader.tsx",
  "components/university-details/ComingSoonNotice.tsx",
];

const portraitSource = portraitFiles.map(read).join("\n");
const allDetailSource = [
  universityPage,
  programPage,
  universityDetailClient,
  departmentDetailClient,
  portraitSource,
].join("\n");

requireTokens("university detail wrapper", universityPage, [
  "getUniversityById",
  "UniversityDetailClient",
  "initialUniversity",
  "cameFromList",
]);

requireTokens("university detail client", universityDetailClient, [
  "UniversityPortraitMasthead",
  "UniversityHighlights",
  "ProgramDirectory",
  "DetailMentorPrompt",
  "description",
  "features",
  "isFavorite",
  "toggleFavorite",
  "feeLabel={t.detail.fee}",
  "singleCyclePrograms={t.detail.singleCyclePrograms}",
  "comingSoonLabel={t.detail.detailComingSoon}",
]);

requireTokens("program detail wrapper", programPage, [
  "getUniversityById",
  "DepartmentDetailClient",
  "initialUniversity",
  "initialDepartmentSlug",
]);

requireTokens("program detail client", departmentDetailClient, [
  "ProgramPortraitHeader",
  "ProgramAdmissionDetailsPanel",
  "ProgramDirectory",
  "DetailMentorPrompt",
  "safeLanguages",
  "safeDurationYears",
  "safeLevel",
  "single-cycle",
  "t.department.singleCycle",
  "department.admissionDetails",
  "singleCyclePrograms={t.detail.singleCyclePrograms}",
  "otherDepts",
  "description",
  "department.durationYears",
  "department.languages",
  "ComingSoonNotice",
  "detailsComingSoonTitle",
  "detailsComingSoonBody",
]);

requireTokens("university detail fee", allDetailSource, [
  "feeLabel",
  "university.fee",
  "t.detail.fee",
]);

requireTokens("portrait components", portraitSource, [
  "university.website",
  "university.departments",
  "bachelorPrograms",
  "masterPrograms",
  "singleCyclePrograms",
  "singleCycleDepartments",
  "visibleGroupCount",
  "gridColumnsClass",
  "lg:grid-cols-3",
  "lg:grid-cols-2",
  "ExternalLink",
  "officialProgramUrl",
  "rawTeachingLanguage",
  "teachingLanguage",
  "uncertaintyNote",
  "uncertainFields",
  "uncertaintyNotes",
  "details.uncertain.map",
  "details.uncertaintyNotes.map",
  "break-words",
]);

forbidTokens("detail redesign", allDetailSource, [
  "Sparkles",
  "glass-dark",
  "glass ",
  "bg-indigo",
  "text-indigo",
  "shadow-indigo",
  "radial-gradient",
  "rounded-3xl",
  "bg-slate-950",
]);

if (failures.length > 0) {
  console.error("[FAIL] University detail portrait check failed.");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("[OK] University detail portrait check passed.");
