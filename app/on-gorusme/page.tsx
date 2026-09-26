import type { Metadata } from "next";

import ConsultationPageClient from "@/components/consultation/ConsultationPageClient";
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

export default function ConsultationPage() {
  return <ConsultationPageClient />;
}
