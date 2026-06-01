"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface DocumentsHeaderProps {
  docCount: number;
  typeCount: number;
}

export default function DocumentsHeader({ docCount, typeCount }: DocumentsHeaderProps) {
  const { t } = useLanguage();
  return (
    <header className="border-b border-[var(--editorial-border)] px-6 pb-7 pt-6">
      <Link
        href="/"
        className="mb-7 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--editorial-muted)] transition-colors hover:text-[var(--editorial-sage)]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        {t.list.backHome}
      </Link>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--editorial-terracotta)]">
        {t.documents.eyebrow}
      </p>
      <h1 className="mt-2 font-serif text-4xl font-normal tracking-[-0.01em] text-[var(--editorial-ink)] sm:text-5xl">
        {t.documents.title}
      </h1>
      {docCount > 0 && (
        <p className="mt-3 text-[13px] text-[var(--editorial-muted)]">
          {docCount} {t.documents.summary.docs} · {typeCount} {t.documents.summary.types}
        </p>
      )}
    </header>
  );
}
