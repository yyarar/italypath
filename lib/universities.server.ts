import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  Department,
  ProgramAdmissionDetails,
  ProgramDurationYears,
  ProgramLanguage,
  ProgramLevel,
  ProgramSourceQuote,
  University,
} from "@/types/universities";
import type {
  SupabaseProgramAdmissionDetailsRow,
  SupabaseUniversityDepartmentRow,
  SupabaseUniversityRow,
} from "@/types";
import { extractDegreeClassCodes } from "@/components/university-details/programAdmissionPresentation";
import { parseCanonicalUniversityId } from "@/lib/universityPath";

const UNIVERSITY_COLUMNS =
  "id,name,city,type,fee,image,description,description_en,website,features,features_en,sort_order,updated_at";
const UNIVERSITY_DEPARTMENT_COLUMNS =
  "id,university_id,name,slug,languages,duration_years,level,sort_order,updated_at";
// Program sayfasinin kabul dosyasi: yalnizca panelin okudugu kolonlar (ham program adi/seviye ve
// kaynak dosya adi sayfada kullanilmaz, cekilmez).
const PROGRAM_ADMISSION_DOSSIER_COLUMNS =
  "raw_teaching_language,campus,degree_class,admission_type,academic_requirements,language_requirements,application_deadline_eu,application_deadline_non_eu,required_documents,entry_exam_or_test,tuition_or_fees_link,official_program_url,official_call_url,source_quotes,uncertain,uncertainty_notes";
const UNIVERSITY_PAGE_SIZE = 1000;
const UNIVERSITY_DEPARTMENT_PAGE_SIZE = 1000;
const PROGRAM_ADMISSION_DETAIL_PAGE_SIZE = 1000;
// Supabase egress guard (2026-07-02 kota asimi; 2026-09-15 egress diyeti; 2026-09-25 guvenlik
// denetimi O1#1/S9#3): tam veri seti (sikistirilmis ~4,6 MB, %98'i program_admission_details)
// runtime'da ARTIK CEKILMEZ.
// - getUniversitiesDirectory(): okul + program satirlari + kabul dosyasi VARLIGI (~47 KB gz).
//   Okul sayfasi ve layout'lar da bu dizinden beslenir (getUniversityById).
// - getProgramPageData(): dizin + YALNIZCA acilan programin kabul satiri (university_id +
//   department_id, maybeSingle).
// Memo: 3 saat; single-flight; suresi dolmus kayit hemen sunulur ve arka planda yenilenir;
// basarisiz yenileme bayat kaydi STALE_RETRY_MS kadar uzatir. Her deploy memo'yu sifirlar.
// Client tarafi `no-store` sozlesmesi degismez. Ayrinti: AGENT_CONTEXT.md "Veri Katmani".
const SERVER_CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const STALE_RETRY_MS = 5 * 60 * 1000;
// Supabase istegi bu sureden uzun surerse iptal edilir (O4#4); asili istek sayfa uretimini tutmaz.
const SUPABASE_REQUEST_TIMEOUT_MS = 8000;

const PROGRAM_LANGUAGES = new Set<ProgramLanguage>(["en", "it"]);
const PROGRAM_LEVELS = new Set<ProgramLevel>(["bachelor", "master", "single-cycle"]);
const PROGRAM_DURATIONS = new Set<ProgramDurationYears>([1, 2, 3, 4, 5, 6]);

// Not: memo'daki listeler/objeler tum istekler arasinda PAYLASILIR; caller'lar bunlari
// yerinde mutate etmemeli (sort/push/alan ekleme gerekiyorsa once kopyala).
type MemoEntry<T> = { data: T; expiresAt: number };
type AdmissionPresenceRow = { department_id: number; updated_at: string | null };
type ProgramDegreeClassCodesRow = { department_id: number; degree_class_codes: string | null };
type ProgramAdmissionDossierRow = Omit<
  SupabaseProgramAdmissionDetailsRow,
  "department_id" | "university_id" | "raw_program_name" | "raw_level" | "source_file"
>;
// Program basina bir kabul kaydi (canlida 941 program, 2026-09-21); ust sinir bunun uzerinde kalir.
const ADMISSION_MEMO_MAX_ENTRIES = 2000;
const DIRECTORY_MEMO_KEY = "directory";

const directoryCache = new Map<string, MemoEntry<University[]>>();
const directoryInFlight = new Map<string, Promise<University[]>>();
const admissionCache = new Map<string, MemoEntry<ProgramAdmissionDetails | null>>();
const admissionInFlight = new Map<string, Promise<ProgramAdmissionDetails | null>>();

