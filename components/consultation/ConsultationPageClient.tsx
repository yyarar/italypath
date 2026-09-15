"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

import ConsultationFaq from "./ConsultationFaq";
import ConsultationSection from "./ConsultationSection";

export default function ConsultationPageClient() {
  return (
    <div className="min-h-screen overflow-hidden bg-[var(--editorial-paper)] font-sans text-[var(--editorial-ink)]">
      <Navbar />
      <ConsultationSection variant="page" />
      <ConsultationFaq />
      <Footer />
    </div>
  );
}
