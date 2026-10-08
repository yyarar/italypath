// IMAT deneme ekranlari icin deterministik bicimlendirme (Intl yok; components/isee/format.ts kalibi):
// sunucu ve tarayici ayni ciktiyi uretir.

/** Bir ondalik; TR virgul (58,5), EN nokta (58.5). Puanlar 0,1'in katidir (1,5 ve 0,4). */
export function formatScore(score: number, language: "tr" | "en"): string {
  const safe = Number.isFinite(score) ? score : 0;
  const fixed = safe.toFixed(1);
  const normalized = fixed === "-0.0" ? "0.0" : fixed;
  return language === "tr" ? normalized.replace(".", ",") : normalized;
}

/** `{ad}` yer tutucularini doldurur; bilinmeyen yer tutucu oldugu gibi kalir. */
export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/** Yerel saatle YYYY-MM-DD HH:mm (dil ayarindan bagimsiz). Yalniz istemcide yuklenen veride kullanilir. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
