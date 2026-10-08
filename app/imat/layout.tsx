import type { Metadata } from "next";

// IMAT deneme sinavi ve konu pratigi (/imat) proxy.ts ile korunur (oturumsuz istek /giris'e gider);
// yol robots.txt'te disallow edilir ve bu noindex ile dizin disi kalir. Server layout:
// searchParams/cookies()/headers() okunmaz.
export const metadata: Metadata = {
  title: "IMAT deneme sınavı ve konu pratiği | ItalyPath",
  robots: { index: false, follow: false },
};

export default function ImatLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
