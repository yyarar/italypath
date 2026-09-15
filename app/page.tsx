import type { Metadata } from "next";
import HomePageClient from "@/components/HomePageClient";
import { CURATED_CITIES } from "@/lib/cities/data";
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

async function getHomeStats(): Promise<UniversityStats> {
  try {
    const universities = await getUniversitiesDirectory();

    return {
      universitiesCount: universities.length,
      programsCount: getTotalDepartments(universities),
    };
  } catch (error) {
    console.error("Failed to load home university stats:", error);
    return { universitiesCount: null, programsCount: null };
  }
}

export default async function Home() {
  const stats = await getHomeStats();

  return <HomePageClient stats={stats} citiesCount={CURATED_CITIES.length} />;
}
