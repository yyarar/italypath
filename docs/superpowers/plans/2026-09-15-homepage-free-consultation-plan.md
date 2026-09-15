# Ana Sayfa Ücretsiz Ön Görüşme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ana sayfada tüm ücretsiz araçları gösterip ücretsiz ön görüşmeyi ana çağrı yapmak; aynı akışı `/on-gorusme` sayfasına ve program/üniversite/burs/ISEE sayfalarına taşımak.

**Architecture:** Paylaşılan ön görüşme bileşenleri `components/consultation/` altında toplanır ve mevcut `ExpertLeadForm` + `POST /api/expert-leads` akışını yeniden kullanır. Ana sayfa server wrapper + client leaf yapısı korunur; yeni metinler `lib/translations.ts` TR+EN. Her görev önce yeni `scripts/check-home-consultation.mjs` guard'ına kendi beklentilerini ekler (kırmızı), sonra uygular (yeşil).

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, lucide-react, Clerk (`proxy.ts`), Node guard scriptleri (`node scripts/*.mjs`).

**Spec:** `docs/superpowers/specs/2026-09-15-homepage-free-consultation-design.md`
**Görsel referans (yerel, commit edilmez):** `components/prototypes/home/` — B varyantı.

## Global Constraints

- Fiyat/paket, "biz kimiz", sahte yorum/sayı/yanıt süresi yok.
- Tüm yeni UI metinleri `lib/translations.ts` içinde TR + EN paralel; component içinde hard-code metin yok.
- Form yalnızca mevcut `ExpertLeadForm` → `POST /api/expert-leads`; yeni tablo/kolon/migration yok; client'a `SUPABASE_SERVICE_ROLE_KEY` girmez.
- `app/data.ts` import edilmez; `middleware.ts` oluşturulmaz; route güvenliği `proxy.ts`.
- `generateMetadata`/`metadata` server dosyalarında kalır; ana sayfada `BAILOUT_TO_CLIENT_SIDE_RENDERING` oluşmaz.
- Gizli SEO metni yok; FAQ schema eklenmez.
- Sayılar hard-code edilmez: üniversite/program `stats`'tan, şehir sayısı `CURATED_CITIES.length`'ten (server'da), `20` bölge ve `1.400+` SAT mevcut sabitlerle aynı.
- Ön görüşme bölümü id'si `on-gorusme`, ayrı sayfa yolu `/on-gorusme`.
- `components/prototypes/` ve `app/communities/prototype/` commit edilmez.

---

## Dosya Haritası

| Dosya | Durum | Sorumluluk |
| --- | --- | --- |
| `scripts/check-home-consultation.mjs` | Yeni | Bu işin kalıcı guard'ı |
| `package.json` | Değişir | `check:home-consultation` scripti |
| `lib/consultation.ts` | Yeni | `CONSULT_ANCHOR`, `CONSULT_PAGE_PATH` |
| `lib/translations.ts` | Değişir | `homeTools`, `consultation`, `homeFaq`, `consultPrompt`, `navbar.consultation`; `homeApple.secondaryCta`, `homeClose` güncel; `features` silinir |
| `components/home/HomeToolsSection.tsx` | Yeni | 7 araç kartı |
| `components/consultation/ConsultationSection.tsx` | Yeni | Koyu ön görüşme bloğu + form + başarı durumu (`variant: "home" \| "page"`) |
| `components/consultation/ConsultationFaq.tsx` | Yeni | SSS |
| `components/consultation/MobileConsultBar.tsx` | Yeni | Mobil sabit buton |
| `components/consultation/ConsultPrompt.tsx` | Yeni | İçerik sayfası kutusu |
| `components/consultation/ConsultationPageClient.tsx` | Yeni | `/on-gorusme` client leaf |
| `app/on-gorusme/page.tsx` | Yeni | Server wrapper + metadata |
| `components/HomePageClient.tsx`, `app/page.tsx` | Değişir | Yeni sıra, `citiesCount` prop |
| `components/HeroSection.tsx`, `components/HomeClosingCta.tsx` | Değişir | Ön görüşme CTA'ları |
| `components/FeaturesSection.tsx` | Silinir | Yerini `HomeToolsSection` alır |
| `components/Navbar.tsx` | Değişir | Masaüstü link |
| `components/university-details/DepartmentDetailClient.tsx`, `UniversityDetailClient.tsx`, `components/scholarships/ScholarshipsExplorer.tsx`, `components/isee/IseeCalculatorClient.tsx` | Değişir | `ConsultPrompt` |
| `proxy.ts`, `app/sitemap.ts` | Değişir | Public route + sitemap |
| `scripts/check-route-access.mjs`, `check-editorial-ui.mjs`, `check-auth-ui.mjs`, `check-university-data-source.mjs`, `check-university-detail-portrait.mjs` | Değişir | Yeni dosyalara göre |
| `AGENT_CONTEXT.md` | Değişir | Mimari notu |

---

### Task 1: Guard iskeleti, sabitler ve metinler

**Files:**
- Create: `scripts/check-home-consultation.mjs`, `lib/consultation.ts`
- Modify: `package.json` (scripts), `lib/translations.ts` (TR `homeClose` sonrası ~satır 96, EN ~satır 1098; `homeApple.secondaryCta`; `navbar`)

**Interfaces:**
- Produces: `CONSULT_ANCHOR = "on-gorusme"`, `CONSULT_PAGE_PATH = "/on-gorusme"`; `t.homeTools`, `t.consultation`, `t.homeFaq`, `t.consultPrompt.{program,university,scholarships,isee}`, `t.navbar.consultation`, `t.homeClose.{eyebrow,title,body,primaryCta,secondaryCta}`.

- [ ] **Step 1: Guard'ı yaz**

`scripts/check-home-consultation.mjs`:

```js
import { existsSync, readFileSync } from "node:fs";

const failures = [];
const read = (file) => {
  if (!existsSync(file)) {
    failures.push(`Eksik dosya: ${file}`);
    return "";
  }
  return readFileSync(file, "utf8");
};
const must = (source, needle, label) => {
  if (!source.includes(needle)) failures.push(`${label}: ${needle}`);
};
const mustNot = (source, needle, label) => {
  if (source.includes(needle)) failures.push(`${label}: ${needle}`);
};
const countOf = (source, needle) => source.split(needle).length - 1;

// Task 1 — sabitler ve metinler
const constants = read("lib/consultation.ts");
must(constants, 'export const CONSULT_ANCHOR = "on-gorusme"', "Anchor sabiti");
must(constants, 'export const CONSULT_PAGE_PATH = "/on-gorusme"', "Sayfa yolu sabiti");

const translations = read("lib/translations.ts");
for (const ns of ["homeTools: {", "consultation: {", "homeFaq: {", "consultPrompt: {"]) {
  if (countOf(translations, ns) < 2) failures.push(`TR+EN namespace eksik: ${ns}`);
}
mustNot(translations, "card1Title", "Eski FeaturesSection metni kalmamalı");
must(translations, 'secondaryCta: "Ücretsiz ön görüşme al"', "Hero TR CTA");
must(translations, 'secondaryCta: "Book a free consultation"', "Hero EN CTA");

const pkg = read("package.json");
must(pkg, '"check:home-consultation": "node scripts/check-home-consultation.mjs"', "npm script");

if (failures.length > 0) {
  console.error("[FAIL] Home consultation check failed.");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("[OK] Home consultation check passed.");
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `node scripts/check-home-consultation.mjs`
Expected: FAIL — `Eksik dosya: lib/consultation.ts`, namespace eksikleri.

- [ ] **Step 3: Sabitleri yaz**

`lib/consultation.ts`:

```ts
// Ücretsiz ön görüşme akışının paylaşılan adresleri.
export const CONSULT_ANCHOR = "on-gorusme";
export const CONSULT_PAGE_PATH = "/on-gorusme";
```

`package.json` scripts'e `"check:expert-leads"` satırının altına:

```json
    "check:home-consultation": "node scripts/check-home-consultation.mjs",
```

- [ ] **Step 4: Metinleri ekle**

TR `homeApple` içinde `secondaryCta: "Planımı oluştur",` → `secondaryCta: "Ücretsiz ön görüşme al",`
EN `homeApple` içinde mevcut `secondaryCta` değeri → `secondaryCta: "Book a free consultation",`

TR `navbar` bloğuna: `consultation: "Ücretsiz ön görüşme",` — EN: `consultation: "Free consultation",`

TR `features: { ... },` bloğu tamamen silinir ve `homeClose` bloğu şununla değiştirilir, hemen ardından yeni namespace'ler eklenir:

```ts
    homeClose: {
      eyebrow: "Hazırsan",
      title: "İtalya yolculuğunu bugün başlat.",
      body: "Araçlarla kendin planla ya da ücretsiz ön görüşmede birlikte netleştirelim.",
      primaryCta: "Ücretsiz ön görüşme al",
      secondaryCta: "Üniversiteleri keşfet",
    },
    homeTools: {
      eyebrow: "Ücretsiz araçlar",
      title: "İtalya planın için ihtiyacın olan her şey.",
      subtitle: "Hepsi ücretsiz. Bazıları için yalnızca ücretsiz hesap gerekiyor.",
      signInNote: "Ücretsiz hesapla",
      liveData: "Canlı üniversite verisi",
      universitiesMeta: "{universities} üniversite · {programs} program",
      universities: { title: "Üniversite ve program rehberi", body: "İngilizce programları seviye, şehir ve kabul şartlarına göre karşılaştır." },
      scholarships: { title: "Bölgesel burs haritası", body: "Bölge bölge burs, yurt ve yemek desteği.", meta: "20 bölge" },
      isee: { title: "ISEE hesaplayıcı", body: "Burs için kritik ISEE değerini tahmin et.", meta: "2 dakika" },
      sat: { title: "SAT soru bankası", body: "Konu konu soru çöz, yanlışlarını tekrar et.", meta: "1.400+ soru" },
      cities: { title: "Şehir rehberleri", body: "Yaşam maliyeti, ulaşım ve şehir karakteri.", meta: "{count} şehir" },
      communities: { title: "Topluluk atlası", body: "İtalya'daki öğrenci topluluklarının seçilmiş rehberi.", meta: "WhatsApp · Telegram" },
      hub: { title: "Çalışma dosyası ve belgeler", body: "Sana özel program önerileri, favoriler ve belge cüzdanı." },
    },
    consultation: {
      eyebrow: "Ücretsiz ön görüşme",
      title: "Tek başına uğraşmak zorunda değilsin.",
      body: "Hedefini ve takıldığın noktayı yaz; WhatsApp üzerinden sana ulaşalım ve durumuna göre en mantıklı sonraki adımı birlikte netleştirelim.",
      reassurance: ["İlk görüşme ücretsiz", "Bağlayıcı değil", "WhatsApp üzerinden"],
      areasTitle: "Neye yardım ediyoruz",
      areas: [
        { title: "Üniversite ve bölüm seçimi", body: "Profiline uyan İngilizce programları daraltmak." },
        { title: "Başvuru ve belgeler", body: "Takvim, evrak listesi ve başvuru adımları." },
        { title: "Burs ve ISEE", body: "Bölgesel burslar ve ISEE hesaplama süreci." },
        { title: "Vize ve ikamet", body: "Vize başvurusu ve İtalya'ya varış sonrası işlemler." },
        { title: "İtalya'da öğrenci yaşamı", body: "Şehir, yaşam maliyeti ve ilk haftalar." },
      ],
      stepsTitle: "Nasıl çalışır",
      steps: [
        { title: "Formu doldur", body: "Hedefini ve sorunu birkaç cümleyle anlat." },
        { title: "WhatsApp'tan görüşelim", body: "Ekibimiz sana yazar, durumunu birlikte değerlendiririz." },
        { title: "Yolunu netleştir", body: "Sonraki adımlarını ve gerekirse profesyonel destek seçeneğini konuşuruz." },
      ],
      formTitle: "Ön görüşme talebi",
      formNote: "Bu form bir satın alma değildir. Daha sonra profesyonel destek istersen ücretli hizmet ayrıca konuşulur.",
      barCta: "Ücretsiz ön görüşme al",
      pageMetaTitle: "Ücretsiz Ön Görüşme | ItalyPath",
      pageMetaDescription: "İtalya'da eğitim planın için ücretsiz ve bağlayıcı olmayan ön görüşme talep et: üniversite seçimi, başvuru, burs, ISEE ve vize.",
    },
    homeFaq: {
      eyebrow: "Sık sorulan sorular",
      title: "Aklına takılanlar.",
      items: [
        { q: "Ön görüşme gerçekten ücretsiz mi?", a: "Evet. İlk ön görüşme ücretsizdir ve seni hiçbir şeye bağlamaz. Sonrasında profesyonel destek istersen ücretli hizmet ayrıca konuşulur." },
        { q: "Görüşme nasıl yapılıyor?", a: "Formu gönderdikten sonra ekibimiz yazdığın numaraya WhatsApp üzerinden ulaşır." },
        { q: "Hangi konularda yardım alabilirim?", a: "Üniversite ve bölüm seçimi, başvuru ve belgeler, burs ve ISEE, vize ve ikamet, İtalya'da öğrenci yaşamı." },
        { q: "Araçları kullanmak için görüşme yapmam gerekiyor mu?", a: "Hayır. Program rehberi, burs haritası, ISEE hesaplayıcı ve şehir rehberleri herkese açık ve ücretsizdir." },
      ],
    },
    consultPrompt: {
      cta: "Ücretsiz ön görüşme al",
      program: { eyebrow: "Ücretsiz ön görüşme", title: "Bu programa başvurmak için yardım ister misin?", body: "Kabul şartlarını, belgeleri ve takvimi birlikte netleştirelim." },
      university: { eyebrow: "Ücretsiz ön görüşme", title: "Bu okulda hangi program sana uygun?", body: "Program seçimi, belgeler ve başvuru akışını ücretsiz ön görüşmede konuşalım." },
      scholarships: { eyebrow: "Ücretsiz ön görüşme", title: "Burs başvurusunda takıldın mı?", body: "Bölgeni, ISEE sürecini ve gerekli belgeleri birlikte netleştirelim." },
      isee: { eyebrow: "Ücretsiz ön görüşme", title: "ISEE sonucunu nasıl kullanacağından emin değil misin?", body: "Burs uygunluğunu ve sonraki adımlarını ücretsiz ön görüşmede konuşalım." },
    },
```

EN'de aynı yapı (`features` silinir, `homeClose` değiştirilir, dört namespace eklenir):

```ts
    homeClose: {
      eyebrow: "When you're ready",
      title: "Start your Italy journey today.",
      body: "Plan on your own with the tools, or let's map it out together in a free consultation.",
      primaryCta: "Book a free consultation",
      secondaryCta: "Explore universities",
    },
    homeTools: {
      eyebrow: "Free tools",
      title: "Everything you need to plan your Italy move.",
      subtitle: "All free. Some only need a free account.",
      signInNote: "With a free account",
      liveData: "Live university data",
      universitiesMeta: "{universities} universities · {programs} programs",
      universities: { title: "University and program guide", body: "Compare English-taught programs by level, city, and admission requirements." },
      scholarships: { title: "Regional scholarship map", body: "Scholarship, housing, and meal support region by region.", meta: "20 regions" },
      isee: { title: "ISEE calculator", body: "Estimate the ISEE value that decides scholarships.", meta: "2 minutes" },
      sat: { title: "SAT question bank", body: "Practice by topic and review your mistakes.", meta: "1,400+ questions" },
      cities: { title: "City guides", body: "Cost of living, transport, and city character.", meta: "{count} cities" },
      communities: { title: "Community atlas", body: "A curated guide to student communities in Italy.", meta: "WhatsApp · Telegram" },
      hub: { title: "Workspace and documents", body: "Personal program picks, favorites, and a document wallet." },
    },
    consultation: {
      eyebrow: "Free consultation",
      title: "You don't have to figure it out alone.",
      body: "Tell us your goal and where you're stuck; we'll reach out on WhatsApp and work out the most sensible next step for your situation together.",
      reassurance: ["First call is free", "No commitment", "Over WhatsApp"],
      areasTitle: "What we help with",
      areas: [
        { title: "Choosing a university and program", body: "Narrowing down English-taught programs that fit your profile." },
        { title: "Applications and documents", body: "Timeline, document checklist, and application steps." },
        { title: "Scholarships and ISEE", body: "Regional scholarships and the ISEE process." },
        { title: "Visa and residence", body: "Visa application and paperwork after you arrive in Italy." },
        { title: "Student life in Italy", body: "City, cost of living, and your first weeks." },
      ],
      stepsTitle: "How it works",
      steps: [
        { title: "Fill in the form", body: "Describe your goal and question in a few sentences." },
        { title: "We talk on WhatsApp", body: "Our team messages you and we look at your situation together." },
        { title: "Get clarity", body: "We go over your next steps and, if useful, professional support options." },
      ],
      formTitle: "Consultation request",
      formNote: "This form is not a purchase. If you later want professional support, paid services are discussed separately.",
      barCta: "Book a free consultation",
      pageMetaTitle: "Free Consultation | ItalyPath",
      pageMetaDescription: "Request a free, no-commitment consultation for studying in Italy: university choice, applications, scholarships, ISEE, and visa.",
    },
    homeFaq: {
      eyebrow: "Frequently asked questions",
      title: "Things you might be wondering.",
      items: [
        { q: "Is the consultation really free?", a: "Yes. The first consultation is free and doesn't commit you to anything. If you later want professional support, paid services are discussed separately." },
        { q: "How does the call work?", a: "After you send the form, our team reaches out on WhatsApp at the number you provided." },
        { q: "What can I get help with?", a: "University and program choice, applications and documents, scholarships and ISEE, visa and residence, and student life in Italy." },
        { q: "Do I need a consultation to use the tools?", a: "No. The program guide, scholarship map, ISEE calculator, and city guides are open to everyone for free." },
      ],
    },
    consultPrompt: {
      cta: "Book a free consultation",
      program: { eyebrow: "Free consultation", title: "Want help applying to this program?", body: "Let's clarify the requirements, documents, and timeline together." },
      university: { eyebrow: "Free consultation", title: "Which program here fits you?", body: "Talk through program choice, documents, and the application flow in a free consultation." },
      scholarships: { eyebrow: "Free consultation", title: "Stuck on a scholarship application?", body: "Let's go over your region, the ISEE process, and the documents you need." },
      isee: { eyebrow: "Free consultation", title: "Not sure how to use your ISEE result?", body: "Discuss scholarship eligibility and your next steps in a free consultation." },
    },
```

`FeaturesSection.tsx` henüz silinmediği için bu adımda TypeScript hata verir; Step 5 bunu Task 2'ye kadar geçici kabul etmez — aynı adımda `components/FeaturesSection.tsx` ve `components/HomeClosingCta.tsx` derlenebilir tutulur: FeaturesSection bu task'ta silinir ve `HomePageClient.tsx`'ten import'u kaldırılır (bölüm Task 2'de yenisiyle gelir); `HomeClosingCta.tsx` Task 4'te güncellenir, bu task'ta yalnızca `primaryCtaSignedIn` kullanımı `c.primaryCta` + `href="#on-gorusme"` ile değiştirilir.

- [ ] **Step 5: Geçici derleme onarımı**

`components/HomePageClient.tsx`: `import FeaturesSection ...` satırı ve `<FeaturesSection stats={stats} />` silinir. `git rm components/FeaturesSection.tsx`.

`components/HomeClosingCta.tsx`: `useAuth` import'u ve `isSignedIn`/`primaryHref`/`primaryLabel` satırları silinir; birincil `Link` → `<a href={`#${CONSULT_ANCHOR}`}>` ve metin `{c.primaryCta}`; `import { CONSULT_ANCHOR } from "@/lib/consultation";`.

Guard referansları: `scripts/check-editorial-ui.mjs` içindeki `components/FeaturesSection.tsx` ve `components/BottomNav.tsx` girişleri silinir; `scripts/check-auth-ui.mjs` listesinden `components/BottomNav.tsx` ve `components/FeaturesSection.tsx` çıkarılır; `scripts/check-university-data-source.mjs` `marketingSurfaces` içindeki `components/FeaturesSection.tsx` → `components/home/HomeToolsSection.tsx` (Task 2'de oluşur; o zamana kadar bu guard kırmızı kalır ve Task 2 Step 4'te yeşile döner).

- [ ] **Step 6: Yeşili gör**

Run: `node scripts/check-home-consultation.mjs && npx tsc --noEmit -p . && npm run check:editorial-ui && npm run check:auth-ui`
Expected: hepsi PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-home-consultation.mjs lib/consultation.ts package.json lib/translations.ts components/HomePageClient.tsx components/HomeClosingCta.tsx scripts/check-editorial-ui.mjs scripts/check-auth-ui.mjs scripts/check-university-data-source.mjs
git rm components/FeaturesSection.tsx
git commit -m "feat(home): consultation copy, constants, and guard"
```

---

### Task 2: Araç vitrini (`HomeToolsSection`)

**Files:**
- Create: `components/home/HomeToolsSection.tsx`
- Modify: `components/HomePageClient.tsx`, `app/page.tsx`, `scripts/check-home-consultation.mjs`

**Interfaces:**
- Consumes: `t.homeTools`, `UniversityStats`, `formatStatValue`.
- Produces: `export default function HomeToolsSection({ stats, citiesCount }: { stats: UniversityStats; citiesCount: number })`; `HomePageClient` props `{ stats: UniversityStats; citiesCount: number }`.

- [ ] **Step 1: Guard beklentisi ekle** (`if (failures.length` bloğundan önce)

```js
// Task 2 — araç vitrini
const tools = read("components/home/HomeToolsSection.tsx");
for (const href of ['"/universities"', '"/scholarships"', '"/isee"', '"/sat"', '"/cities"', '"/communities"', '"/hub"']) {
  must(tools, href, "Araç kartı linki");
}
must(tools, 'id="araclar"', "Araç bölümü anchor");
mustNot(tools, "CURATED_CITIES", "Şehir verisi client bundle'a girmemeli");
const homePage = read("app/page.tsx");
must(homePage, "CURATED_CITIES.length", "Şehir sayısı server'da");
const homeClient = read("components/HomePageClient.tsx");
must(homeClient, "<HomeToolsSection", "Ana sayfa araç vitrini");
```

- [ ] **Step 2: Kırmızı** — Run: `node scripts/check-home-consultation.mjs` → FAIL `Eksik dosya: components/home/HomeToolsSection.tsx`.

- [ ] **Step 3: Bileşeni yaz**

`components/home/HomeToolsSection.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Building2, Calculator, FolderOpen, GraduationCap, MapPinned, Users, type LucideIcon } from "lucide-react";

import Reveal from "@/components/ui/Reveal";
import { useLanguage } from "@/context/LanguageContext";
import { formatStatValue, type UniversityStats } from "@/lib/universityStats";

interface HomeToolsSectionProps {
  stats: UniversityStats;
  citiesCount: number;
}

interface ToolCard {
  icon: LucideIcon;
  title: string;
  body: string;
  meta: string;
  href: string;
  surface: string;
  iconSurface: string;
  wide?: boolean;
  dark?: boolean;
}

export default function HomeToolsSection({ stats, citiesCount }: HomeToolsSectionProps) {
  const { t } = useLanguage();
  const c = t.homeTools;
  const universitiesMeta =
    stats.universitiesCount === null || stats.programsCount === null
      ? c.liveData
      : c.universitiesMeta
          .replace("{universities}", formatStatValue(stats.universitiesCount))
          .replace("{programs}", formatStatValue(stats.programsCount));

  const tools: ToolCard[] = [
    { icon: GraduationCap, ...c.universities, meta: universitiesMeta, href: "/universities", surface: "bg-[#e7efe9]", iconSurface: "bg-[var(--editorial-sage)] text-white", wide: true },
    { icon: MapPinned, ...c.scholarships, href: "/scholarships", surface: "bg-[#eef3ef]", iconSurface: "bg-[var(--editorial-surface)] text-[var(--editorial-terracotta)]" },
    { icon: Calculator, ...c.isee, href: "/isee", surface: "bg-[#f3ece6]", iconSurface: "bg-[var(--editorial-surface)] text-[var(--editorial-sage)]" },
    { icon: BookOpen, ...c.sat, meta: `${c.sat.meta} · ${c.signInNote}`, href: "/sat", surface: "bg-[#f2e8e0]", iconSurface: "bg-[var(--editorial-terracotta)] text-white" },
    { icon: Building2, ...c.cities, meta: c.cities.meta.replace("{count}", String(citiesCount)), href: "/cities", surface: "bg-[#eceee5]", iconSurface: "bg-[var(--editorial-surface)] text-[var(--editorial-sage)]" },
    { icon: Users, ...c.communities, href: "/communities", surface: "bg-[#eef3ef]", iconSurface: "bg-[var(--editorial-surface)] text-[var(--editorial-terracotta)]" },
    { icon: FolderOpen, ...c.hub, meta: c.signInNote, href: "/hub", surface: "bg-[#15201c]", iconSurface: "bg-white/10 text-[#f3d2bf]", dark: true },
  ];

  return (
    <section id="araclar" className="scroll-mt-24 bg-[var(--editorial-paper)] py-20 lg:py-28">
      {/* Başlık + 4 sütun grid: prototip ProtoToolsSection ile birebir aynı markup, metinler `c.*`'dan */}
    </section>
  );
}
```

Section gövdesi `components/prototypes/home/ProtoToolsSection.tsx` satır 101-150 ile birebir aynıdır; yalnızca `TOOLS_COPY.eyebrow/title/subtitle` → `c.eyebrow/c.title/c.subtitle` olur ve `tool.href` key olarak kalır.

- [ ] **Step 4: Ana sayfaya bağla**

`app/page.tsx`: `import { CURATED_CITIES } from "@/lib/cities/data";` ve `return <HomePageClient stats={stats} citiesCount={CURATED_CITIES.length} />;`

`components/HomePageClient.tsx`: props `{ stats, citiesCount }`; `HeroSection`'dan sonra sıra `HomeStoryBand` yerine şimdilik `<HomeToolsSection stats={stats} citiesCount={citiesCount} />` → `<HomeStoryBand />` (ön görüşme bölümü Task 3'te araya girer).

