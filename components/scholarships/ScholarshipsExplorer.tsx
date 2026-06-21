'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarRange,
  CheckCircle2,
  ExternalLink,
  Globe,
  Landmark,
  MapPinned,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

import { useLanguage } from '@/context/LanguageContext';
import {
  getScholarshipRegionBySlug,
  SCHOLARSHIP_DEFAULT_REGION,
  SCHOLARSHIP_REGIONS,
} from '@/lib/scholarships/regions';
import type { Language } from '@/types';
import type { RegionSlug, ScholarshipRegionRecord } from '@/types/scholarships';

const REGIONS_GEOJSON_URL = '/data/italy-regions.geojson';
const REGIONS_GEOJSON_VERSION = '2026-05-14';

const MAP_WIDTH = 760;
const MAP_HEIGHT = 980;
const MAP_PADDING = 26;

const REGION_FILL_COLORS = [
  '#d7e0d7',
  '#cbd8cf',
  '#e0ded2',
  '#d1dccf',
  '#e5dccf',
  '#cfdad4',
  '#ded7ca',
  '#d9e2d8',
  '#c9d6cc',
  '#e2ddcf',
  '#d3ddd5',
  '#dad6ca',
  '#cdd9d0',
  '#e4dbce',
  '#d1ddd7',
  '#d8decf',
  '#cbd8d3',
  '#e1dacd',
  '#d4dfd6',
  '#dcd6ca',
] as const;

const ACTIVE_REGION_FILL = '#285f68';
const MAP_INK = '#28443d';

type Position = [number, number];
type Polygon = Position[][];
type MultiPolygon = Polygon[];
type MapStatus = 'loading' | 'ready' | 'error';

type RegionShape = {
  slug: RegionSlug;
  d: string;
  centerX: number;
  centerY: number;
  name: string;
};

type ScholarshipsText = {
  pageIdentity: string;
  title: string;
  intro: string;
  verifiedAsOf: string;
  mapTitle: string;
  mapAlt: string;
  mapLoading: string;
  mapError: string;
  openRegionAria: string;
  institutionFileTitle: string;
  selectedRegionLabel: string;
  verifiedShort: string;
  pendingShort: string;
  pendingValue: string;
  academicYear: string;
  applicationWindow: string;
  iseeLimit: string;
  ispeLimit: string;
  managingBodies: string;
  officialSources: string;
  openInstitution: string;
  openSource: string;
  secondaryFacts: string;
  sourceChecklistTitle: string;
  sourceChecklistBody: string;
  regionRailTitle: string;
  lastVerified: string;
};

type ScholarshipMapProps = {
  regionShapes: RegionShape[];
  mapStatus: MapStatus;
  selectedSlug: RegionSlug;
  copy: ScholarshipsText;
  onSelectRegion: (slug: RegionSlug) => void;
  onRegionKeyDown: (event: KeyboardEvent<SVGPathElement>, slug: RegionSlug) => void;
};

const REGION_NAME_SYNONYMS: Record<RegionSlug, string[]> = {
  abruzzo: ['abruzzo'],
  basilicata: ['basilicata'],
  calabria: ['calabria'],
  campania: ['campania'],
  'emilia-romagna': ['emilia-romagna', 'emilia romagna'],
  'friuli-venezia-giulia': ['friuli-venezia giulia', 'friuli venezia giulia'],
  lazio: ['lazio'],
  liguria: ['liguria'],
  lombardia: ['lombardia'],
  marche: ['marche'],
  molise: ['molise'],
  piemonte: ['piemonte'],
  puglia: ['puglia'],
  sardegna: ['sardegna'],
  sicilia: ['sicilia'],
  toscana: ['toscana'],
  'trentino-alto-adige-suedtirol': [
    'trentino-alto adige',
    'trentino alto adige',
    'trentino alto adige sudtirol',
    'trentino-alto adige/sudtirol',
    'trentino-sudtirol',
  ],
  umbria: ['umbria'],
  'valle-d-aosta': [
    "valle d'aosta",
    'valle d aosta',
    "vallee d'aoste",
    'vallee d aoste',
    "valle d'aosta / vallee d'aoste",
  ],
  veneto: ['veneto'],
};

