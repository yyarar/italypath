import type { Metadata } from 'next';

import ScholarshipsExplorer from '@/components/scholarships/ScholarshipsExplorer';
import {
  isRegionSlug,
  SCHOLARSHIP_DEFAULT_REGION,
} from '@/lib/scholarships/regions';

export const metadata: Metadata = {
  title: 'Bölgesel Burs Haritası | ItalyPath',
  description:
    'İtalya bölgelerine göre burs, yurt ve yemek desteği mantığını resmi kaynaklara dayalı olarak hızlıca karşılaştırın.',
  alternates: {
    canonical: '/scholarships',
  },
  openGraph: {
    title: 'Bölgesel Burs Haritası | ItalyPath',
    description:
      'İtalya bölgelerinde burs süreçlerini tek ekranda inceleyin. Başvuru öncesi resmi kaynakları tekrar doğrulayın.',
    url: 'https://italypath.app/scholarships',
    type: 'website',
  },
};

type SearchParamValue = string | string[] | undefined;
type ScholarshipsPageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function getSingleParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default async function ScholarshipsPage({ searchParams }: ScholarshipsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawRegion = getSingleParam(resolvedSearchParams.region);
  const initialSelectedRegion = isRegionSlug(rawRegion)
    ? rawRegion
    : SCHOLARSHIP_DEFAULT_REGION;

  return <ScholarshipsExplorer initialSelectedRegion={initialSelectedRegion} />;
}
