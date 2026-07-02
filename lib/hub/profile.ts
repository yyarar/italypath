export const PROFILE_LEVELS = ["bachelor", "master"] as const;
export type ProfileLevel = (typeof PROFILE_LEVELS)[number];

export const PROFILE_FIELDS = [
  "engineering-tech",
  "medicine-health",
  "business-economics",
  "design-architecture",
  "natural-sciences",
  "social-humanities",
  "arts-fashion",
  "law-politics",
] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

export const PROFILE_BUDGETS = [
  "scholarship-required",
  "support-helpful",
  "flexible",
] as const;
export type ProfileBudget = (typeof PROFILE_BUDGETS)[number];

export const PROFILE_CITY_PREFS = ["big-city", "student-city", "any"] as const;
export type ProfileCityPref = (typeof PROFILE_CITY_PREFS)[number];

export const MAX_PROFILE_FIELDS = 2;

export interface UserProfile {
  level: ProfileLevel | null;
  fields: ProfileField[];
  budget: ProfileBudget | null;
  cityPref: ProfileCityPref | null;
}

export const EMPTY_PROFILE: UserProfile = {
  level: null,
  fields: [],
  budget: null,
  cityPref: null,
};

export function isProfileEmpty(profile: UserProfile): boolean {
  return (
    profile.level === null &&
    profile.fields.length === 0 &&
    profile.budget === null &&
    profile.cityPref === null
  );
}

export function isProfileLevel(value: unknown): value is ProfileLevel {
  return (
    typeof value === "string" &&
    (PROFILE_LEVELS as readonly string[]).includes(value)
  );
}

export function isProfileField(value: unknown): value is ProfileField {
  return (
    typeof value === "string" &&
    (PROFILE_FIELDS as readonly string[]).includes(value)
  );
}

export function isProfileBudget(value: unknown): value is ProfileBudget {
  return (
    typeof value === "string" &&
    (PROFILE_BUDGETS as readonly string[]).includes(value)
  );
}

export function isProfileCityPref(value: unknown): value is ProfileCityPref {
  return (
    typeof value === "string" &&
    (PROFILE_CITY_PREFS as readonly string[]).includes(value)
  );
}

export function sanitizeProfileFields(values: unknown): ProfileField[] {
  if (!Array.isArray(values)) return [];
  return values.filter(isProfileField).slice(0, MAX_PROFILE_FIELDS);
}