const REGION_NAME_TO_SLUG = new Map<string, RegionSlug>();
for (const [slug, names] of Object.entries(REGION_NAME_SYNONYMS) as [RegionSlug, string[]][]) {
  for (const name of names) {
    REGION_NAME_TO_SLUG.set(normalizeRegionText(name), slug);
  }
}

function normalizeRegionText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toPosition(value: unknown): Position | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const [lon, lat] = value;
  if (typeof lon !== 'number' || typeof lat !== 'number') return null;
  return [lon, lat];
}

function sanitizePolygon(raw: unknown): Polygon {
  if (!Array.isArray(raw)) return [];

  const polygon: Polygon = [];
  for (const ringRaw of raw) {
    if (!Array.isArray(ringRaw)) continue;

    const ring: Position[] = [];
    for (const pointRaw of ringRaw) {
      const point = toPosition(pointRaw);
      if (point) ring.push(point);
    }

    if (ring.length >= 3) polygon.push(ring);
  }

  return polygon;
}

function sanitizeGeometry(
  geometry: { type?: unknown; coordinates?: unknown } | undefined
): MultiPolygon {
  if (!geometry || typeof geometry.type !== 'string') return [];

  if (geometry.type === 'Polygon') {
    const polygon = sanitizePolygon(geometry.coordinates);
    return polygon.length > 0 ? [polygon] : [];
  }

  if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    const polygons: MultiPolygon = [];
    for (const polygonRaw of geometry.coordinates) {
      const polygon = sanitizePolygon(polygonRaw);
      if (polygon.length > 0) polygons.push(polygon);
    }
    return polygons;
  }

  return [];
}

function regionSlugFromProperties(properties: Record<string, unknown> | undefined) {
  if (!properties) return null;

  const directKeys = [
    'reg_name',
    'REG_NAME',
    'name',
    'NAME_1',
    'DEN_REG',
    'den_reg',
    'NOME_REG',
    'shapeName',
  ];

  for (const key of directKeys) {
    const candidate = properties[key];
    if (typeof candidate === 'string') {
      const slug = REGION_NAME_TO_SLUG.get(normalizeRegionText(candidate));
      if (slug) return slug;
    }
  }

  for (const value of Object.values(properties)) {
    if (typeof value !== 'string') continue;
    const slug = REGION_NAME_TO_SLUG.get(normalizeRegionText(value));
    if (slug) return slug;
  }

  return null;
}

