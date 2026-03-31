'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarRange,
  ExternalLink,
  Globe,
  Hotel,
  Soup,
  Wallet,
} from 'lucide-react';

import { useLanguage } from '@/context/LanguageContext';
import { useScholarshipsData } from '@/lib/useScholarshipsData';
import type { RegionSlug, ScholarshipRegionRecord } from '@/types/scholarships';

const REGIONS_GEOJSON_URL =
  '/data/italy-regions.geojson';

const MAP_WIDTH = 760;
const MAP_HEIGHT = 980;
const MAP_PADDING = 26;

const REGION_FILL_COLORS = [
  '#6EA8F5', '#7CB1F7', '#4B97F0', '#82B6F8', '#5FA1F2',
  '#95C0FA', '#5F9EF0', '#7FB4F7', '#3D8DEA', '#67A5F2',
  '#86B9F8', '#4A95EF', '#6CA8F3', '#8ABCF9', '#5CA0F1',
  '#7AAFF6', '#4F97EC', '#6AA7F3', '#89BBF8', '#5B9EED',
] as const;

type Position = [number, number];
type Polygon = Position[][];
type MultiPolygon = Polygon[];

type RegionShape = {
  slug: RegionSlug;
  d: string;
  centerX: number;
  centerY: number;
  name: string;
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

function buildRegionShapes(
  payload: unknown,
  regions: ScholarshipRegionRecord[]
): RegionShape[] {
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

  for (const region of regions) {
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

function formatLastVerified(value: string | null, language: 'tr' | 'en') {
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

function QuickFact({
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
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {icon}
        {title}
      </div>
      <p className="text-sm font-semibold text-slate-800">{value ?? pendingValue}</p>
    </div>
  );
}

export default function ScholarshipsExplorer() {
  const { t, language, toggleLanguage } = useLanguage();
  const {
    data: scholarshipsData,
    loading: scholarshipsLoading,
    error: scholarshipsError,
  } = useScholarshipsData();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [regionShapes, setRegionShapes] = useState<RegionShape[]>([]);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const regions = useMemo(() => scholarshipsData?.regions ?? [], [scholarshipsData]);
  const defaultRegionSlug = useMemo(
    () => scholarshipsData?.defaultRegionSlug ?? regions[0]?.regionSlug ?? null,
    [regions, scholarshipsData]
  );

  const rawRegion = searchParams.get('region');
  const selectedSlug = useMemo<RegionSlug | null>(() => {
    if (!defaultRegionSlug) {
      return null;
    }

    const fromQuery = regions.find((region) => region.regionSlug === rawRegion);
    return fromQuery?.regionSlug ?? defaultRegionSlug;
  }, [defaultRegionSlug, rawRegion, regions]);

  const selectedRegion = useMemo(() => {
    if (!selectedSlug) {
      return null;
    }

    return regions.find((region) => region.regionSlug === selectedSlug) ?? null;
  }, [regions, selectedSlug]);

  const handleRegionSelect = useCallback(
    (slug: RegionSlug) => {
      if (!defaultRegionSlug) return;

      const params = new URLSearchParams(searchParams.toString());
      if (slug === defaultRegionSlug) {
        params.delete('region');
      } else {
        params.set('region', slug);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaultRegionSlug, pathname, router, searchParams]
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
    if (regions.length === 0) {
      setRegionShapes([]);
      setMapStatus('loading');
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function loadMap() {
      setMapStatus('loading');
      try {
        const response = await fetch(REGIONS_GEOJSON_URL, {
          signal: controller.signal,
          cache: 'force-cache',
        });

        if (!response.ok) {
          throw new Error(`GeoJSON fetch failed: ${response.status}`);
        }

        const payload = (await response.json()) as unknown;
        const shapes = buildRegionShapes(payload, regions);

        if (!active) return;

        if (shapes.length === 0) {
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
  }, [regions]);

  const loadingLabel =
    language === 'tr' ? 'Burs verisi yükleniyor...' : 'Loading scholarship data...';
  const loadErrorLabel =
    language === 'tr'
      ? 'Burs verisi yüklenemedi. Lütfen tekrar deneyin.'
      : 'Failed to load scholarship data. Please try again.';

  if (!selectedRegion || !selectedSlug) {
    return (
      <div className="min-h-screen bg-[#e9eaec] p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <p
            className={`text-sm font-semibold ${
              scholarshipsLoading ? 'text-slate-500' : 'text-rose-700'
            }`}
          >
            {scholarshipsLoading && !scholarshipsError ? loadingLabel : loadErrorLabel}
          </p>
        </div>
      </div>
    );
  }

  const isVerified = selectedRegion.completeness === 'verified-full';
  const lastVerified = formatLastVerified(selectedRegion.lastVerifiedAt, language);

  return (
    <div className="min-h-screen bg-[#e9eaec] pb-10">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.list.backHome}
          </Link>

          <button
            onClick={toggleLanguage}
            aria-label={language === 'tr' ? 'Switch to English' : 'Türkçeye Geç'}
            className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-slate-700"
          >
            <Globe className="h-3.5 w-3.5" />
            {language === 'tr' ? 'EN' : 'TR'}
          </button>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <div className="rounded-lg bg-rose-600 px-4 py-4 text-xl font-black text-white">
            {t.scholarships.mapHeaderLeft}
          </div>
          <div className="truncate rounded-lg bg-blue-600 px-4 py-4 text-xl font-black text-white">
            {selectedRegion.regionName}
          </div>

          <section className="min-w-0 rounded-2xl bg-[#ececee] p-3 sm:p-4">
            <div className="mb-3 lg:hidden">
              <label className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                {t.scholarships.mobilePickerLabel}
              </label>
              <select
                value={selectedSlug}
                onChange={(event) => handleRegionSelect(event.target.value as RegionSlug)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
              >
                {regions.map((region) => (
                  <option key={region.regionSlug} value={region.regionSlug}>
                    {region.regionName}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative mx-auto w-full max-w-[740px] min-w-0 overflow-hidden rounded-xl bg-[#ececee]">
              <div className="relative aspect-[0.86] w-full">
                {mapStatus === 'loading' && (
                  <div className="absolute inset-0 grid place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-sm font-semibold text-slate-600">
                    {t.scholarships.mapLoading}
                  </div>
                )}

                {mapStatus === 'error' && (
                  <div className="absolute inset-0 grid place-items-center rounded-xl border border-dashed border-rose-300 bg-rose-50 px-4 text-center text-sm font-semibold text-rose-700">
                    {t.scholarships.mapError}
                  </div>
                )}

                {mapStatus === 'ready' && (
                  <svg
                    viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    aria-label={t.scholarships.mapAlt}
                    className="h-full w-full"
                  >
                    {regionShapes.map((shape, index) => {
                      const active = shape.slug === selectedSlug;
                      const fill = active ? '#1E4FBE' : REGION_FILL_COLORS[index % REGION_FILL_COLORS.length];

                      return (
                        <path
                          key={shape.slug}
                          d={shape.d}
                          fill={fill}
                          fillRule="evenodd"
                          stroke={active ? '#0f2f7a' : '#ffffff'}
                          strokeWidth={active ? 2.8 : 2}
                          className="cursor-pointer transition-all duration-150 hover:brightness-95 focus:outline-none"
                          role="button"
                          tabIndex={0}
                          aria-label={`${shape.name} ${t.scholarships.openRegionAria}`}
                          onClick={() => handleRegionSelect(shape.slug)}
                          onKeyDown={(event) => handleMapKeyDown(event, shape.slug)}
                        />
                      );
                    })}

                    {regionShapes.map((shape) => {
                      const active = shape.slug === selectedSlug;
                      return (
                        <g
                          key={`${shape.slug}-marker`}
                          role="button"
                          tabIndex={-1}
                          className="cursor-pointer"
                          onClick={() => handleRegionSelect(shape.slug)}
                        >
                          <circle
                            cx={shape.centerX}
                            cy={shape.centerY}
                            r={active ? 6.8 : 5.4}
                            fill={active ? '#1E4FBE' : '#F43368'}
                            stroke="#ffffff"
                            strokeWidth={active ? 3 : 2.5}
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl bg-[#ececee] p-3 sm:p-4">
            <article className="rounded-2xl border-2 border-blue-500 bg-sky-50 px-4 py-5 sm:px-6">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                {isVerified ? t.scholarships.statusVerified : t.scholarships.statusPending}
              </p>

              <h1 className="mt-2 text-3xl font-black leading-tight text-slate-900">
                {selectedRegion.managingBodies[0]?.name ?? selectedRegion.regionName}
              </h1>

              <p className="mt-3 text-base leading-relaxed text-slate-800">
                {selectedRegion.statusNote}
              </p>

              <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">
                {selectedRegion.managingBodies.map((body) => (
                  <a
                    key={`${body.name}-${body.officialUrl}`}
                    href={body.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full min-w-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="min-w-0 truncate">{body.name}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </article>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <QuickFact
                icon={<CalendarRange className="h-3.5 w-3.5" />}
                title={t.scholarships.academicYear}
                value={selectedRegion.currentAcademicYear}
                pendingValue={t.scholarships.pendingValue}
              />
              <QuickFact
                icon={<CalendarRange className="h-3.5 w-3.5" />}
                title={t.scholarships.applicationWindow}
                value={selectedRegion.applicationWindow}
                pendingValue={t.scholarships.pendingValue}
              />
              <QuickFact
                icon={<Wallet className="h-3.5 w-3.5" />}
                title={t.scholarships.iseeLimit}
                value={selectedRegion.iseeLimit}
                pendingValue={t.scholarships.pendingValue}
              />
              <QuickFact
                icon={<Wallet className="h-3.5 w-3.5" />}
                title={t.scholarships.ispeLimit}
                value={selectedRegion.ispeLimit}
                pendingValue={t.scholarships.pendingValue}
              />
              <QuickFact
                icon={<Soup className="h-3.5 w-3.5" />}
                title={t.scholarships.canteenSupport}
                value={selectedRegion.canteenSupport}
                pendingValue={t.scholarships.pendingValue}
              />
              <QuickFact
                icon={<Hotel className="h-3.5 w-3.5" />}
                title={t.scholarships.housingSupport}
                value={selectedRegion.housingSupport}
                pendingValue={t.scholarships.pendingValue}
              />
            </div>

            <div className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                {t.scholarships.officialSources}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedRegion.officialSourceUrls.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <span className="max-w-[200px] truncate sm:max-w-[260px]">{domainLabel(url)}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>

            <section className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="text-sm font-black">{t.scholarships.warningTitle}</p>
                  <p className="mt-1 text-sm">{t.scholarships.warningItem1}</p>
                  <p className="text-sm">{t.scholarships.warningItem2}</p>
                  <p className="mt-2 text-xs font-semibold">
                    {t.scholarships.lastVerified}:{' '}
                    {lastVerified ?? t.scholarships.pendingValue}
                  </p>
                </div>
              </div>
            </section>
          </section>
        </div>
      </div>
    </div>
  );
}
