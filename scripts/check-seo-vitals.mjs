import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";

// Kalıcı SEO / Core Web Vitals guard'ı (SEO_AUDIT.md §19, 15 Eylül 2026).
//
// 1) İlk yükleme HTML'inde sayfa içeriği görünür olmalı. Bunu sağlayan şey RouteTransition'daki
//    <AnimatePresence initial={false}>: ilk render'da alt ağaçtaki tüm framer-motion "initial" durumlarını
//    (ör. hero'daki opacity:0) devre dışı bırakır; sunucu HTML'i opacity:1 ile gelir. Bu prop kaldırılırsa
//    tüm sayfalarda H1 hidrasyona kadar gizlenir ve LCP patlar.
// 2) Terracotta renkli METİN küçük puntoda WCAG AA (≥4.5:1) sağlamalı; bunun için koyu "ink" tokenı kullanılır.
//    Buton/arka plan/çerçeve base tokenda kalır.
// Not: Mobil zoom kilidi (maximumScale/userScalable/MobileZoomLock) bilinçli ürün kararıdır; burada denetlenmez.

const failures = [];

const routeTransition = readFileSync("components/RouteTransition.tsx", "utf8");
if (!/<AnimatePresence[^>]*initial=\{false\}/.test(routeTransition)) {
  failures.push("RouteTransition: <AnimatePresence initial={false}> zorunlu; yoksa ilk yüklemede tüm sayfalar hidrasyona kadar görünmez kalır (LCP)");
}
if (!routeTransition.includes("<m.div") || !routeTransition.includes("key={pathname}")) {
  failures.push("RouteTransition: pathname anahtarlı m.div sarmalayıcısı beklenen yapıda değil; guard'ı güncelle");
}
// framer-motion diyeti (denetim O3#10, 2026-09-26): kokte yalniz domAnimation; bilesenler `m` kullanir.
if (!routeTransition.includes("<LazyMotion features={domAnimation} strict>")) {
  failures.push("RouteTransition: <LazyMotion features={domAnimation} strict> kok sarmalayicisi eksik");
}

const tracked = execSync("git ls-files app components lib", { encoding: "utf8" })
  .split("\n")
  .filter((file) => /\.(tsx|ts)$/.test(file));

