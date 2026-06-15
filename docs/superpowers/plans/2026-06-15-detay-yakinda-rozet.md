# "Detay Yakında" Rozeti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Üniversite detay sayfasındaki program listesinde `admissionDetails` boş olan satırlara "Detay yakında" rozeti, program detay sayfasında ise panelin yerine boş durum kartı koy.

**Architecture:** Tek koşul kaynağı `Department.admissionDetails`. Veri/şema değişikliği yok. Yeni bir `ComingSoonNotice` sunum bileşeni eklenir; `ProgramTransitionEntry` ve department page koşullu render eder. Üç çeviri anahtarı eklenir.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 (CSS variables, no config), TypeScript, mevcut editorial palet.

**Spec:** `docs/superpowers/specs/2026-06-15-detay-yakinda-rozet-design.md`

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `lib/translations.ts` | Modify | TR/EN paralel 3 yeni anahtar (`programDirectory.detailComingSoon`, `department.detailsComingSoonTitle`, `department.detailsComingSoonBody`) |
| `components/university-details/ComingSoonNotice.tsx` | Create | Sunum bileşeni: başlık + gövde, editorial kart stili |
| `components/university-details/ProgramTransitionEntry.tsx` | Modify | `admissionDetails` boşsa ok yerine "Detay yakında" pill render |
| `app/universities/[id]/departments/[deptSlug]/page.tsx` | Modify | Panel yoksa `ComingSoonNotice` göster |
| `scripts/check-university-detail-portrait.mjs` | Modify | Yeni bileşen ve çeviri kullanımını smoke test'e ekle |

---

## Task 1: Çeviri anahtarlarını ekle

**Files:**
- Modify: `lib/translations.ts`

`programDirectory.detailComingSoon` mevcut `tr.detail` ve `en.detail` bloklarındaki `programDirectory` anahtarının yanına eklenmez — onlar tek string, yapı `string` değil "string sentinel". Bunun yerine: `t.detail.openingProgram` ve benzerleriyle aynı seviyede yeni `detailComingSoon` anahtarı, ayrıca `department` bloğunda `detailsComingSoonTitle` ve `detailsComingSoonBody`.

- [ ] **Step 1: Mevcut TR `detail` bloğunu aç**

`lib/translations.ts` dosyasında satır 78 civarındaki TR `openingProgram` satırının ALTINA ekle:

```ts
      openingProgram: "Program açılıyor...",
      detailComingSoon: "Detay yakında",
    },
```

- [ ] **Step 2: TR `department` bloğuna iki yeni anahtar ekle**

`lib/translations.ts` dosyasında satır 437 civarındaki TR `mentorBody: "Program uyumu, ..."` satırının ALTINA ekle:

```ts
      mentorBody: "Program uyumu, belgeler veya başvuru adımlarını birlikte netleştir.",
      detailsComingSoonTitle: "Kabul detayları yakında",
      detailsComingSoonBody:
        "Bu programın resmi başvuru bilgileri eklendikçe burada görünecek. Şimdilik üstteki temel bilgileri kullanabilirsin.",
    },
```

- [ ] **Step 3: EN `detail` bloğuna `detailComingSoon` ekle**

`lib/translations.ts` dosyasında EN `detail` bloğundaki `programDirectory: "Program Directory"` satırının olduğu blokta (satır 596 civarı), TR ile birebir aynı pozisyona — EN `openingProgram` satırının altına — ekle:

```ts
      openingProgram: "Opening program...",
      detailComingSoon: "Details coming soon",
    },
```

(Eğer EN tarafında `openingProgram` yoksa, en yakın benzer satırın altına koy; lint/tsc anahtar eşleşmesi olmazsa kırılır.)

- [ ] **Step 4: EN `department` bloğuna iki yeni anahtar ekle**

`lib/translations.ts` dosyasında satır 959 civarındaki EN `mentorBody` satırının altına ekle:

```ts
      mentorBody: "Align program fit, documents, and application steps together.",
      detailsComingSoonTitle: "Admission details coming soon",
      detailsComingSoonBody:
        "Official admission information for this program will appear here as it is added. For now, you can rely on the basics above.",
    },
```

