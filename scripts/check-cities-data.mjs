import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import ts from "typescript";

const paths = {
  cityData: new URL("../lib/cities/data.ts", import.meta.url),
  cityExplorer: new URL("../components/cities/CityGuidesExplorer.tsx", import.meta.url),
  cityPage: new URL("../app/cities/page.tsx", import.meta.url),
  costTiers: new URL("../lib/cities/costTiers.ts", import.meta.url),
  hub: new URL("../lib/hub/recommendations.ts", import.meta.url),
  normalization: new URL("../lib/cities/normalization.ts", import.meta.url),
  scholarships: new URL("../lib/scholarships/regions.ts", import.meta.url),
  tieredData: new URL("../lib/cities/tieredData.ts", import.meta.url),
  translations: new URL("../lib/translations.ts", import.meta.url),
};

const sources = Object.fromEntries(
  Object.entries(paths).map(([name, path]) => [name, readFileSync(path, "utf8")])
);

function loadTypeScriptModule(moduleSource, filename, imports = {}) {
  const transpiled = ts.transpileModule(moduleSource, {
    fileName: filename,
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });

  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  assert.equal(errors.length, 0, `Could not transpile ${filename}.`);

  const runtimeModule = { exports: {} };
  const localRequire = (specifier) => {
    if (Object.prototype.hasOwnProperty.call(imports, specifier)) {
      return imports[specifier];
    }
    throw new Error(`${filename} requested unsupported runtime import ${specifier}.`);
  };
  const execute = new Function(
    "require",
    "module",
    "exports",
    `"use strict";\n${transpiled.outputText}\n//# sourceURL=${filename}`
  );
  execute(localRequire, runtimeModule, runtimeModule.exports);
  return runtimeModule.exports;
}

const costRuntime = loadTypeScriptModule(sources.costTiers, "lib/cities/costTiers.ts");
const tieredRuntime = loadTypeScriptModule(sources.tieredData, "lib/cities/tieredData.ts");
const cityRuntime = loadTypeScriptModule(sources.cityData, "lib/cities/data.ts", {
  "@/lib/cities/costTiers": costRuntime,
  "@/lib/cities/tieredData": tieredRuntime,
});
const normalizationRuntime = loadTypeScriptModule(
  sources.normalization,
  "lib/cities/normalization.ts"
);
const scholarshipRuntime = loadTypeScriptModule(
  sources.scholarships,
  "lib/scholarships/regions.ts"
);
const hubRuntime = loadTypeScriptModule(sources.hub, "lib/hub/recommendations.ts", {
  "@/lib/cities/data": cityRuntime,
  "@/lib/scholarships/regions": scholarshipRuntime,
});
const translationRuntime = loadTypeScriptModule(
  sources.translations,
  "lib/translations.ts"
);

function assertIncludes(haystack, needle, message) {
  assert.ok(haystack.includes(needle), message);
}

function assertNotIncludes(haystack, needle, message) {
  assert.ok(!haystack.includes(needle), message);
}