let catalogClient: SupabaseClient | null = null;

// Katalog okumalari (universities, university_departments, program_admission_details,
// program_degree_class_codes) yalnizca sunucuda, server-only gizli anahtarla yapilir; herkese acik
// anon anahtar kullanilmaz ve ona geri dusulmez (S9#1). Anahtar Supabase'in yeni tip gizli anahtaridir
// (sb_secret_...); yoksa veya bicimi farkliysa acik hata firlatilir.
function getCatalogSupabaseClient(): SupabaseClient {
  if (catalogClient) return catalogClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "Supabase catalog reads need NEXT_PUBLIC_SUPABASE_URL and the server-only SUPABASE_SECRET_KEY."
    );
  }
  if (!secretKey.startsWith("sb_secret_")) {
    throw new Error("SUPABASE_SECRET_KEY must be a Supabase secret API key (sb_secret_...).");
  }

  catalogClient = createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: { timeout: SUPABASE_REQUEST_TIMEOUT_MS },
  });
  return catalogClient;
}

// Ortak memo: taze kayit hemen doner; suresi dolmus kayit da hemen doner ve arka planda tek
// yenileme baslar (stale-while-revalidate); kayit yoksa yenileme beklenir, basarisizsa hata firlatilir.
// Basarisiz yenilemede eldeki bayat kayit STALE_RETRY_MS daha sunulur (stale-on-error).
async function readThroughMemo<T>(
  cache: Map<string, MemoEntry<T>>,
  inFlight: Map<string, Promise<T>>,
  key: string,
  maxEntries: number,
  label: string,
  load: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // Single-flight: es zamanli cache miss'lerde tek cekis calisir, digerleri ayni sonucu bekler.
  let refresh = inFlight.get(key);
  if (!refresh) {
    const pending = load().then((data) => {
      if (!cache.has(key) && cache.size >= maxEntries) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) cache.delete(oldestKey);
      }
      cache.set(key, { data, expiresAt: Date.now() + SERVER_CACHE_TTL_MS });
      return data;
    });
    refresh = pending;
    inFlight.set(key, pending);
    pending
      .catch((error) => {
        const stale = cache.get(key);
        if (stale) {
          console.error(`${label} refresh failed; serving stale cached data:`, error);
          stale.expiresAt = Date.now() + STALE_RETRY_MS;
        }
      })
      .finally(() => {
        if (inFlight.get(key) === pending) {
          inFlight.delete(key);
        }
      });
  }

  if (cached) {
    return cached.data;
  }
  return refresh;
}

function normalizeText(value: string | null, fallback = "") {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function normalizeStringList(value: string[] | null) {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function normalizeUnknownStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "string") return [];
    const normalized = item.trim();
    return normalized ? [normalized] : [];
  });
}

function normalizeSourceQuotes(value: unknown): ProgramSourceQuote[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const quote = item as Record<string, unknown>;
    const url = typeof quote.url === "string" ? quote.url.trim() : "";
    const text = typeof quote.quote === "string" ? quote.quote.trim() : "";
    const retrievedAt =
      typeof quote.retrieved_at === "string" ? quote.retrieved_at.trim() : "";

    if (!url || !text || !retrievedAt) return [];

    return [
      {
        url,
        quote: text,
        field_refs: normalizeUnknownStringList(quote.field_refs),
        retrieved_at: retrievedAt,
      },
    ];
  });
}

function normalizeLanguages(languages: string[] | null): ProgramLanguage[] {
  const normalized = (languages ?? []).filter((language): language is ProgramLanguage =>
    PROGRAM_LANGUAGES.has(language as ProgramLanguage)
  );

  return normalized.length > 0 ? [...new Set(normalized)] : ["en"];
}

function normalizeDurationYears(durationYears: number | null): ProgramDurationYears {
  return PROGRAM_DURATIONS.has(durationYears as ProgramDurationYears)
    ? (durationYears as ProgramDurationYears)
    : 3;
}

function normalizeLevel(level: string | null): ProgramLevel {
  return PROGRAM_LEVELS.has(level as ProgramLevel) ? (level as ProgramLevel) : "bachelor";
}

function createDepartment(row: SupabaseUniversityDepartmentRow): Department | null {
  const name = normalizeText(row.name);
  const slug = normalizeText(row.slug);

  if (!name || !slug) {
    return null;
  }

  return {
    id: row.id,
    name,
    slug,
    languages: normalizeLanguages(row.languages),
    durationYears: normalizeDurationYears(row.duration_years),
    level: normalizeLevel(row.level),
    updatedAt: latestTimestamp(row.updated_at),
  };
}

