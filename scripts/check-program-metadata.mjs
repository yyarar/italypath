// Program detay sayfalarinin Turkce metadata sablonunu dogrular:
// baslik/aciklama uzunluk butcesi, Turkce seviye/dil sozcukleri, dosyasiz
// programda vaat cumlesi olmamasi ve sayfalarin birbirinden ayrilmasi.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

// lib/programMetadata.ts saf modul olmalidir (deger import'u yok); aksi halde
// bu yukleme cozumlenemez ve guard kirmizi olur.
async function importTsModule(path) {
  const source = readFileSync(resolve(process.cwd(), path), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
  });
  const encoded = Buffer.from(transpiled.outputText, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

const { buildProgramTitle, buildProgramDescription } = await importTsModule(
  "lib/programMetadata.ts",
);

const short = {
  programName: "Criminology",
  universityName: "University of Bologna",
  city: "Bologna",
  level: "master",
  durationYears: 2,
  languages: ["en"],
  hasDossier: true,
};

const longName = {
  ...short,
  programName:
    "Molecular Biology, Medicinal Chemistry and Computer Science for Pharmaceutical Applications",
  universityName: "University of Naples Federico II",
  city: "Napoli / Caserta",
};

// 1. Kisa ad: program + okul + marka
assert.equal(
  buildProgramTitle(short),
  "Criminology — University of Bologna | ItalyPath",
);

// 2. Uzun adda marka ve okul dusurulur, program adi kelime ortasindan kesilmez
const longTitle = buildProgramTitle(longName);
assert.ok(longTitle.startsWith("Molecular Biology"), longTitle);
assert.ok(!longTitle.includes("| ItalyPath"), longTitle);
assert.ok(longTitle.length <= 110, `title too long: ${longTitle.length}`);

// 3. Bozuk sehir degeri baslikta temizlenir
assert.ok(!longTitle.includes("Caserta"), longTitle);

// 4. Sehir cozucusu parametre olarak gecilebilir (layout getCityGuideName gecer)
assert.ok(
  buildProgramTitle(longName, () => "Napoli").includes("Napoli"),
);

// 5. Aciklama: Turkce, butce icinde, Ingilizce sablon kalintisi yok
const description = buildProgramDescription(short);
assert.ok(
  description.length <= 160,
  `description too long: ${description.length}`,
);
assert.ok(description.includes("Yüksek lisans"), description);
assert.ok(description.includes("2 yıl"), description);
assert.ok(description.includes("İngilizce"), description);
assert.ok(!/Study |Tuition:/.test(description), description);
assert.ok(description.includes("Başvuru takvimi"), description);

// 5b. Uzun okul + iki dil: aciklama yarim cumle ile bitmemeli
const longSchool = buildProgramDescription({
  ...short,
  universityName: "University of Milan (Statale)",
  city: "Milano",
  languages: ["it", "en"],
});
assert.ok(
  longSchool.length <= 160,
  `description too long: ${longSchool.length}`,
);
assert.ok(!longSchool.endsWith("…"), longSchool);
assert.ok(longSchool.endsWith("."), longSchool);

const veryLongSchool = buildProgramDescription({
  ...short,
  universityName: "Free University of Bozen-Bolzano and Partner Institutions",
  city: "Bolzano",
  level: "single-cycle",
  durationYears: 6,
  languages: ["it", "en"],
});
assert.ok(!veryLongSchool.endsWith("…"), veryLongSchool);
assert.ok(veryLongSchool.length <= 160, veryLongSchool);

// 6. Dosyasiz programda vaat yok
const noDossier = buildProgramDescription({ ...short, hasDossier: false });
assert.ok(!noDossier.includes("Başvuru takvimi"), noDossier);
assert.ok(noDossier.includes("hazırlanıyor"), noDossier);

// 7. Seviye, sure, dil ve okul benzersizlik uretir
assert.notEqual(
  buildProgramDescription(short),
  buildProgramDescription({ ...short, level: "bachelor", durationYears: 3 }),
);
assert.notEqual(
  buildProgramTitle(short),
  buildProgramTitle({ ...short, universityName: "University of Padua" }),
);

// 8. Dil varyantlari
assert.ok(
  buildProgramDescription({ ...short, languages: ["it"] }).includes("İtalyanca"),
);
assert.ok(
  buildProgramDescription({ ...short, languages: ["en", "it"] }).includes(
    "İngilizce / İtalyanca",
  ),
);
assert.ok(
  buildProgramDescription({ ...short, languages: [] }).includes("İngilizce"),
);

// 9. Tek devre ve lisans sozcukleri
assert.ok(
  buildProgramDescription({
    ...short,
    level: "single-cycle",
    durationYears: 6,
  }).includes("Tek devre"),
  "single-cycle label missing",
);
assert.ok(
  buildProgramDescription({ ...short, level: "bachelor" }).includes("Lisans"),
);

// 10. layout.tsx sablonu gercekten bu modulu kullanmali (Ingilizce sablon donmemeli)
const layoutSource = readFileSync(
  "app/universities/[id]/departments/[deptSlug]/layout.tsx",
  "utf8",
);
for (const token of [
  "buildProgramTitle",
  "buildProgramDescription",
  "getUniversityById(",
  "hasAdmissionDossier",
]) {
  assert.ok(
    layoutSource.includes(token),
    `program layout must use ${token}`,
  );
}
for (const forbidden of ["Study ${", "Tuition: ${"]) {
  assert.ok(
    !layoutSource.includes(forbidden),
    `program layout must not keep the English template (${forbidden})`,
  );
}

console.log(
  "[OK] Program metadata templates are Turkish, unique and within length budgets.",
);