function assertNonEmptyString(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string.`);
  assert.ok(value.trim().length > 0, `${label} must not be blank.`);
}

function assertStringArray(value, label, { nonEmpty = false } = {}) {
  assert.ok(Array.isArray(value), `${label} must be an array.`);
  if (nonEmpty) assert.ok(value.length > 0, `${label} must not be empty.`);
  value.forEach((item, index) => assertNonEmptyString(item, `${label}[${index}]`));
}

function assertIsoDate(value, label) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${label} must use YYYY-MM-DD.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  assert.ok(!Number.isNaN(parsed.valueOf()), `${label} must be a real date.`);
  assert.equal(parsed.toISOString().slice(0, 10), value, `${label} must be a real date.`);
}

function assertExactKeys(value, requiredKeys, optionalKeys, label) {
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  for (const key of requiredKeys) {
    assert.ok(Object.prototype.hasOwnProperty.call(value, key), `${label} is missing ${key}.`);
  }
  for (const key of Object.keys(value)) {
    assert.ok(allowed.has(key), `${label} contains unexpected field ${key}.`);
  }
}

const expectedTieredSlugs = [
  "aosta",
  "bergamo",
  "brescia",
  "bolzano",
  "castellanza",
  "udine",
  "perugia",
  "camerino",
  "urbino",
  "cagliari",
  "sassari",
  "palermo",
  "catania",
  "messina",
  "reggio-calabria",
  "casamassima",
  "lecce",
  "pescara",
  "cassino",
  "viterbo",
  "teramo",
  "cenova",
  "ferrara",
  "macerata",
  "pollenzo",
];

const requiredTieredFields = [
  "slug",
  "name",
  "nameEn",
  "cityNameIt",
  "altNames",
  "region",
  "placeHierarchy",
  "costTier",
  "costCluster",
  "costTierRationale",
  "historyShort",
  "historyShortEn",
  "historySourceTitle",
  "historySourceUrl",
  "transportDetails",
  "transportDetailsEn",
  "climateAndVibe",
  "climateAndVibeEn",
  "transportSourceUrls",
  "sourceRetrievedAt",
  "sourceConfidence",
  "reviewStatus",
  "reviewPriority",
  "uncertain",
];

const allowedTiers = new Set(["budget", "balanced", "high"]);
const allowedClusters = new Set([
  "regional-capital",
  "provincial-student-city",
  "micro-campus-town",
  "tourism-heavy",
  "island-premium",
  "alpine-premium",
  "metro-satellite",
]);
const allowedHierarchies = new Set(["city", "hamlet", "satellite-town", "dual-city"]);
const allowedConfidence = new Set(["official", "mixed", "wikipedia-only"]);

const officialTransportHosts = new Set([
  "aosta.arriva.it",
  "atpsassari.it",
  "comune.reggio-calabria.it",
  "eds.unicas.it",
  "en.unich.it",
  "international.unicam.it",
  "isufi.unisalento.it",
  "old.atpsassari.it",
  "pressevda.regione.vda.it",
  "trasparenza.unisalento.it",
  "trasportourbanoteramo.it",
  "unige.it",
  "www.adriabus.eu",
  "www.amat.pa.it",
  "www.amt.genova.it",
  "www.amts.ct.it",
  "www.apmgroup.it",
  "www.arrivaudine.it",
  "www.arstspa.info",
  "www.atam.rc.it",
  "www.atb.bergamo.it",
  "www.atmmessinaspa.it",
  "www.atpsassari.it",
  "www.bluferries.it",
  "www.blujetlines.it",
  "www.brescia.eu",
  "www.bresciamobilita.it",
  "www.circumetnea.it",
  "www.comune.bolzano.bz.it",
  "www.comune.bra.cn.it",
  "www.comune.casamassima.ba.it",
  "www.comune.cassino.fr.it",
  "www.comune.castellanza.va.it",
  "www.comune.lecce.it",
  "www.comune.palermo.it",
  "www.comune.perugia.it",
  "www.comune.pescara.it",
  "www.contram.it",
  "www.ctmcagliari.it",
  "www.francigena.vt.it",
  "www.fsbusitalia.it",
  "www.liuc.it",
  "www.lum.it",
  "www.minimetrospa.it",
  "www.sasabz.it",
  "www.sgmlecce.it",
  "www.tper.it",
  "www.trenitalia.com",
  "www.tuabruzzo.it",
  "www.unica.it",
  "www.unicam.it",
  "www.unicas.it",
  "www.unich.it",
  "www.unict.it",
  "www.unife.it",
  "www.unimc.it",
  "www.unime.it",
  "www.unipa.it",
  "www.unipg.it",
  "www.unirc.it",
  "www.unisg.it",
  "www.uniss.it",
  "www.unite.it",
  "www.unitus.it",
  "www.uniud.it",
  "www.uniurb.it",
]);

const records = tieredRuntime.TIERED_CITY_RECORDS;
assert.ok(Array.isArray(records), "TIERED_CITY_RECORDS must export an array.");
assert.equal(records.length, 25, "The researched tiered catalog must contain exactly 25 records.");
assert.equal(new Set(records.map((record) => record.slug)).size, records.length, "Tiered slugs must be unique.");
assert.deepEqual(
  records.map((record) => record.slug).sort(),
  [...expectedTieredSlugs].sort(),
  "Tiered records must use the exact approved slug set."
);

for (const record of records) {
  const label = `tiered city ${record.slug ?? "<missing-slug>"}`;
  assertExactKeys(record, requiredTieredFields, ["primaryStudentBase"], label);
  assert.match(record.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${label} has an invalid slug.`);

  for (const field of [
    "name",
    "nameEn",
    "cityNameIt",
    "region",
    "costTierRationale",
    "historyShort",
    "historyShortEn",
    "historySourceTitle",
    "transportDetails",
    "transportDetailsEn",
    "climateAndVibe",
    "climateAndVibeEn",
  ]) {
    assertNonEmptyString(record[field], `${label}.${field}`);
  }
  if (record.primaryStudentBase !== undefined) {
    assertNonEmptyString(record.primaryStudentBase, `${label}.primaryStudentBase`);
  }

  assertStringArray(record.altNames, `${label}.altNames`, { nonEmpty: true });
  assertStringArray(record.transportSourceUrls, `${label}.transportSourceUrls`, { nonEmpty: true });
  assertStringArray(record.reviewPriority, `${label}.reviewPriority`);
  assertStringArray(record.uncertain, `${label}.uncertain`);
  assert.ok(allowedTiers.has(record.costTier), `${label} has an unsupported cost tier.`);
  assert.ok(allowedClusters.has(record.costCluster), `${label} has an unsupported cost cluster.`);
  assert.ok(allowedHierarchies.has(record.placeHierarchy), `${label} has an unsupported hierarchy.`);
  assert.ok(allowedConfidence.has(record.sourceConfidence), `${label} has an unsupported confidence.`);
  assert.equal(record.reviewStatus, "source-checked", `${label} must be source checked.`);
  assertIsoDate(record.sourceRetrievedAt, `${label}.sourceRetrievedAt`);

  const historyUrl = new URL(record.historySourceUrl);
  assert.equal(historyUrl.protocol, "https:", `${label} history source must use HTTPS.`);
  assert.ok(
    historyUrl.hostname === "en.wikipedia.org" || historyUrl.hostname === "it.wikipedia.org",
    `${label} history source must use a direct Wikipedia host.`
  );
  assert.match(historyUrl.pathname, /^\/wiki\/[^/]+$/, `${label} history source must link to an article.`);
  assert.equal(historyUrl.search, "", `${label} history source must not be a search or redirect URL.`);
  assert.equal(historyUrl.hash, "", `${label} history source must link to the article itself.`);

  for (const sourceUrl of record.transportSourceUrls) {
    const transportUrl = new URL(sourceUrl);
    assert.equal(transportUrl.protocol, "https:", `${label} transport sources must use HTTPS.`);
    assert.ok(
      !transportUrl.hostname.endsWith("wikipedia.org") &&
        !transportUrl.hostname.endsWith("numbeo.com"),
      `${label} transport sources cannot use Wikipedia or Numbeo.`
    );
    assert.ok(
      officialTransportHosts.has(transportUrl.hostname),
      `${label} uses unreviewed transport host ${transportUrl.hostname}.`
    );
  }
}

