import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

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
if (!routeTransition.includes("<motion.div") || !routeTransition.includes("key={pathname}")) {
  failures.push("RouteTransition: pathname anahtarlı motion.div sarmalayıcısı beklenen yapıda değil; guard'ı güncelle");
}

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
}

const css = readFileSync("app/globals.css", "utf8");
if (!css.includes("--editorial-terracotta-ink: #9f4629")) {
  failures.push("globals.css: --editorial-terracotta-ink: #9f4629 tokenı eksik veya değişmiş (paper zemininde 5,78:1; en koyu kart zemininde 5,14:1)");
}

const tracked = execSync("git ls-files app components lib", { encoding: "utf8" })
  .split("\n")
  .filter((file) => /\.(tsx|ts)$/.test(file));
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
