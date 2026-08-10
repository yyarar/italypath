import type { ExpertLeadStatus } from "@/lib/mentor/expertLeads";
import type { ExpertLeadRow } from "@/types";

export type ExpertLeadFilter = "all" | ExpertLeadStatus;

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
  return filter === "all" ? rows : rows.filter((row) => row.status === filter);
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
