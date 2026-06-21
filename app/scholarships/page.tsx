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
    url: 'https://italypath.app/scholarships',
    type: 'website',
  },
};

function ScholarshipsPageFallback() {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <div className="h-10 w-56 rounded-md bg-[#e7ded1]" />
        <div className="mt-10 h-24 max-w-3xl rounded-md bg-[#e7ded1]" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
          <div className="h-[640px] rounded-lg border border-[var(--editorial-border)] bg-[var(--editorial-surface)]" />
          <div className="h-[640px] rounded-lg border border-[var(--editorial-border)] bg-[var(--editorial-surface)]" />
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