const expectedBands = {
  budget: {
    costRating: 2,
    rentAverage: "Özel oda: 250€ - 400€ | Küçük stüdyo: 450€ - 650€",
    rentAverageEn: "Private room: €250 - €400 | Small studio: €450 - €650",
    livingExpenses: "Kira hariç aylık temel gider: 220€ - 300€",
    livingExpensesEn: "Monthly essentials excluding rent: €220 - €300",
    transportCost: "Öğrenci ulaşımı aylık karşılık: 20€ - 30€",
    transportCostEn: "Monthly student transport equivalent: €20 - €30",
  },
  balanced: {
    costRating: 3,
    rentAverage: "Özel oda: 350€ - 550€ | Küçük stüdyo: 600€ - 850€",
    rentAverageEn: "Private room: €350 - €550 | Small studio: €600 - €850",
    livingExpenses: "Kira hariç aylık temel gider: 260€ - 360€",
    livingExpensesEn: "Monthly essentials excluding rent: €260 - €360",
    transportCost: "Öğrenci ulaşımı aylık karşılık: 25€ - 40€",
    transportCostEn: "Monthly student transport equivalent: €25 - €40",
  },
  high: {
    costRating: 4,
    rentAverage: "Özel oda: 500€ - 750€ | Küçük stüdyo: 850€ - 1.250€",
    rentAverageEn: "Private room: €500 - €750 | Small studio: €850 - €1,250",
    livingExpenses: "Kira hariç aylık temel gider: 320€ - 450€",
    livingExpensesEn: "Monthly essentials excluding rent: €320 - €450",
    transportCost: "Öğrenci ulaşımı aylık karşılık: 35€ - 55€",
    transportCostEn: "Monthly student transport equivalent: €35 - €55",
  },
};

