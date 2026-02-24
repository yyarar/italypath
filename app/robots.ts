import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://italypath.com';

    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/universities', '/universities/*', '/isee'],
                disallow: ['/api/', '/documents', '/favorites', '/sign-in', '/sign-up'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
