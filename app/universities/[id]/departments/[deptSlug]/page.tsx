import { DepartmentDetailClient } from "@/components/university-details/DepartmentDetailClient";
import { getUniversityById } from "@/lib/universities.server";
import { notFound } from "next/navigation";

const BASE_URL = "https://italypath.app";

type DepartmentDetailPageProps = {
  params: Promise<{ id: string; deptSlug: string }>;
};

function DepartmentDetailDataUnavailable() {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-[var(--editorial-ink)] sm:px-6 lg:px-8">
      <main className="mx-auto max-w-3xl border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
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
        initialUniversity={university}
        initialDepartmentSlug={resolvedParams.deptSlug}
        idFromUrl={resolvedParams.id}
      />
    </>
  );
}