- [ ] **Step 5: Yeşil** — Run: `node scripts/check-home-consultation.mjs && npx tsc --noEmit -p . && npm run check:university-data-source` → PASS.

- [ ] **Step 6: Commit** — `git add components/home app/page.tsx components/HomePageClient.tsx scripts/check-home-consultation.mjs && git commit -m "feat(home): free tools showcase"`

---

### Task 3: Ön görüşme bölümü, SSS ve mobil sabit buton

**Files:**
- Create: `components/consultation/ConsultationSection.tsx`, `ConsultationFaq.tsx`, `MobileConsultBar.tsx`
- Modify: `components/HomePageClient.tsx`, `components/HeroSection.tsx`, `scripts/check-home-consultation.mjs`

**Interfaces:**
- Consumes: `ExpertLeadForm({ onSubmitted })`, `t.consultation`, `t.homeFaq`, `t.aiMentor.expertDesk.success`, `CONSULT_ANCHOR`.
- Produces: `ConsultationSection({ variant }: { variant: "home" | "page" })` — `"page"` başlığı `h1`, `"home"` `h2`; `ConsultationFaq()`; `MobileConsultBar()`.

- [ ] **Step 1: Guard beklentisi**

```js
// Task 3 — ön görüşme bölümü
const section = read("components/consultation/ConsultationSection.tsx");
must(section, "ExpertLeadForm", "Gerçek form kullanılmalı");
must(section, "id={CONSULT_ANCHOR}", "Bölüm anchor");
must(section, "aria-live", "Başarı mesajı live region");
mustNot(section, "onSubmitCapture", "Prototip gönderim engeli taşınmamalı");
mustNot(section.toLowerCase(), "service_role", "Client service role içeremez");
must(read("components/consultation/ConsultationFaq.tsx"), "<details", "SSS details");
const bar = read("components/consultation/MobileConsultBar.tsx");
must(bar, "md:hidden", "Sabit buton yalnız mobil");
must(bar, "IntersectionObserver", "Form görünürken gizlenme");
must(homeClient, "<ConsultationSection", "Ana sayfa ön görüşme bölümü");
must(homeClient, "<ConsultationFaq", "Ana sayfa SSS");
must(homeClient, "<MobileConsultBar", "Ana sayfa sabit buton");
const hero = read("components/HeroSection.tsx");
must(hero, "CONSULT_ANCHOR", "Hero CTA ön görüşmeye gider");
```

