"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CompactStatCardProps {
  href: string;
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
}

export default function CompactStatCard({
  href,
  label,
  value,
  icon: Icon,
  iconClassName,
}: CompactStatCardProps) {
  return (
    <Link
      href={href}
      className="hub-material hub-pressable hub-card-lift group flex min-h-28 items-center justify-between rounded-[1.5rem] p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] sm:p-5"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
          {label}
        </p>
        <p className="mt-1 line-clamp-2 font-serif text-lg leading-tight text-[var(--editorial-ink)] sm:text-xl">{value}</p>
      </div>
      <div className="ml-3 flex shrink-0 flex-col items-end gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--editorial-paper)] shadow-sm">
          <Icon className={`h-[18px] w-[18px] ${iconClassName}`} strokeWidth={2} />
        </span>
        <ArrowUpRight className="hub-arrow h-3.5 w-3.5 text-[var(--editorial-muted)]" aria-hidden="true" />
      </div>
    </Link>
  );
}
