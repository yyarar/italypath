// ISEE aracı için deterministik biçimlendirme. Intl kullanılmaz: sunucu (Node ICU) ile tarayıcı çıktısı
// birebir aynı olmalı, aksi halde sunucu HTML'indeki limit rakamları hydration uyarısı üretir.

export type Language = "tr" | "en";

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

export function formatAmount(value: number, language: Language, digits = 0): string {
  const safe = Number.isFinite(value) ? value : 0;
  const [integerPart, fractionPart] = Math.abs(safe).toFixed(digits).split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, language === "tr" ? "." : ",");
  const decimal = fractionPart ? `${language === "tr" ? "," : "."}${fractionPart}` : "";
  const sign = safe < 0 && Number(Math.abs(safe).toFixed(digits)) !== 0 ? "-" : "";
  return `${sign}${grouped}${decimal}`;
}

export function formatEuro(value: number, language: Language, digits = 0): string {
  const amount = formatAmount(value, language, digits);
  return language === "tr" ? `${amount} €` : `€${amount}`;
}

export function formatPercent(value: number, language: Language): string {
  const rounded = Math.round(Number.isFinite(value) ? value : 0);
  return language === "tr" ? `%${rounded}` : `${rounded}%`;
}

// Yalnızca tam sayı kabul edilir: yapıştırılan "85,50" veya "85.5" gibi ondalık kısımlar atılır,
// "1.250" gibi binlik ayırıcılar korunur.
export function parseDigits(raw: string, maxDigits = 12): number | null {
  const digits = raw
    .replace(/[.,]\d{1,2}$/, "")
    .replace(/\D/g, "")
    .slice(0, maxDigits);
  return digits === "" ? null : Number(digits);
}