- [ ] **Step 2: Kırmızı** — `node scripts/check-home-consultation.mjs` → FAIL eksik dosyalar.

- [ ] **Step 3: `ConsultationSection.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Check, MessageCircle } from "lucide-react";

import ExpertLeadForm from "@/components/mentor/expert/ExpertLeadForm";
import Reveal from "@/components/ui/Reveal";
import { useLanguage } from "@/context/LanguageContext";
import { CONSULT_ANCHOR } from "@/lib/consultation";

export default function ConsultationSection({ variant }: { variant: "home" | "page" }) {
  const { t } = useLanguage();
  const c = t.consultation;
  const [submitted, setSubmitted] = useState(false);
  const Heading = variant === "page" ? "h1" : "h2";

  return (
    <section
      id={CONSULT_ANCHOR}
      className={`scroll-mt-24 bg-[var(--editorial-paper)] ${variant === "page" ? "pb-16 pt-28 sm:pt-32" : "pb-20 lg:pb-28"}`}
    >
      {/* Sol koyu sütun + sağ form kartı: prototip ProtoConsultSection satır 23-86 ile aynı markup;
          CONSULT_COPY.* → c.*, h2 → <Heading>. */}
      {/* Form kartı gövdesi: */}
      {submitted ? (
        <div aria-live="polite" className="border-y border-[var(--editorial-border)] py-10">
          <p className="max-w-xl font-serif text-xl leading-8 text-[var(--editorial-ink)]">{t.aiMentor.expertDesk.success}</p>
        </div>
      ) : (
        <div className="pt-6">
          <ExpertLeadForm onSubmitted={() => setSubmitted(true)} />
        </div>
      )}
    </section>
  );
}
```