- [ ] **Step 5: TypeScript ve lint doğrulaması**

Komut:

```bash
npx tsc --noEmit && npm run lint
```

Beklenen: sıfır hata. TR/EN anahtar seti eşleşmiyorsa TypeScript yapısal hata verir — anahtarları her iki tarafta da eklediğinden emin ol.

- [ ] **Step 6: Commit**

```bash
git add lib/translations.ts
git commit -m "i18n: add 'detail coming soon' keys for program list + page"
```

---

## Task 2: `ComingSoonNotice` bileşenini oluştur

**Files:**
- Create: `components/university-details/ComingSoonNotice.tsx`

- [ ] **Step 1: Dosyayı oluştur**

```tsx
interface ComingSoonNoticeProps {
  title: string;
  body: string;
}

export function ComingSoonNotice({ title, body }: ComingSoonNoticeProps) {
  return (
    <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-5 py-6 sm:px-7 sm:py-8">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
        {title}
      </p>
      <p className="mt-3 max-w-3xl font-serif text-xl leading-8 text-[var(--editorial-ink)] sm:text-2xl sm:leading-9">
        {body}
      </p>
    </section>
  );
}
```

Notlar:
- Saf sunum bileşeni; `"use client"` direktifi yok (server-friendly).
- `ProgramAdmissionDetailsPanel`'in dış kabuğuyla (editorial border + surface) uyumlu.
- Eyebrow + serif body — sayfanın "Okul Bağlamı" bölümüyle aynı ritim.

- [ ] **Step 2: Build doğrulaması**

Komut:

```bash
npx tsc --noEmit
```

Beklenen: sıfır hata.

- [ ] **Step 3: Commit**

```bash
git add components/university-details/ComingSoonNotice.tsx
git commit -m "feat: add ComingSoonNotice editorial empty state card"
```

---

## Task 3: `ProgramTransitionEntry` — koşullu rozet

**Files:**
- Modify: `components/university-details/ProgramTransitionEntry.tsx`

- [ ] **Step 1: Çeviri tüketimi için prop ekle**

Bileşen şu an `openingLabel: string` prop'u alıyor. `comingSoonLabel: string` prop'unu ekle. Interface:

```tsx
interface ProgramTransitionEntryProps {
  university: University;
  department: Department;
  openingLabel: string;
  comingSoonLabel: string;
  expanding: boolean;
  onSelect: (slug: string) => void;
}
```

Fonksiyon parametre listesine `comingSoonLabel` ekle.

- [ ] **Step 2: `ArrowRight` import'unun yanında değişiklik yok; render bloğunu koşullu yap**

`<ArrowRight className="..." />` satırını şununla değiştir:

```tsx
{department.admissionDetails ? (
  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--editorial-terracotta)]" />
) : (
  <span className="shrink-0 rounded-full border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
    {comingSoonLabel}
  </span>
)}
```

- [ ] **Step 3: `ProgramDirectory.tsx` — `comingSoonLabel` prop'unu zincirle**

`components/university-details/ProgramDirectory.tsx` içinde:

`ProgramDirectoryProps` interface'ine ekle:

```ts
comingSoonLabel: string;
```

`ProgramDirectory` fonksiyon parametrelerine ekle, alt `ProgramGroup` çağrılarına geçir:

```tsx
<ProgramGroup
  university={university}
  departments={bachelorDepartments}
  label={bachelorPrograms}
  openingLabel={openingLabel}
  comingSoonLabel={comingSoonLabel}
  expandingSlug={expandingSlug}
  onSelect={onSelect}
/>
```

(Aynısı master ve singleCycle için.)

`ProgramGroup` iç fonksiyon imzasına `comingSoonLabel: string` ekle ve `<ProgramTransitionEntry ... comingSoonLabel={comingSoonLabel} />` olarak geçir.

- [ ] **Step 4: `app/universities/[id]/page.tsx` — `ProgramDirectory` çağrısına prop geçir**

Mevcut çağrıyı bul:

```bash
grep -n "ProgramDirectory" app/universities/\[id\]/page.tsx
```

`openingLabel={t.detail.openingProgram}` satırının yanına ekle:

