"use client";

import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import IseeSection from '@/components/IseeSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <IseeSection />
      <Footer />
    </div>
  );
}