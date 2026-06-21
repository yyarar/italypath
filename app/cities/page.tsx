import type { Metadata } from "next";
import { Suspense } from "react";

import CityGuidesExplorer from "@/components/cities/CityGuidesExplorer";

export const metadata: Metadata = {
  title: "İtalya Şehir Rehberleri | ItalyPath",
  description:
    "İtalya'da okuyacağınız üniversite şehrini yaşam maliyetleri, oda kiraları, ulaşım abonmanları ve öğrenci atmosferiyle keşfedin.",
  alternates: {
    canonical: "/cities",
  },
  openGraph: {
    title: "İtalya Şehir Rehberleri | ItalyPath",
    description:
      "İtalya'nın en popüler öğrenci şehirlerine ait oda fiyatları, ulaşım imkanları, iklim ve editoryal tüyolar tek ekranda.",
    url: "https://italypath.app/cities",
    type: "website",
  },
};

function CityGuidesFallback() {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] pb-24 text-[var(--editorial-ink)] md:pb-12">
      <div className="mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        {/* Skeleton Header */}
        <div className="flex items-center justify-between border-b border-[var(--editorial-border)] pb-4">
          <div className="h-5 w-24 bg-[#e7ded1] rounded animate-pulse" />
          <div className="h-5 w-40 bg-[#e7ded1] rounded animate-pulse" />
          <div className="h-8 w-16 bg-[#e7ded1] rounded animate-pulse" />
        </div>

        {/* Skeleton Title Section */}
        <div className="mt-10 max-w-3xl">
          <div className="h-16 w-3/4 bg-[#e7ded1] rounded animate-pulse" />
          <div className="mt-4 h-6 w-full bg-[#e7ded1] rounded animate-pulse" />
          <div className="mt-2 h-6 w-5/6 bg-[#e7ded1] rounded animate-pulse" />
        </div>

        {/* Skeleton Grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
          <div className="h-[500px] border border-[var(--editorial-border)] bg-[var(--editorial-surface)] rounded animate-pulse" />
          <div className="h-[500px] border border-[var(--editorial-border)] bg-[var(--editorial-surface)] rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function CityGuidesPage() {
  return (
    <Suspense fallback={<CityGuidesFallback />}>
      <CityGuidesExplorer />
    </Suspense>
  );
}
