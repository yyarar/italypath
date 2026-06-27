import type { Metadata } from "next";
import HomePageClient from "@/components/HomePageClient";
import { getUniversitiesData } from "@/lib/universities.server";
import { getTotalDepartments } from "@/lib/universitiesFilters";
import type { UniversityStats } from "@/lib/universityStats";

export const dynamic = "force-dynamic";

// Ana sayfaya özel canonical. Global olarak root layout'a koymuyoruz; aksi halde
// tüm sayfaların canonical'ı yanlışlıkla "/" adresine kilitlenir.
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

async function getHomeStats(): Promise<UniversityStats> {
  try {
    const universities = await getUniversitiesData();

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

  return <HomePageClient stats={stats} />;
}
