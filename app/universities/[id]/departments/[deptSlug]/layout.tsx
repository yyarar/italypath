import { Metadata } from 'next';
import { DEFAULT_UNIVERSITY_IMAGE } from '@/lib/universityDefaults';
import { getUniversityById } from '@/lib/universities.server';
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
    const university = await getUniversityById(resolvedParams.id);
    const department = university?.departments.find((d) => d.slug === resolvedParams.deptSlug);

    if (!university || !department) {
        return {
            title: 'Program bulunamadı | ItalyPath',
            description: 'Aradığınız program kaydı bulunamadı.',
        };
    }

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

    return {
        title,
        description,
        alternates: {
            canonical: `/universities/${resolvedParams.id}/departments/${resolvedParams.deptSlug}`,
        },
        openGraph: {
            title: `${department.name} — ${university.name}`,
            description,
            url: `${BASE_URL}/universities/${resolvedParams.id}/departments/${resolvedParams.deptSlug}`,
            images: [university.image || DEFAULT_UNIVERSITY_IMAGE],
        },
    };
}

export default function DepartmentDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
