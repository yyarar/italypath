"use client";

import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

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
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[1.35rem] border border-[rgba(31,79,70,0.12)] bg-[rgba(219,232,225,0.72)] p-2.5 shadow-[0_8px_24px_rgba(31,79,70,0.06)]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--editorial-surface)] text-[var(--editorial-sage)] shadow-sm">
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {parts.map((part) => (
          <span key={part} className="rounded-full bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--editorial-ink)] ring-1 ring-inset ring-white/60 sm:text-[12px]">
            {part}
          </span>
        ))}
      </div>
      <Link
        href="/hosgeldin"
        className="hub-pressable ml-auto inline-flex min-h-9 items-center rounded-full bg-[var(--editorial-sage)] px-3.5 text-[11px] font-semibold text-white shadow-[0_5px_14px_rgba(31,79,70,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
      >
        {incomplete ? t.hub.profileStrip.complete : t.hub.profileStrip.edit}
      </Link>
    </div>
  );
}
