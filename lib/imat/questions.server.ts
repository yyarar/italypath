import "server-only";

import { createClient } from "@supabase/supabase-js";

import { CHOICE_KEYS, EXAM_QUESTION_COUNT } from "@/lib/imat/scoring.mjs";
import { MOCK_YEARS, SECTIONS, TOPICS } from "@/lib/imat/taxonomy.mjs";
import type {
  ImatChoiceKey,
  ImatExamSession,
  ImatMockSummary,
  ImatQuestion,
  ImatSection,
  ImatSectionBreakdown,
  ImatTopic,
} from "@/lib/imat/types";
import type { ImatExamSessionRow, ImatQuestionRow } from "@/types";

// source_file/source_page secilmez: istemciye gerekmez, yuk kucuk kalir.
const IMAT_QUESTION_COLUMNS =
  "id,year,number,exam_set,section,topic,topic_slug,prompt,choices,correct_answer,figure_path,needs_review";
const IMAT_SESSION_COLUMNS =
  "id,user_id,year,started_at,deadline_at,draft_answers,submitted_at,answers,correct_count,wrong_count,blank_count,score,section_breakdown";
const PAGE_SIZE = 1000;
// Egress guard: soru seti yalnizca manuel importla degisir; SAT bankasi ile ayni
// politika (3 saat memo + stale-on-error + single-flight).
const SERVER_CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Konu listesi sirasi: taksonomi sirasi; bilinmeyen slug sona.
const TOPIC_ORDER = new Map(TOPICS.map((entry, index) => [entry.slug, index]));

let cachedBank: { data: ImatQuestion[]; expiresAt: number } | null = null;
let inFlightRefresh: Promise<ImatQuestion[]> | null = null;

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
  return `${base}/storage/v1/object/public/imat-figures/${figurePath}`;
}

function isSection(value: string): value is ImatSection {
  return (SECTIONS as readonly string[]).includes(value);
}

function isChoiceKey(value: string | null): value is ImatChoiceKey {
  return value !== null && (CHOICE_KEYS as readonly string[]).includes(value);
}

// A-E besi de bos olmayan metin degilse null.
function readChoices(value: ImatQuestionRow["choices"]): Record<ImatChoiceKey, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const choices = {} as Record<ImatChoiceKey, string>;
  for (const key of CHOICE_KEYS) {
    const text = value[key];
    if (typeof text !== "string" || !text.trim()) return null;
    choices[key] = text;
  }
  return choices;
}

function createQuestion(row: ImatQuestionRow): ImatQuestion | null {
  if (row.needs_review) return null;
  if (!row.id || !row.prompt?.trim()) return null;
  if (!isSection(row.section)) return null;
  if (row.exam_set !== "mock" && row.exam_set !== "bank") return null;
  if (!isChoiceKey(row.correct_answer)) return null;

  const choices = readChoices(row.choices);
  if (!choices) return null;

  return {
    id: row.id,
    year: row.year,
    number: row.number,
    examSet: row.exam_set,
    section: row.section,
    topic: row.topic,
    topicSlug: row.topic_slug,
    prompt: row.prompt,
    choices,
    correctAnswer: row.correct_answer,
    figureUrl: figurePublicUrl(row.figure_path),
  };
}

function createSession(row: ImatExamSessionRow): ImatExamSession {
  return {
    id: row.id,
    year: row.year,
    startedAt: row.started_at,
    deadlineAt: row.deadline_at,
    submittedAt: row.submitted_at,
    draftAnswers: (row.draft_answers ?? {}) as Record<string, ImatChoiceKey>,
    answers: row.answers as Record<string, ImatChoiceKey> | null,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    blankCount: row.blank_count,
    // Postgres numeric metin olarak gelir.
    score: row.score === null ? null : Number(row.score),
    sectionBreakdown: row.section_breakdown as Record<ImatSection, ImatSectionBreakdown> | null,
  };
}

