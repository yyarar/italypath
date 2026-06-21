import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata, Viewport } from "next";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";
import { LanguageProvider } from '@/context/LanguageContext';
import BottomNav from '@/components/BottomNav';
import RouteTransition from '@/components/RouteTransition';
import MobileZoomLock from '@/components/MobileZoomLock';

export const metadata: Metadata = {
  metadataBase: new URL("https://italypath.app"),
  title: "ItalyPath | İtalya’da Üniversite, Burs ve Başvuru Rehberi",
  description:
    "İtalya’da üniversite okumak isteyen öğrenciler için İngilizce programlar, burslar, ISEE hesaplayıcı, şehir rehberleri ve başvuru araçları.",
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
      signUpFallbackRedirectUrl="/hub"
    >
      <html lang="tr" suppressHydrationWarning>
        <body
          suppressHydrationWarning
          className={`bg-[var(--editorial-paper)] font-sans text-[var(--editorial-ink)] antialiased`}
        >
          <MobileZoomLock />
          <LanguageProvider>
            <main className="min-h-screen overflow-x-hidden pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-24">
              <RouteTransition>{children}</RouteTransition>
            </main>
            <BottomNav />
          </LanguageProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
