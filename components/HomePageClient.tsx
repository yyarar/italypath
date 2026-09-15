"use client";

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HomeStoryBand from "@/components/HomeStoryBand";
import HomeToolsSection from "@/components/home/HomeToolsSection";
import VelocityBridge from "@/components/VelocityBridge";
import IseeSection from "@/components/IseeSection";
import ScholarshipsSection from "@/components/ScholarshipsSection";
import HomeClosingCta from "@/components/HomeClosingCta";
import Footer from "@/components/Footer";
import type { UniversityStats } from "@/lib/universityStats";

interface HomePageClientProps {
  stats: UniversityStats;
  citiesCount: number;
}

export default function HomePageClient({ stats, citiesCount }: HomePageClientProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-[var(--editorial-paper)] font-sans text-[var(--editorial-ink)]">
      <Navbar homeFloating />
      <HeroSection stats={stats} />
      <HomeToolsSection stats={stats} citiesCount={citiesCount} />
      <HomeStoryBand />
      <VelocityBridge stats={stats} />
      <ScholarshipsSection />
      <IseeSection />
      <HomeClosingCta />
      <Footer />
    </div>
  );
}