assert.equal(costRuntime.CITY_COST_MODEL_VERSION, "2026-08");
assert.deepEqual(costRuntime.CITY_COST_TIERS, expectedBands, "Tier bands changed unexpectedly.");
assert.ok(Object.isFrozen(costRuntime.CITY_COST_TIERS), "Tier catalog must be frozen.");
for (const [tier, expected] of Object.entries(expectedBands)) {
  const band = costRuntime.CITY_COST_TIERS[tier];
  assert.ok(Object.isFrozen(band), `${tier} tier must be frozen.`);
  assert.throws(() => {
    band.costRating = 5;
  }, TypeError, `${tier} tier must reject runtime mutation.`);

  const record = records.find((candidate) => candidate.costTier === tier);
  assert.ok(record, `${tier} needs at least one materializer fixture.`);
  const materialized = costRuntime.materializeTieredCity(record);
  for (const [field, value] of Object.entries(expected)) {
    assert.equal(materialized[field], value, `${tier} materializer produced the wrong ${field}.`);
  }
  assert.equal(materialized.slug, record.slug);
  assert.equal(materialized.name, record.name);
  assert.equal(materialized.contentStatus, "researched");
  assert.equal(materialized.costModel, "italypath-tier");
  assert.equal(materialized.costModelVersion, "2026-08");
}

const tieredSlugSet = new Set(expectedTieredSlugs);
assert.equal(cityRuntime.CURATED_CITIES.length, 42, "Combined catalog must contain 17 legacy and 25 tiered cities.");
assert.equal(new Set(cityRuntime.CURATED_CITIES.map((city) => city.slug)).size, 42, "Combined catalog slugs must be unique.");
for (const record of records) {
  const materialized = costRuntime.materializeTieredCity(record);
  const combined = cityRuntime.CURATED_CITIES.find((city) => city.slug === record.slug);
  assert.deepEqual(combined, materialized, `${record.slug} must enter the combined catalog through the materializer.`);
}

const expectedLegacySlugs = [
  "milano",
  "roma",
  "bologna",
  "torino",
  "floransa",
  "venedik",
  "verona",
  "padova",
  "parma",
  "pisa",
  "siena",
  "pavia",
  "trento",
  "trieste",
  "bari",
  "ancona",
  "napoli",
];
const legacyCities = cityRuntime.CURATED_CITIES.filter((city) => !tieredSlugSet.has(city.slug));
assert.deepEqual(legacyCities.map((city) => city.slug), expectedLegacySlugs, "The exact 17 legacy records must be preserved.");

