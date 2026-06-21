import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://italypath.app';

    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/universities', '/universities/*', '/isee', '/scholarships', '/communities', '/topluluklar', '/cities'],
                disallow: ['/api/', '/ai-mentor', '/documents', '/favorites', '/giris', '/hub', '/sign-in', '/sign-up'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
