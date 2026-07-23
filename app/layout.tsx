import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata, Viewport } from "next";
import { Spectral, Hanken_Grotesk } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";

// Editoryal başlık serifi (Times/Georgia varsayılanı yerine gerçek marka fontu).
const spectral = Spectral({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-spectral",
  display: "swap",
});

// Sıcak, okunur grotesk gövde fontu.
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-hanken",
  display: "swap",
});
import { LanguageProvider } from '@/context/LanguageContext';
import RouteTransition from '@/components/RouteTransition';
import MobileZoomLock from '@/components/MobileZoomLock';

const SITE_URL = "https://italypath.app";
const SITE_DESCRIPTION =
  "İtalya’da üniversite okumak isteyen öğrenciler için İngilizce programlar, burslar, ISEE hesaplayıcı, şehir rehberleri ve başvuru araçları.";

// Site geneli structured data: Organization + WebSite (yalnızca gerçek bilgi).
// Logo: public/ içinde gerçek bir ItalyPath logosu olmadığı için eklenmedi.
// sameAs: doğrulanmış resmi sosyal hesap olmadığı için eklenmedi.
// WebSite SearchAction (sitelinks searchbox) Google tarafından kullanımdan kaldırıldığı için eklenmedi.
const siteJsonLd = [
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ItalyPath | İtalya’da Üniversite, Burs ve Başvuru Rehberi",
  description: SITE_DESCRIPTION,
  // PWA ve mobil cihazlarda uygulamanın adını ve ikon ayarlarını destekler
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ItalyPath",
  },
};

// Üst barın rengini editorial paper arka planla eşleyelim
export const viewport: Viewport = {
  themeColor: "#f8f7f1",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/giris"
      signUpUrl="/giris?mode=kayit"
      signInFallbackRedirectUrl="/hub"
      signUpFallbackRedirectUrl="/hosgeldin"
    >
      <html lang="tr" suppressHydrationWarning className={`${spectral.variable} ${hankenGrotesk.variable}`}>
        <body
          suppressHydrationWarning
          className={`bg-[var(--editorial-paper)] font-sans text-[var(--editorial-ink)] antialiased`}
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
          />
          <MobileZoomLock />
          <LanguageProvider>
            <main className="min-h-screen overflow-x-hidden pb-24">
              <RouteTransition>{children}</RouteTransition>
            </main>
          </LanguageProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