const legacyNumbeoExpectations = {
  milano: ["Milan", "2026-05-23", "1 odalı daire: merkezde ~1.468,75€ | merkez dışında ~1.045,17€", "Ucuz restoran: ~20€ | Cappuccino: ~1,91€ | 85 m² temel faturalar: ~220,21€", "Tek yön şehir içi bilet: ~2,20€"],
  roma: ["Rome", "2026-05-21", "1 odalı daire: merkezde ~1.076,92€ | merkez dışında ~778,57€", "Ucuz restoran: ~15€ | Cappuccino: ~1,94€ | 85 m² temel faturalar: ~183,63€", "Tek yön şehir içi bilet: ~1,50€"],
  bologna: ["Bologna", "2026-05-11", "1 odalı daire: merkezde ~966,33€ | merkez dışında ~775,54€", "Ucuz restoran: ~20€ | Cappuccino: ~1,92€ | 85 m² temel faturalar: ~217,50€", "Tek yön şehir içi bilet: ~2,30€"],
  torino: ["Turin", "2026-05-17", "1 odalı daire: merkezde ~738,89€ | merkez dışında ~546,85€", "Ucuz restoran: ~18€ | Cappuccino: ~1,72€ | 85 m² temel faturalar: ~204,72€", "Tek yön şehir içi bilet: ~1,90€"],
  floransa: ["Florence", "2026-05-21", "1 odalı daire: merkezde ~1.230€ | merkez dışında ~844,77€", "Ucuz restoran: ~22€ | Cappuccino: ~1,99€ | 85 m² temel faturalar: ~199,84€", "Tek yön şehir içi bilet: ~1,70€"],
  venedik: ["Venice", "2026-05-04", "1 odalı daire: merkezde ~1.126€ | merkez dışında ~637,50€", "Ucuz restoran: ~20€ | Cappuccino: ~1,97€ | 85 m² temel faturalar: ~242€", "Tek yön şehir içi bilet: ~1,50€"],
  verona: ["Verona", "2026-05-18", "1 odalı daire: merkezde ~868,33€ | merkez dışında ~606,67€", "Ucuz restoran: ~18€ | Cappuccino: ~1,83€ | 85 m² temel faturalar: ~172,39€", "Tek yön şehir içi bilet: ~1,80€"],
  padova: ["Padova", "2026-05-11", "1 odalı daire: merkezde ~956,44€ | merkez dışında ~732,89€", "Ucuz restoran: ~20€ | Cappuccino: ~1,79€ | 85 m² temel faturalar: ~226,13€", "Tek yön şehir içi bilet: ~1,70€"],
  parma: ["Parma", "2026-05-04", "1 odalı daire: merkezde ~790€ | merkez dışında ~578€", "Ucuz restoran: ~18€ | Cappuccino: ~2,20€ | 85 m² temel faturalar: ~209,85€", "Tek yön şehir içi bilet: ~1,70€"],
  pisa: ["Pisa", "2026-05-10", "1 odalı daire: merkezde ~903,54€ | merkez dışında ~706,76€", "Ucuz restoran: ~17€ | Cappuccino: ~1,79€ | 85 m² temel faturalar: ~320€", "Tek yön şehir içi bilet: ~2€"],
  siena: ["Siena", "2026-05-04", "1 odalı daire: merkezde ~1.016,67€ | merkez dışında ~662,50€", "Ucuz restoran: ~14€ | Cappuccino: ~1,68€ | 85 m² temel faturalar: ~157,60€", "Tek yön şehir içi bilet: ~1,70€"],
  pavia: ["Pavia", "2026-05-04", "1 odalı daire: merkezde ~578,50€ | merkez dışında ~452,25€", "Ucuz restoran: ~15€ | Cappuccino: ~1,53€ | 85 m² temel faturalar: ~179,35€", "Tek yön şehir içi bilet: ~1,60€"],
  trieste: ["Trieste", "2026-05-13", "1 odalı daire: merkezde ~727,50€ | merkez dışında ~588,33€", "Ucuz restoran: ~18€ | Cappuccino: ~1,92€ | 85 m² temel faturalar: ~194,47€", "Tek yön şehir içi bilet: ~1,45€"],
  bari: ["Bari", "2026-05-04", "1 odalı daire: merkezde ~800€ | merkez dışında ~597,75€", "Ucuz restoran: ~15€ | Cappuccino: ~1,74€ | 85 m² temel faturalar: ~214,76€", "Tek yön şehir içi bilet: ~1€"],
  ancona: ["Ancona", "2026-05-04", "1 odalı daire: merkezde ~530€ | merkez dışında ~424€", "Ucuz restoran: ~15€ | Cappuccino: ~1,77€ | 85 m² temel faturalar: ~247€", "Tek yön şehir içi bilet: ~1,50€"],
  napoli: ["Naples", "2026-05-14", "1 odalı daire: merkezde ~966€ | merkez dışında ~612,20€", "Ucuz restoran: ~15,50€ | Cappuccino: ~1,94€ | 85 m² temel faturalar: ~188,48€", "Tek yön şehir içi bilet: ~1,50€"],
};

