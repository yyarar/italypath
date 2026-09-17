# Program Detay Sayfaları Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1.008 program detay sayfasını okunur, benzersiz ve ön görüşmeye açık hâle getirmek; sayfa ağırlığını ve ince içerik riskini düşürmek.

**Architecture:** Tüm metin dönüşümleri **sunum katmanında saf fonksiyonlarla** yapılır (`programAdmissionPresentation.ts`, `lib/programMetadata.ts`); veritabanı ve veri modeli değişmez. Panel üç bileşene bölünür, sayfa bölüm sırası değişir, sunucudan client'a giden prop budanır, `degree_class` kodu dizine küçük bir alan olarak eklenir.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, TypeScript. Test koşucusu yok; testler `node:assert` ile çalışan `scripts/check-*.mjs` guard'larıdır (TS modülleri `ts.transpileModule` + `data:` URL ile import edilir — mevcut örnek: `scripts/check-program-admission-dossier.mjs:6-17`).

**Spec:** `docs/superpowers/specs/2026-09-17-program-detail-pages-design.md`

## Global Constraints

- Veritabanı şeması **değişmez**; yeni kolon/migration yok. Yeni LLM/çalışma zamanı metin üretimi yok; uydurma bilgi yok.
- `[uncertain]` işaretleri ve kaynak alıntıları kaybolmaz, birleştirilmez, kısaltılmaz.
- Tasarım dili: editorial paper/sage/terracotta, serif başlık, keskin çerçeve. Yasak token'lar (`scripts/check-university-detail-portrait.mjs:155-166`): `Sparkles`, `glass-dark`, `glass ` (boşluklu), `bg-indigo`, `text-indigo`, `shadow-indigo`, `radial-gradient`, `rounded-3xl`, `bg-slate-950`, `replaceAll("_", " ")`.
- Terracotta metin/ikon **yalnız** `text-[var(--editorial-terracotta-ink)]`; `text-[var(--editorial-terracotta)]` repo genelinde yasak (`scripts/check-seo-vitals.mjs:55-62`).
- Tüm UI metinleri `lib/translations.ts` içinde TR **ve** EN paralel; hard-code metin yok. TR kökü satır 2, EN kökü satır 1072'de başlar.
- Program `page.tsx` sözleşmesi korunur: `export const revalidate = 10800`, `export function generateStaticParams()`, `force-dynamic` yok, `searchParams` **okunmaz** (`scripts/check-seo-vitals.mjs:26-48`).
- `lib/universities.server.ts` sözleşmesi: `getUniversitiesData` adlı export **yasak**; `.select("department_id,updated_at")` ve `.eq("university_id", ` literalleri kalır; `SERVER_CACHE_TTL_MS = 3 * 60 * 60 * 1000`; `serving stale cached data` literali kalır (`scripts/check-university-data-source.mjs:92-128`).
- `app/sitemap.ts` içinde `universitiesData` dizesi **kullanılmaz**, `/on-gorusme` kalır, `/ai-mentor` eklenmez.
- Her görünür değişiklik canlıya çıkmadan Kerem'e anlatılır ve ekran görüntüsüyle gösterilir; `git push` yalnız açık "gönder" onayıyla yapılır.
- Görünür şablon içeriği değişen her deploy'da `app/sitemap.ts` içindeki `PAGE_TEMPLATE_LAST_MODIFIED` (satır 12) o deploy tarihine çekilir.
- Her task sonunda: `npx tsc --noEmit`, değişen dosyalarda `npx eslint <dosya>`, ilgili guard'lar yeşil.

---

## Dosya haritası

| Dosya | Sorumluluk | Durum |
|---|---|---|
| `components/university-details/programAdmissionPresentation.ts` | Saf sunum yardımcıları (mevcut 9 export + yeni 6 fonksiyon). **Yalnız `import type`** içerebilir. | Değişir (Task 1) |
| `components/university-details/ProgramSummaryStrip.tsx` | Künye: kampüs, bölüm sınıfı, kabul tipi, öğretim dili, resmî linkler, kaynak sayısı, son kontrol | Yeni (Task 2) |
| `components/university-details/ProgramAdmissionDetailsPanel.tsx` | Kabul dosyası gövdesi: takvim, koşullar, belgeler + `ExpandableText` | Değişir (Task 2) |
| `components/university-details/ProgramSourceTrail.tsx` | Kaynak izi + belirsizlikler, açılır-kapanır | Yeni (Task 2) |
| `components/university-details/DepartmentDetailClient.tsx` | Bölüm sırası, prop dağıtımı | Değişir (Task 2, 4, 6, 7) |
| `lib/programMetadata.ts` | Türkçe başlık/açıklama üreten saf fonksiyonlar | Yeni (Task 3) |
| `app/universities/[id]/departments/[deptSlug]/layout.tsx` | `generateMetadata` (Türkçe metin + dosyasızda `noindex`) | Değişir (Task 3, 6) |
| `app/universities/[id]/departments/[deptSlug]/page.tsx` | Prop budama, ilgili link verisi | Değişir (Task 4, 5) |
| `lib/universities.server.ts` | `degree_class` kodlarını dizine taşıyan ek sorgu + compose | Değişir (Task 5) |
| `lib/relatedLinks.ts` | Aynı alandaki programlar; şehir/burs linklerinin taşınması | Değişir (Task 5, 7) |
| `components/university-details/RelatedLinks.tsx` | Aynı şehir + aynı alan listeleri | Değişir (Task 5, 7) |
| `components/university-details/ProgramNextSteps.tsx` | "Sonraki adımlar" bölümü (ISEE, şehir, burs, ön görüşme) | Yeni (Task 7) |
| `app/sitemap.ts` | Dosyasız programları listeden çıkarma, şablon tarihi | Değişir (Task 6) |
| `scripts/check-program-admission-dossier.mjs` | Task 1 birim testleri | Değişir (Task 1) |
| `scripts/check-program-metadata.mjs` | Task 3 birim testleri | Yeni (Task 3) |
| `scripts/check-university-detail-portrait.mjs` | Yeni bileşenleri `portraitFiles`'a ekleme, literal sözleşmesi | Değişir (Task 2, 5, 7) |
| `scripts/check-university-data-source.mjs` | `degree_class` ek sorgu sözleşmesi | Değişir (Task 5) |
| `scripts/check-universities-server-compose.mjs` | `degreeClassCodes` üç durumu | Değişir (Task 5) |
| `scripts/check-seo-vitals.mjs` | Sitemap dosya filtresi sözleşmesi | Değişir (Task 6) |
| `lib/translations.ts` | Yeni TR/EN metinler | Değişir (Task 2, 5, 7) |

---

## Task 1: Metin biçimlendirme fonksiyonları (İş 1'in çekirdeği)

**Files:**
- Modify: `components/university-details/programAdmissionPresentation.ts` (mevcut dosya sonuna ekle)
- Test: `scripts/check-program-admission-dossier.mjs` (mevcut dosyanın sonuna, `console.log` satırından önce)

**Interfaces:**
- Consumes: mevcut `cleanAdmissionDisplayValue` (satır 89-91) — davranışı **değişmez** (guard onu test ediyor).
- Produces:
  - `export interface AdmissionSegment { label?: string; text: string }`
  - `export function cleanAdmissionTextPreservingBreaks(value: string): string`
  - `export function splitAdmissionSegments(value: string): AdmissionSegment[]`
  - `export function localizeAdmissionDates(value: string, language: "tr" | "en"): string`
  - `export function localizeAdmissionType(value: string, language: "tr" | "en"): string`
  - `export function extractDegreeClassCodes(value: string | undefined): string[]`

- [ ] **Step 1: Testleri yaz**

`scripts/check-program-admission-dossier.mjs` dosyasının en sonundaki `console.log(...)` çağrısından **önce** ekle. Ayrıca dosyanın başındaki destructuring bloğuna (satır 19-31) yeni adları ekle: `cleanAdmissionTextPreservingBreaks`, `splitAdmissionSegments`, `localizeAdmissionDates`, `localizeAdmissionType`, `extractDegreeClassCodes`.