// Gecerli ISO zaman damgalarinin en yenisi; sitemap lastmod icin.
function latestTimestamp(...values: Array<string | null | undefined>): string | undefined {
  let latest: string | undefined;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!value) continue;
    const ms = new Date(value).getTime();
    if (Number.isFinite(ms) && ms > latestMs) {
      latestMs = ms;
      latest = new Date(ms).toISOString();
    }
  }
  return latest;
}

function optionalText(value: string | null): string | undefined {
  const normalized = normalizeText(value);
  return normalized || undefined;
}

function createAdmissionDetails(row: ProgramAdmissionDossierRow): ProgramAdmissionDetails | null {
  const officialProgramUrl = normalizeText(row.official_program_url);
  const rawTeachingLanguage = normalizeText(row.raw_teaching_language);

  if (!officialProgramUrl || !rawTeachingLanguage) {
    return null;
  }

  return {
    officialProgramUrl,
    officialCallUrl: optionalText(row.official_call_url),
    tuitionOrFeesLink: optionalText(row.tuition_or_fees_link),
    campus: optionalText(row.campus),
    degreeClass: optionalText(row.degree_class),
    admissionType: optionalText(row.admission_type),
    academicRequirements: optionalText(row.academic_requirements),
    languageRequirements: optionalText(row.language_requirements),
    applicationDeadlineEu: optionalText(row.application_deadline_eu),
    applicationDeadlineNonEu: optionalText(row.application_deadline_non_eu),
    requiredDocuments: normalizeUnknownStringList(row.required_documents),
    entryExamOrTest: optionalText(row.entry_exam_or_test),
    sourceQuotes: normalizeSourceQuotes(row.source_quotes),
    uncertain: normalizeUnknownStringList(row.uncertain),
    uncertaintyNotes: normalizeUnknownStringList(row.uncertainty_notes),
    rawTeachingLanguage,
  };
}

function createUniversity(row: SupabaseUniversityRow, departments: Department[]): University | null {
  const name = normalizeText(row.name);
  const city = normalizeText(row.city);
  const featuresEn = normalizeStringList(row.features_en);

  if (!Number.isFinite(row.id) || !name || !city) {
    return null;
  }

  return {
    id: row.id,
    name,
    city,
    type: normalizeText(row.type),
    fee: normalizeText(row.fee),
    image: normalizeText(row.image),
    description: normalizeText(row.description),
    description_en: normalizeText(row.description_en) || undefined,
    website: normalizeText(row.website),
    features: normalizeStringList(row.features),
    features_en: featuresEn.length > 0 ? featuresEn : undefined,
    updatedAt: latestTimestamp(row.updated_at),
    departments,
  };
}