assert.equal(Object.keys(legacyNumbeoExpectations).length, 16, "Exactly 16 legacy cities must keep Numbeo provenance.");
for (const [slug, [sourceCity, updatedAt, rent, expenses, transport]] of Object.entries(legacyNumbeoExpectations)) {
  const city = cityRuntime.CURATED_CITIES.find((candidate) => candidate.slug === slug);
  assert.ok(city, `Missing legacy city ${slug}.`);
  assert.equal(city.costSourceName, "Numbeo", `${slug} must preserve Numbeo provenance.`);
  assert.equal(city.costSourceUrl, `https://www.numbeo.com/cost-of-living/in/${sourceCity}`);
  assert.equal(city.costSourceLastUpdated, updatedAt);
  assert.equal(city.rentAverage, rent);
  assert.equal(city.livingExpenses, expenses);
  assert.equal(city.transportCost, transport);
  for (const field of ["rentAverageEn", "livingExpensesEn", "transportCostEn"]) {
    assertNonEmptyString(city[field], `${slug}.${field}`);
  }
  assert.equal(city.costModel, undefined, `${slug} must not be migrated to the tier model.`);
  assert.equal(city.historyShort, undefined, `${slug} must not gain tiered history content.`);
}

const trento = cityRuntime.getCityDetailByName("Trento");
assert.ok(trento, "Trento must remain in the legacy catalog.");
assert.deepEqual(
  {
    costRating: trento.costRating,
    rentAverage: trento.rentAverage,
    rentAverageEn: trento.rentAverageEn,
    livingExpenses: trento.livingExpenses,
    livingExpensesEn: trento.livingExpensesEn,
    transportCost: trento.transportCost,
    transportCostEn: trento.transportCostEn,
  },
  {
    costRating: 3,
    rentAverage: "Tek kişilik oda: 350€ - 500€ | Stüdyo daire: 600€ - 850€",
    rentAverageEn: "Single room: €350 - €500 | Studio apartment: €600 - €850",
    livingExpenses: "Aylık 280€ - 370€ (Yüksek yaşam kalitesi standartları)",
    livingExpensesEn: "€280 - €370 monthly (High quality of life standard expenses)",
    transportCost: "Yıllık Trentino ulaşım kartı: 50€ (Öğrenci)",
    transportCostEn: "Annual Trentino student transit pass: €50",
  },
  "Trento's legacy cost content changed."
);
for (const field of [
  "costSourceName",
  "costSourceUrl",
  "costSourceLastUpdated",
  "costModel",
  "costModelVersion",
  "historyShort",
  "historySourceUrl",
  "sourceRetrievedAt",
]) {
  assert.equal(trento[field], undefined, `Trento must remain source-less (${field}).`);
}

