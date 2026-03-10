import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://italypath.com';

    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/universities', '/universities/*', '/isee', '/scholarships', '/communities', '/topluluklar'],
                disallow: ['/api/', '/ai-mentor', '/documents', '/favorites', '/hub', '/sign-in', '/sign-up'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