```js
// --- Yeni: metin bicimlendirme (2026-09-17 program detay turu) ---

// 1. Satir sonu + noktali virgul bolme
const roundsText =
  "Intake 1 (reserved to non-EU applicants residing abroad): 2025-11-27 to 2026-01-14 13:00; Intake 2: 2026-01-15 to 2026-02-25 13:00; Intake 3: 2026-02-26 to 2026-04-09 13:00";
const segments = splitAdmissionSegments(roundsText);
assert.equal(segments.length, 3);
assert.equal(segments[0].label, "Intake 1");
assert.equal(segments[1].label, "Intake 2");
assert.ok(segments[0].text.startsWith("2025-11-27"));

// 2. Karakter kaybi yasak: harf/rakamlar aynen korunur
const lettersOnly = (value) => value.replace(/[^\p{L}\p{N}]/gu, "");
assert.equal(
  lettersOnly(segments.map((s) => `${s.label ?? ""}${s.text}`).join("")),
  lettersOnly(roundsText),
);

// 3. Az ayirici veya kisa parca varsa tek paragraf kalir
assert.deepEqual(
  splitAdmissionSegments("First intake closes 2026-05-07 13:00; then nothing."),
  [{ text: "First intake closes 2026-05-07 13:00; then nothing." }],
);

// 4. Satir sonlari bolunur, bos satirlar atilir
const multiline = splitAdmissionSegments(
  "Rounds: Round Name: Certification-based direct admission\nApplication Window: From October 2026 to 10 February 2027\n\nTest Dates: Not applicable.",
);
assert.equal(multiline.length, 3);
assert.equal(multiline[1].label, "Application Window");

// 5. [uncertain] isareti metinden temizlenir (panel ayri bolumde gosteriyor)
assert.equal(
  splitAdmissionSegments("[uncertain] First intake: 2026-02-26 to 2026-04-16.")[0].text,
  "First intake: 2026-02-26 to 2026-04-16.",
);

// 6. Tarih yerelleştirme: YALNIZCA ISO biçimi (2026-01-14), yalnizca TR
// (Kerem karari 17 Eylul: Ingilizce ay adlari cevrilmez, karisik cumle olusmasin.)
assert.equal(
  localizeAdmissionDates("2025-11-27 to 2026-01-14 13:00", "tr"),
  "27 Kasım 2025 to 14 Ocak 2026 13:00",
);
assert.equal(
  localizeAdmissionDates("18 March 2026 to 4 May 2026", "tr"),
  "18 March 2026 to 4 May 2026",
);
assert.equal(
  localizeAdmissionDates("From October 2026 to 10 February 2027", "tr"),
  "From October 2026 to 10 February 2027",
);
assert.equal(
  localizeAdmissionDates("2026-01-14", "en"),
  "2026-01-14",
);
// Gecersiz ISO tarih aynen kalir
assert.equal(localizeAdmissionDates("2026-13-40", "tr"), "2026-13-40");
// Yil-ay ya da tek basina yil dokunulmaz
assert.equal(localizeAdmissionDates("academic year 2026/2027", "tr"), "academic year 2026/2027");

// 7. Kabul tipi: bilinen kategoriler Turkce, bilinmeyen aynen
assert.equal(localizeAdmissionType("open access", "tr"), "Serbest giriş");
assert.equal(localizeAdmissionType("Selection call", "tr"), "Seçme çağrısı");
assert.equal(localizeAdmissionType("TOLC", "tr"), "TOLC sınavı");
assert.equal(
  localizeAdmissionType("numerus clausus with local exam", "tr"),
  "numerus clausus with local exam",
);
assert.equal(localizeAdmissionType("open access", "en"), "open access");

// 8. Resmi bolum sinifi kodu
assert.deepEqual(extractDegreeClassCodes("LM-32"), ["LM-32"]);
assert.deepEqual(extractDegreeClassCodes("L-8 R / L-9 R"), ["L-8", "L-9"]);
assert.deepEqual(extractDegreeClassCodes("LM-23 R - Civil engineering"), ["LM-23"]);
assert.deepEqual(extractDegreeClassCodes("LMG/01 Giurisprudenza"), ["LMG/01"]);
assert.deepEqual(
  extractDegreeClassCodes("Not found in checked official catalogue [uncertain]."),
  [],
);
assert.deepEqual(extractDegreeClassCodes(undefined), []);

// 9. Satir sonlarini koruyan temizlik
assert.equal(
  cleanAdmissionTextPreservingBreaks("  a  b \n\n c  [uncertain] d  "),
  "a b\nc d",
);
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npm run check:admission-dossier`
Expected: FAIL — `SyntaxError`/`TypeError: splitAdmissionSegments is not a function` (henüz export yok).

- [ ] **Step 3: Fonksiyonları yaz**

`components/university-details/programAdmissionPresentation.ts` dosyasının sonuna ekle (dosya **yalnız** `import type` içermeye devam etmeli):

```ts
export interface AdmissionSegment {
  label?: string;
  text: string;
}

const TR_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
] as const;

const ADMISSION_TYPE_TR: Record<string, string> = {
  "open access": "Serbest giriş",
  "open access with entry requirements examination":
    "Giriş şartları incelemesiyle serbest giriş",
  "open with entry requirements examination":
    "Giriş şartları incelemesiyle serbest giriş",
  "selection call": "Seçme çağrısı",
  "selection call / academic evaluation":
    "Seçme çağrısı / akademik değerlendirme",
  "restricted access": "Kontenjanlı giriş",
  tolc: "TOLC sınavı",
  "document evaluation": "Belge değerlendirmesi",
};

const SEGMENT_LABEL_PATTERN = /^([A-Z][A-Za-z0-9 /&'()-]{2,40}):\s+(.+)$/;
const MIN_SEGMENT_LENGTH = 25;
const MIN_SEGMENT_COUNT = 3;

export function cleanAdmissionTextPreservingBreaks(value: string) {
  return value
    .replace(/\s*\[uncertain\]\s*/gi, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

// Yalnizca ISO tarihleri (2026-01-14) okunur hale getirir. Ingilizce ay adlari
// bilincli olarak cevrilmez (Kerem karari 17 Eylul): cumlenin kalani Ingilizce
// oldugu icin karisik metin olusmasin.
export function localizeAdmissionDates(value: string, language: "tr" | "en") {
  if (language !== "tr") return value;

  return value.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (match, year, month, day) => {
    const monthIndex = Number(month) - 1;
    const dayNumber = Number(day);
    if (monthIndex < 0 || monthIndex > 11) return match;
    if (dayNumber < 1 || dayNumber > 31) return match;
    return `${dayNumber} ${TR_MONTHS[monthIndex]} ${year}`;
  });
}

export function splitAdmissionSegments(value: string): AdmissionSegment[] {
  const cleaned = cleanAdmissionTextPreservingBreaks(value);
  if (cleaned.length === 0) return [{ text: "" }];

  const lines = cleaned.split("\n");
  const pieces = lines.flatMap((line) => {
    const parts = line
      .split(/;\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    const splittable =
      parts.length >= MIN_SEGMENT_COUNT &&
      parts.every((part) => part.length >= MIN_SEGMENT_LENGTH);

    return splittable ? parts : [line];
  });

  if (pieces.length < 2) return [{ text: pieces[0] ?? "" }];

  return pieces.map((piece) => {
    const match = SEGMENT_LABEL_PATTERN.exec(piece);
    if (!match) return { text: piece };
    return { label: match[1], text: match[2] };
  });
}

export function localizeAdmissionType(value: string, language: "tr" | "en") {
  if (language !== "tr") return value;
  const key = value.trim().toLowerCase();
  return ADMISSION_TYPE_TR[key] ?? value;
}

export function extractDegreeClassCodes(value: string | undefined) {
  if (!value) return [];
  const matches = value.matchAll(/\b(LMG\s*\/\s*\d{1,2}|LM\s*-?\s*\d{1,2}|L\s*-?\s*\d{1,2})\b/gi);
  const codes = [...matches].map((match) => {
    const raw = match[1].replace(/\s+/g, "").toUpperCase();
    if (raw.startsWith("LMG/")) return raw;
    if (raw.startsWith("LM")) return `LM-${raw.replace(/^LM-?/, "")}`;
    return `L-${raw.replace(/^L-?/, "")}`;
  });
  return [...new Set(codes)];
}
```