async function fetchUniversityRows(): Promise<SupabaseUniversityRow[]> {
  const supabase = getCatalogSupabaseClient();
  const rows: SupabaseUniversityRow[] = [];

  for (let from = 0; ; from += UNIVERSITY_PAGE_SIZE) {
    const to = from + UNIVERSITY_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("universities")
      .select(UNIVERSITY_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
      .returns<SupabaseUniversityRow[]>();

    if (error) {
      throw new Error(`Failed to fetch universities from Supabase: ${error.message}`);
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < UNIVERSITY_PAGE_SIZE) {
      return rows;
    }
  }
}

async function fetchUniversityDepartmentRows(): Promise<SupabaseUniversityDepartmentRow[]> {
  const supabase = getCatalogSupabaseClient();
  const rows: SupabaseUniversityDepartmentRow[] = [];

  for (let from = 0; ; from += UNIVERSITY_DEPARTMENT_PAGE_SIZE) {
    const to = from + UNIVERSITY_DEPARTMENT_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("university_departments")
      .select(UNIVERSITY_DEPARTMENT_COLUMNS)
      .order("university_id", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .range(from, to)
      .returns<SupabaseUniversityDepartmentRow[]>();

    if (error) {
      throw new Error(`Failed to fetch university departments from Supabase: ${error.message}`);
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < UNIVERSITY_DEPARTMENT_PAGE_SIZE) {
      return rows;
    }
  }
}

// Kabul dosyasi VARLIGI: dizin icin yalnizca department_id + updated_at cekilir (agir metinler asla).
async function fetchAdmissionPresence(): Promise<Map<number, string | null>> {
  const supabase = getCatalogSupabaseClient();
  const presence = new Map<number, string | null>();

  for (let from = 0; ; from += PROGRAM_ADMISSION_DETAIL_PAGE_SIZE) {
    const to = from + PROGRAM_ADMISSION_DETAIL_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("program_admission_details")
      .select("department_id,updated_at")
      .order("department_id", { ascending: true })
      .range(from, to)
      .returns<AdmissionPresenceRow[]>();

    if (error) {
      throw new Error(`Failed to fetch program admission presence from Supabase: ${error.message}`);
    }

    const page = data ?? [];
    for (const row of page) {
      if (typeof row.department_id === "number") presence.set(row.department_id, row.updated_at ?? null);
    }

    if (page.length < PROGRAM_ADMISSION_DETAIL_PAGE_SIZE) {
      return presence;
    }
  }
}

// Resmi bolum sinifi kodu: dizinde "ayni alanda diger universiteler" eslesmesi icin gerekir.
// Uzun degree_class metni yerine program_degree_class_codes gorunumunden yalnizca kisa kodlar
// okunur (~4 KB gz; ham metin 38 KB gz olurdu). Gorunum: supabase/program_degree_class_codes.sql.
async function fetchAdmissionDegreeClasses(): Promise<Map<number, string[]>> {
  const supabase = getCatalogSupabaseClient();
  const codesByDepartment = new Map<number, string[]>();

  for (let from = 0; ; from += PROGRAM_ADMISSION_DETAIL_PAGE_SIZE) {
    const to = from + PROGRAM_ADMISSION_DETAIL_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("program_degree_class_codes")
      .select("department_id,degree_class_codes")
      .order("department_id", { ascending: true })
      .range(from, to)
      .returns<ProgramDegreeClassCodesRow[]>();

    if (error) {
      throw new Error(`Failed to fetch program degree classes from Supabase: ${error.message}`);
    }

    const page = data ?? [];
    for (const row of page) {
      if (typeof row.department_id !== "number") continue;
      const codes = extractDegreeClassCodes(row.degree_class_codes ?? undefined);
      if (codes.length > 0) codesByDepartment.set(row.department_id, codes);
    }

    if (page.length < PROGRAM_ADMISSION_DETAIL_PAGE_SIZE) {
      return codesByDepartment;
    }
  }
}

// Program sayfasi: yalnizca acilan programin kabul satiri (department_id birincil anahtar).
async function fetchProgramAdmissionDetails(
  universityId: number,
  departmentId: number
): Promise<ProgramAdmissionDetails | null> {
  const { data, error } = await getCatalogSupabaseClient()
    .from("program_admission_details")
    .select(PROGRAM_ADMISSION_DOSSIER_COLUMNS)
    .eq("university_id", universityId)
    .eq("department_id", departmentId)
    .maybeSingle<ProgramAdmissionDossierRow>();

  if (error) {
    throw new Error(`Failed to fetch program admission details from Supabase: ${error.message}`);
  }

  return data ? createAdmissionDetails(data) : null;
}

export function composeUniversitiesFromSupabaseRows(
  universityRows: SupabaseUniversityRow[],
  departmentRows: SupabaseUniversityDepartmentRow[],
  admissionDetailRows: SupabaseProgramAdmissionDetailsRow[] = [],
  admissionPresence?: Map<number, string | null>,
  admissionDegreeClasses?: Map<number, string[]>
): University[] {
  const detailsByDepartmentId = new Map<number, ProgramAdmissionDetails>();

  for (const row of admissionDetailRows) {
    const detail = createAdmissionDetails(row);
    if (detail) {
      detailsByDepartmentId.set(row.department_id, detail);
    }
  }

  const departmentsByUniversityId = new Map<number, Department[]>();

  for (const row of departmentRows) {
    const department = createDepartment(row);
    if (!department) continue;

    const admissionDetails =
      typeof row.id === "number" ? detailsByDepartmentId.get(row.id) : undefined;
    const presenceUpdatedAt =
      typeof row.id === "number" ? admissionPresence?.get(row.id) : undefined;
    const hasAdmissionDetails =
      Boolean(admissionDetails) ||
      (typeof row.id === "number" && admissionPresence?.has(row.id) === true);
    const updatedAt = latestTimestamp(department.updatedAt, presenceUpdatedAt, row.updated_at);
    // Bolum sinifi kodu compose'un DISINDA cikarilir (cagiran katman extractDegreeClassCodes
    // kullanir); compose saf kalir ve yalnizca hazir kodlari okur.
    const degreeClassCodes =
      typeof row.id === "number" ? admissionDegreeClasses?.get(row.id) : undefined;
    const baseDepartment: Department =
      degreeClassCodes && degreeClassCodes.length > 0
        ? { ...department, degreeClassCodes }
        : department;
    const enrichedDepartment: Department = admissionDetails
      ? { ...baseDepartment, admissionDetails, hasAdmissionDetails, updatedAt }
      : { ...baseDepartment, hasAdmissionDetails, updatedAt };

    const departments = departmentsByUniversityId.get(row.university_id) ?? [];
    departments.push(enrichedDepartment);
    departmentsByUniversityId.set(row.university_id, departments);
  }

  const universities: University[] = [];
  for (const row of universityRows) {
    const university = createUniversity(row, departmentsByUniversityId.get(row.id) ?? []);
    if (university) {
      universities.push(university);
    }
  }

  return universities;
}

// Hafif dizin: liste/ana sayfa/sehirler/sitemap/API/chat ve okul sayfasi icin. Agir kabul metinleri yok.
export async function getUniversitiesDirectory(): Promise<University[]> {
  return readThroughMemo(
    directoryCache,
    directoryInFlight,
    DIRECTORY_MEMO_KEY,
    1,
    "University directory",
    async () => {
      const [universityRows, departmentRows, admissionPresence, admissionDegreeClasses] =
        await Promise.all([
          fetchUniversityRows(),
          fetchUniversityDepartmentRows(),
          fetchAdmissionPresence(),
          fetchAdmissionDegreeClasses(),
        ]);
      return composeUniversitiesFromSupabaseRows(
        universityRows,
        departmentRows,
        [],
        admissionPresence,
        admissionDegreeClasses
      );
    }
  );
}

function findUniversity(directory: University[], numericId: number): University | undefined {
  return directory.find((university) => university.id === numericId);
}

// Tek okul: dizindeki kaydi (kabul dosyasi VARLIK bayraklariyla) dondurur; ayri Supabase sorgusu yok.
// Kanonik olmayan id (ör. "003") hic aranmaz. Donen nesne paylasilan dizin nesnesidir: degistirme.
export async function getUniversityById(id: string | number): Promise<University | undefined> {
  const numericId = parseCanonicalUniversityId(String(id));
  if (numericId === null) {
    return undefined;
  }

  return findUniversity(await getUniversitiesDirectory(), numericId);
}

// Tek programin kabul dosyasi: memo anahtari "okulId:programId".
async function getProgramAdmissionDetails(
  universityId: number,
  departmentId: number
): Promise<ProgramAdmissionDetails | null> {
  return readThroughMemo(
    admissionCache,
    admissionInFlight,
    `${universityId}:${departmentId}`,
    ADMISSION_MEMO_MAX_ENTRIES,
    "Program admission details",
    () => fetchProgramAdmissionDetails(universityId, departmentId)
  );
}

export interface ProgramPageData {
  /** Paylasilan dizin kaydi (degistirme). */
  university: University;
  /** Acilan programin KOPYASI; kabul dosyasi yalnizca bu nesnede. */
  department: Department;
  directory: University[];
}

// Program sayfasi ve metadata layout'u ayni veriyi paylasir: dizin + programin kendi kabul satiri.
export async function getProgramPageData(
  id: string | number,
  deptSlug: string
): Promise<ProgramPageData | undefined> {
  const numericId = parseCanonicalUniversityId(String(id));
  if (numericId === null) return undefined;

  const directory = await getUniversitiesDirectory();
  const university = findUniversity(directory, numericId);
  if (!university) return undefined;

  const listed = university.departments.find((entry) => entry.slug === deptSlug);
  if (!listed) return undefined;

  const admissionDetails =
    typeof listed.id === "number" && listed.hasAdmissionDetails === true
      ? await getProgramAdmissionDetails(university.id, listed.id)
      : null;
  const department: Department = admissionDetails
    ? { ...listed, admissionDetails, hasAdmissionDetails: true }
    : { ...listed, hasAdmissionDetails: false };

  return { university, department, directory };
}

// Istemciye giden okul verisi: agir kabul dosyasi yalnizca acilan programda; diger programlar dizindeki
// hafif kayitlar olarak kalir. Paylasilan dizin nesneleri degismez, yeni nesne dondurulur.
export function pruneUniversityForProgram(university: University, department: Department): University {
  return {
    ...university,
    departments: university.departments.map((entry) =>
      entry.slug === department.slug ? department : entry
    ),
  };
}