Uygulamada yorum satırları prototipteki gerçek JSX ile doldurulur (Reveal sarmalı, `c.reassurance`, `c.areas`, `c.steps`, `c.formTitle`, `c.formNote`, `MessageCircle` başlık ikonu); `blockedSubmit` durumu ve `onSubmitCapture` taşınmaz.

- [ ] **Step 4: `ConsultationFaq.tsx`** — `components/prototypes/home/ProtoFaqAndClose.tsx` içindeki `ProtoFaq` gövdesi; `FAQ_COPY` → `t.homeFaq`; default export `ConsultationFaq`.

- [ ] **Step 5: `MobileConsultBar.tsx`** — `components/prototypes/home/ProtoStickyCta.tsx` ile aynı; `HERO_CONSULT_CTA` → `t.consultation.barCta`, anchor `@/lib/consultation`'dan; default export `MobileConsultBar`.

- [ ] **Step 6: Hero ve sıra**

`components/HeroSection.tsx`: ikinci `Link` (`href={isSignedIn ? "/hub" : "/giris?mode=kayit"}`) şu `a` ile değişir; `MessageCircle` import'u eklenir, `CONSULT_ANCHOR` import edilir:

```tsx
            <a
              href={`#${CONSULT_ANCHOR}`}
              className="home-pressable group inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--editorial-terracotta)] px-6 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(180,92,58,0.24)] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--editorial-terracotta)]"
            >
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              {copy.secondaryCta}
            </a>