> Not: `splitAdmissionSegments` "Rounds: Round Name: X" gibi çift etiketli satırda dış etiketi (`Rounds`) alır, kalanı metin olarak bırakır — bilgi kaybı olmaz.

- [ ] **Step 4: Testin geçtiğini gör**

Run: `npm run check:admission-dossier`
Expected: PASS — `[OK] Program admission dossier presentation preserves evidence and handles dense/sparse data.`

- [ ] **Step 5: 30 gerçek programda gözle kontrol**

Geçici bir script (`tmp/` altında, commit edilmez) ile Supabase'den 30 farklı okuldan birer kayıt çek, `splitAdmissionSegments` + `localizeAdmissionDates` çıktısını yazdır. Ara: (a) tek karakterlik/anlamsız madde, (b) yanlış etiket ayrıştırma, (c) yanlış tarih çevirisi. Bulunan her sorun için eşik veya regex düzeltilir ve Step 1'e yeni test eklenir.

- [ ] **Step 6: Commit**

```bash
git add components/university-details/programAdmissionPresentation.ts scripts/check-program-admission-dossier.mjs
git commit -m "feat(program): add pure formatters for admission text, dates, admission type and degree class"
```

---

## Task 2: Kabul dosyası düzeni ve bölüm sırası (İş 1'in UI'ı)

**Files:**
- Create: `components/university-details/ProgramSummaryStrip.tsx`
- Create: `components/university-details/ProgramSourceTrail.tsx`
- Modify: `components/university-details/ProgramAdmissionDetailsPanel.tsx`
- Modify: `components/university-details/DepartmentDetailClient.tsx:133-263`
- Modify: `lib/translations.ts` (TR `department` 652-720, EN 1722-1790)
- Modify: `scripts/check-university-detail-portrait.mjs:36-46` (portraitFiles) ve `:127-153` (literal listesi)

**Interfaces:**
- Consumes: Task 1'in altı fonksiyonu; mevcut `buildAdmissionEvidence`, `groupAdmissionEvidenceByUrl`, `getAdmissionFieldEvidence`, `admissionFieldIsUncertain`, `latestAdmissionSourceDate`, `normalizeAdmissionSourceUrl`, `parseAdmissionSourceDate`.
- Produces:
  - `ProgramSummaryStrip({ details, labels, language }): JSX` — künye + resmî linkler + kaynak sayısı/son kontrol.
  - `ProgramSourceTrail({ details, labels, language, programName, universityName, isSignedIn }): JSX` — kaynak izi + belirsizlikler + "Sıradaki adım" kutusu, `<details>` içinde.
  - `ProgramAdmissionDetailsPanel` aynı prop imzasıyla kalır; içinde yalnız takvim/koşullar/belgeler render eder.

- [ ] **Step 1: Guard'ı yeni dosya listesiyle güncelle (test önce)**

`scripts/check-university-detail-portrait.mjs:36-46` içindeki `portraitFiles` dizisine iki satır ekle:

```js
  "components/university-details/ProgramSummaryStrip.tsx",
  "components/university-details/ProgramSourceTrail.tsx",
```

Aynı dosyanın `requireTokens("program admission dossier", portraitSource, [...])` listesine (satır 127-153 civarı) şu literalleri ekle:

```js
  "splitAdmissionSegments",
  "localizeAdmissionDates",
  "localizeAdmissionType",
  "ProgramSummaryStrip",
  "ProgramSourceTrail",
  "aria-expanded",
```

- [ ] **Step 2: Guard'ın başarısız olduğunu gör**

Run: `npm run check:university-details-ui`
Expected: FAIL — `ENOENT ... ProgramSummaryStrip.tsx` (dosya yok).

- [ ] **Step 3: `ProgramSummaryStrip.tsx` dosyasını yaz**

Panelin bugünkü `header` (satır 540-585) ve `profileFacts` (satır 466-493, 589-599) bloklarını bu dosyaya taşı. Kabul tipi değeri `localizeAdmissionType(fact.value, language)` ile, bölüm sınıfı değeri önce `extractDegreeClassCodes(details.degreeClass)` ile denenir (kod varsa `codes.join(" / ")`, yoksa `cleanAdmissionDisplayValue(details.degreeClass)`) gösterilir. Çerçeve ve tipografi panelden aynen kopyalanır:

```tsx
<section
  data-testid="program-summary-strip"
  className="select-text border border-[var(--editorial-border)] bg-[var(--editorial-surface)]"
>
  <header className="border-b border-[var(--editorial-border)] px-5 py-6 sm:px-7 lg:flex lg:items-start lg:justify-between lg:gap-8">
    {/* panelden taşınan h2 + kaynak sayısı (labels.sourceCount) + labels.lastChecked + resmî link navigasyonu (labels.sourceTrail aria-label) */}
  </header>
  <dl className="grid grid-cols-2 gap-x-5 px-5 py-2 sm:px-7 lg:grid-cols-4">
    {/* ProfileFact: kampüs, bölüm sınıfı, kabul tipi (Türkçe), labels.teachingLanguage */}
  </dl>
</section>
```

`ProfileFact` ve `SourceNavLink` yardımcılarını da bu dosyaya taşı (panelde artık kullanılmıyorlar). `EvidenceLink` her iki dosyada gerektiği için `programAdmissionPresentation.ts`'e **taşınmaz** (JSX içerir); `ProgramSummaryStrip.tsx` içinde kendi kopyasını tutar ve panel kendi kopyasını korur.

- [ ] **Step 4: `ProgramSourceTrail.tsx` dosyasını yaz**

Panelin `aside` bloğunu (satır 830-939) ve belirsizlik bölümünü (satır 795-827) buraya taşı. İki fark:

```tsx
<details className="group border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-bold text-[var(--editorial-ink)] sm:px-7">
    {labels.sourceTrail}
    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
  </summary>
  <div className="border-t border-[var(--editorial-border)] px-5 py-6 sm:px-7">
    {/* kaynak listesi (labels.sourceExcerptCount), belirsizlikler (labels.uncertaintyNote),
        ardından bugünkü "Sıradaki adım" kutusu (labels.nextStep) */}
  </div>
</details>
```

`details.uncertaintyNotes.map` zinciri **birebir** bu dosyada kalmalı (guard `scripts/check-university-detail-portrait.mjs:151`).

- [ ] **Step 5: Paneli sadeleştir ve `ExpandableText`'i tek düğüme indir**

`ProgramAdmissionDetailsPanel.tsx` artık yalnız üç bölüm render eder (takvim, kabul koşulları, gerekli belgeler). `DossierSectionTitle` numaralandırması 1'den başlar ve kaynak izi numarası kalkar. Uzun metinler `splitAdmissionSegments` + `localizeAdmissionDates` ile listelenir:

```tsx
function AdmissionText({
  value,
  language,
  readFullLabel,
  collapseLabel,
  className,
  collapsedItemCount = 3,
}: {
  value: string;
  language: "tr" | "en";
  readFullLabel: string;
  collapseLabel: string;
  className?: string;
  collapsedItemCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const segments = splitAdmissionSegments(value).map((segment) => ({
    label: segment.label,
    text: localizeAdmissionDates(segment.text, language),
  }));
  const contentId = useId();

  if (segments.length === 1) {
    return (
      <ClampedParagraph
        text={segments[0].text}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
        readFullLabel={readFullLabel}
        collapseLabel={collapseLabel}
        className={className}
        contentId={contentId}
      />
    );
  }

  const visible = expanded ? segments : segments.slice(0, collapsedItemCount);

  return (
    <div>
      <ul id={contentId} className="space-y-2">
        {visible.map((segment, index) => (
          <li key={`${segment.label ?? "segment"}-${index}`} className={`break-words ${className ?? ""}`}>
            {segment.label ? (
              <span className="font-bold">{segment.label}: </span>
            ) : null}
            {segment.text}
          </li>
        ))}
      </ul>
      {segments.length > collapsedItemCount ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[var(--editorial-terracotta-ink)]"
        >
          {expanded ? collapseLabel : readFullLabel}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      ) : null}
    </div>
  );
}
```

