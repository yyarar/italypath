"use client";

interface UniversitiesLoadingStateProps {
  label: string;
}

interface UniversitiesErrorStateProps {
  message: string;
}

interface UniversitiesEmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  onClearFilters: () => void;
}

function SkeletonRow({ wide = false }: { wide?: boolean }) {
  return (
    <div className="grid gap-4 border-b border-[var(--editorial-border)] p-4 last:border-b-0 sm:grid-cols-[112px_minmax(0,1fr)_90px] sm:p-5">
      <div className="h-24 animate-pulse bg-[var(--editorial-paper)] sm:h-28" />
      <div className="min-w-0 space-y-3">
        <div className={`h-5 animate-pulse bg-[var(--editorial-paper)] ${wide ? "w-4/5" : "w-2/3"}`} />
        <div className="h-3 w-full animate-pulse bg-[var(--editorial-paper)]" />
        <div className="h-3 w-3/4 animate-pulse bg-[var(--editorial-paper)]" />
        <div className="flex gap-2">
          <div className="h-7 w-20 animate-pulse bg-[var(--editorial-paper)]" />
          <div className="h-7 w-24 animate-pulse bg-[var(--editorial-paper)]" />
        </div>
      </div>
      <div className="hidden h-9 animate-pulse bg-[var(--editorial-paper)] sm:block" />
    </div>
  );
}

export function UniversitiesLoadingState({ label }: UniversitiesLoadingStateProps) {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-[var(--editorial-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
          {label}
        </p>
        <div className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
          <SkeletonRow wide />
          <SkeletonRow />
          <SkeletonRow wide />
          <SkeletonRow />
        </div>
      </div>
    </div>
  );
}

export function UniversitiesErrorState({ message }: UniversitiesErrorStateProps) {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-[var(--editorial-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-xl flex-col border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
          ItalyPath
        </p>
        <h1 className="mt-4 font-serif text-3xl font-semibold tracking-[-0.03em]">
          {message}
        </h1>
      </div>
    </div>
  );
}

export function UniversitiesEmptyState({
  title,
  description,
  actionLabel,
  onClearFilters,
}: UniversitiesEmptyStateProps) {
  return (
    <div className="mt-6 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8 text-[var(--editorial-ink)] sm:p-10">
      <div className="flex max-w-2xl flex-col">
        <span className="mb-5 flex h-12 w-12 items-center justify-center border border-[var(--editorial-border)] bg-[var(--editorial-paper)] font-serif text-2xl text-[var(--editorial-sage)]">
          ?
        </span>
        <h2 className="font-serif text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--editorial-muted)] sm:text-base">
          {description}
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-6 inline-flex w-fit border border-[var(--editorial-sage)] bg-[var(--editorial-sage)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#173d36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
