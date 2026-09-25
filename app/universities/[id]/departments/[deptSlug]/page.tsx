import { DepartmentDetailClient } from "@/components/university-details/DepartmentDetailClient";
import { getProgramPageData, pruneUniversityForProgram } from "@/lib/universities.server";
import { buildRelatedLinks } from "@/lib/relatedLinks";
import { hasAdmissionDossier } from "@/lib/admissionPresence";
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

type DepartmentDetailPageProps = {
  params: Promise<{ id: string; deptSlug: string }>;
};

// Veri hatasi yakalanmaz: ISR yenilemesi hata verirse Vercel son saglam sayfayi sunmaya devam eder;
// hic saglam sayfa yoksa istek hata sayfasina duser ve onbellege yazilmaz (guvenlik denetimi O2#6).
export default async function DepartmentDetailPage({ params }: DepartmentDetailPageProps) {
  const resolvedParams = await params;
  // Okul ve diger programlar hafif dizinden; kabul dosyasi yalnizca bu programin kendi satirindan
  // (hedefli sorgu). Metadata layout'u ayni memo'lu veriyi kullanir.
  const data = await getProgramPageData(resolvedParams.id, resolvedParams.deptSlug);

  if (!data) notFound();

  const { university, department, directory } = data;

  // Ic baglanti agi: hafif dizinle ayni sehirdeki okullar, sehir rehberi, bolge bursu ve ayni
  // resmi bolum sinifindaki diger okullarin programlari.
  const related = buildRelatedLinks(university, directory, department);
  const universityUrl = `${BASE_URL}/universities/${university.id}`;
  const programUrl = `${universityUrl}/departments/${encodeURIComponent(department.slug)}`;

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
      {
        "@type": "ListItem",
        position: 4,
        name: department.name,
        item: programUrl,
      },
    ],
  };

  // Yalniz kabul dosyasi olan programda; sadece sayfada gorunen, dogrulanmis alanlar
  // (ad, okul, dil, sure). Son tarih, ucret ve kabul kosulu eklenmez.
  const programJsonLd = hasAdmissionDossier(department)
    ? {
        "@context": "https://schema.org",
        "@type": "EducationalOccupationalProgram",
        name: department.name,
        url: programUrl,
        provider: { "@type": "Organization", name: university.name },
        inLanguage: department.languages.map((entry) => (entry === "it" ? "it" : "en")),
        timeToComplete: `P${department.durationYears}Y`,
        educationalProgramMode: "full-time",
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      {programJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(programJsonLd) }}
        />
      ) : null}
      <DepartmentDetailClient
        initialUniversity={pruneUniversityForProgram(university, department)}
        initialDepartmentSlug={department.slug}
        related={related}
      />
    </>
  );
}
