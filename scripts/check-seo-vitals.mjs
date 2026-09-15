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