`ClampedParagraph` tek paragrafı `line-clamp-4` ile gösterir, açıldığında `line-clamp-none` olur ve metni **bir kez** yazar:

```tsx
<p
  id={contentId}
  className={`${expanded ? "" : "line-clamp-4"} break-words ${className ?? ""}`}
>
  {text}
</p>
```

Eski `ExpandableText` bileşeni (satır 265-306, metni iki kez yazan `details/summary` yapısı) silinir. Belgeler listesindeki ve belirsizlik notlarındaki kullanımlar `AdmissionText`/`ClampedParagraph` ile değiştirilir.

- [ ] **Step 6: Sayfa sırasını değiştir**

`DepartmentDetailClient.tsx` içinde `<main>` çocuklarının sırası şöyle olur:

1. `ProgramMetaStrip` (değişmez)
2. `ProgramSummaryStrip` — `department.admissionDetails` varsa
3. "Okul bağlamı" bölümü (mevcut `section`, satır 165-180)
4. `ProgramAdmissionDetailsPanel` — `department.admissionDetails` varsa, yoksa `ComingSoonNotice`
5. `ConsultPrompt` (Task 7'de `ProgramNextSteps` ile sarılacak)
6. `ProgramSourceTrail` — `department.admissionDetails` varsa
7. `ProgramDirectory`
8. `RelatedLinks`

`labels` nesnesi üç bileşene bölünür; `department.admissionDetails`, `otherDepts`, `department.durationYears`, `department.languages`, `t.department.singleCycle`, `singleCyclePrograms={t.detail.singleCyclePrograms}`, `programName={department.name}`, `isSignedIn={isSignedIn}`, `language={language}` literalleri dosyada kalmalı (guard `:96-119`).

- [ ] **Step 7: Yeni metinleri çeviri dosyasına ekle**

`lib/translations.ts` TR `department` bloğuna (ve EN karşılığına) ekle:

```ts
      summaryTitle: "Program künyesi",
      timelineNote: "Tarihler kaynak metinden alınmıştır; resmî çağrı esastır.",
      showAllRounds: "Tüm turları göster",
```

EN: `"Program facts"`, `"Dates come from the source text; the official call prevails."`, `"Show all rounds"`.

- [ ] **Step 8: Guard'lar ve derleme**

Run:
```bash
npm run check:university-details-ui && npm run check:admission-dossier && npm run check:seo-vitals && npx tsc --noEmit
```
Expected: hepsi PASS.

- [ ] **Step 9: Yerelde gör ve ekran görüntüsü al**

Run: `npm run build`, ardından `.claude/launch.json` `italypath-prod` önizlemesi. Kontrol listesi:
- Künye "Okul bağlamı"nın üstünde, kabul tipi Türkçe.
- Takvim maddeli, TR'de tarihler Türkçe.
- Kaynak izi kapalı başlıyor, açılıyor.
- Sunucu HTML'inde tüm metin var (`curl -s <url> | grep -c "Intake"`), tek kopya (`ExpandableText` çift yazımı bitti).
Headless Chrome ile uzun pencere ekran görüntüsü alıp Kerem'e göster.

- [ ] **Step 10: Commit**

```bash
git add components/university-details lib/translations.ts scripts/check-university-detail-portrait.mjs
git commit -m "feat(program): structure admission dossier into summary strip, body and collapsible source trail"
```

---

## Task 3: Türkçe, benzersiz başlık ve açıklama (İş 2)

**Files:**
- Create: `lib/programMetadata.ts`
- Create: `scripts/check-program-metadata.mjs`
- Modify: `package.json` (`"check:program-metadata": "node scripts/check-program-metadata.mjs"`)
- Modify: `app/universities/[id]/departments/[deptSlug]/layout.tsx`

**Interfaces:**
- Produces:
  - `export interface ProgramMetadataInput { programName: string; universityName: string; city: string; level: "bachelor" | "master" | "single-cycle"; durationYears: number; languages: ("en" | "it")[]; hasDossier: boolean }`
  - `export function buildProgramTitle(input: ProgramMetadataInput): string`
  - `export function buildProgramDescription(input: ProgramMetadataInput): string`
- Consumes: `getCityGuideName` (`lib/cities/normalization.ts:12`), `translations.tr.department.*`.

- [ ] **Step 1: Testi yaz**

`scripts/check-program-metadata.mjs`:

```js
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

// lib/programMetadata.ts yalnız type-only import + saf fonksiyon icermelidir.
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

// 2. Uzun adda marka ve okul dusurulur, program adi kesilmez
const longTitle = buildProgramTitle(longName);
assert.ok(longTitle.startsWith(longName.programName), longTitle);
assert.ok(!longTitle.includes("| ItalyPath"), longTitle);
assert.ok(longTitle.length <= 110, `title too long: ${longTitle.length}`);

// 3. Bozuk sehir adi baslikta temizlenir
assert.ok(!buildProgramTitle(longName).includes("Caserta"));

// 4. Aciklama: Turkce, tek satir, ~150 karakter
const description = buildProgramDescription(short);
assert.ok(description.length <= 160, `description too long: ${description.length}`);
assert.ok(description.includes("Yüksek lisans"), description);
assert.ok(description.includes("2 yıl"), description);
assert.ok(description.includes("İngilizce"), description);
assert.ok(!/Study |Tuition:/.test(description), description);

// 5. Dosyasiz programda vaat yok
const noDossier = buildProgramDescription({ ...short, hasDossier: false });
assert.ok(!noDossier.includes("Başvuru takvimi"), noDossier);
assert.ok(noDossier.includes("hazırlanıyor"), noDossier);

// 6. Seviye ve dil kombinasyonlari benzersizlik uretir
assert.notEqual(
  buildProgramDescription(short),
  buildProgramDescription({ ...short, level: "bachelor", durationYears: 3 }),
);
assert.notEqual(
  buildProgramTitle(short),
  buildProgramTitle({ ...short, universityName: "University of Padua" }),
);

// 7. Italyanca programda dil dogru yazilir
assert.ok(
  buildProgramDescription({ ...short, languages: ["it"] }).includes("İtalyanca"),
);
assert.ok(
  buildProgramDescription({ ...short, languages: ["en", "it"] }).includes(
    "İngilizce / İtalyanca",
  ),
);

// 8. Tek devre programlar
assert.ok(
  buildProgramDescription({ ...short, level: "single-cycle", durationYears: 6 })
    .includes("Tek devre"),
);

console.log("[OK] Program metadata templates are Turkish, unique and within length budgets.");
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `node scripts/check-program-metadata.mjs`
Expected: FAIL — `ENOENT: lib/programMetadata.ts`.

- [ ] **Step 3: `lib/programMetadata.ts` dosyasını yaz**

Modül **saf** kalır (değer import'u yok; şehir çözücü parametre olarak gelir, böylece guard'ın `importTsModule`'ü dosyayı tek başına yükleyebilir):

```ts
const BRAND_SUFFIX = " | ItalyPath";
const TITLE_BRAND_BUDGET = 48;
const TITLE_SCHOOL_BUDGET = 68;
const DESCRIPTION_BUDGET = 155;

const LEVEL_TR: Record<ProgramMetadataInput["level"], string> = {
  bachelor: "Lisans",
  master: "Yüksek lisans",
  "single-cycle": "Tek devre",
};

export interface ProgramMetadataInput {
  programName: string;
  universityName: string;
  city: string;
  level: "bachelor" | "master" | "single-cycle";
  durationYears: number;
  languages: ("en" | "it")[];
  hasDossier: boolean;
}

export type CityResolver = (city: string) => string;

const defaultCityResolver: CityResolver = (city) => city.split("/")[0].trim();

function languageLabel(languages: ("en" | "it")[]) {
  const list = languages.length > 0 ? languages : ["en"];
  return list
    .map((entry) => (entry === "it" ? "İtalyanca" : "İngilizce"))
    .join(" / ");
}

function trimToBudget(value: string, budget: number) {
  if (value.length <= budget) return value;
  const cut = value.slice(0, budget);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : budget).trimEnd()}…`;
}

export function buildProgramTitle(
  input: ProgramMetadataInput,
  resolveCity: CityResolver = defaultCityResolver,
) {
  const program = input.programName.trim();
  const withSchool = `${program} — ${input.universityName.trim()}`;

  if (withSchool.length <= TITLE_BRAND_BUDGET) return `${withSchool}${BRAND_SUFFIX}`;
  if (withSchool.length <= TITLE_SCHOOL_BUDGET) return withSchool;

  const withCity = `${program} — ${resolveCity(input.city)}`;
  if (withCity.length <= TITLE_SCHOOL_BUDGET) return withCity;

  return trimToBudget(withCity, 100);
}

export function buildProgramDescription(
  input: ProgramMetadataInput,
  resolveCity: CityResolver = defaultCityResolver,
) {
  const head = `${input.universityName.trim()} · ${resolveCity(input.city)}. ${
    LEVEL_TR[input.level]
  } programı, ${input.durationYears} yıl, ${languageLabel(input.languages)}.`;

  const tail = input.hasDossier
    ? " Başvuru takvimi, kabul koşulları ve gerekli belgeler resmî kaynaklarla tek sayfada."
    : " Okul bilgileri ve resmî bağlantılar; kabul dosyası hazırlanıyor.";

  return trimToBudget(`${head}${tail}`, DESCRIPTION_BUDGET);
}
```