// ISR (2026-09-15): halka acik veri sayfalari Vercel'in paylasimli onbelleginden sunulur (SEO_AUDIT.md §20).
// force-dynamic veya sunucu tarafinda searchParams okumak sayfayi dinamige dusurur ve soguk sunucu gecikmesi geri gelir.
const isrPages = [
  "app/page.tsx",
  "app/universities/[id]/page.tsx",
  "app/universities/[id]/departments/[deptSlug]/page.tsx",
];
for (const file of isrPages) {
  const source = readFileSync(file, "utf8");
  const match = source.match(/export const revalidate = (\d+);/);
  if (!match) {
    failures.push(`${file}: 'export const revalidate = <saniye>;' eksik (ISR olmadan soguk sunucu gecikmesi geri gelir)`);
  } else if (Number(match[1]) < 3600 || Number(match[1]) > 21600) {
    failures.push(`${file}: revalidate 3600-21600 saniye araliginda olmali`);
  }
  if (source.includes("force-dynamic")) {
    failures.push(`${file}: force-dynamic ISR ile celisir`);
  }
  if (source.includes("searchParams")) {
    failures.push(`${file}: sunucu tarafinda searchParams okumak sayfayi dinamige dusurur (ISR iptal)`);
  }
  if (file !== "app/page.tsx" && !source.includes("export function generateStaticParams()")) {
    failures.push(`${file}: dinamik rota ISR icin bos generateStaticParams() export etmeli (yoksa her istek dinamik render)`);
  }
  // Veri hatasi yakalanip yedek govde uretilirse o govde 3 saat onbellekte kalir; hata firlatilirsa
  // Vercel son saglam sayfayi sunmaya devam eder (guvenlik denetimi O2#6, 2026-09-25).
  if (/\bcatch\s*\(/.test(source)) {
    failures.push(`${file}: ISR sayfasi veri hatasini yakalamamali (bos/yedek govde onbellege yazilir)`);
  }
}

// ISR sayfalarini saran layout/template dosyalari da ayni sayfanin parcasidir (guvenlik denetimi O5#8,
// 2026-09-26): kok layout'ta cookies() veya auth() cagrisi TUM sayfalari dinamige dusurur. Liste ISR
// sayfalarindan yukari yurunerek kurulur (bugun: app/layout.tsx, app/universities/layout.tsx; app/template.tsx 2026-09-26'da silindi;
// iki universities detay layout'u); yeni bir ust layout eklenirse kendiliginden taranir.
const isrWrappers = [];
for (const page of isrPages) {
  for (let dir = posix.dirname(page); ; dir = posix.dirname(dir)) {
    for (const name of ["layout.tsx", "template.tsx"]) {
      const candidate = posix.join(dir, name);
      if (existsSync(candidate) && !isrWrappers.includes(candidate)) isrWrappers.push(candidate);
    }
    if (dir === "app") break;
  }
}
for (const required of [
  "app/layout.tsx",
  "app/universities/[id]/layout.tsx",
  "app/universities/[id]/departments/[deptSlug]/layout.tsx",
]) {
  if (!isrWrappers.includes(required)) {
    failures.push(`${required}: ISR layout'u bulunamadi; guard'i guncelle`);
  }
}
for (const file of isrWrappers) {
  const source = readFileSync(file, "utf8");
  if (source.includes("force-dynamic")) {
    failures.push(`${file}: force-dynamic, altindaki ISR sayfalariyla celisir`);
  }
  if (/\bcatch\s*\(/.test(source)) {
    failures.push(`${file}: ISR layout'u veri hatasini yakalamamali (yedek metadata/govde onbellege yazilir)`);
  }
}

// Istek basina okunan API'ler (cerez, basliklar, Clerk oturumu, connection()) sayfayi ve altindaki her sayfayi
// dinamige dusurur; ISR sayfalarinda ve layout'larinda yasak. Yorumlar taranmaz; "x.headers(" gibi
// nesne metotlari sayilmaz.
const requestTimeCall = /(?<![\w.$])(cookies|headers|auth|currentUser|connection)\s*\(/g;
const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
for (const file of [...isrPages, ...isrWrappers]) {
  const calls = new Set(
    [...stripComments(readFileSync(file, "utf8")).matchAll(requestTimeCall)].map((match) => `${match[1]}()`),
  );
  if (calls.size > 0) {
    failures.push(`${file}: ${[...calls].join(", ")} istek basina okunur ve ISR'i iptal eder`);
  }
}

// JSON-LD (guvenlik denetimi S5#3, 2026-09-25): <script> govdesi lib/jsonLd.ts serializeJsonLd ile yazilir;
// dangerouslySetInnerHTML icinde ham JSON.stringify yasak.
const jsonLdFiles = [
  "app/page.tsx",
  "app/on-gorusme/page.tsx",
  "app/universities/[id]/page.tsx",
  "app/universities/[id]/departments/[deptSlug]/page.tsx",
];
for (const file of tracked) {
  const source = readFileSync(file, "utf8");
  if (/dangerouslySetInnerHTML=\{\{\s*__html:\s*JSON\.stringify\(/.test(source)) {
    failures.push(`${file}: JSON-LD icin ham JSON.stringify yerine serializeJsonLd kullan`);
  }
}
for (const file of jsonLdFiles) {
  if (!readFileSync(file, "utf8").includes("serializeJsonLd(")) {
    failures.push(`${file}: JSON-LD etiketi serializeJsonLd ile yazilmali`);
  }
}
// Site geneli Organization + WebSite JSON-LD yalnizca ana sayfada yayinlanir (STATUS #14, 2026-09-26);
// kok layout'a JSON-LD geri donerse ~1.000 sayfada tekrar eder.
if (readFileSync("app/layout.tsx", "utf8").includes("application/ld+json")) {
  failures.push("app/layout.tsx: site geneli JSON-LD ana sayfaya tasindi (lib/site.ts + app/page.tsx); kok layout'a JSON-LD ekleme");
}
if (!readFileSync("app/page.tsx", "utf8").includes("siteJsonLd")) {
  failures.push("app/page.tsx: Organization + WebSite JSON-LD (lib/site.ts siteJsonLd) ana sayfada yayinlanmali");
}
// On gorusme FAQPage semasi sayfada gorunen SSS ile ayni kaynaktan uretilir (STATUS #12a).
if (!readFileSync("app/on-gorusme/page.tsx", "utf8").includes("tr.homeFaq.items")) {
  failures.push("app/on-gorusme/page.tsx: FAQPage JSON-LD tr.homeFaq.items (sayfada gorunen SSS) kaynagindan uretilmeli");
}
const jsonLdHelper = readFileSync("lib/jsonLd.ts", "utf8");
for (const escape of ['"\\\\u003c"', '"\\\\u003e"', '"\\\\u0026"']) {
  if (!jsonLdHelper.includes(escape)) {
    failures.push(`lib/jsonLd.ts: ${escape} kacisi eksik`);
  }
}

// LCP gorseli (SEO_AUDIT.md §19.3, STATUS #12b, 2026-09-26): okul ve program sayfasinda ekranin ustundeki tek
// portre gorseli priority + fetchPriority="high" + gercek yerlesime gore sizes tasir (Next `priority` tek basina
// fetchpriority yazmaz). Liste gorselleri oncelikli olmaz; aksi halde LCP gorseliyle bant genisligi icin yarisir.
for (const file of [
  "components/university-details/ProgramPortraitHeader.tsx",
  "components/university-details/UniversityPortraitMasthead.tsx",
]) {
  const source = readFileSync(file, "utf8");
  for (const token of ["priority", 'fetchPriority="high"', 'sizes="(min-width:']) {
    if (!source.includes(token)) {
      failures.push(`${file}: LCP portre gorselinde ${token} eksik`);
    }
  }
}
for (const file of [
  "components/university-details/ProgramTransitionEntry.tsx",
  "components/universities/UniversityRows.tsx",
]) {
  const source = readFileSync(file, "utf8");
  if (/\bpriority\b/.test(source) || source.includes('fetchPriority="high"')) {
    failures.push(`${file}: liste gorseli oncelikli olmamali (sayfa basina tek LCP gorseli)`);
  }
}

// Sitemap: slug'lar adres olarak kodlanir; yenileme dizin memo'suyla ayni (3 saat).
const sitemap = readFileSync("app/sitemap.ts", "utf8");
if (!sitemap.includes("encodeURIComponent(dept.slug)")) {
  failures.push("app/sitemap.ts: program slug'i encodeURIComponent ile yazilmali");
}
if (!/export const revalidate = 10800;/.test(sitemap)) {
  failures.push("app/sitemap.ts: revalidate 10800 olmali (dizin memo'su 3 saat)");
}

// Sayfa agirligi (guvenlik ve optimizasyon denetimi karti 10, 2026-09-26).
// /isee ve /communities istek basina degisen icerik tasimaz; force-dynamic her ziyarette sunucu isi uretir.
for (const file of ["app/isee/page.tsx", "app/communities/page.tsx"]) {
  if (readFileSync(file, "utf8").includes("force-dynamic")) {
    failures.push(`${file}: force-dynamic olmamali (sayfa statik uretilir, H1 ve icerik HTML'de kalir)`);
  }
}
// Kok template.tsx her gezinmede yalniz ek bir sarmalayici uretiyordu (denetim O2#7).
if (existsSync("app/template.tsx")) {
  failures.push("app/template.tsx geri gelmemeli (islevsiz sarmalayici)");
}
// Font diyeti (denetim O3#9, STATUS #10): Spectral yalniz 400 ve 600 yuklenir; serif metinde font-medium (500) yok.
const rootLayout = readFileSync("app/layout.tsx", "utf8");
if (!/Spectral\(\{[\s\S]*?weight: \["400", "600"\],/.test(rootLayout)) {
  failures.push('app/layout.tsx: Spectral weight listesi ["400", "600"] olmali (500 ve 700 on yukleme maliyeti)');
}
for (const file of tracked) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const classes = match[1] ?? match[2] ?? "";
    if (/(^|\s)font-serif(\s|$)/.test(classes) && /(^|\s)font-medium(\s|$)/.test(classes)) {
      failures.push(`${file}: serif metinde font-medium (Spectral 500 yuklenmiyor); font-normal veya font-semibold kullan`);
    }
  }
}

// Tam `motion` bileseni tum ozellikleri (surukleme, yerlesim) her sayfaya ceker; `m` + LazyMotion kullanilir.
// layout/layoutId kullanan bilesen LayoutMotion (domMax, ayri paket) icinde cizilmelidir.
// Yalnizca LayoutMotion sarmalayicisi icinde cizilen bilesenler (cagiran dosya LayoutMotion import eder).
const RENDERED_INSIDE_LAYOUT_MOTION = new Set([
  "components/sat/SatDomainGroup.tsx",
  "components/sat/TopicRow.tsx",
  "components/ui/expandable-screen.tsx",
]);
for (const file of tracked) {
  const source = readFileSync(file, "utf8");
  const motionImport = source.match(/import\s*\{([^}]*)\}\s*from\s*["']framer-motion["']/);
  if (motionImport && /(^|[\s,])motion([\s,]|$)/.test(motionImport[1])) {
    failures.push(`${file}: framer-motion'dan \`motion\` yerine \`m\` import et (LazyMotion paket diyeti)`);
  }
  if (/<motion\./.test(source)) {
    failures.push(`${file}: <motion.*> yerine <m.*> kullan`);
  }
  const usesLayout = /\blayoutId=|\slayout=\{|\slayout="|\slayout\s*$/m.test(source);
  if (
    usesLayout &&
    file !== "components/motion/LayoutMotion.tsx" &&
    !RENDERED_INSIDE_LAYOUT_MOTION.has(file) &&
    !source.includes('import LayoutMotion from "@/components/motion/LayoutMotion"')
  ) {
    failures.push(`${file}: layout/layoutId kullanan bilesen LayoutMotion icinde olmali`);
  }
}

// Ceviri diyeti (denetim O3#4): Ingilizce metinler ilk pakete girmez. en.ts yalniz lib/translations/index.ts
// icindeki dinamik import ile yuklenir; tr.ts ile ayni anahtar agacini `Translations` tipi zorlar.
const translationIndex = readFileSync("lib/translations/index.ts", "utf8");
if (!translationIndex.includes('import("./en")')) {
  failures.push("lib/translations/index.ts: Ingilizce metinler dinamik import(\"./en\") ile yuklenmeli");
}
if (!readFileSync("lib/translations/en.ts", "utf8").includes("export const en: Translations = {")) {
  failures.push("lib/translations/en.ts: `export const en: Translations` (TR/EN anahtar esligi tip denetimi) kaybolmus");
}
const clientTracked = execSync("git ls-files app components lib context", { encoding: "utf8" })
  .split("\n")
  .filter((file) => /\.(tsx|ts)$/.test(file));
for (const file of clientTracked) {
  const source = readFileSync(file, "utf8");
  if (/from\s+["'](?:@\/lib\/translations\/en|\.\/en|\.\.\/translations\/en)["']/.test(source)) {
    failures.push(`${file}: lib/translations/en.ts statik import edilmemeli (loadEnglishTranslations kullan)`);
  }
}
if (existsSync("lib/translations.ts")) {
  failures.push("lib/translations.ts geri gelmemeli: metinler lib/translations/tr.ts ve en.ts'te");
}

const css = readFileSync("app/globals.css", "utf8");
if (!css.includes("--editorial-terracotta-ink: #9f4629")) {
  failures.push("globals.css: --editorial-terracotta-ink: #9f4629 tokenı eksik veya değişmiş (paper zemininde 5,78:1; en koyu kart zemininde 5,14:1)");
}

for (const file of tracked) {
  if (readFileSync(file, "utf8").includes("text-[var(--editorial-terracotta)]")) {
    failures.push(`${file}: terracotta metin/ikon için text-[var(--editorial-terracotta-ink)] kullanılmalı`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("SEO vitals guard passed.");
