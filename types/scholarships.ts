export type RegionSlug =
  | "abruzzo"
  | "basilicata"
  | "calabria"
  | "campania"
  | "emilia-romagna"
  | "friuli-venezia-giulia"
  | "lazio"
  | "liguria"
  | "lombardia"
  | "marche"
  | "molise"
  | "piemonte"
  | "puglia"
  | "sardegna"
  | "sicilia"
  | "toscana"
  | "trentino-alto-adige-suedtirol"
  | "umbria"
  | "valle-d-aosta"
  | "veneto";

export type RegionDataCompleteness = "verified-full" | "registry-only";

export interface ManagingBody {
  name: string;
  officialUrl: string;
}

export interface ScholarshipRegionRecord {
  regionSlug: RegionSlug;
  regionName: string;
  managingBodies: ManagingBody[];
  currentAcademicYear: string | null;
  applicationWindow: string | null;
  iseeLimit: string | null;
  ispeLimit: string | null;
  benefits: string[];
  housingSupport: string | null;
  canteenSupport: string | null;
  internationalStudentNotes: string | null;
  officialSourceUrls: string[];
  lastVerifiedAt: string | null; // YYYY-MM-DD
  statusNote: string;
  completeness: RegionDataCompleteness;
}
