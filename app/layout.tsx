import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from '@/context/LanguageContext';
import BottomNav from '@/components/BottomNav';
import RouteTransition from '@/components/RouteTransition';
import MobileZoomLock from '@/components/MobileZoomLock';

export const metadata: Metadata = {
  title: "ItalyPath",
  description: "İtalya Eğitim Rehberi",
  // PWA ve mobil cihazlarda uygulamanın adını ve ikon ayarlarını destekler
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ItalyPath",
  },
};

// Üst barın rengini Slate-50 (arka plan rengin) ile eşleyelim
export const viewport: Viewport = {
  themeColor: "#f8fafc",
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
    <ClerkProvider>
      <html lang="tr">
        <body
          className={`font-sans antialiased bg-slate-50 text-slate-900`}
        >
          <MobileZoomLock />
          <LanguageProvider>
            <main className="min-h-screen overflow-x-hidden pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-24">
              <RouteTransition>{children}</RouteTransition>
            </main>
            <BottomNav />
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
