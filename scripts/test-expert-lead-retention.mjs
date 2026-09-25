import assert from "node:assert/strict";

import {
  EXPERT_LEAD_RETENTION_RULES,
  retentionCutoffs,
  subtractUtcMonths,
} from "./expert-lead-retention.mjs";

// Kerem karari 2026-09-26: tamamlanan ve ulasilamayan (iletisime gecildi) talepler son islemden
// 6 ay sonra, supheli kayitlar 30 gun sonra silinir; "Yeni" taleplere dokunulmaz.
assert.deepEqual(
  EXPERT_LEAD_RETENTION_RULES.map(({ id, statuses, months, days }) => ({ id, statuses, months, days })),
  [
    { id: "closed-6-months", statuses: ["completed", "contacted"], months: 6, days: undefined },
    { id: "suspected-30-days", statuses: ["suspected"], months: undefined, days: 30 },
  ],
);
assert.ok(
  EXPERT_LEAD_RETENTION_RULES.every((rule) => !rule.statuses.includes("new")),
  "Yeni talepler saklama kuraliyla silinmez",
);

// Ay cikarma: ay sonu tasmaz, o ayin son gunune oturur.
assert.equal(subtractUtcMonths(new Date("2027-03-15T10:00:00Z"), 6).toISOString(), "2026-09-15T10:00:00.000Z");
assert.equal(subtractUtcMonths(new Date("2027-08-31T00:00:00Z"), 6).toISOString(), "2027-02-28T00:00:00.000Z");
assert.equal(subtractUtcMonths(new Date("2028-08-31T00:00:00Z"), 6).toISOString(), "2028-02-29T00:00:00.000Z");
assert.equal(subtractUtcMonths(new Date("2027-01-10T00:00:00Z"), 6).toISOString(), "2026-07-10T00:00:00.000Z");

const cutoffs = retentionCutoffs(new Date("2027-04-01T12:00:00Z"));
assert.deepEqual(
  cutoffs.map(({ id, statuses, cutoff }) => ({ id, statuses, cutoff: cutoff.toISOString() })),
  [
    { id: "closed-6-months", statuses: ["completed", "contacted"], cutoff: "2026-10-01T12:00:00.000Z" },
    { id: "suspected-30-days", statuses: ["suspected"], cutoff: "2027-03-02T12:00:00.000Z" },
  ],
);

console.log("Expert lead retention tests passed.");
