'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, type ReactNode } from 'react';
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
import {
  getScholarshipRegionBySlug,
  isRegionSlug,
  SCHOLARSHIP_DEFAULT_REGION,
  SCHOLARSHIP_REGIONS,
} from '@/lib/scholarships/regions';
import type { RegionSlug } from '@/types/scholarships';

const ITALY_REGIONS_MAP_URL =
  'https://upload.wikimedia.org/wikipedia/commons/c/ca/Italy%2C_administrative_divisions_-_de_-_colored.svg';

const REGION_MARKERS: Record<RegionSlug, { x: number; y: number }> = {
  abruzzo: { x: 58.5, y: 56.8 },
  basilicata: { x: 66.5, y: 70.5 },
  calabria: { x: 74, y: 83.5 },
  campania: { x: 54, y: 66.5 },
  'emilia-romagna': { x: 49.5, y: 35 },
  'friuli-venezia-giulia': { x: 63, y: 19 },
  lazio: { x: 47, y: 58.5 },
  liguria: { x: 31.5, y: 40.2 },
  lombardia: { x: 34.5, y: 25 },
  marche: { x: 57.8, y: 49.2 },
  molise: { x: 63.3, y: 62.8 },
  piemonte: { x: 24, y: 30 },
  puglia: { x: 72.5, y: 65.3 },
  sardegna: { x: 26.5, y: 74.5 },
  sicilia: { x: 56.5, y: 95 },
  toscana: { x: 41.5, y: 46.5 },
  'trentino-alto-adige-suedtirol': { x: 47, y: 16.5 },
  umbria: { x: 49, y: 52.2 },
  'valle-d-aosta': { x: 20.5, y: 18.5 },
  veneto: { x: 52.5, y: 25.3 },
};

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawRegion = searchParams.get('region');
  const selectedSlug: RegionSlug = isRegionSlug(rawRegion)
    ? rawRegion
    : SCHOLARSHIP_DEFAULT_REGION;
  const selectedRegion = getScholarshipRegionBySlug(selectedSlug);

  const handleRegionSelect = useCallback(
    (slug: RegionSlug) => {
      const params = new URLSearchParams(searchParams.toString());
      if (slug === SCHOLARSHIP_DEFAULT_REGION) {
        params.delete('region');
      } else {
        params.set('region', slug);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

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

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg bg-rose-600 px-4 py-4 text-xl font-black text-white">
            {t.scholarships.mapHeaderLeft}
          </div>
          <div className="rounded-lg bg-blue-600 px-4 py-4 text-xl font-black text-white">
            {selectedRegion.regionName}
          </div>

          <section className="rounded-2xl bg-[#ececee] p-3 sm:p-4">
            <div className="mb-3 lg:hidden">
              <label className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                {t.scholarships.mobilePickerLabel}
              </label>
              <select
                value={selectedSlug}
                onChange={(event) => handleRegionSelect(event.target.value as RegionSlug)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
              >
                {SCHOLARSHIP_REGIONS.map((region) => (
                  <option key={region.regionSlug} value={region.regionSlug}>
                    {region.regionName}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative mx-auto w-full max-w-[740px] overflow-hidden rounded-xl bg-[#ececee]">
              <div className="relative aspect-[0.86] w-full">
                <Image
                  src={ITALY_REGIONS_MAP_URL}
                  alt={t.scholarships.mapAlt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-contain"
                />

                {SCHOLARSHIP_REGIONS.map((region) => {
                  const marker = REGION_MARKERS[region.regionSlug];
                  const active = region.regionSlug === selectedSlug;

                  return (
                    <button
                      key={region.regionSlug}
                      type="button"
                      onClick={() => handleRegionSelect(region.regionSlug)}
                      aria-label={`${region.regionName} ${t.scholarships.openRegionAria}`}
                      className="group absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    >
                      <span
                        className={`block h-3.5 w-3.5 rounded-full border-2 border-white transition ${
                          active
                            ? 'bg-blue-600 ring-4 ring-blue-300/80'
                            : 'bg-rose-500 group-hover:bg-rose-600'
                        }`}
                      />
                      <span className="pointer-events-none absolute left-1/2 top-[115%] hidden -translate-x-1/2 rounded-md bg-slate-900/90 px-2 py-1 text-[10px] font-semibold text-white shadow-sm group-hover:block lg:group-hover:block">
                        {region.regionName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-[#ececee] p-3 sm:p-4">
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

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {selectedRegion.managingBodies.map((body) => (
                  <a
                    key={`${body.name}-${body.officialUrl}`}
                    href={body.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{body.name}</span>
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
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    {domainLabel(url)}
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
