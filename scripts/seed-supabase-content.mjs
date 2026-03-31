import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadTsModule } from "./utils/load-ts-module.mjs";

function loadDotEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const source = readFileSync(envPath, "utf8");
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;

    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
}

function assertNoError(step, error) {
  if (error) {
    fail(`${step}: ${error.message}`);
  }
}

loadDotEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  fail("NEXT_PUBLIC_SUPABASE_URL missing. Add it to .env.local or shell env.");
}

if (!supabaseServiceRoleKey) {
  fail("SUPABASE_SERVICE_ROLE_KEY missing. Add it to .env.local or shell env.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const dataModule = await loadTsModule("app/data.ts");
const communitiesModule = await loadTsModule("lib/community-links.ts");
const scholarshipsModule = await loadTsModule("lib/scholarships/regions.ts");

const universitiesData = dataModule.universitiesData;
const communityLinks = communitiesModule.COMMUNITY_LINKS;
const scholarshipRegions = scholarshipsModule.SCHOLARSHIP_REGIONS;
const scholarshipDefaultRegion = scholarshipsModule.SCHOLARSHIP_DEFAULT_REGION;

if (!Array.isArray(universitiesData) || universitiesData.length === 0) {
  fail("universitiesData is empty or invalid.");
}
if (!Array.isArray(communityLinks)) {
  fail("COMMUNITY_LINKS is invalid.");
}
if (!Array.isArray(scholarshipRegions) || scholarshipRegions.length === 0) {
  fail("SCHOLARSHIP_REGIONS is empty or invalid.");
}

const universityRows = universitiesData.map((uni, index) => ({
  id: uni.id,
  sort_order: index,
  name: uni.name,
  city: uni.city,
  type: uni.type,
  fee: uni.fee,
  image: uni.image,
  description: uni.description,
  description_en: uni.description_en ?? null,
  website: uni.website,
  features: Array.isArray(uni.features) ? uni.features : [],
  features_en: Array.isArray(uni.features_en) ? uni.features_en : [],
}));

const departmentRows = universitiesData.flatMap((uni) =>
  uni.departments.map((dept, index) => ({
    university_id: uni.id,
    sort_order: index,
    name: dept.name,
    slug: dept.slug,
    languages: Array.isArray(dept.languages) && dept.languages.length > 0 ? dept.languages : ["en"],
    duration_years: dept.durationYears,
    level: dept.level,
  }))
);

const communityRows = communityLinks.map((community, index) => ({
  id: community.id,
  sort_order: index,
  name: community.name,
  city: community.city,
  region: community.region,
  platform: community.platform,
  category: community.category,
  audience: community.audience,
  description: community.description,
  url: community.url,
  editorial_note: community.editorialNote ?? null,
  size_hint: community.sizeHint ?? null,
  status: community.status,
  verification_source: community.verificationSource,
  last_checked_at: community.lastCheckedAt,
}));

const scholarshipRows = scholarshipRegions.map((region, index) => ({
  region_slug: region.regionSlug,
  sort_order: index,
  region_name: region.regionName,
  is_default: region.regionSlug === scholarshipDefaultRegion,
  managing_bodies: region.managingBodies,
  current_academic_year: region.currentAcademicYear,
  application_window: region.applicationWindow,
  isee_limit: region.iseeLimit,
  ispe_limit: region.ispeLimit,
  benefits: region.benefits,
  housing_support: region.housingSupport,
  canteen_support: region.canteenSupport,
  international_student_notes: region.internationalStudentNotes,
  official_source_urls: region.officialSourceUrls,
  last_verified_at: region.lastVerifiedAt,
  status_note: region.statusNote,
  completeness: region.completeness,
}));

console.log(`[INFO] Universities: ${universityRows.length}`);
console.log(`[INFO] Departments: ${departmentRows.length}`);
console.log(`[INFO] Community links: ${communityRows.length}`);
console.log(`[INFO] Scholarship regions: ${scholarshipRows.length}`);

console.log("[STEP] Clearing university tables...");
{
  const { error: depDeleteError } = await supabase
    .from("university_departments")
    .delete()
    .gte("id", 0);
  assertNoError("delete university_departments", depDeleteError);

  const { error: uniDeleteError } = await supabase
    .from("universities")
    .delete()
    .gte("id", 0);
  assertNoError("delete universities", uniDeleteError);
}

console.log("[STEP] Inserting universities...");
{
  const { error } = await supabase
    .from("universities")
    .insert(universityRows);
  assertNoError("insert universities", error);
}

console.log("[STEP] Inserting departments...");
{
  const { error } = await supabase
    .from("university_departments")
    .insert(departmentRows);
  assertNoError("insert university_departments", error);
}

console.log("[STEP] Replacing community links...");
{
  const { error: deleteError } = await supabase
    .from("community_links")
    .delete()
    .neq("id", "");
  assertNoError("delete community_links", deleteError);

  if (communityRows.length > 0) {
    const { error: insertError } = await supabase
      .from("community_links")
      .insert(communityRows);
    assertNoError("insert community_links", insertError);
  }
}

console.log("[STEP] Replacing scholarship regions...");
{
  const { error: deleteError } = await supabase
    .from("scholarship_regions")
    .delete()
    .neq("region_slug", "");
  assertNoError("delete scholarship_regions", deleteError);

  const { error: insertError } = await supabase
    .from("scholarship_regions")
    .insert(scholarshipRows);
  assertNoError("insert scholarship_regions", insertError);
}

console.log("[OK] Supabase content sync completed.");