```tsx
comingSoonLabel={t.detail.detailComingSoon}
```

- [ ] **Step 5: TypeScript + lint**

```bash
npx tsc --noEmit && npm run lint
```

Beklenen: sıfır hata. Eksik prop kalmışsa TS yakalar.

- [ ] **Step 6: Commit**

```bash
git add components/university-details/ProgramTransitionEntry.tsx components/university-details/ProgramDirectory.tsx app/universities/\[id\]/page.tsx
git commit -m "feat: show 'Detay yakında' badge for programs without admission details"
```

---

## Task 4: Department page — boş durum kartını bağla

**Files:**
- Modify: `app/universities/[id]/departments/[deptSlug]/page.tsx`

- [ ] **Step 1: Import ekle**

Dosyanın tepesinde mevcut `ProgramAdmissionDetailsPanel` import'unun yanına ekle:

```tsx
import { ComingSoonNotice } from "@/components/university-details/ComingSoonNotice";
```

- [ ] **Step 2: Koşullu render'i değiştir**

Mevcut blok (satır 152-177):

```tsx
{department.admissionDetails ? (
  <ProgramAdmissionDetailsPanel
    details={department.admissionDetails}
    labels={{ ... }}
  />
) : null}
```

Şuna dönüştür:

```tsx
{department.admissionDetails ? (
  <ProgramAdmissionDetailsPanel
    details={department.admissionDetails}
    labels={{
      title: t.department.admissionDetails,
      officialProgramPage: t.department.officialProgramPage,
      officialCall: t.department.officialCall,
      tuitionFees: t.department.tuitionFees,
      campus: t.department.campus,
      degreeClass: t.department.degreeClass,
      admissionType: t.department.admissionType,
      teachingLanguage: t.department.teachingLanguage,
      euDeadline: t.department.euDeadline,
      nonEuDeadline: t.department.nonEuDeadline,
      academicRequirements: t.department.academicRequirements,
      languageRequirements: t.department.languageRequirements,
      requiredDocuments: t.department.requiredDocuments,
      entryExamOrTest: t.department.entryExamOrTest,
      uncertaintyNote: t.department.uncertaintyNote,
      uncertainFields: t.department.uncertainFields,
      uncertaintyNotes: t.department.uncertaintyNotes,
      officialSources: t.department.officialSources,
      officialSource: t.department.officialSource,
    }}
  />
) : (
  <ComingSoonNotice
    title={t.department.detailsComingSoonTitle}
    body={t.department.detailsComingSoonBody}
  />
)}
```

(Mevcut `labels` blok aynen korunur; sadece `null` yerine `ComingSoonNotice` gelir.)

- [ ] **Step 3: TypeScript + lint**

```bash
npx tsc --noEmit && npm run lint
```

Beklenen: sıfır hata.

- [ ] **Step 4: Commit**

```bash
git add app/universities/\[id\]/departments/\[deptSlug\]/page.tsx
git commit -m "feat: show coming-soon notice when program has no admission details"
```

---

## Task 5: Smoke testi sıkılaştır

**Files:**
- Modify: `scripts/check-university-detail-portrait.mjs`

- [ ] **Step 1: `portraitFiles` listesine `ComingSoonNotice` ekle**

`portraitFiles` dizisine ekle:

```js
"components/university-details/ComingSoonNotice.tsx",
```

- [ ] **Step 2: `program detail` `requireTokens` listesine kontrol ekle**

`requireTokens("program detail", programPage, [ ... ])` çağrısının token dizisine ekle:

```js
"ComingSoonNotice",
"detailsComingSoonTitle",
"detailsComingSoonBody",
```

- [ ] **Step 3: `university detail` `requireTokens` listesine `comingSoonLabel` kontrolü ekle**

`requireTokens("university detail", universityPage, [ ... ])` token dizisine ekle:

```js
"comingSoonLabel={t.detail.detailComingSoon}",
```

- [ ] **Step 4: Smoke test'i çalıştır**

```bash
npm run check:university-details-ui
```