const aliasExpectations = {
  Cenova: "cenova",
  Genova: "cenova",
  Genoa: "cenova",
  Bozen: "bolzano",
  Bolzano: "bolzano",
  "Bolzano/Bozen": "bolzano",
  "Bozen/Bolzano": "bolzano",
  "Bolzano-Bozen": "bolzano",
  Aosta: "aosta",
  Aoste: "aosta",
};

for (const [alias, slug] of Object.entries(aliasExpectations)) {
  assert.equal(cityRuntime.getCityDetailByName(alias)?.slug, slug, `${alias} must resolve to ${slug}.`);
  assert.equal(cityRuntime.getCanonicalCitySlug(alias), slug, `${alias} must expose canonical slug ${slug}.`);
  const picked = hubRuntime.pickCities(
    [{ university: { city: alias }, department: {}, score: 0, reasons: [] }],
    "any",
    1
  );
  assert.equal(picked[0]?.slug, slug, `Hub must resolve ${alias} to ${slug}.`);
}

const duplicateAliases = hubRuntime.pickCities(
  ["Cenova", "Genova", "Genoa"].map((city) => ({
    university: { city },
    department: {},
    score: 0,
    reasons: [],
  })),
  "any",
  3
);
assert.equal(duplicateAliases.filter((city) => city.slug === "cenova").length, 1, "Hub must deduplicate resolved aliases.");

const aosta = records.find((record) => record.slug === "aosta");
assert.ok(aosta, "Aosta tiered record is required.");
assert.match(aosta.transportDetails, /demiryolu.+kapalı/i);
assert.match(aosta.transportDetails, /ikame otobüs/i);
assert.match(aosta.transportDetailsEn, /railway.+closed/i);
assert.match(aosta.transportDetailsEn, /replacement bus/i);
assert.ok(
  aosta.transportSourceUrls.includes(
    "https://pressevda.regione.vda.it/it/news/entrano-nella-fase-conclusiva-i-lavori-di-elettrificazione-della-linea-ferroviaria-aostaivrea-riapertura-progressiva-a-partire-da-gennaio-2027"
  ),
  "Aosta needs the current official closure source."
);
assert.ok(
  aosta.transportSourceUrls.includes(
    "https://www.trenitalia.com/content/dam/trenitalia/regionale/carte-dei-servizi/2026/Carta_Servizi_2026_VdA_ENG.pdf"
  ),
  "Aosta needs Trenitalia's current replacement-service source."
);
assert.ok(aosta.reviewPriority.includes("rail-closure-freshness"));
assert.ok(aosta.uncertain.some((item) => /recheck.+rail.+replacement-bus status/i.test(item)));

const trCopy = translationRuntime.translations.tr.citiesGuide;
const enCopy = translationRuntime.translations.en.citiesGuide;
assert.equal(
  trCopy.warningItem2,
  "Burada sunulan bilgiler tamamen editoryal tahmin ve araştırmalara dayanmaktadır.",
  "Legacy Turkish warning behavior changed."
);
assert.equal(
  enCopy.warningItem2,
  "All details are curated based on recent student testimonies and research estimates.",
  "Legacy English warning behavior changed."
);
assert.match(trCopy.tierWarningItem1, /kaynakları kontrol edilmiş şehir araştırmasına/i);
assert.match(trCopy.tierWarningItem2, /editoryal bütçe bantları/i);
assert.match(enCopy.tierWarningItem1, /source-checked city research/i);
assert.match(enCopy.tierWarningItem2, /editorial budget bands/i);
assert.doesNotMatch(`${trCopy.tierWarningItem1} ${trCopy.tierWarningItem2}`, /tanıklık|testimon/i);
assert.doesNotMatch(`${enCopy.tierWarningItem1} ${enCopy.tierWarningItem2}`, /testimon/i);

