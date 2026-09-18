import type { MetadataRoute } from 'next';
import { getUniversitiesDirectory } from '@/lib/universities.server';
import type { University } from '@/types/universities';

export const revalidate = 3600;

// Sayfa sablonunun son anlamli icerik degisikligi: 2026-09-17'de program detay sayfasi yeniden
// duzenlendi (program kunyesi yukari, kabul metinleri madde madde, kaynak izi acilir-kapanir,
// Turkce baslik ve aciklama). Onceki kayit: 2026-09-15 ucretsiz on gorusme bolumu (a1eea73).
// Sablon icerigi yeniden degisirse bu tarihi guncelle. Veritabani zaman damgalari (updated_at)
// bundan yeniyse onlar kullanilir. Google lastmod'u yeniden tarama onceligi icin kullanir;
// tarih uydurma, gercek degisiklige bagla (SEO_AUDIT.md §21).
const PAGE_TEMPLATE_LAST_MODIFIED = new Date('2026-09-17T00:00:00Z');
// /isee görünür içeriği 2026-09-17'de ISEE Parificato aracıyla yenilendi; program şablonundan bağımsız izlenir (SEO_AUDIT.md §21).
const ISEE_PAGE_LAST_MODIFIED = new Date('2026-09-19T00:00:00Z');

function toDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function latest(...dates: Array<Date | null | undefined>): Date {
    let result = PAGE_TEMPLATE_LAST_MODIFIED;
    for (const date of dates) {
        if (date && date.getTime() > result.getTime()) result = date;
    }
    return result;
}

function universityLastModified(university: University): Date {
    return latest(
        toDate(university.updatedAt),
        ...university.departments.map((department) => toDate(department.updatedAt))
    );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://italypath.app';
    const universities = await getUniversitiesDirectory();
    const catalogLastModified = latest(...universities.map(universityLastModified));

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: catalogLastModified,
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${baseUrl}/universities`,
            lastModified: catalogLastModified,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/isee`,
            lastModified: ISEE_PAGE_LAST_MODIFIED,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/on-gorusme`,
            lastModified: PAGE_TEMPLATE_LAST_MODIFIED,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/scholarships`,
            lastModified: PAGE_TEMPLATE_LAST_MODIFIED,
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
            lastModified: catalogLastModified,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
    ];

    const universityRoutes: MetadataRoute.Sitemap = universities.map((uni) => ({
        url: `${baseUrl}/universities/${uni.id}`,
        lastModified: universityLastModified(uni),
        changeFrequency: 'monthly',
        priority: 0.6,
    }));

    const departmentRoutes: MetadataRoute.Sitemap = universities.flatMap((uni) =>
        uni.departments.map((dept) => ({
            url: `${baseUrl}/universities/${uni.id}/departments/${dept.slug}`,
            lastModified: latest(toDate(dept.updatedAt), toDate(uni.updatedAt)),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        }))
    );

    return [...staticRoutes, ...universityRoutes, ...departmentRoutes];
}
