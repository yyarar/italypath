import type { MetadataRoute } from 'next';
import { universitiesData } from '@/app/data';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://italypath.com';

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${baseUrl}/universities`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/isee`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/ai-mentor`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
    ];

    const universityRoutes: MetadataRoute.Sitemap = universitiesData.map((uni) => ({
        url: `${baseUrl}/universities/${uni.id}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
    }));

    const departmentRoutes: MetadataRoute.Sitemap = universitiesData.flatMap((uni) =>
        uni.departments.map((dept) => ({
            url: `${baseUrl}/universities/${uni.id}/departments/${dept.slug}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        }))
    );

    return [...staticRoutes, ...universityRoutes, ...departmentRoutes];
}
