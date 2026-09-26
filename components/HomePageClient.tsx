"use client";

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HomeStoryBand from "@/components/HomeStoryBand";
import HomeToolsSection from "@/components/home/HomeToolsSection";
import VelocityBridge from "@/components/VelocityBridge";
import IseeSection from "@/components/IseeSection";
import ScholarshipsSection from "@/components/ScholarshipsSection";
import HomeClosingCta from "@/components/HomeClosingCta";
import ConsultationFaq from "@/components/consultation/ConsultationFaq";
import ConsultationSection from "@/components/consultation/ConsultationSection";
import MobileConsultBar from "@/components/consultation/MobileConsultBar";
import Footer from "@/components/Footer";
import type { ScholarshipVerificationSummary } from "@/lib/scholarships/verification";
import type { UniversityStats } from "@/lib/universityStats";

interface HomePageClientProps {
  stats: UniversityStats;
  citiesCount: number;
  scholarshipVerification: ScholarshipVerificationSummary;
  scholarshipRegionsCount: number;
}

export default function HomePageClient({
  stats,
  citiesCount,
  scholarshipVerification,
  scholarshipRegionsCount,
}: HomePageClientProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-[var(--editorial-paper)] font-sans text-[var(--editorial-ink)]">
      <Navbar homeFloating />
      <HeroSection stats={stats} />
      <HomeToolsSection stats={stats} citiesCount={citiesCount} scholarshipRegionsCount={scholarshipRegionsCount} />
      <ConsultationSection variant="home" />
      <HomeStoryBand />
      <VelocityBridge stats={stats} scholarshipRegionsCount={scholarshipRegionsCount} />
      <ScholarshipsSection verification={scholarshipVerification} />
      <IseeSection />
      <ConsultationFaq />
      <HomeClosingCta />
      <Footer />
      <MobileConsultBar />
    </div>
  );
}
