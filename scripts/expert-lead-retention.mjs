// Uzman on gorusme taleplerinin saklama suresi (Kerem karari 2026-09-26; denetim S7#4).
// Sure `updated_at` (son islem: durum degisikligi veya ic not) ile olculur. "Yeni" talepler
// ekip isleyene kadar kalir. Metin karsiligi: docs/legal/2026-09-26-gizlilik-taslagi.md.
// Uygulayan komut: npm run cleanup:expert-leads (varsayilan kuru calisma, silme icin --apply).

export const EXPERT_LEAD_RETENTION_RULES = Object.freeze([
  Object.freeze({
    id: "closed-6-months",
    label: "Tamamlandı / İletişime geçildi, son işlemden 6 ay sonra",
    statuses: Object.freeze(["completed", "contacted"]),
    months: 6,
  }),
  Object.freeze({
    id: "suspected-30-days",
    label: "Şüpheli, son işlemden 30 gün sonra",
    statuses: Object.freeze(["suspected"]),
    days: 30,
  }),
]);

// Ay sonu tasmaz: 31 Agustos'tan 6 ay once 28 (veya 29) Subat'tir, 3 Mart degil.
export function subtractUtcMonths(date, months) {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function retentionCutoffs(now = new Date()) {
  return EXPERT_LEAD_RETENTION_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    statuses: [...rule.statuses],
    cutoff:
      rule.months !== undefined
        ? subtractUtcMonths(now, rule.months)
        : new Date(now.getTime() - rule.days * 24 * 60 * 60 * 1000),
  }));
}
