"use client";

import Link from "next/link";
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
      className="flex items-center justify-between border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 transition-colors hover:bg-[rgba(216,222,217,0.25)]"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--editorial-muted)]">
          {label}
        </p>
        <p className="mt-1 font-serif text-xl text-[var(--editorial-ink)]">{value}</p>
      </div>
      <Icon className={`h-[18px] w-[18px] ${iconClassName}`} strokeWidth={2} />
    </Link>
  );
}