```

`components/HomePageClient.tsx` son sıra:

```tsx
      <Navbar homeFloating />
      <HeroSection stats={stats} />
      <HomeToolsSection stats={stats} citiesCount={citiesCount} />
      <ConsultationSection variant="home" />
      <HomeStoryBand />
      <VelocityBridge stats={stats} />
      <ScholarshipsSection />
      <IseeSection />
      <ConsultationFaq />
      <HomeClosingCta />
      <Footer />
      <MobileConsultBar />
```

- [ ] **Step 7: Yeşil** — `node scripts/check-home-consultation.mjs && npx tsc --noEmit -p . && npm run check:expert-leads && npm run check:editorial-ui` → PASS.

- [ ] **Step 8: Tarayıcı** — dev server, `/` 375px: yatay taşma yok (`scrollWidth === innerWidth`), hero ikinci butonu `#on-gorusme`'ye kaydırır, sabit buton hero sonrası görünür ve form bölümünde gizlenir; konsolda hata yok. Formu **gönderme** (gerçek lead). Boş formla gönder → doğrulama hataları görünür, ağda `expert-leads` isteği yok.

- [ ] **Step 9: Commit** — `git add components/consultation components/HeroSection.tsx components/HomePageClient.tsx scripts/check-home-consultation.mjs && git commit -m "feat(home): free consultation section, FAQ, mobile bar"`

