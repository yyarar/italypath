import { createClient } from "@supabase/supabase-js";

import type { SatDifficulty, SatQuestion, SatSection, SatTopic } from "@/lib/sat/types";
import type { SatQuestionRow } from "@/types";

const SAT_QUESTION_COLUMNS =
  "id,section,domain,skill,skill_slug,difficulty,question_type,prompt,choices,correct_answer,figure_path,explanation_tr,needs_review";
const PAGE_SIZE = 1000;
// Egress guard: soru seti yalnizca manuel importla degisir; universities.server.ts
// ile ayni politika (3 saat memo + stale-on-error + single-flight).
const SERVER_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

let cachedBank: { data: SatQuestion[]; expiresAt: number } | null = null;
let inFlightRefresh: Promise<SatQuestion[]> | null = null;

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase URL veya service role key eksik.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function figurePublicUrl(figurePath: string | null): string | null {
  if (!figurePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/sat-figures/${figurePath}`;
}

function createQuestion(row: SatQuestionRow): SatQuestion | null {
  if (!row.id || !row.prompt) return null;
  if (row.section !== "math" && row.section !== "reading-writing") return null;
  if (row.question_type !== "mcq" && row.question_type !== "spr") return null;
  if (![1, 2, 3].includes(row.difficulty)) return null;
  if (!Array.isArray(row.correct_answer) || row.correct_answer.length === 0) return null;

  const choices =
    row.question_type === "mcq" && row.choices
      ? {
          A: String(row.choices.A ?? ""),
          B: String(row.choices.B ?? ""),
          C: String(row.choices.C ?? ""),
          D: String(row.choices.D ?? ""),
        }
      : null;
  if (row.question_type === "mcq" && (!choices || Object.values(choices).some((c) => !c))) return null;

  return {
    id: row.id,
    section: row.section as SatSection,
    domain: row.domain,
    skill: row.skill,
    skillSlug: row.skill_slug,
    difficulty: row.difficulty as SatDifficulty,
    questionType: row.question_type,
    prompt: row.prompt,
    choices,
    correctAnswer: row.correct_answer.map(String),
    figureUrl: figurePublicUrl(row.figure_path),
  };
}

async function fetchAllRows(): Promise<SatQuestionRow[]> {
  const supabase = createServiceRoleClient();
  const rows: SatQuestionRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("sat_questions")
      .select(SAT_QUESTION_COLUMNS)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .returns<SatQuestionRow[]>();

    if (error) throw new Error(`sat_questions fetch hatasi: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function getSatBank(): Promise<SatQuestion[]> {
  if (cachedBank && cachedBank.expiresAt > Date.now()) {
    return cachedBank.data;
  }

  if (!inFlightRefresh) {
    const refresh = (async () => {
      const rows = await fetchAllRows();
      const questions = rows
        .map(createQuestion)
        .filter((q): q is SatQuestion => q !== null);
      cachedBank = { data: questions, expiresAt: Date.now() + SERVER_CACHE_TTL_MS };
      return questions;
    })();

    inFlightRefresh = refresh;
    refresh
      .catch(() => {})
      .finally(() => {
        if (inFlightRefresh === refresh) inFlightRefresh = null;
      });
  }

  try {
    return await inFlightRefresh;
  } catch (error) {
    if (cachedBank) {
      console.error("sat_questions fetch basarisiz; bayat memo sunuluyor:", error);
      return cachedBank.data;
    }
    throw error;
  }
}

export async function getSatTopics(): Promise<SatTopic[]> {
  const bank = await getSatBank();
  const topics = new Map<string, SatTopic>();

  for (const q of bank) {
    const key = `${q.section}/${q.skillSlug}`;
    const topic = topics.get(key) ?? {
      section: q.section,
      domain: q.domain,
      skill: q.skill,
      skillSlug: q.skillSlug,
      questionCount: 0,
      difficultyCounts: { 1: 0, 2: 0, 3: 0 },
      questionIds: [],
    };
    topic.questionCount++;
    topic.difficultyCounts[q.difficulty]++;
    topic.questionIds.push(q.id);
    topics.set(key, topic);
  }

  return [...topics.values()].sort((a, b) =>
    a.section === b.section ? a.skill.localeCompare(b.skill) : a.section.localeCompare(b.section)
  );
}

export async function getSatQuestions(section: SatSection, skillSlug: string): Promise<SatQuestion[]> {
  const bank = await getSatBank();
  return bank
    .filter((q) => q.section === section && q.skillSlug === skillSlug)
    .sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));
}