> Şehir çözümü neden parametre: `getCityGuideName` bir **değer** import'u olurdu ve guard'ın `data:` URL üzerinden yüklediği modülde `@/` yolu çözülemezdi. Parametre yaklaşımıyla modül saf kalır; `layout.tsx` gerçek `getCityGuideName`'i geçer, test varsayılan çözücüyle çalışır.

- [ ] **Step 4: Testin geçtiğini gör**

`package.json` scripts bloğuna ekle: `"check:program-metadata": "node scripts/check-program-metadata.mjs",`

Run: `npm run check:program-metadata`
Expected: PASS.

- [ ] **Step 5: `layout.tsx` içinde kullan**

```ts
import { getCityGuideName } from '@/lib/cities/normalization';
import { hasAdmissionDossier } from '@/lib/admissionPresence';
import { buildProgramDescription, buildProgramTitle } from '@/lib/programMetadata';

// ...
const input = {
    programName: department.name,
    universityName: university.name,
    city: university.city,
    level: department.level,
    durationYears: department.durationYears,
    languages: department.languages,
    hasDossier: hasAdmissionDossier(department),
};
const resolveCity = (city: string) => getCityGuideName(city) ?? city.split('/')[0].trim();
const title = buildProgramTitle(input, resolveCity);
const description = buildProgramDescription(input, resolveCity);

return {
    title,
    description,
    alternates: { canonical: `/universities/${resolvedParams.id}/departments/${resolvedParams.deptSlug}` },
    openGraph: {
        title: `${department.name} — ${university.name}`,
        description,
        url: `${BASE_URL}/universities/${resolvedParams.id}/departments/${resolvedParams.deptSlug}`,
        images: [university.image || DEFAULT_UNIVERSITY_IMAGE],
    },
};
```

Bulunamayan kayıt dalını da Türkçeleştir: `title: 'Program bulunamadı | ItalyPath'`, `description: 'Aradığınız program kaydı bulunamadı.'`. `getUniversityById(` literali dosyada kalmalı.

- [ ] **Step 6: 20 gerçek programda uzunluk kontrolü**

Geçici script ile (tmp/, commit yok) 20 farklı programın başlık ve açıklamasını yazdır; uzunlukları ve tekrar olup olmadığını kontrol et. Ölçüt: başlık ≤ 110, açıklama ≤ 160, iki sayfada birebir aynı çıktı yok.

- [ ] **Step 7: Guard'lar ve derleme**

Run: `npm run check:program-metadata && npm run check:university-data-source && npx tsc --noEmit && npx eslint app/universities/\[id\]/departments/\[deptSlug\]/layout.tsx lib/programMetadata.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/programMetadata.ts scripts/check-program-metadata.mjs package.json "app/universities/[id]/departments/[deptSlug]/layout.tsx"
git commit -m "feat(seo): Turkish unique title and description for program pages"
```

---

## DEPLOY 1 KONTROL NOKTASI (Task 1-3)

