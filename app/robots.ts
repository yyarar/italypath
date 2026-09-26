import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://italypath.app';

    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/universities', '/universities/*', '/isee', '/scholarships', '/communities', '/topluluklar', '/cities'],
                // /ekip (ekip paneli) bilerek listede degil: yol herkese ilan edilmez; dizin disi kalmasi
                // app/ekip/layout.tsx noindex metadata'si ve proxy.ts korumasiyla saglanir (S1#10, STATUS #79).
                disallow: ['/api/', '/ai-mentor', '/documents', '/favorites', '/giris', '/hub', '/sat', '/sign-in', '/sign-up'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
