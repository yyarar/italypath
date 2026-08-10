import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const failures = [];

function read(filePath) {
  if (!existsSync(filePath)) {
    failures.push(`Eksik dosya: ${filePath}`);
    return "";
  }
  return readFileSync(filePath, "utf8");
}

function mustInclude(source, needle, label) {
  if (!source.includes(needle)) failures.push(`${label}: ${needle}`);
}

function mustNotInclude(source, needle, label) {
  if (source.includes(needle)) failures.push(`${label}: ${needle}`);
}

function sourceFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(filePath);
    return /\.(?:ts|tsx)$/.test(entry.name) && statSync(filePath).isFile()
      ? [filePath]
      : [];
  });
}

const routePath = "app/api/expert-leads/route.ts";
const route = read(routePath);
const server = read("lib/mentor/expertLeads.server.ts");
const sql = read("supabase/expert_leads.sql");
const expertDesk = read("components/mentor/expert/ExpertLeadDesk.tsx");
const expertForm = read("components/mentor/expert/ExpertLeadForm.tsx");
const expertSuccess = read("components/mentor/expert/ExpertLeadSuccess.tsx");
const translations = read("lib/translations.ts");

mustInclude(route, "export async function POST", "Public expert POST eksik");
mustNotInclude(route, "export async function GET", "Lead GET public olamaz");
mustInclude(route, 'export const dynamic = "force-dynamic"', "POST force-dynamic degil");
mustInclude(route, '"Cache-Control": "no-store, max-age=0"', "POST no-store degil");
mustInclude(route, "validateExpertLeadPayload", "Server payload dogrulamiyor");
mustInclude(server, 'import "server-only"', "Service role modulu server-only degil");
mustInclude(server, "SUPABASE_SERVICE_ROLE_KEY", "Service role insert eksik");
mustInclude(server, "expert_leads_submission_id_key", "Idempotent conflict guard eksik");
mustInclude(sql, "enable row level security", "Expert lead RLS eksik");

[
  [expertDesk, "ExpertLeadForm", "Expert desk form orkestrasyonu eksik"],
  [expertDesk, "ExpertLeadSuccess", "Expert desk success orkestrasyonu eksik"],
  [expertForm, 'fetch("/api/expert-leads"', "Expert form POST etmiyor"],
  [expertForm, "crypto.randomUUID", "Submission id uretilmiyor"],
  [expertForm, "website", "Honeypot alan eksik"],
].forEach(([source, needle, label]) => mustInclude(source, needle, label));

mustInclude(
  translations,
  "Talebini aldık. Ekibimiz WhatsApp üzerinden en kısa sürede sana ulaşacak.",
  "Turkce basari metni eksik",
);
mustInclude(expertSuccess, "aria-live", "Expert success live region eksik");

[
  "fullName",
  "whatsappPhone",
  "studyLevel",
  "fieldOfInterest",
  "targetIntake",
  "helpRequest",
].forEach((field) => mustInclude(expertForm, field, `Expert form alani eksik (${field})`));

if (translations.split("expertDesk:").length - 1 < 2) {
  failures.push("expertDesk TR+EN cevirileri eksik");
}
[
  "firstConsultationFree",
  "paidContinuation",
  "submit",
  "submitting",
  "submitError",
  "success",
  "backToDesks",
  "fields",
  "studyLevels",
  "fieldsOfInterest",
  "undecided",
].forEach((key) => {
  if (translations.split(key).length - 1 < 2) {
    failures.push(`expertDesk ceviri anahtari eksik: ${key}`);
  }
});

for (const filePath of [
  ...sourceFiles("components"),
  ...sourceFiles("app").filter((file) => file !== routePath),
  ...sourceFiles("lib").filter((file) => /^\s*["']use client["'];/m.test(read(file))),
]) {
  mustNotInclude(
    read(filePath),
    "SUPABASE_SERVICE_ROLE_KEY",
    `Client surface service-role anahtari iceriyor (${filePath})`,
  );
}

if (failures.length > 0) {
  console.error("Expert lead guard failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("Expert lead guard passed.");
}
