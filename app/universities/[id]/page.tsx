import { UniversityDetailClient } from "@/components/university-details/UniversityDetailClient";
import { getUniversityById } from "@/lib/universities.server";

type SearchParamValue = string | string[] | undefined;
type UniversityDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function getSingleParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function UniversityDetailDataUnavailable() {
  return (
    <div className="min-h-screen bg-[var(--editorial-paper)] px-4 py-24 text-[var(--editorial-ink)] sm:px-6 lg:px-8">
      <main className="mx-auto max-w-3xl border border-[var(--editorial-border)] bg-[var(--editorial-surface)] p-8 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
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
  searchParams,
}: UniversityDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  let university;

  try {
    university = await getUniversityById(resolvedParams.id);
  } catch (error) {
    console.error("Failed to load university detail data:", error);
    return <UniversityDetailDataUnavailable />;
  }

  return (
    <UniversityDetailClient
      initialUniversity={university ?? null}
      idFromUrl={resolvedParams.id}
      cameFromList={getSingleParam(resolvedSearchParams.from) === "list"}
    />
  );
}
