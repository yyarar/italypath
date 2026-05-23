import type { MetadataRoute } from 'next';
import { getUniversitiesData } from '@/lib/universities.server';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://italypath.com';
    const universities = await getUniversitiesData();

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${baseUrl}/universities`,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/isee`,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/scholarships`,
            changeFrequency: 'weekly',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/communities`,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/cities`,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
    ];

    const universityRoutes: MetadataRoute.Sitemap = universities.map((uni) => ({
        url: `${baseUrl}/universities/${uni.id}`,
        changeFrequency: 'monthly',
        priority: 0.6,
    }));

    const departmentRoutes: MetadataRoute.Sitemap = universities.flatMap((uni) =>
        uni.departments.map((dept) => ({
            url: `${baseUrl}/universities/${uni.id}/departments/${dept.slug}`,
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        }))
    );

    return [...staticRoutes, ...universityRoutes, ...departmentRoutes];
}
