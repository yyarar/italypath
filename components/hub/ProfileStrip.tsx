"use client";

import Link from "next/link";

import { useLanguage } from "@/context/LanguageContext";
import type { UserProfile } from "@/lib/hub/profile";

export default function ProfileStrip({ profile }: { profile: UserProfile }) {
  const { t } = useLanguage();

  const parts: string[] = [];
  if (profile.level) parts.push(t.onboarding.steps.level.options[profile.level]);
  for (const field of profile.fields) {
    parts.push(t.onboarding.steps.fields.options[field]);
  }
  if (profile.budget) parts.push(t.onboarding.steps.budget.options[profile.budget]);
  if (profile.cityPref) parts.push(t.onboarding.steps.city.options[profile.cityPref]);

  const incomplete =
    !profile.level ||
    profile.fields.length === 0 ||
    !profile.budget ||
    !profile.cityPref;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 border border-[var(--editorial-sage)] bg-[var(--editorial-sage-soft)] px-4 py-2.5">
      {parts.map((part, i) => (
        <span key={part} className="text-[12px] text-[var(--editorial-ink)]">
          {i > 0 && <span className="mr-2 text-[var(--editorial-muted)]">·</span>}
          {part}
        </span>
      ))}
      <Link
        href="/hosgeldin"
        className="ml-auto border-b border-[var(--editorial-sage)] pb-px text-[11px] font-semibold text-[var(--editorial-sage)]"
      >
        {incomplete ? t.hub.profileStrip.complete : t.hub.profileStrip.edit}
      </Link>
    </div>
  );
}
