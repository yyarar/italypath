import type { Metadata } from "next";

const title = "ISEE Parificato Hesaplayıcı | İtalya Burs Tahmini";
const description =
  "Ailen Türkiye'de yaşıyorsa İtalya burs başvurusunda ISEE Parificato hesaplanır. Geliri TL, evi m² olarak gir; tahmini ISEE ve ISPE değerini 2026/27 burs limitleriyle karşılaştır.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/isee",
  },
  openGraph: {
    title,
    description,
    url: "https://italypath.app/isee",
    type: "website",
  },
};

export default function IseeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
