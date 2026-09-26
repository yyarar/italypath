import type { Metadata } from "next";

// Ekip paneli (/ekip/mentor, /ekip/uzman) proxy.ts ile korunur (oturumsuz istek /giris'e gider).
// Yol robots.txt'te ilan edilmez (guvenlik denetimi S1#10, STATUS #79); dizine girmemesi bu
// noindex ile saglanir.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EkipLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
