import type { ExpertLeadStatus } from "@/lib/mentor/expertLeads";
import type { ExpertLeadRow } from "@/types";

export type ExpertLeadFilter = "all" | ExpertLeadStatus;

// "all" lists every lead except suspected ones, which stay in their own filter.
export const EXPERT_LEAD_FILTERS: readonly ExpertLeadFilter[] = [
  "new",
  "contacted",
  "completed",
  "all",
  "suspected",
];
export const DEFAULT_EXPERT_LEAD_FILTER: ExpertLeadFilter = "new";
export const EXPERT_LEAD_PAGE_SIZE = 50;

export interface ExpertLeadIdentityState {
  ownerId: string | null;
  generation: number;
  authorized: boolean | null;
}

export interface ExpertLeadIdentityTransition extends ExpertLeadIdentityState {
  ready: boolean;
  changed: boolean;
}

export function filterExpertLeads(
  rows: ExpertLeadRow[],
  filter: ExpertLeadFilter,
): ExpertLeadRow[] {
  return filter === "all"
    ? rows.filter((row) => row.status !== "suspected")
    : rows.filter((row) => row.status === filter);
}

// A page is requested with one extra row; its presence means more rows exist.
export function splitExpertLeadPage(
  rows: ExpertLeadRow[],
  pageSize = EXPERT_LEAD_PAGE_SIZE,
): { rows: ExpertLeadRow[]; hasMore: boolean } {
  return { rows: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export function appendExpertLeads(
  rows: ExpertLeadRow[],
  page: ExpertLeadRow[],
): ExpertLeadRow[] {
  const seen = new Set(rows.map((row) => row.id));
  return [...rows, ...page.filter((row) => !seen.has(row.id))];
}

// PostgREST filter for the rows after `last` in (created_at desc, id desc)
// order; ties on created_at fall back to id so no row is skipped or repeated.
export function expertLeadCursorFilter(last: Pick<ExpertLeadRow, "created_at" | "id">): string {
  const createdAt = `"${last.created_at}"`;
  return `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt."${last.id}")`;
}

export function replaceExpertLead(
  rows: ExpertLeadRow[],
  replacement: ExpertLeadRow,
): ExpertLeadRow[] {
  return rows.map((row) => (row.id === replacement.id ? replacement : row));
}

export function removeExpertLead(rows: ExpertLeadRow[], id: string): ExpertLeadRow[] {
  return rows.filter((row) => row.id !== id);
}

export function resolveExpertLeadSelection(
  rows: ExpertLeadRow[],
  selectedId: string | null,
  filter: ExpertLeadFilter,
): string | null {
  const filteredRows = filterExpertLeads(rows, filter);
  if (selectedId && filteredRows.some((row) => row.id === selectedId)) {
    return selectedId;
  }
  return filteredRows[0]?.id ?? null;
}

export function transitionExpertLeadIdentity(
  current: ExpertLeadIdentityState,
  resolvedUserId: string | null | undefined,
): ExpertLeadIdentityTransition {
  if (resolvedUserId === undefined) {
    return {
      ownerId: current.ownerId,
      generation: current.generation + 1,
      authorized: null,
      ready: false,
      changed: true,
    };
  }

  if (resolvedUserId === null) {
    const changed = current.ownerId !== null || current.authorized !== false;
    return {
      ownerId: null,
      generation: current.generation + (changed ? 1 : 0),
      authorized: false,
      ready: true,
      changed,
    };
  }

  if (current.ownerId === resolvedUserId) {
    return { ...current, ready: true, changed: false };
  }

  return {
    ownerId: resolvedUserId,
    generation: current.generation + 1,
    authorized: null,
    ready: true,
    changed: true,
  };
}