async function fetchAllRows(): Promise<ImatQuestionRow[]> {
  const supabase = createServiceRoleClient();
  const rows: ImatQuestionRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("imat_questions")
      .select(IMAT_QUESTION_COLUMNS)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .returns<ImatQuestionRow[]>();

    if (error) throw new Error(`imat_questions fetch hatasi: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

// Sunulan sorular yil, sonra kagit numarasi sirasiyla; asagidaki tum filtreler bu sirayi korur.
async function getImatBank(): Promise<ImatQuestion[]> {
  if (cachedBank && cachedBank.expiresAt > Date.now()) {
    return cachedBank.data;
  }

  if (!inFlightRefresh) {
    const refresh = (async () => {
      const rows = await fetchAllRows();
      const questions = rows
        .map(createQuestion)
        .filter((q): q is ImatQuestion => q !== null)
        .sort((a, b) => a.year - b.year || a.number - b.number || a.id.localeCompare(b.id));
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
      console.error("imat_questions fetch basarisiz; bayat memo sunuluyor:", error);
      return cachedBank.data;
    }
    throw error;
  }
}

// Bir yilin deneme kagidi, kagit sirasiyla (dogru cevap dahil).
function mockPaper(bank: ImatQuestion[], year: number): ImatQuestion[] {
  return bank.filter((q) => q.examSet === "mock" && q.year === year);
}

function topicRank(slug: string): number {
  return TOPIC_ORDER.get(slug) ?? TOPICS.length;
}

export async function getImatCatalog(): Promise<{ mocks: ImatMockSummary[]; topics: ImatTopic[] }> {
  const bank = await getImatBank();

  // Yalniz 60 sorusunun hepsi sunulan yillar listelenir.
  const mocks = MOCK_YEARS.map((year) => ({ year, questionCount: mockPaper(bank, year).length })).filter(
    (mock) => mock.questionCount === EXAM_QUESTION_COUNT
  );

  const topics = new Map<string, ImatTopic>();
  for (const q of bank) {
    if (q.examSet !== "bank") continue;
    const key = `${q.section}/${q.topicSlug}`;
    const topic = topics.get(key) ?? {
      section: q.section,
      topic: q.topic,
      topicSlug: q.topicSlug,
      questionCount: 0,
      questionIds: [],
    };
    topic.questionCount++;
    topic.questionIds.push(q.id);
    topics.set(key, topic);
  }

  return {
    mocks,
    topics: [...topics.values()].sort(
      (a, b) =>
        SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section) ||
        topicRank(a.topicSlug) - topicRank(b.topicSlug) ||
        a.topicSlug.localeCompare(b.topicSlug)
    ),
  };
}

export async function getImatPracticeQuestions(section: ImatSection, topicSlug: string): Promise<ImatQuestion[]> {
  const bank = await getImatBank();
  return bank.filter((q) => q.examSet === "bank" && q.section === section && q.topicSlug === topicSlug);
}

export async function getImatMockQuestions(year: number): Promise<ImatQuestion[]> {
  const paper = mockPaper(await getImatBank(), year);
  if (paper.length !== EXAM_QUESTION_COUNT) return [];
  // Sinav sirasinda cevap anahtari istemciye gitmez (onbellekteki nesne degismez).
  return paper.map((q) => ({ ...q, correctAnswer: null }));
}

export async function getImatReview(
  sessionId: string,
  userId: string
): Promise<{ session: ImatExamSession; questions: ImatQuestion[] } | null> {
  if (!UUID_PATTERN.test(sessionId) || !userId) return null;

  // Oturum kullaniciya ait olmali (id + user_id); onbellege alinmaz.
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("imat_exam_sessions")
    .select(IMAT_SESSION_COLUMNS)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle<ImatExamSessionRow>();

  if (error) throw new Error(`imat_exam_sessions fetch hatasi: ${error.message}`);
  // Teslim edilmemis oturumda cevap anahtari acilmaz.
  if (!data || !data.submitted_at) return null;

  const questions = mockPaper(await getImatBank(), data.year);
  return { session: createSession(data), questions };
}
