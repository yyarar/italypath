// Each commented line below is a defect this fixture exercises.
export const universitiesData = [
  { id: 1, departments: [{ slug: "civil-engineering" }] },
];

export const DEPARTMENT_DEADLINE_OVERRIDES = {
  "1:civil-engineering": { date: "May 15", sourceUrl: "http://example.com" }, // bad date format + non-HTTPS
  "99:unknown-program": { date: "2027-05-15", sourceUrl: "https://example.com" }, // unknown uni
  "1:nonexistent-slug": { date: "2027-05-15", sourceUrl: "https://example.com" }, // unknown slug
};
