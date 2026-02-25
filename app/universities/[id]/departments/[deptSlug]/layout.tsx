import { Metadata } from 'next';
import { universitiesData, DEFAULT_IMAGE } from '@/app/data';

export async function generateMetadata({ params }: { params: Promise<{ id: string; deptSlug: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const university = universitiesData.find((u) => String(u.id) === String(resolvedParams.id));
    const department = university?.departments.find((d) => d.slug === resolvedParams.deptSlug);

    if (!university || !department) {
        return {
            title: 'Program Not Found - ItalyPath',
            description: 'The requested program could not be found.',
        };
    }

    return {
        title: `${department.name} — ${university.name} | ItalyPath`,
        description: `Study ${department.name} at ${university.name} in ${university.city}, Italy. Tuition: ${university.fee}. Explore program details, requirements, and more.`,
        openGraph: {
            title: `${department.name} — ${university.name}`,
            description: `Study ${department.name} at ${university.name} in ${university.city}, Italy.`,
            images: [university.image || DEFAULT_IMAGE],
        },
    };
}

export default function DepartmentDetailLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
