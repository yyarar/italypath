"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { motion } from "framer-motion";

import { DEFAULT_UNIVERSITY_IMAGE } from "@/lib/universityDefaults";
import type { Department, University } from "@/types/universities";

interface ProgramPortraitHeaderProps {
  university: University;
  department: Department;
  eyebrow: string;
  backLabel: string;
  websiteLabel: string;
}

export function ProgramPortraitHeader({
  university,
  department,
  eyebrow,
  backLabel,
  websiteLabel,
}: ProgramPortraitHeaderProps) {
  return (
    <header className="border-b border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/universities/${university.id}`}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.05fr)] lg:items-stretch">
          <div className="relative aspect-[16/11] min-h-64 overflow-hidden border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
            <Image
              src={university.image || DEFAULT_UNIVERSITY_IMAGE}
              alt={`${department.name} - ${university.name}`}
              fill
              priority
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="object-cover"
            />
          </div>

          <div className="flex min-w-0 flex-col justify-between border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-5 sm:p-7">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
                {eyebrow}
              </p>
              <motion.h1
                layoutId={`dept-title-${university.id}-${department.slug}`}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className="mt-4 break-words font-serif text-4xl font-semibold leading-[0.98] text-[var(--editorial-ink)] sm:text-5xl lg:text-6xl"
              >
                {department.name}
              </motion.h1>
              <Link
                href={`/universities/${university.id}`}
                className="mt-5 inline-flex font-serif text-2xl font-semibold text-[var(--editorial-sage)] transition hover:text-[var(--editorial-ink)]"
              >
                {university.name}
              </Link>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--editorial-muted)]">
                <MapPin className="h-4 w-4 text-[var(--editorial-terracotta)]" />
                {university.city}
              </p>
            </div>

            <a
              href={university.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex w-fit items-center gap-2 border-t border-[var(--editorial-border)] pt-4 text-sm font-bold text-[var(--editorial-sage)] transition hover:text-[var(--editorial-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
            >
              {websiteLabel}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
