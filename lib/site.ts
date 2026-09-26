// Site geneli sabitler ve Organization + WebSite JSON-LD (yalnizca gercek bilgi).
// Logo: public/ icinde gercek bir ItalyPath logosu olmadigi icin eklenmedi.
// sameAs: dogrulanmis resmi sosyal hesap olmadigi icin eklenmedi.
// WebSite SearchAction (sitelinks searchbox) Google tarafindan kullanimdan kaldirildigi icin eklenmedi.
// 2026-09-26 (STATUS #14): blok her sayfada tekrar etmek yerine yalniz ana sayfada (app/page.tsx)
// yayinlanir; kok layout metadata icin ayni SITE_URL ve SITE_DESCRIPTION degerlerini kullanir.
export const SITE_URL = "https://italypath.app";
export const SITE_DESCRIPTION =
  "İtalya’da üniversite okumak isteyen öğrenciler için İngilizce programlar, burslar, ISEE hesaplayıcı, şehir rehberleri ve başvuru araçları.";

export const siteJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ItalyPath",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ItalyPath",
    url: SITE_URL,
    inLanguage: "tr",
  },
];
