import { Metadata } from 'next';
import { universitiesData, DEFAULT_IMAGE } from '@/app/data';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const idFromUrl = resolvedParams.id;
    const university = universitiesData.find((u) => String(u.id) === String(idFromUrl));

    if (!university) {
        return {
            title: 'University Not Found - ItalyPath',
            description: 'The requested university could not be found.',
        };
    }

    return {
        title: `${university.name} - ItalyPath`,
        description: university.description.substring(0, 160) + '...',
        openGraph: {
            title: `${university.name} - Study in Italy`,
            description: university.description.substring(0, 160),
            images: [university.image || DEFAULT_IMAGE],
        },
    };
}

export default function UniversityDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
