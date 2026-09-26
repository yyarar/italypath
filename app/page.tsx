import type { Metadata } from "next";
import HomePageClient from "@/components/HomePageClient";
import { CURATED_CITIES } from "@/lib/cities/data";
import { SCHOLARSHIP_REGIONS } from "@/lib/scholarships/regions";
import { summarizeScholarshipVerification } from "@/lib/scholarships/verification";
import { getUniversitiesDirectory } from "@/lib/universities.server";
import { getTotalDepartments } from "@/lib/universitiesFilters";
import type { UniversityStats } from "@/lib/universityStats";

// ISR: 3 saat Vercel onbelleginden sunulur; soguk sunucu gecikmesi ve egress icin (SEO_AUDIT.md §20).
export const revalidate = 10800;

// Ana sayfaya özel canonical. Global olarak root layout'a koymuyoruz; aksi halde
// tüm sayfaların canonical'ı yanlışlıkla "/" adresine kilitlenir.
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

// Veri hatasi yakalanmaz: bos istatistik ("...") 3 saat onbellekte kalmasin; ISR yenilemesi hata
// verirse Vercel son saglam ana sayfayi sunmaya devam eder (guvenlik denetimi O2#6/O4#2).
async function getHomeStats(): Promise<UniversityStats> {
  const universities = await getUniversitiesDirectory();

  return {
    universitiesCount: universities.length,
    programsCount: getTotalDepartments(universities),
  };
}

// Burs CTA notundaki bolge sayilari ve dogrulama tarihleri sunucuda hesaplanir (STATUS #33); bolge verisi
// istemci paketine girmez, ISR govdesiyle birlikte yenilenir.
const scholarshipVerification = summarizeScholarshipVerification(SCHOLARSHIP_REGIONS);

export default async function Home() {
  const stats = await getHomeStats();

  return (
    <HomePageClient
      stats={stats}
      citiesCount={CURATED_CITIES.length}
      scholarshipVerification={scholarshipVerification}
    />
  );
}