function buildRegionShapes(payload: unknown): RegionShape[] {
  if (!payload || typeof payload !== 'object') return [];

  const rawFeatures = (payload as { features?: unknown }).features;
  if (!Array.isArray(rawFeatures)) return [];

  const polygonsBySlug = new Map<RegionSlug, MultiPolygon>();

  for (const rawFeature of rawFeatures) {
    if (!rawFeature || typeof rawFeature !== 'object') continue;

    const feature = rawFeature as {
      properties?: Record<string, unknown>;
      geometry?: { type?: unknown; coordinates?: unknown };
    };

    const slug = regionSlugFromProperties(feature.properties);
    if (!slug) continue;

    const polygons = sanitizeGeometry(feature.geometry);
    if (polygons.length === 0) continue;

    const current = polygonsBySlug.get(slug) ?? [];
    current.push(...polygons);
    polygonsBySlug.set(slug, current);
  }

  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const polygons of polygonsBySlug.values()) {
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const [lon, lat] of ring) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
  }

  if (!Number.isFinite(minLon) || !Number.isFinite(minLat)) {
    return [];
  }

  const lonRange = Math.max(maxLon - minLon, 1e-9);
  const latRange = Math.max(maxLat - minLat, 1e-9);
  const innerWidth = MAP_WIDTH - MAP_PADDING * 2;
  const innerHeight = MAP_HEIGHT - MAP_PADDING * 2;

  const project = ([lon, lat]: Position) => {
    const x = MAP_PADDING + ((lon - minLon) / lonRange) * innerWidth;
    const y = MAP_PADDING + ((maxLat - lat) / latRange) * innerHeight;
    return { x, y };
  };

  const shapes: RegionShape[] = [];

  for (const region of SCHOLARSHIP_REGIONS) {
    const polygons = polygonsBySlug.get(region.regionSlug);
    if (!polygons || polygons.length === 0) continue;

    const pathParts: string[] = [];
    let sumX = 0;
    let sumY = 0;
    let pointCount = 0;

    for (const polygon of polygons) {
      for (const ring of polygon) {
        if (ring.length < 3) continue;

        const ringCommands: string[] = [];
        for (let i = 0; i < ring.length; i += 1) {
          const point = project(ring[i]);
          ringCommands.push(`${i === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`);

          sumX += point.x;
          sumY += point.y;
          pointCount += 1;
        }

        pathParts.push(`${ringCommands.join(' ')} Z`);
      }
    }

    if (pathParts.length === 0 || pointCount === 0) continue;

    shapes.push({
      slug: region.regionSlug,
      name: region.regionName,
      d: pathParts.join(' '),
      centerX: sumX / pointCount,
      centerY: sumY / pointCount,
    });
  }

  return shapes;
}

function formatLastVerified(value: string | null, language: Language) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function domainLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function ScholarshipsTopBar({
  language,
  onToggleLanguage,
  pageIdentity,
  backHome,
}: {
  language: Language;
  onToggleLanguage: () => void;
  pageIdentity: string;
  backHome: string;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--editorial-border)] pb-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--editorial-muted)] transition hover:text-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--editorial-sage)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {backHome}
      </Link>

      <div className="hidden text-sm font-semibold text-[var(--editorial-ink)] sm:block">
        {pageIdentity}
      </div>

      <button
        onClick={onToggleLanguage}
        aria-label={language === 'tr' ? 'Switch to English' : 'Türkçeye geç'}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-3 py-2 text-xs font-bold text-[var(--editorial-ink)] transition hover:border-[var(--editorial-sage)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
      >
        <Globe className="h-3.5 w-3.5" />
        {language === 'tr' ? 'EN' : 'TR'}
      </button>
    </header>
  );
}

function ScholarshipsIntro({
  title,
  intro,
  verifiedAsOf,
}: {
  title: string;
  intro: string;
  verifiedAsOf: string;
}) {
  return (
    <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,0.35fr)] lg:items-end">
      <div>
        <h1 className="font-serif text-5xl font-normal leading-[0.95] tracking-normal text-[var(--editorial-ink)] sm:text-6xl lg:text-7xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--editorial-muted)] sm:text-lg">
          {intro}
        </p>
      </div>

      <div className="border-l-2 border-[var(--editorial-terracotta)] pl-4 text-sm leading-6 text-[var(--editorial-muted)]">
        {verifiedAsOf}
      </div>
    </section>
  );
}

