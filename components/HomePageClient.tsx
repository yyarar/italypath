"use client";

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HomeStoryBand from "@/components/HomeStoryBand";
import VelocityBridge from "@/components/VelocityBridge";
import IseeSection from "@/components/IseeSection";
import ScholarshipsSection from "@/components/ScholarshipsSection";
import HomeClosingCta from "@/components/HomeClosingCta";
import Footer from "@/components/Footer";
import type { UniversityStats } from "@/lib/universityStats";

interface HomePageClientProps {
  stats: UniversityStats;
}

export default function HomePageClient({ stats }: HomePageClientProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-[var(--editorial-paper)] font-sans text-[var(--editorial-ink)]">
      <Navbar homeFloating />
      <HeroSection stats={stats} />
      <HomeStoryBand />
      <VelocityBridge stats={stats} />
      <ScholarshipsSection />
      <IseeSection />
      <HomeClosingCta />
      <Footer />
    </div>
  );
}