- [ ] `app/sitemap.ts:12` → `PAGE_TEMPLATE_LAST_MODIFIED` = deploy tarihi; commit: `chore(seo): bump page template date for program dossier layout`.
- [ ] Tüm guard'lar + `npx tsc --noEmit` + `npm run lint` yeşil.
- [ ] `npm run build` + `italypath-prod` önizlemesi; 3 sayfada ekran görüntüsü (Ca' Foscari / Bologna / dosyasız bir program).
- [ ] Kerem'e görünür değişikliklerin özeti + ekran görüntüleri; **açık "gönder" onayı** bekle.
- [ ] Push sonrası: production HTML'de künye ve Türkçe başlık; Kerem'den Search Console'da site haritasını yeniden gönderme.

---

## Task 4: Sayfa ağırlığı — prop budama ve görsel (İş 3, C+G)

**Files:**
- Modify: `app/universities/[id]/departments/[deptSlug]/page.tsx`
- Modify: `components/university-details/ProgramPortraitHeader.tsx:39-48`

**Interfaces:**
- Produces: `page.tsx` içinde `function pruneUniversityForProgram(university: University, deptSlug: string): University` — dönen nesnede yalnız açılan programın `admissionDetails`'i vardır; diğer programlarda alan silinir ve `hasAdmissionDetails` bayrağı doldurulur.
- Consumes: `hasAdmissionDossier` (`lib/admissionPresence.ts:4`).

- [ ] **Step 1: Ölçüm bazını al**

```bash
npm run build && npm run start &  # ya da italypath-prod önizlemesi
curl -s http://localhost:3000/universities/14/departments/<napoli-programi> | wc -c
curl -s http://localhost:3000/universities/9/departments/digital-and-public-humanities | wc -c
```
Değerleri not et (beklenen: Napoli sayfası birkaç yüz KB).

- [ ] **Step 2: Budama fonksiyonunu yaz**

`page.tsx` içinde, `notFound()` kontrollerinden sonra:

```ts
function pruneUniversityForProgram(university: University, deptSlug: string): University {
  return {
    ...university,
    departments: university.departments.map((entry) => {
      if (entry.slug === deptSlug) return entry;
      const light: Department = { ...entry, hasAdmissionDetails: hasAdmissionDossier(entry) };
      delete light.admissionDetails;
      return light;
    }),
  };
}
```

(`delete` kullanılıyor çünkü `const { admissionDetails, ...rest }` deseni kullanılmayan değişken için ESLint hatası verir.)

`DepartmentDetailClient`'a geçen prop:

```tsx
<DepartmentDetailClient
  initialUniversity={pruneUniversityForProgram(university, resolvedParams.deptSlug)}
  initialDepartmentSlug={resolvedParams.deptSlug}
  idFromUrl={resolvedParams.id}
  related={related}
/>
```

`initialUniversity`, `initialDepartmentSlug`, `buildRelatedLinks(`, `getUniversityById`, `if (!university) notFound();`, `if (!department) notFound();` literalleri korunur (guard `:85-94`).

- [ ] **Step 3: Görsel ayarını gözden geçir**

`ProgramPortraitHeader.tsx` içindeki `sizes="(min-width: 1024px) 48vw, 100vw"` değeri kolonun gerçek genişliğine göre düzeltilir (grid `minmax(360px,0.95fr)` → masaüstünde ~%46). `priority` kalır. `quality={70}` eklenir (varsayılan 75; Pexels fotoğrafında görsel kayıp yok).

- [ ] **Step 4: Ölçümü yinele ve doğrula**

Aynı üç URL için `wc -c` tekrar. Ölçüt: Napoli sayfası ≥ %70 küçülmüş; kabul paneli tarayıcıda **tam** görünüyor (dizin verisi ezmedi); `curl ... | grep -c "Intake"` sıfırdan büyük.

- [ ] **Step 5: Guard'lar**

Run: `npm run check:university-details-ui && npm run check:university-data-source && npm run check:seo-vitals && node scripts/check-universities-server-compose.mjs && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "app/universities/[id]/departments/[deptSlug]/page.tsx" components/university-details/ProgramPortraitHeader.tsx
git commit -m "perf(program): send only the current program's admission dossier to the client"
```

---

## Task 5: "Aynı alanda diğer üniversiteler" (İş 4, D)

**Files:**
- Modify: `types/universities.ts` (`Department`)
- Modify: `lib/universities.server.ts`
- Modify: `lib/relatedLinks.ts`
- Modify: `components/university-details/RelatedLinks.tsx`
- Modify: `lib/translations.ts`
- Modify: `scripts/check-university-data-source.mjs`, `scripts/check-universities-server-compose.mjs`, `scripts/check-university-detail-portrait.mjs`

**Interfaces:**
- Produces:
  - `Department.degreeClassCodes?: string[]`
  - `composeUniversitiesFromSupabaseRows(uniRows, deptRows, admissionRows = [], presenceIds?, degreeClassCodes?: Map<number, string[]>)`
  - `RelatedLinksData.sameFieldPrograms: { universityId: number; universityName: string; programName: string; href: string; code: string }[]`
- Consumes: `extractDegreeClassCodes` (Task 1).

- [ ] **Step 1: Compose testini yaz**

`scripts/check-universities-server-compose.mjs` içindeki dizin çağrısına 5. parametre ekle ve üç durumu doğrula:

```js
const directoryWithCodes = composeUniversitiesFromSupabaseRows(
  universityRows,
  departmentRows,
  [],
  new Map([[10, "2026-06-02T12:46:31.193Z"]]),
  new Map([[10, ["LM-41"]]]),
);
assert.deepEqual(directoryWithCodes[0].departments[0].degreeClassCodes, ["LM-41"]);
assert.equal(directoryWithCodes[0].departments[1].degreeClassCodes, undefined);
assert.equal(directoryWithCodes[0].departments[0].admissionDetails, undefined);
assert.equal(directoryWithCodes[0].departments[0].hasAdmissionDetails, true);
```

Mevcut 4 parametreli çağrılar ve `:133-138` iddiaları **değişmeden** kalır.

- [ ] **Step 2: Veri kaynağı guard'ına yeni sözleşmeyi yaz**

`scripts/check-university-data-source.mjs` içine ekle (mevcut `.select("department_id,updated_at")` iddiası **silinmez**):

```js
if (!universitiesServerData.includes('.select("department_id,degree_class")')) {
  fail('lib/universities.server.ts directory must fetch degree class codes with a separate select("department_id,degree_class") query');
}
if (!universitiesServerData.includes("extractDegreeClassCodes")) {
  fail("lib/universities.server.ts must normalize degree class values with extractDegreeClassCodes");
}
```

- [ ] **Step 3: Guard'ların başarısız olduğunu gör**

Run: `node scripts/check-universities-server-compose.mjs; npm run check:university-data-source`
Expected: ikisi de FAIL.

- [ ] **Step 4: Sunucu tarafını yaz**

`lib/universities.server.ts`:

`fetchAdmissionPresence` (satır 281-307) deseni birebir taklit edilir — aynı sayfalama döngüsü, aynı sabit (`PROGRAM_ADMISSION_DETAIL_PAGE_SIZE`), aynı hata mesajı biçimi:

```ts
interface AdmissionDegreeClassRow {
  department_id: number | null;
  degree_class: string | null;
}

// Dizin icin yalnizca resmi bolum sinifi kodu cekilir (agir metinler asla).
async function fetchAdmissionDegreeClasses(): Promise<Map<number, string[]>> {
  const supabase = createReadOnlySupabaseClient();
  const codesByDepartment = new Map<number, string[]>();

  for (let from = 0; ; from += PROGRAM_ADMISSION_DETAIL_PAGE_SIZE) {
    const to = from + PROGRAM_ADMISSION_DETAIL_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("program_admission_details")
      .select("department_id,degree_class")
      .order("department_id", { ascending: true })
      .range(from, to)
      .returns<AdmissionDegreeClassRow[]>();

    if (error) {
      throw new Error(
        `Failed to fetch program degree classes from Supabase: ${error.message}`,
      );
    }

    const page = data ?? [];
    for (const row of page) {
      if (typeof row.department_id !== "number") continue;
      const codes = extractDegreeClassCodes(row.degree_class ?? undefined);
      if (codes.length > 0) codesByDepartment.set(row.department_id, codes);
    }

    if (page.length < PROGRAM_ADMISSION_DETAIL_PAGE_SIZE) break;
  }

  return codesByDepartment;
}
```

`getUniversitiesDirectory()` bu sorguyu presence sorgusuyla **birlikte** `Promise.all` içinde çalıştırır ve sonucu compose'un 5. parametresi olarak geçer. Memo/single-flight/stale-on-error yapısı aynı kalır; `SERVER_CACHE_TTL_MS` değişmez.

`composeUniversitiesFromSupabaseRows` 5. parametreyi alır ve `createDepartment` çıktısına yalnız kod varsa `degreeClassCodes` ekler. `getUniversityById` yolunda kodlar programın kendi `admissionDetails.degreeClass` değerinden hesaplanır (ek sorgu yok).

- [ ] **Step 5: Link hesabını yaz**

`lib/relatedLinks.ts` içinde `SAME_FIELD_LIMIT = 6`:

```ts
function buildSameFieldPrograms(
  university: University,
  department: Department,
  directory: University[],
) {
  const codes = new Set(department.degreeClassCodes ?? []);
  if (codes.size === 0) return [];

  const matches = directory
    .filter((entry) => entry.id !== university.id)
    .flatMap((entry) =>
      entry.departments
        .filter((dept) => (dept.degreeClassCodes ?? []).some((code) => codes.has(code)))
        .map((dept) => ({
          universityId: entry.id,
          universityName: entry.name,
          programName: dept.name,
          href: `/universities/${entry.id}/departments/${dept.slug}`,
          code: (dept.degreeClassCodes ?? []).find((code) => codes.has(code)) ?? "",
          hasDossier: hasAdmissionDossier(dept),
          programCount: entry.departments.length,
        })),
    )
    .sort((a, b) =>
      Number(b.hasDossier) - Number(a.hasDossier) ||
      b.programCount - a.programCount ||
      a.universityName.localeCompare(b.universityName, "tr"),
    );

  const seen = new Set<number>();
  return matches
    .filter((match) => (seen.has(match.universityId) ? false : seen.add(match.universityId)))
    .slice(0, SAME_FIELD_LIMIT)
    .map(({ hasDossier: _hasDossier, programCount: _programCount, ...rest }) => rest);
}
```

Okul başına en fazla bir program gösterilir (aynı okuldan 6 satır değil). `buildRelatedLinks` imzası `buildRelatedLinks(university, directory, department?)` olur; program sayfası `department`'ı geçer, üniversite sayfası geçmez (o sayfada bölüm yok).

- [ ] **Step 6: UI'ı yaz**

`RelatedLinks.tsx` içinde sol kolonun altına yeni blok: başlık `labels.sameField` (`"Aynı alanda diğer üniversiteler"` / `"Other universities in the same field"`), her satır `{programName} · {universityName}` ve sağda kod (`LM-32`) küçük punto. Liste boşsa blok render edilmez. Yeni çeviri anahtarları TR/EN paralel eklenir: `related.sameField`, `related.sameFieldNote` (`"Resmî bölüm sınıfı koduna göre eşleştirildi."`).

`scripts/check-university-detail-portrait.mjs` literal listesine `sameField` eklenir.

- [ ] **Step 7: Guard'lar ve yerel doğrulama**

Run:
```bash
node scripts/check-universities-server-compose.mjs && npm run check:university-data-source && npm run check:university-details-ui && npx tsc --noEmit
```
Ardından `npm run build` + önizleme: LM-32 kodlu bir programda (ör. Ca' Foscari) blok görünüyor, kodu olmayan bir programda görünmüyor, linkler 200 dönüyor. Supabase edge loglarında `select=department_id,degree_class` isteği **3 saatte bir** (memo) görünüyor.

- [ ] **Step 8: Commit**

```bash
git add types/universities.ts lib/universities.server.ts lib/relatedLinks.ts components/university-details/RelatedLinks.tsx lib/translations.ts scripts/
git commit -m "feat(program): link programs in the same official degree class across universities"
```

---

## DEPLOY 2 KONTROL NOKTASI (Task 4-5)

- [ ] `PAGE_TEMPLATE_LAST_MODIFIED` güncellenir (görünür yeni blok var).
- [ ] Guard'lar + `tsc` + lint yeşil; HTML boyutu önce/sonra tablosu hazır.
- [ ] Ekran görüntüsü + Kerem onayı → push.
- [ ] Push sonrası: `x-vercel-cache` kontrolü, Supabase Usage'da günlük egress (~30 MB bazı) bozulmadı mı.

---

## Task 6: Kabul dosyası olmayan 108 program (İş 5, E)

**Files:**
- Modify: `app/universities/[id]/departments/[deptSlug]/layout.tsx`
- Modify: `app/sitemap.ts`
- Modify: `components/university-details/ComingSoonNotice.tsx`
- Modify: `lib/translations.ts`
- Modify: `scripts/check-seo-vitals.mjs`

**Interfaces:**
- Consumes: `hasAdmissionDossier`, Task 3'ün metadata fonksiyonları.
- Produces: sitemap'te yalnız dosyalı program URL'leri; dosyasız sayfalarda `robots: { index: false, follow: true }`.

- [ ] **Step 1: Guard iddiasını yaz**

`scripts/check-seo-vitals.mjs` sonuna:

```js
const sitemapSource = readFileSync("app/sitemap.ts", "utf8");
if (!sitemapSource.includes("hasAdmissionDossier")) {
  fail("app/sitemap.ts must exclude programs without an admission dossier (hasAdmissionDossier)");
}
const programLayout = readFileSync(
  "app/universities/[id]/departments/[deptSlug]/layout.tsx",
  "utf8",
);
if (!programLayout.includes("index: false")) {
  fail("program layout must set robots index:false when the program has no admission dossier");
}
```

(Dosyadaki mevcut `fail`/okuma yardımcılarını kullan.)

- [ ] **Step 2: Başarısız olduğunu gör**

Run: `npm run check:seo-vitals`
Expected: FAIL — sitemap iddiası.

- [ ] **Step 3: Metadata ve sitemap'i yaz**

`layout.tsx` dönüşüne ekle:

```ts
        ...(input.hasDossier ? {} : { robots: { index: false, follow: true } }),
```

`app/sitemap.ts`:

```ts
import { hasAdmissionDossier } from '@/lib/admissionPresence';
// ...
const departmentRoutes: MetadataRoute.Sitemap = universities.flatMap((uni) =>
  uni.departments
    .filter((dept) => hasAdmissionDossier(dept))
    .map((dept) => ({ /* mevcut nesne aynen */ })),
);
```

`/on-gorusme` ve statik rotalar dokunulmaz; `universitiesData` dizesi kullanılmaz.

- [ ] **Step 4: Dosyasız sayfayı faydalı hâle getir**

`ComingSoonNotice` metni dürüst ve yol gösterici olur; TR:

```ts
      detailsComingSoonTitle: "Kabul dosyası hazırlanıyor",
      detailsComingSoonBody:
        "Bu programın başvuru takvimi ve kabul koşulları henüz resmî kaynaklardan doğrulanmadı. Okulun resmî sayfasından güncel duyuruyu görebilir, aşağıdaki araçlarla planını yapabilirsin.",
```

Bileşene okul sitesi linki eklenir (`university.website`, `t.detail.visitSite`). `DepartmentDetailClient` dosyasız dalda da `ProgramNextSteps`/`ConsultPrompt`, `ProgramDirectory` ve `RelatedLinks` render etmeye devam eder (bugün de ediyor).

- [ ] **Step 5: Doğrula**

```bash
npm run check:seo-vitals && npx tsc --noEmit && npm run build
curl -s http://localhost:3000/sitemap.xml | grep -c "<url>"     # beklenen 971 = 7 statik + 64 okul + 900 dosyalı program
curl -s http://localhost:3000/universities/<id>/departments/<dosyasiz-slug> | grep -i "noindex"
curl -s http://localhost:3000/universities/9/departments/digital-and-public-humanities | grep -ci "noindex"  # 0 olmalı
```
Ölçüt: dosyasız sayfada `noindex` var ve sitemap'te yok; dosyalı sayfa etkilenmemiş.

- [ ] **Step 6: Commit**

```bash
git add "app/universities/[id]/departments/[deptSlug]/layout.tsx" app/sitemap.ts components/university-details/ComingSoonNotice.tsx components/university-details/DepartmentDetailClient.tsx lib/translations.ts scripts/check-seo-vitals.mjs
git commit -m "feat(seo): keep dossier-less programs useful but out of the index and sitemap"
```

---

## Task 7: "Sonraki adımlar" bölümü (İş 6, I)

**Files:**
- Create: `components/university-details/ProgramNextSteps.tsx`
- Modify: `components/university-details/DepartmentDetailClient.tsx`
- Modify: `components/university-details/RelatedLinks.tsx` (şehir/burs linklerinin çıkarılması)
- Modify: `lib/translations.ts`
- Modify: `scripts/check-university-detail-portrait.mjs`

**Interfaces:**
- Produces: `ProgramNextSteps({ related, labels, consult }): JSX` — ISEE, şehir rehberi, bölge bursu satırları + içinde `ConsultPrompt`.
- Consumes: `RelatedLinksData.cityGuide`, `.regionScholarships` (Task 5 sonrası aynı alanlar), `CONSULT_PAGE_PATH` dolaylı olarak `ConsultPrompt` üzerinden.

- [ ] **Step 1: Guard literallerini ekle (test önce)**

`scripts/check-university-detail-portrait.mjs`: `portraitFiles`'a `components/university-details/ProgramNextSteps.tsx`; literal listesine `nextStepsTitle` ve `ProgramNextSteps`.

Run: `npm run check:university-details-ui` → FAIL (dosya yok).

- [ ] **Step 2: Bileşeni yaz**

```tsx
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import ConsultPrompt from "@/components/consultation/ConsultPrompt";
import type { RelatedLinksData } from "@/lib/relatedLinks";

export function ProgramNextSteps({
  related,
  labels,
  consult,
}: {
  related: RelatedLinksData | null;
  labels: { title: string; isee: string; cityGuide: string; regionScholarships: string };
  consult: { eyebrow: string; title: string; body: string; cta: string };
}) {
  const links = [
    { href: "/isee", label: labels.isee },
    related?.cityGuide
      ? { href: related.cityGuide.href, label: labels.cityGuide.replace("{city}", related.cityGuide.name) }
      : null,
    related?.regionScholarships
      ? {
          href: related.regionScholarships.href,
          label: labels.regionScholarships.replace("{region}", related.regionScholarships.name),
        }
      : null,
  ].filter((link): link is { href: string; label: string } => link !== null);

  return (
    <section
      aria-labelledby="program-next-steps-title"
      className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]"
    >
      <header className="border-b border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 py-3 sm:px-5">
        <h2
          id="program-next-steps-title"
          className="text-xs font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]"
        >
          {labels.title}
        </h2>
      </header>
      <ul className="grid gap-3 px-4 py-4 sm:grid-cols-3 sm:px-5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[var(--editorial-terracotta-ink)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
            >
              {link.label}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <ConsultPrompt {...consult} />
    </section>
  );
}
```

`DepartmentDetailClient` içindeki çağrı (hem dosyalı hem dosyasız dalda, `<main>` sırasının 5. öğesi):

```tsx
<ProgramNextSteps
  related={related}
  labels={t.department.nextSteps}
  consult={{ ...t.consultPrompt.program, cta: t.consultPrompt.cta }}
/>
```

`t.consultPrompt.program` ve `<ConsultPrompt` literalleri böylece dosyalarda kalır (`scripts/check-home-consultation.mjs:80-87`).

- [ ] **Step 3: Metinleri yumuşat ve yeni anahtarları ekle**

`lib/translations.ts` TR:

```ts
      nextSteps: {
        title: "Sonraki adımlar",
        isee: "ISEE ile burs ve harç durumunu hesapla",
        cityGuide: "{city} şehir rehberi",
        regionScholarships: "{region} bölge bursları",
      },
```

`consultPrompt.program` metni seçenek tonuna çekilir:

```ts
      program: {
        eyebrow: "Ücretsiz ön görüşme",
        title: "Kendi başına ilerleyebilirsin",
        body: "Takıldığın bir yer olursa kabul koşullarını, belgeleri ve takvimi ücretsiz ön görüşmede birlikte netleştirebiliriz.",
      },
```

EN karşılıkları paralel yazılır.

- [ ] **Step 4: `RelatedLinks`'ten şehir ve burs linklerini çıkar**

`RelatedLinks` üniversite sayfasıyla **paylaşılan** bileşen olduğu için satırlar silinmez, prop ile kapatılır:

```tsx
interface RelatedLinksProps {
  data: RelatedLinksData;
  labels: RelatedLinksLabels;
  /** Program sayfasında şehir/burs linkleri "Sonraki adımlar" bölümünde durur; burada tekrar edilmez. */
  showHubLinks?: boolean;
}

export function RelatedLinks({ data, labels, showHubLinks = true }: RelatedLinksProps) {
  const hubLinks = showHubLinks ? [/* mevcut cityGuide + regionScholarships mantığı */] : [];
  // ...
}
```

Program sayfası `<RelatedLinks data={related} labels={t.related} showHubLinks={false} />` çağırır; `UniversityDetailClient` çağrısı **değişmez** (varsayılan `true`). `related.*` çeviri anahtarları silinmez. Boşluk kontrolü: `sameCityUniversities`, `sameFieldPrograms` ve `hubLinks` üçü de boşsa bileşen `null` döner.

- [ ] **Step 5: Doğrula**

Run: `npm run check:university-details-ui && npm run check:home-consultation && npm run check:routes && npx tsc --noEmit && npm run build`
Tarayıcıda: bölüm görünüyor, üç link çalışıyor, ön görüşme kutusu bölümün içinde ve tek; şehri rehberde olmayan bir okulda (ör. `Piemonte`) ilgili satır yok, bölüm yine açılıyor. Üniversite detay sayfasında şehir/burs linkleri hâlâ yerinde.

- [ ] **Step 6: Commit**

```bash
git add components/university-details lib/translations.ts scripts/check-university-detail-portrait.mjs
git commit -m "feat(program): offer next steps (ISEE, city guide, scholarships, consultation) as one block"
```

---

## DEPLOY 3 KONTROL NOKTASI (Task 6-7)

- [ ] `PAGE_TEMPLATE_LAST_MODIFIED` güncellenir.
- [ ] Sitemap URL sayısı 1.079 → ~971; Kerem'e neden düştüğü açıkça anlatılır.
- [ ] Ekran görüntüsü + Kerem onayı → push; ardından Search Console'da site haritası yeniden gönderilir.

---

## Task 8: Erişilebilirlik turu (İş 7, H)

**Files:** değişiklikler bulgulara göre `components/university-details/*` içinde.

- [ ] **Step 1: Ölçüm**

```bash
npx --yes lighthouse@12 "http://localhost:3000/universities/9/departments/digital-and-public-humanities" \
  --only-categories=accessibility --throttling-method=devtools --output=json --output-path=tmp/a11y-before.json \
  --chrome-flags="--headless=new"
```
Bulguları listele (beklenenler: `heading-order`, `label-content-name-mismatch`, dokunma hedefi, `aria-expanded` eksikleri).

- [ ] **Step 2: Başlık hiyerarşisini düzelt**

Yeni bölümlerde sıra: sayfa `h1` (program adı) → bölüm `h2` (künye, kabul dosyası, sonraki adımlar, kaynak izi, diğer programlar, ilgili bağlantılar) → alt bölüm `h3` → alan başlığı `h4`. `DossierSectionTitle` `h3` kalır; künye başlığı `h2` olur.

- [ ] **Step 3: Link adlarını ve dokunma hedeflerini düzelt**

`aria-label` taşıyan her linkte görünen metin `aria-label` içinde geçmeli. Tüm tıklanabilir alanlar `min-h-11`.

- [ ] **Step 4: Ölçümü yinele**

Aynı komut `tmp/a11y-after.json`. Ölçüt: erişilebilirlik ≥ 95, `color-contrast` bulgusu 0.

- [ ] **Step 5: Commit**

```bash
git add components/university-details
git commit -m "fix(a11y): heading order, link names and touch targets on program pages"
```

---

## Task 9: Yapılandırılmış veri (İş 8, F)

**Files:**
- Modify: `app/universities/[id]/departments/[deptSlug]/page.tsx`

- [ ] **Step 1: JSON-LD'yi yaz**

Yalnız dosyalı programlarda, breadcrumb JSON-LD'nin yanına ikinci bir script:

```ts
const programJsonLd = hasAdmissionDossier(department)
  ? {
      "@context": "https://schema.org",
      "@type": "EducationalOccupationalProgram",
      name: department.name,
      url: `${BASE_URL}/universities/${resolvedParams.id}/departments/${resolvedParams.deptSlug}`,
      provider: { "@type": "Organization", name: university.name },
      inLanguage: department.languages.map((entry) => (entry === "it" ? "it" : "en")),
      timeToComplete: `P${department.durationYears}Y`,
      educationalProgramMode: "full-time",
    }
  : null;
```

Son tarih, ücret ve kabul koşulu alanları **eklenmez** (doğrulanmış tek değer yok).

- [ ] **Step 2: Doğrula**

`npm run check:seo-vitals && npx tsc --noEmit && npm run build`; sunucu HTML'inde iki JSON-LD (`grep -c application/ld+json` → 2, kök layout'takilerle birlikte 4). Rich Results Test ile canlıda doğrula (deploy sonrası).

- [ ] **Step 3: Commit**

```bash
git add "app/universities/[id]/departments/[deptSlug]/page.tsx"
git commit -m "feat(seo): add EducationalOccupationalProgram schema with verified fields only"
```

---

## DEPLOY 4 KONTROL NOKTASI (Task 8-9)

- [ ] Görünür içerik değişmedi → `PAGE_TEMPLATE_LAST_MODIFIED` **güncellenmez**.
- [ ] Guard'lar + `tsc` + lint yeşil; Kerem onayı → push.
- [ ] `SEO_AUDIT.md` §23 olarak turun tamamı kaydedilir: yapılanlar, ölçümler (HTML boyutu, erişilebilirlik, sitemap URL sayısı), açık kalanlar (İş 9 / J, Türkçe cümle özetleri, tıklama ölçümü).

---

## Kapsam dışı (bu planda yok)

- İş 9 (J): program sayfasının yalnız kendi kabul satırını çekmesi. Trafik büyürse ayrı iş.
- Türkçe cümle özetleri (çevrim dışı LLM toplu üretimi) ve son tarih/sınav alan çıkarımı — Kerem 17 Eylül'de kapsam dışı bıraktı.
- Ön görüşme tıklama ölçümü — Vercel Hobby planında özel olay yok.
- Font diyeti, Clerk JS diyeti, şehir/bölge için gerçek adresli sayfalar, üniversite liste ve ana sayfa.
