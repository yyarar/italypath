"use client";

import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import VelocityBridge from '@/components/VelocityBridge';
import IseeSection from '@/components/IseeSection';
import ScholarshipsSection from '@/components/ScholarshipsSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] font-sans text-[var(--editorial-ink)]">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <VelocityBridge />
      <ScholarshipsSection />
      <IseeSection />
      <Footer />
    </div>
  );
}
