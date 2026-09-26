import type { Metadata } from "next";
import HomePageClient from "@/components/HomePageClient";
import { CURATED_CITIES } from "@/lib/cities/data";
import { serializeJsonLd } from "@/lib/jsonLd";
import { siteJsonLd } from "@/lib/site";
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

export default async function Home() {
  const stats = await getHomeStats();

  return (
    <>
      {/* Site geneli Organization + WebSite JSON-LD yalnizca ana sayfada (lib/site.ts; STATUS #14). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(siteJsonLd) }}
      />
      <HomePageClient stats={stats} citiesCount={CURATED_CITIES.length} />
    </>
  );
}
