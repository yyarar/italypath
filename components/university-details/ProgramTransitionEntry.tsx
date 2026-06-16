"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { DEFAULT_IMAGE, type Department, type University } from "@/app/data";
import {
  ExpandableScreen,
  ExpandableScreenContent,
  ExpandableScreenTrigger,
} from "@/components/ui/expandable-screen";

interface ProgramTransitionEntryProps {
  university: University;
  department: Department;
  openingLabel: string;
  comingSoonLabel: string;
  expanding: boolean;
  onSelect: (slug: string) => void;
}

export function ProgramTransitionEntry({
  university,
  department,
  openingLabel,
  comingSoonLabel,
  expanding,
  onSelect,
}: ProgramTransitionEntryProps) {
  const cardLayoutId = `dept-card-${university.id}-${department.slug}`;
  const titleLayoutId = `dept-title-${university.id}-${department.slug}`;

  return (
    <ExpandableScreen
      layoutId={cardLayoutId}
      triggerRadius="0px"
      contentRadius="8px"
      animationDuration={0.26}
      defaultExpanded={expanding}
    >
      <ExpandableScreenTrigger className="group border-b border-[var(--editorial-border)] bg-[var(--editorial-surface)] transition hover:bg-[var(--editorial-paper)]">
        <button
          type="button"
          onClick={() => onSelect(department.slug)}
          disabled={expanding}
          aria-label={
            department.admissionDetails
              ? undefined
              : `${department.name} — ${comingSoonLabel}`
          }
          className="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left sm:px-5"
        >
          <motion.span
            layoutId={titleLayoutId}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="min-w-0 font-semibold text-[var(--editorial-ink)] transition group-hover:text-[var(--editorial-sage)]"
          >
            {department.name}
          </motion.span>
          {department.admissionDetails ? (
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--editorial-terracotta)]" />
          ) : (
            <span className="shrink-0 rounded-full border border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
              {comingSoonLabel}
            </span>
          )}
        </button>
      </ExpandableScreenTrigger>

      <ExpandableScreenContent
        showCloseButton={false}
        className="fixed inset-2 z-[90] overflow-hidden border border-[var(--editorial-border)] bg-[var(--editorial-surface)] shadow-[0_24px_90px_rgba(21,32,28,0.22)] sm:inset-4"
      >
        <div className="grid h-full grid-rows-[minmax(180px,42vh)_1fr] bg-[var(--editorial-paper)]">
          <div className="relative min-h-0">
            <Image
              src={university.image || DEFAULT_IMAGE}
              alt={`${department.name} - ${university.name}`}
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/15" />
          </div>
          <div className="flex min-h-0 items-center justify-center px-6 text-center">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
                {university.name}
              </p>
              <motion.h3
                layoutId={titleLayoutId}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className="mt-3 font-serif text-3xl font-semibold leading-tight text-[var(--editorial-ink)] sm:text-5xl"
              >
                {department.name}
              </motion.h3>
              <p className="mt-4 text-sm font-semibold text-[var(--editorial-muted)]">
                {openingLabel}
              </p>
            </div>
          </div>
        </div>
      </ExpandableScreenContent>
    </ExpandableScreen>
  );
}
