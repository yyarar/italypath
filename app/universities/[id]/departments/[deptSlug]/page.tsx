import { DepartmentDetailClient } from "@/components/university-details/DepartmentDetailClient";
import { getUniversitiesDirectory, getUniversityById } from "@/lib/universities.server";
import { buildRelatedLinks, type RelatedLinksData } from "@/lib/relatedLinks";
import { hasAdmissionDossier } from "@/lib/admissionPresence";
import type { Department, University } from "@/types/universities";
import { notFound } from "next/navigation";

const BASE_URL = "https://italypath.app";

// Sayfa yalnizca acilan programin kabul dosyasina ihtiyac duyar. Okulun tum
// dosyalari tarayiciya gonderilirse RSC yuku medyanda 277 KB, en kotu durumda
// 2 MB olur (17 Eylul olcumu); diger programlar icin varlik bayragi yeterli.
function pruneUniversityForProgram(
  university: University,
  deptSlug: string,
): University {
  return {
    ...university,
    departments: university.departments.map((entry) => {
      if (entry.slug === deptSlug) return entry;
      const light: Department = {
        ...entry,
        hasAdmissionDetails: hasAdmissionDossier(entry),
      };
      delete light.admissionDetails;
      return light;
    }),
  };
}

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

function DepartmentDetailDataUnavailable() {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-[var(--editorial-ink)] sm:px-6 lg:px-8">
      <main className="mx-auto max-w-3xl border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta-ink)]">
          ItalyPath program portresi
        </p>
        <h1 className="mt-4 font-serif text-4xl font-semibold tracking-[-0.03em]">
          Program verisi yüklenemedi
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--editorial-muted)] sm:text-base">
          Bu programın canlı kabul ve okul bilgilerine şu anda ulaşılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.
        </p>
      </main>
    </div>
  );
}

export default async function DepartmentDetailPage({ params }: DepartmentDetailPageProps) {
  const resolvedParams = await params;
  let university;

  try {
    university = await getUniversityById(resolvedParams.id);
  } catch (error) {
    console.error("Failed to load program detail data:", error);
    return <DepartmentDetailDataUnavailable />;
  }

  if (!university) notFound();

  // Ic baglanti agi: hafif dizinle ayni sehirdeki okullar + sehir rehberi + bolge bursu (hata sayfayi bozmaz).
  let related: RelatedLinksData | null = null;
  try {
    related = buildRelatedLinks(university, await getUniversitiesDirectory());
  } catch (error) {
    console.error("Failed to build related links:", error);
  }

  // Program adını layout'taki ile aynı şekilde slug üzerinden çöz.
  const department = university.departments.find(
    (d) => d.slug === resolvedParams.deptSlug
  );

  if (!department) notFound();

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
      {
        "@type": "ListItem",
        position: 4,
        name: department.name,
        item: `${BASE_URL}/universities/${resolvedParams.id}/departments/${resolvedParams.deptSlug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <DepartmentDetailClient
        initialUniversity={pruneUniversityForProgram(
          university,
          resolvedParams.deptSlug,
        )}
        initialDepartmentSlug={resolvedParams.deptSlug}
        idFromUrl={resolvedParams.id}
        related={related}
      />
    </>
  );
}
