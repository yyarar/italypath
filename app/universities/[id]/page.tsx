import { UniversityDetailClient } from "@/components/university-details/UniversityDetailClient";
import { getUniversitiesDirectory, getUniversityById } from "@/lib/universities.server";
import { buildRelatedLinks } from "@/lib/relatedLinks";
import { serializeJsonLd } from "@/lib/jsonLd";
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

// Veri hatasi yakalanmaz: ISR yenilemesi hata verirse Vercel son saglam sayfayi sunmaya devam eder;
// hic saglam sayfa yoksa istek hata sayfasina duser ve onbellege yazilmaz (guvenlik denetimi O2#6).
export default async function UniversityDetailPage({
  params,
}: UniversityDetailPageProps) {
  const resolvedParams = await params;
  // Okul dizinden gelir (kabul dosyasi yalnizca VARLIK bayragi); tam dosyalar program sayfasindadir.
  const university = await getUniversityById(resolvedParams.id);

  if (!university) notFound();

  // Ic baglanti agi: hafif dizinle ayni sehirdeki okullar + sehir rehberi + bolge bursu.
  const related = buildRelatedLinks(university, await getUniversitiesDirectory());
  const universityUrl = `${BASE_URL}/universities/${university.id}`;

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
        item: universityUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <UniversityDetailClient
        initialUniversity={university}
        related={related}
      />
    </>
  );
}
