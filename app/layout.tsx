import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata, Viewport } from "next"; // Viewport ekledik
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from '@/context/LanguageContext';
import BottomNav from '@/components/BottomNav';
import RouteTransition from '@/components/RouteTransition';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  maximumScale: 1, // Kullanıcının zoom yapıp arayüzü bozmasını engeller (Native hissi için)
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
        >
          <LanguageProvider>
            {/* pb-20 kalsın ama içine 'safe-area' desteği ekleyeceğiz 
                Ayrıca taşmaları engellemek için overflow-x-hidden önemli.
            */}
            <main className="min-h-screen pb-24 overflow-x-hidden">
              <RouteTransition>{children}</RouteTransition>
            </main>
            
            <BottomNav />
            
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
