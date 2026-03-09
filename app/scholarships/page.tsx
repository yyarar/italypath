import type { Metadata } from 'next';

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

export default function ScholarshipsPage() {
  return <ScholarshipsExplorer />;
}
