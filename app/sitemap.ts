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

    return [...staticRoutes, ...universityRoutes];
}
