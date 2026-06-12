import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Footer from "@/components/Footer";
import LegalDocumentView from "@/components/legal/LegalDocument";
import { LEGAL_DOCUMENTS, getLegalDocument } from "@/lib/legal/documents";

export function generateStaticParams() {
  return LEGAL_DOCUMENTS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getLegalDocument(slug);

  if (!doc) {
    return {
      title: "Sayfa bulunamadı | ItalyPath",
    };
  }

  return {
    title: `${doc.title} | ItalyPath`,
    description: doc.description,
    alternates: {
      canonical: `/yasal/${doc.slug}`,
    },
  };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getLegalDocument(slug);

  if (!doc) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--editorial-paper)]">
      <LegalDocumentView doc={doc} />
      <Footer />
    </div>
  );
}
