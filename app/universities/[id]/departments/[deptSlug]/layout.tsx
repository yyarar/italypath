import { Metadata } from 'next';
import { DEFAULT_UNIVERSITY_IMAGE } from '@/lib/universityDefaults';
import { getProgramPageData } from '@/lib/universities.server';
import { getCityGuideName } from '@/lib/cities/normalization';
import { hasAdmissionDossier } from '@/lib/admissionPresence';
import {
    buildProgramDescription,
    buildProgramTitle,
    type ProgramMetadataInput,
} from '@/lib/programMetadata';

const BASE_URL = 'https://italypath.app';

// Sehir degeri "Napoli / Caserta" gibi birlesik olabilir; rehber adini kullan.
const resolveCity = (city: string) =>
    getCityGuideName(city) ?? city.split('/')[0].trim() ?? city;

export async function generateMetadata({ params }: { params: Promise<{ id: string; deptSlug: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    // Sayfayla ayni memo'lu veri (dizin + programin kendi kabul satiri); ek Supabase istegi yok.
    const data = await getProgramPageData(resolvedParams.id, resolvedParams.deptSlug);

    if (!data) {
        return {
            title: 'Program bulunamadı | ItalyPath',
            description: 'Aradığınız program kaydı bulunamadı.',
        };
    }

    const { university, department } = data;
    const metadataInput: ProgramMetadataInput = {
        programName: department.name,
        universityName: university.name,
        city: university.city,
        level: department.level,
        durationYears: department.durationYears,
        languages: department.languages,
        hasDossier: hasAdmissionDossier(department),
    };

    const title = buildProgramTitle(metadataInput, resolveCity);
    const description = buildProgramDescription(metadataInput, resolveCity);
    // Canonical ve Open Graph adresi kayittaki id ve slug'dan kurulur (adresteki yazimdan degil).
    const path = `/universities/${university.id}/departments/${encodeURIComponent(department.slug)}`;

    return {
        title,
        description,
        alternates: {
            canonical: path,
        },
        openGraph: {
            title: `${department.name} — ${university.name}`,
            description,
            url: `${BASE_URL}${path}`,
            images: [university.image || DEFAULT_UNIVERSITY_IMAGE],
        },
    };
}

export default function DepartmentDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
