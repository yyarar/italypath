import type { Metadata } from "next";

import ConsultationPageClient from "@/components/consultation/ConsultationPageClient";
import { serializeJsonLd } from "@/lib/jsonLd";
import { tr } from "@/lib/translations";

const copy = tr.consultation;

export const metadata: Metadata = {
  title: copy.pageMetaTitle,
  description: copy.pageMetaDescription,
  alternates: {
    canonical: "/on-gorusme",
  },
  openGraph: {
    title: copy.pageMetaTitle,
    description: copy.pageMetaDescription,
    url: "https://italypath.app/on-gorusme",
  },
};

// FAQPage JSON-LD: yalnizca sayfada gorunen soru-cevaplar, ConsultationFaq ile ayni kaynaktan
// (tr.homeFaq.items; sunucu HTML'i Turkce, Ingilizce istemcide yuklenir). Baska soru eklenmez.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: tr.homeFaq.items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function ConsultationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <ConsultationPageClient />
    </>
  );
}
