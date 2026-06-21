import { Metadata } from 'next';
import { DEFAULT_UNIVERSITY_IMAGE } from '@/lib/universityDefaults';
import { getUniversityById } from '@/lib/universities.server';

const BASE_URL = 'https://italypath.app';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const idFromUrl = resolvedParams.id;
    const university = await getUniversityById(idFromUrl);

    if (!university) {
        return {
            title: 'University Not Found - ItalyPath',
            description: 'The requested university could not be found.',
        };
    }

    return {
        title: `${university.name} - ItalyPath`,
        description: university.description.substring(0, 160) + '...',
        alternates: {
            canonical: `/universities/${idFromUrl}`,
        },
        openGraph: {
            title: `${university.name} - Study in Italy`,
            description: university.description.substring(0, 160),
            url: `${BASE_URL}/universities/${idFromUrl}`,
            images: [university.image || DEFAULT_UNIVERSITY_IMAGE],
        },
    };
}

export default function UniversityDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
