import { UniversityDetailClient } from "@/components/university-details/UniversityDetailClient";
import { getUniversityById } from "@/lib/universities.server";
import { notFound } from "next/navigation";

const BASE_URL = "https://italypath.app";

// ISR: 3 saat Vercel onbelleginden sunulur; soguk sunucu gecikmesi ve egress icin (SEO_AUDIT.md §20).
export const revalidate = 10800;

// ISR icin gerekli: bos generateStaticParams rotayi "statik uretilebilir" yapar; hicbir sayfa build'de
// uretilmez, ilk istekte uretilip revalidate suresince Vercel onbelleginden sunulur (SEO_AUDIT.md §20).
export function generateStaticParams() {
  return [];
}

type UniversityDetailPageProps = {
  params: Promise<{ id: string }>;
};

function UniversityDetailDataUnavailable() {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-[var(--editorial-ink)] sm:px-6 lg:px-8">
      <main className="mx-auto max-w-3xl border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta-ink)]">
          ItalyPath okul portresi
        </p>
        <h1 className="mt-4 font-serif text-4xl font-semibold tracking-[-0.03em]">
          Üniversite verisi yüklenemedi
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--editorial-muted)] sm:text-base">
          Bu okulun canlı profil ve program bilgilerine şu anda ulaşılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.
        </p>
      </main>
    </div>
  );
}

export default async function UniversityDetailPage({
  params,
}: UniversityDetailPageProps) {
  const resolvedParams = await params;
  let university;

  try {
    university = await getUniversityById(resolvedParams.id);
  } catch (error) {
    console.error("Failed to load university detail data:", error);
    return <UniversityDetailDataUnavailable />;
  }

  if (!university) notFound();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Anasayfa", item: BASE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Üniversiteler",
        item: `${BASE_URL}/universities`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: university.name,
        item: `${BASE_URL}/universities/${resolvedParams.id}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <UniversityDetailClient
        initialUniversity={university}
        idFromUrl={resolvedParams.id}
      />
    </>
  );
}
