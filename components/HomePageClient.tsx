"use client";

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HomeStoryBand from "@/components/HomeStoryBand";
import FeaturesSection from "@/components/FeaturesSection";
import VelocityBridge from "@/components/VelocityBridge";
import IseeSection from "@/components/IseeSection";
import ScholarshipsSection from "@/components/ScholarshipsSection";
import Footer from "@/components/Footer";
import type { UniversityStats } from "@/lib/universityStats";

interface HomePageClientProps {
  stats: UniversityStats;
}

export default function HomePageClient({ stats }: HomePageClientProps) {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] font-sans text-[var(--editorial-ink)]">
      <Navbar />
      <HeroSection stats={stats} />
      <HomeStoryBand />
      <FeaturesSection stats={stats} />
      <VelocityBridge stats={stats} />
      <ScholarshipsSection />
      <IseeSection />
      <Footer />
    </div>
  );
}
