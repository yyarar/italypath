// lib/officialLinkHosts.mjs icin tipler (ayni modul hem Next hem Node betikleri tarafindan
// dogrudan ice aktarildigi icin JS olarak yazildi).

export type OfficialLinkStatus =
  | "invalid"
  | "blocked"
  | "school"
  | "partner"
  | "public"
  | "unlisted";

export interface OfficialLinkClassification {
  status: OfficialLinkStatus;
  url: string | null;
  host: string | null;
  displayHost: string | null;
}

export interface OfficialLinkContext {
  universityId?: number;
  departmentId?: number | null;
}

export const SCHOOL_DOMAINS: Readonly<Record<number, readonly string[]>>;
export const PARTNER_DOMAINS_BY_DEPARTMENT: Readonly<Record<number, readonly string[]>>;
export const PUBLIC_PORTAL_DOMAINS: readonly string[];
export const BLOCKED_LINK_DOMAINS: readonly string[];
export const MAX_LINK_LENGTH: number;

export function parseHttpUrl(value: unknown): URL | null;
export function normalizeHost(host: unknown): string;
export function hostMatchesDomain(host: string, domain: string): boolean;
export function displayLinkHost(host: string): string;
export function classifyOfficialLink(
  value: unknown,
  context?: OfficialLinkContext,
): OfficialLinkClassification;
export function isShowableOfficialLinkStatus(status: OfficialLinkStatus): boolean;
export function isAllowedOfficialLinkStatus(status: OfficialLinkStatus): boolean;
