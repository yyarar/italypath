import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const expertLeadsPath = path.join(root, "lib", "mentor", "expertLeads.ts");
const routePath = path.join(root, "app", "api", "expert-leads", "route.ts");
const validationPath = path.join(
  root,
  "lib",
  "mentor",
  "expertLeadValidation.ts",
);
const inboxStatePath = path.join(
  root,
  "lib",
  "mentor",
  "expertLeadInboxState.ts",
);

async function importHelpers() {
  const tempDir = await mkdtemp(path.join(tmpdir(), "expert-leads-"));

  try {
    const [expertLeadsSource, validationSource, inboxStateSource, routeSource] =
      await Promise.all([
        readFile(expertLeadsPath, "utf8"),
        readFile(validationPath, "utf8"),
        readFile(inboxStatePath, "utf8"),
        readFile(routePath, "utf8"),
      ]);
    const compilerOptions = {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
    };
    const compiledExpertLeads = ts.transpileModule(expertLeadsSource, {
      compilerOptions,
    }).outputText;
    const compiledValidation = ts
      .transpileModule(validationSource, { compilerOptions })
      .outputText.replace(
        'from "@/lib/mentor/expertLeads"',
        'from "./expertLeads.mjs"',
      );
    const compiledInboxState = ts.transpileModule(inboxStateSource, {
      compilerOptions,
    }).outputText;
    // The route runs against a stub store so no database is touched; the stub
    // answers whatever the test puts in globalThis.__expertLeadStore.
    const compiledRoute = ts
      .transpileModule(routeSource, { compilerOptions })
      .outputText.replace(
        'from "@/lib/mentor/expertLeadValidation"',
        'from "./expertLeadValidation.mjs"',
      )
      .replace('from "@/lib/mentor/expertLeads.server"', 'from "./expertLeads.server.mjs"');
    const storeStub =
      "export async function storeExpertLead(value) {\n" +
      "  return globalThis.__expertLeadStore(value);\n" +
      "}\n";

    await Promise.all([
      writeFile(
        path.join(tempDir, "expertLeads.mjs"),
        compiledExpertLeads,
        "utf8",
      ),
      writeFile(
        path.join(tempDir, "expertLeadValidation.mjs"),
        compiledValidation,
        "utf8",
      ),
      writeFile(
        path.join(tempDir, "expertLeadInboxState.mjs"),
        compiledInboxState,
        "utf8",
      ),
      writeFile(path.join(tempDir, "route.mjs"), compiledRoute, "utf8"),
      writeFile(path.join(tempDir, "expertLeads.server.mjs"), storeStub, "utf8"),
    ]);

    const [expertLeads, validation, inboxState, route] = await Promise.all([
      import(`file://${tempDir}/expertLeads.mjs`),
      import(`file://${tempDir}/expertLeadValidation.mjs`),
      import(`file://${tempDir}/expertLeadInboxState.mjs`),
      import(`file://${tempDir}/route.mjs`),
    ]);
    return {
      ...expertLeads,
      ...validation,
      ...inboxState,
      postExpertLead: route.POST,
      expertLeadRouteMaxDuration: route.maxDuration,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

const {
  EXPERT_FIELDS,
  EXPERT_LEAD_INSERT_TIMEOUT_MS,
  EXPERT_LEAD_REQUEST_TIMEOUT_MS,
  EXPERT_LEAD_STATUSES,
  EXPERT_STUDY_LEVELS,
  buildTargetIntakeOptions,
  buildWhatsAppHref,
  expertLeadRouteMaxDuration,
  fillExpertLeadTemplate,
  normalizeWhatsAppPhone,
  postExpertLead,
  DEFAULT_EXPERT_LEAD_FILTER,
  EXPERT_LEAD_FILTERS,
  appendExpertLeads,
  expertLeadCursorFilter,
  filterExpertLeads,
  removeExpertLead,
  replaceExpertLead,
  resolveExpertLeadSelection,
  splitExpertLeadPage,
  transitionExpertLeadIdentity,
  validateExpertLeadPayload,
} = await importHelpers();

assert.deepEqual(EXPERT_LEAD_STATUSES, ["new", "contacted", "completed", "suspected"]);
assert.deepEqual(EXPERT_STUDY_LEVELS, ["bachelor", "master", "undecided"]);
assert.equal(EXPERT_FIELDS.at(-1), "undecided");
assert.deepEqual(buildTargetIntakeOptions(new Date("2026-08-10T12:00:00Z")), [
  "2026-2027",
  "2027-2028",
  "2028-2029",
  "undecided",
]);
assert.equal(normalizeWhatsAppPhone("+90 (532) 123-45-67"), "+905321234567");
assert.equal(normalizeWhatsAppPhone("0532 123 45 67"), null);
assert.equal(
  buildWhatsAppHref("+905321234567"),
  "https://wa.me/905321234567",
);

const clock = new Date("2026-08-10T12:00:00Z");
const validPayload = {
  submissionId: "10000000-0000-4000-8000-000000000001",
  fullName: "  Ada Öğrenci  ",
  whatsappPhone: "+90 532 123 45 67",
  studyLevel: "bachelor",
  fieldOfInterest: "engineering-tech",
  targetIntake: "2027-2028",
  helpRequest: "  Politecnico başvuru yol haritamı netleştirmek istiyorum.  ",
  website: "",
};

const valid = validateExpertLeadPayload(validPayload, clock);
assert.equal(valid.kind, "valid");
if (valid.kind !== "valid") {
  assert.fail("valid expert lead payload was rejected");
}
assert.equal(valid.value.fullName, "Ada Öğrenci");
assert.equal(valid.value.whatsappPhone, "+905321234567");
assert.equal(
  valid.value.helpRequest,
  "Politecnico başvuru yol haritamı netleştirmek istiyorum.",
);

assert.equal(
  validateExpertLeadPayload(
    { ...validPayload, website: "https://spam.example" },
    clock,
  ).kind,
  "honeypot",
);

const invalidCases = [
  ["submissionId", { submissionId: "not-a-uuid" }],
  ["fullName", { fullName: "A" }],
  ["whatsappPhone", { whatsappPhone: "0532 123 45 67" }],
  ["studyLevel", { studyLevel: "doctorate" }],
  ["fieldOfInterest", { fieldOfInterest: "other" }],
  ["targetIntake", { targetIntake: "2027-2029" }],
  ["targetIntake", { targetIntake: "2031-2032" }],
  ["helpRequest", { helpRequest: "too short" }],
  ["helpRequest", { helpRequest: "a".repeat(3001) }],
];

for (const [field, changes] of invalidCases) {
  const result = validateExpertLeadPayload({ ...validPayload, ...changes }, clock);
  assert.equal(result.kind, "invalid", `${field} must be rejected`);
  if (result.kind !== "invalid") {
    assert.fail(`${field} did not return field errors`);
  }
  assert.ok(field in result.errors, `${field} error key is missing`);
}

// Lengths are counted in code points so the form agrees with Postgres char_length.
assert.equal(
  validateExpertLeadPayload({ ...validPayload, fullName: "😀" }, clock).kind,
  "invalid",
  "a one-code-point name must be too short, as the database would reject it",
);
assert.equal(
  validateExpertLeadPayload({ ...validPayload, fullName: `Al${"😀".repeat(118)}` }, clock).kind,
  "valid",
  "a 120-code-point name is within the 120-character database limit",
);
assert.equal(
  validateExpertLeadPayload({ ...validPayload, fullName: `Al${"😀".repeat(119)}` }, clock).errors
    ?.fullName,
  "too_long",
  "a 121-code-point name is over the database limit",
);
// "Yardım 🙏🙏" is 10 UTF-16 units but 8 code points: Postgres would reject it.
assert.equal(
  validateExpertLeadPayload({ ...validPayload, helpRequest: "Yardım 🙏🙏" }, clock).errors
    ?.helpRequest,
  "too_short",
  "a short request padded with emoji must be too short, as the database would reject it",
);
assert.equal(
  validateExpertLeadPayload({ ...validPayload, helpRequest: "Yardım lazım 🙏🙏" }, clock).kind,
  "valid",
  "a ten-code-point request with emoji is accepted",
);
assert.equal(
  validateExpertLeadPayload(
    { ...validPayload, helpRequest: "Bilmiyorum 🤷‍♀️ nereden başlamalıyım 👩‍💻" },
    clock,
  ).kind,
  "valid",
  "emoji sequences joined with U+200D stay allowed in the help request",
);

// A name needs at least two letters in any script.
for (const [fullName, expected] of [
  ["😀😀", "too_few_letters"],
  ["12", "too_few_letters"],
  ["A.", "too_few_letters"],
  ["Li", null],
  ["Мария", null],
  ["محمد", null],
]) {
  const result = validateExpertLeadPayload({ ...validPayload, fullName }, clock);
  assert.equal(
    result.kind === "invalid" ? result.errors.fullName ?? null : null,
    expected,
    `${JSON.stringify(fullName)} name letter rule`,
  );
}
assert.equal(
  validateExpertLeadPayload({ ...validPayload, helpRequest: "😀".repeat(3000) }, clock).kind,
  "valid",
  "3000 emoji are within the 3000-character database limit",
);

// Characters Postgres rejects, or that break a name, fail validation instead of the insert.
for (const [field, value] of [
  ["helpRequest", "Başvuru yol haritası\u0000 istiyorum lütfen"],
  ["helpRequest", "Başvuru yol haritası \ud800 istiyorum lütfen"],
  ["fullName", "Ada\nÖğrenci"],
  ["fullName", "Ada\u0007Öğrenci"],
  ["fullName", "Ada\u0085Öğrenci"],
  ["fullName", "Ada \u202eicnerĞÖ"],
  ["fullName", "Ada\u2066Öğrenci\u2069"],
  ["fullName", "Ada\u200bÖğrenci"],
  ["fullName", "Ada\u200dÖğrenci"],
  ["fullName", "Ada\u200fÖğrenci"],
  ["fullName", "Ada\u2060Öğrenci"],
  ["fullName", "Ada\ufeffÖğrenci"],
  ["helpRequest", "Başvuru yol haritası\tistiyorum lütfen"],
  ["helpRequest", "Başvuru yol haritası\r\nistiyorum lütfen"],
  ["helpRequest", "Başvuru yol haritası\u009b istiyorum lütfen"],
  ["helpRequest", "Başvuru \u202eyol haritası istiyorum lütfen"],
  ["helpRequest", "Başvuru yol\u200b haritası istiyorum lütfen"],
  ["helpRequest", "Başvuru yol\ufeff haritası istiyorum lütfen"],
]) {
  const result = validateExpertLeadPayload({ ...validPayload, [field]: value }, clock);
  assert.equal(result.kind, "invalid", `${JSON.stringify(value)} must be rejected in ${field}`);
  if (result.kind !== "invalid") assert.fail(`${field} did not return field errors`);
  assert.equal(result.errors[field], "invalid_characters", `${field} must report invalid_characters`);
}
assert.equal(
  validateExpertLeadPayload(
    { ...validPayload, helpRequest: "Birinci satır\nİkinci satır\n\nve son satır" },
    clock,
  ).kind,
  "valid",
  "line breaks stay allowed in the help request",
);

const rows = [
  {
    id: "lead-new",
    submission_id: "10000000-0000-4000-8000-000000000010",
    full_name: "New Lead",
    whatsapp_phone: "+905321234560",
    study_level: "bachelor",
    field_of_interest: "engineering-tech",
    target_intake: "2027-2028",
    help_request: "I need a clear application roadmap.",
    status: "new",
    internal_note: "",
    created_at: "2026-08-10T12:00:00.000Z",
    updated_at: "2026-08-10T12:00:00.000Z",
  },
  {
    id: "lead-completed-a",
    submission_id: "10000000-0000-4000-8000-000000000011",
    full_name: "Completed Lead A",
    whatsapp_phone: "+905321234561",
    study_level: "master",
    field_of_interest: "business-economics",
    target_intake: "undecided",
    help_request: "I need help choosing a suitable program.",
    status: "completed",
    internal_note: "Done",
    created_at: "2026-08-10T11:00:00.000Z",
    updated_at: "2026-08-10T11:00:00.000Z",
  },
  {
    id: "lead-completed-b",
    submission_id: "10000000-0000-4000-8000-000000000012",
    full_name: "Completed Lead B",
    whatsapp_phone: "+905321234562",
    study_level: "undecided",
    field_of_interest: "undecided",
    target_intake: "2028-2029",
    help_request: "I need support deciding how to begin.",
    status: "completed",
    internal_note: "",
    created_at: "2026-08-10T10:00:00.000Z",
    updated_at: "2026-08-10T10:00:00.000Z",
  },
];
const contactedRow = {
  ...rows[0],
  status: "contacted",
  updated_at: "2026-08-10T12:05:00.000Z",
};

const suspectedRow = {
  ...rows[0],
  id: "lead-suspected",
  submission_id: "10000000-0000-4000-8000-000000000013",
  status: "suspected",
  created_at: "2026-08-10T09:00:00.000Z",
};
assert.deepEqual(filterExpertLeads(rows, "new").map((row) => row.id), ["lead-new"]);
assert.equal(DEFAULT_EXPERT_LEAD_FILTER, "new", "the inbox opens on new leads");
assert.deepEqual(EXPERT_LEAD_FILTERS, ["new", "contacted", "completed", "all", "suspected"]);
assert.deepEqual(
  filterExpertLeads([...rows, suspectedRow], "all").map((row) => row.id),
  rows.map((row) => row.id),
  "all leaves suspected leads out",
);
assert.deepEqual(
  filterExpertLeads([...rows, suspectedRow], "suspected").map((row) => row.id),
  ["lead-suspected"],
);
assert.deepEqual(splitExpertLeadPage(rows, 2), { rows: rows.slice(0, 2), hasMore: true });
assert.deepEqual(splitExpertLeadPage(rows, 3), { rows, hasMore: false });
assert.deepEqual(
  appendExpertLeads(rows.slice(0, 2), rows.slice(1)).map((row) => row.id),
  rows.map((row) => row.id),
  "a page overlapping the loaded rows is not duplicated",
);
assert.equal(
  expertLeadCursorFilter({ created_at: "2026-08-10T11:00:00.123456+00:00", id: "lead-x" }),
  'created_at.lt."2026-08-10T11:00:00.123456+00:00",and(created_at.eq."2026-08-10T11:00:00.123456+00:00",id.lt."lead-x")',
);
assert.equal(replaceExpertLead(rows, contactedRow)[0].status, "contacted");
assert.equal(removeExpertLead(rows, "lead-new").some((row) => row.id === "lead-new"), false);
assert.equal(resolveExpertLeadSelection(rows, "missing", "all"), rows[0].id);
assert.equal(resolveExpertLeadSelection(rows, "lead-new", "contacted"), null);

const initial = {
  ownerId: "owner-a",
  generation: 4,
  authorized: true,
};
assert.deepEqual(transitionExpertLeadIdentity(initial, undefined), {
  ownerId: "owner-a",
  generation: 5,
  authorized: null,
  ready: false,
  changed: true,
});
assert.equal(transitionExpertLeadIdentity(initial, "owner-b").ownerId, "owner-b");

// Operator copy: a name that contains String.replace patterns is shown literally (#51).
assert.equal(
  fillExpertLeadTemplate("Permanently delete the request from {name}?", {
    name: "Ada $& $1 $$ $<n> $' Öğrenci",
  }),
  "Permanently delete the request from Ada $& $1 $$ $<n> $' Öğrenci?",
  "replacement patterns inside a name must appear literally in the confirm text",
);
assert.equal(fillExpertLeadTemplate("YENİ TALEP: {count}", { count: 12 }), "YENİ TALEP: 12");
assert.equal(
  fillExpertLeadTemplate("{a} ve {a}", { a: "x" }),
  "x ve x",
  "every slot with the same key is filled",
);

// Time budgets (#51): the server insert gives up before the form does, and the
// route's function cap leaves room for the insert to answer.
assert.equal(EXPERT_LEAD_REQUEST_TIMEOUT_MS, 15_000);
assert.ok(
  EXPERT_LEAD_INSERT_TIMEOUT_MS < EXPERT_LEAD_REQUEST_TIMEOUT_MS,
  "the server insert timeout must be shorter than the form's wait",
);
assert.ok(
  Number.isInteger(expertLeadRouteMaxDuration) &&
    expertLeadRouteMaxDuration * 1000 > EXPERT_LEAD_INSERT_TIMEOUT_MS &&
    expertLeadRouteMaxDuration <= 60,
  "maxDuration must cover the insert timeout and stay within the Vercel Hobby limit",
);

// API route (#47, #51), against a stub store: no database is touched.
const storeCalls = [];
let storeResult = { kind: "created" };
globalThis.__expertLeadStore = async (value) => {
  storeCalls.push(value);
  if (storeResult instanceof Error) throw storeResult;
  return storeResult;
};

async function postLead(body, headers = { "content-type": "application/json" }) {
  const response = await postExpertLead(
    new Request("https://italypath.app/api/expert-leads", { method: "POST", headers, body }),
  );
  return {
    status: response.status,
    contentType: response.headers.get("content-type"),
    cacheControl: response.headers.get("cache-control"),
    text: await response.text(),
  };
}

async function quietly(run) {
  const originalError = console.error;
  console.error = () => {};
  try {
    return await run();
  } finally {
    console.error = originalError;
  }
}

const stored = await postLead(JSON.stringify(validPayload));
assert.equal(stored.status, 200);
assert.deepEqual(JSON.parse(stored.text), { ok: true });
assert.match(stored.contentType, /application\/json/);
assert.equal(storeCalls.length, 1, "a valid lead reaches the store once");

const trapped = await postLead(
  JSON.stringify({ ...validPayload, website: "https://spam.example" }),
);
assert.deepEqual(
  trapped,
  stored,
  "a honeypot hit must be indistinguishable from a stored lead (status, headers, body)",
);
assert.equal(storeCalls.length, 1, "a honeypot hit must not reach the store");

const trappedGarbage = await postLead(JSON.stringify({ website: "x" }));
assert.deepEqual(
  trappedGarbage,
  stored,
  "a honeypot hit with an otherwise invalid payload still looks accepted",
);
assert.equal(storeCalls.length, 1);

storeResult = { kind: "duplicate" };
const retried = await postLead(JSON.stringify(validPayload));
assert.deepEqual(retried, stored, "a retry of a stored lead looks like the first submission");

storeResult = { kind: "rate_limited" };
const busy = await postLead(JSON.stringify(validPayload));
assert.equal(busy.status, 429);
assert.deepEqual(JSON.parse(busy.text), { ok: false, error: "rate_limited" });

storeResult = { kind: "timed_out" };
const timedOut = await quietly(() => postLead(JSON.stringify(validPayload)));
assert.equal(timedOut.status, 503, "a database timeout is a 503");
assert.deepEqual(JSON.parse(timedOut.text), { ok: false, error: "timeout" });
assert.match(timedOut.contentType, /application\/json/);

storeResult = new Error("expert_lead_insert_failed:XX000");
const failed = await quietly(() => postLead(JSON.stringify(validPayload)));
assert.equal(failed.status, 503);
assert.deepEqual(JSON.parse(failed.text), { ok: false, error: "temporarily_unavailable" });

storeResult = { kind: "created" };
const callsBeforeRefusals = storeCalls.length;

// A browser submitting the form without JavaScript (method="post", no action)
// sends a URL-encoded body: refused with a JSON 4xx, never stored, never parsed.
const formEncoded = await postLead(
  new URLSearchParams({ fullName: "Ada Öğrenci", whatsappPhone: "+905321234567" }).toString(),
  { "content-type": "application/x-www-form-urlencoded" },
);
assert.ok(
  formEncoded.status >= 400 && formEncoded.status < 500,
  `a form-encoded body must be refused with 4xx, got ${formEncoded.status}`,
);
assert.match(formEncoded.contentType, /application\/json/);
assert.equal(JSON.parse(formEncoded.text).ok, false);

const plainText = await postLead("hello", {});
assert.ok(plainText.status >= 400 && plainText.status < 500, "a text body must be refused with 4xx");
assert.equal(JSON.parse(plainText.text).ok, false);

const brokenJson = await postLead("{not json");
assert.equal(brokenJson.status, 400);
assert.deepEqual(JSON.parse(brokenJson.text), { ok: false, error: "invalid_json" });

const crossSite = await postLead(JSON.stringify(validPayload), {
  "content-type": "application/json",
  origin: "https://evil.example",
  host: "italypath.app",
});
assert.equal(crossSite.status, 403, "a foreign Origin is refused");
assert.equal(storeCalls.length, callsBeforeRefusals, "refused requests never reach the store");
for (const refused of [formEncoded, plainText, brokenJson, crossSite]) {
  assert.equal(refused.cacheControl, "no-store, max-age=0");
}

delete globalThis.__expertLeadStore;

console.log("Expert lead domain validation tests passed.");
