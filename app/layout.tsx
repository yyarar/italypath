import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from '@/context/LanguageContext';
// 👇 1. BottomNav'ı import et
import BottomNav from '@/components/BottomNav';

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
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}
        >
          <LanguageProvider>
            {/* Sayfa İçeriği */}
            <main className="pb-20"> {/* 👇 Alt menü içeriği kapatmasın diye padding bıraktık */}
              {children}
            </main>
            
            {/* 👇 2. Alt Menüyü Buraya Koyduk (Tüm sayfalarda çıkacak) */}
            <BottomNav />
            
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}