Beklenen: `OK` veya hata mesajı yok. Eksik token raporlanırsa ilgili dosyayı düzelt.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-university-detail-portrait.mjs
git commit -m "test: extend university-details smoke check for ComingSoonNotice"
```

---

## Task 6: Tarayıcıda manuel doğrulama

**Files:** (yok — sadece koşum + gözlem)

- [ ] **Step 1: Dev server'ı başlat**

Mevcut bir preview yoksa `preview_start` ile aç. Uyarı: Vercel Web Analytics yüklü; konsol uyarısı normal.

- [ ] **Step 2: `admissionDetails` dolu bir program bulan üniversite**

Bocconi (yakın zamanda admission details import'u yapılmıştı) güvenli bir aday. URL: `/universities/<bocconi-id>`. Listede dolu programların sağında **terracotta ok** olduğunu gör. Programa tıkla → admission paneli görünüyor.

`preview_snapshot` ile DOM kontrolü:
- Liste satırında `ArrowRight` SVG'si var.
- Detay sayfasında `Başvuru Detayları` başlığı var.

- [ ] **Step 3: `admissionDetails` boş bir program**

Aynı üniversitede veya başka birinde import edilmemiş bir program bul. Listede sağda **"Detay yakında"** pill'i görünmeli, ok olmamalı.

`preview_snapshot` ile DOM kontrolü:
- Listede `Detay yakında` metni var.
- Aynı satırda `ArrowRight` SVG yok.

Programa tıkla → detay sayfasında `Kabul detayları yakında` başlığı + body görünmeli.

- [ ] **Step 4: Mobil viewport (375px)**

```
preview_resize 375x812
```

Liste satırında pill taşmıyor; uzun program adı satırı (örn. "Languages, Cultures and Societies of Asia and Mediterranean Africa") iki satıra kırılıyor ama pill sağda duruyor.

- [ ] **Step 5: Dil değişimi**

Navbar veya hub'dan EN'e geçir. Aynı iki sayfada metinler:
- Liste: `Details coming soon`
- Detay sayfası başlığı: `Admission details coming soon`
- Body: `Official admission information ...`

- [ ] **Step 6: Konsol/network temiz**

`preview_console_logs` ve `preview_network` ile son ekranda hata yok.

- [ ] **Step 7: Görsel kanıt al**

`preview_screenshot` ile iki ekranı kaydet:
1. Liste — hem ok hem pill içeren bir üniversite sayfası.
2. Detay sayfası — `Kabul detayları yakında` boş durum.

- [ ] **Step 8: Commit gerekmez**

Bu task sadece doğrulama; kod değişikliği yok.

---

## Task 7: Final build ve özet

- [ ] **Step 1: Production build temiz mi?**

```bash
npm run build
```

Beklenen: build hata yok. (Supabase env eksikse build hata verebilir — `.env.local` mevcut olmalı; PR senaryosunda CI çalıştırır.)

- [ ] **Step 2: Tüm ilgili smoke kontrolleri**

```bash
npm run lint && npm run check:university-details-ui && npm run check:editorial-ui
```

Beklenen: hepsi başarılı.

- [ ] **Step 3: Branch durumu özeti**

```bash
git status && git log --oneline -10
```

Yeni 5 commit (i18n, ComingSoonNotice, badge, page wiring, smoke test) ana branch'in üstünde olmalı.

---

## Self-Review Notları

**Spec coverage:**
- Spec §5.1 (liste rozet) → Task 3
- Spec §5.2 (ComingSoonNotice) → Task 2
- Spec §5.3 (detay sayfası wiring) → Task 4
- Spec §6 (3 i18n anahtarı) → Task 1
- Spec §9 (test/doğrulama) → Task 5 + Task 6
- Spec §10 (geri alma) → Her task ayrı commit, kolayca revert edilebilir.

**Tip tutarlılığı:** `comingSoonLabel` adı Task 3 boyunca (`ProgramTransitionEntry`, `ProgramDirectory`, `app/universities/[id]/page.tsx`) aynı isimde kullanıldı. `detailComingSoon` çeviri anahtarı `detail` namespace'inde, `detailsComingSoonTitle/Body` `department` namespace'inde — çakışma yok.

**Açık noktalar yok.** Uygulamaya geçilebilir.