function MapStateFrame({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center rounded-lg border border-dashed border-[var(--editorial-border)] bg-[#f1eadf] px-5 text-center text-sm font-semibold text-[var(--editorial-muted)]">
      {children}
    </div>
  );
}

function ScholarshipMap({
  regionShapes,
  mapStatus,
  selectedSlug,
  copy,
  onSelectRegion,
  onRegionKeyDown,
}: ScholarshipMapProps) {
  return (
    <section
      aria-labelledby="scholarship-map-title"
      className="min-w-0 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-4 shadow-[0_24px_70px_rgba(21,32,28,0.08)] sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md border border-[var(--editorial-border)] bg-[#f1eadf] text-[var(--editorial-sage)]">
            <MapPinned className="h-4 w-4" />
          </span>
          <h2 id="scholarship-map-title" className="text-base font-semibold text-[var(--editorial-ink)]">
            {copy.mapTitle}
          </h2>
        </div>
        <p className="text-xs font-semibold text-[var(--editorial-muted)]">
          {copy.selectedRegionLabel}: {getScholarshipRegionBySlug(selectedSlug).regionName}
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-[780px] min-w-0 overflow-hidden rounded-lg bg-[#f4efe6]">
        <div className="relative h-[280px] w-full sm:h-auto sm:aspect-[0.86] lg:h-[620px] lg:aspect-auto">
          {mapStatus === 'loading' && <MapStateFrame>{copy.mapLoading}</MapStateFrame>}
          {mapStatus === 'error' && <MapStateFrame>{copy.mapError}</MapStateFrame>}

          {mapStatus === 'ready' && (
            <svg
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={copy.mapAlt}
              className="h-full w-full"
            >
              <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#f4efe6" />
              {regionShapes.map((shape, index) => {
                const active = shape.slug === selectedSlug;
                const fill = active
                  ? ACTIVE_REGION_FILL
                  : REGION_FILL_COLORS[index % REGION_FILL_COLORS.length];

                return (
                  <path
                    key={shape.slug}
                    d={shape.d}
                    fill={fill}
                    fillRule="evenodd"
                    stroke={active ? MAP_INK : '#fffefa'}
                    strokeWidth={active ? 3 : 1.7}
                    className="cursor-pointer transition duration-150 hover:opacity-90 focus:outline-none"
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    aria-label={`${shape.name} ${copy.openRegionAria}`}
                    onClick={() => onSelectRegion(shape.slug)}
                    onKeyDown={(event) => onRegionKeyDown(event, shape.slug)}
                  />
                );
              })}

              {regionShapes.map((shape) => {
                const active = shape.slug === selectedSlug;
                return (
                  <g
                    key={`${shape.slug}-marker`}
                    className="cursor-pointer"
                    onClick={() => onSelectRegion(shape.slug)}
                  >
                    <circle
                      cx={shape.centerX}
                      cy={shape.centerY}
                      r={active ? 6.5 : 4.3}
                      fill={active ? '#fffefa' : '#b75b38'}
                      stroke={active ? ACTIVE_REGION_FILL : '#fffefa'}
                      strokeWidth={active ? 4 : 2}
                    />
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
      {icon}
      {children}
    </div>
  );
}

function LinkRow({
  href,
  icon,
  title,
  action,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  action: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--editorial-border)] py-3 text-left transition hover:bg-[#f6f0e7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
    >
      <span className="text-[var(--editorial-sage)]">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[var(--editorial-ink)]">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-[var(--editorial-muted)]">{domainLabel(href)}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--editorial-terracotta)]">
        {action}
        <ExternalLink className="h-3.5 w-3.5" />
      </span>
    </a>
  );
}

function FactLine({
  icon,
  title,
  value,
  pendingValue,
}: {
  icon: ReactNode;
  title: string;
  value: string | null;
  pendingValue: string;
}) {
  return (
    <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 border-t border-[var(--editorial-border)] py-3">
      <span className="pt-0.5 text-[var(--editorial-sage)]">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--editorial-muted)]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--editorial-ink)]">{value ?? pendingValue}</p>
      </div>
    </div>
  );
}

function RegionQuickFacts({
  region,
  copy,
}: {
  region: ScholarshipRegionRecord;
  copy: ScholarshipsText;
}) {
  return (
    <section className="mt-6">
      <SectionTitle icon={<CalendarRange className="h-3.5 w-3.5" />}>
        {copy.secondaryFacts}
      </SectionTitle>
      <div>
        <FactLine
          icon={<CalendarRange className="h-4 w-4" />}
          title={copy.academicYear}
          value={region.currentAcademicYear}
          pendingValue={copy.pendingValue}
        />
        <FactLine
          icon={<CalendarRange className="h-4 w-4" />}
          title={copy.applicationWindow}
          value={region.applicationWindow}
          pendingValue={copy.pendingValue}
        />
        <FactLine
          icon={<Wallet className="h-4 w-4" />}
          title={copy.iseeLimit}
          value={region.iseeLimit}
          pendingValue={copy.pendingValue}
        />
        <FactLine
          icon={<Wallet className="h-4 w-4" />}
          title={copy.ispeLimit}
          value={region.ispeLimit}
          pendingValue={copy.pendingValue}
        />
      </div>
    </section>
  );
}

function RegionFilePanel({
  region,
  language,
  copy,
}: {
  region: ScholarshipRegionRecord;
  language: Language;
  copy: ScholarshipsText;
}) {
  const isVerified = region.completeness === 'verified-full';
  const lastVerified = formatLastVerified(region.lastVerifiedAt, language);

  return (
    <aside className="min-w-0 border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-5 shadow-[0_24px_70px_rgba(21,32,28,0.08)] lg:sticky lg:top-5 lg:max-h-[760px] lg:overflow-y-auto">
      <div className="border-b border-[var(--editorial-border)] pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--editorial-muted)]">
          {copy.institutionFileTitle}
        </p>
        <h2 className="mt-2 font-serif text-4xl font-normal leading-tight tracking-normal text-[var(--editorial-ink)]">
          {region.regionName}
        </h2>
        <div className="mt-4 flex items-start gap-2 text-sm leading-6 text-[var(--editorial-muted)]">
          {isVerified ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--editorial-sage)]" />
          ) : (
            <ShieldCheck className="mt-0.5 h-4 w-4 text-[var(--editorial-terracotta)]" />
          )}
          <span>
            {isVerified ? copy.verifiedShort : copy.pendingShort}
            {lastVerified ? ` - ${copy.lastVerified}: ${lastVerified}` : ''}
          </span>
        </div>
      </div>

      <section className="mt-6">
        <SectionTitle icon={<Landmark className="h-3.5 w-3.5" />}>
          {copy.managingBodies}
        </SectionTitle>
        <div>
          {region.managingBodies.map((body) => (
            <LinkRow
              key={`${body.name}-${body.officialUrl}`}
              href={body.officialUrl}
              icon={<Building2 className="h-4 w-4" />}
              title={body.name}
              action={copy.openInstitution}
            />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle icon={<ExternalLink className="h-3.5 w-3.5" />}>
          {copy.officialSources}
        </SectionTitle>
        <div>
          {region.officialSourceUrls.map((url) => (
            <LinkRow
              key={url}
              href={url}
              icon={<ExternalLink className="h-4 w-4" />}
              title={domainLabel(url)}
              action={copy.openSource}
            />
          ))}
        </div>
      </section>

      <section className="mt-6 border-t border-[var(--editorial-border)] pt-4 text-[var(--editorial-ink)]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-[var(--editorial-terracotta)]" />
          <div>
            <p className="text-sm font-bold">{copy.sourceChecklistTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--editorial-muted)]">{copy.sourceChecklistBody}</p>
          </div>
        </div>
      </section>

      <RegionQuickFacts region={region} copy={copy} />
    </aside>
  );
}