assert.equal(normalizationRuntime.getCityGuideName("Piemonte"), null, "Piemonte is not a city guide.");
assert.equal(normalizationRuntime.resolveCityGuideSelection("piemonte"), null);
assert.equal(normalizationRuntime.resolveCityGuideSelection("Napoli / Caserta"), "Napoli");
assert.equal(normalizationRuntime.resolveCityGuideSelection("Uzaktan Eğitim / Roma"), "Roma");
assert.deepEqual(
  cityRuntime.getFallbackCityDetail("Unknown", "Test Region"),
  {
    slug: "unknown",
    name: "Unknown",
    nameEn: "Unknown",
    region: "Test Region",
    contentStatus: "unresearched",
  },
  "Unknown-city fallback must not invent city claims."
);

assertIncludes(sources.cityPage, "getCityDetailByName", "Server city routing must resolve researched aliases.");
assertIncludes(sources.cityPage, "getCanonicalCitySlug", "Server city routing must compare canonical slugs.");
assertIncludes(sources.cityPage, "city.slug === selectedSlug", "Server city routing must compare the resolved and option slugs.");
assertIncludes(sources.cityPage, "initialSelectedCity={selectedCity.slug}", "Server selection must cross the client boundary as a slug.");
assertIncludes(sources.cityPage, "createCityUniversitySummaries(universities, selectedCity.slug)", "Initial university filtering must use resolved slug identity.");
assertNotIncludes(sources.cityPage, "city.name.toLowerCase() === normalizedRawCity", "Server selection cannot compare display names literally.");

const activeSlugExpression = "activeCity.slug === city.slug";
assert.equal(
  sources.cityExplorer.split(activeSlugExpression).length - 1,
  2,
  "Both responsive city directories must derive active state from canonical slugs."
);
assertIncludes(sources.cityExplorer, "city.slug === activeCity.slug", "Mobile select value must compare option slugs.");
assertIncludes(sources.cityExplorer, "getCanonicalCitySlug(cityName) === activeCity.slug", "University filtering must resolve the university city slug.");
assertNotIncludes(sources.cityExplorer, "activeCity.name.toLowerCase() === city.name.toLowerCase()", "Selectors cannot compare display names literally.");
assertIncludes(sources.cityExplorer, 'activeCity.costModel === "italypath-tier"', "Tier warning and cost provenance need a tier branch.");
assertIncludes(sources.cityExplorer, "copy.tierWarningItem1", "Tier warning item 1 must render.");
assertIncludes(sources.cityExplorer, "copy.tierWarningItem2", "Tier warning item 2 must render.");
assertIncludes(sources.cityExplorer, 'activeCity.contentStatus === "unresearched"', "Unknown-city UI must remain honest.");
assertIncludes(sources.cityExplorer, "copy.historyTitle", "History panel heading is missing.");
assertIncludes(sources.cityExplorer, "activeCity.historySourceUrl", "History attribution link is missing.");
assertIncludes(sources.cityExplorer, 'htmlFor="mobile-city-selector"', "Mobile selector needs an associated label.");
assertIncludes(sources.cityExplorer, 'id="mobile-city-selector"', "Mobile selector needs a stable id.");
assertIncludes(sources.cityExplorer, "value={activeCitySlug}", "Mobile selector must reflect the active option slug.");
assertIncludes(sources.cityExplorer, "handleSelectCity(event.target.value)", "Mobile selector must reuse the route selection flow.");
assertIncludes(sources.cityExplorer, "lg:hidden", "Mobile selector must hide at the desktop breakpoint.");
assertIncludes(sources.cityExplorer, "hidden min-w-0 lg:block", "Desktop directory must hide below its breakpoint.");
assertIncludes(sources.hub, "getCityDetailByName(cityName)", "Hub city selection must use the shared resolver.");
assertIncludes(sources.costTiers, "DeepReadonly", "Tier catalog needs a deeply readonly type.");

console.log("[OK] City data runtime and UI contract checks passed (25 tiered, 17 legacy, 10 aliases).");