---

### Task 4: Kapanış CTA'sı ve `/on-gorusme` sayfası

**Files:**
- Create: `app/on-gorusme/page.tsx`, `components/consultation/ConsultationPageClient.tsx`
- Modify: `components/HomeClosingCta.tsx`, `proxy.ts`, `app/sitemap.ts`, `scripts/check-route-access.mjs`, `scripts/check-home-consultation.mjs`

**Interfaces:**
- Consumes: `ConsultationSection`, `ConsultationFaq`, `Navbar`, `Footer`, `t.consultation.pageMetaTitle/pageMetaDescription` (metadata server'da `tr` sabitinden okunur).
- Produces: public `/on-gorusme` rotası.

- [ ] **Step 1: Guard + route matrisi**

`scripts/check-home-consultation.mjs`:

```js
// Task 4 — ayrı sayfa
const consultPage = read("app/on-gorusme/page.tsx");
mustNot(consultPage, '"use client"', "Sayfa server wrapper olmalı");
must(consultPage, 'canonical: "/on-gorusme"', "Canonical");
must(read("components/consultation/ConsultationPageClient.tsx"), 'variant="page"', "Sayfa varyantı");
must(read("proxy.ts"), "'/on-gorusme(.*)'", "Public route");
must(read("app/sitemap.ts"), "/on-gorusme", "Sitemap");
mustNot(read("app/robots.ts"), "/on-gorusme", "Robots disallow olmamalı");
const closing = read("components/HomeClosingCta.tsx");
must(closing, "CONSULT_ANCHOR", "Kapanış CTA ön görüşmeye gider");
mustNot(closing, "primaryCtaSignedIn", "Eski kapanış CTA kalmamalı");
```

`scripts/check-route-access.mjs` `publicChecks` dizisine `"/on-gorusme",` eklenir.

- [ ] **Step 2: Kırmızı** — `node scripts/check-home-consultation.mjs; npm run check:routes` → ikisi de FAIL.

- [ ] **Step 3: Sayfa**

`components/consultation/ConsultationPageClient.tsx`:

```tsx
"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

import ConsultationFaq from "./ConsultationFaq";
import ConsultationSection from "./ConsultationSection";

export default function ConsultationPageClient() {
  return (
    <div className="min-h-screen overflow-hidden bg-[var(--editorial-paper)] font-sans text-[var(--editorial-ink)]">
      <Navbar />
      <ConsultationSection variant="page" />
      <ConsultationFaq />
      <Footer />
    </div>
  );
}
```

`app/on-gorusme/page.tsx`:

```tsx
import type { Metadata } from "next";

import ConsultationPageClient from "@/components/consultation/ConsultationPageClient";
import { translations } from "@/lib/translations";

const copy = translations.tr.consultation;

export const metadata: Metadata = {
  title: copy.pageMetaTitle,
  description: copy.pageMetaDescription,
  alternates: { canonical: "/on-gorusme" },
  openGraph: {
    title: copy.pageMetaTitle,
    description: copy.pageMetaDescription,
    url: "https://italypath.app/on-gorusme",
  },
};

export default function ConsultationPage() {
  return <ConsultationPageClient />;
}
```

(`translations` export adı `lib/translations.ts`'teki gerçek export adıyla doğrulanır; farklıysa o ad kullanılır.)

- [ ] **Step 4: Route + sitemap + kapanış**

`proxy.ts` public listesine `'/giris(.*)',` satırının altına: `  '/on-gorusme(.*)',  // Ücretsiz ön görüşme sayfası`

`app/sitemap.ts` `staticRoutes` dizisine `/isee` girdisinin ardından:

```ts
        {
            url: `${baseUrl}/on-gorusme`,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
```

`components/HomeClosingCta.tsx`: Task 1'deki geçici hali doğrulanır — birincil buton terracotta (`bg-[var(--editorial-terracotta)] text-white`), `href={`#${CONSULT_ANCHOR}`}`, metin `c.primaryCta`; ikincil `/universities` `c.secondaryCta`.

- [ ] **Step 5: Yeşil** — `node scripts/check-home-consultation.mjs && npm run check:routes && npx tsc --noEmit -p .` → PASS. Tarayıcı: `/on-gorusme` 200, tek `h1`, 375px'te taşma yok.

- [ ] **Step 6: Commit** — `git add app/on-gorusme components/consultation/ConsultationPageClient.tsx components/HomeClosingCta.tsx proxy.ts app/sitemap.ts scripts/check-route-access.mjs scripts/check-home-consultation.mjs && git commit -m "feat: /on-gorusme consultation page and closing CTA"`

---

### Task 5: İçerik sayfalarında `ConsultPrompt` ve menü linki

**Files:**
- Create: `components/consultation/ConsultPrompt.tsx`
- Modify: `components/university-details/DepartmentDetailClient.tsx` (~satır 223, `ComingSoonNotice` sonrası), `components/university-details/UniversityDetailClient.tsx` (~satır 158), `components/scholarships/ScholarshipsExplorer.tsx` (`RegionRail` sonrası), `components/isee/IseeCalculatorClient.tsx` (~satır 854, grid kapanışı ile `max-w-7xl` kapanışı arası), `components/Navbar.tsx`, `scripts/check-university-detail-portrait.mjs`, `scripts/check-home-consultation.mjs`

**Interfaces:**
- Consumes: `t.consultPrompt`, `CONSULT_PAGE_PATH`.
- Produces: `ConsultPrompt({ eyebrow, title, body, cta }: { eyebrow: string; title: string; body: string; cta: string })`.

- [ ] **Step 1: Guard**

```js
// Task 5 — içerik sayfaları ve menü
const prompt = read("components/consultation/ConsultPrompt.tsx");
must(prompt, "CONSULT_PAGE_PATH", "Kutu ayrı sayfaya gider");
for (const [file, key] of [
  ["components/university-details/DepartmentDetailClient.tsx", "t.consultPrompt.program"],
  ["components/university-details/UniversityDetailClient.tsx", "t.consultPrompt.university"],
  ["components/scholarships/ScholarshipsExplorer.tsx", "t.consultPrompt.scholarships"],
  ["components/isee/IseeCalculatorClient.tsx", "t.consultPrompt.isee"],
]) {
  const source = read(file);
  must(source, "<ConsultPrompt", `${file} kutu`);
  must(source, key, `${file} metin`);
}
mustNot(read("components/university-details/UniversityDetailClient.tsx"), "aiMentorHref", "Duraklatılmış AI masası linki kalmamalı");
must(read("components/Navbar.tsx"), "CONSULT_PAGE_PATH", "Menü linki");
```

`scripts/check-university-detail-portrait.mjs` `university detail client` token listesinde `"DetailMentorPrompt",` → `"ConsultPrompt",`.

- [ ] **Step 2: Kırmızı** — `node scripts/check-home-consultation.mjs; npm run check:university-details-ui` → FAIL.

- [ ] **Step 3: `ConsultPrompt.tsx`**

```tsx
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import { CONSULT_PAGE_PATH } from "@/lib/consultation";

interface ConsultPromptProps {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
}

export default function ConsultPrompt({ eyebrow, title, body, cta }: ConsultPromptProps) {
  return (
    <aside className="border-y border-[var(--editorial-border)] bg-[var(--editorial-band)] px-4 py-6 sm:px-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">{eyebrow}</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-[var(--editorial-ink)]">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--editorial-muted)]">{body}</p>
        </div>
        <Link
          href={CONSULT_PAGE_PATH}
          className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--editorial-terracotta)] bg-[var(--editorial-terracotta)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-terracotta)]"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Yerleştir**

Her dosyada `import ConsultPrompt from "@/components/consultation/ConsultPrompt";` ve:

```tsx
<ConsultPrompt {...t.consultPrompt.program} cta={t.consultPrompt.cta} />
```

(anahtar dosyaya göre `program` / `university` / `scholarships` / `isee`).

- `DepartmentDetailClient`: kabul paneli/`ComingSoonNotice` koşulunun hemen ardından, `ProgramDirectory`'den önce.
- `UniversityDetailClient`: `<DetailMentorPrompt .../>` bloğu yerine; `aiMentorHref` sabiti silinir; `DetailMentorPrompt` import'u silinir (dosya `DetailMentorPrompt.tsx` portrait guard listesinde kaldığı için silinmez).
- `ScholarshipsExplorer`: `<RegionRail ... />` satırının ardından `<div className="mt-16"><ConsultPrompt {...t.consultPrompt.scholarships} cta={t.consultPrompt.cta} /></div>`; bileşen `t`'yi `useLanguage()`'dan almıyorsa `const { t } = useLanguage();` mevcut `language` destructure'ına eklenir.
- `IseeCalculatorClient`: grid `</div>` kapanışından sonra `<div className="mt-10"><ConsultPrompt {...t.consultPrompt.isee} cta={t.consultPrompt.cta} /></div>`; `t` aynı şekilde.

`components/Navbar.tsx` `desktopItems` dizisinde `aiMentorHref` girdisinden önce: `{ href: CONSULT_PAGE_PATH, label: t.navbar.consultation },` ve import.

- [ ] **Step 5: Yeşil** — `node scripts/check-home-consultation.mjs && npx tsc --noEmit -p . && npm run check:university-details-ui && npm run check:admission-dossier && npm run check:scholarships-ui && npm run check:isee && npm run check:auth-ui` → PASS. Tarayıcı: bir program sayfası, bir üniversite sayfası, `/scholarships`, `/isee` 375px'te kutu görünür, link `/on-gorusme`, taşma yok.

- [ ] **Step 6: Commit** — `git add components/consultation/ConsultPrompt.tsx components/university-details components/scholarships/ScholarshipsExplorer.tsx components/isee/IseeCalculatorClient.tsx components/Navbar.tsx scripts/check-university-detail-portrait.mjs scripts/check-home-consultation.mjs && git commit -m "feat: consultation prompts on content pages and navbar link"`

---

### Task 6: Tam doğrulama ve dokümantasyon

**Files:**
- Modify: `AGENT_CONTEXT.md`

- [ ] **Step 1: Tüm kontroller**

Run:

```bash
npm run build && npm run check:home-consultation && npm run check:routes && npm run check:expert-leads && npm run test:expert-leads && npm run check:auth-ui && npm run check:university-data-source && npm run check:scholarships-ui && npm run check:isee && npm run check:university-details-ui && npm run check:admission-dossier && npm run check:editorial-ui && npm run check:hub-onboarding && npx eslint components/home components/consultation components/HeroSection.tsx components/HomeClosingCta.tsx components/HomePageClient.tsx components/Navbar.tsx app/on-gorusme app/page.tsx
```

Expected: hepsi PASS.

- [ ] **Step 2: Production build HTML'i** — `npm run build` sonrası `npm run start` gerekmez; dev server'da `curl -s localhost:3000/ | grep -c BAILOUT_TO_CLIENT_SIDE_RENDERING` → `0`; aynısı `/on-gorusme` için.

- [ ] **Step 3: Tarayıcı son tur** — 375px ve masaüstü ekran görüntüleri: ana sayfa hero, araç vitrini, ön görüşme bölümü, SSS, `/on-gorusme`.

- [ ] **Step 4: `AGENT_CONTEXT.md`** — "Home" bölümüne yeni sıra ve `components/consultation/`; route matrisine `/on-gorusme(.*)`; komutlara `npm run check:home-consultation`; "Son güncelleme" tarihi `2026-09-15`; `FeaturesSection.tsx` referansları kaldırılır.

- [ ] **Step 5: Commit** — `git add AGENT_CONTEXT.md && git commit -m "docs: record homepage consultation architecture"`

- [ ] **Step 6: Canlıya gönderim** — Kerem'e özet + ekran görüntüleri; onay gelirse `git push origin main` ve Vercel durumunu bekle.
