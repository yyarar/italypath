// Minimal mock of app/data.ts shape for testing the check script.
export const universitiesData = [
  { id: 1, departments: [{ slug: "civil-engineering" }, { slug: "interaction-design" }] },
  { id: 7, departments: [{ slug: "global-law" }] },
];

export const DEPARTMENT_DEADLINE_OVERRIDES = {
  "1:civil-engineering": { date: "2027-05-15", note: "ok", sourceUrl: "https://example.com" },
  "7:global-law": { date: "rolling", sourceUrl: "https://example.com" },
};
