"use client";

import type { Department, University } from "@/app/data";
import { ProgramTransitionEntry } from "./ProgramTransitionEntry";

interface ProgramDirectoryProps {
  university: University;
  departments: Department[];
  title: string;
  programCountLabel: string;
  bachelorPrograms: string;
  masterPrograms: string;
  singleCyclePrograms: string;
  openingLabel: string;
  expandingSlug: string | null;
  onSelect: (slug: string) => void;
}

function ProgramGroup({
  university,
  departments,
  label,
  openingLabel,
  expandingSlug,
  onSelect,
}: {
  university: University;
  departments: Department[];
  label: string;
  openingLabel: string;
  expandingSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  if (departments.length === 0) return null;

  return (
    <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--editorial-border)] bg-[var(--editorial-paper)] px-4 py-3 sm:px-5">
        <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
          {label}
        </h3>
        <span className="font-serif text-xl font-semibold text-[var(--editorial-terracotta)]">
          {departments.length}
        </span>
      </header>
      <div>
        {departments.map((department) => (
          <ProgramTransitionEntry
            key={department.slug}
            university={university}
            department={department}
            openingLabel={openingLabel}
            expanding={expandingSlug === department.slug}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

export function ProgramDirectory({
  university,
  departments,
  title,
  programCountLabel,
  bachelorPrograms,
  masterPrograms,
  singleCyclePrograms,
  openingLabel,
  expandingSlug,
  onSelect,
}: ProgramDirectoryProps) {
  const bachelorDepartments = departments.filter(
    (department) => department.level === "bachelor",
  );
  const masterDepartments = departments.filter(
    (department) => department.level === "master",
  );
  const singleCycleDepartments = departments.filter(
    (department) => department.level === "single-cycle",
  );
  const visibleGroupCount = [
    bachelorDepartments,
    masterDepartments,
    singleCycleDepartments,
  ].filter((group) => group.length > 0).length;
  const gridColumnsClass =
    visibleGroupCount >= 3
      ? "lg:grid-cols-3"
      : visibleGroupCount === 2
        ? "lg:grid-cols-2"
        : "lg:grid-cols-1";

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--editorial-border)] pb-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
            {programCountLabel}
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold leading-none text-[var(--editorial-ink)] sm:text-4xl">
            {title}
          </h2>
        </div>
        <p className="text-sm font-bold text-[var(--editorial-muted)]">
          <span className="font-serif text-3xl text-[var(--editorial-ink)]">
            {departments.length}
          </span>{" "}
          {programCountLabel}
        </p>
      </div>

      <div className={`grid gap-4 ${gridColumnsClass}`}>
        <ProgramGroup
          university={university}
          departments={bachelorDepartments}
          label={bachelorPrograms}
          openingLabel={openingLabel}
          expandingSlug={expandingSlug}
          onSelect={onSelect}
        />
        <ProgramGroup
          university={university}
          departments={masterDepartments}
          label={masterPrograms}
          openingLabel={openingLabel}
          expandingSlug={expandingSlug}
          onSelect={onSelect}
        />
        <ProgramGroup
          university={university}
          departments={singleCycleDepartments}
          label={singleCyclePrograms}
          openingLabel={openingLabel}
          expandingSlug={expandingSlug}
          onSelect={onSelect}
        />
      </div>
    </section>
  );
}
