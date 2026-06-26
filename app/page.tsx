import HomePageClient from "@/components/HomePageClient";
import { getUniversitiesData } from "@/lib/universities.server";
import { getTotalDepartments } from "@/lib/universitiesFilters";
import type { UniversityStats } from "@/lib/universityStats";

export const dynamic = "force-dynamic";

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