function RegionRail({
  selectedSlug,
  onSelectRegion,
  copy,
}: {
  selectedSlug: RegionSlug;
  onSelectRegion: (slug: RegionSlug) => void;
  copy: ScholarshipsText;
}) {
  return (
    <section className="mt-6 min-w-0 border-y border-[var(--editorial-border)] py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--editorial-muted)]">
          {copy.regionRailTitle}
        </h2>
        <p className="hidden text-xs text-[var(--editorial-muted)] sm:block">{copy.selectedRegionLabel}</p>
      </div>

      <div className="-mx-4 flex min-w-0 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {SCHOLARSHIP_REGIONS.map((region) => {
          const active = region.regionSlug === selectedSlug;
          const verified = region.completeness === 'verified-full';

          return (
            <button
              key={region.regionSlug}
              type="button"
              onClick={() => onSelectRegion(region.regionSlug)}
              aria-pressed={active}
              className={`min-w-[180px] border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)] ${
                active
                  ? 'border-[var(--editorial-sage)] bg-[var(--editorial-sage)] text-white'
                  : 'border-[var(--editorial-border)] bg-[var(--editorial-surface)] text-[var(--editorial-ink)] hover:border-[var(--editorial-sage)]'
              }`}
            >
              <span className="block truncate text-sm font-semibold">{region.regionName}</span>
              <span className={`mt-1 block text-xs ${active ? 'text-white/75' : 'text-[var(--editorial-muted)]'}`}>
                {verified ? copy.verifiedShort : copy.pendingShort}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface ScholarshipsExplorerProps {
  initialSelectedRegion: RegionSlug;
}

export default function ScholarshipsExplorer({
  initialSelectedRegion,
}: ScholarshipsExplorerProps) {
  const { t, language, toggleLanguage } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const [regionShapes, setRegionShapes] = useState<RegionShape[]>([]);
  const [mapStatus, setMapStatus] = useState<MapStatus>('loading');
  const [selectedSlug, setSelectedSlug] = useState<RegionSlug>(initialSelectedRegion);

  const selectedRegion = getScholarshipRegionBySlug(selectedSlug);
  const copy = t.scholarships;

  const handleRegionSelect = useCallback(
    (slug: RegionSlug) => {
      setSelectedSlug(slug);
      const params = new URLSearchParams();
      if (slug === SCHOLARSHIP_DEFAULT_REGION) {
        params.delete('region');
      } else {
        params.set('region', slug);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const handleMapKeyDown = useCallback(
    (event: KeyboardEvent<SVGPathElement>, slug: RegionSlug) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleRegionSelect(slug);
      }
    },
    [handleRegionSelect]
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadMap() {
      setMapStatus('loading');
      try {
        const response = await fetch(`${REGIONS_GEOJSON_URL}?v=${REGIONS_GEOJSON_VERSION}`, {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`GeoJSON fetch failed: ${response.status}`);
        }

        const payload = (await response.json()) as unknown;
        const shapes = buildRegionShapes(payload);

        if (!active) return;

        if (shapes.length < 20) {
          setMapStatus('error');
          setRegionShapes([]);
          return;
        }

        setRegionShapes(shapes);
        setMapStatus('ready');
      } catch {
        if (!active || controller.signal.aborted) return;
        setMapStatus('error');
        setRegionShapes([]);
      }
    }

    loadMap();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-12 text-[var(--editorial-ink)]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <ScholarshipsTopBar
          language={language}
          onToggleLanguage={toggleLanguage}
          pageIdentity={copy.pageIdentity}
          backHome={t.list.backHome}
        />

        <ScholarshipsIntro
          title={copy.title}
          intro={copy.intro}
          verifiedAsOf={copy.verifiedAsOf}
        />

        <main className="mt-8 grid min-w-0 gap-24 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] lg:items-start lg:gap-6">
          <ScholarshipMap
            regionShapes={regionShapes}
            mapStatus={mapStatus}
            selectedSlug={selectedSlug}
            copy={copy}
            onSelectRegion={handleRegionSelect}
            onRegionKeyDown={handleMapKeyDown}
          />

          <RegionFilePanel region={selectedRegion} language={language} copy={copy} />
        </main>

        <RegionRail selectedSlug={selectedSlug} onSelectRegion={handleRegionSelect} copy={copy} />
      </div>
    </div>
  );
}
