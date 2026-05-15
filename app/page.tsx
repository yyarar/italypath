"use client";

import { useMemo } from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import VelocityBridge from '@/components/VelocityBridge';
import IseeSection from '@/components/IseeSection';
import ScholarshipsSection from '@/components/ScholarshipsSection';
import Footer from '@/components/Footer';
import { getTotalDepartments } from '@/lib/universitiesFilters';
import { useUniversitiesData } from '@/lib/useUniversitiesData';
import type { UniversityStats } from '@/lib/universityStats';

export default function Home() {
  const { universities, loading, error } = useUniversitiesData();
  const universityStats = useMemo<UniversityStats>(() => {
    if (loading || error) {
      return { universitiesCount: null, programsCount: null };
    }

    return {
      universitiesCount: universities.length,
      programsCount: getTotalDepartments(universities),
    };
  }, [error, loading, universities]);

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] font-sans text-[var(--editorial-ink)]">
      <Navbar />
      <HeroSection stats={universityStats} />
      <FeaturesSection stats={universityStats} />
      <VelocityBridge stats={universityStats} />
      <ScholarshipsSection />
      <IseeSection />
      <Footer />
    </div>
  );
}
