import type { Metadata } from 'next';
import { Suspense } from 'react';

import ScholarshipsExplorer from '@/components/scholarships/ScholarshipsExplorer';

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
    url: 'https://italypath.com/scholarships',
    type: 'website',
  },
};

function ScholarshipsPageFallback() {
  return (
    <div className="min-h-screen bg-[#e9eaec]">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-14 rounded-lg bg-rose-600/90" />
          <div className="h-14 rounded-lg bg-blue-600/90" />
          <div className="h-[680px] rounded-2xl bg-slate-200/80" />
          <div className="h-[680px] rounded-2xl bg-slate-200/80" />
        </div>
      </div>
    </div>
  );
}

export default function ScholarshipsPage() {
  return (
    <Suspense fallback={<ScholarshipsPageFallback />}>
      <ScholarshipsExplorer />
    </Suspense>
  );
}
